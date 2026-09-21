"""
repository.py — Data access layer for User entity.
"""
from __future__ import annotations

from typing import Sequence
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.features.users.models import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        statement = select(User).where(User.user_id == user_id)
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(User.email == email.lower())
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

    async def list(self, offset: int = 0, limit: int = 100) -> Sequence[User]:
        statement = select(User).offset(offset).limit(limit)
        result = await self._session.execute(statement)
        return result.scalars().all()

    async def create(self, user: User) -> User:
        self._session.add(user)
        return user

    async def update(self, user: User) -> User:
        self._session.add(user)
        return user

    async def delete(self, user: User) -> None:
        await self._session.delete(user)
