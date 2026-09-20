import io
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.case import Case
from app.models.user import User
from app.core.security import get_password_hash, create_access_token
from app.utils.nlp_extractor import HybridNLPExtractionEngine
from app.utils.document_processor import detect_document_language, clean_and_preprocess_text


SYNTHETIC_FIR_DOCUMENT = """
FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.)
Police Station: Mandir Marg, New Delhi
FIR No: 0142/2026

Complainant: Sri Ramesh Sharma, Resident of Connaught Place, New Delhi.
Accused: Tariq Ahmed @ Tiger @ Tiger-Mewat, son of Abdul Rehman.
Co-Accused: Imran Khan @ Babloo, operating from Mewat and Jamtara.

Incident Summary:
On 12-08-2026, the complainant was contacted from mobile number 9810123456 and +91-9876543210.
The caller claimed to be Senior Inspector Rajesh Kumar from State Bank of India Cyber Cell.
The victim was induced to transfer sum of INR 4,50,000 to Mule Bank Account SBI-40291028471
having IFSC SBIN0001234 and UPI handle mule.settlement@okaxis.

Subsequent interrogation revealed that accused operated OnePlus handset with IMEI 861234567890123
and SIM card IMSI 404450123456789. The accused fled in vehicle DL-01-AB-1234 towards Gurgaon.
Part of illicit proceeds were converted into Tether USDT wallet Txyz1234567890abcdef1234567890abcde
and Bitcoin address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa.

Case registered under BNS Section 318(4), IPC Section 420, and IT Act Section 66D.
Thana in-charge conducted talashi and panchnama at site.
"""


def test_nlp_extractor_direct_engine():
    cleaned = clean_and_preprocess_text(SYNTHETIC_FIR_DOCUMENT)
    lang = detect_document_language(cleaned)
    assert lang["is_hinglish"] is True
    assert "panchnama" in lang["matched_legal_keywords"] or "thana" in lang["matched_legal_keywords"]

    entities = HybridNLPExtractionEngine.extract_entities(cleaned)
    assert len(entities) > 0

    entity_types = {e.entity_type for e in entities}
    assert "PERSON" in entity_types
    assert "PHONE_NUMBER" in entity_types
    assert "DEVICE" in entity_types
    assert "FINANCIAL_ACCOUNT" in entity_types
    assert "VEHICLE" in entity_types
    assert "LEGAL_SECTION" in entity_types
    assert "LOCATION" in entity_types

    # Test Grounding: Character Offsets & Context
    for ent in entities:
        assert ent.char_start is not None
        assert ent.char_end is not None
        assert ent.context_snippet is not None
        assert ent.raw_value in cleaned

    # Test Relationship Extraction
    relationships = HybridNLPExtractionEngine.extract_relationships(cleaned, entities)
    assert len(relationships) > 0

    rel_types = {r.relationship_type for r in relationships}
    assert any(t in rel_types for t in ["USES_PHONE_NUMBER", "OPERATES_HANDSET_DEVICE", "CONTROLS_BANK_ACCOUNT", "BOOKED_UNDER_SECTION"])


def test_phase4_api_pipeline(client: TestClient, db_session: Session):
    # Setup test user and case
    user = User(
        username="intel_analyst_verma",
        email="verma@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="Analyst Ritu Verma",
        role="INTELLIGENCE_ANALYST",
        badge_number="INT-9011",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-PH4-{uuid.uuid4().hex[:6]}",
        title="Mewat Cyber Fraud Syndicate Operation",
        description="Comprehensive analysis of synthetic criminal network",
        lead_investigator_id="intel_analyst_verma",
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="CRITICAL"
    )
    db_session.add(case)
    db_session.commit()

    token = create_access_token(subject=user.id, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test Direct NLP Sandbox API
    direct_res = client.post(
        "/api/v1/nlp/extract-text",
        json={"text": SYNTHETIC_FIR_DOCUMENT},
        headers=headers
    )
    assert direct_res.status_code == 200
    direct_data = direct_res.json()["data"]
    assert direct_data["entities_count"] > 0
    assert direct_data["relationships_count"] > 0

    # 2. Upload Evidence Document
    file_payload = ("FIR_0142_2026_Mandir_Marg.txt", io.BytesIO(SYNTHETIC_FIR_DOCUMENT.encode("utf-8")), "text/plain")
    upload_data = {
        "case_id": case.id,
        "source_type": "FIR",
        "evidence_category": "CURRENT_CASE_OBSERVED",
        "seizing_officer": "Sub-Inspector V. K. Yadav",
        "place_of_seizure": "PS Mandir Marg Records Room"
    }

    upload_res = client.post(
        "/api/v1/evidence/upload",
        data=upload_data,
        files={"file": file_payload},
        headers=headers
    )
    assert upload_res.status_code == 201
    evidence_id = upload_res.json()["data"]["id"]

    # 3. Process Evidence through NLP Pipeline API
    proc_res = client.post(f"/api/v1/nlp/process-evidence/{evidence_id}", headers=headers)
    assert proc_res.status_code == 200
    proc_data = proc_res.json()["data"]
    assert proc_data["status"] == "SUCCESS"
    assert proc_data["entities_count"] > 0
    assert proc_data["relationships_count"] > 0

    # 4. Fetch Case Extracted Entities
    ent_res = client.get(f"/api/v1/nlp/entities/case/{case.id}", headers=headers)
    assert ent_res.status_code == 200
    case_entities = ent_res.json()["data"]
    assert len(case_entities) == proc_data["entities_count"]

    # Filter by entity type
    phone_res = client.get(f"/api/v1/nlp/entities/case/{case.id}?entity_type=PHONE_NUMBER", headers=headers)
    assert phone_res.status_code == 200
    assert all(e["entity_type"] == "PHONE_NUMBER" for e in phone_res.json()["data"])

    # 5. Fetch Case Extracted Relationships
    rel_res = client.get(f"/api/v1/nlp/relationships/case/{case.id}", headers=headers)
    assert rel_res.status_code == 200
    case_rels = rel_res.json()["data"]
    assert len(case_rels) == proc_data["relationships_count"]
