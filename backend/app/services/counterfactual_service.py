import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.api.deps import check_case_access
from app.models.case import Case
from app.models.counterfactual import AblationSimulationRun
from app.models.user import User
from app.schemas.counterfactual import (
    AblatedScenarioResult,
    ComparativeAblationRequest,
    ComparativeAblationResponse,
    EntityRemovalSimulationRequest,
    RelationshipRemovalSimulationRequest,
    SensitivityAnalysisSummary,
    SimulationHistoryItem,
)
from app.services.audit_service import AuditService
from app.services.graph_service import GraphService
from app.utils.ablation_engine import CounterfactualAblationEngine

logger = logging.getLogger(__name__)


class CounterfactualService:
    """
    Service Layer for Phase 14: Counterfactual & Evidence Ablation.
    Manages access control, runs 4-way comparative balance matrices,
    simulates entity & relationship removal, tracks simulation history,
    and enforces Section 63 BSA 2023 non-culpability safeguards.
    """

    @classmethod
    def _extract_graph_data(cls, db: Session, case_id: str) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        subgraph = GraphService.get_case_subgraph(db, case_id)
        nodes = [n.model_dump() for n in subgraph.nodes]
        edges = [e.model_dump() for e in subgraph.edges]
        return nodes, edges

    @classmethod
    def run_comparative_ablation(
        cls,
        db: Session,
        case_id: str,
        user: User,
        payload: ComparativeAblationRequest
    ) -> ComparativeAblationResponse:
        case = check_case_access(db, case_id, user, write_required=False)

        nodes, edges = cls._extract_graph_data(db, case.id)

        result = CounterfactualAblationEngine.run_comparative_ablation(
            nodes=nodes,
            edges=edges,
            hypothesis_statement=payload.hypothesis_statement,
            target_entity=payload.target_entity
        )

        sim_id = str(uuid.uuid4())
        sim_name = f"4-Way Ablation: {payload.hypothesis_statement[:40]}..."

        # Persist simulation run
        sim_record = AblationSimulationRun(
            id=sim_id,
            case_id=case.id,
            simulation_name=sim_name,
            hypothesis_statement=payload.hypothesis_statement,
            target_entity=payload.target_entity,
            ablation_type="FOUR_WAY_COMPARISON",
            baseline_metrics=result["baseline_metrics"],
            ablated_scenarios=[s.model_dump() for s in result["scenarios"]],
            sensitivity_summary=result["sensitivity_summary"].model_dump(),
            overall_fragility_score=result["overall_fragility_score"],
            created_by_user_id=user.id,
            created_by_username=user.username,
            created_at=datetime.utcnow()
        )
        db.add(sim_record)
        db.commit()
        db.refresh(sim_record)

        # Audit logging
        AuditService.log_action(
            db=db,
            action_type="COUNTERFACTUAL_ABLATION_RUN",
            resource_type="ABLATION_ENGINE",
            case_id=case.id,
            resource_id=sim_record.id,
            operator_id=user.username,
            operator_role=user.role,
            details={
                "simulation_name": sim_name,
                "hypothesis": payload.hypothesis_statement,
                "target_entity": payload.target_entity,
                "overall_fragility_score": result["overall_fragility_score"],
                "spofs": result["sensitivity_summary"].single_points_of_failure,
                "survival_status": result["sensitivity_summary"].survival_status.value
            }
        )

        return ComparativeAblationResponse(
            case_id=case.id,
            simulation_id=sim_record.id,
            simulation_name=sim_name,
            hypothesis_statement=payload.hypothesis_statement,
            target_entity=payload.target_entity,
            baseline_metrics=result["baseline_metrics"],
            scenarios=result["scenarios"],
            sensitivity_summary=result["sensitivity_summary"],
            created_at=sim_record.created_at
        )

    @classmethod
    def simulate_entity_removal(
        cls,
        db: Session,
        case_id: str,
        user: User,
        payload: EntityRemovalSimulationRequest
    ) -> Dict[str, Any]:
        case = check_case_access(db, case_id, user, write_required=False)

        nodes, edges = cls._extract_graph_data(db, case.id)

        result = CounterfactualAblationEngine.simulate_entity_removal(
            nodes=nodes,
            edges=edges,
            entity_name=payload.entity_name,
            hypothesis_statement=payload.hypothesis_statement
        )

        sim_id = str(uuid.uuid4())
        sim_name = f"Entity Removal: [{payload.entity_name}]"

        sim_record = AblationSimulationRun(
            id=sim_id,
            case_id=case.id,
            simulation_name=sim_name,
            hypothesis_statement=payload.hypothesis_statement,
            target_entity=payload.entity_name,
            ablation_type="ENTITY_REMOVAL",
            baseline_metrics=result["baseline_metrics"],
            ablated_scenarios=[result["scenario"].model_dump()],
            sensitivity_summary=result["sensitivity_summary"].model_dump(),
            overall_fragility_score=result["overall_fragility_score"],
            created_by_user_id=user.id,
            created_by_username=user.username,
            created_at=datetime.utcnow()
        )
        db.add(sim_record)
        db.commit()
        db.refresh(sim_record)

        AuditService.log_action(
            db=db,
            action_type="ENTITY_REMOVAL_SIMULATED",
            resource_type="ABLATION_ENGINE",
            case_id=case.id,
            resource_id=sim_record.id,
            operator_id=user.username,
            operator_role=user.role,
            details={
                "entity_name": payload.entity_name,
                "hypothesis": payload.hypothesis_statement,
                "survival_status": result["sensitivity_summary"].survival_status.value
            }
        )

        return {
            "case_id": case.id,
            "simulation_id": sim_record.id,
            "simulation_name": sim_name,
            "entity_name": payload.entity_name,
            "hypothesis_statement": payload.hypothesis_statement,
            "baseline_metrics": result["baseline_metrics"],
            "scenario": result["scenario"],
            "sensitivity_summary": result["sensitivity_summary"],
            "overall_fragility_score": result["overall_fragility_score"],
            "created_at": sim_record.created_at.isoformat(),
            "legal_statutory_disclaimer": CounterfactualAblationEngine.STATUTORY_SAFEGUARD
        }

    @classmethod
    def simulate_relationship_removal(
        cls,
        db: Session,
        case_id: str,
        user: User,
        payload: RelationshipRemovalSimulationRequest
    ) -> Dict[str, Any]:
        case = check_case_access(db, case_id, user, write_required=False)

        nodes, edges = cls._extract_graph_data(db, case.id)

        result = CounterfactualAblationEngine.simulate_relationship_removal(
            nodes=nodes,
            edges=edges,
            source_entity=payload.source_entity,
            target_entity=payload.target_entity,
            relationship_type=payload.relationship_type,
            hypothesis_statement=payload.hypothesis_statement
        )

        sim_id = str(uuid.uuid4())
        sim_name = f"Edge Removal: [{payload.source_entity}] <-> [{payload.target_entity}]"

        sim_record = AblationSimulationRun(
            id=sim_id,
            case_id=case.id,
            simulation_name=sim_name,
            hypothesis_statement=payload.hypothesis_statement,
            target_entity=f"{payload.source_entity} - {payload.target_entity}",
            ablation_type="RELATIONSHIP_REMOVAL",
            baseline_metrics=result["baseline_metrics"],
            ablated_scenarios=[result["scenario"].model_dump()],
            sensitivity_summary=result["sensitivity_summary"].model_dump(),
            overall_fragility_score=result["overall_fragility_score"],
            created_by_user_id=user.id,
            created_by_username=user.username,
            created_at=datetime.utcnow()
        )
        db.add(sim_record)
        db.commit()
        db.refresh(sim_record)

        AuditService.log_action(
            db=db,
            action_type="RELATIONSHIP_REMOVAL_SIMULATED",
            resource_type="ABLATION_ENGINE",
            case_id=case.id,
            resource_id=sim_record.id,
            operator_id=user.username,
            operator_role=user.role,
            details={
                "source_entity": payload.source_entity,
                "target_entity": payload.target_entity,
                "relationship_type": payload.relationship_type,
                "hypothesis": payload.hypothesis_statement
            }
        )

        return {
            "case_id": case.id,
            "simulation_id": sim_record.id,
            "simulation_name": sim_name,
            "source_entity": payload.source_entity,
            "target_entity": payload.target_entity,
            "relationship_type": payload.relationship_type,
            "hypothesis_statement": payload.hypothesis_statement,
            "baseline_metrics": result["baseline_metrics"],
            "scenario": result["scenario"],
            "sensitivity_summary": result["sensitivity_summary"],
            "overall_fragility_score": result["overall_fragility_score"],
            "created_at": sim_record.created_at.isoformat(),
            "legal_statutory_disclaimer": CounterfactualAblationEngine.STATUTORY_SAFEGUARD
        }

    @classmethod
    def get_simulation_history(
        cls,
        db: Session,
        case_id: str,
        user: User
    ) -> List[SimulationHistoryItem]:
        case = check_case_access(db, case_id, user, write_required=False)

        runs = db.query(AblationSimulationRun).filter(
            AblationSimulationRun.case_id == case.id
        ).order_by(AblationSimulationRun.created_at.desc()).all()

        results = []
        for r in runs:
            summary = r.sensitivity_summary or {}
            results.append(
                SimulationHistoryItem(
                    id=r.id,
                    case_id=r.case_id,
                    simulation_name=r.simulation_name,
                    hypothesis_statement=r.hypothesis_statement,
                    target_entity=r.target_entity,
                    ablation_type=r.ablation_type,
                    overall_fragility_score=r.overall_fragility_score or 0.0,
                    survival_status=summary.get("survival_status", "UNKNOWN"),
                    created_by_username=r.created_by_username,
                    created_at=r.created_at
                )
            )
        return results

    @classmethod
    def get_simulation_by_id(
        cls,
        db: Session,
        simulation_id: str,
        user: User
    ) -> Optional[Dict[str, Any]]:
        sim = db.query(AblationSimulationRun).filter(AblationSimulationRun.id == simulation_id).first()
        if not sim:
            return None
        
        # Enforce permission on the parent case
        check_case_access(db, sim.case_id, user, write_required=False)

        return {
            "id": sim.id,
            "case_id": sim.case_id,
            "simulation_name": sim.simulation_name,
            "hypothesis_statement": sim.hypothesis_statement,
            "target_entity": sim.target_entity,
            "ablation_type": sim.ablation_type,
            "baseline_metrics": sim.baseline_metrics,
            "ablated_scenarios": sim.ablated_scenarios,
            "sensitivity_summary": sim.sensitivity_summary,
            "overall_fragility_score": sim.overall_fragility_score,
            "created_by_username": sim.created_by_username,
            "created_at": sim.created_at.isoformat() if sim.created_at else None,
            "legal_statutory_disclaimer": CounterfactualAblationEngine.STATUTORY_SAFEGUARD
        }
