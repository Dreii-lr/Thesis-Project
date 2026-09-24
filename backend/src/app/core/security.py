"""
security.py — Password hashing and JWT generation/validation.
"""
from __future__ import annotations
from fastapi import Response, Request
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.constants import constants


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta
        else timedelta(minutes=constants.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": now, "type": "access"})
    return jwt.encode(
        to_encode,
        constants.JWT_SECRET_KEY,
        algorithm=constants.JWT_ALGORITHM,
    )


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta
        else timedelta(days=constants.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "iat": now, "type": "refresh"})
    return jwt.encode(
        to_encode,
        constants.JWT_SECRET_KEY,
        algorithm=constants.JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict:
    return jwt.decode(
        token,
        constants.JWT_SECRET_KEY,
        algorithms=[constants.JWT_ALGORITHM],
    )


IS_PRODUCTION = getattr(constants, "ENVIRONMENT", "production").lower() == "production"

# Lifespans
ACCESS_TOKEN_MAX_AGE = 60 * 60            # 1 hour (Firebase idToken expiration)
REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60  # 30 days


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
) -> None:
    """
    Sets secure HttpOnly cookies for both the access token (idToken)
    and the refresh token.
    """
    # Short-lived Access Token (idToken)
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=ACCESS_TOKEN_MAX_AGE,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/",  # Needed on API requests to authenticate endpoints
    )

    # Long-lived Refresh Token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_TOKEN_MAX_AGE,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/api/v1/auth",  # Restricted: only sent to auth routes (refresh, logout)
    )


def clear_auth_cookies(response: Response) -> None:
    """
    Clears both auth cookies.
    Path must match the original set_cookie path exactly.
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
    )
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
    )