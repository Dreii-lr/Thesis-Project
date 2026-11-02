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

from sqlalchemy.pool import StaticPool
import app.features.requirements.service as req_service
from unittest.mock import patch

# In-memory SQLite async engine for tests (StaticPool ensures isolated sessions share in-memory state)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)

test_async_session_factory = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(autouse=True)
def override_session_factory():
    with patch.object(req_service, "async_session_factory", test_async_session_factory):
        yield



class TestSQLModelUnitOfWork(SQLModelUnitOfWork):
    """Override SQLModelUnitOfWork to use in-memory SQLite engine."""

    async def __aenter__(self) -> TestSQLModelUnitOfWork:
        self._session = test_async_session_factory()
        self._attach_repositories()
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
