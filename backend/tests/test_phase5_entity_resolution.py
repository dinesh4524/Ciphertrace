import io
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.extracted_entity import ExtractedEntity
from app.models.evidence import EvidenceItem
from app.models.user import User
from app.utils.entity_resolver import EntityResolutionEngine


def test_entity_resolution_engine_algorithms():
    # 1. Alias Cross-Matching
    score1, match_type1, feats1 = EntityResolutionEngine.compare_persons(
        "Tariq Ahmed @ Tiger", "Tiger-Mewat @ Tiger"
    )
    assert score1 >= 0.90
    assert "ALIAS" in match_type1

    # 2. Multilingual / Transliteration Variations (Mohd / Mohammad, Khan / Qan)
    score2, match_type2, feats2 = EntityResolutionEngine.compare_persons(
        "Mohd Khan", "Mohammad Qan"
    )
    assert score2 >= 0.90
    assert match_type2 == "MULTILINGUAL_TRANSLIT_MATCH"

    # 3. Initials Expansion (R. Sharma vs Ramesh Sharma)
    score3, match_type3, feats3 = EntityResolutionEngine.compare_persons(
        "R. Sharma", "Ramesh Sharma"
    )
    assert score3 >= 0.80
    assert match_type3 == "INITIALS_EXPANSION_MATCH"

    # 4. Phonetic Match (Chowdhury vs Chaudhry)
    score4, match_type4, feats4 = EntityResolutionEngine.compare_persons(
        "Imran Chowdhury", "Imran Chaudhry"
    )
    assert score4 >= 0.85

    # 5. Phone Normalization (Last 10 digits)
    p_score, p_type, _ = EntityResolutionEngine.compare_phone_numbers("+91-9876543210", "09876543210")
    assert p_score == 1.0
    assert p_type == "PHONE_EXACT_MATCH"

    # 6. Negative Case (Unrelated individuals)
    neg_score, _, _ = EntityResolutionEngine.compare_persons("Ramesh Sharma", "Sunil Patel")
    assert neg_score < 0.60


def test_phase5_api_human_in_the_loop_workflow(client: TestClient, db_session: Session):
    # Create test investigator
    user = User(
        username="lead_analyst_iyer",
        email="iyer@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="Lead Analyst Priya Iyer",
        role="INTELLIGENCE_ANALYST",
        badge_number="INT-8821",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-PH5-{uuid.uuid4().hex[:6]}",
        title="Hawala Syndicate Cross-Border Network",
        description="Complex identity resolution case",
        lead_investigator_id="lead_analyst_iyer",
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="CRITICAL"
    )
    db_session.add(case)
    db_session.commit()

    evidence = EvidenceItem(
        evidence_code=f"EVID-2026-PH5-{uuid.uuid4().hex[:4]}",
        case_id=case.id,
        source_type="FIR",
        evidence_category="CURRENT_CASE_OBSERVED",
        file_name="fir_transcript_dump.txt",
        file_hash_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        ingested_by_operator="lead_analyst_iyer"
    )
    db_session.add(evidence)
    db_session.commit()

    # Add extracted entities with subtle variations
    e1 = ExtractedEntity(
        evidence_id=evidence.id,
        case_id=case.id,
        entity_type="PERSON",
        raw_value="Tariq Ahmed @ Tiger",
        normalized_value="Tariq Ahmed @ Tiger",
        confidence=0.95
    )
    e2 = ExtractedEntity(
        evidence_id=evidence.id,
        case_id=case.id,
        entity_type="PERSON",
        raw_value="Tiger Mewat",
        normalized_value="Tiger Mewat @ Tiger",
        confidence=0.92
    )
    e3 = ExtractedEntity(
        evidence_id=evidence.id,
        case_id=case.id,
        entity_type="PERSON",
        raw_value="Mohd Imran Khan",
        normalized_value="Mohd Imran Khan",
        confidence=0.94
    )
    e4 = ExtractedEntity(
        evidence_id=evidence.id,
        case_id=case.id,
        entity_type="PERSON",
        raw_value="Mohammed Imran Qan",
        normalized_value="Mohammed Imran Qan",
        confidence=0.91
    )
    db_session.add_all([e1, e2, e3, e4])
    db_session.commit()

    token = create_access_token(subject=user.id, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Run Entity Resolution Pipeline
    run_res = client.post(f"/api/v1/entity-resolution/cases/{case.id}/run?threshold=0.70", headers=headers)
    assert run_res.status_code == 200
    run_data = run_res.json()["data"]
    assert run_data["candidates_generated"] >= 2

    # 2. Fetch Pending Candidates
    cands_res = client.get(f"/api/v1/entity-resolution/cases/{case.id}/candidates?review_status=PENDING_REVIEW", headers=headers)
    assert cands_res.status_code == 200
    candidates = cands_res.json()["data"]
    assert len(candidates) >= 2

    cand1 = candidates[0]
    cand2 = candidates[1]

    # 3. Investigator Review: ACCEPT Candidate 1 (Tariq Ahmed @ Tiger <-> Tiger Mewat)
    review_res1 = client.post(
        f"/api/v1/entity-resolution/candidates/{cand1['id']}/review",
        json={
            "decision": "ACCEPTED",
            "decision_reason": "Verified via FIR statement and interrogation alias matching",
            "merge_directive": "MERGE_AS_CANONICAL"
        },
        headers=headers
    )
    assert review_res1.status_code == 200
    assert review_res1.json()["data"]["review_status"] == "ACCEPTED"
    assert review_res1.json()["data"]["reviewer_username"] == "lead_analyst_iyer"

    # 4. Investigator Review: REJECT Candidate 2
    review_res2 = client.post(
        f"/api/v1/entity-resolution/candidates/{cand2['id']}/review",
        json={
            "decision": "REJECTED",
            "decision_reason": "Different fathers recorded in panchnama memos",
            "merge_directive": "KEEP_SEPARATE"
        },
        headers=headers
    )
    assert review_res2.status_code == 200
    assert review_res2.json()["data"]["review_status"] == "REJECTED"

    # 5. Fetch Canonical Entities (Should have 1 verified canonical cluster)
    canon_res = client.get(f"/api/v1/entity-resolution/cases/{case.id}/canonical-entities", headers=headers)
    assert canon_res.status_code == 200
    canon_list = canon_res.json()["data"]
    assert len(canon_list) == 1
    assert canon_list[0]["canonical_code"].startswith("CANON-")
    assert canon_list[0]["members_count"] == 2
