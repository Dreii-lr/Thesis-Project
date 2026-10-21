"""
cloudinary.py — Async Cloudinary Image Management Service.
Handles direct image uploading as-is with folder organization and without automatic resizing or smart format alteration.
Direct cloud upload only; uninitialized service or errors raise DomainException to the base application.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import logging
from pathlib import Path
import re
from typing import Optional
import uuid

from starlette.concurrency import run_in_threadpool

from app.core.constants import constants
from app.core.exceptions import DomainException

try:
    import cloudinary
    import cloudinary.uploader
    HAS_CLOUDINARY = True
except ImportError:
    cloudinary = None
    HAS_CLOUDINARY = False

logger = logging.getLogger(__name__)


@dataclass
class CloudinaryUploadResult:
    """Upload result without width/height dimensions per project requirements."""
    public_id: str
    secure_url: str
    format: str
    bytes: int
    folder: str
    created_at: datetime


class CloudinaryService:
    """
    Asynchronous Cloudinary Image Service.
    Uploads images as-is directly into organized folders (e.g., profiles, quizzes, materials).
    Direct upload only — raises DomainException if uninitialized or if errors occur.
    """

    def __init__(self) -> None:
        self.cloud_name = constants.CLOUDINARY_CLOUD_NAME
        self.api_key = constants.CLOUDINARY_API_KEY
        self.api_secret = constants.CLOUDINARY_API_SECRET
        self.folder_prefix = constants.CLOUDINARY_FOLDER_PREFIX or "als_thesis"
        self._initialized = False

    @property
    def is_configured(self) -> bool:
        """Returns True if Cloudinary credentials are provided and valid."""
        return bool(self.cloud_name and self.api_key and self.api_secret)

    def initialize(self) -> bool:
        """Configures Cloudinary SDK if credentials exist."""
        if not HAS_CLOUDINARY:
            logger.error("[Cloudinary] 'cloudinary' package is not installed.")
            return False

        if not self.is_configured:
            logger.warning("[Cloudinary] Credentials not configured (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).")
            return False

        try:
            cloudinary.config(
                cloud_name=self.cloud_name,
                api_key=self.api_key,
                api_secret=self.api_secret,
                secure=True,
            )
            self._initialized = True
            logger.info("[Cloudinary] Successfully configured for cloud: %s", self.cloud_name)
            return True
        except Exception as exc:
            logger.error("[Cloudinary] Configuration failed: %s", exc)
            return False

    def _ensure_initialized(self) -> None:
        """
        Ensures Cloudinary SDK and credentials are ready.
        Raises DomainException to the base application if not initialized or configured.
        """
        if not self._initialized:
            self.initialize()

        if not HAS_CLOUDINARY:
            raise DomainException(
                "Cloudinary package is not installed on the server.",
                error_code="CLOUDINARY_NOT_INSTALLED",
            )

        if not self.is_configured or not self._initialized:
            raise DomainException(
                "Cloudinary image service is not initialized or configured. Please check Cloudinary credentials.",
                error_code="CLOUDINARY_NOT_INITIALIZED",
            )

    def _sanitize_filename(self, filename: str) -> str:
        clean = Path(filename).name
        clean = re.sub(r"[^a-zA-Z0-9._-]", "_", clean)
        return clean or f"image_{uuid.uuid4().hex[:8]}.jpg"

    def _sync_upload(
        self,
        file_bytes: bytes,
        folder: str,
        public_id: Optional[str] = None,
    ) -> dict:
        """Synchronous Cloudinary SDK upload executing in a worker thread."""
        upload_params = {
            "folder": folder,
            "resource_type": "image",
            "overwrite": True,
        }
        if public_id:
            upload_params["public_id"] = public_id

        return cloudinary.uploader.upload(file_bytes, **upload_params)

    def _sync_delete(self, public_id: str) -> dict:
        """Synchronous Cloudinary SDK destroy executing in a worker thread."""
        return cloudinary.uploader.destroy(public_id, resource_type="image")

    async def upload_image(
        self,
        file_bytes: bytes,
        filename: str,
        folder: str = "general",
        public_id: Optional[str] = None,
    ) -> CloudinaryUploadResult:
        """
        Uploads image file bytes directly to Cloudinary as-is with folder organization.
        Raises DomainException if service is uninitialized or upload fails.

        Args:
            file_bytes: Raw binary bytes of the image.
            filename: Original or descriptive filename.
            folder: Target subfolder for organization (e.g. 'profiles', 'quizzes', 'materials').
            public_id: Optional explicit public ID.

        Returns:
            CloudinaryUploadResult containing public_id, secure_url, format, bytes, folder, created_at.
            (Width and height are excluded).
        """
        self._ensure_initialized()

        clean_folder = folder.strip("/") if folder else "general"
        target_folder = f"{self.folder_prefix.rstrip('/')}/{clean_folder}"
        file_size = len(file_bytes)
        now = datetime.now(timezone.utc)

        try:
            res = await run_in_threadpool(
                self._sync_upload,
                file_bytes=file_bytes,
                folder=target_folder,
                public_id=public_id,
            )
        except Exception as exc:
            logger.error("[Cloudinary] Direct upload failed: %s", exc)
            raise DomainException(
                f"Failed to upload image to Cloudinary: {str(exc)}",
                error_code="CLOUDINARY_UPLOAD_ERROR",
            ) from exc

        return CloudinaryUploadResult(
            public_id=res.get("public_id", ""),
            secure_url=res.get("secure_url", ""),
            format=res.get("format", ""),
            bytes=res.get("bytes", file_size),
            folder=target_folder,
            created_at=now,
        )

    async def delete_image(self, public_id: str) -> bool:
        """
        Deletes an image directly from Cloudinary.
        Raises DomainException if service is uninitialized or deletion fails.
        """
        if not public_id:
            return True

        self._ensure_initialized()

        try:
            res = await run_in_threadpool(self._sync_delete, public_id=public_id)
            return res.get("result") in ("ok", "not found")
        except Exception as exc:
            logger.error("[Cloudinary] Failed to delete image %s: %s", public_id, exc)
            raise DomainException(
                f"Failed to delete image from Cloudinary: {str(exc)}",
                error_code="CLOUDINARY_DELETE_ERROR",
            ) from exc

    def get_health(self) -> dict:
        """Returns storage provider status and configuration details."""
        return {
            "provider": "cloudinary",
            "is_configured": self.is_configured,
            "is_initialized": self._initialized,
            "has_sdk": HAS_CLOUDINARY,
            "cloud_name": self.cloud_name if self.is_configured else None,
            "folder_prefix": self.folder_prefix,
        }


# Module singleton
cloudinary_service = CloudinaryService()


def initialize_cloudinary() -> None:
    """Helper invoked during FastAPI application startup."""
    cloudinary_service.initialize()
