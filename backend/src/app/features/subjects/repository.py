"""
repository.py — Data access layer for Subject entity.
"""
from __future__ import annotations

from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.subjects.models import Subject


class SubjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, subject: Subject) -> Subject:
        self._session.add(subject)
        return subject

    async def get_by_id(
        self,
        subject_id: str,
        load_category: bool = False,
    ) -> Optional[Subject]:
        stmt = select(Subject).where(Subject.subject_id == subject_id)
        if load_category:
            stmt = stmt.options(selectinload(Subject.category))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_category_and_code(
        self,
        category_id: str,
        code: str,
    ) -> Optional[Subject]:
        stmt = select(Subject).where(
            Subject.category_id == category_id,
            func.upper(Subject.code) == code.upper(),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        category_id: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
        load_category: bool = False,
    ) -> Tuple[List[Subject], int]:
        count_stmt = select(func.count(Subject.subject_id))
        stmt = select(Subject)

        if category_id:
            count_stmt = count_stmt.where(Subject.category_id == category_id)
            stmt = stmt.where(Subject.category_id == category_id)

        if load_category:
            stmt = stmt.options(selectinload(Subject.category))

        count_result = await self._session.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = stmt.order_by(Subject.created_at.asc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def delete(self, subject: Subject) -> None:
        await self._session.delete(subject)
