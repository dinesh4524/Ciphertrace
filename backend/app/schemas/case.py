from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class CaseBase(BaseModel):
    case_number: str = Field(..., example="CASE-2026-DEL-CYBER-0089")
    title: str = Field(..., example="Operation ShadowLedger: Multi-State Hawala & Mule Network")
    description: Optional[str] = Field(None, example="Syndicate laundering cyber fraud proceeds via mule accounts.")
    crime_category: str = Field(default="ORGANIZED_CYBER_FRAUD", example="ORGANIZED_CYBER_FRAUD")
    status: str = Field(default="ACTIVE_INVESTIGATION", example="ACTIVE_INVESTIGATION")
    priority: str = Field(default="HIGH", example="HIGH") # CRITICAL, HIGH, MEDIUM, LOW
    stage: str = Field(default="EVIDENCE_COLLECTION", example="EVIDENCE_COLLECTION")
    is_confidential: bool = Field(default=False, example=False)
    lead_investigator_id: Optional[str] = Field(default="IO-7492-INSP-SHARMA", example="IO-7492-INSP-SHARMA")
    assigned_lead_user_id: Optional[str] = None
    investigating_agency: str = Field(default="State Cyber Police Station / CID")
    police_station: Optional[str] = Field(None, example="Cyber Crime PS, Cyberabad")
    district: Optional[str] = Field(None, example="Hyderabad")
    state: Optional[str] = Field(None, example="Telangana")
    tags: List[str] = Field(default_factory=list, example=["hawala", "mule_accounts", "sim_box"])
    case_metadata: Dict[str, Any] = Field(default_factory=dict)


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    crime_category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    stage: Optional[str] = None
    is_confidential: Optional[bool] = None
    lead_investigator_id: Optional[str] = None
    assigned_lead_user_id: Optional[str] = None
    police_station: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    tags: Optional[List[str]] = None
    case_metadata: Optional[Dict[str, Any]] = None


class CaseStatusUpdate(BaseModel):
    status: str = Field(..., example="CHARGESHEETED")
    stage: Optional[str] = Field(None, example="CHARGESHEET_PREPARATION")
    reason_or_directive: Optional[str] = Field(None, example="Forensic audits and CDR links concluded. Chargesheet approved by Senior IO.")


class CaseAssignmentCreate(BaseModel):
    user_id: str = Field(..., example="usr_uuid_123")
    role_in_case: str = Field(default="ASSISTANT_IO", example="FORENSIC_LEAD")
    can_write: bool = True
    can_export: bool = True


class CaseAssignmentResponse(BaseModel):
    id: str
    case_id: str
    user_id: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    role_in_case: str
    assigned_at: datetime
    can_write: bool
    can_export: bool

    model_config = ConfigDict(from_attributes=True)


class CaseNoteCreate(BaseModel):
    note_type: str = Field(default="GENERAL", example="SUPERVISORY_DIRECTIVE")
    title: str = Field(..., example="Directive on Mule Account Subpoenas")
    content: str = Field(..., example="Ensure Section 91 CrPC / 94 BNSS notices are served to nodal bank officers immediately.")


class CaseNoteResponse(BaseModel):
    id: str
    case_id: str
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    note_type: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CaseResponse(CaseBase):
    id: str
    created_at: datetime
    updated_at: datetime
    evidence_count: Optional[int] = 0
    team_members_count: Optional[int] = 0
    assigned_team: List[CaseAssignmentResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CaseDashboardStats(BaseModel):
    total_cases: int = 0
    active_investigations: int = 0
    critical_priority_cases: int = 0
    under_review_cases: int = 0
    chargesheeted_cases: int = 0
    total_evidence_artifacts: int = 0
    cases_by_category: Dict[str, int] = Field(default_factory=dict)
    cases_by_priority: Dict[str, int] = Field(default_factory=dict)
    cases_by_stage: Dict[str, int] = Field(default_factory=dict)
