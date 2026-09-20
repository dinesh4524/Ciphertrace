from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class InterrogationReportBase(BaseModel):
    suspect_or_witness_name: str
    alias_names: List[str] = Field(default_factory=list)
    role_in_case: str = "SUSPECT"
    interrogating_officer: Optional[str] = None
    interrogation_date: datetime = Field(default_factory=datetime.utcnow)
    location: Optional[str] = None
    key_admissions: List[str] = Field(default_factory=list)
    raw_transcript: str


class InterrogationReportCreate(InterrogationReportBase):
    evidence_id: str


class InterrogationReportResponse(InterrogationReportBase):
    id: str
    evidence_id: str

    model_config = ConfigDict(from_attributes=True)


class InterrogationIngestionRequest(BaseModel):
    case_id: str
    report_data: InterrogationReportBase
    evidence_category: str = "CURRENT_CASE_OBSERVED"
    file_name: str = "interrogation_memo.json"
    operator_id: str = "IO_OFFICER_01"
