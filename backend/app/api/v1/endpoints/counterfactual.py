from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_permissions
from app.core.permissions import Permission
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.counterfactual import (
    ComparativeAblationRequest,
    ComparativeAblationResponse,
    EntityRemovalSimulationRequest,
    RelationshipRemovalSimulationRequest,
    SimulationHistoryItem,
)
from app.services.counterfactual_service import CounterfactualService

router = APIRouter()


@router.post(
    "/compare/{case_id}",
    response_model=APIResponse[ComparativeAblationResponse],
    summary="Run 4-way comparative evidence ablation matrix",
    description=(
        "Simulates 4 comparative evidentiary states (Full Evidence vs Without CDR vs Without Location vs Without Financial) "
        "to evaluate hypothesis fragility, topological deltas, and alternative explanations under Section 63 BSA 2023. "
        "Does NOT establish criminal guilt."
    ),
)
def run_comparative_ablation(
    case_id: str,
    payload: ComparativeAblationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ)),
):
    result = CounterfactualService.run_comparative_ablation(
        db=db,
        case_id=case_id,
        user=current_user,
        payload=payload
    )
    return APIResponse(
        success=True,
        data=result,
        message="Comparative evidence ablation matrix executed successfully."
    )


@router.post(
    "/simulate-entity-removal/{case_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Simulate entity removal and network fragmentation",
    description="Simulates counterfactual removal of an entity to measure network partitioning and hypothesis survival.",
)
def simulate_entity_removal(
    case_id: str,
    payload: EntityRemovalSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ)),
):
    result = CounterfactualService.simulate_entity_removal(
        db=db,
        case_id=case_id,
        user=current_user,
        payload=payload
    )
    return APIResponse(
        success=True,
        data=result,
        message=f"Entity removal simulation for [{payload.entity_name}] completed successfully."
    )


@router.post(
    "/simulate-relationship-removal/{case_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Simulate severing an edge/relationship between two entities",
    description="Simulates counterfactual severing of an edge to test whether alternative multi-hop paths sustain the hypothesis.",
)
def simulate_relationship_removal(
    case_id: str,
    payload: RelationshipRemovalSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ)),
):
    result = CounterfactualService.simulate_relationship_removal(
        db=db,
        case_id=case_id,
        user=current_user,
        payload=payload
    )
    return APIResponse(
        success=True,
        data=result,
        message="Relationship removal simulation completed successfully."
    )


@router.get(
    "/history/{case_id}",
    response_model=APIResponse[List[SimulationHistoryItem]],
    summary="Get counterfactual ablation experiment history",
    description="Retrieves previous ablation experiments and sensitivity audits for the given case.",
)
def get_simulation_history(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ)),
):
    history = CounterfactualService.get_simulation_history(
        db=db,
        case_id=case_id,
        user=current_user
    )
    return APIResponse(
        success=True,
        data=history,
        message=f"Retrieved {len(history)} simulation runs."
    )


@router.get(
    "/simulation/{simulation_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Get detailed ablation simulation result by ID",
    description="Retrieves full baseline and ablated scenario metrics for an experiment.",
)
def get_simulation_by_id(
    simulation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ)),
):
    result = CounterfactualService.get_simulation_by_id(
        db=db,
        simulation_id=simulation_id,
        user=current_user
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation {simulation_id} not found."
        )
    return APIResponse(
        success=True,
        data=result,
        message="Ablation simulation details retrieved successfully."
    )
