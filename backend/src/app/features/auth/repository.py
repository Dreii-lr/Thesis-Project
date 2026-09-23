"""
repository.py — Data access layer for UserSession entity.
"""
from __future__ import annotations

import uuid

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.features.auth.models import UserSession


class SessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, user_session: UserSession) -> UserSession:
        self._session.add(user_session)
        return user_session

    async def get_by_id(self, session_id: str) -> UserSession | None:
        statement = select(UserSession).where(UserSession.id == session_id)
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_token_hash(self, token_hash: str) -> UserSession | None:
        statement = select(UserSession).where(
            UserSession.refresh_token_hash == token_hash,
            UserSession.is_revoked == False,  # noqa: E712
        )
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

    async def revoke_session(self, session_id: str) -> None:
        user_session = await self.get_by_id(session_id)
        if user_session:
            user_session.is_revoked = True
            self._session.add(user_session)

    async def revoke_all_for_user(self, user_id: str) -> None:
        stmt = (
            update(UserSession)
                .values(is_revoked=True)
                .where(UserSession.user_id == user_id))

        await self._session.execute(stmt)
