"""Login regression tests using mocked repositories and Firebase responses."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import AuthenticationUnavailableException, ForbiddenDomainException, InvalidCredentialsException, UnauthorizedDomainException
from app.features.auth import service
from app.features.auth.schemas import LoginRequest
from app.core.security import hash_password
from app.features.users.models import UserStatus


@pytest.fixture(autouse=True)
def setup_test_db():
    # Service tests use no database; override the global database fixture.
    yield


@pytest.fixture
def login_dependencies(monkeypatch):
    user = SimpleNamespace(
        user_id="user-1", firebase_uid="firebase-1", password="hashed-password",
        role="teacher", status=UserStatus.ACTIVE, email="person@example.com",
    )
    users = SimpleNamespace(
        get_by_student_id=AsyncMock(return_value=None),
        get_by_teacher_id=AsyncMock(return_value=user),
        get_by_firebase_uid=AsyncMock(return_value=user),
    )
    monkeypatch.setattr(service, "sign_in_with_password", AsyncMock(return_value={
        "localId": "firebase-1", "idToken": "access", "refreshToken": "refresh",
    }))
    return SimpleNamespace(users=users), user


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", ["student", "teacher", "email"])
async def test_login_supports_each_identity(kind, login_dependencies):
    uow, user = login_dependencies
    if kind == "student":
        uow.users.get_by_student_id.return_value = user
    identity = "person@example.com" if kind == "email" else "ID-123"
    result = await service.AuthService.login_with_password(uow, LoginRequest(email=identity, password="password"))
    assert result.data.token.idToken == "access"
    assert result.data.token.refreshToken == "refresh"
    service.sign_in_with_password.assert_awaited_once_with("person@example.com", "password")
    if kind == "teacher":
        uow.users.get_by_teacher_id.assert_awaited_once_with(identity)
    elif kind == "student":
        uow.users.get_by_teacher_id.assert_not_awaited()
    else:
        uow.users.get_by_firebase_uid.assert_awaited_once_with("firebase-1")


@pytest.mark.asyncio
async def test_email_without_application_account_is_rejected(login_dependencies):
    uow, _ = login_dependencies
    uow.users.get_by_firebase_uid.return_value = None
    with pytest.raises(UnauthorizedDomainException, match="not registered"):
        await service.AuthService.login_with_password(uow, LoginRequest(email="person@example.com", password="password"))


@pytest.mark.asyncio
async def test_inactive_email_account_is_rejected(login_dependencies):
    uow, user = login_dependencies
    user.status = "inactive"
    with pytest.raises(UnauthorizedDomainException, match="inactive"):
        await service.AuthService.login_with_password(uow, LoginRequest(email="person@example.com", password="password"))


@pytest.mark.asyncio
async def test_wrong_teacher_password_is_rejected(login_dependencies):
    uow, _ = login_dependencies
    service.sign_in_with_password.return_value = None
    with pytest.raises(InvalidCredentialsException):
        await service.AuthService.login_with_password(uow, LoginRequest(email="ID-123", password="wrong"))


@pytest.mark.asyncio
async def test_failed_email_login_does_not_fall_through_to_id_lookup(login_dependencies):
    uow, _ = login_dependencies
    service.sign_in_with_password.return_value = None
    with pytest.raises(InvalidCredentialsException):
        await service.AuthService.login_with_password(uow, LoginRequest(email="person@example.com", password="wrong"))
    uow.users.get_by_student_id.assert_not_awaited()
    uow.users.get_by_teacher_id.assert_not_awaited()


@pytest.mark.asyncio
async def test_provider_outage_is_not_an_invalid_password(login_dependencies):
    uow, _ = login_dependencies
    service.sign_in_with_password.side_effect = AuthenticationUnavailableException()
    with pytest.raises(AuthenticationUnavailableException):
        await service.AuthService.login_with_password(uow, LoginRequest(email="ID-123", password="password"))


@pytest.mark.asyncio
@pytest.mark.parametrize("identity", ["ID-123", "person@example.com"])
async def test_wrong_portal_is_rejected_before_session_issuance(identity, login_dependencies):
    uow, _ = login_dependencies
    with pytest.raises(ForbiddenDomainException, match="teacher, not a student"):
        await service.AuthService.login_with_password(uow, LoginRequest(email=identity, password="password", role="student"))


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", ["student", "teacher", "email"])
async def test_email_reset_password_is_authoritative_for_all_logins(kind, login_dependencies):
    uow, user = login_dependencies
    user.password = hash_password("old-password")
    if kind == "student":
        uow.users.get_by_student_id.return_value = user
    identity = user.email if kind == "email" else "ID-123"
    async def firebase_password(email, password):
        if password == "new-password":
            return {"localId": user.firebase_uid, "idToken": "new-access", "refreshToken": "new-refresh"}
        return None
    service.sign_in_with_password.side_effect = firebase_password
    with pytest.raises(InvalidCredentialsException):
        await service.AuthService.login_with_password(uow, LoginRequest(email=identity, password="old-password"))
    result = await service.AuthService.login_with_password(uow, LoginRequest(email=identity, password="new-password"))
    assert result.data.token.idToken == "new-access"


@pytest.mark.asyncio
async def test_id_cannot_sign_in_as_a_different_firebase_account(login_dependencies):
    uow, _ = login_dependencies
    service.sign_in_with_password.return_value["localId"] = "another-account"
    with pytest.raises(InvalidCredentialsException):
        await service.AuthService.login_with_password(uow, LoginRequest(email="ID-123", password="password"))
