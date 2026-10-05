"""Exercise real routes, cookies and error mapping without external accounts."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
import pytest_asyncio

from app.core import dependencies
from app.core.exceptions import AuthenticationUnavailableException, UnauthorizedDomainException
from app.core.unit_of_work import get_uow
from app.features.auth import service
from app.features.auth.schemas import TokenResponse
from app.features.users.schemas import UserRead
from app.main import app


@pytest.fixture(autouse=True)
def setup_test_db():
    yield


@pytest_asyncio.fixture
async def session_client(monkeypatch):
    user = UserRead(user_id="user-1", firebase_uid="firebase-1", email="user@example.com", role="student", status="active")
    uow = SimpleNamespace(users=SimpleNamespace(get_by_firebase_uid=AsyncMock(return_value=user)))
    async def provide_uow():
        yield uow
    app.dependency_overrides[get_uow] = provide_uow
    monkeypatch.setattr(service, "sign_in_with_password", AsyncMock(return_value={
        "localId": "firebase-1", "idToken": "access", "refreshToken": "refresh",
    }))
    monkeypatch.setattr(service, "refresh_firebase_token", AsyncMock(return_value=TokenResponse(idToken="new-access", refreshToken="new-refresh")))
    monkeypatch.setattr(service, "logout", Mock(return_value=True))
    monkeypatch.setattr(dependencies, "verify_firebase_id_token", Mock(return_value={"uid": "firebase-1"}))
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_uow, None)


@pytest.mark.asyncio
async def test_login_refresh_logout_cookie_lifecycle(session_client):
    client = session_client
    login = await client.post("/api/v1/auth/login", json={"email": "user@example.com", "password": "password", "role": "student"})
    assert login.status_code == 200
    assert login.headers["cache-control"] == "no-store"
    assert "access" not in login.text
    assert client.cookies["access_token"] == "access"
    assert client.cookies["refresh_token"] == "refresh"
    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["role"] == "student"
    dependencies.verify_firebase_id_token.assert_called_with("access", check_revoked=True)
    refreshed = await client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    service.refresh_firebase_token.assert_awaited_once_with("refresh")
    assert client.cookies["access_token"] == "new-access"
    logout = await client.post("/api/v1/auth/logout")
    assert logout.status_code == 200
    assert "access_token" not in client.cookies
    assert "refresh_token" not in client.cookies
    assert (await client.get("/api/v1/auth/me")).status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize("error,status,code", [
    (AuthenticationUnavailableException(), 503, "AUTH_UNAVAILABLE"),
    (UnauthorizedDomainException("expired", "TOKEN_EXPIRED"), 401, "TOKEN_EXPIRED"),
    (UnauthorizedDomainException("revoked", "TOKEN_REVOKED"), 401, "TOKEN_REVOKED"),
])
async def test_profile_reports_the_actual_failure(session_client, error, status, code):
    session_client.cookies.set("access_token", "access")
    dependencies.verify_firebase_id_token.side_effect = error
    response = await session_client.get("/api/v1/auth/me")
    assert response.status_code == status
    assert response.json()["error_code"] == code
    assert "set-cookie" not in response.headers


@pytest.mark.asyncio
async def test_refresh_outage_keeps_existing_cookies(session_client):
    session_client.cookies.set("refresh_token", "refresh")
    service.refresh_firebase_token.side_effect = AuthenticationUnavailableException()
    response = await session_client.post("/api/v1/auth/refresh")
    assert response.status_code == 503
    assert "set-cookie" not in response.headers
    assert session_client.cookies["refresh_token"] == "refresh"


@pytest.mark.asyncio
async def test_wrong_portal_does_not_issue_cookies_or_revoke_tokens(session_client):
    response = await session_client.post("/api/v1/auth/login", json={"email": "user@example.com", "password": "password", "role": "teacher"})
    assert response.status_code == 403
    assert "set-cookie" not in response.headers
    service.logout.assert_not_called()
