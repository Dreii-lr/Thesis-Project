"""
test_auth.py — Integration tests for login, JWT tokens, me endpoint, and logout.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_flow(client: AsyncClient):
    # 1. Register a user
    register_payload = {
        "email": "auth_user@test.com",
        "password": "Password123!",
        "first_name": "Auth",
        "last_name": "Tester",
    }
    reg_res = await client.post("/api/v1/users/", json=register_payload)
    assert reg_res.status_code == 201

    # 2. Login with correct credentials
    login_payload = {
        "email": "auth_user@test.com",
        "password": "Password123!",
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert "refresh_token" in token_data
    access_token = token_data["access_token"]
    refresh_token = token_data["refresh_token"]

    # 3. Access /auth/me with Bearer token
    headers = {"Authorization": f"Bearer {access_token}"}
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "auth_user@test.com"

    # 4. Refresh token rotation
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    new_token_data = refresh_res.json()
    assert "access_token" in new_token_data

    # 5. Logout
    logout_res = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
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
