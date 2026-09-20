from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class EvidenceBase(BaseModel):
    case_id: str
    source_type: str = Field(..., example="CDR", description="CDR, FINANCIAL, FIR, INTERROGATION, DIGITAL_FORENSICS, OSINT, PDF_DOCUMENT")
    evidence_category: str = Field(
        default="CURRENT_CASE_OBSERVED",
        description="CURRENT_CASE_OBSERVED, CURRENT_CASE_INFERRED, HISTORICAL_RECORD, OSINT_UNVERIFIED"
    )
    file_name: str
    ingested_by_operator: str = Field(default="IO_OPERATOR_01")
    seizing_officer: Optional[str] = None
    place_of_seizure: Optional[str] = None
    witness_details: Optional[str] = None
    forensic_extraction_tool: Optional[str] = None
    device_serial_or_imei: Optional[str] = None
    evidence_metadata: Dict[str, Any] = Field(default_factory=dict)
    provenance_metadata: Dict[str, Any] = Field(default_factory=dict)


class EvidenceUploadResponse(BaseModel):
    id: str
    evidence_code: Optional[str] = None
    case_id: str
    source_type: str
    evidence_category: str
    file_name: str
    file_hash_sha256: str
    mime_type: str
    file_size_bytes: int
    seizing_officer: Optional[str] = None
    place_of_seizure: Optional[str] = None
    witness_details: Optional[str] = None
    forensic_extraction_tool: Optional[str] = None
    device_serial_or_imei: Optional[str] = None
    ingested_by_operator: str
    ingestion_timestamp: datetime
    integrity_status: str
    evidence_status: str = "VERIFIED"
    is_admissible: bool
    evidence_metadata: Dict[str, Any] = Field(default_factory=dict)
    provenance_metadata: Dict[str, Any] = Field(default_factory=dict)
    extracted_records_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class EvidenceDetailResponse(BaseModel):
    id: str
    evidence_code: Optional[str] = None
    case_id: str
    source_type: str
    evidence_category: str
    file_name: str
    file_path: Optional[str] = None
    file_hash_sha256: str
    mime_type: str
    file_size_bytes: int
    seizing_officer: Optional[str] = None
    place_of_seizure: Optional[str] = None
    witness_details: Optional[str] = None
    forensic_extraction_tool: Optional[str] = None
    device_serial_or_imei: Optional[str] = None
    ingested_by_operator: str
    ingestion_timestamp: datetime
    integrity_status: str
    evidence_status: str
    last_verified_at: datetime
    is_admissible: bool
    extracted_text_content: Optional[str] = None
    evidence_metadata: Dict[str, Any] = Field(default_factory=dict)
    provenance_metadata: Dict[str, Any] = Field(default_factory=dict)
    entities_count: int = 0
    relationships_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class EvidenceStatusUpdate(BaseModel):
    evidence_status: str = Field(..., description="VERIFIED, PROCESSED_BY_NLP, CHALLENGED_IN_COURT, INADMISSIBLE, ARCHIVED")
    notes: Optional[str] = None


class EvidenceProvenanceUpdate(BaseModel):
    seizing_officer: Optional[str] = None
    place_of_seizure: Optional[str] = None
    witness_details: Optional[str] = None
    forensic_extraction_tool: Optional[str] = None
    device_serial_or_imei: Optional[str] = None
    provenance_metadata: Optional[Dict[str, Any]] = None


class IntegrityCheckResult(BaseModel):
    evidence_id: str
    file_name: str
    stored_hash_sha256: str
    computed_hash_sha256: str
    integrity_status: str # VERIFIED, TAMPERED
    is_valid: bool
    verified_at: datetime
    compliance_certification: str = "Compliant with Section 63 BSA 2023 / Section 65B Indian Evidence Act"
