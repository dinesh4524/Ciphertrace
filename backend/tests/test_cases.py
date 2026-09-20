def test_create_and_get_case(client):
    payload = {
        "case_number": "CASE-2026-DEL-CYBER-9901",
        "title": "Operation BlackLedger - Hawala Smuggling",
        "description": "Multi-tier cyber syndicate laundering through mule accounts",
        "crime_category": "ORGANIZED_CYBER_FRAUD",
        "status": "ACTIVE",
        "lead_investigator_id": "IO_INSP_MEHTA",
        "investigating_agency": "State Cyber Crime Branch",
        "police_station": "Cyber PS Central",
        "district": "Central Delhi",
        "state": "Delhi",
        "tags": ["hawala", "mule", "sim_box"],
        "case_metadata": {"priority_level": "CRITICAL"}
    }

    # Create Case
    response = client.post("/api/v1/cases", json=payload)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["success"] is True
    case_id = res_data["data"]["id"]
    assert res_data["data"]["case_number"] == "CASE-2026-DEL-CYBER-9901"

    # Get Case by ID
    get_res = client.get(f"/api/v1/cases/{case_id}")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["title"] == "Operation BlackLedger - Hawala Smuggling"

    # List Cases
    list_res = client.get("/api/v1/cases?search=BlackLedger")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(c["id"] == case_id for c in list_data["items"])
