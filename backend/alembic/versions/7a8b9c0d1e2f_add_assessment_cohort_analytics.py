"""add assessment cohort analytics table

Revision ID: 7a8b9c0d1e2f
Revises: 31383c086d05
Create Date: 2026-10-15 16:40:00.000000

"""
from typing import Sequence, Union

import sqlmodel
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, Sequence[str], None] = '31383c086d05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'assessment_cohort_analytics',
        sa.Column('analysis_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('assessment_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('total_submissions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('class_average', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('passing_rate', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('analysis_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.assessment_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('analysis_id'),
        sa.UniqueConstraint('assessment_id')
    )
    op.create_index(op.f('ix_assessment_cohort_analytics_analysis_id'), 'assessment_cohort_analytics', ['analysis_id'], unique=False)
    op.create_index(op.f('ix_assessment_cohort_analytics_assessment_id'), 'assessment_cohort_analytics', ['assessment_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_assessment_cohort_analytics_assessment_id'), table_name='assessment_cohort_analytics')
    op.drop_index(op.f('ix_assessment_cohort_analytics_analysis_id'), table_name='assessment_cohort_analytics')
    op.drop_table('assessment_cohort_analytics')
