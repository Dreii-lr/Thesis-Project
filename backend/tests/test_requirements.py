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
        "order_index": 7,
    }

    create_res = await client.post("/api/v1/requirements/", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()["data"]["resources"]
    assert created_data["code"] == "health_certificate"
    assert created_data["max_file_size_mb"] == 10
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
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["resources"]["title"] == "Updated First Req"
    assert patch_res.json()["data"]["resources"]["guidance"] == "Updated guidance notes"

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


def test_validate_document_file_util():
    """Unit test for validate_document_file in SharedUtils: format and 10 MB size limits."""
    from io import BytesIO
    from fastapi import UploadFile
    from app.shared.utils import validate_document_file, MAX_DOCUMENT_FILE_SIZE_BYTES
    from app.core.exceptions import DomainValidationDomainException

    # 1. Valid PDF file passes
    valid_pdf = UploadFile(filename="rpl_form.pdf", file=BytesIO(b"%PDF-1.4 test content"))
    valid_pdf.headers = {"content-type": "application/pdf"}
    validate_document_file(valid_pdf, file_bytes=b"%PDF-1.4 test content")

    # 2. Valid image file passes
    valid_img = UploadFile(filename="clearance.jpg", file=BytesIO(b"\xff\xd8\xff test image"))
    valid_img.headers = {"content-type": "image/jpeg"}
    validate_document_file(valid_img, file_bytes=b"\xff\xd8\xff test image")

    # 3. Disallowed extension raises DomainValidationDomainException
    invalid_ext = UploadFile(filename="script.exe", file=BytesIO(b"malicious"))
    invalid_ext.headers = {"content-type": "application/x-msdownload"}
    with pytest.raises(DomainValidationDomainException) as exc:
        validate_document_file(invalid_ext)
    assert "Unsupported file format" in str(exc.value)

    # 4. File exceeding 10 MB raises DomainValidationDomainException
    large_bytes = b"0" * (MAX_DOCUMENT_FILE_SIZE_BYTES + 1024)
    large_file = UploadFile(filename="large.pdf", file=BytesIO(large_bytes))
    large_file.headers = {"content-type": "application/pdf"}
    with pytest.raises(DomainValidationDomainException) as exc:
        validate_document_file(large_file, file_bytes=large_bytes)
    assert "exceeds maximum allowed limit of 10 MB" in str(exc.value)


@pytest.mark.asyncio
async def test_student_submit_requirement_and_get_my_submissions(client: AsyncClient):
    """Student submits a document requirement; verified in /submissions/me."""
    await seed_test_database(client)

    app.dependency_overrides[get_current_active_user] = student_auth_user

    files = {
        "file": ("rpl_form1.pdf", b"%PDF-1.4 student rpl submission", "application/pdf"),
    }
    data = {
        "requirement_code": "rpl",
        "document_type": "RPL Form 1 (Life Experiences)",
        "student_remarks": "Completed RPL Form 1 for review.",
        "is_conditional": "false",
        "requested_assistance": "false",
    }

    sub_res = await client.post("/api/v1/requirements/submissions", data=data, files=files)
    assert sub_res.status_code == 201
    created_sub = sub_res.json()["data"]["resources"]
    assert created_sub["requirement_code"] == "rpl"
    assert created_sub["document_type"] == "RPL Form 1 (Life Experiences)"
    assert created_sub["status"] == "review"
    assert created_sub["file_name"] == "rpl_form1.pdf"
    assert created_sub["student_remarks"] == "Completed RPL Form 1 for review."
    sub_id = created_sub["submission_id"]

    # Student queries their personal submissions
    me_res = await client.get("/api/v1/requirements/submissions/me")
    assert me_res.status_code == 200
    my_subs = me_res.json()["data"]["resources"]["submissions"]
    assert len(my_subs) == 1
    assert my_subs[0]["submission_id"] == sub_id
    assert my_subs[0]["requirement_code"] == "rpl"


@pytest.mark.asyncio
async def test_student_resubmit_updates_existing_and_archives_version(client: AsyncClient):
    """Student re-submitting an existing requirement updates the record and archives previous file."""
    await seed_test_database(client)
    app.dependency_overrides[get_current_active_user] = student_auth_user

    # First submission
    files1 = {"file": ("v1.pdf", b"%PDF-1.4 v1", "application/pdf")}
    data1 = {
        "requirement_code": "af1",
        "document_type": "ALS Form 1 (Learner Profile)",
        "student_remarks": "Version 1",
    }
    res1 = await client.post("/api/v1/requirements/submissions", data=data1, files=files1)
    assert res1.status_code == 201
    sub_id1 = res1.json()["data"]["resources"]["submission_id"]

    # Second submission (resubmission)
    files2 = {"file": ("v2.pdf", b"%PDF-1.4 v2 updated", "application/pdf")}
    data2 = {
        "requirement_code": "af1",
        "document_type": "ALS Form 1 (Learner Profile)",
        "student_remarks": "Version 2 updated",
    }
    res2 = await client.post("/api/v1/requirements/submissions", data=data2, files=files2)
    assert res2.status_code == 200
    sub2 = res2.json()["data"]["resources"]
    assert sub2["submission_id"] == sub_id1
    assert sub2["file_name"] == "v2.pdf"
    assert sub2["student_remarks"] == "Version 2 updated"
    assert len(sub2["versions_payload"]) == 1
    assert sub2["versions_payload"][0]["file_name"] == "v1.pdf"


@pytest.mark.asyncio
async def test_teacher_list_submissions_and_review(client: AsyncClient):
    """Teacher lists student submissions and reviews one to 'verified' with feedback."""
    await seed_test_database(client)

    # 1. Student submits requirement
    app.dependency_overrides[get_current_active_user] = student_auth_user
    files = {"file": ("birth_cert.jpg", b"\xff\xd8\xff test image", "image/jpeg")}
    data = {
        "requirement_code": "psa_police_clearance",
        "document_type": "PSA Birth Certificate",
        "student_remarks": "Official PSA copy",
    }
    sub_res = await client.post("/api/v1/requirements/submissions", data=data, files=files)
    assert sub_res.status_code == 201
    submission_id = sub_res.json()["data"]["resources"]["submission_id"]

    # 2. Teacher queries submissions
    app.dependency_overrides[get_current_active_user] = teacher_auth_user
    list_res = await client.get("/api/v1/requirements/submissions")
    assert list_res.status_code == 200
    subs_list = list_res.json()["data"]["resources"]["submissions"]
    assert any(s["submission_id"] == submission_id for s in subs_list)

    # 3. Teacher reviews submission
    review_payload = {
        "status": "verified",
        "teacher_feedback": "Document verified and clear.",
    }
    review_res = await client.patch(
        f"/api/v1/requirements/submissions/{submission_id}/review",
        json=review_payload,
    )
    assert review_res.status_code == 200
    rev_data = review_res.json()["data"]["resources"]
    assert rev_data["status"] == "verified"
    assert rev_data["teacher_feedback"] == "Document verified and clear."
    assert rev_data["reviewed_by"] == teacher_auth_user().user_id


@pytest.mark.asyncio
async def test_student_rbac_guards_on_submissions(client: AsyncClient):
    """Students cannot query teacher-level submission lists or review submissions."""
    await seed_test_database(client)

    # Student attempts to list all submissions -> 403
    app.dependency_overrides[get_current_active_user] = student_auth_user
    res = await client.get("/api/v1/requirements/submissions")
    assert res.status_code == 403

    # Student attempts to review a submission -> 403
    review_res = await client.patch(
        "/api/v1/requirements/submissions/fake-submission-id/review",
        json={"status": "verified"},
    )
    assert review_res.status_code == 403


@pytest.mark.asyncio
async def test_student_delete_own_submission(client: AsyncClient):
    """Student can delete their own requirement submission."""
    await seed_test_database(client)

    app.dependency_overrides[get_current_active_user] = student_auth_user
    data = {
        "requirement_code": "flt",
        "document_type": "FLT Pre-Test Answer Sheet",
        "student_remarks": "Temporary submission",
    }
    create_res = await client.post("/api/v1/requirements/submissions", data=data)
    assert create_res.status_code == 201
    submission_id = create_res.json()["data"]["resources"]["submission_id"]

    # Delete
    del_res = await client.delete(f"/api/v1/requirements/submissions/{submission_id}")
    assert del_res.status_code == 200

    # Ensure removed from /me
    me_res = await client.get("/api/v1/requirements/submissions/me")
    assert len(me_res.json()["data"]["resources"]["submissions"]) == 0


@pytest.mark.asyncio
async def test_student_submit_pre_uploaded_r2_requirement(client: AsyncClient):
    """Student submits a requirement using pre-uploaded R2 metadata from document-processing-ms."""
    await seed_test_database(client)
    app.dependency_overrides[get_current_active_user] = student_auth_user

    data = {
        "requirement_code": "psa_police_clearance",
        "document_type": "PSA Birth Certificate",
        "file_url": "https://pub-r2.als-curriculum.dev/requirements/Student_User/abc123_psa_birth_cert.pdf",
        "file_name": "psa_birth_cert.pdf",
        "file_size_bytes": "2048576",
        "mime_type": "application/pdf",
        "storage_key": "requirements/Student_User/abc123_psa_birth_cert.pdf",
        "student_remarks": "Uploaded directly to Cloudflare R2",
    }
    create_res = await client.post("/api/v1/requirements/submissions", data=data)
    assert create_res.status_code == 201
    resources = create_res.json()["data"]["resources"]
    assert resources["requirement_code"] == "psa_police_clearance"
    assert resources["document_type"] == "PSA Birth Certificate"
    assert resources["status"] == "review"
    assert resources["file_url"] == "https://pub-r2.als-curriculum.dev/requirements/Student_User/abc123_psa_birth_cert.pdf"
    assert resources["storage_key"] == "requirements/Student_User/abc123_psa_birth_cert.pdf"
    assert resources["file_name"] == "psa_birth_cert.pdf"
    assert resources["file_size_bytes"] == 2048576


@pytest.mark.asyncio
async def test_student_submit_file_ai_auto_verified(client: AsyncClient):
    """Student submits a file that is auto-verified by AI via document-processing-ms."""
    from unittest.mock import AsyncMock, patch

    await seed_test_database(client)
    app.dependency_overrides[get_current_active_user] = student_auth_user

    mock_resp = AsyncMock()
    mock_resp.status_code = 201
    mock_resp.json.return_value = {
        "file_url": "https://pub-r2.als-curriculum.dev/requirements/Student_Learner/xyz_psa.pdf",
        "file_name": "sample_psa.pdf",
        "file_size_bytes": 102400,
        "mime_type": "application/pdf",
        "storage_key": "requirements/Student_Learner/xyz_psa.pdf",
        "folder_name": "Student_Learner",
        "verification": {
            "is_auto_verified": True,
            "suggested_status": "verified",
            "confidence_score": 0.95,
            "first_name_match": True,
            "last_name_match": True,
            "verification_notes": "All identity fields verified.",
        },
    }

    with patch("httpx.AsyncClient.post", return_value=mock_resp) as mock_post:
        files = {"file": ("sample_psa.pdf", b"%PDF-1.4 mock content", "application/pdf")}
        data = {
            "requirement_code": "psa_police_clearance",
            "document_type": "PSA Birth Certificate",
            "student_remarks": "Submitted for automated check",
        }
        res = await client.post("/api/v1/requirements/submissions", files=files, data=data)
        assert res.status_code == 201
        res_data = res.json()["data"]["resources"]
        assert res_data["status"] == "verified"
        assert "Auto-verified by AI" in res_data["teacher_feedback"]
        assert res_data["file_url"] == "https://pub-r2.als-curriculum.dev/requirements/Student_Learner/xyz_psa.pdf"
        assert res_data["storage_key"] == "requirements/Student_Learner/xyz_psa.pdf"


@pytest.mark.asyncio
async def test_student_direct_upload_requirement_endpoint(client: AsyncClient):
    """Student uploads a file to the dedicated /upload endpoint and receives R2 metadata + AI verification."""
    from unittest.mock import AsyncMock, patch

    await seed_test_database(client)
    app.dependency_overrides[get_current_active_user] = student_auth_user

    mock_resp = AsyncMock()
    mock_resp.status_code = 201
    mock_resp.json.return_value = {
        "file_url": "https://pub-r2.als-curriculum.dev/requirements/Student_Learner/upload_psa.pdf",
        "file_name": "psa_cert.pdf",
        "file_size_bytes": 51200,
        "mime_type": "application/pdf",
        "storage_key": "requirements/Student_Learner/upload_psa.pdf",
        "folder_name": "Student_Learner",
        "verification": {
            "is_auto_verified": True,
            "suggested_status": "verified",
            "confidence_score": 0.98,
            "first_name_match": True,
            "last_name_match": True,
            "verification_notes": "Identity confirmed via Gemini Vision.",
        },
    }

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        files = {"file": ("psa_cert.pdf", b"%PDF-1.4 sample content", "application/pdf")}
        data = {"document_type": "PSA Birth Certificate"}
        res = await client.post("/api/v1/requirements/upload", files=files, data=data)
        assert res.status_code == 201
        res_data = res.json()["data"]["resources"]
        assert res_data["file_url"] == "https://pub-r2.als-curriculum.dev/requirements/Student_Learner/upload_psa.pdf"
        assert res_data["storage_key"] == "requirements/Student_Learner/upload_psa.pdf"
        assert res_data["verification"]["is_auto_verified"] is True
        assert res_data["verification"]["confidence_score"] == 0.98


@pytest.mark.asyncio
async def test_student_submit_file_fails_when_doc_processor_fails(client: AsyncClient):
    """When document-processing-ms returns an error (e.g. name mismatch or verification failure),
    Thesis-Project returns the error, does NOT upload to storage, and does NOT insert into the database.
    """
    from unittest.mock import AsyncMock, patch

    await seed_test_database(client)
    app.dependency_overrides[get_current_active_user] = student_auth_user

    mock_resp = AsyncMock()
    mock_resp.status_code = 422
    mock_resp.json.return_value = {
        "detail": "Document verification failed: First name mismatch: profile has 'Juan', document has 'Maria'."
    }
    mock_resp.text = "Document verification failed: First name mismatch"

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        files = {"file": ("wrong_name_psa.pdf", b"%PDF-1.4 sample content", "application/pdf")}
        data = {
            "requirement_code": "psa_police_clearance",
            "document_type": "PSA Birth Certificate",
            "student_remarks": "Test fail submission",
        }
        res = await client.post("/api/v1/requirements/submissions", files=files, data=data)
        assert res.status_code == 400
        res_json = res.json()
        assert res_json["success"] is False
        assert "First name mismatch" in res_json["message"]

        # Verify that NO submission was inserted into the database
        get_res = await client.get("/api/v1/requirements/submissions/me")
        assert get_res.status_code == 200
        submissions = get_res.json()["data"]["resources"]["submissions"]
        assert len([s for s in submissions if s["requirement_code"] == "psa_police_clearance"]) == 0


@pytest.mark.asyncio
async def test_gemini_document_daily_upload_attempts_limit(client: AsyncClient):
    """Student is restricted to 3 upload attempts per day on Valid ID / Gemini documents.
    On the 4th attempt, the request is blocked before calling the microservice.
    """
    from unittest.mock import AsyncMock, patch

    await seed_test_database(client)
    app.dependency_overrides[get_current_active_user] = student_auth_user

    mock_resp = AsyncMock()
    mock_resp.status_code = 422
    mock_resp.json.return_value = {
        "detail": "Document verification failed: Blurry image or name mismatch."
    }
    mock_resp.text = "Document verification failed: Blurry image or name mismatch."

    with patch("httpx.AsyncClient.post", return_value=mock_resp) as mock_post:
        files = {"file": ("valid_id_photo.jpg", b"\xff\xd8\xff test image", "image/jpeg")}
        data = {
            "requirement_code": "psa_police_clearance",
            "document_type": "Valid Government ID",
            "student_remarks": "Submitting my valid ID",
        }

        # Attempt 1: Fails verification
        res1 = await client.post("/api/v1/requirements/submissions", files=files, data=data)
        assert res1.status_code == 400
        assert "Attempt 1 of 3 used today" in res1.json()["message"]

        # Attempt 2: Fails verification
        res2 = await client.post("/api/v1/requirements/submissions", files=files, data=data)
        assert res2.status_code == 400
        assert "Attempt 2 of 3 used today" in res2.json()["message"]

        # Attempt 3: Fails verification
        res3 = await client.post("/api/v1/requirements/submissions", files=files, data=data)
        assert res3.status_code == 400
        assert "Attempt 3 of 3 used today" in res3.json()["message"]

        assert mock_post.call_count == 3

        # Check attempts endpoint
        attempts_res = await client.get("/api/v1/requirements/submissions/attempts")
        assert attempts_res.status_code == 200
        attempts_data = attempts_res.json()["data"]["resources"]
        assert attempts_data["used_today"] == 3
        assert attempts_data["remaining"] == 0
        assert attempts_data["can_upload"] is False

        # Attempt 4: Blocked BEFORE calling microservice (Gemini API protected!)
        res4 = await client.post("/api/v1/requirements/submissions", files=files, data=data)
        assert res4.status_code == 400
        assert "maximum limit of 3 upload attempts for today on your Valid ID" in res4.json()["message"]

        # Assert mock_post was STILL called only 3 times (4th call never made!)
        assert mock_post.call_count == 3


@pytest.mark.asyncio
async def test_non_gemini_documents_are_not_rate_limited(client: AsyncClient):
    """Non-Gemini documents (e.g. RPL, Form 137, ALS forms) do NOT consume Gemini quota
    and are not subject to the 3-attempt daily limit.
    """
    await seed_test_database(client)
    app.dependency_overrides[get_current_active_user] = student_auth_user

    files = {"file": ("rpl.pdf", b"%PDF-1.4 rpl content", "application/pdf")}
    data = {
        "requirement_code": "rpl",
        "document_type": "RPL Form 1 (Life Experiences)",
        "student_remarks": "RPL submission",
    }

    # Submit 4 times in a row — all should succeed
    for i in range(4):
        res = await client.post("/api/v1/requirements/submissions", files=files, data=data)
        assert res.status_code in (200, 201)







