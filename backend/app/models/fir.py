import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class FIRDocument(Base):
    """
    First Information Report (FIR) / Formal Police Complaint Record.
    Preserves statutory sections (BNS/IPC/IT Act), complainant details, and incident narratives.
    """
    __tablename__ = "fir_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False, index=True)
    
    fir_number = Column(String(100), nullable=False, index=True)
    police_station = Column(String(200), nullable=False)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    
    sections_invoked = Column(JSON, default=list) # e.g. ["BNS 318(4)", "BNS 111", "IT Act 66D"]
    incident_date = Column(DateTime, nullable=True)
    filing_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    complainant_details = Column(JSON, default=dict)
    accused_named = Column(JSON, default=list)
    informant_narrative = Column(Text, nullable=True)
    raw_text = Column(Text, nullable=False)

    # Relationships
    evidence = relationship("EvidenceItem", back_populates="fir_documents")
