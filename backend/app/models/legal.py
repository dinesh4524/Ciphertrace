import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text, Boolean, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class LegalStatute(Base):
    """
    Authoritative legal statute entity: BNS 2023, BNSS 2023, BSA 2023.
    Includes enactment details, versioning, and gazette metadata.
    """
    __tablename__ = "legal_statutes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, index=True, nullable=False) # BNS, BNSS, BSA
    title = Column(String(255), nullable=False)
    enactment_year = Column(Integer, default=2023, nullable=False)
    effective_date = Column(String(50), default="2024-07-01", nullable=False)
    version = Column(String(50), default="2023.1", nullable=False)
    statute_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    sections = relationship("LegalSection", back_populates="statute", cascade="all, delete-orphan")


class LegalSection(Base):
    """
    Specific statutory provision/section with legal ingredients, conditions,
    punishment/procedural powers, and legacy IPC/CrPC/IEA concordance.
    """
    __tablename__ = "legal_sections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    statute_id = Column(String(36), ForeignKey("legal_statutes.id", ondelete="CASCADE"), nullable=False, index=True)
    statute_code = Column(String(50), index=True, nullable=False) # Denormalized for fast lookups

    section_number = Column(String(50), index=True, nullable=False) # e.g. "111", "318", "63", "91"
    section_title = Column(String(255), nullable=False)
    chapter = Column(String(100), nullable=True)

    # Classification: OFFENSE, PROCEDURE, EVIDENCE_RULE
    category = Column(String(50), default="OFFENSE", nullable=False)
    offense_type = Column(String(50), default="COGNIZABLE", nullable=True) # COGNIZABLE, NON_COGNIZABLE, PROCEDURAL
    bailable = Column(Boolean, default=False, nullable=True)
    compoundable = Column(Boolean, default=False, nullable=True)

    punishment_text = Column(Text, nullable=True)
    full_text = Column(Text, nullable=False)

    # Structured list of essential conditions / statutory ingredients
    conditions = Column(JSON, default=list, nullable=False)

    # Legacy code mapping: {"act": "IPC", "section": "420"}
    legacy_code_mapping = Column(JSON, default=dict, nullable=False)

    version = Column(String(50), default="2023.1", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    statute = relationship("LegalStatute", back_populates="sections")


class EvidenceToLawMapping(Base):
    """
    Evidence-to-Law mapping connecting case evidence items to specific statutory conditions.
    Follows: LAW -> PROVISION -> CONDITION -> AVAILABLE EVIDENCE -> RELEVANCE -> MISSING INFORMATION -> VERIFICATION.
    """
    __tablename__ = "evidence_to_law_mappings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(String(36), ForeignKey("legal_sections.id", ondelete="CASCADE"), nullable=False, index=True)

    statute_code = Column(String(50), nullable=False)
    section_number = Column(String(50), nullable=False)
    condition_text = Column(Text, nullable=False)

    # Status: MET, PARTIALLY_MET, UNMET, CONTESTED
    compliance_status = Column(String(50), default="UNMET", nullable=False)
    available_evidence_summary = Column(Text, nullable=True)
    relevance_justification = Column(Text, nullable=True)
    missing_information = Column(Text, nullable=True)
    recommended_verification = Column(Text, nullable=True)

    evidence_item_ids = Column(JSON, default=list) # Linked evidence IDs
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("Case")
    section = relationship("LegalSection")
