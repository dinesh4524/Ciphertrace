from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, check_case_access
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limiter import rate_limit
from app.core.input_guard import validate_filename
from app.core.security_logger import log_security_event, SecurityEventType
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.evidence import (
    EvidenceDetailResponse,
    EvidenceProvenanceUpdate,
    EvidenceStatusUpdate,
    EvidenceUploadResponse,
    IntegrityCheckResult,
)
from app.services.evidence_service import EvidenceService

router = APIRouter()


@router.post("/upload", response_model=APIResponse[EvidenceUploadResponse], status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit("ingest"))])
async def upload_evidence(
    case_id: str = Form(...),
    source_type: str = Form(..., description="CDR, FINANCIAL, FIR, INTERROGATION, DIGITAL_FORENSICS, OSINT, PDF_DOCUMENT"),
    evidence_category: str = Form(
        "CURRENT_CASE_OBSERVED",
        description="CURRENT_CASE_OBSERVED, CURRENT_CASE_INFERRED, HISTORICAL_RECORD, OSINT_UNVERIFIED"
    ),
    seizing_officer: Optional[str] = Form(None),
    place_of_seizure: Optional[str] = Form(None),
    witness_details: Optional[str] = Form(None),
    forensic_extraction_tool: Optional[str] = Form(None),
    device_serial_or_imei: Optional[str] = Form(None),
    operator_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Direct multi-part upload endpoint that registers any evidence artifact in the Evidence Fabric,
    calculates cryptographic SHA-256 at entry, extracts text if PDF/doc, logs chain of custody, and attaches it to the case.
    """
    check_case_access(db, current_user, case_id)

    # Path traversal and filename validation
    guard = validate_filename(file.filename or "unknown_evidence.bin")
    if guard.is_rejected:
        ip_addr = request.client.host if (request and request.client) else "127.0.0.1"
        log_security_event(
            event_type=SecurityEventType.SUSPICIOUS_INPUT,
            user_id=str(current_user.id),
            ip_address=ip_addr,
            endpoint="/api/v1/evidence/upload",
            details={"violations": guard.violations, "raw_filename": file.filename},
            severity="WARNING"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=guard.rejection_reason or "Filename contains illegal characters or path traversal sequences."
        )

    operator = operator_id or current_user.username
    content = await file.read()

    # Max upload size enforcement
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    evidence_item = EvidenceService.register_evidence(
        db=db,
        case_id=case_id,
        source_type=source_type,
        file_name=guard.clean_text,
        file_content=content,
        evidence_category=evidence_category,
        operator_id=operator,
        mime_type=file.content_type or "application/octet-stream",
        seizing_officer=seizing_officer,
        place_of_seizure=place_of_seizure,
        witness_details=witness_details,
        forensic_extraction_tool=forensic_extraction_tool,
        device_serial_or_imei=device_serial_or_imei
    )

    return APIResponse(
        success=True,
        message=f"Evidence [{evidence_item.evidence_code}] '{file.filename}' securely registered with SHA-256: {evidence_item.file_hash_sha256}",
        data=EvidenceUploadResponse.model_validate(evidence_item)
    )


@router.get("/case/{case_id}", response_model=APIResponse[List[EvidenceUploadResponse]])
def list_evidence_by_case(
    case_id: str,
    source_type: Optional[str] = Query(None),
    evidence_category: Optional[str] = Query(None),
    evidence_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all evidence items anchored to a specific criminal case with SHA-256 verification details and search filtering.
    """
    check_case_access(db, current_user, case_id)
    items = EvidenceService.list_evidence_by_case(
        db=db,
        case_id=case_id,
        source_type=source_type,
        evidence_category=evidence_category,
        evidence_status=evidence_status,
        search_query=search
    )
    data = [EvidenceUploadResponse.model_validate(item) for item in items]
    return APIResponse(
        success=True,
        message=f"Retrieved {len(data)} evidence artifacts for case {case_id}",
        data=data
    )


@router.get("/{evidence_id}", response_model=APIResponse[EvidenceDetailResponse])
def get_evidence_details(
    evidence_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches individual evidence metadata, custody status, extracted text content, and extracted intelligence counts.
    """
    detail = EvidenceService.get_evidence_detail(db, evidence_id)
    check_case_access(db, current_user, detail.case_id)
    return APIResponse(success=True, message="Evidence details retrieved", data=detail)


@router.patch("/{evidence_id}/status", response_model=APIResponse[EvidenceUploadResponse])
def update_evidence_status(
    evidence_id: str,
    payload: EvidenceStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the evidentiary lifecycle status (e.g. VERIFIED, PROCESSED_BY_NLP, CHALLENGED_IN_COURT, INADMISSIBLE).
    """
    item = EvidenceService.get_evidence(db, evidence_id)
    check_case_access(db, current_user, item.case_id)
    updated = EvidenceService.update_evidence_status(
        db=db,
        evidence_id=evidence_id,
        new_status=payload.evidence_status,
        notes=payload.notes,
        operator_id=current_user.username
    )
    return APIResponse(success=True, message="Evidence status updated", data=EvidenceUploadResponse.model_validate(updated))


@router.patch("/{evidence_id}/provenance", response_model=APIResponse[EvidenceUploadResponse])
def update_evidence_provenance(
    evidence_id: str,
    payload: EvidenceProvenanceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates chain of custody provenance details (seizing officer, place of seizure, witness details, extraction tool).
    """
    item = EvidenceService.get_evidence(db, evidence_id)
    check_case_access(db, current_user, item.case_id)
    updated = EvidenceService.update_provenance(
        db=db,
        evidence_id=evidence_id,
        seizing_officer=payload.seizing_officer,
        place_of_seizure=payload.place_of_seizure,
        witness_details=payload.witness_details,
        forensic_extraction_tool=payload.forensic_extraction_tool,
        device_serial_or_imei=payload.device_serial_or_imei,
        provenance_metadata=payload.provenance_metadata,
        operator_id=current_user.username
    )
    return APIResponse(success=True, message="Evidence provenance updated", data=EvidenceUploadResponse.model_validate(updated))


@router.post("/verify-integrity/{evidence_id}", response_model=APIResponse[IntegrityCheckResult])
def verify_evidence_integrity_endpoint(
    evidence_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Performs on-demand cryptographic Section 65B/63 BSA hash verification of an evidence artifact.
    Re-calculates the on-disk file SHA-256 and compares against initial ingress registration hash.
    """
    item = EvidenceService.get_evidence(db, evidence_id)
    check_case_access(db, current_user, item.case_id)
    result = EvidenceService.verify_integrity(db=db, evidence_id=evidence_id, operator_id=current_user.username)
    msg = "Evidence integrity VERIFIED — matches registered cryptographic digest." if result.is_valid else "ALERT: Evidence hash MISMATCH. Possible tampering or corruption."
    return APIResponse(success=result.is_valid, message=msg, data=result)
