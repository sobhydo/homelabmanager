"""add supplier_url to components

Revision ID: ba00f398513a
Revises: 541f5ff90b29
Create Date: 2026-03-26 00:44:38.606336

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba00f398513a'
down_revision: Union[str, Sequence[str], None] = '541f5ff90b29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('components', schema=None) as batch_op:
        batch_op.add_column(sa.Column('supplier_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('components', schema=None) as batch_op:
        batch_op.drop_column('supplier_url')
