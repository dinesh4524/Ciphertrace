import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.cdr import CDRRecord
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.financial import FinancialRecord
from app.models.fir import FIRDocument
from app.models.user import User
from app.utils.temporal_engine import TemporalIntelligenceEngine


def test_temporal_engine_direct_algorithms():
    """
    Direct unit test of Phase 10 Temporal Intelligence Engine:
    1. Unified Chronological Timeline Generation
    2. Communication Burst Detection (Z-Score & Spike)
    3. Transaction Burst Detection (Mule Velocity)
    4. Spatiotemporal Anomalies (Impossible speed > 800 km/h & Nocturnal pings)
    5. Relationship Emergence & Dormancy
    6. Clean-Slate Anomaly Engine (Zero-prior record separation)
    """
    base_time = datetime(2026, 9, 10, 10, 0, 0)

    # 1. Test Timeline & Communication Bursts
    # 4 calls between +91-9876543210 and +91-9123456780 within 30 minutes (Burst)
    cdrs = [
        {
            "id": "c1",
            "calling_number": "+91-9876543210",
            "called_number": "+91-9123456780",
            "call_type": "VOICE_CALL",
            "start_time": base_time.isoformat(),
            "duration_sec": 120,
            "cell_tower_id": "MUMBAI_BANDRA_01",
            "latitude": 19.0596,
            "longitude": 72.8295,
        },
        {
            "id": "c2",
            "calling_number": "+91-9876543210",
            "called_number": "+91-9123456780",
            "call_type": "VOICE_CALL",
            "start_time": (base_time + timedelta(minutes=5)).isoformat(),
            "duration_sec": 45,
            "cell_tower_id": "MUMBAI_BANDRA_01",
            "latitude": 19.0596,
            "longitude": 72.8295,
        },
        {
            "id": "c3",
            "calling_number": "+91-9876543210",
            "called_number": "+91-9123456780",
            "call_type": "SMS",
            "start_time": (base_time + timedelta(minutes=15)).isoformat(),
            "duration_sec": 0,
            "cell_tower_id": "MUMBAI_BANDRA_02",
            "latitude": 19.0600,
            "longitude": 72.8300,
        },
        {
            "id": "c4",
            "calling_number": "+91-9876543210",
            "called_number": "+91-9123456780",
            "call_type": "VOICE_CALL",
            "start_time": (base_time + timedelta(minutes=25)).isoformat(),
            "duration_sec": 300,
            "cell_tower_id": "MUMBAI_BANDRA_02",
            "latitude": 19.0600,
            "longitude": 72.8300,
        },
        # Impossible Speed CDR: Same phone connects in Delhi 20 minutes later! (~1150 km away)
        {
            "id": "c5",
            "calling_number": "+91-9876543210",
            "called_number": "+91-9999999999",
            "call_type": "VOICE_CALL",
            "start_time": (base_time + timedelta(minutes=45)).isoformat(),
            "duration_sec": 60,
            "cell_tower_id": "DELHI_CONNAUGHT_01",
            "latitude": 28.6315,
            "longitude": 77.2167,
        },
        # Nocturnal call at 02:30 AM
        {
            "id": "c6",
            "calling_number": "+91-9876543210",
            "called_number": "+91-8888888888",
            "call_type": "VOICE_CALL",
            "start_time": (base_time.replace(hour=2, minute=30)).isoformat(),
            "duration_sec": 180,
            "cell_tower_id": "MUMBAI_SEAPORT_03",
            "latitude": 18.9500,
            "longitude": 72.8500,
        },
        {
            "id": "c7",
            "calling_number": "+91-9876543210",
            "called_number": "+91-8888888888",
            "call_type": "SMS",
            "start_time": (base_time.replace(hour=3, minute=10)).isoformat(),
            "duration_sec": 0,
            "cell_tower_id": "MUMBAI_SEAPORT_03",
            "latitude": 18.9500,
            "longitude": 72.8500,
        },
    ]

    # 2. Test Financial Bursts
    # Account 99001122 receives 3 transfers totaling 4.5 Lakhs within 1 hour
    financials = [
        {
            "id": "f1",
            "sender_account": "ACCT_S1",
            "receiver_account": "ACCT_MULE_99",
            "amount": 150000.0,
            "currency": "INR",
            "txn_type": "IMPS",
            "utr_reference": "UTR1001",
            "timestamp": base_time.isoformat(),
            "channel": "MOBILE_BANKING",
        },
        {
            "id": "f2",
            "sender_account": "ACCT_S2",
            "receiver_account": "ACCT_MULE_99",
            "amount": 200000.0,
            "currency": "INR",
            "txn_type": "UPI",
            "utr_reference": "UTR1002",
            "timestamp": (base_time + timedelta(minutes=20)).isoformat(),
            "channel": "UPI_APP",
        },
        {
            "id": "f3",
            "sender_account": "ACCT_S3",
            "receiver_account": "ACCT_MULE_99",
            "amount": 100000.0,
            "currency": "INR",
            "txn_type": "NEFT",
            "utr_reference": "UTR1003",
            "timestamp": (base_time + timedelta(minutes=40)).isoformat(),
            "channel": "BRANCH",
        },
    ]

    # 3. Test Timeline Generation
    timeline = TemporalIntelligenceEngine.build_unified_timeline(
        cdrs=cdrs,
        financials=financials,
        firs=[],
        evidence_items=[]
    )
    assert len(timeline) == len(cdrs) + len(financials)
    # Check chronological ordering
    timestamps = [e["timestamp"] for e in timeline]
    assert timestamps == sorted(timestamps)

    # 4. Test Communication Bursts
    comm_bursts = TemporalIntelligenceEngine.detect_communication_bursts(cdrs, window_hours=2, z_threshold=1.5)
    assert len(comm_bursts) >= 1
    assert comm_bursts[0]["call_count"] >= 3

    # 5. Test Transaction Bursts
    fin_bursts = TemporalIntelligenceEngine.detect_transaction_bursts(financials, window_hours=4, min_txns=2)
    assert len(fin_bursts) >= 1
    assert fin_bursts[0]["target_account"] == "ACCT_MULE_99"
    assert fin_bursts[0]["total_volume_inr"] == 450000.0

    # 6. Test Spatiotemporal Anomalies
    loc_anomalies = TemporalIntelligenceEngine.detect_location_anomalies(cdrs)
    assert len(loc_anomalies) >= 1
    speed_anom = next((a for a in loc_anomalies if a["anomaly_type"] == "IMPOSSIBLE_TRAVEL_VELOCITY"), None)
    assert speed_anom is not None
    assert speed_anom["calculated_speed_kmh"] > 800.0
    assert "MUMBAI" in speed_anom["origin_tower"]
    assert "DELHI" in speed_anom["destination_tower"]

    # Nocturnal ping detection
    nocturnal_anom = next((a for a in loc_anomalies if a["anomaly_type"] == "NOCTURNAL_OFF_HOURS_BURST"), None)
    assert nocturnal_anom is not None
    assert nocturnal_anom["pings_count"] >= 2

    # 7. Test Clean-Slate Anomaly Engine
    # Entity 1: "Kartik Sharma" has ZERO historical record, but operates ACCT_MULE_99 (received 4.5 Lakhs)
    # Entity 2: "Don Dawood" is linked to a HISTORICAL_CRIMINAL_RECORD evidence item
    entities = [
        {"id": "e1", "evidence_id": "ev_current", "name": "ACCT_MULE_99", "raw_value": "ACCT_MULE_99", "entity_type": "ACCOUNT"},
        {"id": "e2", "evidence_id": "ev_historical", "name": "Don Dawood", "raw_value": "Don Dawood", "entity_type": "PERSON"},
    ]
    evidence_items = [
        {"id": "ev_current", "evidence_category": "CURRENT_CASE_OBSERVED"},
        {"id": "ev_historical", "evidence_category": "HISTORICAL_CRIMINAL_RECORD"},
    ]

    clean_slate_hypotheses = TemporalIntelligenceEngine.evaluate_clean_slate_anomalies(
        entities=entities,
        current_case_timeline=timeline,
        evidence_items=evidence_items,
        detected_bursts=comm_bursts + fin_bursts,
        location_anomalies=loc_anomalies
    )

    assert len(clean_slate_hypotheses) >= 1
    # ACCT_MULE_99 must be flagged as clean-slate recruit
    mule_hyp = next((h for h in clean_slate_hypotheses if h["entity_identifier"] == "ACCT_MULE_99"), None)
    assert mule_hyp is not None
    assert mule_hyp["has_historical_criminal_record"] is False
    assert mule_hyp["current_case_financial_volume"] == 450000.0
    assert "MULE" in mule_hyp["risk_archetype"]

    # Don Dawood must NOT be in clean slate hypotheses (he has historical records)
    assert not any(h["entity_identifier"] == "Don Dawood" for h in clean_slate_hypotheses)


def test_phase10_api_endpoints(client: TestClient, db_session: Session):
    """
    Integration test for Phase 10 REST endpoints:
    - GET /api/v1/analytics/temporal-intelligence/{case_id}
    - GET /api/v1/analytics/clean-slate-anomalies/{case_id}
    """
    unique_suffix = uuid.uuid4().hex[:6]
    user = User(
        username=f"temporal_analyst_{unique_suffix}",
        email=f"temporal_{unique_suffix}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="Anjali Menon",
        role="INTELLIGENCE_ANALYST",
        badge_number=f"INT-{unique_suffix}",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-PH10-{unique_suffix}",
        title="Phase 10 Temporal Telemetry & Clean-Slate Anomaly Dissection",
        description="Temporal burst analysis and clean-slate mule identification",
        lead_investigator_id=f"temporal_analyst_{unique_suffix}",
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="HIGH"
    )
    db_session.add(case)
    db_session.commit()

    # Evidence 1: Current Case Evidence
    ev_current = EvidenceItem(
        evidence_code=f"EVID-CURR-{unique_suffix}",
        case_id=case.id,
        source_type="CDR",
        evidence_category="CURRENT_CASE_OBSERVED",
        file_name="current_case_cdr_and_bank.csv",
        file_hash_sha256="aa11bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff00112233",
        ingested_by_operator=user.username
    )
    # Evidence 2: Historical Criminal Record (isolated from current signals)
    ev_historical = EvidenceItem(
        evidence_code=f"EVID-HIST-{unique_suffix}",
        case_id=case.id,
        source_type="FIR",
        evidence_category="HISTORICAL_CRIMINAL_RECORD",
        file_name="state_crime_record_bureau_conviction.pdf",
        file_hash_sha256="bb22cc33dd44ee55ff6600112233445566778899aabbccddeeff001122334455",
        ingested_by_operator=user.username
    )
    db_session.add_all([ev_current, ev_historical])
    db_session.commit()

    base_time = datetime.utcnow() - timedelta(days=2)

    # Add CDRs to current evidence (burst calls)
    c1 = CDRRecord(
        evidence_id=ev_current.id,
        calling_number="+91-9988776655",
        called_number="+91-7788990011",
        call_type="VOICE_CALL",
        start_time=base_time,
        duration_sec=90,
        cell_tower_id="HYD_HITECH_01",
        latitude=17.4435,
        longitude=78.3772
    )
    c2 = CDRRecord(
        evidence_id=ev_current.id,
        calling_number="+91-9988776655",
        called_number="+91-7788990011",
        call_type="VOICE_CALL",
        start_time=base_time + timedelta(minutes=10),
        duration_sec=140,
        cell_tower_id="HYD_HITECH_01",
        latitude=17.4435,
        longitude=78.3772
    )
    c3 = CDRRecord(
        evidence_id=ev_current.id,
        calling_number="+91-9988776655",
        called_number="+91-7788990011",
        call_type="VOICE_CALL",
        start_time=base_time + timedelta(minutes=20),
        duration_sec=210,
        cell_tower_id="HYD_HITECH_02",
        latitude=17.4440,
        longitude=78.3780
    )
    db_session.add_all([c1, c2, c3])

    # Add Financial Records (mule transfer burst into ACCT-CLEAN-MULE)
    f1 = FinancialRecord(
        evidence_id=ev_current.id,
        sender_account="ACCT-HAWALA-ORIGIN",
        receiver_account="ACCT-CLEAN-MULE",
        amount=250000.0,
        currency="INR",
        txn_type="IMPS",
        utr_reference=f"UTR-{unique_suffix}-1",
        timestamp=base_time + timedelta(hours=1),
        channel="MOBILE_BANKING"
    )
    f2 = FinancialRecord(
        evidence_id=ev_current.id,
        sender_account="ACCT-HAWALA-ORIGIN-2",
        receiver_account="ACCT-CLEAN-MULE",
        amount=350000.0,
        currency="INR",
        txn_type="RTGS",
        utr_reference=f"UTR-{unique_suffix}-2",
        timestamp=base_time + timedelta(hours=2),
        channel="BRANCH"
    )
    db_session.add_all([f1, f2])

    # Add Entities
    e1 = ExtractedEntity(
        evidence_id=ev_current.id,
        case_id=case.id,
        entity_type="ACCOUNT",
        raw_value="ACCT-CLEAN-MULE",
        normalized_value="ACCT-CLEAN-MULE",
        confidence=0.95
    )
    # Historical habitual offender
    e2 = ExtractedEntity(
        evidence_id=ev_historical.id,
        case_id=case.id,
        entity_type="PERSON",
        raw_value="Habitual Smuggler Rao",
        normalized_value="Habitual Smuggler Rao",
        confidence=0.95
    )
    db_session.add_all([e1, e2])
    db_session.commit()

    token = create_access_token(subject=user.id, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test GET /temporal-intelligence/{case_id}
    res = client.get(f"/api/v1/analytics/temporal-intelligence/{case.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total_events"] >= 5
    assert len(data["timeline"]) >= 5
    assert "communication_bursts" in data
    assert "transaction_bursts" in data
    assert "clean_slate_anomalies" in data
    assert "BSA 2023" in data["judicial_disclaimer"]

    # 2. Test GET /clean-slate-anomalies/{case_id}
    cs_res = client.get(f"/api/v1/analytics/clean-slate-anomalies/{case.id}", headers=headers)
    assert cs_res.status_code == 200
    cs_data = cs_res.json()["data"]
    assert len(cs_data) >= 1

    # Verify ACCT-CLEAN-MULE is flagged with high anomaly score and zero prior records
    clean_target = next((item for item in cs_data if item["entity_identifier"] == "ACCT-CLEAN-MULE"), None)
    assert clean_target is not None
    assert clean_target["has_historical_criminal_record"] is False
    assert clean_target["current_case_financial_volume"] == 600000.0
    assert clean_target["current_case_anomaly_score"] >= 30.0
    assert "MULE" in clean_target["risk_archetype"]

    # Verify Habitual Smuggler Rao is NOT present in clean-slate anomalies
    assert not any(item["entity_identifier"] == "Habitual Smuggler Rao" for item in cs_data)
