"""
models.py — Attendance tables definition for sessions and individual learner records.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
import uuid

from sqlalchemy import Column, DateTime, func, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RecordStatus(str, Enum):
    COMPLETED = "COMPLETED"
    DRAFT = "DRAFT"


class AttendanceStatus(str, Enum):
    PRESENT = "Present"
    ABSENT = "Absent"
    EXCUSED = "Excused"


class AttendanceRecord(SQLModel, table=True):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student"),
    )

    record_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    session_id: str = Field(
        foreign_key="attendance_sessions.session_id",
        index=True,
        nullable=False,
    )
    # student_id: Foreign key referencing users.user_id (ERD alignment: users.user_id (1) ────< (N) attendance_records.student_id)
    student_id: str = Field(index=True, nullable=False)
    status: AttendanceStatus = Field(nullable=False)
    remarks: Optional[str] = Field(default=None, nullable=True)

    @property
    def reason_of_absence(self) -> Optional[str]:
        """ERD-aligned alias for remarks (reason of absence when Absent/Excused)."""
        return self.remarks

    @reason_of_absence.setter
    def reason_of_absence(self, value: Optional[str]) -> None:
        self.remarks = value

    recorded_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    session: Optional["AttendanceSession"] = Relationship(back_populates="records")


class AttendanceSession(SQLModel, table=True):
    __tablename__ = "attendance_sessions"

    session_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        nullable=False,
    )
    teacher_id: str = Field(index=True, nullable=False,foreign_key="users.teacher_id")
    level_code: str = Field(index=True, nullable=False)
    strand_code: str = Field(index=True, nullable=False)
    session_date: str = Field(index=True, nullable=False)  # ISO string: YYYY-MM-DD
    display_date: str = Field(nullable=False)             # E.g. "Today, Sept 24, 2026"
    status: RecordStatus = Field(default=RecordStatus.COMPLETED, nullable=False)
    total_count: int = Field(default=0, nullable=False)
    present_count: int = Field(default=0, nullable=False)
    absent_count: int = Field(default=0, nullable=False)
    excused_count: int = Field(default=0, nullable=False)

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    records: List[AttendanceRecord] = Relationship(
        back_populates="session",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )
