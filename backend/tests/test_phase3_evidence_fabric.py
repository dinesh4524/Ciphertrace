import io
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.case import Case
from app.models.user import User
from app.models.evidence import EvidenceItem
from app.core.security import get_password_hash, create_access_token


def test_evidence_fabric_lifecycle(client: TestClient, db_session: Session):
    # 1. Create investigator user and case
    user = User(
        username="io_khan",
        email="khan@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="Inspector Imran Khan",
        role="INVESTIGATOR",
        badge_number="DL-8842",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-PH3-{uuid.uuid4().hex[:6]}",
        title="Hawala Network Syndicate Investigation",
        crime_category="FINANCIAL_TERROR_FUNDING",
        lead_investigator_id="io_khan",
        assigned_lead_user_id=user.id,
        status="ACTIVE_INVESTIGATION",
        stage="INVESTIGATION_IN_PROGRESS",
        priority="CRITICAL"
    )
    db_session.add(case)
    db_session.commit()

    token = create_access_token(subject=user.id, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload Evidence with Provenance Metadata
    evidence_content = b"Seized iPhone 15 Pro containing encrypted WhatsApp chats and Binance transfer receipts."
    file_payload = ("seized_device_chat_dump.txt", io.BytesIO(evidence_content), "text/plain")

    upload_data = {
        "case_id": case.id,
        "source_type": "DIGITAL_FORENSICS",
        "evidence_category": "CURRENT_CASE_OBSERVED",
        "seizing_officer": "Inspector Imran Khan",
        "place_of_seizure": "Sector 62, Noida, Cyber Hub",
        "witness_details": "Constable Rajesh (DL-1102), Head Constable Verma (DL-3391)",
        "forensic_extraction_tool": "Cellebrite UFED 4.8.1",
        "device_serial_or_imei": "358941092837461"
    }

    response = client.post(
        "/api/v1/evidence/upload",
        data=upload_data,
        files={"file": file_payload},
        headers=headers
    )
    assert response.status_code == 201
    resp_data = response.json()
    assert resp_data["success"] is True
    evidence_id = resp_data["data"]["id"]
    evidence_code = resp_data["data"]["evidence_code"]
    stored_hash = resp_data["data"]["file_hash_sha256"]
    assert evidence_code.startswith("EVID-")
    assert len(stored_hash) == 64

    # 3. Retrieve Evidence Details
    detail_res = client.get(f"/api/v1/evidence/{evidence_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()["data"]
    assert detail["seizing_officer"] == "Inspector Imran Khan"
    assert detail["forensic_extraction_tool"] == "Cellebrite UFED 4.8.1"
    assert detail["extracted_text_content"] is not None
    assert "Binance" in detail["extracted_text_content"]

    # 4. Search and List Evidence
    list_res = client.get(f"/api/v1/evidence/case/{case.id}?search=Binance", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 1

    # 5. Section 63 BSA / Section 65B Cryptographic Integrity Verification
    verify_res = client.post(f"/api/v1/evidence/verify-integrity/{evidence_id}", headers=headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["data"]["is_valid"] is True
    assert verify_res.json()["data"]["integrity_status"] == "VERIFIED"
    assert "Section 63 BSA" in verify_res.json()["data"]["compliance_certification"]

    # 6. Update Evidence Lifecycle Status
    status_res = client.patch(
        f"/api/v1/evidence/{evidence_id}/status",
        json={"evidence_status": "CHALLENGED_IN_COURT", "notes": "Defense counsel filed Section 63 BSA objection"},
        headers=headers
    )
    assert status_res.status_code == 200
    assert status_res.json()["data"]["evidence_status"] == "CHALLENGED_IN_COURT"

    # 7. Update Provenance
    prov_res = client.patch(
        f"/api/v1/evidence/{evidence_id}/provenance",
        json={"place_of_seizure": "Flat 402, Royal Palms, Sector 62, Noida"},
        headers=headers
    )
    assert prov_res.status_code == 200
    assert prov_res.json()["data"]["place_of_seizure"] == "Flat 402, Royal Palms, Sector 62, Noida"
