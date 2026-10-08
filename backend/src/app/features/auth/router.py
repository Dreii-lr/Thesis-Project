"""
router.py — Authentication API endpoints.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status, Cookie
from httpx import Cookies
from sqlmodel import default

from app.core.security import set_auth_cookies, clear_auth_cookies
from app.core.unit_of_work import AbstractUnitOfWork, get_uow
from app.features.auth.dependencies import get_current_active_user
from app.features.auth.schemas import (
    AccountRecoveryRequest,
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
from app.shared.schema import SuccessfulResponseSchema
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/recover", response_model=SuccessfulResponseSchema)
async def recover_account(
    data: AccountRecoveryRequest,
    uow: AbstractUnitOfWork = Depends(get_uow),
) -> SuccessfulResponseSchema:
    response  = await AuthService.recover_account(uow, data)
    response = SharedUtils.SuccessfulResponse(response)
    response.headers["Cache-Control"] = "no-store"
    return response


@router.post("/login", response_model=SuccessfulResponseSchema)
async def login(
        request: Request,
        data: LoginRequest,
        uow: AbstractUnitOfWork = Depends(get_uow),
) -> SuccessfulResponseSchema:
    try:
        user_agent = request.headers.get("user-agent")
        ip_address = request.client.host if request.client else None

        result = await AuthService.login_with_password(
            uow=uow,
            data=data,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        id_token = result.data.token.idToken
        refresh_token = result.data.token.refreshToken
        # Set httponly cookie for refresh token security
        del result.data
        response = SharedUtils.SuccessfulResponse(result)
        set_auth_cookies(
            response=response,
            refresh_token=refresh_token,
            access_token=id_token
        )
        result.status_code = status.HTTP_200_OK
        return response
    except Exception as e:
        raise e



@router.post("/refresh", response_model=SuccessfulResponseSchema)
async def refresh(
        refresh_token: str = Cookie(default=None, alias="refresh_token"),
) -> SuccessfulResponseSchema:
    result = await AuthService.refresh_firebase_token(refresh_token=refresh_token)

    id_token = result.data.token.idToken
    refresh_token = result.data.token.refreshToken
    # Set http only cookie for refresh token security
    del result.data
    response = SharedUtils.SuccessfulResponse(result)
    set_auth_cookies(
        response=response,
        refresh_token=refresh_token,
        access_token=id_token
    )
    result.status_code = status.HTTP_200_OK
    return response


@router.post("/logout", response_model=MessageResponse)
async def logout(
        access_token : str = Cookie(default=None, alias="access_token")
) -> SuccessfulResponseSchema:
    response = await AuthService.logout(access_token=access_token)
    response.status_code = status.HTTP_200_OK
    actual_response = SharedUtils.SuccessfulResponse(response)

    clear_auth_cookies(actual_response)
    return actual_response


@router.get("/me", response_model=UserRead)
async def get_me(
        response: Response,
        current_user: User = Depends(get_current_active_user),
) -> UserRead:
    response.headers["Cache-Control"] = "no-store"
    return UserRead.model_validate(current_user)
