"""Login regression tests using mocked repositories and Firebase responses."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.exc import ProgrammingError

from app.core.exceptions import DomainAuthenticationUnavailableException, DomainInvalidCredentialsException, DomainUnauthorizedDomainException
from app.features.auth import service
from app.features.auth.schemas import LoginRequest
from app.features.users import service as users_service
from app.features.users.models import UserRole, UserStatus
from app.features.users.schemas import UserRead


@pytest.fixture(autouse=True)
def setup_test_db():
    yield  # These service tests do not use a database.


@pytest.fixture
def login_dependencies(monkeypatch):
    user = UserRead(
        user_id="user-1", account_id="226-00001", firebase_uid="firebase-1",
        password="old-local-hash", role=UserRole.STUDENT, status=UserStatus.ACTIVE,
        email="person@example.com", personal_details={"birth_date": "2005-11-30"},
    )
    users = SimpleNamespace(
        get_by_email=AsyncMock(return_value=user),
        get_by_account_id=AsyncMock(return_value=user),
        get_by_id=AsyncMock(return_value=user),
        update=AsyncMock(),
    )
    monkeypatch.setattr(service, "sign_in_with_password", AsyncMock(return_value={
        "localId": "firebase-1", "idToken": "access", "refreshToken": "refresh",
    }))
    return SimpleNamespace(users=users), user


@pytest.mark.asyncio
@pytest.mark.parametrize("identity", ["226-00001", " PERSON@EXAMPLE.COM ", "user-1"])
async def test_student_login_supports_account_id_email_and_uuid(identity, login_dependencies):
    uow, user = login_dependencies
    if identity == user.user_id:
        uow.users.get_by_account_id.return_value = None
    result = await service.AuthService.login_with_password(uow, LoginRequest(account_id=identity, password="password"))
    assert result.data.token.idToken == "access"
    assert result.data.token.refreshToken == "refresh"
    service.sign_in_with_password.assert_awaited_once_with(user.email, "password")
    if "@" in identity:
        uow.users.get_by_email.assert_awaited_once_with("person@example.com")
        uow.users.get_by_account_id.assert_not_awaited()
    elif identity == user.user_id:
        uow.users.get_by_id.assert_awaited_once_with(user.user_id)
    else:
        uow.users.get_by_account_id.assert_awaited_once_with(user.account_id)


@pytest.mark.asyncio
@pytest.mark.parametrize("role", [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN])
async def test_generated_email_accounts_still_work(role, login_dependencies):
    uow, user = login_dependencies
    user.role = role
    if role == UserRole.STUDENT:
        user.email = None
    await service.AuthService.login_with_password(uow, LoginRequest(account_id=user.account_id, password="password"))
    service.sign_in_with_password.assert_awaited_once_with(f"{user.account_id}@gmail.com", "password")


@pytest.mark.asyncio
async def test_email_without_application_account_is_rejected(login_dependencies):
    uow, _ = login_dependencies
    uow.users.get_by_email.return_value = None
    with pytest.raises(DomainUnauthorizedDomainException, match="not registered"):
        await service.AuthService.login_with_password(uow, LoginRequest(account_id="person@example.com", password="password"))
    service.sign_in_with_password.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("status", [UserStatus.MAPPED, UserStatus.INACTIVE, UserStatus.COMPLETED])
async def test_unactivated_or_inactive_accounts_are_rejected_before_firebase(status, login_dependencies):
    uow, user = login_dependencies
    user.status = status
    message = "mapped" if status == UserStatus.MAPPED else "inactive"
    with pytest.raises(DomainUnauthorizedDomainException, match=message):
        await service.AuthService.login_with_password(uow, LoginRequest(account_id=user.account_id, password="password"))
    service.sign_in_with_password.assert_not_awaited()


@pytest.mark.asyncio
async def test_active_record_without_firebase_account_is_rejected(login_dependencies):
    uow, user = login_dependencies
    user.firebase_uid = None
    with pytest.raises(DomainUnauthorizedDomainException, match="not activated"):
        await service.AuthService.login_with_password(uow, LoginRequest(account_id=user.account_id, password="password"))
    service.sign_in_with_password.assert_not_awaited()


@pytest.mark.asyncio
async def test_wrong_teacher_password_is_rejected(login_dependencies):
    uow, user = login_dependencies
    user.role = UserRole.TEACHER
    service.sign_in_with_password.return_value = None
    with pytest.raises(DomainInvalidCredentialsException):
        await service.AuthService.login_with_password(uow, LoginRequest(account_id=user.account_id, password="wrong"))


@pytest.mark.asyncio
async def test_failed_email_login_does_not_fall_through_to_id_lookup(login_dependencies):
    uow, _ = login_dependencies
    service.sign_in_with_password.return_value = None
    with pytest.raises(DomainInvalidCredentialsException):
        await service.AuthService.login_with_password(uow, LoginRequest(account_id="person@example.com", password="wrong"))
    uow.users.get_by_account_id.assert_not_awaited()
    uow.users.get_by_id.assert_not_awaited()


@pytest.mark.asyncio
async def test_provider_outage_is_not_an_invalid_password(login_dependencies):
    uow, user = login_dependencies
    service.sign_in_with_password.side_effect = DomainAuthenticationUnavailableException()
    with pytest.raises(DomainAuthenticationUnavailableException):
        await service.AuthService.login_with_password(uow, LoginRequest(account_id=user.account_id, password="password"))


@pytest.mark.asyncio
async def test_database_failure_is_not_retried_in_aborted_transaction(login_dependencies):
    uow, _ = login_dependencies
    failure = ProgrammingError("SELECT users", {}, Exception("missing profile column"))
    uow.users.get_by_email.side_effect = failure
    with pytest.raises(ProgrammingError) as caught:
        await service.AuthService.login_with_password(uow, LoginRequest(account_id="person@example.com", password="password"))
    assert caught.value is failure
    uow.users.get_by_email.assert_awaited_once()
    service.sign_in_with_password.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("role", [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN])
async def test_firebase_password_is_authoritative_after_reset(role, login_dependencies):
    uow, user = login_dependencies
    user.role = role
    async def firebase_password(email, password):
        if password == "new-password":
            return {"localId": user.firebase_uid, "idToken": "new-access", "refreshToken": "new-refresh"}
        return None
    service.sign_in_with_password.side_effect = firebase_password
    with pytest.raises(DomainInvalidCredentialsException):
        await service.AuthService.login_with_password(uow, LoginRequest(account_id=user.account_id, password="old-password"))
    result = await service.AuthService.login_with_password(uow, LoginRequest(account_id=user.account_id, password="new-password"))
    assert result.data.token.idToken == "new-access"


@pytest.mark.asyncio
async def test_id_cannot_sign_in_as_a_different_firebase_account(login_dependencies):
    uow, user = login_dependencies
    service.sign_in_with_password.return_value["localId"] = "another-account"
    with pytest.raises(DomainInvalidCredentialsException):
        await service.AuthService.login_with_password(uow, LoginRequest(account_id=user.account_id, password="password"))


@pytest.mark.asyncio
async def test_student_account_creation_and_login_use_the_same_email(login_dependencies, monkeypatch):
    uow, user = login_dependencies
    user.status = UserStatus.MAPPED
    user.firebase_uid = None
    user.password = None
    monkeypatch.setattr(users_service, "check_email_in_firebase", Mock(return_value=None))
    create_firebase = Mock(return_value=SimpleNamespace(uid="firebase-1"))
    monkeypatch.setattr(users_service, "create_firebase_new_user", create_firebase)
    monkeypatch.setattr(users_service, "hash_password", Mock(return_value="new-local-hash"))
    await users_service.UserService.create_user(uow, user.user_id)
    create_firebase.assert_called_once_with(user.email, "20051130")
    updates = uow.users.update.call_args.args[1]
    assert updates["status"] == UserStatus.ACTIVE
    user.status = updates["status"]
    user.firebase_uid = updates["firebase_uid"]
    async def firebase_login(email, password):
        if (email, password) == create_firebase.call_args.args:
            return {"localId": user.firebase_uid, "idToken": "access", "refreshToken": "refresh"}
        return None
    service.sign_in_with_password.side_effect = firebase_login
    result = await service.AuthService.login_with_password(uow, LoginRequest(account_id=user.account_id, password="20051130"))
    assert result.data.token.idToken == "access"
