"""
test_requirements.py — Integration and contract tests for Requirements Master Catalog subsystem.
Verifies public read access, Admin CRUD operations, frontend computed fields, and RBAC guards.
"""
from __future__ import annotations

from httpx import AsyncClient
import pytest

from app.core.dependencies import get_current_active_user
from app.features.users.models import UserRole, UserStatus
from app.features.users.schemas import UserRead
from app.main import app


def admin_auth_user() -> UserRead:
    return UserRead(
        user_id="admin-req-test-uuid",
        email="admin@als.edu.ph",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        first_name="Admin",
        last_name="Master",
    )


def teacher_auth_user() -> UserRead:
    return UserRead(
        user_id="teacher-req-test-uuid",
        email="teacher@als.edu.ph",
        role=UserRole.TEACHER,
        status=UserStatus.ACTIVE,
        first_name="Maria",
        last_name="Santos",
    )


def student_auth_user() -> UserRead:
    return UserRead(
        user_id="student-req-test-uuid",
        email="student@als.edu.ph",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
        first_name="Juan",
        last_name="Cruz",
    )


OFFICIAL_TEST_REQUIREMENTS = [
    {
        "code": "rpl",
        "title": "RPL (Recognition of Prior Learning)",
        "description": "Documentation of prior learning, life experience, and informal training (ALS RPL Forms 1-4).",
        "guidance": "Upload completed RPL assessments: Form 1 (Life Experiences), Form 2 (Skills & Training), Form 3 (Work History), or Form 4 (Assessment of Knowledge/Competencies).",
        "accepted_document_types": [
            "RPL Form 1 (Life Experiences)",
            "RPL Form 2 (Record of Training/Skills)",
            "RPL Form 3 (Summary of Work History)",
            "RPL Form 4 (Competency Assessment)",
            "Alternative RPL Documentation",
        ],
        "is_required": True,
        "is_conditional": False,
        "allow_assistance": True,
        "order_index": 1,
    },
    {
        "code": "af1",
        "title": "AF1 (ALS Form 1 - Learner Profile)",
        "description": "Official DepEd ALS Form 1 containing the learner profile, basic demographics, and enrollment information.",
        "guidance": "Submit a signed and completed ALS Form 1 (Learner Profile). Ensure personal data matches your official identity records.",
        "accepted_document_types": [
            "ALS Form 1 (Learner Profile)",
            "DepEd Enrollment Intake Sheet",
        ],
        "is_required": True,
        "is_conditional": False,
        "allow_assistance": False,
        "order_index": 2,
    },
    {
        "code": "af2",
        "title": "AF2 (ALS Form 2 - Learner's Record)",
        "description": "DepEd ALS Form 2 Assessment of Basic Literacy Sheet / Learner's Continuing Record.",
        "guidance": "Submit the official ALS Form 2 documenting your literacy level, learning modules, or assessment history.",
        "accepted_document_types": [
            "ALS Form 2 (Learner's Record)",
            "Assessment of Basic Literacy Sheet",
        ],
        "is_required": True,
        "is_conditional": False,
        "allow_assistance": False,
        "order_index": 3,
    },
    {
        "code": "flt",
        "title": "FLT (Functional Literacy Test)",
        "description": "DepEd Functional Literacy Test (FLT) pre-assessment sheet or diagnostic test results.",
        "guidance": "Submit the verified FLT pre-test answer sheet or score assessment sheet signed by your ALS teacher / facilitator.",
        "accepted_document_types": [
            "FLT Pre-Test Answer Sheet",
            "FLT Score Summary Sheet",
            "FLT Assessment Result",
        ],
        "is_required": True,
        "is_conditional": False,
        "allow_assistance": True,
        "order_index": 4,
    },
    {
        "code": "psa_police_clearance",
        "title": "PSA / Police Clearance",
        "description": "Valid civil status or identity verification: PSA Birth Certificate or official Police / NBI / Barangay Clearance.",
        "guidance": "Upload a clear copy of your PSA Birth Certificate. If a birth certificate is unavailable, a valid Police Clearance or Barangay Clearance is accepted.",
        "accepted_document_types": [
            "PSA Birth Certificate",
            "Police Clearance",
            "NBI Clearance",
            "Local Civil Registrar (LCR) Birth Certificate",
            "Barangay Clearance",
        ],
        "is_required": True,
        "is_conditional": False,
        "allow_assistance": False,
        "order_index": 5,
    },
    {
        "code": "proof_of_education",
        "title": "Proof of Education - Old ID / Old Card",
        "description": "Proof of previous educational attainment: previous School ID, Report Card (Form 138), or Permanent Record (Form 137).",
        "guidance": "Upload your last report card (Form 138), transcript/permanent record (Form 137), or old school ID. If unavailable, request teacher assistance for alternative validation or exemption.",
        "accepted_document_types": [
            "Form 138 / Report Card",
            "Form 137 / Permanent Record",
            "Old School ID",
            "Certificate of Non-Completion",
            "Alternative proof for staff review",
        ],
        "is_required": True,
        "is_conditional": True,
        "allow_assistance": True,
        "order_index": 6,
    },
]


async def seed_test_database(client: AsyncClient) -> None:
    app.dependency_overrides[get_current_active_user] = admin_auth_user
    for payload in OFFICIAL_TEST_REQUIREMENTS:
        await client.post("/api/v1/requirements/", json=payload)
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_public_list_requirements_empty(client: AsyncClient):
    """Public read requires no auth and returns 200 OK with empty list initially."""
    app.dependency_overrides.pop(get_current_active_user, None)

    res = await client.get("/api/v1/requirements/")
    assert res.status_code == 200
    body = res.json()
    resources = body["data"]["resources"]
    assert resources["requirements"] == []
    assert resources["total"] == 0


@pytest.mark.asyncio
async def test_public_get_default_requirements_from_db(client: AsyncClient):
    """Public client can fetch default requirements from /defaults; queries database directly."""
    # 1. Empty DB initially
    app.dependency_overrides.pop(get_current_active_user, None)
    res_empty = await client.get("/api/v1/requirements/defaults")
    assert res_empty.status_code == 200
    assert res_empty.json()["data"]["resources"]["requirements"] == []

    # 2. Seed database
    await seed_test_database(client)

    # 3. Retrieve default requirements from DB via /defaults and alias /default
    for endpoint in ["/api/v1/requirements/defaults", "/api/v1/requirements/default"]:
        res = await client.get(endpoint)
        assert res.status_code == 200
        items = res.json()["data"]["resources"]["requirements"]
        assert len(items) == 6
        assert items[0]["code"] == "rpl"
        assert items[1]["code"] == "af1"
        assert items[2]["code"] == "af2"
        assert items[3]["code"] == "flt"
        assert items[4]["code"] == "psa_police_clearance"
        assert items[5]["code"] == "proof_of_education"


@pytest.mark.asyncio
async def test_admin_seed_defaults_and_public_list(client: AsyncClient):
    """Admin verifies defaults in database; public client sees them with frontend aliases."""
    # 1. Populate database
    await seed_test_database(client)

    # 2. Admin verification call
    app.dependency_overrides[get_current_active_user] = admin_auth_user
    seed_res = await client.post("/api/v1/requirements/seed-defaults")
    assert seed_res.status_code == 200
    assert seed_res.json()["data"]["resources"]["active_count"] == 6

    # 3. Public unauthenticated client fetches the requirements
    app.dependency_overrides.pop(get_current_active_user, None)
    list_res = await client.get("/api/v1/requirements/")
    assert list_res.status_code == 200

    items = list_res.json()["data"]["resources"]["requirements"]
    assert len(items) == 6

    # Verify frontend compatibility fields: id, types, conditional
    rpl_item = next(i for i in items if i["code"] == "rpl")
    assert rpl_item["id"] == "rpl"
    assert "RPL Form 1 (Life Experiences)" in rpl_item["types"]
    assert rpl_item["types"] == rpl_item["accepted_document_types"]
    assert rpl_item["conditional"] is False
    assert rpl_item["is_conditional"] is False
    assert rpl_item["is_required"] is True

    proof_item = next(i for i in items if i["code"] == "proof_of_education")
    assert proof_item["id"] == "proof_of_education"
    assert proof_item["conditional"] is True
    assert proof_item["allow_assistance"] is True
    assert "Form 138 / Report Card" in proof_item["types"]


@pytest.mark.asyncio
async def test_public_get_by_id_and_code(client: AsyncClient):
    """Public client can fetch details by either unique slug code or UUID."""
    await seed_test_database(client)

    # Fetch by code
    res_code = await client.get("/api/v1/requirements/rpl")
    assert res_code.status_code == 200
    data_code = res_code.json()["data"]["resources"]
    assert data_code["code"] == "rpl"
    req_uuid = data_code["requirement_id"]

    # Fetch by UUID
    res_uuid = await client.get(f"/api/v1/requirements/{req_uuid}")
    assert res_uuid.status_code == 200
    data_uuid = res_uuid.json()["data"]["resources"]
    assert data_uuid["requirement_id"] == req_uuid
    assert data_uuid["title"] == "RPL (Recognition of Prior Learning)"

    # Non-existent slug returns 404
    res_404 = await client.get("/api/v1/requirements/unknown-requirement")
    assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_admin_create_and_duplicate_conflict(client: AsyncClient):
    """Admin can create new requirement; duplicate code triggers 409 Conflict."""
    app.dependency_overrides[get_current_active_user] = admin_auth_user

    payload = {
        "code": "health_certificate",
        "title": "Medical / Health Certificate",
        "description": "Barangay health center or physician clearance.",
        "guidance": "Signed by your local health physician.",
        "accepted_document_types": ["Barangay Health Certificate", "Medical Certificate"],
        "is_required": False,
        "is_conditional": False,
        "allow_assistance": False,
        "max_file_size_mb": 15,
        "allowed_extensions": ["pdf", "jpg", "png"],
        "order_index": 7,
    }

    create_res = await client.post("/api/v1/requirements/", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()["data"]["resources"]
    assert created_data["code"] == "health_certificate"
    assert created_data["max_file_size_mb"] == 15
    assert created_data["id"] == "health_certificate"

    # Duplicate code rejection
    dup_res = await client.post("/api/v1/requirements/", json=payload)
    assert dup_res.status_code == 409
    assert dup_res.json()["error_code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_admin_update_and_reorder(client: AsyncClient):
    """Admin can patch requirement fields and reorder display sequence."""
    app.dependency_overrides[get_current_active_user] = admin_auth_user

    req1 = await client.post("/api/v1/requirements/", json={
        "code": "req_first",
        "title": "First Req",
        "order_index": 1,
    })
    req1_id = req1.json()["data"]["resources"]["requirement_id"]

    req2 = await client.post("/api/v1/requirements/", json={
        "code": "req_second",
        "title": "Second Req",
        "order_index": 2,
    })
    req2_id = req2.json()["data"]["resources"]["requirement_id"]

    # 1. Update single requirement
    patch_res = await client.patch(f"/api/v1/requirements/{req1_id}", json={
        "title": "Updated First Req",
        "guidance": "Updated guidance notes",
        "max_file_size_mb": 20,
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["resources"]["title"] == "Updated First Req"
    assert patch_res.json()["data"]["resources"]["max_file_size_mb"] == 20

    # 2. Bulk reorder (swap order)
    reorder_res = await client.patch("/api/v1/requirements/reorder", json={
        "items": [
            {"requirement_id": req1_id, "order_index": 10},
            {"requirement_id": req2_id, "order_index": 5},
        ]
    })
    assert reorder_res.status_code == 200

    # Fetch list and verify sequence (req2 should come first now)
    app.dependency_overrides.pop(get_current_active_user, None)
    list_res = await client.get("/api/v1/requirements/")
    items = list_res.json()["data"]["resources"]["requirements"]
    assert items[0]["code"] == "req_second"
    assert items[1]["code"] == "req_first"


@pytest.mark.asyncio
async def test_toggle_status_and_soft_delete(client: AsyncClient):
    """Toggling status or soft-deleting hides items from public list unless include_inactive=true."""
    app.dependency_overrides[get_current_active_user] = admin_auth_user

    req = await client.post("/api/v1/requirements/", json={
        "code": "temp_doc",
        "title": "Temporary Document",
    })
    req_id = req.json()["data"]["resources"]["requirement_id"]

    # Toggle to inactive
    toggle_res = await client.patch(f"/api/v1/requirements/{req_id}/toggle-status")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["data"]["resources"]["is_active"] is False

    # Public list should NOT include it
    app.dependency_overrides.pop(get_current_active_user, None)
    public_res = await client.get("/api/v1/requirements/")
    codes = [i["code"] for i in public_res.json()["data"]["resources"]["requirements"]]
    assert "temp_doc" not in codes

    # With include_inactive=true, it is included
    app.dependency_overrides[get_current_active_user] = admin_auth_user
    admin_list = await client.get("/api/v1/requirements/?include_inactive=true")
    admin_codes = [i["code"] for i in admin_list.json()["data"]["resources"]["requirements"]]
    assert "temp_doc" in admin_codes

    # Soft delete
    del_res = await client.delete(f"/api/v1/requirements/{req_id}")
    assert del_res.status_code == 200
    assert "archived" in del_res.json()["message"].lower()

    # Permanent delete
    perm_del = await client.delete(f"/api/v1/requirements/{req_id}?permanent=true")
    assert perm_del.status_code == 200
    assert "permanently" in perm_del.json()["message"].lower()


@pytest.mark.asyncio
async def test_admin_stats_and_rbac_guards(client: AsyncClient):
    """Verify stats calculation and RBAC security guards for students & unauthenticated callers."""
    await seed_test_database(client)
    app.dependency_overrides[get_current_active_user] = admin_auth_user

    # Stats accessible to Admin/Teacher
    stats_res = await client.get("/api/v1/requirements/admin/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()["data"]["resources"]
    assert stats["total_requirements"] == 6
    assert stats["active_requirements"] == 6
    assert stats["mandatory_requirements"] == 6
    assert stats["conditional_requirements"] == 1

    # Student cannot create requirements (403 Forbidden)
    app.dependency_overrides[get_current_active_user] = student_auth_user
    student_create = await client.post("/api/v1/requirements/", json={
        "code": "hacked_req",
        "title": "Hacked",
    })
    assert student_create.status_code == 403

    # Unauthenticated caller cannot create requirements (401 Unauthorized)
    app.dependency_overrides.pop(get_current_active_user, None)
    unauth_create = await client.post("/api/v1/requirements/", json={
        "code": "unauth_req",
        "title": "Unauth",
    })
    assert unauth_create.status_code == 401
