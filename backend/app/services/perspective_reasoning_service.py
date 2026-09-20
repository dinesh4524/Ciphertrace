import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.api.deps import check_case_access
from app.models.case import Case
from app.models.document_chunk import DocumentChunk
from app.models.evidence import EvidenceItem
from app.models.perspective_reasoning import PerspectiveAssessment
from app.models.user import User
from app.schemas.perspective_reasoning import (
    ConsensusSynthesis,
    MultiPerspectiveAnalysisRequest,
    MultiPerspectiveAnalysisResponse,
    PerspectiveAssessmentHistoryResponse,
    PerspectiveAssessmentSummary,
    PerspectiveReport,
)
from app.services.analytics_service import AnalyticsService
from app.services.audit_service import AuditService
from app.services.graph_service import GraphService
from app.utils.consensus_synthesis_engine import ConsensusSynthesisEngine
from app.utils.embedding_engine import DenseSemanticEmbeddingEngine
from app.utils.perspective_engines import StructuredPerspectiveEngine

logger = logging.getLogger(__name__)


class PerspectiveReasoningService:
    """
    Phase 13: Case-Aware Multi-Perspective Reasoning & Consensus Synthesis Service.
    Orchestrates 6 distinct viewpoints, non-culpability guardrails, consensus balance sheets,
    and persistent Section 63 BSA 2023 evidentiary auditing.
    """

    @classmethod
    def run_analysis(
        cls,
        db: Session,
        case_id: str,
        user: User,
        payload: MultiPerspectiveAnalysisRequest
    ) -> MultiPerspectiveAnalysisResponse:
        """
        Executes multi-perspective reasoning on an investigative hypothesis and target entity.
        Enforces case access control and logs an immutable audit event.
        """
        # 1. Enforce Case Access Control
        case = check_case_access(db, case_id, user, write_required=False)

        # 2. Gather Case Data Fabric
        evidence_items_query = db.query(EvidenceItem).filter(EvidenceItem.case_id == case.id)
        if payload.focus_evidence_ids:
            evidence_items_query = evidence_items_query.filter(EvidenceItem.id.in_(payload.focus_evidence_ids))
        ev_items = evidence_items_query.all()
        ev_dicts = [
            {
                "id": e.id,
                "evidence_code": e.evidence_code,
                "source_type": e.source_type,
                "file_name": e.file_name,
                "seizing_officer": e.seizing_officer
            }
            for e in ev_items
        ]

        # Knowledge Graph Topology
        subgraph = GraphService.get_case_subgraph(db, case.id)
        graph_nodes = [n.dict() for n in subgraph.nodes]
        graph_edges = [e.dict() for e in subgraph.edges]

        # Relevant Document Chunks
        chunks = db.query(DocumentChunk).filter(DocumentChunk.case_id == case.id).limit(10).all()
        chunk_dicts = [
            {
                "chunk_id": c.id,
                "evidence_code": c.evidence_code,
                "source_type": c.source_type,
                "content": c.content,
                "chunk_index": c.chunk_index
            }
            for c in chunks
        ]

        # Temporal Bursts (if available)
        temporal_bursts: List[Dict[str, Any]] = []
        try:
            temp_res = AnalyticsService.get_temporal_intelligence(db, case.id, operator_id=user.username)
            temporal_bursts = [b.dict() for b in temp_res.bursts]
        except Exception as e:
            logger.info(f"Temporal intelligence telemetry not available for case {case.id}: {e}")

        # 3. Evaluate All 6 Perspectives under Strict Non-Culpability Guardrail
        perspectives = StructuredPerspectiveEngine.evaluate_all(
            hypothesis=payload.hypothesis,
            target_entity=payload.target_entity,
            evidence_items=ev_dicts,
            graph_nodes=graph_nodes,
            graph_edges=graph_edges,
            document_chunks=chunk_dicts,
            temporal_bursts=temporal_bursts
        )

        # 4. Generate Consensus & Synthesis Balance Sheet
        consensus = ConsensusSynthesisEngine.synthesize(
            hypothesis=payload.hypothesis,
            target_entity=payload.target_entity,
            perspectives=perspectives,
            evidence_items=ev_dicts,
            graph_edges=graph_edges,
            document_chunks=chunk_dicts,
            temporal_bursts=temporal_bursts
        )

        # 5. Persist Assessment Record
        perspectives_json = [p.dict() for p in perspectives]
        consensus_json = consensus.dict()

        assessment = PerspectiveAssessment(
            case_id=case.id,
            target_entity_name=payload.target_entity,
            hypothesis_statement=payload.hypothesis,
            perspectives_data=perspectives_json,
            consensus_synthesis=consensus_json,
            created_by_user_id=user.id,
            created_by_username=user.username
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        # 6. Audit Logging under Section 63 BSA 2023
        AuditService.log_action(
            db=db,
            action_type="MULTI_PERSPECTIVE_ANALYSIS_EXECUTED",
            resource_type="REASONING_ENGINE",
            case_id=case.id,
            resource_id=assessment.id,
            operator_id=user.username,
            operator_role=user.role,
            details={
                "hypothesis": payload.hypothesis,
                "target_entity": payload.target_entity,
                "perspectives_evaluated": len(perspectives),
                "supporting_points_count": len(consensus.supporting_evidence),
                "contradictory_points_count": len(consensus.contradictory_evidence),
                "uncertainty_level": consensus.uncertainty.get("uncertainty_level")
            }
        )

        return MultiPerspectiveAnalysisResponse(
            assessment_id=assessment.id,
            case_id=case.id,
            hypothesis=payload.hypothesis,
            target_entity=payload.target_entity,
            perspectives=perspectives,
            consensus=consensus,
            created_at=assessment.created_at.isoformat()
        )

    @classmethod
    def get_case_history(
        cls,
        db: Session,
        case_id: str,
        user: User
    ) -> PerspectiveAssessmentHistoryResponse:
        """
        Retrieves all past multi-perspective assessments for a given case.
        """
        case = check_case_access(db, case_id, user, write_required=False)

        assessments = db.query(PerspectiveAssessment).filter(
            PerspectiveAssessment.case_id == case.id
        ).order_by(PerspectiveAssessment.created_at.desc()).all()

        summaries = [
            PerspectiveAssessmentSummary(
                id=a.id,
                case_id=a.case_id,
                hypothesis_statement=a.hypothesis_statement,
                target_entity_name=a.target_entity_name,
                created_at=a.created_at.isoformat(),
                created_by_username=a.created_by_username
            )
            for a in assessments
        ]

        return PerspectiveAssessmentHistoryResponse(
            case_id=case.id,
            total_assessments=len(summaries),
            assessments=summaries
        )

    @classmethod
    def get_assessment_by_id(
        cls,
        db: Session,
        assessment_id: str,
        user: User
    ) -> MultiPerspectiveAnalysisResponse:
        """
        Retrieves a specific full assessment record by ID with access control.
        """
        assessment = db.query(PerspectiveAssessment).filter(
            PerspectiveAssessment.id == assessment_id
        ).first()
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Verify access to case
        check_case_access(db, assessment.case_id, user, write_required=False)

        perspectives_list = assessment.perspectives_data if isinstance(assessment.perspectives_data, list) else []
        consensus_dict = assessment.consensus_synthesis if isinstance(assessment.consensus_synthesis, dict) else {}
        perspectives = [PerspectiveReport(**p) for p in perspectives_list]
        consensus = ConsensusSynthesis(**consensus_dict)

        return MultiPerspectiveAnalysisResponse(
            assessment_id=assessment.id,
            case_id=assessment.case_id,
            hypothesis=assessment.hypothesis_statement,
            target_entity=assessment.target_entity_name,
            perspectives=perspectives,
            consensus=consensus,
            created_at=assessment.created_at.isoformat()
        )
