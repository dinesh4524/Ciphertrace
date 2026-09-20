"""
AI Tool Permissions & RAG Isolation Engine for CIPHERTRACE X.

Enforces:
1. AI Tool Permission Gate: Verifies that the invoking user has the required
   granular AI permission before invoking expensive or sensitive AI components.
2. Case-Level RAG Isolation: Ensures users cannot query evidence or build
   knowledge graphs for cases they are not authorized to access.
"""

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission, Role, role_has_permission
from app.core.security_logger import log_security_event, SecurityEventType
from app.models.user import User


# Mapping from AI tool/feature identifier to required permission
AI_TOOL_PERMISSION_MAP = {
    "rag_evidence_search": Permission.AI_RAG_EVIDENCE,
    "graph_traversal": Permission.AI_GRAPH_QUERY,
    "multi_perspective_reasoning": Permission.AI_REASONING,
    "counterfactual_ablation": Permission.AI_REASONING,
    "investigative_priority": Permission.AI_REASONING,
    "legal_analysis": Permission.AI_REASONING,
    "general_query": Permission.AI_QUERY,
}


def verify_ai_tool_permission(
    user: User,
    tool_name: str,
    raise_exception: bool = True,
    ip_address: Optional[str] = None,
) -> bool:
    """
    Verifies that a user has permission to execute a specific AI tool/analysis.
    """
    # Superuser and Admin have access to all tools
    role_str = str(getattr(user, "role", "")).upper()
    if getattr(user, "is_superuser", False) or role_str in (Role.SYSTEM_ADMINISTRATOR.value, "ADMIN", "SUPERADMIN"):
        return True

    required_perm = AI_TOOL_PERMISSION_MAP.get(tool_name, Permission.AI_QUERY)
    has_perm = role_has_permission(getattr(user, "role", ""), required_perm)

    if not has_perm:
        log_security_event(
            event_type=SecurityEventType.RBAC_DENIED,
            user_id=getattr(user, "id", "unknown"),
            ip_address=ip_address,
            endpoint=f"ai_tool:{tool_name}",
            details={
                "tool_name": tool_name,
                "required_permission": required_perm.value,
                "user_role": getattr(user, "role", ""),
            },
            severity="WARNING",
        )
        if raise_exception:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Access to AI tool '{tool_name}' requires permission '{required_perm.value}'.",
            )
        return False

    return True


def verify_rag_access(
    user: User,
    case_id: str,
    db: Session,
    ip_address: Optional[str] = None,
) -> bool:
    """
    Ensures RAG query isolation: user must have authorization to access the case
    before searching or synthesizing its evidence.
    """
    from app.api.deps import check_case_access

    try:
        check_case_access(db=db, case_id_or_user=case_id, user_or_case_id=user)
        return True
    except HTTPException as exc:
        log_security_event(
            event_type=SecurityEventType.CASE_ACCESS_DENIED,
            user_id=getattr(user, "id", "unknown"),
            ip_address=ip_address,
            endpoint="rag:case_isolation",
            details={
                "case_id": case_id,
                "reason": str(exc.detail),
            },
            severity="WARNING",
        )
        raise exc
