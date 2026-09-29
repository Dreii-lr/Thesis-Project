"""change user status

Revision ID: 1a10116446aa
Revises: 964fe6d1766b
Create Date: 2026-09-29 07:40:28.504094

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1a10116446aa'
down_revision: Union[str, Sequence[str], None] = '964fe6d1766b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop the column completely (removes the table dependency on the enum)
    op.drop_column("users", "status")

    # 2. Drop the old enum type from PostgreSQL
    op.execute("DROP TYPE IF EXISTS userstatus;")

    # 3. Create the new enum type
    op.execute(
        "CREATE TYPE userstatus AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED');"
    )

    # 4. Re-add the column referencing the newly created enum
    # server_default ensures existing rows receive 'ACTIVE' instead of failing on NOT NULL
    op.add_column(
        "users",
        sa.Column(
            "status",
            postgresql.ENUM(
                "ACTIVE",
                "INACTIVE",
                "COMPLETED",
                name="userstatus",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'ACTIVE'"),
        ),
    )


def downgrade() -> None:
    # 1. Drop the column
    op.drop_column("users", "status")

    # 2. Drop the new enum type
    op.execute("DROP TYPE IF EXISTS userstatus;")

    # 3. Recreate the previous enum type (adjust with your previous values)
    op.execute(
        "CREATE TYPE userstatus AS ENUM ('ACTIVE', 'INACTIVE', 'ENROLLED');"
    )

    # 4. Re-add the column with the previous enum
    op.add_column(
        "users",
        sa.Column(
            "status",
            postgresql.ENUM(
                "ACTIVE",
                "INACTIVE",
                "ENROLLED",
                name="userstatus",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'ACTIVE'"),
        ),
    )