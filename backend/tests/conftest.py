"""
conftest.py — Pytest fixtures for in-memory DB testing and FastAPI TestClient / AsyncClient.
"""
from __future__ import annotations

from typing import AsyncGenerator

from httpx import ASGITransport, AsyncClient
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.core.unit_of_work import SQLModelUnitOfWork, get_uow
from app.main import app

# In-memory SQLite async engine for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

test_async_session_factory = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class TestSQLModelUnitOfWork(SQLModelUnitOfWork):
    """Override SQLModelUnitOfWork to use in-memory SQLite engine."""

    async def __aenter__(self) -> TestSQLModelUnitOfWork:
        from app.features.auth.repository import SessionRepository
        from app.features.users.repository import UserRepository

        self._session = test_async_session_factory()
        self.users = UserRepository(self._session)
        self.sessions = SessionRepository(self._session)
        return self


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture
async def override_uow() -> TestSQLModelUnitOfWork:
    return TestSQLModelUnitOfWork()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async def _get_test_uow():
        async with TestSQLModelUnitOfWork() as uow:
            yield uow

    app.dependency_overrides[get_uow] = _get_test_uow

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
