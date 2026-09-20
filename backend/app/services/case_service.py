from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.case import Case
from app.models.case_assignment import CaseAssignment
from app.models.case_note import CaseNote
from app.models.evidence import EvidenceItem
from app.models.user import User
from app.schemas.case import (
    CaseCreate,
    CaseUpdate,
    CaseStatusUpdate,
    CaseAssignmentCreate,
    CaseAssignmentResponse,
    CaseNoteCreate,
    CaseNoteResponse,
    CaseDashboardStats,
)
from app.services.audit_service import AuditService
from app.core.exceptions import CaseNotFoundError


class CaseService:
    @staticmethod
    def create_case(db: Session, case_in: CaseCreate, operator_id: str = "IO_OFFICER_01", current_user_id: Optional[str] = None) -> Case:
        case = Case(
            case_number=case_in.case_number,
            title=case_in.title,
            description=case_in.description,
            crime_category=case_in.crime_category,
            status=case_in.status,
            priority=case_in.priority,
            stage=case_in.stage,
            is_confidential=case_in.is_confidential,
            lead_investigator_id=case_in.lead_investigator_id,
            assigned_lead_user_id=current_user_id or case_in.assigned_lead_user_id,
            investigating_agency=case_in.investigating_agency,
            police_station=case_in.police_station,
            district=case_in.district,
            state=case_in.state,
            tags=case_in.tags,
            case_metadata=case_in.case_metadata
        )
        db.add(case)
        db.commit()
        db.refresh(case)

        # Automatically assign creator/lead to case team
        if current_user_id:
            assignment = CaseAssignment(
                case_id=case.id,
                user_id=current_user_id,
                role_in_case="LEAD_INVESTIGATOR",
                assigned_by_id=current_user_id,
                can_write=True,
                can_export=True
            )
            db.add(assignment)
            db.commit()

        AuditService.log_action(
            db=db,
            action_type="CASE_CREATED",
            resource_type="CASE",
            case_id=case.id,
            resource_id=case.id,
            operator_id=operator_id,
            details={
                "case_number": case.case_number,
                "title": case.title,
                "priority": case.priority,
                "stage": case.stage
            }
        )
        return case

    @staticmethod
    def get_case(db: Session, case_id: str) -> Case:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise CaseNotFoundError(case_id)
        return case

    @staticmethod
    def list_cases(
        db: Session,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        stage: Optional[str] = None,
        crime_category: Optional[str] = None,
        search_query: Optional[str] = None,
        user_id_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Case], int]:
        query = db.query(Case)
        if status:
            query = query.filter(Case.status == status)
        if priority:
            query = query.filter(Case.priority == priority.upper())
        if stage:
            query = query.filter(Case.stage == stage)
        if crime_category:
            query = query.filter(Case.crime_category == crime_category)
        if search_query:
            q = f"%{search_query}%"
            query = query.filter(
                (Case.title.ilike(q)) | (Case.case_number.ilike(q)) | (Case.description.ilike(q))
            )
        if user_id_filter:
            # Case level access filter: Assigned or Lead
            query = query.outerjoin(CaseAssignment).filter(
                (Case.assigned_lead_user_id == user_id_filter) | (CaseAssignment.user_id == user_id_filter)
            )

        total = query.distinct().count()
        cases = query.distinct().order_by(Case.created_at.desc()).offset(offset).limit(limit).all()
        return cases, total

    @staticmethod
    def update_case(db: Session, case_id: str, case_update: CaseUpdate, operator_id: str = "IO_OFFICER_01") -> Case:
        case = CaseService.get_case(db, case_id)
        update_data = case_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(case, field, value)
        
        db.commit()
        db.refresh(case)

        AuditService.log_action(
            db=db,
            action_type="CASE_UPDATED",
            resource_type="CASE",
            case_id=case.id,
            resource_id=case.id,
            operator_id=operator_id,
            details={"updated_fields": list(update_data.keys())}
        )
        return case

    @staticmethod
    def change_case_status(
        db: Session,
        case_id: str,
        status_in: CaseStatusUpdate,
        operator_id: str = "SUPERVISOR_01",
        author_id: Optional[str] = None
    ) -> Case:
        case = CaseService.get_case(db, case_id)
        old_status = case.status
        case.status = status_in.status
        if status_in.stage:
            case.stage = status_in.stage

        db.commit()
        db.refresh(case)

        # If directive or reason is given, record as a case note
        if status_in.reason_or_directive:
            note = CaseNote(
                case_id=case.id,
                author_id=author_id,
                note_type="SUPERVISORY_DIRECTIVE",
                title=f"Status Change to {status_in.status}",
                content=status_in.reason_or_directive
            )
            db.add(note)
            db.commit()

        AuditService.log_action(
            db=db,
            action_type="CASE_STATUS_CHANGED",
            resource_type="CASE",
            case_id=case.id,
            resource_id=case.id,
            operator_id=operator_id,
            details={
                "old_status": old_status,
                "new_status": case.status,
                "stage": case.stage,
                "reason": status_in.reason_or_directive
            }
        )
        return case

    @staticmethod
    def assign_team_member(
        db: Session,
        case_id: str,
        assignment_in: CaseAssignmentCreate,
        operator_id: str = "SUPERVISOR_01",
        supervisor_id: Optional[str] = None
    ) -> CaseAssignment:
        case = CaseService.get_case(db, case_id)
        
        # Check existing assignment
        existing = db.query(CaseAssignment).filter(
            CaseAssignment.case_id == case_id,
            CaseAssignment.user_id == assignment_in.user_id
        ).first()

        if existing:
            existing.role_in_case = assignment_in.role_in_case
            existing.can_write = assignment_in.can_write
            existing.can_export = assignment_in.can_export
            db.commit()
            db.refresh(existing)
            assignment = existing
        else:
            assignment = CaseAssignment(
                case_id=case_id,
                user_id=assignment_in.user_id,
                role_in_case=assignment_in.role_in_case,
                assigned_by_id=supervisor_id,
                can_write=assignment_in.can_write,
                can_export=assignment_in.can_export
            )
            db.add(assignment)
            db.commit()
            db.refresh(assignment)

        AuditService.log_action(
            db=db,
            action_type="CASE_TEAM_ASSIGNED",
            resource_type="CASE_ASSIGNMENT",
            case_id=case.id,
            resource_id=assignment.id,
            operator_id=operator_id,
            details={
                "assigned_user_id": assignment_in.user_id,
                "role_in_case": assignment_in.role_in_case
            }
        )
        return assignment

    @staticmethod
    def get_case_team(db: Session, case_id: str) -> List[Dict[str, Any]]:
        assignments = db.query(CaseAssignment).filter(CaseAssignment.case_id == case_id).all()
        team = []
        for a in assignments:
            u = db.query(User).filter(User.id == a.user_id).first()
            team.append({
                "id": a.id,
                "case_id": a.case_id,
                "user_id": a.user_id,
                "username": u.username if u else "unknown",
                "full_name": u.full_name if u else "Unknown Officer",
                "role_in_case": a.role_in_case,
                "assigned_at": a.assigned_at,
                "can_write": a.can_write,
                "can_export": a.can_export
            })
        return team

    @staticmethod
    def add_case_note(
        db: Session,
        case_id: str,
        note_in: CaseNoteCreate,
        author_id: Optional[str] = None,
        operator_id: str = "IO_OFFICER_01"
    ) -> CaseNote:
        case = CaseService.get_case(db, case_id)
        note = CaseNote(
            case_id=case.id,
            author_id=author_id,
            note_type=note_in.note_type,
            title=note_in.title,
            content=note_in.content
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        AuditService.log_action(
            db=db,
            action_type="CASE_NOTE_ADDED",
            resource_type="CASE_NOTE",
            case_id=case.id,
            resource_id=note.id,
            operator_id=operator_id,
            details={"title": note.title, "note_type": note.note_type}
        )
        return note

    @staticmethod
    def get_case_notes(db: Session, case_id: str) -> List[Dict[str, Any]]:
        notes = db.query(CaseNote).filter(CaseNote.case_id == case_id).order_by(CaseNote.created_at.desc()).all()
        result = []
        for n in notes:
            u = db.query(User).filter(User.id == n.author_id).first() if n.author_id else None
            result.append({
                "id": n.id,
                "case_id": n.case_id,
                "author_id": n.author_id,
                "author_name": u.full_name if u else "Officer Unknown",
                "author_role": u.role if u else "INVESTIGATOR",
                "note_type": n.note_type,
                "title": n.title,
                "content": n.content,
                "created_at": n.created_at,
                "updated_at": n.updated_at
            })
        return result

    @staticmethod
    def get_dashboard_stats(db: Session) -> CaseDashboardStats:
        total_cases = db.query(Case).count()
        active_investigations = db.query(Case).filter(Case.status.in_(["ACTIVE", "ACTIVE_INVESTIGATION"])).count()
        critical_priority = db.query(Case).filter(Case.priority == "CRITICAL").count()
        under_review = db.query(Case).filter(Case.status == "UNDER_REVIEW").count()
        chargesheeted = db.query(Case).filter(Case.status.in_(["CHARGESHEETED", "CHARGESHEET_FILED"])).count()
        total_evidence = db.query(EvidenceItem).count()

        # Category breakdown
        cat_counts = db.query(Case.crime_category, func.count(Case.id)).group_by(Case.crime_category).all()
        categories_dict = {cat: count for cat, count in cat_counts if cat}

        # Priority breakdown
        prio_counts = db.query(Case.priority, func.count(Case.id)).group_by(Case.priority).all()
        priority_dict = {prio: count for prio, count in prio_counts if prio}

        # Stage breakdown
        stage_counts = db.query(Case.stage, func.count(Case.id)).group_by(Case.stage).all()
        stage_dict = {st: count for st, count in stage_counts if st}

        return CaseDashboardStats(
            total_cases=total_cases,
            active_investigations=active_investigations,
            critical_priority_cases=critical_priority,
            under_review_cases=under_review,
            chargesheeted_cases=chargesheeted,
            total_evidence_artifacts=total_evidence,
            cases_by_category=categories_dict,
            cases_by_priority=priority_dict,
            cases_by_stage=stage_dict
        )

    @staticmethod
    def delete_case(db: Session, case_id: str, operator_id: str = "SUPERVISOR_01") -> bool:
        case = CaseService.get_case(db, case_id)
        case_num = case.case_number
        db.delete(case)
        db.commit()

        AuditService.log_action(
            db=db,
            action_type="CASE_DELETED",
            resource_type="CASE",
            case_id=case_id,
            resource_id=case_id,
            operator_id=operator_id,
            details={"case_number": case_num}
        )
        return True
