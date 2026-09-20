import io
import json


def test_ingest_cdr_csv(client):
    # Create Case
    case_res = client.post("/api/v1/cases", json={
        "case_number": "CASE-2026-INGEST-CDR-01",
        "title": "CDR Ingestion Test Case"
    })
    case_id = case_res.json()["data"]["id"]

    # Sample CDR CSV
    cdr_csv_data = (
        "calling_number,called_number,imei,imsi,call_type,start_time,duration_sec,cell_tower_id,latitude,longitude,provider\n"
        "+919876543210,+919811122233,864321045678901,404450123456789,VOICE_CALL,2026-03-10 14:22:15,184,TOWER_DEL_01,28.63,77.21,Airtel\n"
        "+919811122233,+919844455566,864321045678902,404450123456790,VOICE_CALL,2026-03-10 14:45:02,320,TOWER_NOI_02,28.62,77.36,Jio\n"
    ).encode("utf-8")

    file_tuple = ("test_cdr.csv", io.BytesIO(cdr_csv_data), "text/csv")
    res = client.post(
        "/api/v1/ingest/cdr/upload",
        data={
            "case_id": case_id,
            "evidence_category": "CURRENT_CASE_OBSERVED",
            "operator_id": "IO_CDR_ANALYST"
        },
        files={"file": file_tuple}
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["records_extracted"] == 2
    assert data["source_type"] == "CDR"
    assert len(data["file_hash_sha256"]) == 64


def test_ingest_financial_csv(client):
    case_res = client.post("/api/v1/cases", json={
        "case_number": "CASE-2026-INGEST-FIN-01",
        "title": "Financial Ingestion Test Case"
    })
    case_id = case_res.json()["data"]["id"]

    fin_csv_data = (
        "sender_account,receiver_account,sender_bank,receiver_bank,amount,txn_type,utr_reference,timestamp,channel,remarks\n"
        "ACC-001,ACC-002,HDFC Bank,SBI,150000.0,IMPS,UTR001,2026-03-10 12:00:00,MOBILE,Fund transfer\n"
        "ACC-002,ACC-003,SBI,ICICI Bank,140000.0,NEFT,UTR002,2026-03-10 13:00:00,NET_BANKING,Layering hop 1\n"
    ).encode("utf-8")

    file_tuple = ("test_fin.csv", io.BytesIO(fin_csv_data), "text/csv")
    res = client.post(
        "/api/v1/ingest/financial/upload",
        data={
            "case_id": case_id,
            "evidence_category": "CURRENT_CASE_OBSERVED"
        },
        files={"file": file_tuple}
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["records_extracted"] == 2
    assert data["source_type"] == "FINANCIAL"


def test_ingest_fir_json(client):
    case_res = client.post("/api/v1/cases", json={
        "case_number": "CASE-2026-INGEST-FIR-01",
        "title": "FIR Ingestion Test Case"
    })
    case_id = case_res.json()["data"]["id"]

    fir_dict = {
        "fir_number": "FIR/2026/TEST/999",
        "police_station": "Cyber Police Station West",
        "district": "West District",
        "state": "Delhi",
        "sections_invoked": ["BNS 318(4)", "IT Act 66D"],
        "incident_date": "2026-03-01 10:00:00",
        "filing_date": "2026-03-02 12:00:00",
        "informant_narrative": "Informant reported phishing scam leading to OTP bypass."
    }
    fir_bytes = json.dumps(fir_dict).encode("utf-8")

    file_tuple = ("fir_sample.json", io.BytesIO(fir_bytes), "application/json")
    res = client.post(
        "/api/v1/ingest/fir/upload",
        data={"case_id": case_id, "evidence_category": "CURRENT_CASE_OBSERVED"},
        files={"file": file_tuple}
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["fir_number"] == "FIR/2026/TEST/999"
    assert "BNS 318(4)" in data["sections_invoked"]


def test_ingest_interrogation_memo(client):
    case_res = client.post("/api/v1/cases", json={
        "case_number": "CASE-2026-INGEST-INT-01",
        "title": "Interrogation Ingestion Test Case"
    })
    case_id = case_res.json()["data"]["id"]

    res = client.post(
        f"/api/v1/ingest/interrogation?case_id={case_id}&suspect_name=Rajesh+Kumar+@+Raju&role_in_case=SUSPECT&interrogating_officer=Insp+Sharma",
        data={"raw_transcript": "I admit that I procured 50 pre-activated SIM cards from Mewat for the syndicate."}
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["suspect_or_witness_name"] == "Rajesh Kumar @ Raju"
    assert data["source_type"] == "INTERROGATION"
