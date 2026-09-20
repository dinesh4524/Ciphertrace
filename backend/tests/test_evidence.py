import io
from app.utils.crypto import calculate_bytes_sha256


def test_evidence_upload_and_integrity_verification(client):
    # 1. Create a case first
    case_payload = {
        "case_number": "CASE-2026-TEST-EVID-001",
        "title": "Evidence Integrity Test Case",
        "crime_category": "FINANCIAL_FRAUD"
    }
    case_res = client.post("/api/v1/cases", json=case_payload)
    assert case_res.status_code == 201
    case_id = case_res.json()["data"]["id"]

    # 2. Upload an evidence file
    evidence_content = b"FORENSIC_SEIZURE_MEMO_CONTENT_HASH_VALIDATION_STRING_XYZ_123"
    expected_hash = calculate_bytes_sha256(evidence_content)

    file_tuple = ("seizure_memo.txt", io.BytesIO(evidence_content), "text/plain")
    upload_res = client.post(
        "/api/v1/evidence/upload",
        data={
            "case_id": case_id,
            "source_type": "SEIZURE_MEMO",
            "evidence_category": "CURRENT_CASE_OBSERVED",
            "operator_id": "IO_TEST_OFFICER"
        },
        files={"file": file_tuple}
    )
    assert upload_res.status_code == 201
    evidence_data = upload_res.json()["data"]
    evidence_id = evidence_data["id"]
    assert evidence_data["file_hash_sha256"] == expected_hash
    assert evidence_data["integrity_status"] == "VERIFIED"

    # 3. Test on-demand Section 65B/63 BSA hash verification endpoint
    verify_res = client.post(f"/api/v1/evidence/verify-integrity/{evidence_id}")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()["data"]
    assert verify_data["is_valid"] is True
    assert verify_data["stored_hash_sha256"] == expected_hash
    assert verify_data["computed_hash_sha256"] == expected_hash
    assert verify_data["integrity_status"] == "VERIFIED"
