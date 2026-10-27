"""
unit_of_work.py — Unit of Work pattern for transaction management.

The UoW groups all repository access behind a single transaction boundary.
The request dependency opens the context. Services use its repositories;
only context exit commits or rolls back. External resources can register
compensation on rollback or actions to run after a successful commit.

Usage in a service::

    async def create_user(uow: AbstractUnitOfWork, data: UserCreate) -> User:
        existing = await uow.users.get_by_email(data.email)
        if existing:
            raise ConflictException("Email already registered.")
        return await uow.users.create(User(...))

FastAPI dependency::

    @router.post("/users")
    async def register(data: UserCreate, uow: AbstractUnitOfWork = Depends(get_uow, scope="function")):
        return await create_user(uow, data)
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator, Awaitable, Callable
import logging
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.features import SequenceIDGeneratorRepository

logger = logging.getLogger(__name__)
TransactionAction = Callable[[], Awaitable[None]]

if TYPE_CHECKING:
    from app.features.assessments.repository import AssessmentRepository
    from app.features.attendance.repository import AttendanceRepository
    from app.features.auth.repository import SessionRepository
    from app.features.flashcards.repository import FlashcardRepository
    from app.features.subjects.repository import SubjectRepository
    from app.features.user_categories.repository import UserCategoryRepository
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
    attendance: "AttendanceRepository"
    assessments: "AssessmentRepository"
    user_categories: "UserCategoryRepository"
    subjects: "SubjectRepository"
    flashcards: "FlashcardRepository"

    def __init__(self) -> None:
        self._rollback_actions: list[TransactionAction] = []
        self._after_commit_actions: list[tuple[TransactionAction, bool]] = []

    def on_rollback(self, action: TransactionAction) -> None:
        """Register compensation for a resource created or changed by this use case."""
        self._rollback_actions.append(action)

    def after_commit(self, action: TransactionAction, *, best_effort: bool = False) -> None:
        """Run after persistence; critical failures propagate without undoing the commit."""
        self._after_commit_actions.append((action, best_effort))

    async def __aenter__(self) -> "AbstractUnitOfWork":
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        failed = exc_type is not None
        try:
            if failed:
                await self._rollback_with_compensation()
            else:
                try:
                    await self.commit()
                except BaseException:
                    failed = True
                    await self._rollback_with_compensation()
                    raise
                # A post-commit failure must never compensate committed data.
                self._rollback_actions.clear()
                await self._run_after_commit()
        except BaseException:
            failed = True
            raise
        finally:
            self._rollback_actions.clear()
            self._after_commit_actions.clear()
            try:
                await self._close()
            except BaseException as error:
                if not failed:
                    raise
                logger.error("UoW close failed (%s).", type(error).__name__)

    async def _rollback_with_compensation(self) -> None:
        try:
            await self.rollback()
        except BaseException as error:
            logger.error("UoW rollback failed (%s).", type(error).__name__)
        actions, self._rollback_actions = self._rollback_actions, []
        for action in reversed(actions):
            try:
                await action()
            except BaseException as error:
                # Do not leak provider errors/credentials or mask the transaction error.
                logger.error("UoW compensation failed (%s).", type(error).__name__)

    async def _run_after_commit(self) -> None:
        actions, self._after_commit_actions = self._after_commit_actions, []
        first_error = None
        for action, best_effort in actions:
            try:
                await action()
            except Exception as error:
                logger.error("UoW after-commit action failed (%s).", type(error).__name__)
                if not best_effort and first_error is None:
                    first_error = error
        if first_error is not None:
            raise first_error

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
    On __aexit__   → commit on success, otherwise rollback, then always close.
    """

    def __init__(self) -> None:
        super().__init__()
        self._session: AsyncSession | None = None

    async def __aenter__(self) -> "SQLModelUnitOfWork":
        self._session = async_session_factory()
        try:
            self._attach_repositories()
        except BaseException:
            try:
                await self._close()
            except BaseException as error:
                logger.error("UoW initialization cleanup failed (%s).", type(error).__name__)
            raise
        return self

    def _attach_repositories(self) -> None:
        from app.features.assessments.repository import AssessmentRepository
        from app.features.attendance.repository import AttendanceRepository
        from app.features.auth.repository import SessionRepository
        from app.features.flashcards.repository import FlashcardRepository
        from app.features.subjects.repository import SubjectRepository
        from app.features.user_categories.repository import UserCategoryRepository
        from app.features.users.repository import UserRepository

        self.users = UserRepository(self._session)
        self.sessions = SessionRepository(self._session)
        self.sequence_id_generator = SequenceIDGeneratorRepository(self._session)
        self.attendance = AttendanceRepository(self._session)
        self.assessments = AssessmentRepository(self._session)
        self.user_categories = UserCategoryRepository(self._session)
        self.subjects = SubjectRepository(self._session)
        self.flashcards = FlashcardRepository(self._session)

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        if self._session:
            await self._session.rollback()

    async def _close(self) -> None:
        session, self._session = self._session, None
        if session is not None:
            await session.close()


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def get_uow() -> AsyncGenerator[SQLModelUnitOfWork, None]:
    """
    FastAPI dependency that provides a fresh UoW per request.

    Usage::

        @router.post("/login")
        async def login(uow: SQLModelUnitOfWork = Depends(get_uow, scope="function")):
            ...
    """
    async with SQLModelUnitOfWork() as uow:
        yield uow
