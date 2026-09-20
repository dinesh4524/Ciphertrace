from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.schemas.rag import CitationItem


class QueryIntent(str, Enum):
    ENTITY_CONNECTIVITY = "ENTITY_CONNECTIVITY"        # "How is entity X connected to the case?"
    RELATIONSHIP_EVIDENCE = "RELATIONSHIP_EVIDENCE"    # "What evidence supports this relationship?"
    TEMPORAL_CHANGE = "TEMPORAL_CHANGE"                # "What changed before the incident?"
    CROSS_CLUSTER = "CROSS_CLUSTER"                    # "Show cross-cluster connections."
    MISSING_EVIDENCE = "MISSING_EVIDENCE"              # "Which evidence is missing?"
    GENERAL_INQUIRY = "GENERAL_INQUIRY"


class PrimaryRoute(str, Enum):
    GRAPH = "GRAPH"
    DOC_RAG = "DOC_RAG"
    ML_PREDICTION = "ML_PREDICTION"
    TEMPORAL = "TEMPORAL"
    EVIDENCE_GAP = "EVIDENCE_GAP"
    HYBRID_FUSION = "HYBRID_FUSION"


class QueryClassificationResult(BaseModel):
    """
    Structured parsing of investigator inquiry into multi-engine routing directives.
    """
    primary_route: PrimaryRoute
    question_intent: QueryIntent
    target_entities: List[str] = Field(default_factory=list, description="Extracted suspects, phones, accounts, vehicles")
    target_relationships: List[str] = Field(default_factory=list, description="Target link types e.g. CALLED, TRANSFERRED")
    engine_plan: Dict[str, bool] = Field(
        default_factory=lambda: {
            "needs_graph": True,
            "needs_rag": True,
            "needs_ml": False,
            "needs_temporal": False,
            "needs_gap_analysis": True,
        }
    )
    confidence: float = 0.95
    classification_rationale: str = ""


class GraphCitationItem(BaseModel):
    """
    Topological knowledge graph citation grounding an assertion to an edge/node in the Neo4j graph.
    """
    citation_id: str
    source_node: str
    target_node: str
    relationship_type: str
    confidence: float = 1.0
    relationship_nature: str = "OBSERVED"  # OBSERVED, INFERRED, PREDICTED, CONTESTED
    verification_status: str = "VERIFIED"
    evidence_id: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)


class EvidenceGapItem(BaseModel):
    """
    Discrepancy and intelligence gap identified during fusion.
    """
    gap_id: str
    gap_type: str  # UNSUBSTANTIATED_PREDICTED_LINK, SINGLE_SOURCE_CORROBORATION, UNRECOVERED_DEVICE, UNIDENTIFIED_MULE_PROXY, MISSING_STATEMENT
    entity_or_relationship: str
    description: str
    investigative_recommendation: str
    severity: str = "MEDIUM"  # HIGH, MEDIUM, LOW


class GraphRAGQueryRequest(BaseModel):
    """
    Investigator inquiry submitted to the GraphRAG multi-engine router.
    """
    query: str = Field(..., min_length=2, description="Investigative question")
    focus_entity: Optional[str] = Field(None, description="Optional entity name or identifier to anchor subgraph exploration")
    include_evidence_gaps: bool = Field(default=True, description="Whether to identify missing evidence and corroboration gaps")
    max_graph_hops: int = Field(default=2, ge=1, le=4, description="Maximum graph radius for ego-network exploration")
    top_k_chunks: int = Field(default=5, ge=1, le=15, description="Number of vector document chunks to retrieve")


class GraphRAGQueryResponse(BaseModel):
    """
    Multi-engine grounded response fusing Graph, RAG, ML, and Temporal analytics.
    """
    case_id: str
    query: str
    classification: QueryClassificationResult
    answer: str
    graph_citations: List[GraphCitationItem] = Field(default_factory=list)
    document_citations: List[CitationItem] = Field(default_factory=list)
    evidence_gaps: List[EvidenceGapItem] = Field(default_factory=list)
    cross_cluster_insights: Optional[List[Dict[str, Any]]] = None
    temporal_bursts: Optional[List[Dict[str, Any]]] = None
    grounding_status: str = "FULLY_GROUNDED"  # FULLY_GROUNDED, PARTIALLY_GROUNDED, EVIDENCE_GAP_HIGHLIGHTED
    confidence_score: float = 0.90
    statutory_safeguard: str = (
        "Statutory Grounding & Traceability Notice (Section 63 Bharatiya Sakshya Adhiniyam 2023): "
        "Every assertion in this response is dual-anchored to verified Neo4j knowledge graph topology "
        "and cryptographically hashed document vector chunks. Machine learning hypotheses are explicitly labelled."
    )


class SuggestedPromptItem(BaseModel):
    category: str
    prompt: str
    focus_entity: Optional[str] = None
    description: str


class SuggestedPromptsResponse(BaseModel):
    case_id: str
    prompts: List[SuggestedPromptItem]
