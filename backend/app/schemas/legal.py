from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class StatuteCode(str, Enum):
    BNS = "BNS"
    BNSS = "BNSS"
    BSA = "BSA"


class ComplianceStatus(str, Enum):
    MET = "MET"
    PARTIALLY_MET = "PARTIALLY_MET"
    UNMET = "UNMET"
    CONTESTED = "CONTESTED"


class LegalConditionItem(BaseModel):
    id: str
    text: str
    is_mandatory: bool = True
    description: Optional[str] = None


class LegalSectionItem(BaseModel):
    id: str
    statute_code: str
    section_number: str
    section_title: str
    chapter: Optional[str] = None
    category: str
    offense_type: Optional[str] = "COGNIZABLE"
    bailable: Optional[bool] = False
    compoundable: Optional[bool] = False
    punishment_text: Optional[str] = None
    full_text: str
    conditions: List[Dict[str, Any]] = []
    legacy_code_mapping: Dict[str, Any] = {}
    version: str = "2023.1"


class LegalStatuteItem(BaseModel):
    id: str
    code: str
    title: str
    enactment_year: int = 2023
    effective_date: str = "2024-07-01"
    version: str = "2023.1"
    statute_metadata: Dict[str, Any] = {}
    sections_count: int = 0


class EvidenceLawChainStep(BaseModel):
    """
    Mandatory 7-Step Evidence-to-Law Pipeline Step:
    LAW -> PROVISION -> CONDITION -> AVAILABLE EVIDENCE -> RELEVANCE -> MISSING INFORMATION -> VERIFICATION
    """
    law: str = Field(..., description="Authoritative statutory code, e.g., Bharatiya Nyaya Sanhita, 2023 (BNS)")
    provision: str = Field(..., description="Specific statutory provision/section, e.g., Section 111 (Organised Crime)")
    condition: str = Field(..., description="Essential legal ingredient/condition required by statute")
    available_evidence: List[str] = Field(..., description="Corroborated evidence items matching this condition in case")
    relevance: str = Field(..., description="Legal and forensic relevance of the evidence to the condition")
    missing_information: str = Field(..., description="Statutory or evidentiary gaps still needed for legal sufficiency")
    verification: str = Field(..., description="Actionable statutory procedure or investigative verification step")
    status: ComplianceStatus = Field(default=ComplianceStatus.UNMET, description="Compliance status: MET, PARTIALLY_MET, UNMET, CONTESTED")


class EvidenceToLawResponse(BaseModel):
    case_id: str
    timestamp: str
    chains: List[EvidenceLawChainStep]
    statutory_summary: Dict[str, Any]
    procedural_safeguards: List[str] = []
    non_culpability_notice: str = (
        "DECISION SUPPORT ONLY: This legal intelligence assessment maps corroborated case signals to statutory "
        "provisions of the BNS, BNSS, and BSA (2023). It does not constitute judicial determination of guilt, "
        "nor does it replace prosecutorial scrutiny or judicial discretion."
    )


class LegalRAGQueryRequest(BaseModel):
    query: str
    statute_filter: Optional[List[str]] = None
    include_case_evidence: bool = True
    include_legacy_concordance: bool = True


class LegalRAGQueryResponse(BaseModel):
    query: str
    answer: str
    chains: List[EvidenceLawChainStep] = []
    cited_sections: List[Dict[str, Any]] = []
    legacy_concordance: List[Dict[str, Any]] = []
    non_culpability_notice: str = (
        "DECISION SUPPORT ONLY: This answer provides statutory guidance based on the gazetted provisions of "
        "BNS, BNSS, and BSA (2023). It must not act as an autonomous judge or automatically determine guilt."
    )


class LegalGraphNode(BaseModel):
    id: str
    label: str
    type: str # STATUTE, SECTION, CONDITION, INGREDIENT, EVIDENCE_TYPE, PROCEDURE
    statute_code: Optional[str] = None
    properties: Dict[str, Any] = {}


class LegalGraphLink(BaseModel):
    source: str
    target: str
    label: str # CONTAINS_SECTION, REQUIRES_CONDITION, SATISFIED_BY, GOVERNED_BY, SUPERSEDES_LEGACY


class LegalGraphResponse(BaseModel):
    nodes: List[LegalGraphNode]
    links: List[LegalGraphLink]
    total_nodes: int
    total_links: int
