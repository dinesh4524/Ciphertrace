from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.audit import AuditLogResponse
from app.schemas.common import PaginatedResponse
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("/logs", response_model=PaginatedResponse[AuditLogResponse])
def get_audit_trail(
    case_id: Optional[str] = Query(None, description="Filter logs for a specific case"),
    action_type: Optional[str] = Query(None, description="Filter by action type (e.g. EVIDENCE_INGESTED, INTEGRITY_VERIFICATION)"),
    operator_id: Optional[str] = Query(None, description="Filter by operator/IO ID"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Retrieves the immutable audit trail log ensuring complete Section 65B/63 BSA chain of custody accountability.
    """
    offset = (page - 1) * size
    logs, total = AuditService.get_logs(
        db=db,
        case_id=case_id,
        action_type=action_type,
        operator_id=operator_id,
        limit=size,
        offset=offset
    )

    items = [AuditLogResponse.model_validate(log) for log in logs]
    pages = (total + size - 1) // size if total > 0 else 1

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )
