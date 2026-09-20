import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.exceptions import EvidenceNotFoundError, IntegrityVerificationFailedError
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.schemas.evidence import EvidenceDetailResponse, IntegrityCheckResult
from app.services.audit_service import AuditService
from app.utils.crypto import calculate_bytes_sha256, calculate_file_sha256, verify_evidence_integrity
from app.utils.document_processor import extract_text_from_pdf, clean_and_preprocess_text


class EvidenceService:
    @staticmethod
    def generate_evidence_code(db: Session, case_id: Optional[str] = None) -> str:
        total_count = db.query(EvidenceItem).count() + 1
        year = datetime.utcnow().year
        code = f"EVID-{year}-{total_count:05d}"
        attempts = 0
        while db.query(EvidenceItem).filter(EvidenceItem.evidence_code == code).first() is not None:
            attempts += 1
            code = f"EVID-{year}-{(total_count + attempts):05d}"
        return code

    @staticmethod
    def register_evidence(
        db: Session,
        case_id: str,
        source_type: str,
        file_name: str,
        file_content: bytes,
        evidence_category: str = "CURRENT_CASE_OBSERVED",
        operator_id: str = "IO_OPERATOR_01",
        mime_type: str = "application/octet-stream",
        seizing_officer: Optional[str] = None,
        place_of_seizure: Optional[str] = None,
        witness_details: Optional[str] = None,
        forensic_extraction_tool: Optional[str] = None,
        device_serial_or_imei: Optional[str] = None,
        metadata: Optional[dict] = None,
        provenance_metadata: Optional[dict] = None
    ) -> EvidenceItem:
        """
        Ingests a raw evidence payload into the Evidence Fabric:
        1. Calculates SHA-256 hash at ingress point (Section 63 BSA / Section 65B Indian Evidence Act compliance).
        2. Assigns standard Evidence Code and saves raw artifact to secure case storage.
        3. If PDF or Text document, extracts and caches raw text content for downstream NLP pipelines.
        4. Logs immutable audit event.
        """
        sha256_hash = calculate_bytes_sha256(file_content)
        file_size = len(file_content)
        
        evidence_id = str(uuid.uuid4())
        safe_case_dir = os.path.join(settings.UPLOAD_DIR, case_id)
        os.makedirs(safe_case_dir, exist_ok=True)
        
        storage_file_name = f"{evidence_id}_{file_name}"
        file_path = os.path.join(safe_case_dir, storage_file_name)
        
        with open(file_path, "wb") as f:
            f.write(file_content)

        # Extract text for PDF / TXT / JSON documents if applicable
        extracted_text = None
        extra_meta = metadata or {}
        
        if file_name.lower().endswith(".pdf") or mime_type == "application/pdf":
            text, pdf_meta = extract_text_from_pdf(file_content)
            extracted_text = clean_and_preprocess_text(text)
            extra_meta = {**extra_meta, **pdf_meta}
        elif file_name.lower().endswith((".txt", ".json", ".csv", ".log")):
            try:
                extracted_text = clean_and_preprocess_text(file_content.decode("utf-8", errors="ignore"))
            except Exception:
                pass

        evidence_code = EvidenceService.generate_evidence_code(db, case_id)
        now = datetime.utcnow()

        evidence_item = EvidenceItem(
            id=evidence_id,
            evidence_code=evidence_code,
            case_id=case_id,
            source_type=source_type.upper(),
            evidence_category=evidence_category.upper(),
            file_name=file_name,
            file_path=file_path,
            file_hash_sha256=sha256_hash,
            mime_type=mime_type,
            file_size_bytes=file_size,
            seizing_officer=seizing_officer,
            place_of_seizure=place_of_seizure,
            witness_details=witness_details,
            forensic_extraction_tool=forensic_extraction_tool,
            device_serial_or_imei=device_serial_or_imei,
            ingested_by_operator=operator_id,
            ingestion_timestamp=now,
            integrity_status="VERIFIED",
            evidence_status="VERIFIED",
            last_verified_at=now,
            is_admissible=True,
            extracted_text_content=extracted_text,
            evidence_metadata=extra_meta,
            provenance_metadata=provenance_metadata or {}
        )
        db.add(evidence_item)
        db.commit()
        db.refresh(evidence_item)

        # Audit trail
        AuditService.log_action(
            db=db,
            action_type="EVIDENCE_INGESTED",
            resource_type=f"EVIDENCE_{source_type.upper()}",
            case_id=case_id,
            resource_id=evidence_id,
            operator_id=operator_id,
            details={
                "evidence_code": evidence_code,
                "file_name": file_name,
                "file_hash_sha256": sha256_hash,
                "file_size_bytes": file_size,
                "seizing_officer": seizing_officer,
                "place_of_seizure": place_of_seizure,
                "evidence_category": evidence_category
            }
        )

        return evidence_item

    @staticmethod
    def get_evidence(db: Session, evidence_id: str) -> EvidenceItem:
        evidence = db.query(EvidenceItem).filter(EvidenceItem.id == evidence_id).first()
        if not evidence:
            raise EvidenceNotFoundError(evidence_id)
        return evidence

    @staticmethod
    def get_evidence_detail(db: Session, evidence_id: str) -> EvidenceDetailResponse:
        evidence = EvidenceService.get_evidence(db, evidence_id)
        entities_count = db.query(ExtractedEntity).filter(ExtractedEntity.evidence_id == evidence_id).count()
        relationships_count = db.query(ExtractedRelationship).filter(ExtractedRelationship.evidence_id == evidence_id).count()

        return EvidenceDetailResponse(
            id=evidence.id,
            evidence_code=evidence.evidence_code,
            case_id=evidence.case_id,
            source_type=evidence.source_type,
            evidence_category=evidence.evidence_category,
            file_name=evidence.file_name,
            file_path=evidence.file_path,
            file_hash_sha256=evidence.file_hash_sha256,
            mime_type=evidence.mime_type,
            file_size_bytes=evidence.file_size_bytes,
            seizing_officer=evidence.seizing_officer,
            place_of_seizure=evidence.place_of_seizure,
            witness_details=evidence.witness_details,
            forensic_extraction_tool=evidence.forensic_extraction_tool,
            device_serial_or_imei=evidence.device_serial_or_imei,
            ingested_by_operator=evidence.ingested_by_operator,
            ingestion_timestamp=evidence.ingestion_timestamp,
            integrity_status=evidence.integrity_status,
            evidence_status=evidence.evidence_status,
            last_verified_at=evidence.last_verified_at,
            is_admissible=evidence.is_admissible,
            extracted_text_content=evidence.extracted_text_content,
            evidence_metadata=evidence.evidence_metadata or {},
            provenance_metadata=evidence.provenance_metadata or {},
            entities_count=entities_count,
            relationships_count=relationships_count
        )

    @staticmethod
    def list_evidence_by_case(
        db: Session,
        case_id: str,
        source_type: Optional[str] = None,
        evidence_category: Optional[str] = None,
        evidence_status: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[EvidenceItem]:
        query = db.query(EvidenceItem).filter(EvidenceItem.case_id == case_id)
        if source_type:
            query = query.filter(EvidenceItem.source_type == source_type.upper())
        if evidence_category:
            query = query.filter(EvidenceItem.evidence_category == evidence_category.upper())
        if evidence_status:
            query = query.filter(EvidenceItem.evidence_status == evidence_status.upper())
        if search_query:
            term = f"%{search_query.strip()}%"
            query = query.filter(
                or_(
                    EvidenceItem.file_name.ilike(term),
                    EvidenceItem.evidence_code.ilike(term),
                    EvidenceItem.seizing_officer.ilike(term),
                    EvidenceItem.place_of_seizure.ilike(term),
                    EvidenceItem.extracted_text_content.ilike(term)
                )
            )
        return query.order_by(EvidenceItem.ingestion_timestamp.desc()).all()

    @staticmethod
    def update_evidence_status(
        db: Session,
        evidence_id: str,
        new_status: str,
        notes: Optional[str] = None,
        operator_id: str = "investigator_sharma"
    ) -> EvidenceItem:
        evidence = EvidenceService.get_evidence(db, evidence_id)
        old_status = evidence.evidence_status
        evidence.evidence_status = new_status.upper()
        if new_status.upper() == "INADMISSIBLE":
            evidence.is_admissible = False
        db.commit()
        db.refresh(evidence)

        AuditService.log_action(
            db=db,
            action_type="EVIDENCE_STATUS_UPDATED",
            resource_type="EVIDENCE",
            case_id=evidence.case_id,
            resource_id=evidence.id,
            operator_id=operator_id,
            details={
                "old_status": old_status,
                "new_status": new_status.upper(),
                "notes": notes
            }
        )
        return evidence

    @staticmethod
    def update_provenance(
        db: Session,
        evidence_id: str,
        seizing_officer: Optional[str] = None,
        place_of_seizure: Optional[str] = None,
        witness_details: Optional[str] = None,
        forensic_extraction_tool: Optional[str] = None,
        device_serial_or_imei: Optional[str] = None,
        provenance_metadata: Optional[dict] = None,
        operator_id: str = "investigator_sharma"
    ) -> EvidenceItem:
        evidence = EvidenceService.get_evidence(db, evidence_id)
        if seizing_officer is not None:
            evidence.seizing_officer = seizing_officer
        if place_of_seizure is not None:
            evidence.place_of_seizure = place_of_seizure
        if witness_details is not None:
            evidence.witness_details = witness_details
        if forensic_extraction_tool is not None:
            evidence.forensic_extraction_tool = forensic_extraction_tool
        if device_serial_or_imei is not None:
            evidence.device_serial_or_imei = device_serial_or_imei
        if provenance_metadata is not None:
            evidence.provenance_metadata = {**(evidence.provenance_metadata or {}), **provenance_metadata}

        db.commit()
        db.refresh(evidence)

        AuditService.log_action(
            db=db,
            action_type="EVIDENCE_PROVENANCE_UPDATED",
            resource_type="EVIDENCE",
            case_id=evidence.case_id,
            resource_id=evidence.id,
            operator_id=operator_id,
            details={"updated_fields": ["seizing_officer", "place_of_seizure", "witness_details", "forensic_extraction_tool"]}
        )
        return evidence

    @staticmethod
    def verify_integrity(
        db: Session,
        evidence_id: str,
        operator_id: str = "IO_OPERATOR_01"
    ) -> IntegrityCheckResult:
        """
        Executes real-time Section 65B/63 BSA hash verification against on-disk evidence payload.
        """
        evidence = EvidenceService.get_evidence(db, evidence_id)
        
        if not evidence.file_path or not os.path.exists(evidence.file_path):
            computed_hash = "FILE_NOT_FOUND_ON_DISK"
            is_valid = False
        else:
            computed_hash = calculate_file_sha256(evidence.file_path)
            is_valid = (computed_hash.lower() == evidence.file_hash_sha256.lower())

        status_str = "VERIFIED" if is_valid else "TAMPERED"
        evidence.integrity_status = status_str
        evidence.last_verified_at = datetime.utcnow()
        db.commit()

        # Audit the verification action
        AuditService.log_action(
            db=db,
            action_type="INTEGRITY_VERIFICATION",
            resource_type="EVIDENCE",
            case_id=evidence.case_id,
            resource_id=evidence.id,
            operator_id=operator_id,
            details={
                "evidence_code": evidence.evidence_code,
                "stored_hash": evidence.file_hash_sha256,
                "computed_hash": computed_hash,
                "is_valid": is_valid,
                "status": status_str
            }
        )

        return IntegrityCheckResult(
            evidence_id=evidence.id,
            file_name=evidence.file_name,
            stored_hash_sha256=evidence.file_hash_sha256,
            computed_hash_sha256=computed_hash,
            integrity_status=status_str,
            is_valid=is_valid,
            verified_at=evidence.last_verified_at,
            compliance_certification="Compliant with Section 63 BSA 2023 / Section 65B Indian Evidence Act"
        )
