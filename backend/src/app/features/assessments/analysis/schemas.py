"""
schemas.py — Cohort struggle and diagnostic analysis data models.
Strictly enforces string IDs across all question, student, lesson, and assessment identifiers.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


class StudentCohortBreakdownSchema(BaseModel):
    """Individual student performance breakdown and diagnostic struggle tags."""
    account_id: str
    student_name: str
    score: float
    max_score: float
    percentage: float
    passed: bool
    personal_struggling_topics: List[str] = Field(default_factory=list)

    @field_validator("account_id", mode="before")
    @classmethod
    def normalize_account_id(cls, v: Any) -> str:
        return str(v).strip() if v is not None else ""


class StrugglingTopicSchema(BaseModel):
    """Diagnosed topic or competency where cohort demonstrated difficulty."""
    topic_name: str
    severity: str  # "HIGH", "MEDIUM", "LOW"
    error_rate_percent: float
    description: str
    misconception: str
    affected_question_ids: List[str] = Field(
        default_factory=list,
        description="Exact string IDs of the assessment questions related to this topic",
    )
    struggling_students: List[str] = Field(
        default_factory=list,
        description="List of student names struggling with this topic",
    )

    @field_validator("affected_question_ids", mode="before")
    @classmethod
    def normalize_affected_qids(cls, v: Any) -> List[str]:
        if not v:
            return []
        if isinstance(v, list):
            return [str(item).strip() for item in v if item is not None and str(item).strip()]
        return [str(v).strip()]


class RecommendedLessonSchema(BaseModel):
    """Remedial lesson module recommended from the curriculum repository."""
    lesson_id: str
    material_id: Optional[str] = None
    module_title: str
    lesson_title: str
    main_topic: str
    relevance_reason: str
    similarity_score: Optional[float] = None

    @field_validator("lesson_id", "material_id", mode="before")
    @classmethod
    def normalize_id_str(cls, v: Any) -> Optional[str]:
        return str(v).strip() if v is not None else None


class CohortOverviewSchema(BaseModel):
    """Aggregated cohort metrics and AI-generated narrative performance summary."""
    total_students: int
    class_average: float
    passing_rate: float
    performance_summary: str


class AssessmentCohortAnalysisResponse(BaseModel):
    """Complete diagnostic cohort evaluation payload."""
    status: str = "SUCCESS"  # "SUCCESS" or "NO_TOPIC_FOUND"
    topic_found: bool = True
    message: Optional[str] = None
    assessment_id: str
    assessment_title: str
    subject_code: str
    target_category: Optional[str] = None
    cohort_overview: CohortOverviewSchema
    struggling_topics: List[StrugglingTopicSchema] = Field(default_factory=list)
    recommended_lessons: List[RecommendedLessonSchema] = Field(default_factory=list)
    student_breakdowns: List[StudentCohortBreakdownSchema] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("assessment_id", mode="before")
    @classmethod
    def normalize_assessment_id(cls, v: Any) -> str:
        return str(v).strip() if v is not None else ""
