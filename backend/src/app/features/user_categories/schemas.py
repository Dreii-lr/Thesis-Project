"""
schemas.py — Pydantic DTOs for User Category request and response contracts.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.features.subjects.schemas import SubjectReadSchema


class UserCategoryCreateSchema(BaseModel):
    code: str = Field(..., description="Unique category code (e.g. ELEMENTARY, SECONDARY, BLP)")
    name: str = Field(..., description="Unique category display name (e.g. Elementary, Secondary, Basic Literacy Program)")
    description: Optional[str] = Field(default=None, description="Optional description of the category level")


class UserCategoryUpdateSchema(BaseModel):
    code: Optional[str] = Field(default=None, description="Updated unique category code")
    name: Optional[str] = Field(default=None, description="Updated unique display name")
    description: Optional[str] = Field(default=None, description="Updated description")


class UserCategoryReadSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: str
    code: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserCategoryWithSubjectsSchema(UserCategoryReadSchema):
    subjects: List[SubjectReadSchema] = Field(default_factory=list)


class ListUserCategoryResponseSchema(BaseModel):
    categories: List[UserCategoryReadSchema]
    total: int
    offset: int = 0
    limit: int = 100
