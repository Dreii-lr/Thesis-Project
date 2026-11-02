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
    is_required: bool = Field(default=True, description="Whether this requirement is mandatory for enrollment")
    is_conditional: bool = Field(default=False, description="Whether conditional alternative proof or exemption is allowed")
    allow_assistance: bool = Field(default=False, description="Whether students can request teacher/admin assistance")
    sample_document_url: Optional[str] = Field(default=None, description="Optional download link for a sample or blank template form")
    order_index: int = Field(default=0, description="Ordering index for displaying checklist items in the UI")
    is_active: bool = Field(default=True, description="Active status of this requirement")

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class RequirementUpdateSchema(BaseModel):
    code: Optional[str] = Field(default=None, min_length=1, max_length=100)
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    guidance: Optional[str] = None
    accepted_document_types: Optional[List[str]] = None
    is_required: Optional[bool] = None
    is_conditional: Optional[bool] = None
    allow_assistance: Optional[bool] = None
    sample_document_url: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower()
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


# ─────────────────────────────────────────────────────────────────────────────
# Student Requirement Submissions Schemas
# ─────────────────────────────────────────────────────────────────────────────

class StudentRequirementSubmitSchema(BaseModel):
    requirement_code: str = Field(..., min_length=1, description="Requirement slug/code (e.g. 'rpl', 'af1', 'flt')")
    document_type: str = Field(..., min_length=1, description="Selected variation (e.g. 'PSA Birth Certificate')")
    file_url: Optional[str] = Field(default=None, description="Cloudflare R2 accessible file URL")
    file_name: Optional[str] = Field(default=None, description="Original document file name")
    file_size_bytes: Optional[int] = Field(default=0, description="File size in bytes")
    mime_type: Optional[str] = Field(default=None, description="MIME content type")
    storage_key: Optional[str] = Field(default=None, description="Cloudflare R2 object storage key")
    student_remarks: Optional[str] = Field(default=None, description="Notes or explanations from student")
    is_conditional: bool = Field(default=False, description="Flag indicating conditional/alternative proof")
    requested_assistance: bool = Field(default=False, description="Flag requesting teacher guidance/assistance")

    @field_validator("requirement_code", mode="before")
    @classmethod
    def normalize_requirement_code(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class RequirementVerificationSchema(BaseModel):
    is_auto_verified: bool = Field(default=False, description="True if identity and document pass AI verification")
    suggested_status: str = Field(default="review", description="Suggested status: 'verified' or 'review'")
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0")
    first_name_match: bool = Field(default=False, description="Whether first name matched")
    last_name_match: bool = Field(default=False, description="Whether last name matched")
    dob_match: Optional[bool] = Field(default=None, description="Whether DOB matched if provided")
    mismatch_reasons: List[str] = Field(default_factory=list, description="List of identified discrepancies")
    verification_notes: str = Field(default="", description="Summary of verification check")


class RequirementUploadResultSchema(BaseModel):
    file_url: str = Field(..., description="Cloudflare R2 public URL")
    file_name: str = Field(..., description="Original filename")
    file_size_bytes: int = Field(..., description="File size in bytes")
    mime_type: str = Field(..., description="MIME content type")
    storage_key: str = Field(..., description="Cloudflare R2 object key: requirements/{folder_name}/{filename}")
    folder_name: str = Field(..., description="Folder name derived from student name")
    verification: RequirementVerificationSchema = Field(..., description="AI verification results")
    message: str = "Requirement document uploaded and verified successfully."


class StudentRequirementReviewSchema(BaseModel):
    status: str = Field(..., description="Review status: 'verified', 'correction', 'exempted', or 'review'")
    teacher_feedback: Optional[str] = Field(default=None, description="Feedback or required revision notes")

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v: Any) -> Any:
        if isinstance(v, str):
            cleaned = v.strip().lower()
            valid_statuses = {"review", "verified", "correction", "exempted"}
            if cleaned not in valid_statuses:
                raise ValueError(f"Status must be one of {valid_statuses}")
            return cleaned
        return v


class StudentRequirementReadSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    submission_id: str
    user_id: str
    requirement_id: Optional[str] = None
    requirement_code: str
    requirement_title: Optional[str] = None
    document_type: str
    status: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = 0
    mime_type: Optional[str] = None
    storage_key: Optional[str] = None

    student_remarks: Optional[str] = None
    teacher_feedback: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    is_conditional: bool = False
    requested_assistance: bool = False
    student_name: Optional[str] = None
    account_id: Optional[str] = None
    student_category: Optional[str] = None
    versions_payload: List[dict] = Field(default_factory=list)

    created_at: datetime
    updated_at: Optional[datetime] = None



class StudentRequirementListResponseSchema(BaseModel):
    submissions: List[StudentRequirementReadSchema]
    total: int
    offset: int = 0
    limit: int = 50

