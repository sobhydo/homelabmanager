"""add pnp setup fields to machines

Revision ID: 671d6f6c2d3e
Revises: ba00f398513a
Create Date: 2026-04-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '671d6f6c2d3e'
down_revision: Union[str, Sequence[str], None] = ('ba00f398513a', '67a1e3052c22')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('machines', schema=None) as batch_op:
        batch_op.add_column(sa.Column('pcb_origin_x', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('pcb_origin_y', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('nozzle_height_datum', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('default_mount_speed', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('machines', schema=None) as batch_op:
        batch_op.drop_column('default_mount_speed')
        batch_op.drop_column('nozzle_height_datum')
        batch_op.drop_column('pcb_origin_y')
        batch_op.drop_column('pcb_origin_x')
