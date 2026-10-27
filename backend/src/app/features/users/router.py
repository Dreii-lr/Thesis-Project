"""
router.py — User management API endpoints supporting normalized learner details.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from starlette.responses import JSONResponse

from app.core.dependencies import require_admin_teacher
from app.core.exceptions import DomainForbiddenDomainException, DomainValidationDomainException
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

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def _validate_image_file(file: UploadFile) -> None:
    if not file.content_type or file.content_type.lower() not in ALLOWED_IMAGE_TYPES:
        raise DomainValidationDomainException("Only JPEG, PNG, and WebP image files are allowed for profile pictures.")


@router.post("/create-teacher-account", status_code=status.HTTP_201_CREATED)
async def create_teacher_account(
        data: TeacherCreate,
        current_user: UserRead = Depends(require_admin),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Create a new teacher user account.
    Restricted to ADMIN role only.
    Credentials: account_id and password only.
    Ensures account_id is filled and role is TEACHER.
    """
    response = await UserService.create_teacher_account(uow, data)
    return SharedUtils.SuccessfulResponse(response)


@router.post("/mapping", status_code=status.HTTP_201_CREATED)
async def mapping_student(
        data: MapStudent,
        current_user: UserRead = Depends(require_admin_teacher),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Map a new student with normalized personal, contact, and family details.
    Supports both nested details payloads and flat frontend form submissions.
    Accessible to both Admin and Teacher.
    """
    response = await UserService.map_student(uow, data)
    return SharedUtils.SuccessfulResponse(response)


@router.get("/", status_code=status.HTTP_200_OK)
async def list_users(
        offset: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        current_user: UserRead = Depends(require_admin_teacher),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    List user accounts with pagination.
    Accessible to Admin and Teacher.
    """
    response = await UserService.list_users(uow, offset=offset, limit=limit)
    return SharedUtils.SuccessfulResponse(response)


@router.get("/teachers", status_code=status.HTTP_200_OK)
async def list_teachers(
        offset: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        current_user: UserRead = Depends(require_admin_teacher),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    List teacher accounts with pagination.
    Accessible to Admin and Teacher.
    """
    response = await UserService.list_users(uow, offset=offset, limit=limit, role=UserRole.TEACHER)
    return SharedUtils.SuccessfulResponse(response)


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
        data: ChangePasswordRequest,
        current_user: UserRead = Depends(get_current_active_user),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
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


# ── Profile Picture Endpoints for Current User (Student, Teacher, Admin) ─────
@router.patch("/profile-picture", status_code=status.HTTP_200_OK)
async def update_current_user_profile_picture(
    file: UploadFile = File(...),
    current_user: UserRead = Depends(get_current_active_user),
    uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Update profile picture for currently authenticated user (Student, Teacher, Admin).
    Accepts both POST and PATCH methods.
    Strictly an update process; separated from account creation.
    """
    print("Hey")
    _validate_image_file(file)
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise DomainValidationDomainException("Profile picture file size cannot exceed 5 MB.")

    response = await UserService.update_profile_picture(
        uow=uow,
        user_id=current_user.user_id,
        file_bytes=file_bytes,
        filename=file.filename or f"profile_{current_user.user_id}.jpg",
    )
    return SharedUtils.SuccessfulResponse(response)


@router.delete("/profile-picture", status_code=status.HTTP_200_OK)
async def delete_current_user_profile_picture(
    current_user: UserRead = Depends(get_current_active_user),
    uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Remove profile picture for currently authenticated user (Student, Teacher, Admin).
    """
    response = await UserService.delete_profile_picture(uow=uow, user_id=current_user.user_id)
    return SharedUtils.SuccessfulResponse(response)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Specific Parameterized Subpaths (/{user_id}/<subpath>)
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/{user_id}/change-password", status_code=status.HTTP_200_OK)
async def change_password_by_id(
        user_id: str,
        data: ChangePasswordRequest,
        current_user: UserRead = Depends(get_current_active_user),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
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


@router.patch("/{user_id}/profile-picture", status_code=status.HTTP_200_OK)
async def update_user_profile_picture_by_id(
    user_id: str,
    file: UploadFile = File(...),
    current_user: UserRead = Depends(get_current_active_user),
    uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Update profile picture by user ID.
    Accessible to the account owner or an ADMIN.
    Accepts both POST and PATCH methods.
    """
    if current_user.user_id != user_id and current_user.role != UserRole.ADMIN:
        raise DomainForbiddenDomainException("You do not have permission to update another user's profile picture.")

    _validate_image_file(file)
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise DomainValidationDomainException("Profile picture file size cannot exceed 5 MB.")

    response = await UserService.update_profile_picture(
        uow=uow,
        user_id=user_id,
        file_bytes=file_bytes,
        filename=file.filename or f"profile_{user_id}.jpg",
    )
    return SharedUtils.SuccessfulResponse(response)


@router.delete("/{user_id}/profile-picture", status_code=status.HTTP_200_OK)
async def delete_user_profile_picture(
    user_id: str,
    current_user: UserRead = Depends(get_current_active_user),
    uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Remove profile picture by user ID.
    Accessible to the account owner or an ADMIN.
    """
    if current_user.user_id != user_id and current_user.role != UserRole.ADMIN:
        raise DomainForbiddenDomainException("You do not have permission to delete another user's profile picture.")

    response = await UserService.delete_profile_picture(uow=uow, user_id=user_id)
    return SharedUtils.SuccessfulResponse(response)


@router.patch("/{user_id}/unenroll", status_code=status.HTTP_200_OK)
async def unenroll_student(
        user_id: str,
        current_user: UserRead = Depends(require_admin_teacher),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Dedicated endpoint to unenroll a student (soft delete).
    """
    response = await UserService.soft_delete_user(uow, user_id)
    return SharedUtils.SuccessfulResponse(response)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Wildcard Single-segment Parameterized Routes (/{user_id})
#    (Registered LAST so they do not shadow static routes like /profile-picture)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{user_id}", status_code=status.HTTP_200_OK)
async def get_user(
        user_id: str,
        current_user: UserRead = Depends(get_current_active_user),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Retrieve full user details, including personal_details, contact_details, and family_details.
    Accessible to the account owner, Admin, or Teacher.
    """
    if current_user.user_id != user_id and current_user.role not in (UserRole.ADMIN, UserRole.TEACHER):
        raise DomainForbiddenDomainException("You do not have permission to view another user's details.")
    response = await UserService.get_user_by_id(uow, user_id)
    return SharedUtils.SuccessfulResponse(response)


@router.patch("/{user_id}", status_code=status.HTTP_200_OK)
async def update_user(
        user_id: str,
        data: UserUpdate = Depends(UserUpdate.depends),
        current_user: UserRead = Depends(get_current_active_user),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Update user information and related profile details.
    Accessible to the account owner, Admin, or Teacher.
    Students cannot modify administrative status or user category fields.
    """
    if current_user.user_id != user_id and current_user.role not in (UserRole.ADMIN, UserRole.TEACHER):
        raise DomainForbiddenDomainException("You do not have permission to update another user's details.")

    # Guard: Non-admin/teacher cannot modify system status or user category
    if current_user.role not in (UserRole.ADMIN, UserRole.TEACHER):
        data.status = None
        data.user_category = None

    response = await UserService.update_user(uow, user_id, data)
    return SharedUtils.SuccessfulResponse(response)


@router.post("/{user_id}", status_code=status.HTTP_201_CREATED)
async def create_user(
        user_id: str,
        current_user: UserRead = Depends(require_admin),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Create a new user account / enroll mapped student with Firebase credentials.
    Strictly restricted to ADMIN role only.
    """
    response = await UserService.create_user(uow, user_id)
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
        user_id: str,
        current_user: UserRead = Depends(require_admin),
        uow: AbstractUnitOfWork = Depends(get_uow, scope="function"),
) -> JSONResponse:
    """
    Soft delete user: sets user status to 'unenroll' (preserving historical records and profile details).
    Restricted to ADMIN.
    """
    response = await UserService.delete_user(uow, user_id)
    return SharedUtils.SuccessfulResponse(response)
