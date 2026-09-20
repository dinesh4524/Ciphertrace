from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class FIRDocumentBase(BaseModel):
    fir_number: str
    police_station: str
    district: Optional[str] = None
    state: Optional[str] = None
    sections_invoked: List[str] = Field(default_factory=list)
    incident_date: Optional[datetime] = None
    filing_date: datetime = Field(default_factory=datetime.utcnow)
    complainant_details: Dict[str, Any] = Field(default_factory=dict)
    accused_named: List[str] = Field(default_factory=list)
    informant_narrative: Optional[str] = None
    raw_text: str


class FIRDocumentCreate(FIRDocumentBase):
    evidence_id: str


class FIRDocumentResponse(FIRDocumentBase):
    id: str
    evidence_id: str

    model_config = ConfigDict(from_attributes=True)


class FIRIngestionRequest(BaseModel):
    case_id: str
    fir_data: FIRDocumentBase
    evidence_category: str = "CURRENT_CASE_OBSERVED"
    file_name: str = "fir_document.json"
    operator_id: str = "IO_OFFICER_01"
