import json
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.cdr import CDRRecord
from app.models.evidence import EvidenceItem
from app.models.financial import FinancialRecord
from app.models.fir import FIRDocument
from app.models.interrogation import InterrogationReport
from app.schemas.cdr import CDRIngestionRequest
from app.schemas.financial import FinancialIngestionRequest
from app.schemas.fir import FIRIngestionRequest
from app.schemas.interrogation import InterrogationIngestionRequest
from app.services.evidence_service import EvidenceService
from app.utils.parsers import parse_cdr_csv, parse_financial_csv, parse_fir_payload


class IngestionService:
    @staticmethod
    def ingest_cdr_file(
        db: Session,
        case_id: str,
        file_name: str,
        file_content: bytes,
        evidence_category: str = "CURRENT_CASE_OBSERVED",
        operator_id: str = "IO_OPERATOR_01"
    ) -> Dict[str, Any]:
        """
        Parses CDR CSV bytes, registers evidence item in the Evidence Fabric,
        and saves normalized CDR records.
        """
        # 1. Register evidence artifact
        evidence = EvidenceService.register_evidence(
            db=db,
            case_id=case_id,
            source_type="CDR",
            file_name=file_name,
            file_content=file_content,
            evidence_category=evidence_category,
            operator_id=operator_id,
            mime_type="text/csv"
        )

        # 2. Parse records
        parsed_records = parse_cdr_csv(file_content)
        cdr_objects = []
        for rec in parsed_records:
            cdr = CDRRecord(
                evidence_id=evidence.id,
                calling_number=rec["calling_number"],
                called_number=rec["called_number"],
                imei=rec.get("imei"),
                imsi=rec.get("imsi"),
                call_type=rec.get("call_type", "VOICE_CALL"),
                start_time=rec["start_time"],
                duration_sec=rec.get("duration_sec", 0),
                cell_tower_id=rec.get("cell_tower_id"),
                latitude=rec.get("latitude"),
                longitude=rec.get("longitude"),
                provider=rec.get("provider"),
                raw_payload=rec.get("raw_payload", {})
            )
            cdr_objects.append(cdr)

        if cdr_objects:
            db.bulk_save_objects(cdr_objects)
            db.commit()

        return {
            "evidence_id": evidence.id,
            "case_id": case_id,
            "file_name": file_name,
            "file_hash_sha256": evidence.file_hash_sha256,
            "source_type": "CDR",
            "evidence_category": evidence_category,
            "records_extracted": len(cdr_objects),
            "integrity_status": evidence.integrity_status
        }

    @staticmethod
    def ingest_financial_file(
        db: Session,
        case_id: str,
        file_name: str,
        file_content: bytes,
        evidence_category: str = "CURRENT_CASE_OBSERVED",
        operator_id: str = "IO_OPERATOR_01"
    ) -> Dict[str, Any]:
        """
        Parses Financial Ledger CSV bytes, registers evidence, and saves transactions.
        """
        evidence = EvidenceService.register_evidence(
            db=db,
            case_id=case_id,
            source_type="FINANCIAL",
            file_name=file_name,
            file_content=file_content,
            evidence_category=evidence_category,
            operator_id=operator_id,
            mime_type="text/csv"
        )

        parsed_txns = parse_financial_csv(file_content)
        txn_objects = []
        for rec in parsed_txns:
            txn = FinancialRecord(
                evidence_id=evidence.id,
                sender_account=rec["sender_account"],
                receiver_account=rec["receiver_account"],
                sender_bank=rec.get("sender_bank"),
                receiver_bank=rec.get("receiver_bank"),
                amount=rec["amount"],
                currency="INR",
                txn_type=rec.get("txn_type", "NEFT/RTGS/IMPS"),
                utr_reference=rec.get("utr_reference"),
                timestamp=rec["timestamp"],
                channel=rec.get("channel"),
                remarks=rec.get("remarks"),
                raw_payload=rec.get("raw_payload", {})
            )
            txn_objects.append(txn)

        if txn_objects:
            db.bulk_save_objects(txn_objects)
            db.commit()

        return {
            "evidence_id": evidence.id,
            "case_id": case_id,
            "file_name": file_name,
            "file_hash_sha256": evidence.file_hash_sha256,
            "source_type": "FINANCIAL",
            "evidence_category": evidence_category,
            "records_extracted": len(txn_objects),
            "integrity_status": evidence.integrity_status
        }

    @staticmethod
    def ingest_fir(
        db: Session,
        case_id: str,
        file_name: str,
        file_content: bytes,
        is_json: bool = False,
        evidence_category: str = "CURRENT_CASE_OBSERVED",
        operator_id: str = "IO_OPERATOR_01"
    ) -> Dict[str, Any]:
        """
        Ingests and normalizes an FIR document (JSON or Police Text format).
        """
        evidence = EvidenceService.register_evidence(
            db=db,
            case_id=case_id,
            source_type="FIR",
            file_name=file_name,
            file_content=file_content,
            evidence_category=evidence_category,
            operator_id=operator_id,
            mime_type="application/json" if is_json else "text/plain"
        )

        parsed_fir = parse_fir_payload(file_content, is_json=is_json)
        fir_doc = FIRDocument(
            evidence_id=evidence.id,
            fir_number=parsed_fir["fir_number"],
            police_station=parsed_fir["police_station"],
            district=parsed_fir.get("district"),
            state=parsed_fir.get("state"),
            sections_invoked=parsed_fir.get("sections_invoked", []),
            incident_date=parsed_fir.get("incident_date"),
            filing_date=parsed_fir.get("filing_date"),
            complainant_details=parsed_fir.get("complainant_details", {}),
            accused_named=parsed_fir.get("accused_named", []),
            informant_narrative=parsed_fir.get("informant_narrative"),
            raw_text=parsed_fir["raw_text"]
        )
        db.add(fir_doc)
        db.commit()
        db.refresh(fir_doc)

        return {
            "evidence_id": evidence.id,
            "case_id": case_id,
            "fir_id": fir_doc.id,
            "fir_number": fir_doc.fir_number,
            "sections_invoked": fir_doc.sections_invoked,
            "file_hash_sha256": evidence.file_hash_sha256,
            "source_type": "FIR",
            "integrity_status": evidence.integrity_status
        }

    @staticmethod
    def ingest_interrogation_memo(
        db: Session,
        case_id: str,
        suspect_name: str,
        raw_text: str,
        alias_names: Optional[List[str]] = None,
        role_in_case: str = "SUSPECT",
        interrogating_officer: Optional[str] = None,
        location: Optional[str] = None,
        key_admissions: Optional[List[str]] = None,
        evidence_category: str = "CURRENT_CASE_OBSERVED",
        operator_id: str = "IO_OPERATOR_01"
    ) -> Dict[str, Any]:
        """
        Ingests an interrogation transcript or memo into evidence fabric.
        """
        file_content = raw_text.encode("utf-8")
        file_name = f"interrogation_{suspect_name.replace(' ', '_').lower()}.txt"

        evidence = EvidenceService.register_evidence(
            db=db,
            case_id=case_id,
            source_type="INTERROGATION",
            file_name=file_name,
            file_content=file_content,
            evidence_category=evidence_category,
            operator_id=operator_id,
            mime_type="text/plain"
        )

        memo = InterrogationReport(
            evidence_id=evidence.id,
            suspect_or_witness_name=suspect_name,
            alias_names=alias_names or [],
            role_in_case=role_in_case,
            interrogating_officer=interrogating_officer,
            location=location,
            key_admissions=key_admissions or [],
            raw_transcript=raw_text
        )
        db.add(memo)
        db.commit()
        db.refresh(memo)

        return {
            "evidence_id": evidence.id,
            "case_id": case_id,
            "report_id": memo.id,
            "suspect_or_witness_name": suspect_name,
            "file_hash_sha256": evidence.file_hash_sha256,
            "source_type": "INTERROGATION",
            "integrity_status": evidence.integrity_status
        }
