"""
router.py — Attendance API endpoints with Role-Based Access Control (RBAC).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from starlette.responses import JSONResponse

from app.core.exceptions import ForbiddenDomainException
from app.core.unit_of_work import AbstractUnitOfWork, get_uow
from app.features.auth.dependencies import get_current_active_user, require_roles
from app.features.attendance.schemas import AttendanceSessionCreate
from app.features.attendance.service import AttendanceService
from app.features.users.models import UserRole
from app.features.users.schemas import UserRead
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/attendance", tags=["Attendance"])

# Role dependency: only teachers (employees) and admins can manage attendance sessions
require_teacher = require_roles(UserRole.EMPLOYEE, UserRole.ADMIN)


@router.post("/sessions", status_code=status.HTTP_200_OK, tags=["Secured"])
async def record_attendance_session(
    data: AttendanceSessionCreate,
    current_user: UserRead = Depends(require_teacher),
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Take or update a class attendance session.
    Protected: Only authenticated teachers (EMPLOYEE) and admins can take attendance.
    Students (STUDENT) are forbidden.
    """
    teacher_id = current_user.employee_id or current_user.user_id or "teacher-001"
    response = await AttendanceService.record_session(uow, teacher_id, data)
    return SharedUtils.SuccessfulResponse(response)


@router.get("/sessions", status_code=status.HTTP_200_OK, tags=["Secured"])
async def list_attendance_sessions(
    level: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    search_date: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    current_user: UserRead = Depends(require_teacher),
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    List class attendance sessions with filtering and pagination.
    Protected: Only authenticated teachers (EMPLOYEE) and admins can browse session history.
    Students (STUDENT) are forbidden.
    """
    response = await AttendanceService.list_sessions(
        uow=uow,
        level=level,
        subject=subject,
        search_date=search_date,
        page=page,
        limit=limit,
    )
    return SharedUtils.SuccessfulResponse(response)


@router.get("/sessions/{session_id}", status_code=status.HTTP_200_OK, tags=["Secured"])
async def get_attendance_session(
    session_id: str,
    current_user: UserRead = Depends(require_teacher),
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Get full details and learner marks for a specific attendance session.
    Protected: Only authenticated teachers (EMPLOYEE) and admins can view session details.
    Students (STUDENT) are forbidden.
    """
    response = await AttendanceService.get_session(uow, session_id)
    return SharedUtils.SuccessfulResponse(response)


@router.get("/students/{student_id}", status_code=status.HTTP_200_OK, tags=["Secured"])
async def get_student_attendance_history(
    student_id: str,
    current_user: UserRead = Depends(get_current_active_user),
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Get attendance history and KPIs for a specific learner.
    Protected:
      - Teachers (EMPLOYEE) and Admins can view any student's attendance.
      - Students (STUDENT) can only view their own attendance log.
      - Access to another student's record by a student is forbidden (403).
    """
    is_teacher_or_admin = current_user.role in (UserRole.EMPLOYEE, UserRole.ADMIN)
    is_own_record = current_user.role == UserRole.STUDENT and (
        current_user.student_id == student_id or current_user.user_id == student_id
    )

    if not (is_teacher_or_admin or is_own_record):
        raise ForbiddenDomainException("Operation not permitted for your role.")

    response = await AttendanceService.get_student_history(uow, student_id)
    return SharedUtils.SuccessfulResponse(response)
