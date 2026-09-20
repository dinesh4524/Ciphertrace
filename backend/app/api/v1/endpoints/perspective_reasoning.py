from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_permissions
from app.core.permissions import Permission
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.perspective_reasoning import (
    MultiPerspectiveAnalysisRequest,
    MultiPerspectiveAnalysisResponse,
    PerspectiveAssessmentHistoryResponse,
)
from app.services.perspective_reasoning_service import PerspectiveReasoningService

router = APIRouter()


@router.post(
    "/analyze/{case_id}",
    response_model=APIResponse[MultiPerspectiveAnalysisResponse],
    summary="Execute multi-perspective structured reasoning and consensus synthesis",
    description=(
        "Evaluates an investigative hypothesis from 6 structured viewpoints (Investigator, Forensic, "
        "Legal, Defence, Suspect, Common-Sense), enforces strict non-culpability guardrails under "
        "Section 63 BSA 2023, and produces a balanced consensus synthesis report."
    ),
)
def run_perspective_analysis(
    case_id: str,
    payload: MultiPerspectiveAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ)),
):
    result = PerspectiveReasoningService.run_analysis(
        db=db,
        case_id=case_id,
        user=current_user,
        payload=payload
    )
    return APIResponse(
        success=True,
        data=result,
        message="Multi-perspective reasoning and consensus synthesis executed successfully."
    )


@router.get(
    "/history/{case_id}",
    response_model=APIResponse[PerspectiveAssessmentHistoryResponse],
    summary="Get multi-perspective reasoning history for a case",
    description="Retrieves chronological records of previous multi-perspective evaluations conducted on this case."
)
def get_case_perspective_history(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ)),
):
    result = PerspectiveReasoningService.get_case_history(
        db=db,
        case_id=case_id,
        user=current_user
    )
    return APIResponse(
        success=True,
        data=result,
        message="Perspective assessment history retrieved successfully."
    )


@router.get(
    "/assessment/{assessment_id}",
    response_model=APIResponse[MultiPerspectiveAnalysisResponse],
    summary="Get specific perspective assessment details by ID",
    description="Retrieves a complete past multi-perspective assessment including all 6 viewpoints and consensus balance sheet."
)
def get_assessment_details(
    assessment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ)),
):
    try:
        result = PerspectiveReasoningService.get_assessment_by_id(
            db=db,
            assessment_id=assessment_id,
            user=current_user
        )
        return APIResponse(
            success=True,
            data=result,
            message="Assessment retrieved successfully."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
