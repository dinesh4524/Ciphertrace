import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class CanonicalEntity(Base):
    """
    Consolidated Real-World Identity established through verified Entity Resolution.
    Groups multiple raw ExtractedEntity records across cases and evidence files.
    """
    __tablename__ = "canonical_entities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    canonical_code = Column(String(100), unique=True, index=True, nullable=False) # e.g. CANON-PERS-0001
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Types: PERSON, PHONE_NUMBER, DEVICE, FINANCIAL_ACCOUNT, VEHICLE, LOCATION, ORGANIZATION
    entity_type = Column(String(50), nullable=False, index=True)
    canonical_name = Column(String(500), nullable=False, index=True)
    
    # Aggregated profile data
    aliases = Column(JSON, default=list)
    phone_numbers = Column(JSON, default=list)
    devices = Column(JSON, default=list)
    accounts = Column(JSON, default=list)
    locations = Column(JSON, default=list)
    entity_metadata = Column(JSON, default=dict)
    
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    case = relationship("Case")
    members = relationship("CanonicalEntityMember", back_populates="canonical_entity", cascade="all, delete-orphan")


class CanonicalEntityMember(Base):
    """
    Links an extracted entity record to its resolved Canonical Entity.
    """
    __tablename__ = "canonical_entity_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    canonical_id = Column(String(36), ForeignKey("canonical_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    extracted_entity_id = Column(String(36), ForeignKey("extracted_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    association_confidence = Column(Float, default=1.0, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    added_by_user_id = Column(String(36), nullable=True)
    decision_reason = Column(Text, nullable=True)

    # Relationships
    canonical_entity = relationship("CanonicalEntity", back_populates="members")
    extracted_entity = relationship("ExtractedEntity")


class EntityResolutionCandidate(Base):
    """
    AI-Proposed match between two entities requiring human investigator verification.
    STRICT POLICY: Uncertain matches are NEVER silently merged.
    """
    __tablename__ = "entity_resolution_candidates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    source_entity_id = Column(String(36), ForeignKey("extracted_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    target_entity_id = Column(String(36), ForeignKey("extracted_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    source_value = Column(String(500), nullable=False)
    target_value = Column(String(500), nullable=False)
    entity_type = Column(String(50), nullable=False, index=True)
    
    # Match Type: PERSON_ALIAS, PHONETIC_FUZZY, INITIALS_EXPANSION, MULTILINGUAL_TRANSLIT, PHONE_EXACT, DEVICE_HARDWARE, FINANCIAL_MULE
    match_type = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=False, index=True) # 0.0 to 1.0
    
    # Granular feature scores (e.g. {"name_similarity": 0.92, "alias_match": 1.0, "phonetic_score": 0.95, "context_overlap": 0.80})
    feature_scores = Column(JSON, default=dict)
    
    # Human-in-the-Loop Status: PENDING_REVIEW, ACCEPTED, REJECTED, CHALLENGED
    review_status = Column(String(50), default="PENDING_REVIEW", nullable=False, index=True)
    
    # Decision Audit & Reason
    reviewed_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewer_username = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    decision_reason = Column(Text, nullable=True) # Required rationale recorded for Section 65B/63 BSA audit
    
    # Merge Directive: MERGE_AS_CANONICAL, LINK_AS_ASSOCIATE, KEEP_SEPARATE
    merge_directive = Column(String(50), default="MERGE_AS_CANONICAL", nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    case = relationship("Case")
    source_entity = relationship("ExtractedEntity", foreign_keys=[source_entity_id])
    target_entity = relationship("ExtractedEntity", foreign_keys=[target_entity_id])
