"""Entity Resolution, Canonical Entities, and Candidates Schema

Revision ID: 004_entity_resolution
Revises: 003_nlp_and_evidence
Create Date: 2026-09-17 14:43:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '004_entity_resolution'
down_revision: Union[str, None] = '003_nlp_and_evidence'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Canonical Entities Table
    op.create_table(
        'canonical_entities',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('canonical_code', sa.String(length=100), nullable=False, unique=True, index=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('entity_type', sa.String(length=50), nullable=False, index=True),
        sa.Column('canonical_name', sa.String(length=500), nullable=False, index=True),
        sa.Column('aliases', sa.JSON(), nullable=True),
        sa.Column('phone_numbers', sa.JSON(), nullable=True),
        sa.Column('devices', sa.JSON(), nullable=True),
        sa.Column('accounts', sa.JSON(), nullable=True),
        sa.Column('locations', sa.JSON(), nullable=True),
        sa.Column('entity_metadata', sa.JSON(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('verified_by_user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )

    # 2. Canonical Entity Members Table
    op.create_table(
        'canonical_entity_members',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('canonical_id', sa.String(length=36), sa.ForeignKey('canonical_entities.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('extracted_entity_id', sa.String(length=36), sa.ForeignKey('extracted_entities.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('association_confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('added_at', sa.DateTime(), nullable=False),
        sa.Column('added_by_user_id', sa.String(length=36), nullable=True),
        sa.Column('decision_reason', sa.Text(), nullable=True)
    )

    # 3. Entity Resolution Candidates Table
    op.create_table(
        'entity_resolution_candidates',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_entity_id', sa.String(length=36), sa.ForeignKey('extracted_entities.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('target_entity_id', sa.String(length=36), sa.ForeignKey('extracted_entities.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_value', sa.String(length=500), nullable=False),
        sa.Column('target_value', sa.String(length=500), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False, index=True),
        sa.Column('match_type', sa.String(length=100), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False, index=True),
        sa.Column('feature_scores', sa.JSON(), nullable=True),
        sa.Column('review_status', sa.String(length=50), nullable=False, server_default='PENDING_REVIEW', index=True),
        sa.Column('reviewed_by_user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewer_username', sa.String(length=100), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('decision_reason', sa.Text(), nullable=True),
        sa.Column('merge_directive', sa.String(length=50), nullable=False, server_default='MERGE_AS_CANONICAL'),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )


def downgrade() -> None:
    op.drop_table('entity_resolution_candidates')
    op.drop_table('canonical_entity_members')
    op.drop_table('canonical_entities')
