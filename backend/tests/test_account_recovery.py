"""Recovery routes and email delivery, with no messages sent to real accounts."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import httpx
from httpx import AsyncClient
import pytest
import pytest_asyncio
from firebase_admin import auth

from app.core import firebase
from app.core.exceptions import AuthenticationUnavailableException, RecoveryRateLimitException
from app.core.unit_of_work import get_uow
from app.features.auth import service
from app.features.users.schemas import UserRead
from app.main import app


@pytest.fixture(autouse=True)
def setup_test_db():
    yield  # These tests use repository doubles, not a live database.


@pytest_asyncio.fixture
async def recovery_client(monkeypatch):
    user = UserRead(user_id="user-1", firebase_uid="firebase-1", email="user@example.com", role="student", status="active")
    users = SimpleNamespace(
        get_by_email=AsyncMock(return_value=user),
        get_by_student_id=AsyncMock(return_value=user),
        get_by_teacher_id=AsyncMock(return_value=user),
    )
    async def provide_uow():
        yield SimpleNamespace(users=users)
    app.dependency_overrides[get_uow] = provide_uow
    send = AsyncMock()
    monkeypatch.setattr(service, "send_password_reset_email", send)
    try:
        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            yield client, users, user, send
    finally:
        app.dependency_overrides.pop(get_uow, None)


@pytest.mark.asyncio
@pytest.mark.parametrize("identity,kind", [("  USER@EXAMPLE.COM  ", "email"), (" STU-123 ", "student"), ("TCH-123", "teacher")])
async def test_recovery_accepts_email_and_institutional_ids(recovery_client, identity, kind):
    client, users, _, send = recovery_client
    if kind == "teacher":
        users.get_by_student_id.return_value = None
    response = await client.post("/api/v1/auth/recover", json={"email": identity})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert "set-cookie" not in response.headers
    assert "user@example.com" not in response.text
    assert "firebase-1" not in response.text
    send.assert_awaited_once_with("firebase-1")
    if kind == "email":
        users.get_by_email.assert_awaited_once_with("user@example.com")
    elif kind == "student":
        users.get_by_student_id.assert_awaited_once_with("STU-123")
        users.get_by_teacher_id.assert_not_awaited()
    else:
        users.get_by_teacher_id.assert_awaited_once_with("TCH-123")


@pytest.mark.asyncio
async def test_unknown_inactive_and_unlinked_accounts_have_identical_responses(recovery_client):
    client, users, user, send = recovery_client
    payload = {"email": "user@example.com"}
    known = await client.post("/api/v1/auth/recover", json=payload)
    send.reset_mock()
    users.get_by_email.return_value = None
    missing = await client.post("/api/v1/auth/recover", json=payload)
    users.get_by_email.return_value = user
    user.status = "inactive"
    inactive = await client.post("/api/v1/auth/recover", json=payload)
    user.status = "active"
    user.firebase_uid = None
    unlinked = await client.post("/api/v1/auth/recover", json=payload)
    for response in [missing, inactive, unlinked]:
        assert response.status_code == known.status_code == 200
        assert response.json() == known.json()
    send.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [{}, {"email": "   "}, {"email": "x" * 255}, {"email": None}, {"email": 123}])
async def test_recovery_validates_input_before_delivery(recovery_client, payload):
    client, _, _, send = recovery_client
    assert (await client.post("/api/v1/auth/recover", json=payload)).status_code == 422
    send.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("error,status", [(AuthenticationUnavailableException(), 503), (RecoveryRateLimitException(), 429)])
async def test_recovery_reports_delivery_failures(recovery_client, error, status):
    client, _, _, send = recovery_client
    send.side_effect = error
    response = await client.post("/api/v1/auth/recover", json={"email": "user@example.com"})
    assert response.status_code == status
    assert "set-cookie" not in response.headers


@pytest.fixture
def provider(monkeypatch):
    monkeypatch.setattr(firebase, "firebase_app", object())
    lookup = Mock(return_value=SimpleNamespace(disabled=False, email="firebase-address@example.com"))
    monkeypatch.setattr(firebase.auth, "get_user", lookup)
    requests = []
    result = SimpleNamespace(response=httpx.Response(200, json={"email": "firebase-address@example.com"}))
    def handle(request):
        requests.append(request)
        if isinstance(result.response, Exception):
            raise result.response
        return result.response
    monkeypatch.setattr(firebase.httpx, "AsyncClient", lambda **kwargs: AsyncClient(
        transport=httpx.MockTransport(handle), **kwargs,
    ))
    return lookup, requests, result


@pytest.mark.asyncio
async def test_reset_email_uses_firebase_destination_and_hosted_action(provider):
    import json
    lookup, requests, _ = provider
    await firebase.send_password_reset_email("firebase-1")
    lookup.assert_called_once_with("firebase-1", app=firebase.firebase_app)
    assert len(requests) == 1
    assert requests[0].url.path == "/v1/accounts:sendOobCode"
    assert json.loads(requests[0].content) == {"requestType": "PASSWORD_RESET", "email": "firebase-address@example.com"}


@pytest.mark.asyncio
@pytest.mark.parametrize("response", [
    httpx.Response(503, json={"error": {"message": "UNAVAILABLE"}}),
    httpx.Response(400, json={"error": {"message": "API_KEY_INVALID"}}),
    httpx.Response(200, text="invalid json"),
    httpx.ReadTimeout("delivery outcome unknown"),
])
async def test_email_delivery_failure_is_not_silent_or_retried(provider, response):
    _, requests, result = provider
    result.response = response
    with pytest.raises(AuthenticationUnavailableException):
        await firebase.send_password_reset_email("firebase-1")
    assert len(requests) == 1


@pytest.mark.asyncio
async def test_firebase_email_throttling_is_reported(provider):
    _, _, result = provider
    result.response = httpx.Response(400, json={"error": {"message": "TOO_MANY_ATTEMPTS_TRY_LATER"}})
    with pytest.raises(RecoveryRateLimitException):
        await firebase.send_password_reset_email("firebase-1")


@pytest.mark.asyncio
async def test_deleted_firebase_account_does_not_disclose_existence(provider):
    lookup, requests, _ = provider
    lookup.side_effect = auth.UserNotFoundError("deleted")
    await firebase.send_password_reset_email("firebase-1")
    assert requests == []


@pytest.mark.asyncio
async def test_account_deleted_between_lookup_and_delivery_is_private(provider):
    _, _, result = provider
    result.response = httpx.Response(400, json={"error": {"message": "EMAIL_NOT_FOUND"}})
    await firebase.send_password_reset_email("firebase-1")
