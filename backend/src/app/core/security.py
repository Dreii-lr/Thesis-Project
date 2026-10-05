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


COOKIE_SECURE = constants.COOKIE_SECURE or constants.APP_ENV.lower() == "production"

# Lifespans
ACCESS_TOKEN_MAX_AGE = 60 * 60            # 1 hour (Firebase idToken expiration)
REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60  # 30 days
EPOCH_EXPIRES = datetime(1970, 1, 1, tzinfo=timezone.utc)


def _to_timedelta(val: timedelta | int) -> timedelta:
    return val if isinstance(val, timedelta) else timedelta(seconds=val)


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    access_token_expires: timedelta | int = timedelta(seconds=ACCESS_TOKEN_MAX_AGE),
    refresh_token_expires: timedelta | int = timedelta(seconds=REFRESH_TOKEN_MAX_AGE),
) -> None:
    """
    Sets secure HttpOnly cookies for both the access token (idToken)
    and the refresh token.
    Expiration is dynamically calculated as today (now) plus the duration passed in arguments.
    """
    response.headers["Cache-Control"] = "no-store"
    now = datetime.now(timezone.utc)

    # 1. Access Token expiration (today + argument)
    access_delta = _to_timedelta(access_token_expires)
    access_max_age = int(access_delta.total_seconds())
    access_expires = now + access_delta

    # 2. Refresh Token expiration (today + argument)
    refresh_delta = _to_timedelta(refresh_token_expires)
    refresh_max_age = int(refresh_delta.total_seconds())
    refresh_expires = now + refresh_delta

    # Short-lived Access Token (idToken)
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=access_max_age,
        expires=access_expires,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",  # Needed on API requests to authenticate endpoints
    )

    # Long-lived Refresh Token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=refresh_max_age,
        expires=refresh_expires,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/api/v1/auth",  # Restricted: only sent to auth routes (refresh, logout)
    )


def clear_auth_cookies(response: Response) -> None:
    """
    Clears both auth cookies.
    Uses explicit past epoch expiration (1970) and max_age=0 to ensure immediate browser eviction.
    Path matches the original set_cookie path exactly.
    """
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(
        key="access_token",
        value="",
        max_age=0,
        expires=EPOCH_EXPIRES,
        path="/",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
    )
    response.set_cookie(
        key="refresh_token",
        value="",
        max_age=0,
        expires=EPOCH_EXPIRES,
        path="/api/v1/auth",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
    )
