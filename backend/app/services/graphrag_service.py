import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.api.deps import check_case_access
from app.models.case import Case
from app.models.entity_resolution import CanonicalEntity
from app.models.extracted_entity import ExtractedEntity
from app.models.user import User
from app.schemas.graphrag import (
    GraphRAGQueryRequest,
    GraphRAGQueryResponse,
    QueryClassificationResult,
    SuggestedPromptItem,
    SuggestedPromptsResponse,
)
from app.services.audit_service import AuditService
from app.utils.evidence_fusion import EvidenceFusionEngine
from app.utils.graphrag_synthesizer import GroundedGraphRAGSynthesizer
from app.utils.query_classifier import QueryClassifier

logger = logging.getLogger(__name__)


class GraphRAGService:
    """
    Case-aware and permission-aware GraphRAG Intelligence Orchestrator.
    Combines Neo4j graph retrieval with pgvector document RAG, ML link predictions,
    and temporal intelligence into an explainable, dual-grounded synthesis platform.
    """

    @classmethod
    def classify_query(
        cls,
        query: str,
        focus_entity: Optional[str] = None
    ) -> QueryClassificationResult:
        """
        Classifies an investigator inquiry and derives the multi-engine routing plan.
        """
        return QueryClassifier.classify(query=query, focus_entity=focus_entity)

    @classmethod
    def query_graphrag(
        cls,
        db: Session,
        case_id: str,
        user: User,
        payload: GraphRAGQueryRequest
    ) -> GraphRAGQueryResponse:
        """
        Executes a permission-verified, multi-engine GraphRAG query for the specified case.
        Strictly prevents information leakage across case boundaries.
        """
        # 1. Enforce Case Access Control (Blocks unauthorized or confidential cases)
        case = check_case_access(db, case_id, user, write_required=False)

        # 2. Query Routing & Classification
        classification = QueryClassifier.classify(
            query=payload.query,
            focus_entity=payload.focus_entity
        )

        # 3. Multi-Engine Evidence Fusion (Graph, RAG, ML, Temporal, Gaps)
        fusion_data = EvidenceFusionEngine.fuse(
            db=db,
            case_id=case.id,
            user=user,
            query=payload.query,
            classification=classification,
            focus_entity=payload.focus_entity,
            max_graph_hops=payload.max_graph_hops,
            top_k_chunks=payload.top_k_chunks,
            include_evidence_gaps=payload.include_evidence_gaps
        )

        # 4. Grounded Synthesis with Dual Citations
        synthesis_result = GroundedGraphRAGSynthesizer.synthesize(
            query=payload.query,
            classification=classification,
            fusion_data=fusion_data
        )

        # 5. Audit Logging under Section 63 BSA 2023
        AuditService.log_action(
            db=db,
            action_type="GRAPHRAG_QUERY_EXECUTED",
            resource_type="GRAPHRAG_ENGINE",
            case_id=case.id,
            resource_id=case.id,
            operator_id=user.username,
            operator_role=user.role,
            details={
                "query": payload.query,
                "intent": classification.question_intent.value,
                "route": classification.primary_route.value,
                "graph_citations_count": len(fusion_data["graph_citations"]),
                "doc_citations_count": len(fusion_data["document_citations"]),
                "evidence_gaps_count": len(fusion_data["evidence_gaps"]),
                "grounding_status": synthesis_result["grounding_status"]
            }
        )

        return GraphRAGQueryResponse(
            case_id=case.id,
            query=payload.query,
            classification=classification,
            answer=synthesis_result["answer"],
            graph_citations=fusion_data["graph_citations"],
            document_citations=fusion_data["document_citations"],
            evidence_gaps=fusion_data["evidence_gaps"],
            cross_cluster_insights=fusion_data["cross_cluster_insights"],
            temporal_bursts=fusion_data["temporal_bursts"],
            grounding_status=synthesis_result["grounding_status"],
            confidence_score=synthesis_result["confidence_score"]
        )

    @classmethod
    def get_suggested_prompts(
        cls,
        db: Session,
        case_id: str,
        user: User
    ) -> SuggestedPromptsResponse:
        """
        Generates dynamic suggested investigative prompts tailored to the active case entities.
        """
        case = check_case_access(db, case_id, user, write_required=False)

        # Fetch top entities in the case to populate realistic prompts
        entities = db.query(ExtractedEntity).filter(
            ExtractedEntity.case_id == case.id
        ).limit(10).all()

        canonicals = db.query(CanonicalEntity).filter(
            CanonicalEntity.case_id == case.id
        ).limit(5).all()

        entity_names = [c.canonical_name for c in canonicals]
        for e in entities:
            if e.normalized_value not in entity_names:
                entity_names.append(e.normalized_value)

        primary_entity = entity_names[0] if entity_names else "the prime suspect"
        secondary_entity = entity_names[1] if len(entity_names) > 1 else "the associate"

        prompts: List[SuggestedPromptItem] = [
            SuggestedPromptItem(
                category="ENTITY_CONNECTIVITY",
                prompt=f"How is {primary_entity} connected to the case?",
                focus_entity=primary_entity,
                description="Explore topological ego-network, degrees of separation, and documentary mentions."
            ),
            SuggestedPromptItem(
                category="RELATIONSHIP_EVIDENCE",
                prompt=f"What evidence supports the relationship between {primary_entity} and {secondary_entity}?",
                focus_entity=primary_entity,
                description="Retrieve primary CDR logs, bank transfers, and verified verbatim quotes."
            ),
            SuggestedPromptItem(
                category="TEMPORAL_CHANGE",
                prompt="What changed before the incident?",
                focus_entity=primary_entity,
                description="Identify pre-incident telecom bursts, transaction velocity spikes, and timeline shifts."
            ),
            SuggestedPromptItem(
                category="CROSS_CLUSTER",
                prompt="Show cross-cluster connections and syndicate cell bridges.",
                focus_entity=None,
                description="Discover inter-community brokers and machine learning predicted bridges."
            ),
            SuggestedPromptItem(
                category="MISSING_EVIDENCE",
                prompt="Which evidence is missing or uncorroborated?",
                focus_entity=None,
                description="Run evidentiary gap analysis for unrecovered devices, burner SIMs, and unverified links."
            ),
        ]

        return SuggestedPromptsResponse(
            case_id=case.id,
            prompts=prompts
        )
