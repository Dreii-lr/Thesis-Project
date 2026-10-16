"""
repository.py — Data access layer for Attendance sessions and records.
"""
from __future__ import annotations

from datetime import date, datetime
from sqlalchemy import cast, delete, func, or_, select, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.attendance.models import AttendanceRecord, AttendanceSession, RecordStatus
from app.features.users.models import User, UserRole, UserStatus


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
        session_date: date | str,
        category_code: str,
        subject_code: str,
    ) -> AttendanceSession | None:
        target_date = session_date
        if isinstance(session_date, str):
            try:
                target_date = datetime.strptime(session_date, "%Y-%m-%d").date()
            except Exception:
                pass

        stmt = (
            select(AttendanceSession)
            .where(
                AttendanceSession.teacher_id == teacher_id,
                AttendanceSession.session_date == target_date,
                AttendanceSession.category_code == category_code,
                AttendanceSession.subject_code == subject_code,
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
        stmt = select(AttendanceSession).options(selectinload(AttendanceSession.records))
        count_stmt = select(func.count()).select_from(AttendanceSession)

        if level and level != "All Levels":
            level_upper = level.upper()
            aliases = [level, level_upper, level.lower()]
            if level_upper in ("SECONDARY", "JUNIOR", "JHS"):
                aliases.extend(["SECONDARY", "junior", "secondary", "jhs", "junior_high_school"])
            elif level_upper in ("ELEMENTARY", "ELEM"):
                aliases.extend(["ELEMENTARY", "elementary", "elem"])
            elif level_upper in ("BLP", "BASIC_LITERACY"):
                aliases.extend(["BLP", "basic_literacy", "basic_literacy_program"])

            upper_aliases = list(set(a.upper() for a in aliases))
            stmt = stmt.where(func.upper(AttendanceSession.category_code).in_(upper_aliases))
            count_stmt = count_stmt.where(func.upper(AttendanceSession.category_code).in_(upper_aliases))

        if subject and subject != "All Subjects":
            stmt = stmt.where(AttendanceSession.subject_code == subject)
            count_stmt = count_stmt.where(AttendanceSession.subject_code == subject)

        if search_date:
            search_pattern = f"%{search_date.lower()}%"
            date_col_str = cast(AttendanceSession.session_date, String)
            stmt = stmt.where(date_col_str.like(search_pattern))
            count_stmt = count_stmt.where(date_col_str.like(search_pattern))

        stmt = stmt.order_by(AttendanceSession.session_date.desc(), AttendanceSession.created_at.desc())
        stmt = stmt.offset(offset).limit(limit)

        total_res = await self._session.execute(count_stmt)
        total = total_res.scalar_one()

        res = await self._session.execute(stmt)
        sessions = list(res.scalars().all())

        return sessions, total

    async def get_student_records(self, account_id: str | list[str]) -> list[tuple[AttendanceRecord, AttendanceSession]]:
        if isinstance(account_id, list):
            condition = AttendanceRecord.account_id.in_(account_id)
        else:
            condition = AttendanceRecord.account_id == account_id

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

    @staticmethod
    def _normalize_category_aliases(cat_code: str) -> list[str]:
        c = (cat_code or "").upper().strip().replace(" ", "_")
        if c in ("SECONDARY", "JUNIOR", "JHS", "JUNIOR_HIGH_SCHOOL"):
            return ["SECONDARY", "JUNIOR", "JHS", "JUNIOR_HIGH_SCHOOL"]
        elif c in ("ELEMENTARY", "ELEM"):
            return ["ELEMENTARY", "ELEM"]
        elif c in ("BLP", "BASIC_LITERACY", "BASIC_LITERACY_PROGRAM"):
            return ["BLP", "BASIC_LITERACY", "BASIC_LITERACY_PROGRAM"]
        return [c] if c else []

    async def get_summary_metrics(
        self,
        categories: list[dict],
    ) -> list[dict]:
        results = []
        for cat in categories:
            code = cat.get("code") or cat.get("category_code") or ""
            aliases = self._normalize_category_aliases(code)

            cat_id = cat.get("category_id")
            category_conditions = [
                func.upper(func.replace(cast(User.user_category, String), " ", "_")).in_(aliases),
            ]
            if cat_id:
                category_conditions.append(cast(User.user_category, String) == str(cat_id))

            # 1. Learners count: strictly students role only, enrolled/mapped in this category
            learners_stmt = select(func.count(User.user_id)).where(
                or_(
                    User.role == UserRole.STUDENT,
                    func.upper(cast(User.role, String)) == "STUDENT",
                ),
                or_(
                    User.status.is_(None),
                    User.status != UserStatus.INACTIVE,
                ),
                or_(*category_conditions),
            )

            # 2. Total sessions: attendance records created for this category
            total_sessions_stmt = select(func.count(AttendanceSession.session_id)).where(
                func.upper(AttendanceSession.category_code).in_(aliases),
            )

            # 3. Completed sessions: attendance sessions marked COMPLETED
            completed_sessions_stmt = select(func.count(AttendanceSession.session_id)).where(
                func.upper(AttendanceSession.category_code).in_(aliases),
                AttendanceSession.status == RecordStatus.COMPLETED,
            )

            learners_count = (await self._session.execute(learners_stmt)).scalar_one()
            total_sessions = (await self._session.execute(total_sessions_stmt)).scalar_one()
            completed_sessions = (await self._session.execute(completed_sessions_stmt)).scalar_one()

            results.append({
                "category_id": cat.get("category_id"),
                "category_code": code,
                "category_name": cat.get("name") or cat.get("category_name") or code,
                "learners_count": learners_count,
                "total_sessions": total_sessions,
                "completed_sessions": completed_sessions,
            })
        return results

    async def flush(self) -> None:
        await self._session.flush()

