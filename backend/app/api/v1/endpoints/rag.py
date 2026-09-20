from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_permissions
from app.core.permissions import Permission
from app.core.rate_limiter import rate_limit
from app.core.ai_permissions import verify_rag_access, verify_ai_tool_permission
from app.core.input_guard import sanitize_query
from app.core.security_logger import log_security_event, SecurityEventType
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.rag import (
    RAGQueryRequest,
    RAGQueryResponse,
    IndexCaseDocumentsResponse,
    RAGStatsResponse,
)
from app.services.rag_service import RAGService

router = APIRouter()


@router.post(
    "/query/{case_id}",
    response_model=APIResponse[RAGQueryResponse],
    summary="Execute case-aware and permission-aware Document RAG query",
    description="Retrieves pgvector chunks, executes hybrid reranking, and synthesizes grounded answers with Section 63 BSA 2023 citations.",
    dependencies=[Depends(rate_limit("ai"))]
)
def query_case_rag(
    case_id: str,
    payload: RAGQueryRequest,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ))
):
    ip_addr = request.client.host if (request and request.client) else "127.0.0.1"

    # Zero-Trust RAG Isolation: Verify user has access to this case
    verify_rag_access(user=current_user, case_id=case_id, db=db, ip_address=ip_addr)

    # Granular AI tool permission gate
    verify_ai_tool_permission(user=current_user, tool_name="rag_evidence_search", ip_address=ip_addr)

    # Prompt injection detection & sanitization
    guard_result = sanitize_query(payload.query)
    if guard_result.is_rejected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=guard_result.rejection_reason or "Invalid query submitted."
        )
    if guard_result.was_sanitized:
        log_security_event(
            event_type=SecurityEventType.PROMPT_INJECTION_DETECTED,
            user_id=str(current_user.id),
            ip_address=ip_addr,
            endpoint=f"/api/v1/rag/query/{case_id}",
            details={"violations": guard_result.violations, "original_query_snippet": payload.query[:100]},
            severity="WARNING"
        )
    payload.query = guard_result.clean_text

    result = RAGService.query_rag(
        db=db,
        case_id=case_id,
        user=current_user,
        payload=payload
    )
    return APIResponse(
        success=True,
        data=result,
        message="RAG query executed with verified evidence citations."
    )


@router.post(
    "/index/{case_id}",
    response_model=APIResponse[IndexCaseDocumentsResponse],
    summary="Index all case documents into pgvector embeddings",
    description="Extracts, chunks, and embeds all evidence items, interrogation reports, FIRs, and case notes into pgvector document chunks."
)
def index_case_documents(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ))
):
    result = RAGService.index_case_documents(
        db=db,
        case_id=case_id,
        user=current_user
    )
    return APIResponse(
        success=True,
        data=result,
        message=result.message
    )


@router.get(
    "/stats/{case_id}",
    response_model=APIResponse[RAGStatsResponse],
    summary="Get case RAG vector storage telemetry",
    description="Returns total indexed chunks, source type distribution, and indexing timestamps for the case."
)
def get_case_rag_stats(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ))
):
    result = RAGService.get_rag_stats(
        db=db,
        case_id=case_id,
        user=current_user
    )
    return APIResponse(
        success=True,
        data=result,
        message="Case RAG statistics fetched."
    )
