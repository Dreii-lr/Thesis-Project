"""create attendance tables

Revision ID: a1b2c3d4e5f6
Revises: f35922419c55
Create Date: 2026-09-27 23:07:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f35922419c55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create attendance_sessions table
    op.create_table(
        'attendance_sessions',
        sa.Column('session_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('teacher_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('level_code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('strand_code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('session_date', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('display_date', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('status', sa.Enum('COMPLETED', 'DRAFT', name='recordstatus'), nullable=False),
        sa.Column('total_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('present_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('absent_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('excused_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('session_id'),
        sa.UniqueConstraint('teacher_id', 'session_date', 'level_code', 'strand_code', name='uq_session_teacher_date_level_strand'),
    )
    op.create_index(op.f('ix_attendance_sessions_session_id'), 'attendance_sessions', ['session_id'], unique=False)
    op.create_index(op.f('ix_attendance_sessions_teacher_id'), 'attendance_sessions', ['teacher_id'], unique=False)
    op.create_index(op.f('ix_attendance_sessions_level_code'), 'attendance_sessions', ['level_code'], unique=False)
    op.create_index(op.f('ix_attendance_sessions_strand_code'), 'attendance_sessions', ['strand_code'], unique=False)
    op.create_index(op.f('ix_attendance_sessions_session_date'), 'attendance_sessions', ['session_date'], unique=False)

    # 2. Create attendance_records table
    op.create_table(
        'attendance_records',
        sa.Column('record_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('session_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('student_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('status', sa.Enum('PRESENT', 'ABSENT', 'EXCUSED', name='attendancestatus'), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['attendance_sessions.session_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('record_id'),
        sa.UniqueConstraint('session_id', 'student_id', name='uq_session_student'),
    )
    op.create_index(op.f('ix_attendance_records_record_id'), 'attendance_records', ['record_id'], unique=False)
    op.create_index(op.f('ix_attendance_records_session_id'), 'attendance_records', ['session_id'], unique=False)
    op.create_index(op.f('ix_attendance_records_student_id'), 'attendance_records', ['student_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_attendance_records_student_id'), table_name='attendance_records')
    op.drop_index(op.f('ix_attendance_records_session_id'), table_name='attendance_records')
    op.drop_index(op.f('ix_attendance_records_record_id'), table_name='attendance_records')
    op.drop_table('attendance_records')
    op.execute('DROP TYPE IF EXISTS attendancestatus CASCADE;')

    op.drop_index(op.f('ix_attendance_sessions_session_date'), table_name='attendance_sessions')
    op.drop_index(op.f('ix_attendance_sessions_strand_code'), table_name='attendance_sessions')
    op.drop_index(op.f('ix_attendance_sessions_level_code'), table_name='attendance_sessions')
    op.drop_index(op.f('ix_attendance_sessions_teacher_id'), table_name='attendance_sessions')
    op.drop_index(op.f('ix_attendance_sessions_session_id'), table_name='attendance_sessions')
    op.drop_table('attendance_sessions')
    op.execute('DROP TYPE IF EXISTS recordstatus CASCADE;')
