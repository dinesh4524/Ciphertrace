from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, ConfigDict


class AuditLogBase(BaseModel):
    case_id: Optional[str] = None
    operator_id: str = "IO_OFFICER_01"
    operator_role: str = "INVESTIGATING_OFFICER"
    action_type: str = Field(..., example="EVIDENCE_INGESTION")
    resource_type: str = Field(..., example="CDR_EVIDENCE")
    resource_id: Optional[str] = None
    ip_address: str = "127.0.0.1"
    details_json: Dict[str, Any] = Field(default_factory=dict)


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogResponse(AuditLogBase):
    id: str
    timestamp: datetime
    entry_hash_sha256: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
