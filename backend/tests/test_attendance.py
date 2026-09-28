"""
test_attendance.py — Integration tests for attendance endpoints, including Role-Based Access Control (RBAC).
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.features.auth.dependencies import get_current_active_user, get_current_user
from app.features.users.models import UserRole, UserStatus
from app.features.users.schemas import UserRead
from app.main import app


# ── Mock User Fixtures ─────────────────────────────────────────────────────────

def teacher_user() -> UserRead:
    return UserRead(
        user_id="teacher-uuid-001",
        employee_id="EMP-2026-001",
        email="teacher@als.edu.ph",
        role=UserRole.TEACHER,
        status=UserStatus.ENROLLED,
        first_name="Maria",
        last_name="Santos",
    )


def student_user(student_id: str = "ALS-0001") -> UserRead:
    return UserRead(
        user_id="student-uuid-001",
        student_id=student_id,
        email="juan.delacruz@als.edu.ph",
        role=UserRole.STUDENT,
        status=UserStatus.ENROLLED,
        first_name="Juan",
        last_name="Dela Cruz",
    )


# ── Test Cases ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_teacher_can_record_and_list_attendance(client: AsyncClient):
    """Teachers (EMPLOYEE) have full permission to record, list, and view sessions."""
    app.dependency_overrides[get_current_active_user] = teacher_user

    try:
        # 1. Teacher records attendance session
        payload = {
            "session_date": "2026-09-24",
            "display_date": "Today, Sept 24, 2026",
            "level_code": "Junior High School",
            "strand_code": "LS1: Communication Skills",
            "status": "COMPLETED",
            "records": [
                {"student_id": "ALS-0001", "status": "Present", "remarks": ""},
                {"student_id": "ALS-0002", "status": "Present", "remarks": ""},
                {"student_id": "ALS-0003", "status": "Absent", "remarks": "Medical leave"},
                {"student_id": "ALS-0004", "status": "Excused", "remarks": "Family emergency"},
            ],
        }

        res = await client.post("/api/v1/attendance/sessions", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["message_status"] == "SUCCESS_SAVED"
        session_data = data["data"]["resources"]
        # ERD alignment: teacher_id stores user's user_id primary key
        assert session_data["teacher_id"] == "teacher-uuid-001"
        assert session_data["total_count"] == 4
        assert session_data["present_count"] == 2
        assert session_data["absent_count"] == 1
        assert session_data["excused_count"] == 1
        assert session_data["attendance_rate"] == 50.0
        session_id = session_data["session_id"]

        # ERD & Flowchart alignment: records contain reason_of_absence alongside remarks
        records = {r["student_id"]: r for r in session_data["records"]}
        assert records["ALS-0003"]["reason_of_absence"] == "Medical leave"
        assert records["ALS-0003"]["remarks"] == "Medical leave"
        assert records["ALS-0004"]["reason_of_absence"] == "Family emergency"

        # 2. Teacher lists attendance sessions
        list_res = await client.get("/api/v1/attendance/sessions")
        assert list_res.status_code == 200
        list_data = list_res.json()["data"]["resources"]
        assert list_data["total"] >= 1
        assert any(s["id"] == session_id for s in list_data["sessions"])

        # 3. Teacher views session details
        get_res = await client.get(f"/api/v1/attendance/sessions/{session_id}")
        assert get_res.status_code == 200
        get_session_data = get_res.json()["data"]["resources"]
        assert get_session_data["session_id"] == session_id
        get_records = {r["student_id"]: r for r in get_session_data["records"]}
        assert get_records["ALS-0003"]["reason_of_absence"] == "Medical leave"

        # 4. Teacher views student history
        hist_res = await client.get("/api/v1/attendance/students/ALS-0001")
        assert hist_res.status_code == 200
        assert hist_res.json()["data"]["resources"]["student_id"] == "ALS-0001"

    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_reason_of_absence_payload_interchangeability(client: AsyncClient):
    """Payloads submitting reason_of_absence (ERD/flowchart format) seamlessly work with remarks."""
    app.dependency_overrides[get_current_active_user] = teacher_user

    try:
        payload = {
            "session_date": "2026-09-25",
            "level_code": "Elementary",
            "strand_code": "LS2: Scientific Literacy",
            "records": [
                {"student_id": "ALS-0005", "status": "Absent", "reason_of_absence": "Severe flu"},
                {"student_id": "ALS-0006", "status": "Excused", "reason_of_absence": "Barangay clearance errand"},
            ],
        }

        res = await client.post("/api/v1/attendance/sessions", json=payload)
        assert res.status_code == 200
        resources = res.json()["data"]["resources"]
        records = {r["student_id"]: r for r in resources["records"]}

        assert records["ALS-0005"]["reason_of_absence"] == "Severe flu"
        assert records["ALS-0005"]["remarks"] == "Severe flu"
        assert records["ALS-0006"]["reason_of_absence"] == "Barangay clearance errand"
        assert records["ALS-0006"]["remarks"] == "Barangay clearance errand"

        # Check student history returns reason_of_absence
        hist_res = await client.get("/api/v1/attendance/students/ALS-0005")
        assert hist_res.status_code == 200
        hist_items = hist_res.json()["data"]["resources"]["records"]
        assert any(item["reason_of_absence"] == "Severe flu" for item in hist_items)

    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_student_cannot_record_or_list_sessions(client: AsyncClient):
    """Students (STUDENT) are forbidden (403) from recording or listing class sessions."""
    app.dependency_overrides[get_current_active_user] = lambda: student_user("ALS-0001")

    try:
        # 1. Student attempts to record attendance -> 403 Forbidden
        payload = {
            "session_date": "2026-09-24",
            "level_code": "Junior High School",
            "strand_code": "LS1: Communication Skills",
            "records": [{"student_id": "ALS-0001", "status": "Present"}],
        }
        res = await client.post("/api/v1/attendance/sessions", json=payload)
        assert res.status_code == 403
        body = res.json()
        assert body["error_code"] == "FORBIDDEN"
        assert "not permitted for your role" in body["message"]

        # 2. Student attempts to list all class sessions -> 403 Forbidden
        list_res = await client.get("/api/v1/attendance/sessions")
        assert list_res.status_code == 403
        assert list_res.json()["error_code"] == "FORBIDDEN"

        # 3. Student attempts to view a session by ID -> 403 Forbidden
        get_res = await client.get("/api/v1/attendance/sessions/any-session-id")
        assert get_res.status_code == 403
        assert get_res.json()["error_code"] == "FORBIDDEN"

    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_student_can_only_view_own_attendance_history(client: AsyncClient):
    """Students can view their own attendance log, but cannot view other students' records."""
    # First, setup a session as a teacher
    app.dependency_overrides[get_current_active_user] = teacher_user
    payload = {
        "session_date": "2026-09-24",
        "level_code": "Junior High School",
        "strand_code": "LS1: Communication Skills",
        "records": [
            {"student_id": "ALS-0001", "status": "Present", "remarks": ""},
            {"student_id": "ALS-0002", "status": "Absent", "remarks": "Unexcused"},
        ],
    }
    await client.post("/api/v1/attendance/sessions", json=payload)

    # Now switch to Student ALS-0001
    app.dependency_overrides[get_current_active_user] = lambda: student_user("ALS-0001")
    try:
        # 1. Student views own history (ALS-0001) -> 200 OK
        own_res = await client.get("/api/v1/attendance/students/ALS-0001")
        assert own_res.status_code == 200
        data = own_res.json()["data"]["resources"]
        assert data["student_id"] == "ALS-0001"
        assert data["present_days"] == 1

        # 2. Student attempts to view another student's history (ALS-0002) -> 403 Forbidden
        other_res = await client.get("/api/v1/attendance/students/ALS-0002")
        assert other_res.status_code == 403
        assert other_res.json()["error_code"] == "FORBIDDEN"

    finally:
        app.dependency_overrides.pop(get_current_active_user, None)


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(client: AsyncClient):
    """Requests without authentication tokens are rejected with 401 Unauthorized."""
    # Ensure no dependency override is present
    app.dependency_overrides.pop(get_current_active_user, None)
    app.dependency_overrides.pop(get_current_user, None)

    # Attempt to access protected endpoint without credentials
    res = await client.get("/api/v1/attendance/sessions")
    assert res.status_code == 401
    assert res.json()["error_code"] == "UNAUTHORIZED"
