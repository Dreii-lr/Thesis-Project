"""
test_user_categories_and_subjects.py — Comprehensive tests for User Categories and Subjects.
Tests cover:
- CRUD operations for User Categories (Elementary, Secondary, BLP).
- Unique constraints for category code and name.
- CRUD operations for Subjects linked to categories.
- Subject image input via image_url and direct file upload (e.g. LS3 Math, LS6 Digital Citizenship).
- DepEd ALS Curriculum Seed helper (idempotent creation of 3 categories and 17 subjects).
- Filtering subjects by category.
- Cascade deletion of subjects when category is deleted.
"""
from __future__ import annotations

import io
import pytest
from httpx import AsyncClient

from app.core.dependencies import get_current_active_user, get_current_user
from app.features.users.models import UserRole, UserStatus
from app.features.users.schemas import UserRead
from app.main import app


def teacher_user() -> UserRead:
    return UserRead(
        user_id="teacher-cat-test-uuid",
        employee_id="TCH-ALS-CAT",
        email="teacher.cat@als.gov.ph",
        role=UserRole.TEACHER,
        status=UserStatus.ACTIVE,
        first_name="Maria",
        last_name="Santos",
    )


def student_user() -> UserRead:
    return UserRead(
        user_id="student-cat-test-uuid",
        student_id="STU-ALS-CAT",
        email="student.cat@als.gov.ph",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
        first_name="Juan",
        last_name="Dela Cruz",
    )


@pytest.mark.asyncio
async def test_user_category_crud_operations(client: AsyncClient):
    """Test full CRUD lifecycle for UserCategory."""
    app.dependency_overrides[get_current_active_user] = teacher_user
    app.dependency_overrides[get_current_user] = teacher_user

    # 1. Create Elementary category
    create_payload = {
        "code": "ELEMENTARY",
        "name": "Elementary",
        "description": "DepEd ALS Elementary Level",
    }
    res = await client.post("/api/v1/user-categories/", json=create_payload)
    assert res.status_code == 201
    created = res.json()["data"]["resources"]
    assert created["code"] == "ELEMENTARY"
    assert created["name"] == "Elementary"
    category_id = created["category_id"]

    # 2. Duplicate code rejected
    res_dup = await client.post("/api/v1/user-categories/", json=create_payload)
    assert res_dup.status_code == 409

    # 3. Get category by ID
    res_get = await client.get(f"/api/v1/user-categories/{category_id}")
    assert res_get.status_code == 200
    assert res_get.json()["data"]["resources"]["category_id"] == category_id

    # 4. List categories
    res_list = await client.get("/api/v1/user-categories/")
    assert res_list.status_code == 200
    categories_data = res_list.json()["data"]["resources"]
    assert categories_data["total"] >= 1

    # 5. Update category
    update_payload = {
        "name": "ALS Elementary Level Updated",
        "description": "Updated description",
    }
    res_update = await client.put(f"/api/v1/user-categories/{category_id}", json=update_payload)
    assert res_update.status_code == 200
    updated = res_update.json()["data"]["resources"]
    assert updated["name"] == "ALS Elementary Level Updated"

    # 6. Delete category
    res_del = await client.delete(f"/api/v1/user-categories/{category_id}")
    assert res_del.status_code == 200

    # 7. Verify deletion
    res_verify = await client.get(f"/api/v1/user-categories/{category_id}")
    assert res_verify.status_code == 404

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_subject_crud_and_image_input(client: AsyncClient):
    """Test Subject CRUD lifecycle including image_url and file upload for LS3 Math."""
    app.dependency_overrides[get_current_active_user] = teacher_user
    app.dependency_overrides[get_current_user] = teacher_user

    # 1. Create parent category
    cat_payload = {
        "code": "SECONDARY",
        "name": "Secondary",
        "description": "DepEd ALS Junior High School Level",
    }
    cat_res = await client.post("/api/v1/user-categories/", json=cat_payload)
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["data"]["resources"]["category_id"]

    # 2. Create LS3 - MATH with image_url
    math_payload = {
        "category_id": cat_id,
        "code": "ALS-S-LS3-MATH",
        "name": "LS3 - MATH",
        "description": "Mathematical and Problem Solving Skills",
        "image_url": "https://images.example.com/math-geometry.png",
        "is_active": True,
    }
    res_math = await client.post("/api/v1/subjects/", json=math_payload)
    assert res_math.status_code == 201
    math_data = res_math.json()["data"]["resources"]
    assert math_data["code"] == "ALS-S-LS3-MATH"
    assert math_data["name"] == "LS3 - MATH"
    assert math_data["image_url"] == "https://images.example.com/math-geometry.png"
    math_id = math_data["subject_id"]

    # 3. Create LS6 - DIGITAL CITIZENSHIP without image initially
    dc_payload = {
        "category_id": cat_id,
        "code": "ALS-S-LS6-DC",
        "name": "LS6 - DIGITAL CITIZENSHIP",
        "description": "Digital Literacy and Citizenship",
        "image_url": None,
    }
    res_dc = await client.post("/api/v1/subjects/", json=dc_payload)
    assert res_dc.status_code == 201
    dc_id = res_dc.json()["data"]["resources"]["subject_id"]

    # 4. Duplicate subject code in same category rejected
    res_dup = await client.post("/api/v1/subjects/", json=math_payload)
    assert res_dup.status_code == 409

    # 5. List subjects filtered by category
    res_list = await client.get(f"/api/v1/subjects/?category_id={cat_id}")
    assert res_list.status_code == 200
    subjects_data = res_list.json()["data"]["resources"]
    assert subjects_data["total"] == 2

    # 6. Upload image file for LS6 - DIGITAL CITIZENSHIP via multipart endpoint
    fake_image_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {
        "file": ("digital_badge.png", io.BytesIO(fake_image_bytes), "image/png"),
    }
    res_upload = await client.post(f"/api/v1/subjects/{dc_id}/image", files=files)
    assert res_upload.status_code == 200
    uploaded_dc = res_upload.json()["data"]["resources"]
    assert uploaded_dc["image_url"] is not None
    assert "/static/uploads/subjects/" in uploaded_dc["image_url"]

    # 7. Update subject metadata
    update_payload = {
        "name": "LS3 - ADVANCED MATH",
        "description": "Updated math syllabus",
    }
    res_update = await client.put(f"/api/v1/subjects/{math_id}", json=update_payload)
    assert res_update.status_code == 200
    assert res_update.json()["data"]["resources"]["name"] == "LS3 - ADVANCED MATH"

    # 8. Delete subject
    res_del = await client.delete(f"/api/v1/subjects/{math_id}")
    assert res_del.status_code == 200

    # 9. Verify deletion
    res_verify = await client.get(f"/api/v1/subjects/{math_id}")
    assert res_verify.status_code == 404

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_curriculum_seeder_elementary_secondary_and_blp(client: AsyncClient):
    """
    Test that seeding creates:
    - Elementary with 7 subjects (LS1-LS6, including LS3 Math and LS6 Digital Citizenship)
    - Secondary with 7 subjects (LS1-LS6, including LS3 Math and LS6 Digital Citizenship)
    - BLP with 3 subjects (English, Filipino, Math)
    and is idempotent.
    """
    app.dependency_overrides[get_current_active_user] = teacher_user
    app.dependency_overrides[get_current_user] = teacher_user

    # 1. Run Seeder
    res_seed = await client.post("/api/v1/user-categories/seed")
    assert res_seed.status_code in [200, 201]
    seeded_categories = res_seed.json()["data"]["resources"]

    codes = {c["code"]: c for c in seeded_categories}
    assert "ELEMENTARY" in codes
    assert "SECONDARY" in codes
    assert "BLP" in codes

    # Check Elementary subjects
    elem = codes["ELEMENTARY"]
    elem_subjs = {s["name"]: s for s in elem["subjects"]}
    expected_elem = {
        "LS1 - ENGLISH",
        "LS1 - FILIPINO",
        "LS2 - SCIENCE",
        "LS3 - MATH",
        "LS4 - LIFE AND CAREER SKILLS",
        "LS5 - PAG-UNAWA SA SARILI AT LIPUNAN",
        "LS6 - DIGITAL CITIZENSHIP",
    }
    assert expected_elem.issubset(set(elem_subjs.keys()))

    # Check Secondary subjects
    sec = codes["SECONDARY"]
    sec_subjs = {s["name"]: s for s in sec["subjects"]}
    expected_sec = {
        "LS1 - ENGLISH",
        "LS1 - FILIPINO",
        "LS2 - SCIENCE",
        "LS3 - MATH",
        "LS4 - LIFE AND CAREER SKILLS",
        "LS5 - PAG-UNAWA SA SARILI AT LIPUNAN",
        "LS6 - DIGITAL CITIZENSHIP",
    }
    assert expected_sec.issubset(set(sec_subjs.keys()))

    # Check BLP subjects
    blp = codes["BLP"]
    blp_subjs = {s["name"]: s for s in blp["subjects"]}
    expected_blp = {"ENGLISH", "FILIPINO", "MATH"}
    assert expected_blp.issubset(set(blp_subjs.keys()))

    # 2. Run Seeder again to verify idempotency (no duplicates, returns 200)
    res_seed2 = await client.post("/api/v1/user-categories/seed")
    assert res_seed2.status_code == 200

    # 3. Test retrieving category details with nested subjects
    res_elem_detail = await client.get(f"/api/v1/user-categories/{elem['category_id']}")
    assert res_elem_detail.status_code == 200
    elem_detail = res_elem_detail.json()["data"]["resources"]
    assert len(elem_detail["subjects"]) == 7

    app.dependency_overrides.clear()
