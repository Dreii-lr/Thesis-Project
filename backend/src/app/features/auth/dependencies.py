"""
dependencies.py — FastAPI dependencies for authentication and authorization.
"""
from __future__ import annotations


from fastapi import Depends, Request, Cookie
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import (
    ForbiddenDomainException,
    UnauthorizedDomainException,
)
from app.core.firebase import verify_firebase_id_token
from app.core.unit_of_work import AbstractUnitOfWork, get_uow
from app.features.users.models import User, UserRole, UserStatus
from app.features.users.schemas import UserRead

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    access_token: str | None = Cookie(default=None, alias="access_token"),
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> UserRead:
    # Prefer the cookie (browser clients); fall back to Bearer header (API/mobile clients)
    token = access_token or (credentials.credentials if credentials else None)

    if not token:
        raise UnauthorizedDomainException("Authentication token missing.")

    claims = verify_firebase_id_token(token, check_revoked=True)
    if not claims:
        raise UnauthorizedDomainException("Invalid, expired, or revoked token.")

    firebase_uid: str = claims.get("uid", "")
    if not firebase_uid:
        raise UnauthorizedDomainException("Token payload missing subject.")

    async with uow:
        user = await uow.users.get_by_firebase_uid(firebase_uid)
        if not user:
            raise UnauthorizedDomainException("User no longer exists.")
        return user


async def get_current_active_user(
    current_user: UserRead = Depends(get_current_user),
) -> UserRead:
    if current_user.status != UserStatus.ENROLLED:
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


# Convenient role dependency for teachers/staff
require_teacher = require_roles(UserRole.EMPLOYEE, UserRole.ADMIN)
