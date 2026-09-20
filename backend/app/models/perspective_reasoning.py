import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class PerspectiveAssessment(Base):
    """
    Phase 13: Multi-Perspective Reasoning & Consensus Synthesis Record.
    Maintains persistent structured balance sheets of investigative, forensic, legal,
    defence, innocent, and common-sense viewpoints under Section 63 BSA 2023.
    """
    __tablename__ = "perspective_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    target_entity_id = Column(String(100), nullable=True, index=True)
    target_entity_name = Column(String(255), nullable=True, index=True)
    hypothesis_statement = Column(Text, nullable=False)
    
    # Perspectives evaluated (JSON list of PerspectiveReport items)
    perspectives_data = Column(JSON, nullable=False, default=list)
    
    # Consensus Synthesis (JSON object of ConsensusSynthesis schema)
    consensus_synthesis = Column(JSON, nullable=False, default=dict)
    
    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_username = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    case = relationship("Case", backref="perspective_assessments")
