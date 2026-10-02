"""
repository.py — Data access layer for Assessments, Question Banks, and Submissions.
"""
from __future__ import annotations

from typing import List, Optional
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.assessments.models import (
    Assessment,
    AssessmentMaterial,
    AssessmentQuestions,
    AssessmentSubmission,
    SubmissionStatus,
    TaskStatus,
)
from app.features.users.models import UserCategory


class AssessmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_assessment(
        self,
        assessment: Assessment,
        questions: Optional[AssessmentQuestions] = None,
        materials: Optional[List[AssessmentMaterial]] = None,
    ) -> Assessment:
        self._session.add(assessment)
        if questions:
            self._session.add(questions)
        if materials:
            self._session.add_all(materials)
        return assessment

    async def get_assessment_by_id(self, assessment_id: str) -> Optional[Assessment]:
        stmt = (
            select(Assessment)
            .where(Assessment.assessment_id == assessment_id)
            .options(
                selectinload(Assessment.questions),
                selectinload(Assessment.materials),
                selectinload(Assessment.submissions),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_questions_by_assessment_id(self, assessment_id: str) -> Optional[AssessmentQuestions]:
        stmt = select(AssessmentQuestions).where(AssessmentQuestions.assessment_id == assessment_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_assessments_for_teacher(
        self,
        teacher_id: str,
        status: Optional[TaskStatus] = None,
        target_category: Optional[UserCategory] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> List[Assessment]:
        stmt = (
            select(Assessment)
            .where(Assessment.teacher_id == teacher_id)
            .options(
                selectinload(Assessment.submissions),
                selectinload(Assessment.materials),
            )
        )
        if status:
            stmt = stmt.where(Assessment.status == status)
        if target_category:
            stmt = stmt.where(Assessment.target_category == target_category)

        stmt = stmt.order_by(Assessment.created_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_assessments_for_student(
        self,
        student_category: Optional[UserCategory],
    ) -> List[Assessment]:
        """
        Retrieves active assessments targeted to the student's category or marked universal (target_category IS NULL).
        """
        conditions = [
            Assessment.status == TaskStatus.ACTIVE,
            or_(
                Assessment.target_category.is_(None),
                Assessment.target_category == student_category,
            ),
        ]
        stmt = (
            select(Assessment)
            .where(*conditions)
            .options(
                selectinload(Assessment.materials),
                selectinload(Assessment.submissions),
            )
            .order_by(Assessment.end_date.asc().nulls_last())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_submission_by_id(self, submission_id: str) -> Optional[AssessmentSubmission]:
        stmt = select(AssessmentSubmission).where(AssessmentSubmission.submission_id == submission_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_submission_by_student_and_assessment(
        self,
        assessment_id: str,
        student_id: str,
    ) -> Optional[AssessmentSubmission]:
        stmt = select(AssessmentSubmission).where(
            AssessmentSubmission.assessment_id == assessment_id,
            AssessmentSubmission.student_id == student_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_submissions_for_assessment(
        self,
        assessment_id: str,
    ) -> List[AssessmentSubmission]:
        stmt = (
            select(AssessmentSubmission)
            .where(AssessmentSubmission.assessment_id == assessment_id)
            .order_by(AssessmentSubmission.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def create_submission(self, submission: AssessmentSubmission) -> AssessmentSubmission:
        self._session.add(submission)
        return submission

    async def count_needs_grading(self, assessment_id: str) -> int:
        stmt = (
            select(func.count(AssessmentSubmission.submission_id))
            .where(
                AssessmentSubmission.assessment_id == assessment_id,
                AssessmentSubmission.status == SubmissionStatus.SUBMITTED,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0
