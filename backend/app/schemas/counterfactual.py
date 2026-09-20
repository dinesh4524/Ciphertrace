from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class AblationScenarioType(str, Enum):
    FULL_EVIDENCE = "FULL_EVIDENCE"
    WITHOUT_CDR = "WITHOUT_CDR"
    WITHOUT_LOCATION = "WITHOUT_LOCATION"
    WITHOUT_FINANCIAL = "WITHOUT_FINANCIAL"
    ENTITY_REMOVAL = "ENTITY_REMOVAL"
    RELATIONSHIP_REMOVAL = "RELATIONSHIP_REMOVAL"
    CUSTOM = "CUSTOM"


class HypothesisSurvivalStatus(str, Enum):
    ROBUST = "ROBUST"
    MODERATELY_DEGRADED = "MODERATELY_DEGRADED"
    HIGHLY_FRAGILE = "HIGHLY_FRAGILE"
    COLLAPSED = "COLLAPSED"


class ScenarioMetricDelta(BaseModel):
    node_count: int
    edge_count: int
    density: float
    components_count: int
    avg_clustering: float
    target_degree: Optional[int] = None
    target_betweenness: Optional[float] = None
    target_pagerank: Optional[float] = None

    delta_nodes: int = 0
    delta_edges: int = 0
    delta_density: float = 0.0
    delta_components: int = 0
    delta_target_degree: Optional[int] = None
    delta_target_betweenness: Optional[float] = None


class AblatedScenarioResult(BaseModel):
    scenario_type: AblationScenarioType
    scenario_name: str
    description: str
    excluded_elements_count: int
    excluded_categories: List[str] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)
    metric_deltas: ScenarioMetricDelta
    hypothesis_confidence: float = Field(ge=0.0, le=1.0)
    confidence_delta: float = 0.0
    alternative_explanations: List[str] = Field(default_factory=list)
    key_vulnerabilities: List[str] = Field(default_factory=list)
    survival_status: HypothesisSurvivalStatus


class SensitivityAnalysisSummary(BaseModel):
    baseline_confidence: float
    lowest_confidence_scenario: str
    max_confidence_drop: float
    overall_fragility_score: float = Field(ge=0.0, le=1.0, description="0.0 is completely robust, 1.0 is extremely fragile")
    single_points_of_failure: List[str] = Field(default_factory=list)
    survival_status: HypothesisSurvivalStatus
    synthesis_finding: str
    legal_statutory_disclaimer: str = (
        "Pursuant to Section 63 Bharatiya Sakshya Adhiniyam 2023 (BSA), counterfactual ablation is an analytical "
        "sensitivity test evaluating evidentiary dependence and hypothesis resilience. It does NOT establish guilt or criminal culpability."
    )


class ComparativeAblationRequest(BaseModel):
    hypothesis_statement: str = Field(..., min_length=5, description="Investigative hypothesis to test against counterfactual ablations")
    target_entity: Optional[str] = Field(None, description="Primary entity or person under hypothesis scrutiny (optional)")
    custom_scenarios: Optional[List[str]] = Field(default=None, description="Optional custom ablation categories")


class ComparativeAblationResponse(BaseModel):
    case_id: str
    simulation_id: str
    simulation_name: str
    hypothesis_statement: str
    target_entity: Optional[str] = None
    baseline_metrics: Dict[str, Any]
    scenarios: List[AblatedScenarioResult]
    sensitivity_summary: SensitivityAnalysisSummary
    created_at: datetime
    non_culpability_notice: str = (
        "STATUTORY SAFEGUARD: Counterfactual evidence ablation evaluates hypothesis sensitivity and network dependence. "
        "It measures evidentiary fragility, NOT criminal guilt or legal liability."
    )


class EntityRemovalSimulationRequest(BaseModel):
    hypothesis_statement: str = Field(..., min_length=5)
    entity_name: str = Field(..., min_length=1, description="Canonical name or ID of entity to simulate removal of")


class RelationshipRemovalSimulationRequest(BaseModel):
    hypothesis_statement: str = Field(..., min_length=5)
    source_entity: str = Field(..., min_length=1)
    target_entity: str = Field(..., min_length=1)
    relationship_type: Optional[str] = Field(None, description="Optional filter for relationship type e.g. CALLED, TRANSFERRED")


class SimulationHistoryItem(BaseModel):
    id: str
    case_id: str
    simulation_name: str
    hypothesis_statement: str
    target_entity: Optional[str] = None
    ablation_type: str
    overall_fragility_score: float
    survival_status: str
    created_by_username: Optional[str] = None
    created_at: datetime
