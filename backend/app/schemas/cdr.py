from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class CDRRecordBase(BaseModel):
    calling_number: str
    called_number: str
    imei: Optional[str] = None
    imsi: Optional[str] = None
    call_type: str = "VOICE_CALL"
    start_time: datetime
    duration_sec: int = 0
    cell_tower_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    provider: Optional[str] = None
    raw_payload: Dict[str, Any] = Field(default_factory=dict)


class CDRRecordCreate(CDRRecordBase):
    evidence_id: str


class CDRRecordResponse(CDRRecordBase):
    id: str
    evidence_id: str

    model_config = ConfigDict(from_attributes=True)


class CDRIngestionRequest(BaseModel):
    case_id: str
    records: List[CDRRecordBase]
    evidence_category: str = "CURRENT_CASE_OBSERVED"
    file_name: str = "manual_cdr_entry.json"
    operator_id: str = "IO_OFFICER_01"
