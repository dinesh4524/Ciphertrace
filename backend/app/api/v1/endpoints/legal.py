from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_permissions
from app.core.permissions import Permission
from app.models.user import User
from app.schemas.common import APIResponse
from app.services.legal_service import LegalService
from app.schemas.legal import (
    LegalStatuteItem,
    LegalSectionItem,
    EvidenceToLawResponse,
    LegalRAGQueryRequest,
    LegalRAGQueryResponse,
    LegalGraphResponse,
)

router = APIRouter()
legal_service = LegalService()


@router.get(
    "/statutes",
    response_model=APIResponse[List[LegalStatuteItem]],
    summary="List authoritative Indian statutes (BNS, BNSS, BSA 2023)",
)
def get_statutes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all authoritative Indian statutes (BNS, BNSS, BSA 2023) with metadata and section counts.
    """
    statutes = legal_service.get_statutes(db)
    return APIResponse(
        success=True,
        data=statutes,
        message="Authoritative statutes retrieved successfully.",
    )


@router.get(
    "/statute/{statute_code}/sections",
    response_model=APIResponse[List[LegalSectionItem]],
    summary="List gazetted provisions for a statute",
)
def get_sections_by_statute(
    statute_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all gazetted provisions/sections for a specific statute (BNS, BNSS, BSA).
    """
    sections = legal_service.get_sections_by_statute(statute_code, db)
    return APIResponse(
        success=True,
        data=sections,
        message=f"Authoritative sections for {statute_code.upper()} retrieved successfully.",
    )


@router.get(
    "/section/{statute_code}/{section_number}",
    response_model=APIResponse[LegalSectionItem],
    summary="Get authoritative section details",
)
def get_section_details(
    statute_code: str,
    section_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve authoritative details for a specific section.
    Anti-hallucination: Rejects any unverified or invented sections with a 404.
    """
    section = legal_service.get_section_details(statute_code, section_number, db)
    return APIResponse(
        success=True,
        data=section,
        message=f"Section {statute_code.upper()} §{section_number} retrieved successfully.",
    )


@router.post(
    "/map-evidence/{case_id}",
    response_model=APIResponse[EvidenceToLawResponse],
    summary="Map case evidence to law with 7-step pipeline",
)
def map_case_evidence_to_law(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ)),
):
    """
    Map case evidence items to BNS, BNSS, and BSA provisions.
    Output strictly follows the mandatory 7-step pipeline:
    LAW -> PROVISION -> CONDITION -> AVAILABLE EVIDENCE -> RELEVANCE -> MISSING INFORMATION -> VERIFICATION.
    """
    result = legal_service.map_case_evidence_to_law(case_id, db, current_user)
    return APIResponse(
        success=True,
        data=result,
        message="Evidence-to-law mapping completed successfully.",
    )


@router.post(
    "/query/{case_id}",
    response_model=APIResponse[LegalRAGQueryResponse],
    summary="Query authoritative Indian Legal RAG knowledge base",
)
def query_legal_rag(
    case_id: str,
    request: LegalRAGQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ)),
):
    """
    Query the authoritative Indian Legal RAG knowledge base.
    Provides statutory citations, legacy IPC/CrPC/IEA concordance, and 7-step reasoning chains.
    Strictly functions as decision support and does not determine guilt.
    """
    result = legal_service.query_legal_rag(case_id, request, db, current_user)
    return APIResponse(
        success=True,
        data=result,
        message="Legal RAG query completed with statutory grounding.",
    )


@router.get(
    "/graph",
    response_model=APIResponse[LegalGraphResponse],
    summary="Retrieve Indian Legal Knowledge Graph",
)
def get_legal_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve the Indian Legal Knowledge Graph linking Statutes, Sections, Conditions, and Procedural Powers.
    """
    graph = legal_service.get_legal_graph(db)
    return APIResponse(
        success=True,
        data=graph,
        message="Legal knowledge graph retrieved successfully.",
    )
