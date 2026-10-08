"""
dependencies.py — Centralized FastAPI dependencies for the entire application.
Includes UoW providers, Auth/RBAC dependencies, and domain service factories.
"""
from __future__ import annotations

from typing import TYPE_CHECKING
from fastapi import Cookie, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.concurrency import run_in_threadpool

from app.core.exceptions import (
    ForbiddenDomainException,
    UnauthorizedDomainException,
)
from app.core.firebase import verify_firebase_id_token
from app.core.unit_of_work import AbstractUnitOfWork, get_uow
from app.features.users.models import UserRole, UserStatus
from app.features.users.schemas import UserRead

if TYPE_CHECKING:
    from app.features.assessments.service import AssessmentService
    from app.features.subjects.service import SubjectService
    from app.features.user_categories.service import UserCategoryService

security_bearer = HTTPBearer(auto_error=False)


# ── Auth & RBAC Dependencies ──────────────────────────────────────────────────

async def get_current_user(
    access_token: str | None = Cookie(default=None, alias="access_token"),
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> UserRead:
    # Prefer the cookie (browser clients); fall back to Bearer header (API/mobile clients)
    token = (credentials.credentials if credentials else None) or access_token

    if not token:
        raise UnauthorizedDomainException("Authentication token missing.", "TOKEN_MISSING")

    # Firebase performs blocking certificate/revocation requests.
    claims = await run_in_threadpool(verify_firebase_id_token, token, check_revoked=True)
    if not claims:
        raise UnauthorizedDomainException("Invalid, expired, or revoked token.")

    firebase_uid: str = claims.get("uid", "")
    if not firebase_uid:
        raise UnauthorizedDomainException("Token payload missing subject.")

    user = await uow.users.get_by_firebase_uid(firebase_uid)
    if not user:
        raise UnauthorizedDomainException("User no longer exists.")
    return user


async def get_current_active_user(
    current_user: UserRead = Depends(get_current_user),
) -> UserRead:
    if current_user.status != UserStatus.ACTIVE:
        raise ForbiddenDomainException("Inactive user account.")
    return current_user


def require_roles(*allowed_roles: UserRole):
    """
    Dependency factory to restrict route access to specific roles.
    """
    async def role_checker(current_user: UserRead = Depends(get_current_active_user)) -> UserRead:
        if current_user.role not in allowed_roles:
            raise ForbiddenDomainException("Operation not permitted for your role.")
        return current_user

    return role_checker


require_teacher = require_roles(UserRole.TEACHER, UserRole.ADMIN)
require_student = require_roles(UserRole.STUDENT)
require_students = require_student
require_admin = require_roles(UserRole.ADMIN)


# ── Domain Service Dependency Providers ───────────────────────────────────────

def get_assessment_service(
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> AssessmentService:
    from app.features.assessments.service import AssessmentService
    return AssessmentService(uow)


def get_user_category_service(
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> UserCategoryService:
    from app.features.user_categories.service import UserCategoryService
    return UserCategoryService(uow)


def get_subject_service(
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> SubjectService:
    from app.features.subjects.service import SubjectService
    return SubjectService(uow)
