from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_permissions
from app.core.permissions import Permission
from app.core.rate_limiter import rate_limit
from app.core.ai_permissions import verify_rag_access, verify_ai_tool_permission
from app.core.input_guard import sanitize_query
from app.core.security_logger import log_security_event, SecurityEventType
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.graphrag import (
    GraphRAGQueryRequest,
    GraphRAGQueryResponse,
    QueryClassificationResult,
    SuggestedPromptsResponse,
)
from app.services.graphrag_service import GraphRAGService

router = APIRouter()


class ClassifyQueryRequest(BaseModel):
    query: str
    focus_entity: Optional[str] = None


@router.post(
    "/query/{case_id}",
    response_model=APIResponse[GraphRAGQueryResponse],
    summary="Execute multi-engine GraphRAG query with query routing and evidence fusion",
    description=(
        "Classifies question intent, orchestrates Neo4j graph retrieval, pgvector document RAG, "
        "ML hidden-link predictions, and temporal intelligence, then generates dual-grounded answers "
        "with Section 63 BSA 2023 citations and evidence gap alerts."
    ),
    dependencies=[Depends(rate_limit("ai"))]
)
def query_case_graphrag(
    case_id: str,
    payload: GraphRAGQueryRequest,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ)),
):
    ip_addr = request.client.host if (request and request.client) else "127.0.0.1"

    # Zero-Trust RAG Isolation
    verify_rag_access(user=current_user, case_id=case_id, db=db, ip_address=ip_addr)

    # Granular AI tool permission gate
    verify_ai_tool_permission(user=current_user, tool_name="graph_traversal", ip_address=ip_addr)

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
            endpoint=f"/api/v1/graphrag/query/{case_id}",
            details={"violations": guard_result.violations, "original_query_snippet": payload.query[:100]},
            severity="WARNING"
        )
    payload.query = guard_result.clean_text

    result = GraphRAGService.query_graphrag(
        db=db,
        case_id=case_id,
        user=current_user,
        payload=payload
    )
    return APIResponse(
        success=True,
        data=result,
        message="GraphRAG query executed with multi-engine evidence fusion and dual citations."
    )


@router.post(
    "/classify",
    response_model=APIResponse[QueryClassificationResult],
    summary="Classify query intent and generate multi-engine routing plan",
    description="Analyzes question semantics and returns target intent, entity targets, and engine routing directives."
)
def classify_graphrag_query(
    payload: ClassifyQueryRequest,
    current_user: User = Depends(get_current_user),
):
    result = GraphRAGService.classify_query(
        query=payload.query,
        focus_entity=payload.focus_entity
    )
    return APIResponse(
        success=True,
        data=result,
        message="Query intent classified successfully."
    )


@router.get(
    "/suggested-prompts/{case_id}",
    response_model=APIResponse[SuggestedPromptsResponse],
    summary="Get dynamic suggested investigative prompts for active case",
    description="Returns pre-populated GraphRAG prompts tailored to the active case suspects and telemetry."
)
def get_case_suggested_prompts(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ)),
):
    result = GraphRAGService.get_suggested_prompts(
        db=db,
        case_id=case_id,
        user=current_user
    )
    return APIResponse(
        success=True,
        data=result,
        message="Suggested GraphRAG prompts generated successfully."
    )
