"""
unit_of_work.py — Unit of Work pattern for transaction management.

The UoW groups all repository access behind a single transaction boundary.
Services open a UoW context, call repositories through it, then either
commit() or let the context manager rollback on exception.

Usage in a service::

    async def create_user(uow: AbstractUnitOfWork, data: UserCreate) -> User:
        async with uow:
            existing = await uow.users.get_by_email(data.email)
            if existing:
                raise ConflictException("Email already registered.")
            user = await uow.users.create(User(...))
            await uow.commit()
            return user

FastAPI dependency::

    @router.post("/users")
    async def register(data: UserCreate, uow: AbstractUnitOfWork = Depends(get_uow)):
        return await create_user(uow, data)
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.features import SequenceIDGenerator, SequenceIDGeneratorRepository

if TYPE_CHECKING:
    from app.features.auth.repository import SessionRepository
    from app.features.users.repository import UserRepository


# ── Abstract base ─────────────────────────────────────────────────────────────

class AbstractUnitOfWork(ABC):
    """
    Defines the contract that every UoW implementation must satisfy.
    Concrete implementations attach the concrete repositories.
    """

    users: "UserRepository"
    sessions: "SessionRepository"
    sequence_id_generator : "SequenceIDGeneratorRepository"

    async def __aenter__(self) -> "AbstractUnitOfWork":
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            await self.rollback()
        else:
            await self.commit()
        await self._close()

    @abstractmethod
    async def commit(self) -> None: ...

    @abstractmethod
    async def rollback(self) -> None: ...

    @abstractmethod
    async def _close(self) -> None: ...


# ── SQLModel concrete implementation ──────────────────────────────────────────

class SQLModelUnitOfWork(AbstractUnitOfWork):
    """
    Concrete UoW backed by a SQLAlchemy AsyncSession.

    On __aenter__  → opens a new session and instantiates all repositories.
    On commit()    → flushes + commits the transaction.
    On rollback()  → rolls back all pending changes.
    On __aexit__   → rollback (if exception) then close the session.
    """

    def __init__(self) -> None:
        self._session: AsyncSession

    async def __aenter__(self) -> "SQLModelUnitOfWork":
        # Late import to avoid circular dependency at module load time
        from app.features.auth.repository import SessionRepository
        from app.features.users.repository import UserRepository

        self._session : AsyncSession = async_session_factory()
        self.users = UserRepository(self._session)
        self.sessions = SessionRepository(self._session)
        self.sequence_id_generator = SequenceIDGeneratorRepository(self._session)
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val,
        exc_tb: object,
    ) -> None:
        if exc_val:
            await self.rollback()
        else:
            await self.commit()
        await self._close()


    async def commit(self) -> None:
        assert self._session is not None, "UoW not entered — use `async with uow:`"
        await self._session.commit()

    async def rollback(self) -> None:
        if self._session:
            await self._session.rollback()

    async def _close(self) -> None:
        if self._session:
            await self._session.close()
            self._session = None


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def get_uow() -> AsyncGenerator[SQLModelUnitOfWork, None]:
    """
    FastAPI dependency that provides a fresh UoW per request.

    Usage::

        @router.post("/login")
        async def login(uow: SQLModelUnitOfWork = Depends(get_uow)):
            ...
    """
    async with SQLModelUnitOfWork() as uow:
        yield uow
