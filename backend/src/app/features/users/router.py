"""
router.py — User management API endpoints supporting normalized learner details.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from starlette.responses import JSONResponse

from app.core.dependencies import require_admin_teacher
from app.core.exceptions import DomainForbiddenDomainException
from app.core.security import clear_auth_cookies
from app.core.unit_of_work import AbstractUnitOfWork, get_uow
from app.features.auth.dependencies import get_current_active_user, require_roles, require_teacher
from app.features.users.models import UserRole
from app.features.users.schemas import (
    ChangePasswordRequest,
    ListUserRead,
    TeacherCreate,
    UserCreate,
    UserRead,
    UserUpdate, MapStudent,
)
from app.features.users.service import UserService
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/users", tags=["Users"])

require_admin = require_roles(UserRole.ADMIN)

#
# @router.post("/teacher", status_code=status.HTTP_201_CREATED)
# async def create_teacher(
#         data: TeacherCreate = Depends(TeacherCreate.get_teacher_create_dependency),
#         current_user: UserRead = Depends(require_admin_teacher),
#         uow: AbstractUnitOfWork = Depends(get_uow),
# ) -> JSONResponse:
#     """
#     Create a new teacher user account.
#     Restricted to ADMIN role only.
#     """
#     response = await UserService.create_teacher(uow, data)
#     return SharedUtils.SuccessfulResponse(response)
#
@router.post("/mapping",status_code=status.HTTP_201_CREATED)
async def mapping_student(data: UserCreate = Depends(MapStudent.get_map_student_dependency),
        # current_user: UserRead = Depends(require_teacher),
        uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Map a new student with normalized personal, contact, and family details.
    Supports both nested details payloads and flat frontend form submissions.
    """
    response = await UserService.map_student(uow, data)
    return SharedUtils.SuccessfulResponse(response)


@router.post("/{user_id}", status_code=status.HTTP_201_CREATED)
async def create_user(
        user_id : str,
        # current_user: UserRead = Depends(require_teacher),
        uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Create a new user account with normalized personal, contact, and family details.
    Supports both nested details payloads and flat frontend form submissions.
    """
    response = await UserService.create_user(uow, user_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/", status_code=status.HTTP_200_OK)
async def list_users(
        offset: int = Query(0, ge=0),
        # current_user: UserRead = Depends(require_teacher),
        limit: int = Query(100, ge=1, le=500),
        uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    List user accounts with pagination.
    """
    response = await UserService.list_users(uow, offset=offset, limit=limit)

    return SharedUtils.SuccessfulResponse(response)


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
        data: ChangePasswordRequest,
        current_user: UserRead = Depends(get_current_active_user),
        uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Change password for the authenticated user.
    Synchronously updates Firebase Auth and PostgreSQL database,
    revokes refresh tokens on Firebase only, and clears browser auth cookies.
    """
    response = await UserService.change_password(uow, current_user.user_id, data)
    json_response = SharedUtils.SuccessfulResponse(response)
    clear_auth_cookies(json_response)
    return json_response


@router.patch("/{user_id}/change-password", status_code=status.HTTP_200_OK)
async def change_password_by_id(
        user_id: str,
        data: ChangePasswordRequest,
        current_user: UserRead = Depends(get_current_active_user),
        uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Change password by user ID.
    Users can change their own password, and admins can change passwords for any user.
    """
    if current_user.user_id != user_id and current_user.role != UserRole.ADMIN:
        raise DomainForbiddenDomainException("You do not have permission to change another user's password.")
    response = await UserService.change_password(uow, user_id, data)
    json_response = SharedUtils.SuccessfulResponse(response)
    if current_user.user_id == user_id:
        clear_auth_cookies(json_response)
    return json_response


@router.get("/{user_id}", status_code=status.HTTP_200_OK)
async def get_user(
        user_id: str,
        uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Retrieve full user details, including personal_details, contact_details, and family_details.
    """
    response = await UserService.get_user_by_id(uow, user_id)
    return SharedUtils.SuccessfulResponse(response)


@router.patch("/{user_id}", status_code=status.HTTP_200_OK)
async def update_user(
        user_id: str,
        data: UserUpdate = Depends(UserUpdate.depends),
        uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Update user information and related profile details.
    """
    response = await UserService.update_user(uow, user_id, data)
    return SharedUtils.SuccessfulResponse(response)


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
        user_id: str,
        uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Soft delete user: sets user status to 'unenroll' (preserving historical records and profile details).
    """
    response = await UserService.delete_user(uow, user_id)
    return SharedUtils.SuccessfulResponse(response)


@router.patch("/{user_id}/unenroll", status_code=status.HTTP_200_OK)
async def unenroll_student(
        user_id: str,
        uow: AbstractUnitOfWork = Depends(get_uow),
) -> JSONResponse:
    """
    Dedicated endpoint to unenroll a student (soft delete).
    """
    response = await UserService.soft_delete_user(uow, user_id)
    return SharedUtils.SuccessfulResponse(response)
