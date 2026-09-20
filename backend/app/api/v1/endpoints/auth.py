from typing import List, Optional
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.core.permissions import Role, Permission, ROLE_PERMISSIONS
from app.core.rate_limiter import rate_limit
from app.core.security_logger import log_security_event, SecurityEventType
from app.models.user import User
from app.schemas.common import APIResponse, PaginatedResponse
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.user_service import UserService
from app.api.deps import get_current_user, require_permissions

router = APIRouter()


def _format_user_response(user: User) -> UserResponse:
    user_role = Role(user.role) if user.role in [r.value for r in Role] else Role.INVESTIGATOR
    perms = [p.value for p in ROLE_PERMISSIONS.get(user_role, set())]
    if user.is_superuser or user.role == Role.SYSTEM_ADMINISTRATOR.value:
        perms = [p.value for p in Permission]

    resp = UserResponse.model_validate(user)
    resp.permissions = perms
    return resp


@router.post("/login", response_model=APIResponse[TokenResponse], dependencies=[Depends(rate_limit("auth"))])
def login(request: Request, login_in: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates an officer or analyst, returning a JWT token with full role permissions.
    Protected by sliding-window rate limiting (10 req/min) and structured security logging.
    """
    ip_addr = request.client.host if request.client else "127.0.0.1"
    user = UserService.authenticate(db, login_in.username, login_in.password)
    if not user:
        log_security_event(
            event_type=SecurityEventType.AUTH_FAILURE,
            user_id=login_in.username,
            ip_address=ip_addr,
            endpoint="/api/v1/auth/login",
            details={"username": login_in.username, "reason": "Bad credentials"},
            severity="WARNING",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    log_security_event(
        event_type=SecurityEventType.AUTH_SUCCESS,
        user_id=str(user.id),
        ip_address=ip_addr,
        endpoint="/api/v1/auth/login",
        details={"username": user.username, "role": user.role},
        severity="INFO",
    )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires,
        role=user.role,
        user_id=str(user.id),
    )

    user_resp = _format_user_response(user)

    return APIResponse(
        success=True,
        message=f"Welcome, {user.full_name} ({user.role}). Authentication successful.",
        data=TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_resp
        )
    )


@router.get("/me", response_model=APIResponse[UserResponse])
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the active user profile, badge number, department, and granted permissions.
    """
    return APIResponse(
        success=True,
        message="Current user profile retrieved.",
        data=_format_user_response(current_user)
    )


@router.get("/users", response_model=PaginatedResponse[UserResponse])
def list_officers_and_analysts(
    role: Optional[str] = Query(None, description="Filter by role (e.g. INVESTIGATOR, FORENSIC_ANALYST)"),
    search: Optional[str] = Query(None, description="Search by name, username, or badge number"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists platform officers and analysts for case team assignment and directory search.
    """
    offset = (page - 1) * size
    users, total = UserService.list_users(db, role=role, search=search, limit=size, offset=offset)
    
    items = [_format_user_response(u) for u in users]
    pages = (total + size - 1) // size if total > 0 else 1
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.post("/seed", response_model=APIResponse[List[UserResponse]])
def seed_default_test_users(db: Session = Depends(get_db)):
    """
    Seeds default test users representing all 6 organizational roles.
    Password for all test personas is: 'Password123!'
    """
    seeded_users = UserService.seed_default_users(db)
    items = [_format_user_response(u) for u in seeded_users]
    return APIResponse(
        success=True,
        message=f"Seeded {len(items)} default test personas covering all 6 platform roles.",
        data=items
    )


@router.post("/register", response_model=APIResponse[UserResponse], status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: UserCreate,
    current_user: User = Depends(require_permissions(Permission.USER_MANAGE)),
    db: Session = Depends(get_db)
):
    """
    Registers a new platform user with specified RBAC role (Admin permission required).
    """
    if UserService.get_by_username(db, user_in.username):
        raise HTTPException(status_code=400, detail=f"Username '{user_in.username}' already registered.")
    if UserService.get_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail=f"Email '{user_in.email}' already registered.")

    user = UserService.create_user(db, user_in, operator_id=current_user.id)
    return APIResponse(
        success=True,
        message=f"User {user.username} successfully registered with role {user.role}.",
        data=_format_user_response(user)
    )
