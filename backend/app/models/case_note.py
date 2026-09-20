import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class CaseNote(Base):
    """
    Investigator Case Management Ledger Note / Supervisory Directive.
    """
    __tablename__ = "case_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Types: GENERAL, FIELD_REPORT, HYPOTHESIS, SUPERVISORY_DIRECTIVE, LEGAL_OPINION, FORENSIC_MEMO
    note_type = Column(String(50), default="GENERAL", nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    case = relationship("Case", back_populates="notes")
    author = relationship("User", back_populates="case_notes")
