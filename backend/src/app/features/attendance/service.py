"""
service.py — Business logic for Attendance tracking, aggregation, and validation.
"""
from __future__ import annotations

from datetime import date, datetime
import uuid

from app.core.exceptions import EntityNotFoundException
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.attendance.models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    RecordStatus,
)
from app.features.attendance.schemas import (
    AttendanceRecordRead,
    AttendanceSessionCreate,
    AttendanceSessionListItem,
    AttendanceSessionRead,
    ListAttendanceSessionsResponse,
    StudentAttendanceHistoryResponse,
    StudentAttendanceItem,
)
from app.shared.schema import AdditionalData, SuccessfulResponseSchema


def format_display_date(date_str: str) -> str:
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%a, %b %d, %Y")
    except Exception:
        return date_str


class AttendanceService:

    @staticmethod
    async def record_session(
        uow: AbstractUnitOfWork,
        teacher_id: str,
        data: AttendanceSessionCreate,
    ) -> SuccessfulResponseSchema:
        present_count = sum(1 for r in data.records if r.status == AttendanceStatus.PRESENT)
        absent_count = sum(1 for r in data.records if r.status == AttendanceStatus.ABSENT)
        excused_count = sum(1 for r in data.records if r.status == AttendanceStatus.EXCUSED)
        total_count = len(data.records)

        display_date = data.display_date or format_display_date(data.session_date)

        # Check if an existing session exists for this teacher, date, level, and strand
        existing_session = await uow.attendance.get_session_by_criteria(
            teacher_id=teacher_id,
            session_date=data.session_date,
            level_code=data.level_code,
            strand_code=data.strand_code,
        )

        if existing_session:
            # Update existing session
            existing_session.display_date = display_date
            existing_session.status = data.status
            existing_session.present_count = present_count
            existing_session.absent_count = absent_count
            existing_session.excused_count = excused_count
            existing_session.total_count = total_count
            existing_session.updated_at = datetime.now()

            session = existing_session
            session_id = existing_session.session_id
            await uow.attendance.delete_records_for_session(session_id)
        else:
            session_id = str(uuid.uuid4())
            session = AttendanceSession(
                session_id=session_id,
                teacher_id=teacher_id,
                session_date=data.session_date,
                display_date=display_date,
                level_code=data.level_code,
                strand_code=data.strand_code,
                status=data.status,
                total_count=total_count,
                present_count=present_count,
                absent_count=absent_count,
                excused_count=excused_count,
            )
            await uow.attendance.create_session(session)

        # Add records
        records = [
            AttendanceRecord(
                record_id=str(uuid.uuid4()),
                session_id=session_id,
                student_id=r.student_id,
                status=r.status,
                remarks=r.reason_of_absence or r.remarks,
            )
            for r in data.records
        ]
        await uow.attendance.add_records(records)
        await uow.commit()

        # Build response schema
        rate = (present_count / total_count * 100.0) if total_count > 0 else 0.0
        session_read = AttendanceSessionRead(
            session_id=session.session_id,
            teacher_id=session.teacher_id,
            session_date=session.session_date,
            display_date=session.display_date,
            level_code=session.level_code,
            strand_code=session.strand_code,
            status=session.status,
            total_count=total_count,
            present_count=present_count,
            absent_count=absent_count,
            excused_count=excused_count,
            attendance_rate=round(rate, 1),
            records=[
                AttendanceRecordRead(
                    record_id=rec.record_id,
                    session_id=rec.session_id,
                    student_id=rec.student_id,
                    status=rec.status,
                    reason_of_absence=rec.remarks,
                    remarks=rec.remarks,
                    recorded_at=rec.recorded_at,
                )
                for rec in records
            ],
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

        return SuccessfulResponseSchema(
            message="Attendance session recorded successfully.",
            message_status="SUCCESS_SAVED",
            status_code=200,
            data=AdditionalData(resources=session_read.model_dump(mode="json")),
        )

    @staticmethod
    async def list_sessions(
        uow: AbstractUnitOfWork,
        level: str | None = None,
        subject: str | None = None,
        search_date: str | None = None,
        page: int = 1,
        limit: int = 10,
    ) -> SuccessfulResponseSchema:
        offset = (page - 1) * limit
        sessions, total = await uow.attendance.list_sessions(
            level=level,
            subject=subject,
            search_date=search_date,
            offset=offset,
            limit=limit,
        )

        items = [
            AttendanceSessionListItem(
                id=s.session_id,
                rawDate=s.session_date,
                displayDate=s.display_date,
                level=s.level_code,
                subject=s.strand_code,
                status=s.status,
                presentCount=s.present_count,
                totalCount=s.total_count,
            )
            for s in sessions
        ]

        response_payload = ListAttendanceSessionsResponse(
            sessions=items,
            total=total,
            page=page,
            limit=limit,
        )

        return SuccessfulResponseSchema(
            message="Successfully retrieved attendance sessions.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=response_payload.model_dump(mode="json")),
        )

    @staticmethod
    async def get_session(uow: AbstractUnitOfWork, session_id: str) -> SuccessfulResponseSchema:
        session = await uow.attendance.get_session_by_id(session_id)
        if not session:
            raise EntityNotFoundException(f"Attendance session '{session_id}' not found.")

        rate = (session.present_count / session.total_count * 100.0) if session.total_count > 0 else 0.0
        session_read = AttendanceSessionRead(
            session_id=session.session_id,
            teacher_id=session.teacher_id,
            session_date=session.session_date,
            display_date=session.display_date,
            level_code=session.level_code,
            strand_code=session.strand_code,
            status=session.status,
            total_count=session.total_count,
            present_count=session.present_count,
            absent_count=session.absent_count,
            excused_count=session.excused_count,
            attendance_rate=round(rate, 1),
            records=[
                AttendanceRecordRead(
                    record_id=r.record_id,
                    session_id=r.session_id,
                    student_id=r.student_id,
                    status=r.status,
                    reason_of_absence=r.remarks,
                    remarks=r.remarks,
                    recorded_at=r.recorded_at,
                )
                for r in session.records
            ],
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

        return SuccessfulResponseSchema(
            message="Successfully retrieved attendance session details.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=session_read.model_dump(mode="json")),
        )

    @staticmethod
    async def get_student_history(uow: AbstractUnitOfWork, student_id: str) -> SuccessfulResponseSchema:
        # Resolve candidate identifiers (user_id and student_id) for ERD alignment
        candidate_ids = [student_id]
        if hasattr(uow, "users") and uow.users:
            user = await uow.users.get_by_student_id(student_id)
            if not user:
                user = await uow.users.get_by_id(student_id)
            if user:
                if user.user_id and user.user_id not in candidate_ids:
                    candidate_ids.append(user.user_id)
                if user.student_id and user.student_id not in candidate_ids:
                    candidate_ids.append(user.student_id)

        raw_items = await uow.attendance.get_student_records(candidate_ids)

        items: list[StudentAttendanceItem] = []
        total_days = len(raw_items)
        present_days = 0
        absent_days = 0
        excused_days = 0

        for record, session in raw_items:
            if record.status == AttendanceStatus.PRESENT:
                present_days += 1
            elif record.status == AttendanceStatus.ABSENT:
                absent_days += 1
            elif record.status == AttendanceStatus.EXCUSED:
                excused_days += 1

            items.append(
                StudentAttendanceItem(
                    id=record.record_id,
                    date=session.display_date,
                    subject=session.strand_code,
                    status=record.status,
                    reason_of_absence=record.remarks,
                    remarks=record.remarks,
                )
            )

        rate = round((present_days / total_days) * 100) if total_days > 0 else 0

        history = StudentAttendanceHistoryResponse(
            student_id=student_id,
            total_days=total_days,
            present_days=present_days,
            absent_days=absent_days,
            excused_days=excused_days,
            attendance_rate=rate,
            records=items,
        )

        return SuccessfulResponseSchema(
            message=f"Successfully retrieved attendance history for student '{student_id}'.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=history.model_dump(mode="json")),
        )
