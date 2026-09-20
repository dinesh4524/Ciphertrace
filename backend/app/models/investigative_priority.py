import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text, Float
from sqlalchemy.orm import relationship

from app.core.database import Base


class InvestigativePriorityAssessment(Base):
    """
    Phase 15: Investigative Priority Assessment & Next Best Action Record.
    Records 9-factor multi-attribute priority scores, supporting vs contradictory evidence,
    uncertainty analysis, alternative explanations, and ranked Next Best Actions (EIG).
    """
    __tablename__ = "investigative_priority_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)

    lead_title = Column(String(255), nullable=False)
    target_entity_name = Column(String(255), nullable=True, index=True)
    target_entity_id = Column(String(36), nullable=True)

    # Priority Level: CRITICAL, HIGH, MEDIUM, LOW
    priority_level = Column(String(50), nullable=False, index=True)
    priority_score = Column(Float, nullable=False, default=0.0) # 0.0 - 100.0

    # 9-Factor breakdown (current evidence, temporal, network, anomaly, corroboration,
    # reliability, contradictory penalty, alternative explanation discount, uncertainty)
    score_factors = Column(JSON, nullable=False, default=dict)

    # Reasons justifying the priority score
    reasons = Column(JSON, nullable=False, default=list)

    # Multi-modal supporting evidence items
    supporting_evidence = Column(JSON, nullable=False, default=list)

    # Contradictory evidence items or conflicting indications
    contradictory_evidence = Column(JSON, nullable=False, default=list)

    # Alternative innocent/benign explanations
    alternative_explanations = Column(JSON, nullable=False, default=list)

    # Uncertainty analysis (entropy score, drivers)
    uncertainty_analysis = Column(JSON, nullable=False, default=dict)

    # Recommended verifications to validate or refute
    recommended_verifications = Column(JSON, nullable=False, default=list)

    # Ranked Next Best Actions based on Expected Information Gain (EIG)
    next_best_actions = Column(JSON, nullable=False, default=list)

    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_username = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    case = relationship("Case", backref="priority_assessments")
