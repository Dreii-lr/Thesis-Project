"""
schemas.py — Pydantic DTOs for authentication requests and responses.
"""
from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal

from app.features.users.schemas import UserRead, UserReadLessData


class LoginRequest(BaseModel):
    email: EmailStr | str
    password: str


class AccountRecoveryRequest(BaseModel):
    # Keep the existing frontend field name; it accepts email or institutional ID.
    email: str = Field(min_length=1, max_length=254)

    @field_validator("email", mode="before")
    @classmethod
    def strip_identity(cls, value):
        return value.strip() if isinstance(value, str) else value


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
