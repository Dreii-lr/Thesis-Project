"""
schemas.py — Pydantic schemas for attendance request/response contracts.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.features.attendance.models import AttendanceStatus, RecordStatus


class AttendanceRecordInput(BaseModel):
    account_id: str
    status: AttendanceStatus
    reason_of_absence: str | None = None
    remarks: str | None = None

    @model_validator(mode="before")
    @classmethod
    def sync_remarks_and_reason(cls, data: Any) -> Any:
        if isinstance(data, dict):
            reason = data.get("reason_of_absence")
            remarks = data.get("remarks")
            if reason and not remarks:
                data["remarks"] = reason
            elif remarks and not reason:
                data["reason_of_absence"] = remarks
        return data


class AttendanceRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    record_id: str
    session_id: str
    account_id: str
    status: AttendanceStatus
    reason_of_absence: str | None = None
    remarks: str | None = None
    recorded_at: Optional[datetime] = None


class AttendanceSessionCreate(BaseModel):
    session_date: date | str  # YYYY-MM-DD
    category_code: str = ""
    subject_code: str = ""
    level_code: str | None = None
    strand_code: str | None = None
    display_date: str | None = None
    status: RecordStatus = RecordStatus.COMPLETED
    records: list[AttendanceRecordInput] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def sync_field_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            cat = data.get("category_code") or data.get("level_code") or ""
            subj = data.get("subject_code") or data.get("strand_code") or ""
            data["category_code"] = cat
            data["subject_code"] = subj
            s_date = data.get("session_date")
            if isinstance(s_date, str):
                try:
                    data["session_date"] = datetime.strptime(s_date, "%Y-%m-%d").date()
                except Exception:
                    pass
        return data


class AttendanceSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    teacher_id: str
    session_date: date | str
    category_code: str
    subject_code: str
    status: RecordStatus
    records: list[AttendanceRecordRead] = []
    created_at: Optional[datetime] = None
    updated_at: datetime | None = None

    # Legacy field aliases
    level_code: str | None = None
    strand_code: str | None = None
    display_date: str | None = None
    total_count: int | None = None
    present_count: int | None = None
    absent_count: int | None = None
    excused_count: int | None = None
    attendance_rate: float | None = None

    @model_validator(mode="before")
    @classmethod
    def populate_computed_aliases(cls, data: Any) -> Any:
        if hasattr(data, "category_code"):
            # ORM instance or SQLModel
            return data
        if isinstance(data, dict):
            if "category_code" in data and not data.get("level_code"):
                data["level_code"] = data["category_code"]
            if "subject_code" in data and not data.get("strand_code"):
                data["strand_code"] = data["subject_code"]
        return data


class AttendanceSessionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_date: date | str
    category_code: str
    subject_code: str
    status: RecordStatus
    records: list[AttendanceRecordRead] = []

    # Transitional fields for frontend convenience
    rawDate: str | None = None
    displayDate: str | None = None
    level: str | None = None
    subject: str | None = None
    presentCount: int | None = None
    totalCount: int | None = None


class ListAttendanceSessionsResponse(BaseModel):
    sessions: list[AttendanceSessionListItem]
    total: int
    page: int
    limit: int


class StudentAttendanceItem(BaseModel):
    id: str
    date: str
    subject: str
    status: AttendanceStatus
    reason_of_absence: str | None = None
    remarks: str | None = None


class StudentAttendanceHistoryResponse(BaseModel):
    account_id: str
    total_days: int
    present_days: int
    absent_days: int
    excused_days: int
    attendance_rate: int
    records: list[StudentAttendanceItem]


class AttendanceProgramMetric(BaseModel):
    category_id: Optional[str] = None
    category_code: str
    category_name: str
    learners_count: int
    total_sessions: int
    completed_sessions: int


class AttendanceSummaryMetricsResponse(BaseModel):
    metrics: list[AttendanceProgramMetric]
