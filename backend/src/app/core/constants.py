"""
constants.py — single source of truth for all environment configuration.

Pattern:
  1. load_dotenv() reads the .env file into the process environment.
  2. BaseSettings reads those env vars and validates/coerces them.
  3. The singleton ``constants`` is imported everywhere — never call
     Constants() more than once.
"""
from __future__ import annotations

import json

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env before BaseSettings resolves field values
load_dotenv()


class Constants(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────────
    APP_NAME: str = "Thesis Project API"
    APP_ENV: str = "development"          # development | staging | production
    VERSION: str = "0.1.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ── Database ──────────────────────────────────────────────────
    # Must use postgresql+asyncpg:// scheme for the async engine
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/thesis_db"

    # ── Firebase ──────────────────────────────────────────────────
    # Absolute or relative path to the service-account JSON key file
    FIREBASE_CREDENTIALS_PATH: str = "firebase-credentials.json"
    # Firebase project Web API Key (Project Settings → General)
    FIREBASE_WEB_API_KEY: str = ""

    # ── Auth / Cookies ────────────────────────────────────────────
    JWT_SECRET_KEY: str = "super-secret-jwt-key-change-in-production-12345"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    COOKIE_DOMAIN: str = "localhost"
    COOKIE_SECURE: bool = False          # set True in production (HTTPS only)
    COOKIE_SAMESITE: str = "lax"         # lax | strict | none

    # ── CORS ──────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def _parse_origins(cls, v: str | list[str]) -> list[str]:
        """Accept a JSON array string or comma-separated string from .env."""
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            return [o.strip() for o in v.split(",")]
        return v


# ── Singleton ─────────────────────────────────────────────────────────────────
constants = Constants()
