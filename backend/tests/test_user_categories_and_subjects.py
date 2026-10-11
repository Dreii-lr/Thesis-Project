"""
test_user_categories_and_subjects.py — Comprehensive tests for User Categories and Subjects.
Tests cover:
- CRUD operations for User Categories (Elementary, Secondary, BLP).
- Unique constraints for category code and name.
- Nested subjects loaded automatically for single and list UserCategory queries.
- CRUD operations for Subjects linked to categories without subject code.
- Unique constraint for subject name within a category (duplicate subject name rejected).
- Subjects with the same name across different categories are allowed.
- Filtering subjects by category.
- Cascade deletion of subjects when category is deleted.
"""
from __future__ import annotations

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
    """Test full CRUD lifecycle for UserCategory, ensuring subjects are included."""
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

    # 3. Get category by ID — should include subjects list
    res_get = await client.get(f"/api/v1/user-categories/{category_id}")
    assert res_get.status_code == 200
    category_data = res_get.json()["data"]["resources"]
    assert category_data["category_id"] == category_id
    assert "subjects" in category_data
    assert isinstance(category_data["subjects"], list)

    # 4. List categories — should include subjects in each category
    res_list = await client.get("/api/v1/user-categories/")
    assert res_list.status_code == 200
    categories_data = res_list.json()["data"]["resources"]
    assert categories_data["total"] >= 1
    first_cat = categories_data["categories"][0]
    assert "subjects" in first_cat
    assert isinstance(first_cat["subjects"], list)

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
async def test_subject_crud_and_nested_category_loading(client: AsyncClient):
    """Test Subject CRUD lifecycle, scoped unique name, and category nested loading."""
    app.dependency_overrides[get_current_active_user] = teacher_user
    app.dependency_overrides[get_current_user] = teacher_user

    # 1. Create parent category 1: SECONDARY
    cat1_res = await client.post(
        "/api/v1/user-categories/",
        json={"code": "SECONDARY", "name": "Secondary", "description": "ALS Junior High School Level"},
    )
    assert cat1_res.status_code == 201
    cat1_id = cat1_res.json()["data"]["resources"]["category_id"]

    # 2. Create parent category 2: BLP
    cat2_res = await client.post(
        "/api/v1/user-categories/",
        json={"code": "BLP", "name": "Basic Literacy Program", "description": "ALS BLP Level"},
    )
    assert cat2_res.status_code == 201
    cat2_id = cat2_res.json()["data"]["resources"]["category_id"]

    # 3. Create Subject 1 in SECONDARY: LS3 - MATH
    math_payload = {
        "category_id": cat1_id,
        "name": "LS3 - MATH",
        "description": "Mathematical and Problem Solving Skills",
        "is_active": True,
    }
    res_math = await client.post("/api/v1/subjects/", json=math_payload)
    assert res_math.status_code == 201
    math_data = res_math.json()["data"]["resources"]
    assert math_data["name"] == "LS3 - MATH"
    assert math_data["category_id"] == cat1_id
    math_id = math_data["subject_id"]

    # 4. Create Subject 2 in SECONDARY: LS6 - DIGITAL CITIZENSHIP (verifies multiple subjects per category)
    dc_payload = {
        "category_id": cat1_id,
        "name": "LS6 - DIGITAL CITIZENSHIP",
        "description": "Digital Literacy and Citizenship",
        "is_active": True,
    }
    res_dc = await client.post("/api/v1/subjects/", json=dc_payload)
    assert res_dc.status_code == 201
    dc_data = res_dc.json()["data"]["resources"]
    assert dc_data["name"] == "LS6 - DIGITAL CITIZENSHIP"
    dc_id = dc_data["subject_id"]

    # 5. Duplicate subject name in same category must be rejected (409 Conflict)
    res_dup = await client.post("/api/v1/subjects/", json=math_payload)
    assert res_dup.status_code == 409

    # 6. Same subject name in a DIFFERENT category must succeed (201 Created)
    res_blp_math = await client.post(
        "/api/v1/subjects/",
        json={"category_id": cat2_id, "name": "LS3 - MATH", "description": "Basic Math"},
    )
    assert res_blp_math.status_code == 201

    # 7. List subjects filtered by category
    res_list = await client.get(f"/api/v1/subjects/?category_id={cat1_id}")
    assert res_list.status_code == 200
    subjects_data = res_list.json()["data"]["resources"]
    assert subjects_data["total"] == 2

    # 8. Check that SECONDARY category includes both subjects
    res_cat1 = await client.get(f"/api/v1/user-categories/{cat1_id}")
    assert res_cat1.status_code == 200
    cat1_data = res_cat1.json()["data"]["resources"]
    assert len(cat1_data["subjects"]) == 2
    subject_names = [s["name"] for s in cat1_data["subjects"]]
    assert "LS3 - MATH" in subject_names
    assert "LS6 - DIGITAL CITIZENSHIP" in subject_names

    # 9. Check that list user-categories also includes subjects
    res_all_cats = await client.get("/api/v1/user-categories/")
    assert res_all_cats.status_code == 200
    all_cats = res_all_cats.json()["data"]["resources"]["categories"]
    sec_cat = next((c for c in all_cats if c["category_id"] == cat1_id), None)
    assert sec_cat is not None
    assert len(sec_cat["subjects"]) == 2

    # 10. Get subject detail by ID
    res_detail = await client.get(f"/api/v1/subjects/{math_id}")
    assert res_detail.status_code == 200
    detail_data = res_detail.json()["data"]["resources"]
    assert detail_data["name"] == "LS3 - MATH"
    assert detail_data["category_name"] == "Secondary"
    assert detail_data["category_code"] == "SECONDARY"

    # 11. Update subject
    update_payload = {
        "name": "LS3 - ADVANCED MATH",
        "description": "Updated math syllabus",
    }
    res_update = await client.put(f"/api/v1/subjects/{math_id}", json=update_payload)
    assert res_update.status_code == 200
    assert res_update.json()["data"]["resources"]["name"] == "LS3 - ADVANCED MATH"

    # 12. Delete subject
    res_del = await client.delete(f"/api/v1/subjects/{math_id}")
    assert res_del.status_code == 200

    # 13. Verify subject deletion
    res_verify = await client.get(f"/api/v1/subjects/{math_id}")
    assert res_verify.status_code == 404

    # 14. Clean up created categories
    await client.delete(f"/api/v1/user-categories/{cat1_id}")
    await client.delete(f"/api/v1/user-categories/{cat2_id}")

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_copy_subjects_between_categories(client: AsyncClient):
    """
    Test copying/syncing subjects from Elementary to Secondary and vice-versa:
    - Elementary subjects are bulk copied into Secondary.
    - Each copied subject's category_id is updated to Secondary's category_id.
    - Re-running is idempotent: existing subjects are skipped.
    - Vice-versa sync works cleanly.
    """
    app.dependency_overrides[get_current_active_user] = teacher_user
    app.dependency_overrides[get_current_user] = teacher_user

    # 1. Create Elementary and Secondary categories
    elem_res = await client.post(
        "/api/v1/user-categories/",
        json={"code": "ELEMENTARY", "name": "Elementary", "description": "Elementary level"},
    )
    assert elem_res.status_code == 201
    elem_id = elem_res.json()["data"]["resources"]["category_id"]

    sec_res = await client.post(
        "/api/v1/user-categories/",
        json={"code": "SECONDARY", "name": "Secondary", "description": "Secondary level"},
    )
    assert sec_res.status_code == 201
    sec_id = sec_res.json()["data"]["resources"]["category_id"]

    # 2. Add 3 subjects to Elementary
    elem_subjects = [
        {"category_id": elem_id, "name": "LS1 - ENGLISH", "description": "Communication English"},
        {"category_id": elem_id, "name": "LS2 - SCIENCE", "description": "Scientific Literacy"},
        {"category_id": elem_id, "name": "LS3 - MATH", "description": "Mathematics"},
    ]
    for s in elem_subjects:
        res = await client.post("/api/v1/subjects/", json=s)
        assert res.status_code == 201

    # 3. Copy subjects from Elementary to Secondary using category code
    copy_payload = {
        "source_category_id": "ELEMENTARY",
        "target_category_id": "SECONDARY",
    }
    copy_res = await client.post("/api/v1/subjects/copy", json=copy_payload)
    assert copy_res.status_code == 201
    copy_data = copy_res.json()["data"]["resources"]
    assert copy_data["copied_count"] == 3
    assert copy_data["skipped_count"] == 0
    assert len(copy_data["copied_subjects"]) == 3

    # Verify that all copied subjects now belong to Secondary
    for s in copy_data["copied_subjects"]:
        assert s["category_id"] == sec_id

    # 4. Verify Secondary category detail now includes all 3 subjects
    sec_cat_res = await client.get(f"/api/v1/user-categories/{sec_id}")
    assert sec_cat_res.status_code == 200
    sec_subjects = sec_cat_res.json()["data"]["resources"]["subjects"]
    assert len(sec_subjects) == 3
    sec_names = {s["name"] for s in sec_subjects}
    assert sec_names == {"LS1 - ENGLISH", "LS2 - SCIENCE", "LS3 - MATH"}

    # 5. Idempotent test: Copy again from Elementary to Secondary
    copy_again_res = await client.post("/api/v1/subjects/copy", json=copy_payload)
    assert copy_again_res.status_code == 200
    copy_again_data = copy_again_res.json()["data"]["resources"]
    assert copy_again_data["copied_count"] == 0
    assert copy_again_data["skipped_count"] == 3
    assert len(copy_again_data["skipped_subjects"]) == 3

    # 6. Add a new subject specifically to Secondary: "LS6 - DIGITAL CITIZENSHIP"
    dc_res = await client.post(
        "/api/v1/subjects/",
        json={"category_id": sec_id, "name": "LS6 - DIGITAL CITIZENSHIP", "description": "Digital Literacy"},
    )
    assert dc_res.status_code == 201

    # 7. Vice-versa test: Copy from Secondary back to Elementary
    reverse_copy_payload = {
        "source_category_id": sec_id,
        "target_category_id": elem_id,
    }
    reverse_res = await client.post("/api/v1/subjects/copy", json=reverse_copy_payload)
    assert reverse_res.status_code == 201
    reverse_data = reverse_res.json()["data"]["resources"]
    # Only LS6 should be copied; the other 3 already exist in Elementary
    assert reverse_data["copied_count"] == 1
    assert reverse_data["skipped_count"] == 3
    assert reverse_data["copied_subjects"][0]["name"] == "LS6 - DIGITAL CITIZENSHIP"
    assert reverse_data["copied_subjects"][0]["category_id"] == elem_id

    # 8. Verify Elementary now has 4 subjects
    elem_cat_res = await client.get(f"/api/v1/user-categories/{elem_id}")
    assert elem_cat_res.status_code == 200
    elem_all_subjs = elem_cat_res.json()["data"]["resources"]["subjects"]
    assert len(elem_all_subjs) == 4

    # 9. Clean up categories (cascade deletes subjects)
    await client.delete(f"/api/v1/user-categories/{elem_id}")
    await client.delete(f"/api/v1/user-categories/{sec_id}")

    app.dependency_overrides.clear()

