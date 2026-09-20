from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_permissions
from app.core.permissions import Permission
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.investigative_priority import (
    AssessInvestigativePriorityRequest,
    InvestigativePriorityAssessmentResponse,
    PriorityAssessmentSummaryItem,
)
from app.services.priority_service import PriorityService

router = APIRouter()


@router.post(
    "/assess/{case_id}",
    response_model=APIResponse[InvestigativePriorityAssessmentResponse],
    summary="Assess investigative priority and generate Next Best Actions",
    description=(
        "Evaluates an investigative lead or target entity across 9 evidentiary dimensions "
        "(current evidence, temporal correlation, network relevance, anomalies, corroboration, "
        "reliability, contradictory evidence, alternative explanations, uncertainty), derives a composite priority score, "
        "and generates ranked Next Best Actions based on Expected Information Gain (EIG)."
    ),
)
def assess_priority(
    case_id: str,
    payload: AssessInvestigativePriorityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ)),
):
    result = PriorityService.assess_priority(
        db=db,
        case_id=case_id,
        user=current_user,
        payload=payload
    )
    return APIResponse(
        success=True,
        data=result,
        message="Investigative priority assessed and Next Best Actions ranked successfully."
    )


@router.get(
    "/history/{case_id}",
    response_model=APIResponse[List[PriorityAssessmentSummaryItem]],
    summary="Get investigative priority history for a case",
    description="Retrieves previous priority assessments conducted on this case.",
)
def get_priority_history(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ)),
):
    history = PriorityService.get_priority_history(
        db=db,
        case_id=case_id,
        user=current_user
    )
    return APIResponse(
        success=True,
        data=history,
        message=f"Retrieved {len(history)} priority assessment records."
    )


@router.get(
    "/assessment/{assessment_id}",
    response_model=APIResponse[Dict[str, Any]],
    summary="Get detailed priority assessment record by ID",
    description="Retrieves full 9-factor scores, supporting/contradictory evidence, and Next Best Actions for an assessment.",
)
def get_assessment_by_id(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ)),
):
    result = PriorityService.get_assessment_by_id(
        db=db,
        assessment_id=assessment_id,
        user=current_user
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Priority assessment {assessment_id} not found."
        )
    return APIResponse(
        success=True,
        data=result,
        message="Priority assessment details retrieved successfully."
    )
