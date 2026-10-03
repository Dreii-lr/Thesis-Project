"""
router.py — Authentication API endpoints.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status

from app.core.unit_of_work import AbstractUnitOfWork, get_uow
from app.features.auth.dependencies import get_current_active_user
from app.features.auth.schemas import (
    FirebaseLoginRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    TokenResponse,
)
from app.features.auth.service import AuthService
from app.features.users.models import User
from app.features.users.schemas import UserRead

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    response: Response,
    data: LoginRequest,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> TokenResponse:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    result = await AuthService.login_with_password(
        uow=uow,
        data=data,
        user_agent=user_agent,
        ip_address=ip_address,
    )

    # Set httponly cookie for refresh token security
    response.set_cookie(
        key="refresh_token",
        value=result.refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
    )
    return result


@router.post("/firebase-login", response_model=TokenResponse)
async def firebase_login(
    request: Request,
    response: Response,
    data: FirebaseLoginRequest,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> TokenResponse:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    result = await AuthService.login_with_firebase(
        uow=uow,
        data=data,
        user_agent=user_agent,
        ip_address=ip_address,
    )

    response.set_cookie(
        key="refresh_token",
        value=result.refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return result


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh(
    request: Request,
    response: Response,
    body: RefreshTokenRequest | None = None,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> RefreshTokenResponse:
    token = (body.refresh_token if body else None) or request.cookies.get("refresh_token")
    if not token:
        from app.core.exceptions import UnauthorizedDomainException
        raise UnauthorizedDomainException("Refresh token missing.")

    result = await AuthService.refresh_tokens(uow=uow, refresh_token=token)

    response.set_cookie(
        key="refresh_token",
        value=result.refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return result


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    body: RefreshTokenRequest | None = None,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> MessageResponse:
    token = (body.refresh_token if body else None) or request.cookies.get("refresh_token")
    if token:
        await AuthService.logout(uow=uow, refresh_token=token)

    response.delete_cookie(key="refresh_token")
    response.delete_cookie(key="access_token")
    return MessageResponse(message="Successfully logged out.")


@router.get("/me", response_model=UserRead)
async def get_me(
    current_user: User = Depends(get_current_active_user),
) -> UserRead:
    return UserRead.model_validate(current_user)
