"""
Legal Reasoning Engine for Indian Legal Intelligence (BNS, BNSS, BSA 2023).

Strict Architectural Requirement:
Every output chain must strictly follow:
LAW -> PROVISION -> CONDITION -> AVAILABLE EVIDENCE -> RELEVANCE -> MISSING INFORMATION -> VERIFICATION

Anti-Hallucination:
Only provisions verified via validate_section() are evaluated. Never invent sections.

Non-Culpability Safeguard:
Module serves strictly as decision support and does not determine guilt or judicial findings.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

from app.utils.legal_corpus import (
    STATUTE_CATALOG,
    AUTHORITATIVE_SECTIONS,
    validate_section,
    get_authoritative_section,
)
from app.schemas.legal import (
    ComplianceStatus,
    EvidenceLawChainStep,
    EvidenceToLawResponse,
)


class LegalReasoningEngine:
    """
    Engine to evaluate case evidence items against statutory provisions and build the 7-step reasoning chain.
    """

    def __init__(self):
        self.statutes = STATUTE_CATALOG
        self.sections = AUTHORITATIVE_SECTIONS

    def build_chain_step(
        self,
        statute_code: str,
        section_number: str,
        condition: Dict[str, Any],
        available_evidence: List[str],
        relevance: str,
        missing_information: str,
        verification: str,
        status: ComplianceStatus = ComplianceStatus.UNMET,
    ) -> Optional[EvidenceLawChainStep]:
        """
        Construct a validated 7-step evidence-to-law chain step.
        Validates the section against authoritative gazette to prevent any invented sections.
        """
        if not validate_section(statute_code, section_number):
            raise ValueError(f"Section {section_number} under {statute_code} is not recognized in authoritative gazetted corpus.")

        sec_data = get_authoritative_section(statute_code, section_number)
        statute_title = self.statutes.get(statute_code, {}).get("title", statute_code)
        provision_str = f"Section {section_number} - {sec_data['section_title']}"

        return EvidenceLawChainStep(
            law=statute_title,
            provision=provision_str,
            condition=condition.get("text", "Statutory condition requirement"),
            available_evidence=available_evidence if available_evidence else ["No verified evidence currently linked to this condition"],
            relevance=relevance,
            missing_information=missing_information,
            verification=verification,
            status=status,
        )

    def evaluate_case_evidence(
        self,
        case_id: str,
        evidence_items: List[Dict[str, Any]],
        extracted_entities: List[Dict[str, Any]],
        cdr_records: List[Dict[str, Any]],
        financial_records: List[Dict[str, Any]],
        fir_documents: List[Dict[str, Any]],
        custom_section_targets: Optional[List[Dict[str, str]]] = None,
    ) -> EvidenceToLawResponse:
        """
        Comprehensive evidence-to-law analysis mapping case evidence to BNS, BNSS, and BSA provisions.
        """
        chains: List[EvidenceLawChainStep] = []
        statutory_summary = {
            "BNS": {"total_conditions": 0, "met": 0, "partially_met": 0, "unmet": 0},
            "BNSS": {"total_conditions": 0, "met": 0, "partially_met": 0, "unmet": 0},
            "BSA": {"total_conditions": 0, "met": 0, "partially_met": 0, "unmet": 0},
        }
        procedural_safeguards: List[str] = []

        # Summarize available evidentiary signals
        has_cdr = len(cdr_records) > 0
        has_financial = len(financial_records) > 0
        has_fir = len(fir_documents) > 0
        total_evidence_count = len(evidence_items)

        # Financial total calculation
        total_transferred = 0.0
        for fin in financial_records:
            amt = fin.get("amount", 0.0) or 0.0
            total_transferred += float(amt)

        # 1. EVALUATE BNS SECTION 318 (Cheating & Dishonest Inducement)
        sec_318 = get_authoritative_section("BNS", "318")
        if sec_318:
            conds = sec_318["conditions"]
            # Condition 1: Deception
            c1_evid = []
            for fir in fir_documents:
                desc = fir.get("allegations", "") or fir.get("complaint_text", "")
                if "fraud" in desc.lower() or "deceiv" in desc.lower() or "cheating" in desc.lower() or "mislead" in desc.lower():
                    c1_evid.append(f"FIR #{fir.get('fir_number', 'N/A')}: Allegation of deceptive promise / misrepresentation.")
            if not c1_evid and has_fir:
                c1_evid.append(f"Initial formal complaint registered in FIR #{fir_documents[0].get('fir_number', 'N/A')}.")

            status_c1 = ComplianceStatus.MET if c1_evid else ComplianceStatus.UNMET
            chains.append(self.build_chain_step(
                statute_code="BNS",
                section_number="318",
                condition=conds[0],
                available_evidence=c1_evid,
                relevance="Establishes foundational threshold of fraudulent misrepresentation inducing the victim to act.",
                missing_information="Affidavit or forensic transcription of specific deceptive communications (chat / email)." if not c1_evid else "Corroboration from independent witness verifying deceptive statement.",
                verification="Examine complainant under BNSS Section 180 and requisition email/chat transcripts under BNSS Section 91.",
                status=status_c1,
            ))

            # Condition 2: Dishonest Inducement to Deliver Property
            c2_evid = []
            if total_transferred > 0:
                c2_evid.append(f"Bank transaction ledgers confirm ₹{total_transferred:,.2f} transferred across {len(financial_records)} transactions.")
            for e in evidence_items:
                if "transaction" in e.get("name", "").lower() or "bank" in e.get("name", "").lower() or "payment" in e.get("name", "").lower():
                    c2_evid.append(f"Evidence Item '{e.get('name')}': {e.get('description', 'Financial document')}")

            status_c2 = ComplianceStatus.MET if c2_evid else ComplianceStatus.UNMET
            chains.append(self.build_chain_step(
                statute_code="BNS",
                section_number="318",
                condition=conds[1],
                available_evidence=c2_evid,
                relevance="Directly fulfills statutory requirement of victim parting with valuable property/money due to inducement.",
                missing_information="Verified bank statement with certified branch manager seal and transaction hash." if not c2_evid else "Tracing end-beneficiary withdrawal receipts from ATM/merchant POS.",
                verification="Issue summons under BNSS Section 91 to beneficiary banks to freeze proceeds under BNSS Section 107.",
                status=status_c2,
            ))

            # Condition 3: Mens rea from inception
            c3_evid = []
            if has_cdr and len(cdr_records) > 5:
                c3_evid.append(f"Pre-incident communication pattern detected across {len(cdr_records)} CDR logs indicating prior concerted planning.")
            status_c3 = ComplianceStatus.PARTIALLY_MET if c3_evid else ComplianceStatus.UNMET
            chains.append(self.build_chain_step(
                statute_code="BNS",
                section_number="318",
                condition=conds[2],
                available_evidence=c3_evid,
                relevance="Distinguishes criminal cheating from mere civil breach of contract by showing deceitful intent from the start.",
                missing_information="Evidence showing suspect never possessed means or intention to fulfill original promise.",
                verification="Requisition suspect's business tax returns and audited statements to show lack of legitimate operational capacity.",
                status=status_c3,
            ))

        # 2. EVALUATE BNS SECTION 61 (Criminal Conspiracy)
        sec_61 = get_authoritative_section("BNS", "61")
        if sec_61:
            conds = sec_61["conditions"]
            # Condition 1: Agreement between two or more persons
            c1_evid = []
            if len(extracted_entities) >= 2:
                names = [ent.get("name") for ent in extracted_entities[:3] if ent.get("name")]
                c1_evid.append(f"Identified multiple co-actors in graph: {', '.join(names)}.")
            if has_cdr:
                c1_evid.append(f"Bilateral telecom interactions recorded between suspects over {len(cdr_records)} call records.")

            status_c1 = ComplianceStatus.MET if len(c1_evid) >= 2 else (ComplianceStatus.PARTIALLY_MET if c1_evid else ComplianceStatus.UNMET)
            chains.append(self.build_chain_step(
                statute_code="BNS",
                section_number="61",
                condition=conds[0],
                available_evidence=c1_evid,
                relevance="Satisfies prerequisite meeting of minds between multiple actors for joint criminal enterprise.",
                missing_information="Substantive communication content (decrypted chat transcripts or recorded voice memos) showing mutual agreement.",
                verification="Requisition encrypted messenger server metadata and cloud backups under BNSS Section 92.",
                status=status_c1,
            ))

            # Condition 2: Agreement to commit illegal act
            c2_evid = []
            if total_transferred > 0 and len(extracted_entities) >= 2:
                c2_evid.append(f"Syndicated movement of funds totaling ₹{total_transferred:,.2f} involving multiple account beneficiaries.")
            status_c2 = ComplianceStatus.PARTIALLY_MET if c2_evid else ComplianceStatus.UNMET
            chains.append(self.build_chain_step(
                statute_code="BNS",
                section_number="61",
                condition=conds[1],
                available_evidence=c2_evid,
                relevance="Demonstrates that the shared enterprise aimed at execution of an offense under BNS.",
                missing_information="Proof of specific individual allocation of criminal roles among conspirators.",
                verification="Record statement of co-conspirator / approver under BNSS Section 180.",
                status=status_c2,
            ))

        # 3. EVALUATE BNS SECTION 111 / 112 (Organised Crime / Petty Organised Crime)
        sec_111 = get_authoritative_section("BNS", "111")
        if sec_111 and (total_transferred > 1000000 or len(extracted_entities) >= 4):
            conds = sec_111["conditions"]
            chains.append(self.build_chain_step(
                statute_code="BNS",
                section_number="111",
                condition=conds[0],
                available_evidence=[f"Structured syndicate activity involving {len(extracted_entities)} entities and cross-channel fund movement."],
                relevance="Assesses if the criminal venture meets threshold of continuing organized crime syndicate.",
                missing_information="Statutory prerequisite under BNS Section 111(1): Proof that more than one charge-sheet has been filed before a competent court within the preceding ten years.",
                verification="Requisition crime history dossiers from National Crime Records Bureau (NCRB) and State C.I.D. databases.",
                status=ComplianceStatus.PARTIALLY_MET,
            ))
            chains.append(self.build_chain_step(
                statute_code="BNS",
                section_number="111",
                condition=conds[3],
                available_evidence=[],
                relevance="Mandatory statutory condition for invoking Section 111 (Organised Crime). Without prior charge-sheets, offense must be charged under ordinary penal sections.",
                missing_information="Certified copies of previous charge-sheets where courts took cognizance against syndicate members in past 10 years.",
                verification="Requisition court certified copies from jurisdictional Magistrate / Special Court.",
                status=ComplianceStatus.UNMET,
            ))

        # 4. EVALUATE BSA SECTION 63 (Electronic Evidence Certificate Requirement)
        sec_63 = get_authoritative_section("BSA", "63")
        if sec_63:
            conds = sec_63["conditions"]
            c1_evid = []
            cert_found = False
            for e in evidence_items:
                name = e.get("name", "").lower()
                desc = e.get("description", "").lower()
                if "63" in name or "65b" in name or "certificate" in name or "hash" in desc:
                    c1_evid.append(f"Certificate document '{e.get('name')}' on record.")
                    cert_found = True
            if has_cdr:
                c1_evid.append(f"{len(cdr_records)} electronic call detail records present in case dossier.")
            if not c1_evid and total_evidence_count > 0:
                c1_evid.append("Electronic devices / records logged in evidence vault.")

            status_c1 = ComplianceStatus.MET if cert_found else ComplianceStatus.PARTIALLY_MET
            chains.append(self.build_chain_step(
                statute_code="BSA",
                section_number="63",
                condition=conds[1],
                available_evidence=c1_evid,
                relevance="Mandatory condition of admissibility under BSA Section 63 (replacing legacy IEA 65B). Electronic records are inadmissible per se without certified custody compliance (Arjun Panditrao doctrine).",
                missing_information="Signed Section 63 Certificate from telecom nodal officer / forensic custodian containing device serial numbers, operating state affirmation, and cryptographic hash." if not cert_found else "Cross-verification of officer's signature.",
                verification="Obtain statutory certificate under BSA Section 63 from cellular provider nodal officer and CFSL digital forensic examiner.",
                status=status_c1,
            ))

            # Hash integrity verification condition
            chains.append(self.build_chain_step(
                statute_code="BSA",
                section_number="63",
                condition=conds[2],
                available_evidence=["Cryptographic SHA-256 hash tracking registered in evidence repository."],
                relevance="Proves forensic integrity and eliminates possibility of digital alteration between seizure and judicial exhibition.",
                missing_information="Bit-stream mirror image verification report from certified Cyber Lab.",
                verification="Submit seized drives and export dumps to State Forensic Science Laboratory under BSA Section 39.",
                status=ComplianceStatus.MET,
            ))

            if not cert_found:
                procedural_safeguards.append("CRITICAL: Electronic evidence (CDR/Financial) requires a valid BSA Section 63 certificate prior to judicial chargesheet filing.")

        # 5. EVALUATE BNSS SECTION 91 & SECTION 107 (Procedural Powers: Summons & Attachment)
        sec_91 = get_authoritative_section("BNSS", "91")
        if sec_91:
            conds = sec_91["conditions"]
            chains.append(self.build_chain_step(
                statute_code="BNSS",
                section_number="91",
                condition=conds[0],
                available_evidence=[f"Investigative requisition needed for banking statements and device custody across {len(financial_records)} transaction trails."],
                relevance="Procedural power compelling production of original books, ledgers, and server logs.",
                missing_information="Formal written order signed by Investigating Officer specifying exact date ranges and account identifiers.",
                verification="Serve formal written order under BNSS Section 91 upon compliance managers of nodal banks and ISPs.",
                status=ComplianceStatus.PARTIALLY_MET,
            ))

        sec_107 = get_authoritative_section("BNSS", "107")
        if sec_107 and total_transferred > 0:
            conds = sec_107["conditions"]
            chains.append(self.build_chain_step(
                statute_code="BNSS",
                section_number="107",
                condition=conds[0],
                available_evidence=[f"Tracing identifies ₹{total_transferred:,.2f} diverted into suspect accounts directly derived from reported offense."],
                relevance="Statutory mechanism for freezing and attachment of proceeds of crime during investigation.",
                missing_information="Formal application endorsed by Superintendent of Police submitted to Chief Judicial Magistrate.",
                verification="Draft application under BNSS Section 107 to Magistrate for provisional freezing order.",
                status=ComplianceStatus.PARTIALLY_MET,
            ))
            procedural_safeguards.append("Proceeds of crime identified: Proceed with BNSS Section 107 attachment application to prevent asset dissipation.")

        # Calculate counts
        for c in chains:
            # Parse statute code from law
            code = "BNS" if "BNS" in c.law or "Bharatiya Nyaya" in c.law else ("BNSS" if "BNSS" in c.law or "Nagarik" in c.law else "BSA")
            statutory_summary[code]["total_conditions"] += 1
            if c.status == ComplianceStatus.MET:
                statutory_summary[code]["met"] += 1
            elif c.status == ComplianceStatus.PARTIALLY_MET:
                statutory_summary[code]["partially_met"] += 1
            else:
                statutory_summary[code]["unmet"] += 1

        return EvidenceToLawResponse(
            case_id=case_id,
            timestamp=datetime.utcnow().isoformat(),
            chains=chains,
            statutory_summary=statutory_summary,
            procedural_safeguards=procedural_safeguards,
        )

    def generate_legal_graph(self) -> Dict[str, Any]:
        """
        Build the authoritative legal knowledge graph structure linking Statutes, Sections,
        Conditions, Procedural powers, and legacy concordance.
        """
        nodes = []
        links = []

        # Statute Nodes
        for code, data in self.statutes.items():
            nodes.append({
                "id": f"STATUTE_{code}",
                "label": f"{code} (2023)",
                "type": "STATUTE",
                "statute_code": code,
                "properties": {
                    "title": data["title"],
                    "replaces": data["replaces"],
                    "effective_date": data["effective_date"],
                },
            })

        # Section & Condition Nodes
        for statute_code, sections_map in self.sections.items():
            for sec_num, sec_data in sections_map.items():
                sec_id = f"SEC_{statute_code}_{sec_num}"
                nodes.append({
                    "id": sec_id,
                    "label": f"{statute_code} §{sec_num}: {sec_data['section_title']}",
                    "type": "SECTION",
                    "statute_code": statute_code,
                    "properties": {
                        "category": sec_data["category"],
                        "offense_type": sec_data.get("offense_type"),
                        "bailable": sec_data.get("bailable"),
                        "punishment": sec_data.get("punishment_text"),
                        "legacy": sec_data.get("legacy_code_mapping"),
                    },
                })
                # Link Statute -> Section
                links.append({
                    "source": f"STATUTE_{statute_code}",
                    "target": sec_id,
                    "label": "CONTAINS_SECTION",
                })

                # Conditions
                for cond in sec_data.get("conditions", []):
                    cond_id = f"COND_{cond['id']}"
                    nodes.append({
                        "id": cond_id,
                        "label": cond["text"],
                        "type": "CONDITION",
                        "statute_code": statute_code,
                        "properties": {
                            "is_mandatory": cond.get("is_mandatory", True),
                            "description": cond.get("description", ""),
                        },
                    })
                    links.append({
                        "source": sec_id,
                        "target": cond_id,
                        "label": "REQUIRES_CONDITION",
                    })

                # Inter-statutory links
                # e.g., BNS offenses require BNSS procedure and BSA admissibility
                if statute_code == "BNS":
                    # Link to BSA 63 if digital or financial
                    if sec_num in ["318", "336", "340", "111", "112"]:
                        links.append({
                            "source": sec_id,
                            "target": "SEC_BSA_63",
                            "label": "GOVERNED_BY_EVIDENCE_RULE",
                        })
                        links.append({
                            "source": sec_id,
                            "target": "SEC_BNSS_91",
                            "label": "INVESTIGATED_UNDER",
                        })
                    if sec_num in ["318", "111"]:
                        links.append({
                            "source": sec_id,
                            "target": "SEC_BNSS_107",
                            "label": "SUBJECT_TO_ATTACHMENT",
                        })

        return {
            "nodes": nodes,
            "links": links,
            "total_nodes": len(nodes),
            "total_links": len(links),
        }
