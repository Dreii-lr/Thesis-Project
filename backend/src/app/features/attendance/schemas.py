"""
schemas.py — Pydantic schemas for attendance request/response contracts.
"""
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.features.attendance.models import AttendanceStatus, RecordStatus


class AttendanceRecordInput(BaseModel):
    student_id: str
    status: AttendanceStatus
    remarks: str | None = None


class AttendanceRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    record_id: str
    session_id: str
    student_id: str
    status: AttendanceStatus
    remarks: str | None = None
    recorded_at: datetime


class AttendanceSessionCreate(BaseModel):
    session_date: str  # YYYY-MM-DD
    display_date: str | None = None
    level_code: str
    strand_code: str
    status: RecordStatus = RecordStatus.COMPLETED
    records: list[AttendanceRecordInput] = Field(default_factory=list)


class AttendanceSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    teacher_id: str
    session_date: str
    display_date: str
    level_code: str
    strand_code: str
    status: RecordStatus
    total_count: int
    present_count: int
    absent_count: int
    excused_count: int
    attendance_rate: float
    records: list[AttendanceRecordRead] = []
    created_at: datetime
    updated_at: datetime | None = None


class AttendanceSessionListItem(BaseModel):
    """Matches the exact shape of frontend AttendanceSession interface in mockTeacher.ts."""
    id: str
    rawDate: str
    displayDate: str
    level: str
    subject: str
    status: RecordStatus
    presentCount: int
    totalCount: int


class ListAttendanceSessionsResponse(BaseModel):
    sessions: list[AttendanceSessionListItem]
    total: int
    page: int
    limit: int


class StudentAttendanceItem(BaseModel):
    """Matches the exact shape of frontend StudentAttendance interface in mockStudents.ts."""
    id: str
    date: str
    subject: str
    status: AttendanceStatus
    remarks: str | None = None


class StudentAttendanceHistoryResponse(BaseModel):
    student_id: str
    total_days: int
    present_days: int
    absent_days: int
    excused_days: int
    attendance_rate: int
    records: list[StudentAttendanceItem]
