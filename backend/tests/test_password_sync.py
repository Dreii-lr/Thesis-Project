from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, call

import pytest

from app.core.exceptions import DomainException, DomainInvalidCredentialsException
from app.features.users import service
from app.features.users.schemas import ChangePasswordRequest


@pytest.fixture(autouse=True)
def setup_test_db():
    yield


@pytest.mark.asyncio
@pytest.mark.parametrize("commit_fails", [False, True])
async def test_password_is_reverted_only_when_database_commit_fails(monkeypatch, commit_fails):
    user = SimpleNamespace(firebase_uid="firebase-1", password="old-hash", email="user@example.com")
    uow = SimpleNamespace(
        users=SimpleNamespace(get_entity_with_details=AsyncMock(return_value=user)),
        commit=AsyncMock(side_effect=RuntimeError("database unavailable") if commit_fails else None),
        rollback=AsyncMock(),
    )
    update = Mock(return_value=True)
    revoke = Mock(return_value=True)
    verify = AsyncMock(return_value={"localId": "firebase-1"})
    monkeypatch.setattr(service, "sign_in_with_password", verify)
    monkeypatch.setattr(service, "hash_password", Mock(return_value="new-hash"))
    monkeypatch.setattr(service, "update_firebase_user_password", update)
    monkeypatch.setattr(service, "revoke_firebase_user_tokens", revoke)
    data = ChangePasswordRequest(current_password="old-password", new_password="new-password", confirm_password="new-password")
    if commit_fails:
        with pytest.raises(DomainException, match="Unable to save"):
            await service.UserService.change_password(uow, "user-1", data)
        assert update.call_args_list == [call("firebase-1", "new-password"), call("firebase-1", "old-password")]
        uow.rollback.assert_awaited_once()
        revoke.assert_not_called()
    else:
        await service.UserService.change_password(uow, "user-1", data)
        update.assert_called_once_with("firebase-1", "new-password")
        assert user.password == "new-hash"
        revoke.assert_called_once_with("firebase-1")
        uow.rollback.assert_not_awaited()
    uow.commit.assert_awaited_once()
    verify.assert_awaited_once_with(user.email, "old-password")


@pytest.mark.asyncio
@pytest.mark.parametrize("credentials", [None, {"localId": "another-account"}])
async def test_password_change_rejects_stale_password_or_mismatched_account(monkeypatch, credentials):
    user = SimpleNamespace(firebase_uid="firebase-1", email="user@example.com", password="stale-hash")
    uow = SimpleNamespace(users=SimpleNamespace(get_entity_with_details=AsyncMock(return_value=user)))
    monkeypatch.setattr(service, "sign_in_with_password", AsyncMock(return_value=credentials))
    update = Mock()
    monkeypatch.setattr(service, "update_firebase_user_password", update)
    with pytest.raises(DomainInvalidCredentialsException):
        await service.UserService.change_password(uow, "user-1", ChangePasswordRequest(
            current_password="old-password", new_password="new-password",
        ))
    update.assert_not_called()
