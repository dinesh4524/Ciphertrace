from typing import Generator, List, Optional, Union
from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.core.permissions import Role, Permission, ROLE_PERMISSIONS, role_has_permission
from app.core.abac import evaluate_abac, ABACContext, ClearanceLevel, get_user_clearance
from app.core.security_logger import log_security_event, SecurityEventType
from app.models.user import User
from app.models.case import Case
from app.models.case_assignment import CaseAssignment
from app.services.user_service import UserService

security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency returning the authenticated User model.
    When REQUIRE_AUTH=True, unauthenticated requests are rejected with 401.
    When REQUIRE_AUTH=False (development mode only), returns default lead investigator.
    """
    ip_addr = request.client.host if (request and request.client) else "127.0.0.1"
    endpoint = request.url.path if request else "unknown"

    if credentials:
        token = credentials.credentials
        payload = decode_token(token)
        if not payload:
            log_security_event(
                event_type=SecurityEventType.TOKEN_INVALID,
                ip_address=ip_addr,
                endpoint=endpoint,
                details={"reason": "Token decoding or verification failed"},
                severity="WARNING",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = payload.get("sub")
        user = UserService.get_by_id(db, user_id)
        if not user:
            # Fallback by username if sub was username
            user = UserService.get_by_username(db, user_id)
        if not user or not user.is_active:
            log_security_event(
                event_type=SecurityEventType.AUTH_FAILURE,
                ip_address=ip_addr,
                endpoint=endpoint,
                details={"sub": user_id, "reason": "User inactive or not found"},
                severity="WARNING",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User inactive or not found.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if request:
            request.state.current_user = user
        return user

    # No credentials provided
    if not settings.REQUIRE_AUTH:
        default_user = UserService.get_by_username(db, "investigator_sharma")
        if not default_user:
            seeded = UserService.seed_default_users(db)
            default_user = seeded[0]
        if request:
            request.state.current_user = default_user
        return default_user

    log_security_event(
        event_type=SecurityEventType.AUTH_FAILURE,
        ip_address=ip_addr,
        endpoint=endpoint,
        details={"reason": "Missing authentication credentials"},
        severity="WARNING",
    )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials were not provided.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_permissions(*required_permissions: Permission):
    """
    Dependency factory that verifies the current user has all required permissions.
    """
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = Role(current_user.role) if current_user.role in [r.value for r in Role] else Role.INVESTIGATOR
        user_perms = ROLE_PERMISSIONS.get(user_role, set())

        # Superusers bypass checks
        if current_user.is_superuser or user_role == Role.SYSTEM_ADMINISTRATOR:
            return current_user

        missing = [p for p in required_permissions if p not in user_perms]
        if missing:
            log_security_event(
                event_type=SecurityEventType.RBAC_DENIED,
                user_id=str(current_user.id),
                details={
                    "user_role": current_user.role,
                    "missing_permissions": [p.value for p in missing],
                    "required_permissions": [p.value for p in required_permissions],
                },
                severity="WARNING",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "ACCESS_DENIED_RBAC_VIOLATION",
                    "message": f"Role '{current_user.role}' lacks required permissions: {[p.value for p in missing]}",
                    "user_role": current_user.role,
                    "required_permissions": [p.value for p in required_permissions],
                },
            )
        return current_user
    return permission_checker


def require_roles(*allowed_roles: Role):
    """
    Dependency factory checking role membership.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser or current_user.role == Role.SYSTEM_ADMINISTRATOR.value:
            return current_user

        allowed_values = [r.value if isinstance(r, Role) else str(r) for r in allowed_roles]
        if current_user.role not in allowed_values:
            log_security_event(
                event_type=SecurityEventType.RBAC_DENIED,
                user_id=str(current_user.id),
                details={
                    "user_role": current_user.role,
                    "allowed_roles": allowed_values,
                },
                severity="WARNING",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorized. Required one of: {allowed_values}",
            )
        return current_user
    return role_checker


def check_case_access(
    db: Session,
    case_id_or_user: Union[str, User],
    user_or_case_id: Union[User, str],
    write_required: bool = False,
) -> Case:
    """
    Enforces case-level access control with ABAC evaluation.
    Supervisors and Administrators have organization-wide visibility.
    For confidential cases, only assigned team members or supervisors have access.
    Supports either (db, case_id, user) or (db, user, case_id).
    """
    if isinstance(case_id_or_user, str):
        case_id = case_id_or_user
        current_user = user_or_case_id
    else:
        current_user = case_id_or_user
        case_id = user_or_case_id

    case = db.query(Case).filter(Case.id == str(case_id)).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation case '{case_id}' was not found.",
        )

    # Superuser, Admin, and Senior Investigators have broad jurisdiction
    if current_user.is_superuser or current_user.role in [Role.SYSTEM_ADMINISTRATOR.value, Role.SENIOR_INVESTIGATOR.value]:
        return case

    # Lead investigator check
    if case.assigned_lead_user_id == current_user.id:
        return case

    # Assigned team check
    assignment = db.query(CaseAssignment).filter(
        CaseAssignment.case_id == case_id,
        CaseAssignment.user_id == current_user.id,
    ).first()

    if assignment:
        if write_required and not assignment.can_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has read-only access to this case.",
            )
        return case

    # If confidential and user is not assigned, evaluate ABAC clearance and block
    if case.is_confidential:
        user_clearance = get_user_clearance(getattr(current_user, "role", ""))
        abac_ctx = ABACContext(
            user_id=str(current_user.id),
            user_role=getattr(current_user, "role", ""),
            user_clearance=user_clearance,
            resource_sensitivity=ClearanceLevel.CONFIDENTIAL,
            resource_case_id=case.id,
            action="write" if write_required else "read",
        )
        abac_result = evaluate_abac(abac_ctx)
        log_security_event(
            event_type=SecurityEventType.ABAC_DENIED if not abac_result.allowed else SecurityEventType.CASE_ACCESS_DENIED,
            user_id=str(current_user.id),
            details={
                "case_id": case.id,
                "reason": "Case is marked CONFIDENTIAL and user is not assigned to team",
                "abac_reason": abac_result.reason,
            },
            severity="WARNING",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Case is marked CONFIDENTIAL and you are not assigned to the investigation team.",
        )

    return case
