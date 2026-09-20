"""Initial Evidence Fabric & Foundation Schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-17 14:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Cases Table
    op.create_table(
        'cases',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('case_number', sa.String(length=100), nullable=False, unique=True, index=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('crime_category', sa.String(length=100), nullable=False, server_default='ORGANIZED_CRIME', index=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE', index=True),
        sa.Column('lead_investigator_id', sa.String(length=100), nullable=True),
        sa.Column('investigating_agency', sa.String(length=200), nullable=True),
        sa.Column('police_station', sa.String(length=200), nullable=True),
        sa.Column('district', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('case_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )

    # 2. Evidence Items Table (Evidence Fabric with SHA-256)
    op.create_table(
        'evidence_items',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_type', sa.String(length=50), nullable=False, index=True),
        sa.Column('evidence_category', sa.String(length=50), nullable=False, server_default='CURRENT_CASE_OBSERVED', index=True),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_hash_sha256', sa.String(length=64), nullable=False, index=True),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('ingested_by_operator', sa.String(length=100), nullable=True),
        sa.Column('ingestion_timestamp', sa.DateTime(), nullable=False),
        sa.Column('integrity_status', sa.String(length=50), nullable=False, server_default='VERIFIED'),
        sa.Column('last_verified_at', sa.DateTime(), nullable=False),
        sa.Column('is_admissible', sa.Boolean(), server_default='1'),
        sa.Column('evidence_metadata', sa.JSON(), nullable=True)
    )

    # 3. CDR Records Table
    op.create_table(
        'cdr_records',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('evidence_id', sa.String(length=36), sa.ForeignKey('evidence_items.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('calling_number', sa.String(length=50), nullable=False, index=True),
        sa.Column('called_number', sa.String(length=50), nullable=False, index=True),
        sa.Column('imei', sa.String(length=50), nullable=True, index=True),
        sa.Column('imsi', sa.String(length=50), nullable=True, index=True),
        sa.Column('call_type', sa.String(length=50), nullable=False, server_default='VOICE_CALL'),
        sa.Column('start_time', sa.DateTime(), nullable=False, index=True),
        sa.Column('duration_sec', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('cell_tower_id', sa.String(length=100), nullable=True, index=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('provider', sa.String(length=100), nullable=True),
        sa.Column('raw_payload', sa.JSON(), nullable=True)
    )

    # 4. Financial Records Table
    op.create_table(
        'financial_records',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('evidence_id', sa.String(length=36), sa.ForeignKey('evidence_items.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('sender_account', sa.String(length=100), nullable=False, index=True),
        sa.Column('receiver_account', sa.String(length=100), nullable=False, index=True),
        sa.Column('sender_bank', sa.String(length=150), nullable=True),
        sa.Column('receiver_bank', sa.String(length=150), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False, index=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('txn_type', sa.String(length=50), nullable=False, server_default='NEFT/RTGS/IMPS'),
        sa.Column('utr_reference', sa.String(length=100), nullable=True, index=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False, index=True),
        sa.Column('channel', sa.String(length=100), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('raw_payload', sa.JSON(), nullable=True)
    )

    # 5. FIR Documents Table
    op.create_table(
        'fir_documents',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('evidence_id', sa.String(length=36), sa.ForeignKey('evidence_items.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('fir_number', sa.String(length=100), nullable=False, index=True),
        sa.Column('police_station', sa.String(length=200), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('sections_invoked', sa.JSON(), nullable=True),
        sa.Column('incident_date', sa.DateTime(), nullable=True),
        sa.Column('filing_date', sa.DateTime(), nullable=False),
        sa.Column('complainant_details', sa.JSON(), nullable=True),
        sa.Column('accused_named', sa.JSON(), nullable=True),
        sa.Column('informant_narrative', sa.Text(), nullable=True),
        sa.Column('raw_text', sa.Text(), nullable=False)
    )

    # 6. Interrogation Reports Table
    op.create_table(
        'interrogation_reports',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('evidence_id', sa.String(length=36), sa.ForeignKey('evidence_items.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('suspect_or_witness_name', sa.String(length=200), nullable=False, index=True),
        sa.Column('alias_names', sa.JSON(), nullable=True),
        sa.Column('role_in_case', sa.String(length=100), nullable=True, server_default='SUSPECT'),
        sa.Column('interrogating_officer', sa.String(length=200), nullable=True),
        sa.Column('interrogation_date', sa.DateTime(), nullable=False),
        sa.Column('location', sa.String(length=200), nullable=True),
        sa.Column('key_admissions', sa.JSON(), nullable=True),
        sa.Column('raw_transcript', sa.Text(), nullable=False)
    )

    # 7. Audit Logs Table (Immutable Section 65B/63 BSA Log)
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('case_id', sa.String(length=36), sa.ForeignKey('cases.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('operator_id', sa.String(length=100), nullable=False, index=True),
        sa.Column('operator_role', sa.String(length=50), nullable=True),
        sa.Column('action_type', sa.String(length=100), nullable=False, index=True),
        sa.Column('resource_type', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False, index=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('details_json', sa.JSON(), nullable=True),
        sa.Column('entry_hash_sha256', sa.String(length=64), nullable=True)
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('interrogation_reports')
    op.drop_table('fir_documents')
    op.drop_table('financial_records')
    op.drop_table('cdr_records')
    op.drop_table('evidence_items')
    op.drop_table('cases')
