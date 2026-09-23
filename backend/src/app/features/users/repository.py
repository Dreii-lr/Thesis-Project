"""
repository.py — Data access layer for User entity.
"""
from __future__ import annotations

from typing import Sequence, List
import uuid

from sqlalchemy import Sequence, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.features.users.models import User
from app.features.users.schemas import UserRead, ListUserRead


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: str) -> User | None:
        statement = select(User).where(User.user_id == user_id)
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_id_no_password(self, user_id) -> UserRead:
        statement = select(User).where(User.user_id == user_id)
        result = await self._session.execute(statement)
        data = result.scalar_one_or_none()
        return UserRead.model_validate(data) if data else data

    async def get_by_email(self, email: str) -> UserRead | None:
        statement = select(User).where(User.email == email.lower())
        result = await self._session.execute(statement)
        data = result.scalar_one_or_none()
        return UserRead.model_validate(data) if data else data

    async def list(self, offset: int = 0, limit: int = 100) -> ListUserRead:
        statement = select(User).offset(offset).limit(limit)
        result = await self._session.execute(statement)
        data = result.scalars().all()
        data = ListUserRead.model_validate({"users": data})
        return data

    async def create(self, user: User) -> User:
        self._session.add(user)
        return user

    async def update(self, user_id, data : dict) -> UserRead:
        stmt = (update(User)
                .values(**data)
                .where(User.user_id == user_id))
        await self._session.execute(stmt)
        return UserRead(**data)

    async def delete(self, user: User) -> None:
        await self._session.delete(user)

    async def generate_sequence_student_number(self):
        try:
            pass

        except Exception as e:
            raise e