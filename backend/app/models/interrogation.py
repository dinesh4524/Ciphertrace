import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class InterrogationReport(Base):
    """
    Interrogation Statement / Witness Deposition / Suspect Questioning Memo.
    """
    __tablename__ = "interrogation_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False, index=True)
    
    suspect_or_witness_name = Column(String(200), nullable=False, index=True)
    alias_names = Column(JSON, default=list)
    role_in_case = Column(String(100), default="SUSPECT") # SUSPECT, WITNESS, INFORMANT, CO-ACCUSED
    
    interrogating_officer = Column(String(200), nullable=True)
    interrogation_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    location = Column(String(200), nullable=True)
    
    key_admissions = Column(JSON, default=list) # Extracted lead statements
    raw_transcript = Column(Text, nullable=False)

    # Relationships
    evidence = relationship("EvidenceItem", back_populates="interrogation_reports")
