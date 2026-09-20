from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import Permission, Role
from app.models.user import User
from app.schemas.case import (
    CaseCreate,
    CaseResponse,
    CaseUpdate,
    CaseStatusUpdate,
    CaseAssignmentCreate,
    CaseAssignmentResponse,
    CaseNoteCreate,
    CaseNoteResponse,
    CaseDashboardStats,
)
from app.schemas.common import APIResponse, PaginatedResponse
from app.services.case_service import CaseService
from app.api.deps import get_current_user, require_permissions, check_case_access

router = APIRouter()


@router.get("/dashboard/stats", response_model=APIResponse[CaseDashboardStats])
def get_dashboard_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns high-level investigation metrics: active cases, critical priorities,
    stages, category distribution, and evidence counts.
    """
    stats = CaseService.get_dashboard_stats(db)
    return APIResponse(
        success=True,
        message="Case management dashboard statistics computed successfully.",
        data=stats
    )


@router.post("", response_model=APIResponse[CaseResponse], status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: CaseCreate,
    current_user: User = Depends(require_permissions(Permission.CASE_CREATE)),
    db: Session = Depends(get_db)
):
    """
    Registers a new Criminal Investigation Case with priority, stage, and lead investigator.
    """
    case = CaseService.create_case(
        db=db,
        case_in=case_in,
        operator_id=current_user.id,
        current_user_id=current_user.id
    )
    c_resp = CaseResponse.model_validate(case)
    c_resp.evidence_count = len(case.evidence_items)
    c_resp.team_members_count = len(case.assignments)
    return APIResponse(
        success=True,
        message=f"Case {case.case_number} registered successfully in the intelligence registry.",
        data=c_resp
    )


@router.get("", response_model=PaginatedResponse[CaseResponse])
def list_cases(
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE_INVESTIGATION, UNDER_REVIEW, CHARGESHEETED, CLOSED"),
    priority: Optional[str] = Query(None, description="Filter by priority: CRITICAL, HIGH, MEDIUM, LOW"),
    stage: Optional[str] = Query(None, description="Filter by stage"),
    crime_category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search title, case number or description"),
    my_cases_only: bool = Query(False, description="Filter to cases assigned to current user"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves paginated list of criminal cases with RBAC and confidential filtering.
    """
    offset = (page - 1) * size
    user_filter = current_user.id if my_cases_only else None

    cases, total = CaseService.list_cases(
        db=db,
        status=status,
        priority=priority,
        stage=stage,
        crime_category=crime_category,
        search_query=search,
        user_id_filter=user_filter,
        limit=size,
        offset=offset
    )

    case_items = []
    for c in cases:
        # If confidential and user is not supervisor/admin or assigned, skip
        if c.is_confidential and current_user.role not in [Role.SYSTEM_ADMINISTRATOR.value, Role.SENIOR_INVESTIGATOR.value]:
            is_assigned = any(a.user_id == current_user.id for a in c.assignments) or c.assigned_lead_user_id == current_user.id
            if not is_assigned:
                continue

        c_resp = CaseResponse.model_validate(c)
        c_resp.evidence_count = len(c.evidence_items)
        c_resp.team_members_count = len(c.assignments)
        case_items.append(c_resp)

    pages = (total + size - 1) // size if total > 0 else 1
    return PaginatedResponse(
        items=case_items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.get("/{case_id}", response_model=APIResponse[CaseResponse])
def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches comprehensive case details, assigned team, notes, and evidence count.
    """
    case = check_case_access(db, case_id, current_user, write_required=False)
    team_data = CaseService.get_case_team(db, case_id)
    
    c_resp = CaseResponse.model_validate(case)
    c_resp.evidence_count = len(case.evidence_items)
    c_resp.team_members_count = len(case.assignments)
    c_resp.assigned_team = [CaseAssignmentResponse(**t) for t in team_data]

    return APIResponse(success=True, message="Case retrieved", data=c_resp)


@router.put("/{case_id}", response_model=APIResponse[CaseResponse])
def update_case(
    case_id: str,
    case_update: CaseUpdate,
    current_user: User = Depends(require_permissions(Permission.CASE_UPDATE)),
    db: Session = Depends(get_db)
):
    """
    Updates case details, priority, stage, tags, or metadata.
    """
    check_case_access(db, case_id, current_user, write_required=True)
    case = CaseService.update_case(db, case_id, case_update, operator_id=current_user.id)
    c_resp = CaseResponse.model_validate(case)
    c_resp.evidence_count = len(case.evidence_items)
    c_resp.team_members_count = len(case.assignments)
    return APIResponse(success=True, message="Case updated successfully", data=c_resp)


@router.put("/{case_id}/status", response_model=APIResponse[CaseResponse])
def update_case_status(
    case_id: str,
    status_in: CaseStatusUpdate,
    current_user: User = Depends(require_permissions(Permission.CASE_CHANGE_STATUS)),
    db: Session = Depends(get_db)
):
    """
    Transitions case status (e.g. to UNDER_REVIEW, CHARGESHEETED, CLOSED) with supervisory reasoning.
    Requires Senior Investigator / Supervisor or Admin role.
    """
    case = CaseService.change_case_status(
        db=db,
        case_id=case_id,
        status_in=status_in,
        operator_id=current_user.id,
        author_id=current_user.id
    )
    c_resp = CaseResponse.model_validate(case)
    c_resp.evidence_count = len(case.evidence_items)
    c_resp.team_members_count = len(case.assignments)
    return APIResponse(
        success=True,
        message=f"Case status updated to '{case.status}' (Stage: {case.stage}).",
        data=c_resp
    )


@router.post("/{case_id}/assign", response_model=APIResponse[CaseAssignmentResponse])
def assign_investigation_team_member(
    case_id: str,
    assignment_in: CaseAssignmentCreate,
    current_user: User = Depends(require_permissions(Permission.CASE_ASSIGN)),
    db: Session = Depends(get_db)
):
    """
    Assigns an investigator, forensic analyst, or legal reviewer to the case team.
    Requires Senior Investigator / Supervisor permission.
    """
    assignment = CaseService.assign_team_member(
        db=db,
        case_id=case_id,
        assignment_in=assignment_in,
        operator_id=current_user.id,
        supervisor_id=current_user.id
    )
    assigned_user = db.query(User).filter(User.id == assignment_in.user_id).first()

    return APIResponse(
        success=True,
        message=f"Assigned {assigned_user.full_name if assigned_user else 'user'} to case team as {assignment.role_in_case}.",
        data=CaseAssignmentResponse(
            id=assignment.id,
            case_id=assignment.case_id,
            user_id=assignment.user_id,
            username=assigned_user.username if assigned_user else "unknown",
            full_name=assigned_user.full_name if assigned_user else "Unknown",
            role_in_case=assignment.role_in_case,
            assigned_at=assignment.assigned_at,
            can_write=assignment.can_write,
            can_export=assignment.can_export
        )
    )


@router.get("/{case_id}/team", response_model=APIResponse[List[CaseAssignmentResponse]])
def get_case_investigation_team(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all officers, forensic specialists, and legal analysts assigned to this case.
    """
    check_case_access(db, case_id, current_user, write_required=False)
    team = CaseService.get_case_team(db, case_id)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(team)} team assignments.",
        data=[CaseAssignmentResponse(**t) for t in team]
    )


@router.post("/{case_id}/notes", response_model=APIResponse[CaseNoteResponse], status_code=status.HTTP_201_CREATED)
def add_case_ledger_note(
    case_id: str,
    note_in: CaseNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adds an entry to the Investigator Case Management Ledger (Hypothesis, Directive, or Field note).
    """
    check_case_access(db, case_id, current_user, write_required=True)
    note = CaseService.add_case_note(
        db=db,
        case_id=case_id,
        note_in=note_in,
        author_id=current_user.id,
        operator_id=current_user.id
    )
    return APIResponse(
        success=True,
        message="Case ledger note added successfully.",
        data=CaseNoteResponse(
            id=note.id,
            case_id=note.case_id,
            author_id=current_user.id,
            author_name=current_user.full_name,
            author_role=current_user.role,
            note_type=note.note_type,
            title=note.title,
            content=note.content,
            created_at=note.created_at,
            updated_at=note.updated_at
        )
    )


@router.get("/{case_id}/notes", response_model=APIResponse[List[CaseNoteResponse]])
def get_case_ledger_notes(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches the chronological Investigator Case Management Ledger for the active case.
    """
    check_case_access(db, case_id, current_user, write_required=False)
    notes_data = CaseService.get_case_notes(db, case_id)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(notes_data)} case ledger notes.",
        data=[CaseNoteResponse(**n) for n in notes_data]
    )


@router.delete("/{case_id}", response_model=APIResponse[dict])
def delete_case(
    case_id: str,
    current_user: User = Depends(require_permissions(Permission.CASE_DELETE)),
    db: Session = Depends(get_db)
):
    """
    Deletes an investigation case (Requires Senior Investigator or Admin role).
    """
    CaseService.delete_case(db, case_id, operator_id=current_user.id)
    return APIResponse(success=True, message="Case deleted", data={"case_id": case_id})
