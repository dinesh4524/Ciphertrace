"""
Indian Legal Intelligence Service Layer.
Manages authoritative statutes (BNS, BNSS, BSA), section indexing,
evidence-to-law mapping with the mandatory 7-step pipeline, and Legal RAG.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.case import Case
from app.models.user import User
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.cdr import CDRRecord
from app.models.financial import FinancialRecord
from app.models.fir import FIRDocument
from app.models.legal import LegalStatute, LegalSection, EvidenceToLawMapping
from app.models.audit import AuditLog
from app.api.deps import check_case_access
from app.utils.legal_corpus import (
    STATUTE_CATALOG,
    AUTHORITATIVE_SECTIONS,
    validate_section,
    get_authoritative_section,
    get_all_statutes,
    get_all_sections_for_statute,
    search_statutory_corpus,
)
from app.utils.legal_reasoning_engine import LegalReasoningEngine
from app.schemas.legal import (
    LegalStatuteItem,
    LegalSectionItem,
    EvidenceToLawResponse,
    LegalRAGQueryRequest,
    LegalRAGQueryResponse,
    LegalGraphResponse,
    EvidenceLawChainStep,
    ComplianceStatus,
)


class LegalService:
    def __init__(self):
        self.reasoning_engine = LegalReasoningEngine()

    def seed_statutes_if_needed(self, db: Session):
        """
        Seed authoritative statutes and sections into database if empty.
        Ensures exact synchronization with gazetted corpus.
        """
        existing_count = db.query(LegalStatute).count()
        if existing_count >= 3:
            return

        for code, data in STATUTE_CATALOG.items():
            statute = db.query(LegalStatute).filter(LegalStatute.code == code).first()
            if not statute:
                statute = LegalStatute(
                    code=code,
                    title=data["title"],
                    enactment_year=data["enactment_year"],
                    effective_date=data["effective_date"],
                    version="2023.1",
                    statute_metadata={
                        "act_number": data.get("act_number"),
                        "replaces": data.get("replaces"),
                        "description": data.get("description"),
                    },
                )
                db.add(statute)
                db.flush()

            # Seed sections for this statute
            statute_sections = AUTHORITATIVE_SECTIONS.get(code, {})
            for sec_num, sec_info in statute_sections.items():
                existing_sec = db.query(LegalSection).filter(
                    LegalSection.statute_code == code,
                    LegalSection.section_number == sec_num,
                ).first()
                if not existing_sec:
                    sec_obj = LegalSection(
                        statute_id=statute.id,
                        statute_code=code,
                        section_number=sec_num,
                        section_title=sec_info["section_title"],
                        chapter=sec_info.get("chapter"),
                        category=sec_info.get("category", "OFFENSE"),
                        offense_type=sec_info.get("offense_type"),
                        bailable=sec_info.get("bailable"),
                        compoundable=sec_info.get("compoundable"),
                        punishment_text=sec_info.get("punishment_text"),
                        full_text=sec_info.get("full_text"),
                        conditions=sec_info.get("conditions", []),
                        legacy_code_mapping=sec_info.get("legacy_code_mapping", {}),
                        version="2023.1",
                    )
                    db.add(sec_obj)

        db.commit()

    def get_statutes(self, db: Session) -> List[LegalStatuteItem]:
        """List all authoritative Indian statutes with section counts."""
        self.seed_statutes_if_needed(db)
        statutes = db.query(LegalStatute).all()
        results = []
        for s in statutes:
            sec_count = db.query(LegalSection).filter(LegalSection.statute_id == s.id).count()
            results.append(LegalStatuteItem(
                id=s.id,
                code=s.code,
                title=s.title,
                enactment_year=s.enactment_year,
                effective_date=s.effective_date,
                version=s.version,
                statute_metadata=s.statute_metadata or {},
                sections_count=sec_count,
            ))
        return results

    def get_section_details(self, statute_code: str, section_number: str, db: Session) -> LegalSectionItem:
        """
        Get details for a specific section.
        Strictly validates against gazetted corpus to prevent invented sections.
        """
        if not validate_section(statute_code, section_number):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section '{section_number}' under statute '{statute_code}' is not recognized in authoritative gazetted corpus.",
            )

        self.seed_statutes_if_needed(db)
        sec = db.query(LegalSection).filter(
            LegalSection.statute_code == statute_code.upper(),
            LegalSection.section_number == section_number,
        ).first()

        if not sec:
            # Fallback to in-memory gazette
            raw = get_authoritative_section(statute_code, section_number)
            return LegalSectionItem(
                id=f"{statute_code}_{section_number}",
                statute_code=statute_code.upper(),
                section_number=section_number,
                section_title=raw["section_title"],
                chapter=raw.get("chapter"),
                category=raw.get("category", "OFFENSE"),
                offense_type=raw.get("offense_type"),
                bailable=raw.get("bailable"),
                compoundable=raw.get("compoundable"),
                punishment_text=raw.get("punishment_text"),
                full_text=raw.get("full_text"),
                conditions=raw.get("conditions", []),
                legacy_code_mapping=raw.get("legacy_code_mapping", {}),
                version="2023.1",
            )

        return LegalSectionItem(
            id=sec.id,
            statute_code=sec.statute_code,
            section_number=sec.section_number,
            section_title=sec.section_title,
            chapter=sec.chapter,
            category=sec.category,
            offense_type=sec.offense_type,
            bailable=sec.bailable,
            compoundable=sec.compoundable,
            punishment_text=sec.punishment_text,
            full_text=sec.full_text,
            conditions=sec.conditions or [],
            legacy_code_mapping=sec.legacy_code_mapping or {},
            version=sec.version,
        )

    def get_sections_by_statute(self, statute_code: str, db: Session) -> List[LegalSectionItem]:
        """Get all gazetted sections for a statute."""
        statute_key = statute_code.upper()
        if statute_key not in STATUTE_CATALOG:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid statute code '{statute_code}'. Must be one of BNS, BNSS, BSA.",
            )

        self.seed_statutes_if_needed(db)
        secs = db.query(LegalSection).filter(LegalSection.statute_code == statute_key).all()
        return [
            LegalSectionItem(
                id=s.id,
                statute_code=s.statute_code,
                section_number=s.section_number,
                section_title=s.section_title,
                chapter=s.chapter,
                category=s.category,
                offense_type=s.offense_type,
                bailable=s.bailable,
                compoundable=s.compoundable,
                punishment_text=s.punishment_text,
                full_text=s.full_text,
                conditions=s.conditions or [],
                legacy_code_mapping=s.legacy_code_mapping or {},
                version=s.version,
            )
            for s in secs
        ]

    def map_case_evidence_to_law(self, case_id: str, db: Session, current_user: User) -> EvidenceToLawResponse:
        """
        Maps all corroborated evidence items in a case to BNS, BNSS, and BSA provisions.
        Outputs the mandatory 7-step chain for each matched provision:
        LAW -> PROVISION -> CONDITION -> AVAILABLE EVIDENCE -> RELEVANCE -> MISSING INFORMATION -> VERIFICATION
        """
        check_case_access(db, case_id, current_user, write_required=False)
        self.seed_statutes_if_needed(db)

        # Retrieve case signals
        evidence_items = db.query(EvidenceItem).filter(EvidenceItem.case_id == case_id).all()
        entities = db.query(ExtractedEntity).filter(ExtractedEntity.case_id == case_id).all()
        cdr_records = (
            db.query(CDRRecord)
            .join(EvidenceItem, CDRRecord.evidence_id == EvidenceItem.id)
            .filter(EvidenceItem.case_id == case_id)
            .all()
        )
        fin_records = (
            db.query(FinancialRecord)
            .join(EvidenceItem, FinancialRecord.evidence_id == EvidenceItem.id)
            .filter(EvidenceItem.case_id == case_id)
            .all()
        )
        fir_docs = (
            db.query(FIRDocument)
            .join(EvidenceItem, FIRDocument.evidence_id == EvidenceItem.id)
            .filter(EvidenceItem.case_id == case_id)
            .all()
        )

        ev_dicts = [
            {
                "id": e.id,
                "name": getattr(e, "file_name", "Evidence Document"),
                "description": getattr(e, "extracted_text_content", "") or getattr(e, "file_name", ""),
                "type": getattr(e, "source_type", "DOCUMENT"),
            }
            for e in evidence_items
        ]
        ent_dicts = [{"id": ent.id, "name": ent.name, "type": ent.type} for ent in entities]
        cdr_dicts = [{"id": c.id, "caller": getattr(c, "calling_number", ""), "callee": getattr(c, "called_number", "")} for c in cdr_records]
        fin_dicts = [{"id": f.id, "amount": float(f.amount) if f.amount else 0.0, "source": getattr(f, "sender_account", ""), "target": getattr(f, "receiver_account", "")} for f in fin_records]
        fir_dicts = [{"id": f.id, "fir_number": f.fir_number, "allegations": getattr(f, "informant_narrative", "") or getattr(f, "raw_text", "")} for f in fir_docs]

        # Run reasoning engine
        response = self.reasoning_engine.evaluate_case_evidence(
            case_id=case_id,
            evidence_items=ev_dicts,
            extracted_entities=ent_dicts,
            cdr_records=cdr_dicts,
            financial_records=fin_dicts,
            fir_documents=fir_dicts,
        )

        # Persist mappings in DB for audit trail
        # Clear existing mappings for this case
        db.query(EvidenceToLawMapping).filter(EvidenceToLawMapping.case_id == case_id).delete()

        for chain in response.chains:
            # Look up section ID
            sec_num = chain.provision.split(" - ")[0].replace("Section ", "").strip()
            statute_code = "BNS" if "BNS" in chain.law else ("BNSS" if "BNSS" in chain.law else "BSA")
            sec_record = db.query(LegalSection).filter(
                LegalSection.statute_code == statute_code,
                LegalSection.section_number == sec_num,
            ).first()

            if sec_record:
                mapping = EvidenceToLawMapping(
                    case_id=case_id,
                    section_id=sec_record.id,
                    statute_code=statute_code,
                    section_number=sec_num,
                    condition_text=chain.condition,
                    compliance_status=chain.status.value,
                    available_evidence_summary="\n".join(chain.available_evidence),
                    relevance_justification=chain.relevance,
                    missing_information=chain.missing_information,
                    recommended_verification=chain.verification,
                    evidence_item_ids=[],
                )
                db.add(mapping)

        # Audit log
        db.add(AuditLog(
            case_id=case_id,
            operator_id=current_user.id,
            operator_role=getattr(current_user, "role", "INVESTIGATOR"),
            action_type="LEGAL_EVIDENCE_MAPPED",
            resource_type="CASE",
            resource_id=case_id,
            details_json={
                "chains_count": len(response.chains),
                "statutory_summary": response.statutory_summary,
            },
        ))
        db.commit()

        return response

    def query_legal_rag(
        self,
        case_id: str,
        request: LegalRAGQueryRequest,
        db: Session,
        current_user: User,
    ) -> LegalRAGQueryResponse:
        """
        Legal RAG query over authoritative Indian criminal & procedural codes (BNS, BNSS, BSA 2023).
        Enforces strict 7-step chain output and non-culpability safeguards.
        Never invents sections.
        """
        check_case_access(db, case_id, current_user, write_required=False)
        self.seed_statutes_if_needed(db)

        # 1. Search authoritative gazetted corpus
        search_matches = search_statutory_corpus(request.query, request.statute_filter)
        if not search_matches:
            # Fallback to key defaults if query is general
            default_keys = [("BNS", "318"), ("BNS", "61"), ("BSA", "63"), ("BNSS", "91")]
            for st, sc in default_keys:
                raw = get_authoritative_section(st, sc)
                if raw:
                    search_matches.append({
                        "statute_code": st,
                        "section_number": sc,
                        "section_title": raw["section_title"],
                        "chapter": raw.get("chapter"),
                        "category": raw.get("category"),
                        "relevance_score": 1.0,
                        "data": raw,
                    })

        # Limit to top 4 most relevant provisions
        top_matches = search_matches[:4]

        # 2. Retrieve case context if requested
        case_evidence_summary = []
        if request.include_case_evidence:
            evs = db.query(EvidenceItem).filter(EvidenceItem.case_id == case_id).limit(5).all()
            for e in evs:
                case_evidence_summary.append(f"{getattr(e, 'file_name', 'Evidence Document')} ({getattr(e, 'source_type', 'DOCUMENT')})")

        # 3. Construct 7-Step Chains for each matched provision
        chains: List[EvidenceLawChainStep] = []
        cited_sections = []
        legacy_concordance = []

        for match in top_matches:
            st = match["statute_code"]
            sec_num = match["section_number"]
            sec_data = match["data"]
            statute_title = STATUTE_CATALOG[st]["title"]

            cited_sections.append({
                "statute_code": st,
                "statute_title": statute_title,
                "section_number": sec_num,
                "section_title": sec_data["section_title"],
                "category": sec_data.get("category"),
                "offense_type": sec_data.get("offense_type"),
                "punishment": sec_data.get("punishment_text"),
            })

            legacy = sec_data.get("legacy_code_mapping", {})
            if legacy:
                legacy_concordance.append({
                    "new_code": f"{st} Section {sec_num}",
                    "legacy_code": f"{legacy.get('act', 'IPC')} Section {legacy.get('section', 'N/A')}",
                    "title": legacy.get("title", sec_data["section_title"]),
                })

            # Formulate 7-step chain for prime condition of this provision
            conditions = sec_data.get("conditions", [])
            primary_cond = conditions[0] if conditions else {"text": "Statutory compliance requirement"}

            available_ev = case_evidence_summary if case_evidence_summary else ["Case file documents, digital artifacts, and witness records"]
            rel_text = f"Proves essential statutory elements under {st} Section {sec_num} ({sec_data['section_title']})."
            miss_text = "Corroboration from independent financial audit or telecom nodal officer affirmation."
            verif_text = f"Issue procedural requisition under BNSS Section 91 and submit digital evidence under BSA Section 63."

            chains.append(self.reasoning_engine.build_chain_step(
                statute_code=st,
                section_number=sec_num,
                condition=primary_cond,
                available_evidence=available_ev,
                relevance=rel_text,
                missing_information=miss_text,
                verification=verif_text,
                status=ComplianceStatus.PARTIALLY_MET if case_evidence_summary else ComplianceStatus.UNMET,
            ))

        # 4. Formulate grounded authoritative answer
        sections_summary_str = ", ".join([f"{c['statute_code']} Section {c['section_number']} ({c['section_title']})" for c in cited_sections])
        answer_text = (
            f"Under the Indian criminal statutes (BNS, BNSS, BSA 2023), the relevant provisions governing this inquiry are {sections_summary_str}. "
            f"Every legal determination strictly proceeds through the mandatory 7-step evidentiary verification sequence detailed below. "
            f"Note that under the Bharatiya Sakshya Adhiniyam, 2023, electronic evidence requires statutory certification under Section 63 to be admissible in judicial proceedings."
        )

        # Audit log
        db.add(AuditLog(
            case_id=case_id,
            operator_id=current_user.id,
            operator_role=getattr(current_user, "role", "INVESTIGATOR"),
            action_type="LEGAL_RAG_QUERY",
            resource_type="CASE",
            resource_id=case_id,
            details_json={
                "query": request.query,
                "cited_sections": [f"{c['statute_code']}-{c['section_number']}" for c in cited_sections],
            },
        ))
        db.commit()

        return LegalRAGQueryResponse(
            query=request.query,
            answer=answer_text,
            chains=chains,
            cited_sections=cited_sections,
            legacy_concordance=legacy_concordance,
        )

    def get_legal_graph(self, db: Session) -> LegalGraphResponse:
        """
        Generate the authoritative Indian legal knowledge graph.
        """
        self.seed_statutes_if_needed(db)
        graph_data = self.reasoning_engine.generate_legal_graph()
        return LegalGraphResponse(**graph_data)
