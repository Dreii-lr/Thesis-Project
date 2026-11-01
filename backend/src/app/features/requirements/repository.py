"""
repository.py — Data access layer for the Requirements Master Catalog.
Provides database queries for requirement definitions using AsyncSession.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.requirements.models import Requirement


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
