"""
service.py — Business logic for Attendance tracking, aggregation, and validation.
"""
from __future__ import annotations

from datetime import date, datetime
import uuid

from app.core.exceptions import DomainEntityNotFoundException
from app.core.unit_of_work import AbstractUnitOfWork
from app.features.attendance.models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    RecordStatus,
    utc_now,
)
from app.features.attendance.schemas import (
    AttendanceProgramMetric,
    AttendanceRecordRead,
    AttendanceSessionCreate,
    AttendanceSessionListItem,
    AttendanceSessionRead,
    AttendanceSummaryMetricsResponse,
    ListAttendanceSessionsResponse,
    StudentAttendanceHistoryResponse,
    StudentAttendanceItem,
)
from app.shared.schema import AdditionalData, SuccessfulResponseSchema


class AttendanceService:

    @staticmethod
    async def record_session(
        uow: AbstractUnitOfWork,
        teacher_id: str,
        data: AttendanceSessionCreate,
    ) -> SuccessfulResponseSchema:
        session_date = data.session_date
        if isinstance(session_date, str):
            try:
                session_date = datetime.strptime(session_date, "%Y-%m-%d").date()
            except Exception:
                pass

        category_code = data.category_code or getattr(data, "level_code", "") or ""
        subject_code = data.subject_code or getattr(data, "strand_code", "") or ""

        # Check if an existing session exists for this teacher, date, category, and subject
        existing_session = await uow.attendance.get_session_by_criteria(
            teacher_id=teacher_id,
            session_date=session_date,
            category_code=category_code,
            subject_code=subject_code,
        )

        current_time = utc_now()

        if existing_session:
            existing_session.status = data.status
            existing_session.updated_at = current_time
            session = existing_session
            session_id = existing_session.session_id
            await uow.attendance.delete_records_for_session(session_id)
        else:
            session_id = str(uuid.uuid4())
            session = AttendanceSession(
                session_id=session_id,
                teacher_id=teacher_id,
                session_date=session_date,
                category_code=category_code,
                subject_code=subject_code,
                status=data.status,
                created_at=current_time,
            )
            await uow.attendance.create_session(session)

        # Add records
        records = [
            AttendanceRecord(
                record_id=str(uuid.uuid4()),
                session_id=session_id,
                account_id=r.account_id,
                status=r.status,
                remarks=r.reason_of_absence or r.remarks,
                recorded_at=current_time,
            )
            for r in data.records
        ]
        await uow.attendance.add_records(records)
        await uow.attendance.flush()

        # Compute summary counts
        total_count = len(records)
        present_count = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        absent_count = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
        excused_count = sum(1 for r in records if r.status == AttendanceStatus.EXCUSED)
        rate = (present_count / total_count * 100) if total_count > 0 else 0.0

        # Build response schema
        records_read = [
            AttendanceRecordRead(
                record_id=rec.record_id,
                session_id=rec.session_id,
                account_id=rec.account_id,
                status=rec.status,
                reason_of_absence=rec.remarks,
                remarks=rec.remarks,
                recorded_at=rec.recorded_at or current_time,
            )
            for rec in records
        ]
        session_read = AttendanceSessionRead(
            session_id=session.session_id,
            teacher_id=session.teacher_id,
            session_date=session.session_date,
            category_code=session.category_code,
            subject_code=session.subject_code,
            level_code=session.category_code,
            strand_code=session.subject_code,
            status=session.status,
            records=records_read,
            total_count=total_count,
            present_count=present_count,
            absent_count=absent_count,
            excused_count=excused_count,
            attendance_rate=round(rate, 1),
            created_at=session.created_at or current_time,
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
                session_date=s.session_date,
                category_code=s.category_code,
                subject_code=s.subject_code,
                status=s.status,
                records=[
                    AttendanceRecordRead(
                        record_id=r.record_id,
                        session_id=r.session_id,
                        account_id=r.account_id,
                        status=r.status,
                        reason_of_absence=r.remarks,
                        remarks=r.remarks,
                        recorded_at=r.recorded_at,
                    )
                    for r in (s.records or [])
                ],
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
            raise DomainEntityNotFoundException(f"Attendance session '{session_id}' not found.")

        records_list = session.records or []
        total_count = len(records_list)
        present_count = sum(1 for r in records_list if r.status == AttendanceStatus.PRESENT)
        absent_count = sum(1 for r in records_list if r.status == AttendanceStatus.ABSENT)
        excused_count = sum(1 for r in records_list if r.status == AttendanceStatus.EXCUSED)
        rate = (present_count / total_count * 100) if total_count > 0 else 0.0

        session_read = AttendanceSessionRead(
            session_id=session.session_id,
            teacher_id=session.teacher_id,
            session_date=session.session_date,
            category_code=session.category_code,
            subject_code=session.subject_code,
            level_code=session.category_code,
            strand_code=session.subject_code,
            status=session.status,
            records=[
                AttendanceRecordRead(
                    record_id=r.record_id,
                    session_id=r.session_id,
                    account_id=r.account_id,
                    status=r.status,
                    reason_of_absence=r.remarks,
                    remarks=r.remarks,
                    recorded_at=r.recorded_at or session.created_at or utc_now(),
                )
                for r in records_list
            ],
            total_count=total_count,
            present_count=present_count,
            absent_count=absent_count,
            excused_count=excused_count,
            attendance_rate=round(rate, 1),
            created_at=session.created_at or utc_now(),
            updated_at=session.updated_at,
        )

        return SuccessfulResponseSchema(
            message="Successfully retrieved attendance session details.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=session_read.model_dump(mode="json")),
        )

    @staticmethod
    async def get_student_history(uow: AbstractUnitOfWork, account_id: str) -> SuccessfulResponseSchema:
        # Resolve candidate identifiers (user_id and account_id) for record lookup
        candidate_ids = [account_id]
        if hasattr(uow, "users") and uow.users:
            user = await uow.users.get_by_account_id(account_id)
            if not user:
                user = await uow.users.get_by_id(account_id)
            if user:
                if user.user_id and user.user_id not in candidate_ids:
                    candidate_ids.append(user.user_id)
                if user.account_id and user.account_id not in candidate_ids:
                    candidate_ids.append(user.account_id)

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
                    date=str(session.session_date),
                    subject=session.subject_code,
                    status=record.status,
                    reason_of_absence=record.remarks,
                    remarks=record.remarks,
                )
            )

        rate = round((present_days / total_days) * 100) if total_days > 0 else 0

        history = StudentAttendanceHistoryResponse(
            account_id=account_id,
            total_days=total_days,
            present_days=present_days,
            absent_days=absent_days,
            excused_days=excused_days,
            attendance_rate=rate,
            records=items,
        )

        return SuccessfulResponseSchema(
            message=f"Successfully retrieved attendance history for account '{account_id}'.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=history.model_dump(mode="json")),
        )

    @staticmethod
    async def get_summary_metrics(uow: AbstractUnitOfWork) -> SuccessfulResponseSchema:
        db_categories, _ = await uow.user_categories.list()
        if db_categories:
            categories_input = [
                {
                    "category_id": c.category_id,
                    "code": c.code,
                    "name": c.name,
                }
                for c in db_categories
            ]
        else:
            categories_input = [
                {"category_id": None, "code": "ELEMENTARY", "name": "Elementary"},
                {"category_id": None, "code": "SECONDARY", "name": "Secondary"},
                {"category_id": None, "code": "BLP", "name": "Basic Literacy Program"},
            ]

        metrics_data = await uow.attendance.get_summary_metrics(categories_input)
        metrics = [
            AttendanceProgramMetric(
                category_id=m["category_id"],
                category_code=m["category_code"],
                category_name=m["category_name"],
                learners_count=m["learners_count"],
                total_sessions=m["total_sessions"],
                completed_sessions=m["completed_sessions"],
            )
            for m in metrics_data
        ]

        response_payload = AttendanceSummaryMetricsResponse(metrics=metrics)

        return SuccessfulResponseSchema(
            message="Successfully retrieved attendance summary metrics.",
            message_status="SUCCESS_RETRIEVED",
            status_code=200,
            data=AdditionalData(resources=response_payload.model_dump(mode="json")),
        )
