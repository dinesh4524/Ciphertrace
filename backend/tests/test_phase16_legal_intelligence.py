import uuid
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.financial import FinancialRecord
from app.models.cdr import CDRRecord
from app.models.fir import FIRDocument
from app.models.user import User
from app.utils.legal_corpus import (
    validate_section,
    get_authoritative_section,
    search_statutory_corpus,
    STATUTE_CATALOG,
    AUTHORITATIVE_SECTIONS,
)
from app.utils.legal_reasoning_engine import LegalReasoningEngine
from app.schemas.legal import ComplianceStatus


def test_authoritative_corpus_and_anti_hallucination():
    """
    Test 1: Anti-hallucination and gazette catalog integrity.
    - Validates that known gazetted provisions return True.
    - Validates that invented or legacy sections return False.
    - Confirms that catalog contains BNS, BNSS, BSA 2023.
    """
    assert "BNS" in STATUTE_CATALOG
    assert "BNSS" in STATUTE_CATALOG
    assert "BSA" in STATUTE_CATALOG
    assert STATUTE_CATALOG["BNS"]["enactment_year"] == 2023

    # Valid gazetted sections
    assert validate_section("BNS", "61") is True # Criminal Conspiracy
    assert validate_section("BNS", "111") is True # Organised Crime
    assert validate_section("BNS", "318") is True # Cheating
    assert validate_section("BNSS", "91") is True # Summons for documents
    assert validate_section("BNSS", "107") is True # Attachment of proceeds
    assert validate_section("BSA", "63") is True # Certificate condition for electronic evidence

    # Invented / Invalid sections MUST BE REJECTED (Strict Anti-Hallucination)
    assert validate_section("BNS", "999") is False
    assert validate_section("BNS", "420") is False # 420 is legacy IPC, in BNS it is 318
    assert validate_section("BNSS", "500") is False
    assert validate_section("BSA", "65B") is False # 65B is legacy IEA, in BSA it is 63
    assert validate_section("XYZ", "100") is False

    # Check authoritative data retrieval
    sec_318 = get_authoritative_section("BNS", "318")
    assert sec_318 is not None
    assert sec_318["section_title"] == "Cheating and Dishonestly Inducing Delivery of Property"
    assert sec_318["legacy_code_mapping"]["act"] == "IPC"
    assert sec_318["legacy_code_mapping"]["section"] == "415 / 420"
    assert len(sec_318["conditions"]) >= 2


def test_mandatory_seven_step_pipeline_structure():
    """
    Test 2: Verifies that every legal reasoning step strictly adheres to the 7-step pipeline:
    LAW -> PROVISION -> CONDITION -> AVAILABLE EVIDENCE -> RELEVANCE -> MISSING INFORMATION -> VERIFICATION.
    """
    engine = LegalReasoningEngine()

    sec_318 = get_authoritative_section("BNS", "318")
    condition = sec_318["conditions"][0]

    step = engine.build_chain_step(
        statute_code="BNS",
        section_number="318",
        condition=condition,
        available_evidence=["Bank statement showing ₹15,00,000 transfer to dummy entity."],
        relevance="Establishes parting with property induced by deceit.",
        missing_information="Affidavit of branch manager and customer communications.",
        verification="Requisition bank records under BNSS Section 91.",
        status=ComplianceStatus.PARTIALLY_MET,
    )

    assert step is not None
    # Verify all 7 distinct components are populated non-trivially
    assert "Bharatiya Nyaya Sanhita" in step.law # 1. LAW
    assert "Section 318" in step.provision # 2. PROVISION
    assert step.condition != "" # 3. CONDITION
    assert len(step.available_evidence) > 0 # 4. AVAILABLE EVIDENCE
    assert "parting with property" in step.relevance # 5. RELEVANCE
    assert "Affidavit" in step.missing_information # 6. MISSING INFORMATION
    assert "BNSS Section 91" in step.verification # 7. VERIFICATION
    assert step.status == ComplianceStatus.PARTIALLY_MET

    # Confirm engine throws ValueError on invented section
    with pytest.raises(ValueError, match="not recognized in authoritative gazetted corpus"):
        engine.build_chain_step(
            statute_code="BNS",
            section_number="999",
            condition={"text": "Invented"},
            available_evidence=[],
            relevance="",
            missing_information="",
            verification="",
        )


def test_evidence_evaluation_and_safeguards():
    """
    Test 3: Evaluates full case evidence mapping:
    - Verifies BNS 318, 61, BSA 63, BNSS 91/107 generation.
    - Verifies BSA Section 63 electronic evidence certificate alert.
    - Verifies non-culpability decision support notice.
    """
    engine = LegalReasoningEngine()

    ev_items = [
        {"id": "ev-1", "name": "Victim Bank Ledger.pdf", "description": "Ledger of transfers", "type": "DOCUMENT"},
        {"id": "ev-2", "name": "Suspect Mobile Extraction.tar", "description": "Raw phone dump", "type": "DEVICE"},
    ]
    entities = [
        {"id": "ent-1", "name": "Rajesh Kumar", "type": "PERSON"},
        {"id": "ent-2", "name": "Apex Shell FZE", "type": "ORGANIZATION"},
    ]
    cdr_records = [
        {"id": "cdr-1", "caller": "+919876543210", "callee": "+919123456780"},
        {"id": "cdr-2", "caller": "+919876543210", "callee": "+919123456780"},
    ]
    fin_records = [
        {"id": "fin-1", "amount": 2500000.0, "source": "Victim Corp", "target": "Apex Shell FZE"}
    ]
    fir_docs = [
        {"id": "fir-1", "fir_number": "FIR-091/2024", "allegations": "Fraudulent promise of high yield investment inducing transfer of ₹25 Lakhs"}
    ]

    result = engine.evaluate_case_evidence(
        case_id="case-101",
        evidence_items=ev_items,
        extracted_entities=entities,
        cdr_records=cdr_records,
        financial_records=fin_records,
        fir_documents=fir_docs,
    )

    assert result.case_id == "case-101"
    assert len(result.chains) >= 4

    # Check that BNS 318, BNS 61, and BSA 63 are present
    provisions = [c.provision for c in result.chains]
    assert any("318" in p for p in provisions)
    assert any("61" in p for p in provisions)
    assert any("63" in p for p in provisions)

    # Check BSA 63 electronic evidence safeguard flag
    assert any("BSA Section 63" in s for s in result.procedural_safeguards)

    # Check BNSS 107 proceeds of crime safeguard flag
    assert any("BNSS Section 107" in s for s in result.procedural_safeguards)

    # Verify statutory summary counts
    assert "BNS" in result.statutory_summary
    assert "BSA" in result.statutory_summary
    assert "BNSS" in result.statutory_summary

    # Verify Non-Culpability Notice is present
    assert "DECISION SUPPORT ONLY" in result.non_culpability_notice
    assert "does not constitute judicial determination of guilt" in result.non_culpability_notice


def test_legal_api_endpoints(client: TestClient, db_session: Session):
    """
    Test 4: Integration testing of REST API endpoints:
    - GET /api/v1/legal/statutes
    - GET /api/v1/legal/statute/BNS/sections
    - GET /api/v1/legal/section/BNS/318
    - GET /api/v1/legal/section/BNS/999 (404 anti-hallucination)
    - POST /api/v1/legal/map-evidence/{case_id}
    - POST /api/v1/legal/query/{case_id}
    - GET /api/v1/legal/graph
    """
    db = db_session
    # 1. Setup User and Case
    user_id = str(uuid.uuid4())
    username = f"legal_officer_{uuid.uuid4().hex[:6]}"
    user = User(
        id=user_id,
        username=username,
        email=f"{username}@ciphertrace.internal",
        hashed_password=get_password_hash("ValidPass123!"),
        full_name="Investigating Legal Officer",
        role="INVESTIGATOR",
        is_active=True,
    )
    db.add(user)

    case_id = str(uuid.uuid4())
    case = Case(
        id=case_id,
        case_number=f"LEGAL-CASE-{uuid.uuid4().hex[:4]}",
        title="Operation Golden Ledger",
        description="Investigation into cyber fraud and money laundering syndicate.",
        status="ACTIVE_INVESTIGATION",
        assigned_lead_user_id=user_id,
    )
    db.add(case)
    db.flush()

    ev_id = str(uuid.uuid4())
    ev = EvidenceItem(
        id=ev_id,
        case_id=case_id,
        file_name="HDFC Statement 2024.pdf",
        source_type="FINANCIAL",
        file_path="/data/financial.pdf",
        file_hash_sha256="abc123def4567890abc123def4567890abc123def4567890abc123def4567890",
        file_size_bytes=20480,
        mime_type="application/pdf",
        extracted_text_content="Victim transferred 1500000 to Apex Shell account under fraudulent pretext.",
    )
    db.add(ev)

    fin = FinancialRecord(
        id=str(uuid.uuid4()),
        evidence_id=ev_id,
        sender_account="ACC-001",
        receiver_account="ACC-999",
        amount=1500000.0,
        txn_type="NEFT",
        timestamp=datetime.utcnow(),
    )
    db.add(fin)
    db.commit()

    token = create_access_token(subject=user.username, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # Endpoint 1: GET /api/v1/legal/statutes
    r_statutes = client.get("/api/v1/legal/statutes", headers=headers)
    assert r_statutes.status_code == 200
    statutes_data = r_statutes.json()["data"]
    codes = [s["code"] for s in statutes_data]
    assert "BNS" in codes
    assert "BNSS" in codes
    assert "BSA" in codes

    # Endpoint 2: GET /api/v1/legal/statute/BNS/sections
    r_sections = client.get("/api/v1/legal/statute/BNS/sections", headers=headers)
    assert r_sections.status_code == 200
    sec_data = r_sections.json()["data"]
    assert len(sec_data) >= 5
    sec_nums = [s["section_number"] for s in sec_data]
    assert "318" in sec_nums

    # Endpoint 3: GET /api/v1/legal/section/BNS/318
    r_single = client.get("/api/v1/legal/section/BNS/318", headers=headers)
    assert r_single.status_code == 200
    s_obj = r_single.json()["data"]
    assert s_obj["section_number"] == "318"
    assert s_obj["legacy_code_mapping"]["act"] == "IPC"

    # Endpoint 4: GET /api/v1/legal/section/BNS/999 (Anti-hallucination 404)
    r_invalid = client.get("/api/v1/legal/section/BNS/999", headers=headers)
    assert r_invalid.status_code == 404
    assert "not recognized in authoritative gazetted corpus" in r_invalid.json()["detail"]

    # Endpoint 5: POST /api/v1/legal/map-evidence/{case_id}
    r_map = client.post(f"/api/v1/legal/map-evidence/{case_id}", headers=headers)
    assert r_map.status_code == 200
    map_data = r_map.json()["data"]
    assert map_data["case_id"] == case_id
    assert len(map_data["chains"]) > 0
    first_chain = map_data["chains"][0]
    # Validate 7 steps exist in serialized response
    assert "law" in first_chain
    assert "provision" in first_chain
    assert "condition" in first_chain
    assert "available_evidence" in first_chain
    assert "relevance" in first_chain
    assert "missing_information" in first_chain
    assert "verification" in first_chain

    # Endpoint 6: POST /api/v1/legal/query/{case_id}
    query_payload = {
        "query": "What are the evidentiary requirements for admitting electronic records and phone call logs?",
        "statute_filter": ["BSA", "BNSS"],
        "include_case_evidence": True,
        "include_legacy_concordance": True,
    }
    r_query = client.post(f"/api/v1/legal/query/{case_id}", json=query_payload, headers=headers)
    assert r_query.status_code == 200
    q_data = r_query.json()["data"]
    assert len(q_data["cited_sections"]) > 0
    assert any(c["section_number"] == "63" for c in q_data["cited_sections"])
    assert "DECISION SUPPORT ONLY" in q_data["non_culpability_notice"]

    # Endpoint 7: GET /api/v1/legal/graph
    r_graph = client.get("/api/v1/legal/graph", headers=headers)
    assert r_graph.status_code == 200
    graph_data = r_graph.json()["data"]
    assert graph_data["total_nodes"] > 10
    assert graph_data["total_links"] > 10
