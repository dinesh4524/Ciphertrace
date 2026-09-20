from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PerspectiveType(str, Enum):
    INVESTIGATOR = "INVESTIGATOR"
    FORENSIC = "FORENSIC"
    LEGAL = "LEGAL"
    DEFENCE_ALTERNATIVE = "DEFENCE_ALTERNATIVE"
    SUSPECT_INNOCENT = "SUSPECT_INNOCENT"
    COMMON_SENSE = "COMMON_SENSE"


class PerspectiveFinding(BaseModel):
    point: str
    evidence_anchor: Optional[str] = None
    category: str = "OBSERVATION"  # OBSERVATION, GAP, CORROBORATION, BENIGN_INTERPRETATION, STATUTORY_RISK
    weight: str = "MODERATE"  # HIGH, MODERATE, LOW


class PerspectiveReport(BaseModel):
    """
    Structured viewpoint report generated under strict non-culpability guardrails.
    Prohibited from independently declaring guilt.
    """
    perspective: PerspectiveType
    title: str
    summary: str
    arguments: List[str] = Field(default_factory=list)
    supporting_points: List[str] = Field(default_factory=list)
    concerns_or_limitations: List[str] = Field(default_factory=list)
    certainty_level: str = "MODERATE"  # HIGH, MODERATE, LOW, HIGHLY_UNCERTAIN
    non_culpability_statement: str = (
        "Statutory Notice: This perspective offers structured investigative analysis only. "
        "It does not establish criminal culpability or guilt under Section 63 BSA 2023."
    )


class ConsensusSynthesis(BaseModel):
    """
    Consensus / synthesis engine output combining all 6 reasoning perspectives.
    """
    target_entity_name: Optional[str] = None
    hypothesis: str
    supporting_evidence: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Corroborated evidence items and verified connections supporting the investigative hypothesis"
    )
    contradictory_evidence: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Inconsistencies, conflicting timestamps, alibi points, and contradictions"
    )
    alternative_explanations: List[str] = Field(
        default_factory=list,
        description="Plausible non-criminal alternative explanations accounting for the observed facts"
    )
    uncertainty: Dict[str, Any] = Field(
        default_factory=dict,
        description="Quantitative uncertainty score, variance between perspectives, and evidentiary gaps"
    )
    unresolved_questions: List[str] = Field(
        default_factory=list,
        description="Crucial unanswered questions required to be investigated before any formal conclusion"
    )
    recommended_verification: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Actionable verification checklist (warrants, bank subpoenas, CDR azimuth verification, forensic imaging)"
    )
    judicial_non_culpability_doctrine: str = (
        "Judicial Doctrine (Section 63 Bharatiya Sakshya Adhiniyam 2023): "
        "Multi-perspective automated analysis is an investigative balance aid. "
        "No perspective or consensus algorithm can adjudicate guilt or replace judicial trial. "
        "The accused enjoys the presumption of innocence until proved guilty beyond reasonable doubt."
    )


class MultiPerspectiveAnalysisRequest(BaseModel):
    hypothesis: str = Field(..., min_length=3, description="Investigative hypothesis or inquiry to analyze from all 6 perspectives")
    target_entity: Optional[str] = Field(None, description="Suspect, account, phone number, or entity under evaluation")
    focus_evidence_ids: Optional[List[str]] = Field(None, description="Optional specific evidence items to scrutinize")
    include_historical_records: bool = Field(default=True, description="Whether to contextualize with historical signals")


class MultiPerspectiveAnalysisResponse(BaseModel):
    assessment_id: str
    case_id: str
    hypothesis: str
    target_entity: Optional[str] = None
    perspectives: List[PerspectiveReport] = Field(default_factory=list)
    consensus: ConsensusSynthesis
    created_at: str


class PerspectiveAssessmentSummary(BaseModel):
    id: str
    case_id: str
    hypothesis_statement: str
    target_entity_name: Optional[str] = None
    created_at: str
    created_by_username: Optional[str] = None


class PerspectiveAssessmentHistoryResponse(BaseModel):
    case_id: str
    total_assessments: int
    assessments: List[PerspectiveAssessmentSummary] = Field(default_factory=list)
