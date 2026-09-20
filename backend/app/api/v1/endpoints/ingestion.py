from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.common import APIResponse
from app.services.ingestion_service import IngestionService

router = APIRouter()


@router.post("/cdr/upload", response_model=APIResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def upload_and_ingest_cdr(
    case_id: str = Form(...),
    evidence_category: str = Form("CURRENT_CASE_OBSERVED", description="CURRENT_CASE_OBSERVED, HISTORICAL_RECORD"),
    operator_id: str = Form("IO_OPERATOR_01"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Ingests a Call Detail Record (CDR) CSV file, parses telecom records,
    computes SHA-256 hash, and populates CDR tables and Evidence Fabric.
    """
    content = await file.read()
    result = IngestionService.ingest_cdr_file(
        db=db,
        case_id=case_id,
        file_name=file.filename or "cdr_records.csv",
        file_content=content,
        evidence_category=evidence_category,
        operator_id=operator_id
    )
    return APIResponse(
        success=True,
        message=f"CDR ingestion complete. {result['records_extracted']} call records extracted and verified.",
        data=result
    )


@router.post("/financial/upload", response_model=APIResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def upload_and_ingest_financial(
    case_id: str = Form(...),
    evidence_category: str = Form("CURRENT_CASE_OBSERVED", description="CURRENT_CASE_OBSERVED, HISTORICAL_RECORD"),
    operator_id: str = Form("IO_OPERATOR_01"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Ingests a Banking / Mule Account / Hawala Transaction CSV file,
    computes SHA-256 hash, and populates Financial records.
    """
    content = await file.read()
    result = IngestionService.ingest_financial_file(
        db=db,
        case_id=case_id,
        file_name=file.filename or "bank_transactions.csv",
        file_content=content,
        evidence_category=evidence_category,
        operator_id=operator_id
    )
    return APIResponse(
        success=True,
        message=f"Financial statement ingestion complete. {result['records_extracted']} transactions stored.",
        data=result
    )


@router.post("/fir/upload", response_model=APIResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def upload_and_ingest_fir(
    case_id: str = Form(...),
    evidence_category: str = Form("CURRENT_CASE_OBSERVED"),
    operator_id: str = Form("IO_OPERATOR_01"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Ingests a First Information Report (FIR) document in JSON or Plain Text format.
    """
    content = await file.read()
    filename = file.filename or "fir_document.txt"
    is_json = filename.lower().endswith(".json") or (file.content_type and "json" in file.content_type)
    
    result = IngestionService.ingest_fir(
        db=db,
        case_id=case_id,
        file_name=filename,
        file_content=content,
        is_json=is_json,
        evidence_category=evidence_category,
        operator_id=operator_id
    )
    return APIResponse(
        success=True,
        message=f"FIR document {result['fir_number']} registered into case evidence fabric.",
        data=result
    )


@router.post("/interrogation", response_model=APIResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
def ingest_interrogation_narrative(
    case_id: str = Query(...),
    suspect_name: str = Query(...),
    role_in_case: str = Query("SUSPECT", description="SUSPECT, WITNESS, CO-ACCUSED, INFORMANT"),
    interrogating_officer: Optional[str] = Query(None),
    raw_transcript: str = Form(...),
    evidence_category: str = Query("CURRENT_CASE_OBSERVED"),
    operator_id: str = Query("IO_OPERATOR_01"),
    db: Session = Depends(get_db)
):
    """
    Ingests an Interrogation Transcript or Witness Statement into the evidence fabric.
    """
    result = IngestionService.ingest_interrogation_memo(
        db=db,
        case_id=case_id,
        suspect_name=suspect_name,
        raw_text=raw_transcript,
        role_in_case=role_in_case,
        interrogating_officer=interrogating_officer,
        evidence_category=evidence_category,
        operator_id=operator_id
    )
    return APIResponse(
        success=True,
        message=f"Interrogation statement for {suspect_name} registered into evidence fabric.",
        data=result
    )
