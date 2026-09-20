from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# Centrality & Key Player Schemas
class CentralityScore(BaseModel):
    node_id: str
    name: str
    label: str
    degree_centrality: float
    betweenness_centrality: float
    closeness_centrality: float
    pagerank: float
    eigenvector_centrality: float = 0.0
    local_clustering_coefficient: float = 0.0
    coreness: int = 0
    archetype: str # KINGPIN_INFLUENCER, COMMUNICATION_BROKER, OPERATIONAL_HUB, SYNDICATE_OPERATIVE, PERIPHERAL_ASSOCIATE
    justification: str
    composite_threat_score: float
    connections_count: int
    non_culpability_caveat: str = "Centrality indicates network topology flow, NOT criminal guilt or intent under Indian Evidence Law (BSA 2023)."


class KeyPlayerResponse(BaseModel):
    case_id: str
    total_analyzed_nodes: int
    top_kingpins: List[CentralityScore]
    top_brokers: List[CentralityScore]
    top_hubs: List[CentralityScore]
    all_players: List[CentralityScore]
    judicial_disclaimer: str = (
        "Judicial Warning: Centrality metrics are structural flow measures under Section 63 BSA 2023. "
        "They do NOT establish culpability or criminal conspiracy without corroborating primary evidence."
    )


# Community Detection Schemas
class CommunityMember(BaseModel):
    node_id: str
    name: str
    label: str
    internal_connections: int


class CommunityCluster(BaseModel):
    community_id: str
    name: str
    centroid_node_id: str
    centroid_name: str
    size: int
    internal_edges: int
    external_edges: int
    density: float
    members: List[CommunityMember]


class CommunityDetectionResponse(BaseModel):
    case_id: str
    total_communities: int
    modularity: float
    communities: List[CommunityCluster]


# Pathfinding Schemas
class PathfindingRequest(BaseModel):
    source_node_id: str = Field(..., description="Starting suspect or entity node ID")
    target_node_id: str = Field(..., description="Target mule or destination entity node ID")


class PathStep(BaseModel):
    step: int
    node_id: str
    name: str
    label: str


class PathfindingResponse(BaseModel):
    case_id: str
    found: bool
    source_node_id: str
    target_node_id: str
    hops: int
    total_weight: float
    composite_confidence: float
    path_nodes: List[PathStep]
    path_edges: List[Dict[str, Any]]


# Hidden-Link ML Schemas (Phase 7 Baseline & Phase 9 Advanced ML Engine)
class PredictedLink(BaseModel):
    source_id: str
    target_id: str
    source_name: str
    source_label: str
    target_name: str
    target_label: str
    predicted_relation: str = "ASSOCIATED_WITH"
    probability: float
    adamic_adar_score: float
    jaccard_coefficient: float
    common_neighbors_count: int
    common_neighbor_names: List[str]
    reason: str


class HiddenLinkPredictionResponse(BaseModel):
    case_id: str
    total_predicted_links: int
    min_probability_threshold: float
    predictions: List[PredictedLink]


class LinkReviewRequest(BaseModel):
    source_id: str
    target_id: str
    decision: str = Field(..., description="ACCEPTED or DISMISSED")
    justification_reason: str = Field(..., min_length=5, description="Mandatory investigative justification for Section 63 BSA audit")
    relationship_type: str = "ASSOCIATED_WITH"


# Phase 9 Advanced Schemas
class HeterogeneousCandidateLink(BaseModel):
    source_id: str
    source_name: str
    source_type: str
    target_id: str
    target_name: str
    target_type: str
    predicted_relationship: str = "ASSOCIATED_WITH"


class BaselineAlgorithmicScores(BaseModel):
    common_neighbours_count: int
    common_neighbour_names: List[str]
    jaccard_coefficient: float
    adamic_adar_score: float
    preferential_attachment: int
    resource_allocation: float
    shortest_path_hops: int


class GraphSignalItem(BaseModel):
    signal_code: str
    weight: float
    description: str


class EvidencePathItem(BaseModel):
    hops: int
    path_nodes: List[Dict[str, Any]]
    summary: str


class HiddenLinkMLPrediction(BaseModel):
    candidate_link: HeterogeneousCandidateLink
    confidence: float
    ml_probability: float
    prediction_status: str = "PREDICTED"  # PREDICTED, UNDER_INVESTIGATION, ACCEPTED_AS_HYPOTHESIS, REJECTED, CHALLENGED
    baseline_scores: BaselineAlgorithmicScores
    supporting_graph_signals: List[GraphSignalItem]
    contradictory_signals: List[GraphSignalItem]
    evidence_paths: List[EvidencePathItem]
    judicial_notice: str = (
        "Investigative Lead Hypothesis under Section 63 BSA 2023: "
        "This predicted link must NOT be admitted as confirmed evidence without primary forensic corroboration."
    )


class HiddenLinkMLResponse(BaseModel):
    case_id: str
    total_predicted_links: int
    min_confidence_threshold: float
    model_name: str
    predictions: List[HiddenLinkMLPrediction]
    judicial_warning: str = (
        "Section 63 Bharatiya Sakshya Adhiniyam 2023 Notice: "
        "All predicted links are non-binding investigative hypotheses. "
        "Automatic conversion into verified relationships is strictly prohibited by law."
    )


class ReviewPredictionRequest(BaseModel):
    source_id: str
    target_id: str
    decision: str = Field(..., description="ACCEPTED_AS_HYPOTHESIS, REJECTED, or CHALLENGED")
    justification_reason: str = Field(..., min_length=5, description="Statutory justification rationale for Section 63 BSA audit trail")
    investigator_badge: str = Field(..., min_length=2, description="Officer badge number executing review")
    relationship_type: Optional[str] = "INFERRED_ASSOCIATION"



# Anomaly Schemas
class GraphAnomalyItem(BaseModel):
    anomaly_type: str # CRITICAL_BRIDGE, FAN_IN_AGGREGATION, FAN_OUT_DISPERSION
    severity: str # CRITICAL, HIGH, MEDIUM, LOW
    entity_id: str
    entity_name: str
    entity_label: str
    description: str
    associated_nodes: List[str]


class GraphAnomaliesResponse(BaseModel):
    case_id: str
    total_anomalies: int
    anomalies: List[GraphAnomalyItem]


# k-Core Schemas
class KCoreMember(BaseModel):
    node_id: str
    name: str
    label: str
    degree: int


class KCoreShell(BaseModel):
    k: int
    shell_name: str
    member_count: int
    members: List[KCoreMember]


class KCoreResponse(BaseModel):
    case_id: str
    max_core: int
    total_shells: int
    shells: List[KCoreShell]
    node_coreness: Dict[str, int]
    judicial_disclaimer: str = (
        "Judicial Warning: k-Core shells identify dense graph subgraph embedding. "
        "High coreness does NOT establish culpability or intent without corroborating evidentiary facts."
    )


# Structural Overview Schemas
class StructuralOverviewResponse(BaseModel):
    case_id: str
    total_nodes: int
    total_edges: int
    density: float
    average_degree: float
    connected_components_count: int
    largest_component_size: int
    diameter: int
    average_path_length: float
    transitivity: float
    average_clustering: float
    critical_bridges_count: int
    judicial_non_culpability_caveat: str


# Metrics Glossary Schemas
class MetricGlossaryItem(BaseModel):
    metric_id: str
    name: str
    formula: str
    investigative_meaning: str
    benign_alternative_explanation: str
    judicial_non_culpability_statement: str


class MetricGlossaryResponse(BaseModel):
    total_metrics: int
    glossary: List[MetricGlossaryItem]
    overarching_judicial_doctrine: str = (
        "Section 63 Bharatiya Sakshya Adhiniyam (BSA) 2023 & Section 65B Indian Evidence Act Doctrine: "
        "Network metrics and graph topology are mathematical heuristics to assist investigators in lead generation. "
        "Topological centrality does NOT equal guilt, criminal mens rea, or co-conspiracy."
    )


# Phase 10: Temporal Intelligence & Anomaly Schemas
class TimelineEventItem(BaseModel):
    event_id: str
    timestamp: str
    event_type: str
    actor_entity: str
    target_entity: str
    duration_sec: Optional[int] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    channel_or_location: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    evidence_id: Optional[str] = None
    summary: str
    confidence: float = 1.0


class CommunicationBurstItem(BaseModel):
    burst_type: str = "COMMUNICATION_BURST"
    entity_1: str
    entity_2: str
    window_start: str
    window_end: str
    call_count: int
    expected_count: float
    z_score: float
    severity: str
    description: str


class TransactionBurstItem(BaseModel):
    burst_type: str = "TRANSACTION_BURST"
    target_account: str
    senders_count: int
    senders_sample: List[str]
    window_start: str
    window_end: str
    transaction_count: int
    total_volume_inr: float
    velocity_per_hour: float
    channels: List[str]
    severity: str
    description: str


class LocationAnomalyItem(BaseModel):
    anomaly_type: str
    entity_phone: str
    origin_tower: Optional[str] = None
    destination_tower: Optional[str] = None
    origin_time: Optional[str] = None
    destination_time: Optional[str] = None
    distance_km: Optional[float] = None
    time_delta_min: Optional[float] = None
    calculated_speed_kmh: Optional[float] = None
    pings_count: Optional[int] = None
    sample_times: Optional[List[str]] = None
    towers: Optional[List[str]] = None
    severity: str
    description: str


class RelationshipEmergenceItem(BaseModel):
    entity_1: str
    entity_2: str
    first_seen: str
    last_seen: str
    active_duration_days: int
    total_interactions: int
    max_dormancy_gap_days: int
    emergence_status: str # RAPID_EMERGENCE, ESTABLISHED_PERSISTENT, REACTIVATED_DORMANT
    description: str


class CleanSlateAnomalyItem(BaseModel):
    entity_identifier: str
    has_historical_criminal_record: bool = False
    historical_convictions_count: int = 0
    current_case_anomaly_score: float
    current_case_events_count: int
    current_case_financial_volume: float
    risk_archetype: str # RECRUITED_MULE_ACCOUNT_HOLDER, BURNER_SIM_PROXY, LATENT_SYNDICATE_CUTOUT
    evidentiary_rationale: str
    statutory_safeguard: str = (
        "Section 63 Bharatiya Sakshya Adhiniyam 2023 Compliance: "
        "Absence of a prior criminal record does not immunize current evidentiary culpability. "
        "Clean-slate status is an investigative lead hypothesis requiring forensic corroboration."
    )


class TemporalIntelligenceResponse(BaseModel):
    case_id: str
    total_events: int
    timeline: List[TimelineEventItem]
    communication_bursts: List[CommunicationBurstItem]
    transaction_bursts: List[TransactionBurstItem]
    location_anomalies: List[LocationAnomalyItem]
    relationship_emergence: List[RelationshipEmergenceItem]
    clean_slate_anomalies: List[CleanSlateAnomalyItem]
    judicial_disclaimer: str = (
        "Judicial Warning under Section 63 BSA 2023: "
        "Temporal sequence analysis and burst detections are mathematical investigative indicators. "
        "Clean-slate hypotheses identify recruited mules/cut-outs and require primary forensic corroboration."
    )


