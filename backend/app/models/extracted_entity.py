import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class ExtractedEntity(Base):
    """
    Extracted Named Entity anchored to an Evidence artifact.
    Preserves character offsets (char_start, char_end) for grounding and audit verification.
    """
    __tablename__ = "extracted_entities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Types: PERSON, PHONE_NUMBER, ORGANIZATION, LOCATION, VEHICLE, DEVICE, FINANCIAL_ACCOUNT, DATE, TIME, EVENT, LEGAL_SECTION
    entity_type = Column(String(50), nullable=False, index=True)
    raw_value = Column(String(500), nullable=False)
    normalized_value = Column(String(500), nullable=False, index=True)
    
    confidence = Column(Float, default=1.0, nullable=False)
    char_start = Column(Integer, nullable=True)
    char_end = Column(Integer, nullable=True)
    
    context_snippet = Column(Text, nullable=True)
    extraction_method = Column(String(50), default="HYBRID_REGEX_NER") # REGEX, NER_PATTERN, HEURISTIC, LLM
    entity_metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    evidence = relationship("EvidenceItem", back_populates="extracted_entities")
    case = relationship("Case")
