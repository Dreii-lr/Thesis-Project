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
from pydantic import Field, field_validator
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
    APP_NAME: str
    APP_ENV: str = "development"  # development | staging | production
    VERSION: str = "0.1.0"
    DEBUG: bool
    API_V1_PREFIX: str

    # ── Database ──────────────────────────────────────────────────
    # Must use postgresql+asyncpg:// scheme for the async engine
    DATABASE_URL: str

    # ── Document Processing Microservice ──────────────────────────
    DOCS_PROCESSING_SERVICE_URL: str = Field(
        default="http://localhost:9090",
        description="Base URL for document-processing microservice",
    )

    # ── Cloudflare R2 Object Storage ──────────────────────────────
    R2_ACCOUNT_ID: str | None = Field(
        default=None,
        description="Cloudflare Account ID for R2 storage",
    )
    R2_ACCESS_KEY_ID: str | None = Field(
        default=None,
        description="Cloudflare R2 Access Key ID",
    )
    R2_SECRET_ACCESS_KEY: str | None = Field(
        default=None,
        description="Cloudflare R2 Secret Access Key",
    )
    R2_BUCKET_NAME: str = Field(
        default="als-curriculum-materials",
        description="Cloudflare R2 Bucket Name",
    )
    R2_PUBLIC_DOMAIN: str | None = Field(
        default=None,
        description="Public CDN or Worker domain for direct R2 asset access (e.g. pub-xxx.r2.dev)",
    )

    # ── Cloudinary Image Storage ──────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str | None = Field(
        default=None,
        description="Cloudinary cloud name",
    )
    CLOUDINARY_API_KEY: str | None = Field(
        default=None,
        description="Cloudinary API key",
    )
    CLOUDINARY_API_SECRET: str | None = Field(
        default=None,
        description="Cloudinary API secret",
    )
    CLOUDINARY_URL: str | None = Field(
        default=None,
        description="Optional full Cloudinary connection URL",
    )
    CLOUDINARY_FOLDER_PREFIX: str = Field(
        default="als_thesis",
        description="Root folder name for organized assets in Cloudinary",
    )

    # ── Firebase ──────────────────────────────────────────────────
    FIREBASE_TYPE: str
    FIREBASE_PROJECT_ID: str
    FIREBASE_PRIVATE_KEY_ID: str
    FIREBASE_PRIVATE_KEY: str
    FIREBASE_CLIENT_EMAIL: str
    FIREBASE_CLIENT_ID: str
    FIREBASE_AUTH_URI: str
    FIREBASE_TOKEN_URI: str
    FIREBASE_AUTH_PROVIDER_X509_CERT_URL: str
    FIREBASE_CLIENT_X509_CERT_URL: str
    FIREBASE_UNIVERSE_DOMAIN: str
    FIREBASE_API_KEY : str
    FIREBASE_APP_ID : str
    FIREBASE_CLOCK_SKEW_SECONDS: int = Field(default=5, ge=0, le=60)

    # ── Auth / Cookies ────────────────────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    COOKIE_DOMAIN: str
    COOKIE_SECURE: bool  # set True in production (HTTPS only)
    COOKIE_SAMESITE: str  # lax | strict | none

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

FIREBASE_CONFIG: dict = {
    "type": constants.FIREBASE_TYPE,
    "project_id": constants.FIREBASE_PROJECT_ID,
    "private_key_id": constants.FIREBASE_PRIVATE_KEY_ID,
    "private_key": constants.FIREBASE_PRIVATE_KEY,
    "client_email": constants.FIREBASE_CLIENT_EMAIL,
    "client_id": constants.FIREBASE_CLIENT_ID,
    "auth_uri": constants.FIREBASE_AUTH_URI,
    "token_uri": constants.FIREBASE_TOKEN_URI,
    "auth_provider_x509_cert_url": constants.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": constants.FIREBASE_CLIENT_X509_CERT_URL,
    "universe_domain": constants.FIREBASE_UNIVERSE_DOMAIN
}
IDENTITY_TOOLKIT_BASE = "https://identitytoolkit.googleapis.com/v1"
SECURE_TOKEN_BASE = "https://securetoken.googleapis.com/v1"
