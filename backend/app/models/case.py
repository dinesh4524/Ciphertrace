import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Case(Base):
    """
    Core Case Entity representing an active or archived criminal investigation.
    Enhanced in Phase 2 with Priority, Stage Workflow, Confidentiality, and Team Assignments.
    """
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_number = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    crime_category = Column(String(100), index=True, nullable=False, default="ORGANIZED_CRIME")
    
    # Status: DRAFT, ACTIVE_INVESTIGATION, UNDER_REVIEW, CHARGESHEETED, CLOSED, ARCHIVED
    status = Column(String(50), default="ACTIVE_INVESTIGATION", index=True, nullable=False)
    
    # Priority: CRITICAL, HIGH, MEDIUM, LOW
    priority = Column(String(20), default="HIGH", index=True, nullable=False)
    
    # Investigation Stage / Progression
    stage = Column(String(50), default="EVIDENCE_COLLECTION", nullable=False)
    
    # Confidentiality & Access Restriction Flag
    is_confidential = Column(Boolean, default=False, nullable=False)
    
    lead_investigator_id = Column(String(100), nullable=True) # Text badge / IO ID
    assigned_lead_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    investigating_agency = Column(String(200), default="State Police CID / Cyber Crime Unit")
    police_station = Column(String(200), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    
    tags = Column(JSON, default=list)
    case_metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    evidence_items = relationship("EvidenceItem", back_populates="case", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="case", cascade="all, delete-orphan")
    assignments = relationship("CaseAssignment", back_populates="case", cascade="all, delete-orphan")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")
