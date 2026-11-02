"""
repository.py — Data access layer for the Requirements Master Catalog.
Provides database queries for requirement definitions using AsyncSession.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import String, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.requirements.models import (
    Requirement,
    StudentRequirement,
    StudentDocumentUploadAttempt,
    utc_now,
)
from app.features.users.models import User



class RequirementRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, requirement: Requirement) -> Requirement:
        self._session.add(requirement)
        await self._session.flush()
        return requirement

    async def get_by_id(self, requirement_id: str) -> Optional[Requirement]:
        stmt = select(Requirement).where(Requirement.requirement_id == requirement_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str) -> Optional[Requirement]:
        clean_code = code.strip().lower()
        stmt = select(Requirement).where(func.lower(Requirement.code) == clean_code)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_or_code(self, id_or_code: str) -> Optional[Requirement]:
        clean = id_or_code.strip()
        stmt = select(Requirement).where(
            or_(
                Requirement.requirement_id == clean,
                func.lower(Requirement.code) == clean.lower(),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        is_required: Optional[bool] = None,
        include_inactive: bool = False,
        offset: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Requirement], int]:
        filters = []
        if not include_inactive:
            filters.append(Requirement.is_active == True)  # noqa: E712
        if is_required is not None:
            filters.append(Requirement.is_required == is_required)

        # Count total matching
        count_stmt = select(func.count(Requirement.requirement_id))
        if filters:
            count_stmt = count_stmt.where(*filters)
        count_res = await self._session.execute(count_stmt)
        total = count_res.scalar_one()

        # Fetch page ordered by order_index asc, created_at asc
        stmt = (
            select(Requirement)
            .order_by(Requirement.order_index.asc(), Requirement.created_at.asc())
            .offset(offset)
            .limit(limit)
        )
        if filters:
            stmt = stmt.where(*filters)

        result = await self._session.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def delete(self, requirement: Requirement) -> None:
        await self._session.delete(requirement)

    async def update(self, requirement_id: str, data: Dict[str, Any]) -> Optional[Requirement]:
        """
        Updates a requirement definition using SQLAlchemy's update() construct,
        mapping dictionary values with **data and returning the updated row.
        """
        stmt = (
            update(Requirement)
            .where(Requirement.requirement_id == requirement_id)
            .values(**data)
            .returning(Requirement)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalar_one_or_none()

    async def bulk_update_order(self, items: List[Tuple[str, int]]) -> None:
        for req_id, new_order in items:
            req = await self.get_by_id(req_id)
            if req:
                req.order_index = new_order
        await self._session.flush()

    async def get_stats(self) -> Dict[str, int]:
        total_stmt = select(func.count(Requirement.requirement_id))
        active_stmt = select(func.count(Requirement.requirement_id)).where(Requirement.is_active == True)  # noqa: E712
        required_stmt = select(func.count(Requirement.requirement_id)).where(Requirement.is_required == True)  # noqa: E712
        conditional_stmt = select(func.count(Requirement.requirement_id)).where(Requirement.is_conditional == True)  # noqa: E712
        assistance_stmt = select(func.count(Requirement.requirement_id)).where(Requirement.allow_assistance == True)  # noqa: E712

        total = (await self._session.execute(total_stmt)).scalar_one()
        active = (await self._session.execute(active_stmt)).scalar_one()
        required = (await self._session.execute(required_stmt)).scalar_one()
        conditional = (await self._session.execute(conditional_stmt)).scalar_one()
        assistance = (await self._session.execute(assistance_stmt)).scalar_one()

        return {
            "total_requirements": total,
            "active_requirements": active,
            "inactive_requirements": total - active,
            "mandatory_requirements": required,
            "conditional_requirements": conditional,
            "assistance_allowed_requirements": assistance,
        }


class StudentRequirementRepository:
    """
    Data access layer for Student Requirement Submissions.
    Handles querying and persisting student requirements submissions,
    with student category filtering and search.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, submission: StudentRequirement) -> StudentRequirement:
        self._session.add(submission)
        await self._session.flush()
        return submission

    async def get_by_id(self, submission_id: str) -> Optional[StudentRequirement]:
        stmt = (
            select(StudentRequirement)
            .options(
                selectinload(StudentRequirement.student),
                selectinload(StudentRequirement.requirement),
            )
            .where(StudentRequirement.submission_id == submission_id)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_student_and_code(
        self,
        user_id: str,
        requirement_code: str,
    ) -> Optional[StudentRequirement]:
        clean_code = requirement_code.strip().lower()
        stmt = (
            select(StudentRequirement)
            .options(
                selectinload(StudentRequirement.student),
                selectinload(StudentRequirement.requirement),
            )
            .where(
                StudentRequirement.user_id == user_id,
                func.lower(StudentRequirement.requirement_code) == clean_code,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_student(self, user_id: str) -> List[StudentRequirement]:
        stmt = (
            select(StudentRequirement)
            .options(
                selectinload(StudentRequirement.student),
                selectinload(StudentRequirement.requirement),
            )
            .where(StudentRequirement.user_id == user_id)
            .order_by(StudentRequirement.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_submissions(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        requirement_code: Optional[str] = None,
        search: Optional[str] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> Tuple[List[StudentRequirement], int]:
        filters = []
        if status:
            filters.append(func.lower(StudentRequirement.status) == status.strip().lower())
        if requirement_code:
            filters.append(func.lower(StudentRequirement.requirement_code) == requirement_code.strip().lower())
        if category:
            cat_clean = category.strip().upper()
            filters.append(func.upper(func.cast(User.user_category, String)) == cat_clean)
        if search:
            term = f"%{search.strip().lower()}%"
            filters.append(
                or_(
                    func.lower(User.first_name).ilike(term),
                    func.lower(User.last_name).ilike(term),
                    func.lower(User.account_id).ilike(term),
                    func.lower(StudentRequirement.requirement_code).ilike(term),
                    func.lower(StudentRequirement.document_type).ilike(term),
                )
            )

        # Count total matching
        count_stmt = select(func.count(StudentRequirement.submission_id)).join(
            User, StudentRequirement.user_id == User.user_id
        )
        if filters:
            count_stmt = count_stmt.where(*filters)
        count_res = await self._session.execute(count_stmt)
        total = count_res.scalar_one()

        # Fetch paginated submissions
        stmt = (
            select(StudentRequirement)
            .options(
                selectinload(StudentRequirement.student),
                selectinload(StudentRequirement.requirement),
            )
            .join(User, StudentRequirement.user_id == User.user_id)
            .order_by(StudentRequirement.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        if filters:
            stmt = stmt.where(*filters)

        result = await self._session.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def delete(self, submission: StudentRequirement) -> None:
        await self._session.delete(submission)
        await self._session.flush()

    async def update(self, submission_id: str, data: Dict[str, Any]) -> Optional[StudentRequirement]:
        """
        Updates a student requirement submission using SQLAlchemy's update() construct,
        mapping dictionary values with **data and returning the updated row.
        """
        stmt = (
            update(StudentRequirement)
            .where(StudentRequirement.submission_id == submission_id)
            .values(**data)
            .returning(StudentRequirement)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalar_one_or_none()

    async def count_daily_gemini_attempts(
        self,
        user_id: str,
        hours: int = 24,
    ) -> int:
        """
        Counts the number of AI-verifiable document upload attempts (using Gemini Vision)
        made by the student within the last `hours` (default 24h).
        """
        cutoff = utc_now() - timedelta(hours=hours)
        stmt = (
            select(func.count(StudentDocumentUploadAttempt.attempt_id))
            .where(
                StudentDocumentUploadAttempt.user_id == user_id,
                StudentDocumentUploadAttempt.is_gemini_verified == True,
                StudentDocumentUploadAttempt.created_at >= cutoff,
            )
        )
        result = await self._session.execute(stmt)
        return int(result.scalar_one() or 0)

    async def get_daily_attempt_summary(
        self,
        user_id: str,
        max_daily_attempts: int = 3,
        hours: int = 24,
    ) -> Dict[str, Any]:
        """
        Returns a summary of daily upload attempts for Gemini-verified documents.
        """
        used = await self.count_daily_gemini_attempts(user_id=user_id, hours=hours)
        remaining = max(0, max_daily_attempts - used)
        return {
            "max_daily_attempts": max_daily_attempts,
            "used_today": used,
            "remaining": remaining,
            "can_upload": remaining > 0,
            "applies_to": "Valid ID and AI-verified documents",
        }


