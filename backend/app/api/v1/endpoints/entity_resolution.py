from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import check_case_access, get_current_user, require_permissions
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.entity_resolution import (
    CandidateReviewRequest,
    CanonicalEntityResponse,
    EntityResolutionCandidateResponse,
    ResolutionRunResult,
)
from app.services.entity_resolution_service import EntityResolutionService

router = APIRouter()


@router.post("/cases/{case_id}/run", response_model=APIResponse[ResolutionRunResult], status_code=status.HTTP_200_OK)
def run_entity_resolution_endpoint(
    case_id: str,
    threshold: float = Query(0.70, ge=0.5, le=1.0, description="Minimum confidence threshold for candidate match proposal"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes Phase 5 Multi-Strategy Entity Resolution Pipeline on extracted entities of a case.
    Generates AI-proposed candidate matches for investigator review.
    Uncertain matches are NEVER silently merged.
    """
    check_case_access(db, current_user, case_id)
    result = EntityResolutionService.run_case_entity_resolution(
        db=db,
        case_id=case_id,
        operator_username=current_user.username,
        threshold=threshold
    )
    return APIResponse(
        success=True,
        message=f"Entity Resolution Pipeline executed: {result.candidates_generated} new candidate pairs proposed for review.",
        data=result
    )


@router.get("/cases/{case_id}/candidates", response_model=APIResponse[List[EntityResolutionCandidateResponse]])
def get_case_candidates_endpoint(
    case_id: str,
    review_status: Optional[str] = Query(None, description="PENDING_REVIEW, ACCEPTED, REJECTED, CHALLENGED"),
    entity_type: Optional[str] = Query(None, description="PERSON, PHONE_NUMBER, DEVICE, FINANCIAL_ACCOUNT, VEHICLE"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves all AI-proposed entity resolution candidate pairs for a case.
    """
    check_case_access(db, current_user, case_id)
    candidates = EntityResolutionService.get_case_candidates(
        db=db,
        case_id=case_id,
        status=review_status,
        entity_type=entity_type
    )
    data = [EntityResolutionCandidateResponse.model_validate(c) for c in candidates]
    return APIResponse(
        success=True,
        message=f"Retrieved {len(data)} entity resolution candidates for case {case_id}",
        data=data
    )


@router.post("/candidates/{candidate_id}/review", response_model=APIResponse[EntityResolutionCandidateResponse])
def review_candidate_endpoint(
    candidate_id: str,
    payload: CandidateReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a human investigator review decision (ACCEPT, REJECT, CHALLENGE) with required justification.
    If ACCEPTED, merges or clusters the entities into a verified CanonicalEntity.
    """
    candidate = EntityResolutionService.review_candidate(
        db=db,
        candidate_id=candidate_id,
        decision=payload.decision,
        decision_reason=payload.decision_reason,
        merge_directive=payload.merge_directive,
        reviewer=current_user
    )
    return APIResponse(
        success=True,
        message=f"Candidate match decision '{payload.decision}' recorded with Section 63 BSA audit trail.",
        data=EntityResolutionCandidateResponse.model_validate(candidate)
    )


@router.get("/cases/{case_id}/canonical-entities", response_model=APIResponse[List[CanonicalEntityResponse]])
def get_case_canonical_entities_endpoint(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves all verified real-world canonical entities established for a case.
    """
    check_case_access(db, current_user, case_id)
    entities = EntityResolutionService.get_case_canonical_entities(db=db, case_id=case_id)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(entities)} canonical entities for case {case_id}",
        data=entities
    )
