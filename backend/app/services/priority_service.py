import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.api.deps import check_case_access
from app.models.case import Case
from app.models.cdr import CDRRecord
from app.models.document_chunk import DocumentChunk
from app.models.evidence import EvidenceItem
from app.models.financial import FinancialRecord
from app.models.investigative_priority import InvestigativePriorityAssessment
from app.models.user import User
from app.schemas.investigative_priority import (
    AssessInvestigativePriorityRequest,
    InvestigativePriorityAssessmentResponse,
    PriorityAssessmentSummaryItem,
    NextBestAction,
)
from app.services.audit_service import AuditService
from app.services.graph_service import GraphService
from app.utils.graph_analytics import GraphAnalyticsEngine
from app.utils.information_gain_engine import NextBestActionEngine
from app.utils.priority_engine import InvestigativePriorityEngine
from app.utils.temporal_engine import TemporalIntelligenceEngine

logger = logging.getLogger(__name__)


class PriorityService:
    """
    Service Layer for Phase 15: Investigative Priority & Next Best Action.
    Synthesizes graph analytics, temporal bursts, document intelligence,
    and cryptographic evidence provenance into prioritized leads and ranked Next Best Actions.
    """

    @classmethod
    def assess_priority(
        cls,
        db: Session,
        case_id: str,
        user: User,
        payload: AssessInvestigativePriorityRequest
    ) -> InvestigativePriorityAssessmentResponse:
        case = check_case_access(db, case_id, user, write_required=False)

        # 1. Fetch Case Evidentiary Data
        evidences = db.query(EvidenceItem).filter(EvidenceItem.case_id == case.id).all()
        evidence_dicts = [
            {
                "id": e.id,
                "evidence_code": e.evidence_code,
                "source_type": e.source_type,
                "file_name": e.file_name,
                "integrity_status": e.integrity_status,
                "file_hash_sha256": e.file_hash_sha256
            }
            for e in evidences
        ]

        # 2. Fetch Graph Subgraph
        subgraph = GraphService.get_case_subgraph(db, case.id)
        nodes = [n.model_dump() for n in subgraph.nodes]
        edges = [e.model_dump() for e in subgraph.edges]

        # 3. Detect Graph Anomalies
        anomalies_data = GraphAnalyticsEngine.detect_graph_anomalies(nodes, edges)
        anomalies = anomalies_data.get("anomalies", []) if isinstance(anomalies_data, dict) else []

        # 4. Fetch Temporal Records & Bursts
        cdrs = db.query(CDRRecord).join(EvidenceItem, CDRRecord.evidence_id == EvidenceItem.id).filter(EvidenceItem.case_id == case.id).all()
        financials = db.query(FinancialRecord).join(EvidenceItem, FinancialRecord.evidence_id == EvidenceItem.id).filter(EvidenceItem.case_id == case.id).all()
        
        cdr_dicts = [{"start_time": c.call_start_time, "source_phone": c.source_phone, "dest_phone": c.destination_phone} for c in cdrs]
        fin_dicts = [{"timestamp": f.transaction_timestamp, "amount": f.amount, "source": f.source_account_number, "dest": f.destination_account_number} for f in financials]
        
        timeline = TemporalIntelligenceEngine.build_unified_timeline(cdr_dicts, fin_dicts, [], evidence_dicts)
        comm_bursts = TemporalIntelligenceEngine.detect_communication_bursts(timeline)
        tx_bursts = TemporalIntelligenceEngine.detect_transaction_bursts(timeline)
        all_bursts = comm_bursts + tx_bursts

        # 5. Fetch Document Chunks
        chunks = db.query(DocumentChunk).filter(DocumentChunk.case_id == case.id).limit(20).all()
        chunk_dicts = [{"id": c.id, "content": c.content, "evidence_code": c.evidence_code} for c in chunks]

        # Target resolution
        target_name = payload.target_entity_name
        if not target_name and len(nodes) > 0:
            # Default to first non-case person node if available
            person_nodes = [n for n in nodes if str(n.get("label", "")).lower() == "person" and not str(n.get("name", "")).startswith("FIR")]
            target_name = person_nodes[0].get("name") if person_nodes else nodes[0].get("name")

        # 6. Execute Investigative Priority Engine
        assessment_data = InvestigativePriorityEngine.assess_priority(
            target_name=target_name,
            target_id=payload.target_entity_id,
            lead_title=payload.lead_title,
            evidence_items=evidence_dicts,
            graph_nodes=nodes,
            graph_edges=edges,
            temporal_bursts=all_bursts,
            anomalies=anomalies,
            document_chunks=chunk_dicts
        )

        # 7. Generate Next Best Actions based on Expected Information Gain (EIG)
        next_actions: List[NextBestAction] = []
        if payload.include_next_best_actions:
            next_actions = NextBestActionEngine.generate_actions(
                target_entity_name=target_name,
                factors=assessment_data["score_factors"],
                uncertainty=assessment_data["uncertainty"]
            )

        # 8. Persist Record
        rec_id = str(uuid.uuid4())
        rec = InvestigativePriorityAssessment(
            id=rec_id,
            case_id=case.id,
            lead_title=assessment_data["lead_title"],
            target_entity_name=target_name,
            target_entity_id=payload.target_entity_id,
            priority_level=assessment_data["priority_level"].value,
            priority_score=assessment_data["priority_score"],
            score_factors=assessment_data["score_factors"].model_dump(),
            reasons=assessment_data["reasons"],
            supporting_evidence=[s.model_dump() for s in assessment_data["supporting_evidence"]],
            contradictory_evidence=[c.model_dump() for c in assessment_data["contradictory_evidence"]],
            alternative_explanations=assessment_data["alternative_explanations"],
            uncertainty_analysis=assessment_data["uncertainty"].model_dump(),
            recommended_verifications=assessment_data["recommended_verification"],
            next_best_actions=[a.model_dump() for a in next_actions],
            created_by_user_id=user.id,
            created_by_username=user.username,
            created_at=datetime.utcnow()
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

        # 9. Audit Logging under Section 63 BSA 2023
        AuditService.log_action(
            db=db,
            action_type="INVESTIGATIVE_PRIORITY_ASSESSED",
            resource_type="PRIORITY_ENGINE",
            case_id=case.id,
            resource_id=rec.id,
            operator_id=user.username,
            operator_role=user.role,
            details={
                "lead_title": rec.lead_title,
                "target_entity": target_name,
                "priority_level": rec.priority_level,
                "priority_score": rec.priority_score,
                "next_best_actions_count": len(next_actions)
            }
        )

        return InvestigativePriorityAssessmentResponse(
            assessment_id=rec.id,
            case_id=case.id,
            lead_title=rec.lead_title,
            target_entity_name=target_name,
            priority_level=assessment_data["priority_level"],
            priority_score=assessment_data["priority_score"],
            score_factors=assessment_data["score_factors"],
            reasons=assessment_data["reasons"],
            supporting_evidence=assessment_data["supporting_evidence"],
            contradictory_evidence=assessment_data["contradictory_evidence"],
            alternative_explanations=assessment_data["alternative_explanations"],
            uncertainty=assessment_data["uncertainty"],
            recommended_verification=assessment_data["recommended_verification"],
            next_best_actions=next_actions,
            created_at=rec.created_at
        )

    @classmethod
    def get_priority_history(
        cls,
        db: Session,
        case_id: str,
        user: User
    ) -> List[PriorityAssessmentSummaryItem]:
        case = check_case_access(db, case_id, user, write_required=False)

        records = db.query(InvestigativePriorityAssessment).filter(
            InvestigativePriorityAssessment.case_id == case.id
        ).order_by(InvestigativePriorityAssessment.created_at.desc()).all()

        return [
            PriorityAssessmentSummaryItem(
                id=r.id,
                case_id=r.case_id,
                lead_title=r.lead_title,
                target_entity_name=r.target_entity_name,
                priority_level=r.priority_level,
                priority_score=r.priority_score,
                created_by_username=r.created_by_username,
                created_at=r.created_at
            )
            for r in records
        ]

    @classmethod
    def get_assessment_by_id(
        cls,
        db: Session,
        assessment_id: str,
        user: User
    ) -> Optional[Dict[str, Any]]:
        rec = db.query(InvestigativePriorityAssessment).filter(
            InvestigativePriorityAssessment.id == assessment_id
        ).first()
        if not rec:
            return None

        # Check access on parent case
        check_case_access(db, rec.case_id, user, write_required=False)

        return {
            "assessment_id": rec.id,
            "case_id": rec.case_id,
            "lead_title": rec.lead_title,
            "target_entity_name": rec.target_entity_name,
            "priority_level": rec.priority_level,
            "priority_score": rec.priority_score,
            "score_factors": rec.score_factors,
            "reasons": rec.reasons,
            "supporting_evidence": rec.supporting_evidence,
            "contradictory_evidence": rec.contradictory_evidence,
            "alternative_explanations": rec.alternative_explanations,
            "uncertainty": rec.uncertainty_analysis,
            "recommended_verification": rec.recommended_verifications,
            "next_best_actions": rec.next_best_actions,
            "created_by_username": rec.created_by_username,
            "created_at": rec.created_at.isoformat() if rec.created_at else None
        }
