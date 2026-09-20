import pytest
from app.services.user_service import UserService


def test_case_priority_stage_and_notes(client):
    # 1. Seed users to ensure IDs are available
    client.post("/api/v1/auth/seed")

    # 2. Create case with priority and stage
    case_payload = {
        "case_number": "CASE-2026-MNG-001",
        "title": "Operation RedHorizon: Transnational Hawala",
        "crime_category": "HAWALA_MONEY_LAUNDERING",
        "priority": "CRITICAL",
        "stage": "EVIDENCE_COLLECTION",
        "is_confidential": False,
        "lead_investigator_id": "IO-SHARMA"
    }
    create_res = client.post("/api/v1/cases", json=case_payload)
    assert create_res.status_code == 201
    case_data = create_res.json()["data"]
    case_id = case_data["id"]
    assert case_data["priority"] == "CRITICAL"
    assert case_data["stage"] == "EVIDENCE_COLLECTION"

    # 3. Add a Case Ledger Note
    note_payload = {
        "note_type": "HYPOTHESIS",
        "title": "Suspected Dubai Hawala Routing",
        "content": "CDR bursts to UAE gateway correspond with 5 high-value NEFT settlements."
    }
    note_res = client.post(f"/api/v1/cases/{case_id}/notes", json=note_payload)
    assert note_res.status_code == 201
    note_data = note_res.json()["data"]
    assert note_data["note_type"] == "HYPOTHESIS"
    assert note_data["title"] == "Suspected Dubai Hawala Routing"

    # 4. Fetch Notes
    get_notes_res = client.get(f"/api/v1/cases/{case_id}/notes")
    assert get_notes_res.status_code == 200
    notes = get_notes_res.json()["data"]
    assert len(notes) >= 1

    # 5. Transition Status with Supervisory Directive (Requires Senior Investigator)
    login_res = client.post("/api/v1/auth/login", json={"username": "supervisor_verma", "password": "Password123!"})
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    status_payload = {
        "status": "UNDER_REVIEW",
        "stage": "INTERROGATION_PHASE",
        "reason_or_directive": "Forensic extraction complete. Proceed with custodial questioning of lead mule."
    }
    status_res = client.put(f"/api/v1/cases/{case_id}/status", json=status_payload, headers=headers)
    assert status_res.status_code == 200
    updated_case = status_res.json()["data"]
    assert updated_case["status"] == "UNDER_REVIEW"
    assert updated_case["stage"] == "INTERROGATION_PHASE"

    # 6. Verify Dashboard Statistics
    dash_res = client.get("/api/v1/cases/dashboard/stats")
    assert dash_res.status_code == 200
    stats = dash_res.json()["data"]
    assert stats["total_cases"] >= 1
    assert stats["critical_priority_cases"] >= 1
    assert stats["under_review_cases"] >= 1
