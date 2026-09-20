from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class InvestigativePriorityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class PriorityScoreFactors(BaseModel):
    evidence_strength: float = Field(..., ge=0.0, le=10.0, description="Volume and directness of current case evidence")
    temporal_correlation: float = Field(..., ge=0.0, le=10.0, description="Temporal burst synchronization and change-point intensity")
    network_relevance: float = Field(..., ge=0.0, le=10.0, description="Centrality, bridge status, and syndicate prominence")
    anomaly_score: float = Field(..., ge=0.0, le=10.0, description="Mule fan-in, smurfing dispersion, and clean-slate anomalies")
    corroboration_index: float = Field(..., ge=0.0, le=10.0, description="Multi-modal convergence (phone, money, geo, documents)")
    source_reliability: float = Field(..., ge=0.0, le=10.0, description="Cryptographic integrity and 65B/63 BSA certification")
    contradictory_penalty: float = Field(..., ge=0.0, le=10.0, description="Deduction for irreconcilable timeline or alibi conflicts")
    alternative_explanation_discount: float = Field(..., ge=0.0, le=10.0, description="Discount for plausible legitimate commercial explanations")
    uncertainty_penalty: float = Field(..., ge=0.0, le=10.0, description="Deduction for unverified nodes and information entropy")


class SupportingEvidenceItem(BaseModel):
    modality: str = Field(..., description="CDR, FINANCIAL, LOCATION, DOCUMENT, DIGITAL_FORENSICS, WITNESS")
    evidence_id: Optional[str] = None
    summary: str
    confidence_weight: float = Field(ge=0.0, le=1.0)


class ContradictoryEvidenceItem(BaseModel):
    modality: str
    evidence_id: Optional[str] = None
    conflict_reason: str
    severity: str = Field("MEDIUM", description="HIGH, MEDIUM, LOW")


class UncertaintyAnalysis(BaseModel):
    uncertainty_score: float = Field(..., ge=0.0, le=1.0)
    uncertainty_level: str = Field(..., description="HIGH, MEDIUM, LOW")
    key_entropy_drivers: List[str] = Field(default_factory=list)
    confidence_interval: Optional[str] = None


class NextBestAction(BaseModel):
    action_id: str
    rank: int
    title: str
    action_category: str = Field(..., description="STATUTORY_NOTICE_BNSS_91, FORENSIC_DEVICE_EXTRACTION, TOWER_DUMP_TRIANGULATION, SECTION_94_BNSS_SEARCH, TARGETED_INTERROGATION, UPI_AGGREGATOR_REQUISITION")
    expected_info_gain: float = Field(..., ge=0.0, le=1.0, description="Expected Information Gain (EIG) based on entropy reduction")
    hypotheses_resolved: List[str] = Field(default_factory=list)
    evidence_gaps_addressed: List[str] = Field(default_factory=list)
    statutory_mandate: str = Field(..., description="Applicable provision under BNSS 2023 or BSA 2023")
    operational_urgency: str = Field("HIGH_PRIORITY", description="IMMEDIATE, HIGH_PRIORITY, ROUTINE")
    target_entity: Optional[str] = None


class AssessInvestigativePriorityRequest(BaseModel):
    lead_title: Optional[str] = Field(None, description="Optional descriptive title for the lead")
    target_entity_name: Optional[str] = Field(None, description="Name or identifier of target entity to evaluate")
    target_entity_id: Optional[str] = Field(None, description="Entity ID if already known")
    include_next_best_actions: bool = Field(True, description="Whether to automatically compute ranked Next Best Actions")


class InvestigativePriorityAssessmentResponse(BaseModel):
    assessment_id: str
    case_id: str
    lead_title: str
    target_entity_name: Optional[str] = None
    priority_level: InvestigativePriorityLevel
    priority_score: float = Field(..., ge=0.0, le=100.0)
    score_factors: PriorityScoreFactors
    reasons: List[str] = Field(default_factory=list)
    supporting_evidence: List[SupportingEvidenceItem] = Field(default_factory=list)
    contradictory_evidence: List[ContradictoryEvidenceItem] = Field(default_factory=list)
    alternative_explanations: List[str] = Field(default_factory=list)
    uncertainty: UncertaintyAnalysis
    recommended_verification: List[str] = Field(default_factory=list)
    next_best_actions: List[NextBestAction] = Field(default_factory=list)
    created_at: datetime
    legal_statutory_notice: str = (
        "Statutory Notice (Section 63 BSA 2023 / BNSS 2023): Investigative priority ranking evaluates "
        "operational resource allocation and expected information gain. It does NOT constitute judicial determination of guilt."
    )


class PriorityAssessmentSummaryItem(BaseModel):
    id: str
    case_id: str
    lead_title: str
    target_entity_name: Optional[str] = None
    priority_level: str
    priority_score: float
    created_by_username: Optional[str] = None
    created_at: datetime
