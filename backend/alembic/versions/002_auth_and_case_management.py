"""Auth, RBAC, Case Assignments and Case Notes Schema

Revision ID: 002_auth_case_mgmt
Revises: 001_initial_schema
Create Date: 2026-09-17 14:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_auth_case_mgmt'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('username', sa.String(length=50), nullable=False, unique=True, index=True),
        sa.Column('email', sa.String(length=100), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='INVESTIGATOR', index=True),
        sa.Column('badge_number', sa.String(length=50), nullable=True, unique=True, index=True),
        sa.Column('department', sa.String(length=150), nullable=True),
        sa.Column('designation', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('is_superuser', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )

    # 2. Case Assignments Table (Case-Level Access Control & Team)
    op.create_table(
        'case_assignments',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('role_in_case', sa.String(length=50), nullable=False, server_default='ASSISTANT_IO'),
        sa.Column('assigned_by_id', sa.String(length=36), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=False),
        sa.Column('can_write', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('can_export', sa.Boolean(), nullable=False, server_default='1'),
        sa.UniqueConstraint('case_id', 'user_id', name='uq_case_user_assignment')
    )

    # 3. Case Notes & Supervisory Directives Table
    op.create_table(
        'case_notes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('author_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('note_type', sa.String(length=50), nullable=False, server_default='GENERAL', index=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )


def downgrade() -> None:
    op.drop_table('case_notes')
    op.drop_table('case_assignments')
    op.drop_table('users')
