"""NLP Entities, Grounded Relationships and Evidence Provenance Schema

Revision ID: 003_nlp_and_evidence
Revises: 002_auth_case_mgmt
Create Date: 2026-09-17 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_nlp_and_evidence'
down_revision: Union[str, None] = '002_auth_case_mgmt'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update evidence_items with provenance and text extraction columns
    with op.batch_alter_table('evidence_items') as batch_op:
        batch_op.add_column(sa.Column('evidence_code', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('seizing_officer', sa.String(length=150), nullable=True))
        batch_op.add_column(sa.Column('place_of_seizure', sa.String(length=250), nullable=True))
        batch_op.add_column(sa.Column('witness_details', sa.String(length=250), nullable=True))
        batch_op.add_column(sa.Column('forensic_extraction_tool', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('device_serial_or_imei', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('evidence_status', sa.String(length=50), nullable=False, server_default='VERIFIED'))
        batch_op.add_column(sa.Column('extracted_text_content', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('provenance_metadata', sa.JSON(), nullable=True))
        batch_op.create_index('ix_evidence_items_evidence_code', ['evidence_code'], unique=True)

    # 2. Extracted Entities Table
    op.create_table(
        'extracted_entities',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('evidence_id', sa.String(length=36), sa.ForeignKey('evidence_items.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('entity_type', sa.String(length=50), nullable=False, index=True),
        sa.Column('raw_value', sa.String(length=500), nullable=False),
        sa.Column('normalized_value', sa.String(length=500), nullable=False, index=True),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('char_start', sa.Integer(), nullable=True),
        sa.Column('char_end', sa.Integer(), nullable=True),
        sa.Column('context_snippet', sa.Text(), nullable=True),
        sa.Column('extraction_method', sa.String(length=50), nullable=False, server_default='HYBRID_REGEX_NER'),
        sa.Column('entity_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )

    # 3. Extracted Relationships Table
    op.create_table(
        'extracted_relationships',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('evidence_id', sa.String(length=36), sa.ForeignKey('evidence_items.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_entity_id', sa.String(length=36), sa.ForeignKey('extracted_entities.id', ondelete='CASCADE'), nullable=True),
        sa.Column('target_entity_id', sa.String(length=36), sa.ForeignKey('extracted_entities.id', ondelete='CASCADE'), nullable=True),
        sa.Column('source_value', sa.String(length=500), nullable=False, index=True),
        sa.Column('target_value', sa.String(length=500), nullable=False, index=True),
        sa.Column('relationship_type', sa.String(length=100), nullable=False, index=True),
        sa.Column('relationship_nature', sa.String(length=50), nullable=False, server_default='OBSERVED'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('context_snippet', sa.Text(), nullable=True),
        sa.Column('extraction_method', sa.String(length=50), nullable=False, server_default='HYBRID_RELATION_EXTRACTOR'),
        sa.Column('relationship_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )


def downgrade() -> None:
    op.drop_table('extracted_relationships')
    op.drop_table('extracted_entities')
    with op.batch_alter_table('evidence_items') as batch_op:
        batch_op.drop_index('ix_evidence_items_evidence_code')
        batch_op.drop_column('provenance_metadata')
        batch_op.drop_column('extracted_text_content')
        batch_op.drop_column('evidence_status')
        batch_op.drop_column('device_serial_or_imei')
        batch_op.drop_column('forensic_extraction_tool')
        batch_op.drop_column('witness_details')
        batch_op.drop_column('place_of_seizure')
        batch_op.drop_column('seizing_officer')
        batch_op.drop_column('evidence_code')
