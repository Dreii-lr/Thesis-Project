"""
test_users.py — Unit and endpoint integration tests for Users feature.
"""
from __future__ import annotations

from httpx import AsyncClient
import pytest


@pytest.mark.asyncio
async def test_create_and_get_user(client: AsyncClient):
    # 1. Create user
    payload = {
        "email": "student@university.edu",
        "password": "SecurePassword123!",
        "first_name": "John",
        "last_name": "Doe",
        "middle_name": "M",
        "student_id": "ST-2026-001",
        "role": "student",
    }
    response = await client.post("/api/v1/users/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "student@university.edu"
    assert data["first_name"] == "John"
    assert data["student_id"] == "ST-2026-001"
    user_id = data["user_id"]

    # 2. Get user by ID
    get_res = await client.get(f"/api/v1/users/{user_id}")
    assert get_res.status_code == 200
    assert get_res.json()["user_id"] == user_id

    # 3. Duplicate email conflict
    dup_res = await client.post("/api/v1/users/", json=payload)
    assert dup_res.status_code == 409
    assert dup_res.json()["error_code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_list_users(client: AsyncClient):
    # Create two users
    u1 = {
        "email": "user1@test.com",
        "password": "Password123!",
        "first_name": "Alice",
        "last_name": "Smith",
    }
    u2 = {
        "email": "user2@test.com",
        "password": "Password123!",
        "first_name": "Bob",
        "last_name": "Jones",
    }
    await client.post("/api/v1/users/", json=u1)
    await client.post("/api/v1/users/", json=u2)

    res = await client.get("/api/v1/users/")
    assert res.status_code == 200
    users = res.json()
    assert len(users) == 2
