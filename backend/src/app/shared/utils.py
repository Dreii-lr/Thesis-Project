from datetime import datetime
from pathlib import Path
from typing import Optional, Set

from fastapi import UploadFile
from starlette.responses import JSONResponse
from typing_extensions import Any

from app.core.exceptions import DomainUnprocessableEntity, DomainValidationDomainException
from app.shared.schema import SuccessfulResponseSchema

MAX_DOCUMENT_FILE_SIZE_MB: int = 10
MAX_DOCUMENT_FILE_SIZE_BYTES: int = MAX_DOCUMENT_FILE_SIZE_MB * 1024 * 1024  # 10 MB

ALLOWED_DOCUMENT_EXTENSIONS: Set[str] = {"pdf", "jpg", "jpeg", "png", "webp"}
ALLOWED_DOCUMENT_CONTENT_TYPES: Set[str] = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
}


def validate_document_file(
    file: UploadFile,
    file_bytes: Optional[bytes] = None,
    max_size_mb: int = MAX_DOCUMENT_FILE_SIZE_MB,
    allowed_extensions: Optional[Set[str]] = None,
) -> None:
    """
    Validates uploaded student documents/requirements:
    1. Checks for presence of filename.
    2. Validates filename extension against allowed_extensions (defaults to pdf, jpg, jpeg, png, webp).
    3. Validates content_type against ALLOWED_DOCUMENT_CONTENT_TYPES.
    4. Validates file size (using file_bytes length or file.size) does not exceed max_size_mb (default 10 MB).
    Raises DomainValidationDomainException on validation failure.
    """
    if not file or not file.filename:
        raise DomainValidationDomainException("A document file is required.")

    valid_extensions = allowed_extensions or ALLOWED_DOCUMENT_EXTENSIONS
    suffix = Path(file.filename).suffix.lower().lstrip(".")
    if not suffix or suffix not in valid_extensions:
        formatted = ", ".join(sorted(valid_extensions)).upper()
        raise DomainValidationDomainException(f"Unsupported file format '.{suffix}'. Allowed formats: {formatted}.")

    if file.content_type:
        content_type = file.content_type.lower()
        if content_type not in ALLOWED_DOCUMENT_CONTENT_TYPES:
            raise DomainValidationDomainException(f"Unsupported document MIME type '{content_type}'.")

    max_bytes = max_size_mb * 1024 * 1024
    if file_bytes is not None:
        size = len(file_bytes)
        if size > max_bytes:
            raise DomainValidationDomainException(
                f"Document file size ({size / (1024 * 1024):.1f} MB) exceeds maximum allowed limit of {max_size_mb} MB."
            )
    elif getattr(file, "size", None) is not None and file.size is not None:
        if file.size > max_bytes:
            raise DomainValidationDomainException(
                f"Document file size ({file.size / (1024 * 1024):.1f} MB) exceeds maximum allowed limit of {max_size_mb} MB."
            )


class SharedUtils:

    @staticmethod
    def SuccessfulResponse(success_response_schema : SuccessfulResponseSchema):
        message_content = success_response_schema.model_dump(mode="json", exclude_none=True, exclude_unset=True)
        return JSONResponse(status_code=success_response_schema.status_code,content=message_content)


    @staticmethod
    def capitalized_first_letter(data : str):
        if not data:
            return data

        if not isinstance(data, str):
            raise DomainUnprocessableEntity("Invalid type of data. It must be string only.")

        words = data.strip().split()
        if not words:
            return ""

        return " ".join(word.capitalize() for word in words)

    @staticmethod
    def to_json_dict(val: Any) -> dict | None:
        if val is None:
            return None
        if hasattr(val, "model_dump"):
            return val.model_dump(exclude_unset=False, exclude_none=True)
        if isinstance(val, dict):
            return val
        return None

    @staticmethod
    def to_json_list(val: Any ) -> list:
        if not val:
            return []
        res = []
        for item in val:
            if hasattr(item, "model_dump"):
                res.append(item.model_dump(exclude_unset=False, exclude_none=True))
            elif isinstance(item, dict):
                res.append(item)
        return res

    @staticmethod
    def generate_account_id(role: str = "STUDENT", next_value: int = 1) -> str:
        role_str = getattr(role, "value", str(role)).upper()
        current_year = str(datetime.now().year)
        if role_str == "TEACHER":
            return f"TCH-{current_year}-{next_value:04d}"
        elif role_str == "ADMIN":
            return f"ADM-{current_year}-{next_value:04d}"
        else:
            prefix = f"{current_year[0:1]}{current_year[2:]}"
            return f"{prefix}-{next_value:05d}"

    validate_document_file = staticmethod(validate_document_file)