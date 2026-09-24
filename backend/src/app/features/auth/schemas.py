"""
schemas.py — Pydantic DTOs for authentication requests and responses.
"""
from __future__ import annotations

from pydantic import BaseModel, EmailStr

from app.features.users.schemas import UserRead, UserReadLessData


class LoginRequest(BaseModel):
    email: EmailStr | str
    password: str


class FirebaseLoginRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    idToken: str
    refreshToken: str
    user: UserReadLessData | None = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str
