def test_audit_log_recording_and_query(client):
    # Create Case which triggers audit log
    case_res = client.post("/api/v1/cases", json={
        "case_number": "CASE-2026-AUDIT-TEST-01",
        "title": "Audit Logging Test Case"
    })
    case_id = case_res.json()["data"]["id"]

    # Query audit logs
    audit_res = client.get(f"/api/v1/audit/logs?case_id={case_id}")
    assert audit_res.status_code == 200
    logs = audit_res.json()["items"]
    assert len(logs) >= 1
    assert any(log["action_type"] == "CASE_CREATED" for log in logs)
    assert logs[0]["entry_hash_sha256"] is not None
    assert len(logs[0]["entry_hash_sha256"]) == 64
