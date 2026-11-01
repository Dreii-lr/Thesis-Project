"""
schemas.py — Pydantic DTOs for the Requirements Master Catalog subsystem.
Includes full frontend-compatible aliases (id, types, conditional) for seamless full-stack integration.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator


class RequirementCreateSchema(BaseModel):
    code: str = Field(..., min_length=1, max_length=100, description="Unique slug identifier (e.g. 'birth', 'school', 'identity')")
    title: str = Field(..., min_length=1, max_length=255, description="Requirement display title")
    description: Optional[str] = Field(default=None, description="Overview description of the requirement")
    guidance: Optional[str] = Field(default=None, description="Instructions and guidance for student submissions")
    accepted_document_types: List[str] = Field(
        default_factory=list,
        description="List of accepted document variations (e.g. 'PSA Birth Certificate', 'Form 138')",
    )
    allowed_extensions: List[str] = Field(
        default_factory=lambda: ["pdf", "jpg", "jpeg", "png", "webp"],
        description="Allowed file extensions for upload",
    )
    is_required: bool = Field(default=True, description="Whether this requirement is mandatory for enrollment")
    is_conditional: bool = Field(default=False, description="Whether conditional alternative proof or exemption is allowed")
    allow_assistance: bool = Field(default=False, description="Whether students can request teacher/admin assistance")
    max_file_size_mb: int = Field(default=10, ge=1, le=100, description="Maximum upload file size in megabytes")
    sample_document_url: Optional[str] = Field(default=None, description="Optional download link for a sample or blank template form")
    order_index: int = Field(default=0, description="Ordering index for displaying checklist items in the UI")
    is_active: bool = Field(default=True, description="Active status of this requirement")

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("allowed_extensions", mode="before")
    @classmethod
    def normalize_extensions(cls, value: Any) -> Any:
        if isinstance(value, list):
            return [str(ext).strip().lower().lstrip(".") for ext in value if str(ext).strip()]
        return value


class RequirementUpdateSchema(BaseModel):
    code: Optional[str] = Field(default=None, min_length=1, max_length=100)
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    guidance: Optional[str] = None
    accepted_document_types: Optional[List[str]] = None
    allowed_extensions: Optional[List[str]] = None
    is_required: Optional[bool] = None
    is_conditional: Optional[bool] = None
    allow_assistance: Optional[bool] = None
    max_file_size_mb: Optional[int] = Field(default=None, ge=1, le=100)
    sample_document_url: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("allowed_extensions", mode="before")
    @classmethod
    def normalize_extensions(cls, value: Any) -> Any:
        if isinstance(value, list):
            return [str(ext).strip().lower().lstrip(".") for ext in value if str(ext).strip()]
        return value


class RequirementReadSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    requirement_id: str
    code: str
    title: str
    description: Optional[str] = None
    guidance: Optional[str] = None
    accepted_document_types: List[str] = Field(default_factory=list)
    allowed_extensions: List[str] = Field(default_factory=lambda: ["pdf", "jpg", "jpeg", "png", "webp"])
    is_required: bool = True
    is_conditional: bool = False
    allow_assistance: bool = False
    max_file_size_mb: int = 10
    sample_document_url: Optional[str] = None
    order_index: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    # ── Frontend Full-Stack Compatibility Aliases ─────────────────────────────
    @computed_field
    @property
    def id(self) -> str:
        """Alias for frontend components expecting 'item.id'."""
        return self.code

    @computed_field
    @property
    def types(self) -> List[str]:
        """Alias for frontend components expecting 'item.types'."""
        return self.accepted_document_types

    @computed_field
    @property
    def conditional(self) -> bool:
        """Alias for frontend components expecting 'item.conditional'."""
        return self.is_conditional


class RequirementListResponseSchema(BaseModel):
    requirements: List[RequirementReadSchema]
    total: int
    offset: int = 0
    limit: int = 100


class RequirementReorderItem(BaseModel):
    requirement_id: str
    order_index: int = Field(..., ge=0)


class RequirementReorderSchema(BaseModel):
    items: List[RequirementReorderItem] = Field(..., min_length=1)


class RequirementStatsSchema(BaseModel):
    total_requirements: int
    active_requirements: int
    inactive_requirements: int
    mandatory_requirements: int
    conditional_requirements: int
    assistance_allowed_requirements: int
