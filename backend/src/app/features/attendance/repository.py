"""
repository.py — Data access layer for Attendance sessions and records.
"""
from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.attendance.models import AttendanceRecord, AttendanceSession


class AttendanceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_session(self, attendance_session: AttendanceSession) -> AttendanceSession:
        self._session.add(attendance_session)
        return attendance_session

    async def add_records(self, records: list[AttendanceRecord]) -> list[AttendanceRecord]:
        self._session.add_all(records)
        return records

    async def get_session_by_id(self, session_id: str) -> AttendanceSession | None:
        stmt = (
            select(AttendanceSession)
            .where(AttendanceSession.session_id == session_id)
            .options(selectinload(AttendanceSession.records))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_session_by_criteria(
        self,
        teacher_id: str,
        session_date: str,
        level_code: str,
        strand_code: str,
    ) -> AttendanceSession | None:
        stmt = (
            select(AttendanceSession)
            .where(
                AttendanceSession.teacher_id == teacher_id,
                AttendanceSession.session_date == session_date,
                AttendanceSession.level_code == level_code,
                AttendanceSession.strand_code == strand_code,
            )
            .options(selectinload(AttendanceSession.records))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_sessions(
        self,
        level: str | None = None,
        subject: str | None = None,
        search_date: str | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[list[AttendanceSession], int]:
        stmt = select(AttendanceSession)
        count_stmt = select(func.count()).select_from(AttendanceSession)

        if level and level != "All Levels":
            stmt = stmt.where(AttendanceSession.level_code == level)
            count_stmt = count_stmt.where(AttendanceSession.level_code == level)

        if subject and subject != "All Subjects":
            stmt = stmt.where(AttendanceSession.strand_code == subject)
            count_stmt = count_stmt.where(AttendanceSession.strand_code == subject)

        if search_date:
            search_pattern = f"%{search_date.lower()}%"
            stmt = stmt.where(
                func.lower(AttendanceSession.display_date).like(search_pattern)
                | func.lower(AttendanceSession.session_date).like(search_pattern)
            )
            count_stmt = count_stmt.where(
                func.lower(AttendanceSession.display_date).like(search_pattern)
                | func.lower(AttendanceSession.session_date).like(search_pattern)
            )

        stmt = stmt.order_by(AttendanceSession.session_date.desc(), AttendanceSession.created_at.desc())
        stmt = stmt.offset(offset).limit(limit)

        total_res = await self._session.execute(count_stmt)
        total = total_res.scalar_one()

        res = await self._session.execute(stmt)
        sessions = list(res.scalars().all())

        return sessions, total

    async def get_student_records(self, student_id: str | list[str]) -> list[tuple[AttendanceRecord, AttendanceSession]]:
        if isinstance(student_id, list):
            condition = AttendanceRecord.student_id.in_(student_id)
        else:
            condition = AttendanceRecord.student_id == student_id

        stmt = (
            select(AttendanceRecord, AttendanceSession)
            .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.session_id)
            .where(condition)
            .order_by(AttendanceSession.session_date.desc())
        )
        result = await self._session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def delete_records_for_session(self, session_id: str) -> None:
        stmt = delete(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
        await self._session.execute(stmt)
        await self._session.flush()

    async def delete_session(self, session_id: str) -> None:
        await self.delete_records_for_session(session_id)
        stmt = delete(AttendanceSession).where(AttendanceSession.session_id == session_id)
        await self._session.execute(stmt)
        await self._session.flush()
