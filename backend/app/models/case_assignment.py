import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class CaseAssignment(Base):
    """
    Case-Level Access Control & Team Assignment Entity.
    Links Users (Investigators, Forensic Experts, Legal Analysts) to specific Cases.
    """
    __tablename__ = "case_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Role in this specific case: LEAD_INVESTIGATOR, ASSISTANT_IO, FORENSIC_LEAD, LEGAL_COUNSEL, INTELLIGENCE_OFFICER
    role_in_case = Column(String(50), default="ASSISTANT_IO", nullable=False)
    
    assigned_by_id = Column(String(36), nullable=True) # User ID of supervisor who assigned
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    can_write = Column(Boolean, default=True, nullable=False)
    can_export = Column(Boolean, default=True, nullable=False)

    # Relationships
    case = relationship("Case", back_populates="assignments")
    user = relationship("User", back_populates="case_assignments")

    __table_args__ = (
        UniqueConstraint("case_id", "user_id", name="uq_case_user_assignment"),
    )
