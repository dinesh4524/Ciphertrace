import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, JSON, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class EvidenceItem(Base):
    """
    Evidence Fabric core entity maintaining cryptographic chain of custody.
    Enhanced in Phase 3 & 4 with Provenance Metadata, PDF Text Cache, and Extracted Entities & Relationships.
    """
    __tablename__ = "evidence_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evidence_code = Column(String(100), unique=True, index=True, nullable=True) # e.g. EVID-2026-0042
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    source_type = Column(String(50), nullable=False, index=True) # CDR, FINANCIAL, FIR, INTERROGATION, DIGITAL_FORENSICS, OSINT, PDF_DOCUMENT
    evidence_category = Column(String(50), default="CURRENT_CASE_OBSERVED", nullable=False, index=True)
    
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=True)
    file_hash_sha256 = Column(String(64), nullable=False, index=True)
    mime_type = Column(String(100), default="application/octet-stream")
    file_size_bytes = Column(Integer, default=0)
    
    # Provenance details (Section 65B/63 BSA chain of custody)
    seizing_officer = Column(String(150), nullable=True)
    place_of_seizure = Column(String(250), nullable=True)
    witness_details = Column(String(250), nullable=True)
    forensic_extraction_tool = Column(String(100), nullable=True) # Cellebrite UFED, Oxygen, EnCase, Manual
    device_serial_or_imei = Column(String(100), nullable=True)
    
    ingested_by_operator = Column(String(100), default="IO_OPERATOR_01")
    ingestion_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Status: INTAKE_PENDING, VERIFIED, PROCESSED_BY_NLP, CHALLENGED_IN_COURT, INADMISSIBLE
    integrity_status = Column(String(50), default="VERIFIED", nullable=False)
    evidence_status = Column(String(50), default="VERIFIED", nullable=False)
    last_verified_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_admissible = Column(Boolean, default=True)
    
    # Cached extracted raw text for fast NLP indexing & search
    extracted_text_content = Column(Text, nullable=True)
    
    evidence_metadata = Column(JSON, default=dict)
    provenance_metadata = Column(JSON, default=dict)
    
    # Relationships
    case = relationship("Case", back_populates="evidence_items")
    cdr_records = relationship("CDRRecord", back_populates="evidence", cascade="all, delete-orphan")
    financial_records = relationship("FinancialRecord", back_populates="evidence", cascade="all, delete-orphan")
    fir_documents = relationship("FIRDocument", back_populates="evidence", cascade="all, delete-orphan")
    interrogation_reports = relationship("InterrogationReport", back_populates="evidence", cascade="all, delete-orphan")
    extracted_entities = relationship("ExtractedEntity", back_populates="evidence", cascade="all, delete-orphan")
    extracted_relationships = relationship("ExtractedRelationship", back_populates="evidence", cascade="all, delete-orphan")
