import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class ExtractedRelationship(Base):
    """
    Extracted Relationship between two entities extracted from an Evidence artifact.
    Forms the baseline for Phase 5 Temporal Knowledge Graphs and hidden link analytics.
    """
    __tablename__ = "extracted_relationships"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    source_entity_id = Column(String(36), ForeignKey("extracted_entities.id", ondelete="CASCADE"), nullable=True)
    target_entity_id = Column(String(36), ForeignKey("extracted_entities.id", ondelete="CASCADE"), nullable=True)
    
    source_value = Column(String(500), nullable=False, index=True)
    target_value = Column(String(500), nullable=False, index=True)
    
    # Relationship Types:
    # CALLS_TO, TRANSFERS_FUNDS_TO, ASSOCIATED_WITH, CO_ACCUSED_WITH,
    # OPERATES_ACCOUNT, USES_DEVICE, LOCATED_AT, ALIAS_OF, CHARGED_UNDER
    relationship_type = Column(String(100), nullable=False, index=True)
    
    # Classification: OBSERVED (directly recorded), INFERRED (deduced by rule), CONTESTED
    relationship_nature = Column(String(50), default="OBSERVED", nullable=False)
    
    confidence = Column(Float, default=1.0, nullable=False)
    context_snippet = Column(Text, nullable=True)
    extraction_method = Column(String(50), default="HYBRID_RELATION_EXTRACTOR")
    relationship_metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    evidence = relationship("EvidenceItem", back_populates="extracted_relationships")
    case = relationship("Case")
    source_entity = relationship("ExtractedEntity", foreign_keys=[source_entity_id])
    target_entity = relationship("ExtractedEntity", foreign_keys=[target_entity_id])
