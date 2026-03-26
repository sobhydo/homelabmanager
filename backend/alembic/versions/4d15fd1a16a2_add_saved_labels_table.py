"""add saved_labels table

Revision ID: 4d15fd1a16a2
Revises: 099386666730
Create Date: 2026-03-26 17:08:52.662018

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d15fd1a16a2'
down_revision: Union[str, Sequence[str], None] = '099386666730'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('saved_labels',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('paper_size', sa.String(length=20), nullable=False),
        sa.Column('template_index', sa.Integer(), nullable=False),
        sa.Column('font_size', sa.Integer(), nullable=False),
        sa.Column('font_weight', sa.String(length=10), nullable=False),
        sa.Column('show_border', sa.Boolean(), nullable=False),
        sa.Column('labels_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('saved_labels')
