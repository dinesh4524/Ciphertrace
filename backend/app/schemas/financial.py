from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class FinancialRecordBase(BaseModel):
    sender_account: str
    receiver_account: str
    sender_bank: Optional[str] = None
    receiver_bank: Optional[str] = None
    amount: float
    currency: str = "INR"
    txn_type: str = "NEFT/RTGS/IMPS"
    utr_reference: Optional[str] = None
    timestamp: datetime
    channel: Optional[str] = None
    remarks: Optional[str] = None
    raw_payload: Dict[str, Any] = Field(default_factory=dict)


class FinancialRecordCreate(FinancialRecordBase):
    evidence_id: str


class FinancialRecordResponse(FinancialRecordBase):
    id: str
    evidence_id: str

    model_config = ConfigDict(from_attributes=True)


class FinancialIngestionRequest(BaseModel):
    case_id: str
    records: List[FinancialRecordBase]
    evidence_category: str = "CURRENT_CASE_OBSERVED"
    file_name: str = "manual_financial_entry.json"
    operator_id: str = "IO_OFFICER_01"
