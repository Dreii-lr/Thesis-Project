from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from httpx import AsyncClient

from app.features.auth.dependencies import get_current_active_user
from app.features.users.models import UserRole, UserStatus
from app.features.users.schemas import UserRead
from app.main import app


@pytest.mark.asyncio
async def test_auth_flow(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        "app.features.users.service.check_email_in_firebase",
        Mock(return_value=None),
    )
    monkeypatch.setattr(
        "app.features.users.service.create_firebase_new_user",
        Mock(return_value=SimpleNamespace(uid="firebase-auth-uid")),
    )
    monkeypatch.setattr(
        "app.features.auth.service.sign_in_with_password",
        AsyncMock(return_value={"localId": "firebase-auth-uid", "idToken": "fake-jwt", "refreshToken": "fake-refresh"}),
    )
    monkeypatch.setattr(
        "app.features.auth.service.refresh_firebase_token",
        AsyncMock(return_value={"idToken": "new-fake-jwt", "refreshToken": "new-fake-refresh"}),
    )
    monkeypatch.setattr(
        "app.core.firebase.logout",
        Mock(),
    )
    monkeypatch.setattr(
        "app.core.dependencies.verify_firebase_id_token",
        Mock(return_value={"uid": "firebase-auth-uid", "email": "auth_user@test.com"}),
    )

    # 1. Admin creates and activates user account
    admin_user = UserRead(
        user_id="admin-auth-id",
        email="admin@test.com",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    app.dependency_overrides[get_current_active_user] = lambda: admin_user

    register_payload = {
        "email": "auth_user@test.com",
        "password": "Password123!",
        "first_name": "Auth",
        "last_name": "Tester",
    }
    reg_res = await client.post("/api/v1/users/", json=register_payload)
    assert reg_res.status_code == 201
    user_id = reg_res.json()["data"]["resources"]["user_id"]

    # Activate/enroll user
    enroll_res = await client.post(f"/api/v1/users/{user_id}")
    assert enroll_res.status_code == 200

    app.dependency_overrides.pop(get_current_active_user, None)

    # 2. Login with correct credentials
    login_payload = {
        "email": "auth_user@test.com",
        "password": "Password123!",
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    access_token = login_res.cookies.get("access_token")
    refresh_token = login_res.cookies.get("refresh_token")
    assert access_token is not None
    assert refresh_token is not None

    # 3. Access /auth/me with Bearer token
    headers = {"Authorization": f"Bearer {access_token}"}
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "auth_user@test.com"

    # 4. Refresh token rotation
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    new_access_token = refresh_res.cookies.get("access_token")
    assert new_access_token is not None

    # 5. Logout
    logout_res = await client.post(
        "/api/v1/auth/logout",
        cookies={"access_token": new_access_token},
    )
    assert logout_res.status_code == 200


@pytest.mark.asyncio
async def test_invalid_login(client: AsyncClient):
    login_payload = {
        "email": "nonexistent@test.com",
        "password": "WrongPassword!",
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 401
    assert login_res.json()["error_code"] == "UNAUTHORIZED"
