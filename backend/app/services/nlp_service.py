import logging
import os
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.core.exceptions import EvidenceNotFoundError
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.schemas.nlp import (
    DirectNLPResult,
    ExtractedEntityResponse,
    ExtractedRelationshipResponse,
    NLPProcessingResponse,
)
from app.services.audit_service import AuditService
from app.utils.document_processor import (
    clean_and_preprocess_text,
    detect_document_language,
    extract_text_from_pdf,
)
from app.utils.nlp_extractor import HybridNLPExtractionEngine

logger = logging.getLogger(__name__)


class NLPService:
    @staticmethod
    def process_evidence(
        db: Session,
        evidence_id: str,
        operator_username: str = "investigator_sharma"
    ) -> NLPProcessingResponse:
        """
        Executes the Phase 4 Document Intelligence & Entity Extraction Pipeline on an evidence item.
        Extracts Persons, Telecom, IMEIs, Financials, Vehicles, Locations, and Grounded Relationships.
        """
        evidence = db.query(EvidenceItem).filter(EvidenceItem.id == evidence_id).first()
        if not evidence:
            raise EvidenceNotFoundError(evidence_id)

        # 1. Retrieve or extract text content
        raw_text = evidence.extracted_text_content or ""
        
        if not raw_text and evidence.file_path and os.path.exists(evidence.file_path):
            if evidence.file_name.lower().endswith(".pdf") or evidence.mime_type == "application/pdf":
                with open(evidence.file_path, "rb") as f:
                    pdf_bytes = f.read()
                extracted_pdf_text, pdf_meta = extract_text_from_pdf(pdf_bytes)
                raw_text = extracted_pdf_text
                evidence.evidence_metadata = {**(evidence.evidence_metadata or {}), **pdf_meta}
            else:
                try:
                    with open(evidence.file_path, "r", encoding="utf-8", errors="ignore") as f:
                        raw_text = f.read()
                except Exception as e:
                    logger.warning(f"Failed to read raw file text: {e}")

        # Fallback to FIR or Interrogation related records if text is empty
        if not raw_text:
            if evidence.fir_documents:
                raw_text = "\n".join([f"{f.complainant_name} complaint: {f.incident_description}" for f in evidence.fir_documents])
            elif evidence.interrogation_reports:
                raw_text = "\n".join([f"{i.subject_name} ({i.interrogator_officer}): {i.statement_transcript}" for i in evidence.interrogation_reports])

        # Preprocess text
        cleaned_text = clean_and_preprocess_text(raw_text)
        lang_info = detect_document_language(cleaned_text)

        # 2. Extract Entities
        nlp_entities = HybridNLPExtractionEngine.extract_entities(cleaned_text)

        # 3. Extract Relationships
        nlp_relationships = HybridNLPExtractionEngine.extract_relationships(cleaned_text, nlp_entities)

        # 4. Clear any previous extracted entities/relationships for idempotent re-processing
        db.query(ExtractedRelationship).filter(ExtractedRelationship.evidence_id == evidence_id).delete()
        db.query(ExtractedEntity).filter(ExtractedEntity.evidence_id == evidence_id).delete()

        # 5. Persist Extracted Entities
        entity_db_map = {} # value -> entity_id
        saved_entities: List[ExtractedEntity] = []
        for ent in nlp_entities:
            db_ent = ExtractedEntity(
                evidence_id=evidence.id,
                case_id=evidence.case_id,
                entity_type=ent.entity_type,
                raw_value=ent.raw_value,
                normalized_value=ent.normalized_value,
                confidence=ent.confidence,
                char_start=ent.char_start,
                char_end=ent.char_end,
                context_snippet=ent.context_snippet,
                extraction_method=ent.extraction_method,
                entity_metadata=ent.metadata
            )
            db.add(db_ent)
            saved_entities.append(db_ent)

        db.flush() # Populate IDs for entities

        for ent in saved_entities:
            entity_db_map[ent.normalized_value] = ent.id

        # 6. Persist Extracted Relationships
        saved_relationships: List[ExtractedRelationship] = []
        for rel in nlp_relationships:
            src_id = entity_db_map.get(rel.source_value)
            tgt_id = entity_db_map.get(rel.target_value)

            db_rel = ExtractedRelationship(
                evidence_id=evidence.id,
                case_id=evidence.case_id,
                source_entity_id=src_id,
                target_entity_id=tgt_id,
                source_value=rel.source_value,
                target_value=rel.target_value,
                relationship_type=rel.relationship_type,
                relationship_nature=rel.relationship_nature,
                confidence=rel.confidence,
                context_snippet=rel.context_snippet,
                extraction_method=rel.extraction_method,
                relationship_metadata=rel.metadata
            )
            db.add(db_rel)
            saved_relationships.append(db_rel)

        # 7. Update Evidence Item
        evidence.extracted_text_content = cleaned_text
        evidence.evidence_status = "PROCESSED_BY_NLP"
        db.commit()

        # 8. Log Audit Trail
        AuditService.log_action(
            db=db,
            action_type="NLP_INTELLIGENCE_EXTRACTED",
            resource_type="EVIDENCE",
            case_id=evidence.case_id,
            resource_id=evidence.id,
            operator_id=operator_username,
            details={
                "entities_count": len(saved_entities),
                "relationships_count": len(saved_relationships),
                "language": lang_info.get("primary_language"),
                "is_hinglish": lang_info.get("is_hinglish")
            }
        )

        return NLPProcessingResponse(
            evidence_id=evidence.id,
            case_id=evidence.case_id,
            status="SUCCESS",
            language_info=lang_info,
            entities_count=len(saved_entities),
            relationships_count=len(saved_relationships),
            entities=[ExtractedEntityResponse.model_validate(e) for e in saved_entities],
            relationships=[ExtractedRelationshipResponse.model_validate(r) for r in saved_relationships]
        )

    @staticmethod
    def get_case_entities(
        db: Session,
        case_id: str,
        entity_type: Optional[str] = None
    ) -> List[ExtractedEntity]:
        query = db.query(ExtractedEntity).filter(ExtractedEntity.case_id == case_id)
        if entity_type:
            query = query.filter(ExtractedEntity.entity_type == entity_type.upper())
        return query.order_by(ExtractedEntity.created_at.desc()).all()

    @staticmethod
    def get_case_relationships(
        db: Session,
        case_id: str,
        rel_type: Optional[str] = None
    ) -> List[ExtractedRelationship]:
        query = db.query(ExtractedRelationship).filter(ExtractedRelationship.case_id == case_id)
        if rel_type:
            query = query.filter(ExtractedRelationship.relationship_type == rel_type.upper())
        return query.order_by(ExtractedRelationship.created_at.desc()).all()

    @staticmethod
    def extract_direct(text: str) -> DirectNLPResult:
        cleaned = clean_and_preprocess_text(text)
        lang_info = detect_document_language(cleaned)
        entities = HybridNLPExtractionEngine.extract_entities(cleaned)
        relationships = HybridNLPExtractionEngine.extract_relationships(cleaned, entities)

        return DirectNLPResult(
            language_info=lang_info,
            entities=[e.to_dict() for e in entities],
            relationships=[r.to_dict() for r in relationships],
            entities_count=len(entities),
            relationships_count=len(relationships)
        )
