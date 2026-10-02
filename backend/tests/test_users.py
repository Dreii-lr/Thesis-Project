"""
test_users.py — Unit and endpoint integration tests for Users feature with normalized profile details.
"""
from __future__ import annotations

from httpx import AsyncClient
import pytest

from app.features.auth.dependencies import get_current_active_user
from app.features.users.models import UserRole, UserStatus
from app.features.users.schemas import UserRead
from app.main import app


def teacher_auth_user() -> UserRead:
    return UserRead(
        user_id="teacher-auth-uuid",
        email="teacher@als.edu.ph",
        role=UserRole.TEACHER,
        status=UserStatus.ACTIVE,
        first_name="Maria",
        last_name="Santos",
    )


def admin_auth_user() -> UserRead:
    return UserRead(
        user_id="admin-auth-uuid",
        email="admin@als.edu.ph",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        first_name="Admin",
        last_name="System",
    )


def student_auth_user() -> UserRead:
    return UserRead(
        user_id="student-auth-uuid",
        email="student@als.edu.ph",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
        first_name="Juan",
        last_name="Cruz",
    )


@pytest.fixture(autouse=True)
def default_auth():
    app.dependency_overrides[get_current_active_user] = teacher_auth_user
    yield
    app.dependency_overrides.pop(get_current_active_user, None)


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
    res_body = response.json()
    data = res_body.get("data", {}).get("resources", res_body)
    assert data["email"] == "student@university.edu"
    assert data["first_name"] == "John"
    user_id = data["user_id"]

    # 2. Get user by ID
    get_res = await client.get(f"/api/v1/users/{user_id}")
    assert get_res.status_code == 200
    get_body = get_res.json()
    get_data = get_body.get("data", {}).get("resources", get_body)
    assert get_data["user_id"] == user_id

    # 3. Duplicate email conflict
    dup_res = await client.post("/api/v1/users/", json=payload)
    assert dup_res.status_code == 409
    assert dup_res.json()["error_code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_create_user_with_normalized_details(client: AsyncClient):
    """Test user creation with personal_details, contact_details, and family_details (matching frontend form)."""
    payload = {
        "firstName": "Andres",
        "lastName": "Bonifacio",
        "middleName": "C",
        "suffix": "Jr.",
        "email": "andres.bonifacio@als.edu.ph",
        "gender": "Male",
        "birthDate": "2005-11-30",
        "lrn": "109876543214",
        "placeOfBirth": "Manila",
        "civilStatus": "Single",
        "nationality": "Filipino",
        "religion": "Catholic",
        "street": "99 Kalayaan Ave",
        "city": "Manila",
        "province": "Metro Manila",
        "phone": "09199998888",
        "motherName": "Catalina de Castro",
        "fatherName": "Santiago Bonifacio",
        "guardianName": "Santiago Bonifacio",
        "guardianRelation": "Father",
        "guardianPhone": "09181112222",
        "level": "Junior High School",
    }
    res = await client.post("/api/v1/users/", json=payload)
    assert res.status_code == 201
    body = res.json()["data"]["resources"]

    assert body["email"] == "andres.bonifacio@als.edu.ph"
    assert body["first_name"] == "Andres"
    assert body["last_name"] == "Bonifacio"
    assert body["suffix"] == "Jr."
    assert body["user_category"] == "junior"

    # Verify normalized personal_details
    assert body["personal_details"] is not None
    assert body["personal_details"]["gender"] == "Male"
    assert body["personal_details"]["lrn_number"] == "109876543214"
    assert body["personal_details"]["place_of_birth"] == "Manila"
    assert body["personal_details"]["birth_date"] == "2005-11-30"

    # Verify normalized contact_details
    assert body["contact_details"] is not None
    assert body["contact_details"]["street_building_no"] == "99 Kalayaan Ave"
    assert body["contact_details"]["municipality"] == "Manila"
    assert body["contact_details"]["province"] == "Metro Manila"
    assert body["contact_details"]["contact_no"] == "09199998888"

    # Verify normalized family_details
    assert body["family_details"] is not None
    assert body["family_details"]["mother_name"] == "Catalina de Castro"
    assert body["family_details"]["father_name"] == "Santiago Bonifacio"
    assert body["family_details"]["guardian_name"] == "Santiago Bonifacio"
    assert body["family_details"]["guardian_relation"] == "Father"
    assert body["family_details"]["contact_no"] == "09181112222"

    # Retrieve and verify persistence
    user_id = body["user_id"]
    get_res = await client.get(f"/api/v1/users/{user_id}")
    assert get_res.status_code == 200
    retrieved = get_res.json()["data"]["resources"]
    assert retrieved["personal_details"]["lrn_number"] == "109876543214"
    assert retrieved["contact_details"]["contact_no"] == "09199998888"
    assert retrieved["family_details"]["guardian_relation"] == "Father"


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
    users_body = res.json()
    users_list = users_body.get("data", {}).get("resources", {}).get("users", users_body)
    assert len(users_list) >= 2


@pytest.mark.asyncio
async def test_update_user(client: AsyncClient):
    # 1. Create a user with details
    create_payload = {
        "email": "update.test@als.edu.ph",
        "first_name": "Juan",
        "last_name": "Luna",
        "personal_details": {
            "gender": "Male",
            "civil_status": "Single",
            "lrn_number": "999888777666",
        },
        "contact_details": {
            "municipality": "Badoc",
            "province": "Ilocos Norte",
            "contact_no": "09123456789",
        },
    }
    create_res = await client.post("/api/v1/users/", json=create_payload)
    assert create_res.status_code == 201
    user_id = create_res.json()["data"]["resources"]["user_id"]

    # 2. Patch user core and profile details
    update_payload = {
        "first_name": "Juancho",
        "personal_details": {
            "civil_status": "Married",
        },
        "contact_details": {
            "contact_no": "09991112233",
        },
        "family_details": {
            "mother_name": "Laureana Novicio",
            "father_name": "Joaquin Luna",
        },
    }
    patch_res = await client.patch(f"/api/v1/users/{user_id}", json=update_payload)
    assert patch_res.status_code == 200
    updated_data = patch_res.json()["data"]["resources"]

    assert updated_data["first_name"] == "Juancho"
    assert updated_data["personal_details"]["civil_status"] == "Married"
    assert updated_data["personal_details"]["lrn_number"] == "999888777666"
    assert updated_data["contact_details"]["contact_no"] == "09991112233"
    assert updated_data["family_details"]["mother_name"] == "Laureana Novicio"

    # 3. Verify get returns updated details
    get_res = await client.get(f"/api/v1/users/{user_id}")
    assert get_res.status_code == 200
    retrieved = get_res.json()["data"]["resources"]
    assert retrieved["first_name"] == "Juancho"
    assert retrieved["personal_details"]["civil_status"] == "Married"
    assert retrieved["contact_details"]["contact_no"] == "09991112233"
    assert retrieved["family_details"]["mother_name"] == "Laureana Novicio"


@pytest.mark.asyncio
async def test_soft_delete_unenroll_user(client: AsyncClient):
    # 1. Create student
    payload = {
        "email": "soft.delete@als.edu.ph",
        "first_name": "Apolinario",
        "last_name": "Mabini",
        "personal_details": {
            "gender": "Male",
            "lrn_number": "555444333222",
        },
        "contact_details": {
            "municipality": "Tanauan",
            "province": "Batangas",
        },
    }
    create_res = await client.post("/api/v1/users/", json=payload)
    assert create_res.status_code == 201
    user_id = create_res.json()["data"]["resources"]["user_id"]
    assert create_res.json()["data"]["resources"]["status"] == "enrolled"

    # 2. Soft delete / unenroll via DELETE /api/v1/users/{user_id}
    del_res = await client.delete(f"/api/v1/users/{user_id}")
    assert del_res.status_code == 200
    del_body = del_res.json()
    assert del_body["message_status"] == "SUCCESS_UNENROLL"
    assert del_body["data"]["resources"]["status"] == "unenroll"

    # 3. Verify user still exists in database and related details are preserved
    get_res = await client.get(f"/api/v1/users/{user_id}")
    assert get_res.status_code == 200
    retrieved = get_res.json()["data"]["resources"]
    assert retrieved["user_id"] == user_id
    assert retrieved["status"] == "unenroll"
    assert retrieved["first_name"] == "Apolinario"
    assert retrieved["personal_details"]["lrn_number"] == "555444333222"
    assert retrieved["contact_details"]["municipality"] == "Tanauan"

    # 4. Verify dedicated PATCH unenroll endpoint also works
    unenroll_res = await client.patch(f"/api/v1/users/{user_id}/unenroll")
    assert unenroll_res.status_code == 200
    assert unenroll_res.json()["data"]["resources"]["status"] == "unenroll"


# ── Teacher Creation Tests (Admin Only) ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_can_create_teacher_user(client: AsyncClient):
    """Admin can create a teacher user via POST /api/v1/users/teachers."""
    app.dependency_overrides[get_current_active_user] = admin_auth_user

    payload = {
        "email": "teacher.santos@als.edu.ph",
        "password": "TeacherPassword123!",
        "first_name": "Maria",
        "last_name": "Santos",
        "middle_name": "Reyes",
        "teacher_id": "TCH-2026-001",
        "personal_details": {
            "gender": "Female",
            "civil_status": "Married",
        },
        "contact_details": {
            "municipality": "Quezon City",
            "province": "Metro Manila",
            "contact_no": "09181234567",
        },
    }

    res = await client.post("/api/v1/users/teachers", json=payload)
    assert res.status_code == 201
    body = res.json()["data"]["resources"]

    assert body["email"] == "teacher.santos@als.edu.ph"
    assert body["first_name"] == "Maria"
    assert body["last_name"] == "Santos"
    assert body["role"] == "teacher"
    assert body["teacher_id"] == "TCH-2026-001"
    assert body["student_id"] is None
    assert body["personal_details"]["civil_status"] == "Married"
    assert body["contact_details"]["contact_no"] == "09181234567"

    # Verify retrieval
    user_id = body["user_id"]
    get_res = await client.get(f"/api/v1/users/{user_id}")
    assert get_res.status_code == 200
    retrieved = get_res.json()["data"]["resources"]
    assert retrieved["teacher_id"] == "TCH-2026-001"
    assert retrieved["role"] == "teacher"


@pytest.mark.asyncio
async def test_admin_create_teacher_auto_generates_id(client: AsyncClient):
    """If teacher_id is not provided, it is automatically generated with TCH- prefix."""
    app.dependency_overrides[get_current_active_user] = admin_auth_user

    payload = {
        "email": "auto.teacher@als.edu.ph",
        "first_name": "Jose",
        "last_name": "Rizal",
    }

    res = await client.post("/api/v1/users/teachers", json=payload)
    assert res.status_code == 201
    body = res.json()["data"]["resources"]

    assert body["email"] == "auto.teacher@als.edu.ph"
    assert body["role"] == "teacher"
    assert body["teacher_id"] is not None
    assert body["teacher_id"].startswith("TCH-")


@pytest.mark.asyncio
async def test_teacher_singular_route_alias(client: AsyncClient):
    """POST /api/v1/users/teacher also works as an alias for /teachers."""
    app.dependency_overrides[get_current_active_user] = admin_auth_user

    payload = {
        "email": "singular.teacher@als.edu.ph",
        "first_name": "Emilio",
        "last_name": "Aguinaldo",
    }

    res = await client.post("/api/v1/users/teacher", json=payload)
    assert res.status_code == 201
    assert res.json()["data"]["resources"]["role"] == "teacher"


@pytest.mark.asyncio
async def test_non_admin_forbidden_from_creating_teacher(client: AsyncClient):
    """Teachers and students cannot create teacher accounts (403 Forbidden)."""
    payload = {
        "email": "unauthorized.teacher@als.edu.ph",
        "first_name": "Test",
        "last_name": "Teacher",
    }

    # 1. Teacher tries to create teacher -> 403 Forbidden
    app.dependency_overrides[get_current_active_user] = teacher_auth_user
    res_teacher = await client.post("/api/v1/users/teachers", json=payload)
    assert res_teacher.status_code == 403
    assert res_teacher.json()["error_code"] == "FORBIDDEN"

    # 2. Student tries to create teacher -> 403 Forbidden
    app.dependency_overrides[get_current_active_user] = student_auth_user
    res_student = await client.post("/api/v1/users/teachers", json=payload)
    assert res_student.status_code == 403
    assert res_student.json()["error_code"] == "FORBIDDEN"

    # 3. Unauthenticated request -> 401 Unauthorized
    app.dependency_overrides.pop(get_current_active_user, None)
    res_anon = await client.post("/api/v1/users/teachers", json=payload)
    assert res_anon.status_code == 401
    assert res_anon.json()["error_code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_create_teacher_conflict_checks(client: AsyncClient):
    """Duplicate email or teacher_id returns 409 Conflict."""
    app.dependency_overrides[get_current_active_user] = admin_auth_user

    payload1 = {
        "email": "conflict.teacher@als.edu.ph",
        "first_name": "First",
        "last_name": "Teacher",
        "teacher_id": "TCH-UNIQUE-001",
    }
    res1 = await client.post("/api/v1/users/teachers", json=payload1)
    assert res1.status_code == 201

    # Duplicate email
    dup_email_payload = {
        "email": "conflict.teacher@als.edu.ph",
        "first_name": "Another",
        "last_name": "Person",
        "teacher_id": "TCH-DIFFERENT-002",
    }
    res_dup_email = await client.post("/api/v1/users/teachers", json=dup_email_payload)
    assert res_dup_email.status_code == 409
    assert res_dup_email.json()["error_code"] == "CONFLICT"

    # Duplicate teacher_id
    dup_id_payload = {
        "email": "different.email@als.edu.ph",
        "first_name": "Third",
        "last_name": "Person",
        "teacher_id": "TCH-UNIQUE-001",
    }
    res_dup_id = await client.post("/api/v1/users/teachers", json=dup_id_payload)
    assert res_dup_id.status_code == 409
    assert res_dup_id.json()["error_code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_create_teacher_forces_teacher_role(client: AsyncClient):
    """Even if caller provides 'role': 'admin' or 'student', role is always saved as 'teacher'."""
    app.dependency_overrides[get_current_active_user] = admin_auth_user

    payload = {
        "email": "role.forced@als.edu.ph",
        "first_name": "Forced",
        "last_name": "Role",
        "role": "admin",
    }

    res = await client.post("/api/v1/users/teachers", json=payload)
    assert res.status_code == 201
    body = res.json()["data"]["resources"]
    assert body["role"] == "teacher"
