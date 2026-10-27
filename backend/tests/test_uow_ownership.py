"""Transaction ownership, compensation, and response-ordering regressions."""
import asyncio
import ast
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from fastapi import Depends, FastAPI, Response
from httpx import ASGITransport, AsyncClient
import pytest

from app.core import unit_of_work
from app.core.dependencies import get_current_user, get_user_category_service
from app.core.exceptions import DomainAuthenticationUnavailableException, domain_exception_handler
from app.core.unit_of_work import AbstractUnitOfWork, SQLModelUnitOfWork, get_uow
from app.features.auth.service import AuthService
from app.features.auth.schemas import AccountRecoveryRequest


@pytest.fixture(autouse=True)
def setup_test_db():
    """These lifecycle tests do not need a database server."""
    yield


class MemoryUnitOfWork(AbstractUnitOfWork):
    def __init__(self):
        super().__init__()
        self.commit = AsyncMock()
        self.rollback = AsyncMock()
        self._close = AsyncMock()

    async def commit(self):
        pass

    async def rollback(self):
        pass

    async def _close(self):
        pass


class FalsyError(Exception):
    def __bool__(self):
        return False


@pytest.mark.parametrize("failure", [None, "body", "commit", "falsy", "cancelled"])
async def test_transaction_outcome_and_exactly_once_actions(failure):
    uow = MemoryUnitOfWork()
    cleanup, after = AsyncMock(), AsyncMock()
    error = {"body": ValueError("body"), "commit": RuntimeError("commit"),
             "falsy": FalsyError(), "cancelled": asyncio.CancelledError()}.get(failure)
    if failure == "commit":
        uow.commit.side_effect = error

    async def operation():
        async with uow:
            uow.on_rollback(cleanup)
            uow.after_commit(after)
            if failure and failure != "commit":
                raise error
            uow.commit.assert_not_awaited()
            cleanup.assert_not_awaited()
            after.assert_not_awaited()

    if failure:
        with pytest.raises(type(error)) as caught:
            await operation()
        assert caught.value is error
        cleanup.assert_awaited_once()
        after.assert_not_awaited()
        uow.rollback.assert_awaited_once()
    else:
        await operation()
        after.assert_awaited_once()
        cleanup.assert_not_awaited()
        uow.rollback.assert_not_awaited()
    assert uow.commit.await_count == (1 if failure in (None, "commit") else 0)
    uow._close.assert_awaited_once()
    assert not uow._rollback_actions and not uow._after_commit_actions


async def test_rollback_cleanup_and_close_failures_preserve_primary_error():
    uow = MemoryUnitOfWork()
    uow.rollback.side_effect = RuntimeError("rollback")
    uow._close.side_effect = RuntimeError("close")
    first = AsyncMock()
    second = AsyncMock(side_effect=RuntimeError("provider"))
    error = ValueError("original")
    with pytest.raises(ValueError) as caught:
        async with uow:
            uow.on_rollback(first)
            uow.on_rollback(second)
            raise error
    assert caught.value is error
    second.assert_awaited_once()
    first.assert_awaited_once()
    uow._close.assert_awaited_once()


@pytest.mark.parametrize("best_effort", [False, True])
async def test_post_commit_failure_never_rolls_back_committed_resources(best_effort):
    uow = MemoryUnitOfWork()
    cleanup, other = AsyncMock(), AsyncMock()

    async def operation():
        async with uow:
            uow.on_rollback(cleanup)
            uow.after_commit(AsyncMock(side_effect=ValueError("provider")), best_effort=best_effort)
            uow.after_commit(other)

    if best_effort:
        await operation()
    else:
        with pytest.raises(ValueError, match="provider"):
            await operation()
    uow.commit.assert_awaited_once()
    uow.rollback.assert_not_awaited()
    cleanup.assert_not_awaited()
    other.assert_awaited_once()
    uow._close.assert_awaited_once()


@pytest.mark.parametrize("close_fails", [False, True])
async def test_repository_initialization_failure_closes_session(monkeypatch, close_fails):
    session = AsyncMock()
    if close_fails:
        session.close.side_effect = RuntimeError("close")
    monkeypatch.setattr(unit_of_work, "async_session_factory", Mock(return_value=session))
    uow = SQLModelUnitOfWork()
    monkeypatch.setattr(uow, "_attach_repositories", Mock(side_effect=ValueError("initialization")))
    with pytest.raises(ValueError, match="initialization"):
        async with uow:
            pytest.fail("must not enter")
    session.close.assert_awaited_once()
    assert uow._session is None


@pytest.mark.parametrize("failure", [None, "commit", "post_commit"])
async def test_request_shares_uow_and_finishes_transaction_before_success(failure):
    app = FastAPI()
    app.add_exception_handler(DomainAuthenticationUnavailableException, domain_exception_handler)
    uow = MemoryUnitOfWork()
    entries = []
    if failure == "commit":
        uow.commit.side_effect = RuntimeError("database")
    if failure == "post_commit":
        uow.after_commit(AsyncMock(side_effect=DomainAuthenticationUnavailableException("Password saved; revocation failed.")))

    async def provider():
        entries.append(uow)
        async with uow:
            yield uow

    async def identity(uow=Depends(get_uow, scope="function")):
        return uow

    async def category_service(uow=Depends(get_uow, scope="function")):
        return get_user_category_service(uow)

    app.dependency_overrides[get_uow] = provider
    app.dependency_overrides[get_current_user] = identity
    app.dependency_overrides[get_user_category_service] = category_service

    @app.post("/operation")
    async def operation(response: Response, auth=Depends(get_current_user),
                        service=Depends(get_user_category_service),
                        current=Depends(get_uow, scope="function")):
        assert auth is service.uow is current
        current.commit.assert_not_awaited()
        response.set_cookie("success", "yes")
        return {"saved": True}

    async with AsyncClient(transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test") as client:
        response = await client.post("/operation")
    assert len(entries) == 1
    assert response.status_code == {None: 200, "commit": 500, "post_commit": 503}[failure]
    assert ("set-cookie" in response.headers) == (failure is None)
    uow.commit.assert_awaited_once()
    uow._close.assert_awaited_once()
    assert uow.rollback.await_count == (1 if failure == "commit" else 0)


async def test_recovery_does_not_retry_a_failed_transaction():
    from sqlalchemy.exc import OperationalError
    uow = MemoryUnitOfWork()
    uow.users = SimpleNamespace(get_by_email=AsyncMock(side_effect=OperationalError("query", {}, Exception())))
    with pytest.raises(OperationalError):
        async with uow:
            await AuthService.recover_account(uow, AccountRecoveryRequest(email="user@example.com"))
    uow.users.get_by_email.assert_awaited_once()
    uow.rollback.assert_awaited_once()


def test_transaction_calls_and_dependency_scopes_stay_in_uow():
    root = Path(__file__).parents[1] / "src/app"
    injection_count = 0
    for path in root.rglob("*.py"):
        if path.name == "unit_of_work.py":
            continue
        for node in ast.walk(ast.parse(path.read_text())):
            if not isinstance(node, ast.Call):
                continue
            if isinstance(node.func, ast.Attribute):
                assert node.func.attr not in {"commit", "rollback"}, f"{path}:{node.lineno}"
            if isinstance(node.func, ast.Name) and node.func.id == "Depends" and node.args:
                if isinstance(node.args[0], ast.Name) and node.args[0].id == "get_uow":
                    injection_count += 1
                    assert any(k.arg == "scope" and isinstance(k.value, ast.Constant) and k.value.value == "function" for k in node.keywords)
    assert injection_count >= 29
