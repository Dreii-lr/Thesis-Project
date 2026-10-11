"""
schemas.py — Pydantic DTOs for Subject request and response contracts.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SubjectCreateSchema(BaseModel):
    category_id: str = Field(..., description="Foreign key referencing the target user category ID")
    name: str = Field(..., description="Subject title/name (e.g. LS3 - MATH, ENGLISH)")
    description: Optional[str] = Field(default=None, description="Optional subject overview/description")
    is_active: bool = Field(default=True, description="Whether the subject is active")


class SubjectUpdateSchema(BaseModel):
    category_id: Optional[str] = Field(default=None, description="Updated user category ID")
    name: Optional[str] = Field(default=None, description="Updated subject name")
    description: Optional[str] = Field(default=None, description="Updated description")
    is_active: Optional[bool] = Field(default=None, description="Updated active status")


class SubjectReadSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    subject_id: str
    category_id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class SubjectDetailSchema(SubjectReadSchema):
    category_name: Optional[str] = None
    category_code: Optional[str] = None


class ListSubjectResponseSchema(BaseModel):
    subjects: List[SubjectReadSchema]
    total: int
    offset: int = 0
    limit: int = 100


class SubjectCopySchema(BaseModel):
    source_category_id: str = Field(
        ...,
        description="Source category ID or code (e.g. 'ELEMENTARY', 'SECONDARY', 'BLP')",
    )
    target_category_id: str = Field(
        ...,
        description="Target category ID or code to copy subjects into",
    )


class SubjectCopyResultSchema(BaseModel):
    source_category_id: str
    source_category_name: str
    target_category_id: str
    target_category_name: str
    copied_count: int
    skipped_count: int
    copied_subjects: List[SubjectReadSchema]
    skipped_subjects: List[str]
