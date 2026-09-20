import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.models.user import User
from app.schemas.investigative_priority import (
    InvestigativePriorityLevel,
    PriorityScoreFactors,
    UncertaintyAnalysis,
)
from app.utils.information_gain_engine import NextBestActionEngine
from app.utils.priority_engine import InvestigativePriorityEngine


def test_investigative_priority_engine_direct():
    """
    Direct unit test for InvestigativePriorityEngine:
    - Evaluates 9 evidentiary dimensions.
    - Verifies composite priority score (0-100), priority level categorization,
      supporting evidence, contradictory evidence, and alternative explanations.
    """
    evidence_items = [
        {"id": "ev-1", "file_name": "hawala_ledger.pdf", "integrity_status": "VERIFIED", "source_type": "FINANCIAL"},
        {"id": "ev-2", "file_name": "burner_cdr.csv", "integrity_status": "VERIFIED", "source_type": "CDR"},
    ]
    graph_nodes = [
        {"id": "node-1", "name": "Vikram Sharma", "label": "Person", "degree": 4},
        {"id": "node-2", "name": "Hawala Operator A", "label": "Person", "degree": 2},
    ]
    graph_edges = [
        {"source": "Vikram Sharma", "target": "Hawala Operator A", "label": "TRANSFERRED", "confidence": 0.95},
        {"source": "Vikram Sharma", "target": "Burner Phone 1", "label": "USES_PHONE_NUMBER", "confidence": 0.90},
        {"source": "Burner Phone 1", "target": "+91-9988776655", "label": "CALLED", "confidence": 0.88},
        {"source": "Vikram Sharma", "target": "Tower South Port", "label": "LOCATED_AT", "confidence": 0.85},
    ]
    temporal_bursts = [
        {"description": "Call burst involving Vikram Sharma prior to transshipment", "associated_entities": ["Vikram Sharma"]}
    ]
    anomalies = [
        {"anomaly_type": "FAN_IN_AGGREGATION", "entity_name": "Vikram Sharma", "severity": "HIGH"},
        {"anomaly_type": "CRITICAL_BRIDGE", "entity_name": "Vikram Sharma", "severity": "CRITICAL"}
    ]
    document_chunks = [
        {"id": "c-1", "content": "Ledger confiscated at port marks payment transfer to Vikram Sharma for customs clearance."}
    ]

    result = InvestigativePriorityEngine.assess_priority(
        target_name="Vikram Sharma",
        target_id="node-1",
        lead_title="Customs Port Clearance Hawala Network",
        evidence_items=evidence_items,
        graph_nodes=graph_nodes,
        graph_edges=graph_edges,
        temporal_bursts=temporal_bursts,
        anomalies=anomalies,
        document_chunks=document_chunks
    )

    # 1. Validate Priority Level & Score
    assert 0.0 <= result["priority_score"] <= 100.0
    assert result["priority_level"] in [
        InvestigativePriorityLevel.CRITICAL,
        InvestigativePriorityLevel.HIGH,
        InvestigativePriorityLevel.MEDIUM,
        InvestigativePriorityLevel.LOW,
    ]
    assert result["priority_level"] in [InvestigativePriorityLevel.CRITICAL, InvestigativePriorityLevel.HIGH]

    # 2. Validate 9-Factor Scores
    factors: PriorityScoreFactors = result["score_factors"]
    assert 0.0 <= factors.evidence_strength <= 10.0
    assert 0.0 <= factors.temporal_correlation <= 10.0
    assert 0.0 <= factors.network_relevance <= 10.0
    assert 0.0 <= factors.anomaly_score <= 10.0
    assert 0.0 <= factors.corroboration_index <= 10.0
    assert 0.0 <= factors.source_reliability <= 10.0
    assert 0.0 <= factors.contradictory_penalty <= 10.0
    assert 0.0 <= factors.alternative_explanation_discount <= 10.0
    assert 0.0 <= factors.uncertainty_penalty <= 10.0

    # 3. Validate Supporting & Contradictory Evidence
    assert len(result["supporting_evidence"]) >= 2
    for s in result["supporting_evidence"]:
        assert s.confidence_weight > 0.0
        assert s.modality in ["CDR", "FINANCIAL", "LOCATION", "DOCUMENT", "ASSOCIATION"]

    # 4. Validate Alternative Explanations
    assert len(result["alternative_explanations"]) >= 1
    assert any("Commercial" in alt or "Social" in alt for alt in result["alternative_explanations"])

    # 5. Validate Uncertainty & Recommended Verifications
    assert 0.0 <= result["uncertainty"].uncertainty_score <= 1.0
    assert len(result["recommended_verification"]) >= 2
    assert any("Section 91 BNSS" in rec or "Section 63 BSA" in rec for rec in result["recommended_verification"])


def test_next_best_action_engine_eig_ranking():
    """
    Direct unit test for NextBestActionEngine:
    - Verifies Expected Information Gain (EIG) calculation.
    - Verifies actions are strictly sorted by EIG in descending order.
    - Verifies presence of statutory compliance citations under BNSS 2023 and BSA 2023.
    """
    factors = PriorityScoreFactors(
        evidence_strength=7.5,
        temporal_correlation=6.0,
        network_relevance=8.0,
        anomaly_score=7.0,
        corroboration_index=4.5,
        source_reliability=8.5,
        contradictory_penalty=2.0,
        alternative_explanation_discount=3.5,
        uncertainty_penalty=4.0
    )
    uncertainty = UncertaintyAnalysis(
        uncertainty_score=0.40,
        uncertainty_level="MEDIUM",
        key_entropy_drivers=["Missing verified bank ledger statements"]
    )

    actions = NextBestActionEngine.generate_actions(
        target_entity_name="Vikram Sharma",
        factors=factors,
        uncertainty=uncertainty
    )

    assert len(actions) >= 4

    # 1. Verify Expected Information Gain range and descending order
    for i in range(len(actions) - 1):
        assert actions[i].expected_info_gain >= actions[i + 1].expected_info_gain
        assert actions[i].rank == i + 1
        assert 0.0 <= actions[i].expected_info_gain <= 1.0

    # 2. Verify statutory citations
    statutory_texts = " ".join([a.statutory_mandate for a in actions])
    assert "Section 91" in statutory_texts
    assert "Section 63" in statutory_texts

    # 3. Verify top action has high EIG
    top_action = actions[0]
    assert top_action.expected_info_gain >= 0.70
    assert len(top_action.hypotheses_resolved) >= 1
    assert len(top_action.evidence_gaps_addressed) >= 1


def test_priority_api_integration_pipeline(client: TestClient, db_session: Session):
    """
    Integration test for PriorityService and REST Endpoints:
    - Ingests test case with entities and relationships.
    - Calls POST /api/v1/priority/assess/{case_id}
    - Calls GET /api/v1/priority/history/{case_id}
    - Calls GET /api/v1/priority/assessment/{assessment_id}
    - Validates response schemas and database persistence.
    """
    unique = uuid.uuid4().hex[:6]
    user = User(
        username=f"lead_io_{unique}",
        email=f"io_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Lead IO Roy",
        role="INVESTIGATOR",
        badge_number=f"PRI-{unique}",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    case = Case(
        case_number=f"FIR-PRI-2026-{unique}",
        title="Hawala Routing & Hawala Hub Investigation",
        description="Comprehensive priority assessment of primary money handler.",
        status="ACTIVE_INVESTIGATION",
        priority="HIGH",
        assigned_lead_user_id=user.id,
    )
    db_session.add(case)
    db_session.commit()
    db_session.refresh(case)

    # Ingest evidence
    evidence = EvidenceItem(
        case_id=case.id,
        evidence_code=f"EVID-PRI-{unique}-01",
        file_name="ledger_and_calls.pdf",
        source_type="FINANCIAL",
        file_hash_sha256="11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
        file_path="/data/evidence/ledger.pdf",
        file_size_bytes=2048,
    )
    db_session.add(evidence)
    db_session.commit()
    db_session.refresh(evidence)

    # Add entities
    ent_a = ExtractedEntity(
        case_id=case.id,
        evidence_id=evidence.id,
        entity_type="PERSON",
        raw_value="Deepak Verma",
        normalized_value="Deepak Verma",
        confidence=0.96,
        char_start=0,
        char_end=12
    )
    ent_b = ExtractedEntity(
        case_id=case.id,
        evidence_id=evidence.id,
        entity_type="ACCOUNT",
        raw_value="HDFC-889900",
        normalized_value="HDFC-889900",
        confidence=0.94,
        char_start=20,
        char_end=31
    )
    db_session.add_all([ent_a, ent_b])
    db_session.commit()
    db_session.refresh(ent_a)
    db_session.refresh(ent_b)

    # Add relationship
    rel = ExtractedRelationship(
        case_id=case.id,
        evidence_id=evidence.id,
        source_entity_id=ent_a.id,
        target_entity_id=ent_b.id,
        source_value=ent_a.normalized_value,
        target_value=ent_b.normalized_value,
        relationship_type="CONTROLS_BANK_ACCOUNT",
        confidence=0.92
    )
    db_session.add(rel)
    db_session.commit()

    token = create_access_token(subject=user.username, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test POST /api/v1/priority/assess/{case_id}
    assess_resp = client.post(
        f"/api/v1/priority/assess/{case.id}",
        json={
            "lead_title": "Primary Hawala Conduit Assessment",
            "target_entity_name": "Deepak Verma",
            "include_next_best_actions": True
        },
        headers=headers
    )
    assert assess_resp.status_code == 200, assess_resp.text
    data = assess_resp.json()["data"]
    assert data["case_id"] == case.id
    assert data["target_entity_name"] == "Deepak Verma"
    assert 0.0 <= data["priority_score"] <= 100.0
    assert len(data["next_best_actions"]) >= 4
    assert "Section 63 BSA 2023" in data["legal_statutory_notice"]
    assessment_id = data["assessment_id"]

    # 2. Test GET /api/v1/priority/history/{case_id}
    hist_resp = client.get(
        f"/api/v1/priority/history/{case.id}",
        headers=headers
    )
    assert hist_resp.status_code == 200
    hist_items = hist_resp.json()["data"]
    assert len(hist_items) >= 1
    assert hist_items[0]["id"] == assessment_id
    assert hist_items[0]["target_entity_name"] == "Deepak Verma"

    # 3. Test GET /api/v1/priority/assessment/{assessment_id}
    detail_resp = client.get(
        f"/api/v1/priority/assessment/{assessment_id}",
        headers=headers
    )
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()["data"]
    assert detail_data["assessment_id"] == assessment_id
    assert detail_data["priority_score"] == data["priority_score"]
    assert len(detail_data["next_best_actions"]) >= 4


def test_priority_case_permission_isolation(client: TestClient, db_session: Session):
    """
    Security & Permission Isolation Test:
    Ensures that an investigator without access to a case cannot run priority assessments on it.
    """
    unique = uuid.uuid4().hex[:6]
    owner = User(
        username=f"owner_pri_{unique}",
        email=f"owner_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Lead Inspector",
        role="INVESTIGATOR",
        badge_number=f"OWN-P-{unique}",
        is_active=True,
    )
    unauthorized_user = User(
        username=f"unauth_pri_{unique}",
        email=f"unauth_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Outside Officer",
        role="INVESTIGATOR",
        badge_number=f"OUT-P-{unique}",
        is_active=True,
    )
    db_session.add_all([owner, unauthorized_user])
    db_session.commit()
    db_session.refresh(owner)
    db_session.refresh(unauthorized_user)

    case = Case(
        case_number=f"FIR-PRI-SEC-2026-{unique}",
        title="Classified Hawala Intercept",
        description="Restricted investigative dossier.",
        status="ACTIVE_INVESTIGATION",
        priority="HIGH",
        is_confidential=True,
        lead_investigator_id=owner.username,
        assigned_lead_user_id=owner.id,
    )
    db_session.add(case)
    db_session.commit()
    db_session.refresh(case)

    token = create_access_token(subject=unauthorized_user.username, role=unauthorized_user.role)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        f"/api/v1/priority/assess/{case.id}",
        json={"target_entity_name": "Classified Subject"},
        headers=headers
    )
    assert resp.status_code in (403, 404), f"Expected 403 or 404, got {resp.status_code}"
