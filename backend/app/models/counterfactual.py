import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text, Float
from sqlalchemy.orm import relationship

from app.core.database import Base


class AblationSimulationRun(Base):
    """
    Phase 14: Counterfactual & Evidence Ablation Simulation Experiment.
    Records hypothesis sensitivity tests, baseline vs ablated network topologies,
    fragility indices, and alternative explanations under Section 63 BSA 2023.
    """
    __tablename__ = "ablation_simulation_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)

    simulation_name = Column(String(255), nullable=False)
    hypothesis_statement = Column(Text, nullable=False)
    target_entity = Column(String(255), nullable=True, index=True)
    ablation_type = Column(String(50), nullable=False, default="FOUR_WAY_COMPARISON") # FOUR_WAY_COMPARISON, ENTITY_REMOVAL, RELATIONSHIP_REMOVAL, CUSTOM

    # Baseline metrics before ablation
    baseline_metrics = Column(JSON, nullable=False, default=dict)

    # Scenarios simulated (JSON list of AblatedScenarioResult)
    ablated_scenarios = Column(JSON, nullable=False, default=list)

    # Overall sensitivity summary (fragility score, SPOF, survival status)
    sensitivity_summary = Column(JSON, nullable=False, default=dict)

    overall_fragility_score = Column(Float, default=0.0)

    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_username = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    case = relationship("Case", backref="ablation_simulations")
