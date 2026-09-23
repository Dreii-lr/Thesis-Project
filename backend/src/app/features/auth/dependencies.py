"""
dependencies.py — FastAPI dependencies for authentication and authorization.
"""
from __future__ import annotations


from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import (
    ForbiddenDomainException,
    UnauthorizedDomainException,
)
from app.core.security import decode_token
from app.core.unit_of_work import AbstractUnitOfWork, get_uow
from app.features.users.models import User, UserRole, UserStatus
from app.features.users.schemas import UserRead

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> UserRead:
    token: str | None = None
    if credentials:
        token = credentials.credentials
    else:
        token = request.cookies.get("access_token")

    if not token:
        raise UnauthorizedDomainException("Authentication token missing.")

    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise UnauthorizedDomainException("Invalid token type.")
        user_id_str : str = payload.get("sub","")
        if not user_id_str:
            raise UnauthorizedDomainException("Token payload missing subject.")
        user_id : str = user_id_str
    except Exception as e:
        raise UnauthorizedDomainException(f"Invalid or expired token: {e}")

    async with uow:
        user = await uow.users.get_by_id(user_id)
        if not user:
            raise UnauthorizedDomainException("User no longer exists.")
        return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    if current_user.status != UserStatus.ENROLLED:
        raise ForbiddenDomainException("Inactive user account.")
    return current_user


def require_roles(*allowed_roles: UserRole):
    """
    Dependency factory to restrict route access to specific roles.
    """
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> UserRead:
        if current_user.role not in allowed_roles:
            raise ForbiddenDomainException("Operation not permitted for your role.")
        return current_user

    return role_checker
