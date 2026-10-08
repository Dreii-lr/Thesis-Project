"""
repository.py — Data access layer for User Categories.
"""
from __future__ import annotations

from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.user_categories.models import UserCategoryModel


class UserCategoryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, category: UserCategoryModel) -> UserCategoryModel:
        self._session.add(category)
        return category

    async def get_by_id(
        self,
        category_id: str,
        load_subjects: bool = False,
    ) -> Optional[UserCategoryModel]:
        stmt = select(UserCategoryModel).where(UserCategoryModel.category_id == category_id)
        if load_subjects:
            stmt = stmt.options(selectinload(UserCategoryModel.subjects))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_code(
        self,
        code: str,
        load_subjects: bool = False,
    ) -> Optional[UserCategoryModel]:
        stmt = select(UserCategoryModel).where(func.upper(UserCategoryModel.code) == code.upper())
        if load_subjects:
            stmt = stmt.options(selectinload(UserCategoryModel.subjects))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[UserCategoryModel]:
        stmt = select(UserCategoryModel).where(func.upper(UserCategoryModel.name) == name.upper())
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        load_subjects: bool = False,
        offset: int = 0,
        limit: int = 100,
    ) -> Tuple[List[UserCategoryModel], int]:
        count_stmt = select(func.count(UserCategoryModel.category_id))
        count_result = await self._session.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = select(UserCategoryModel).order_by(UserCategoryModel.created_at.asc()).offset(offset).limit(limit)
        if load_subjects:
            stmt = stmt.options(selectinload(UserCategoryModel.subjects))
        result = await self._session.execute(stmt)
        items = list(result.scalars().all())
        return items, total

    async def delete(self, category: UserCategoryModel) -> None:
        await self._session.delete(category)
