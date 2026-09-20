from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import check_case_access, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.nlp import (
    DirectNLPRequest,
    DirectNLPResult,
    ExtractedEntityResponse,
    ExtractedRelationshipResponse,
    NLPProcessingResponse,
)
from app.services.nlp_service import NLPService

router = APIRouter()


@router.post("/process-evidence/{evidence_id}", response_model=APIResponse[NLPProcessingResponse], status_code=status.HTTP_200_OK)
def process_evidence_nlp_endpoint(
    evidence_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers Phase 4 Document Intelligence & Entity Extraction Pipeline on an evidence document:
    Extracts Persons, Phone Numbers, Devices (IMEI/IMSI), Financial Accounts (UPI/Crypto/Bank),
    Vehicles, Legal Sections (BNS/IPC), Locations, Organizations, and grounded Co-occurrence Relationships.
    """
    result = NLPService.process_evidence(db=db, evidence_id=evidence_id, operator_username=current_user.username)
    return APIResponse(
        success=True,
        message=f"NLP extraction successful: Identified {result.entities_count} entities and {result.relationships_count} relationships.",
        data=result
    )


@router.get("/entities/case/{case_id}", response_model=APIResponse[List[ExtractedEntityResponse]])
def get_case_entities_endpoint(
    case_id: str,
    entity_type: Optional[str] = Query(None, description="PERSON, PHONE_NUMBER, DEVICE, FINANCIAL_ACCOUNT, VEHICLE, LOCATION, ORGANIZATION, LEGAL_SECTION"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves all extracted intelligence entities grounded to evidence for a given case.
    """
    check_case_access(db, current_user, case_id)
    entities = NLPService.get_case_entities(db=db, case_id=case_id, entity_type=entity_type)
    data = [ExtractedEntityResponse.model_validate(e) for e in entities]
    return APIResponse(
        success=True,
        message=f"Retrieved {len(data)} extracted entities for case {case_id}",
        data=data
    )


@router.get("/relationships/case/{case_id}", response_model=APIResponse[List[ExtractedRelationshipResponse]])
def get_case_relationships_endpoint(
    case_id: str,
    relationship_type: Optional[str] = Query(None, description="CALLS_TO, TRANSFERS_FUNDS_TO, USES_PHONE_NUMBER, OPERATES_HANDSET_DEVICE, CONTROLS_BANK_ACCOUNT, BOOKED_UNDER_SECTION, OPERATES_IN_LOCATION"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves all extracted relationships between entities for a given case.
    """
    check_case_access(db, current_user, case_id)
    relationships = NLPService.get_case_relationships(db=db, case_id=case_id, rel_type=relationship_type)
    data = [ExtractedRelationshipResponse.model_validate(r) for r in relationships]
    return APIResponse(
        success=True,
        message=f"Retrieved {len(data)} extracted relationships for case {case_id}",
        data=data
    )


@router.post("/extract-text", response_model=APIResponse[DirectNLPResult])
def extract_direct_text_endpoint(
    payload: DirectNLPRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Real-time interactive intelligence extraction sandbox.
    Parses unstructured text, police diaries, or interrogation transcripts directly.
    """
    result = NLPService.extract_direct(payload.text)
    return APIResponse(
        success=True,
        message=f"Direct extraction complete: Found {result.entities_count} entities and {result.relationships_count} relationships.",
        data=result
    )
