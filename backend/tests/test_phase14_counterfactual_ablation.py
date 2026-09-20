import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.counterfactual import AblationSimulationRun
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.models.user import User
from app.schemas.counterfactual import (
    AblationScenarioType,
    HypothesisSurvivalStatus,
)
from app.utils.ablation_engine import CounterfactualAblationEngine


def test_comparative_ablation_engine_direct():
    """
    Direct unit test for CounterfactualAblationEngine:
    - Verifies 4-way comparative balance matrix:
      1. Full Evidence
      2. Without CDR
      3. Without Location
      4. Without Financial Data
    - Verifies topological metric deltas, fragility index, and SPOF identification.
    """
    nodes = [
        {"id": "person_1", "name": "Vikram Sharma", "label": "Person"},
        {"id": "phone_1", "name": "+91-9876543210", "label": "Phone"},
        {"id": "tower_1", "name": "Tower-South-Zone", "label": "Location"},
        {"id": "acct_1", "name": "HDFC-449922", "label": "Account"},
        {"id": "person_2", "name": "Rajesh Kumar", "label": "Person"},
    ]

    edges = [
        {"id": "e1", "source": "person_1", "target": "phone_1", "label": "USES_PHONE_NUMBER", "confidence": 0.95},
        {"id": "e2", "source": "phone_1", "target": "person_2", "label": "CALLED", "confidence": 0.90},
        {"id": "e3", "source": "person_1", "target": "tower_1", "label": "LOCATED_AT", "confidence": 0.88},
        {"id": "e4", "source": "person_1", "target": "acct_1", "label": "CONTROLS_BANK_ACCOUNT", "confidence": 0.92},
        {"id": "e5", "source": "acct_1", "target": "person_2", "label": "TRANSFERRED", "confidence": 0.85},
    ]

    hypothesis = "Vikram Sharma coordinated hawala fund transfers to Rajesh Kumar via burner phone calls."
    target_entity = "Vikram Sharma"

    res = CounterfactualAblationEngine.run_comparative_ablation(
        nodes=nodes,
        edges=edges,
        hypothesis_statement=hypothesis,
        target_entity=target_entity
    )

    assert "baseline_metrics" in res
    assert "scenarios" in res
    assert "sensitivity_summary" in res
    assert "overall_fragility_score" in res

    scenarios = res["scenarios"]
    assert len(scenarios) == 4

    types = [s.scenario_type for s in scenarios]
    assert AblationScenarioType.FULL_EVIDENCE in types
    assert AblationScenarioType.WITHOUT_CDR in types
    assert AblationScenarioType.WITHOUT_LOCATION in types
    assert AblationScenarioType.WITHOUT_FINANCIAL in types

    # 1. Baseline Scenario Checks
    full_scen = next(s for s in scenarios if s.scenario_type == AblationScenarioType.FULL_EVIDENCE)
    assert full_scen.excluded_elements_count == 0
    assert full_scen.confidence_delta == 0.0
    assert full_scen.survival_status == HypothesisSurvivalStatus.ROBUST

    # 2. Without CDR Checks
    cdr_scen = next(s for s in scenarios if s.scenario_type == AblationScenarioType.WITHOUT_CDR)
    assert cdr_scen.excluded_elements_count > 0
    assert cdr_scen.confidence_delta < 0.0
    assert len(cdr_scen.alternative_explanations) >= 1
    assert len(cdr_scen.key_vulnerabilities) >= 1

    # 3. Without Financial Checks
    fin_scen = next(s for s in scenarios if s.scenario_type == AblationScenarioType.WITHOUT_FINANCIAL)
    assert fin_scen.excluded_elements_count > 0
    assert fin_scen.confidence_delta < 0.0
    assert any("quid-pro-quo" in v or "financial" in v.lower() for v in fin_scen.key_vulnerabilities)

    # 4. Sensitivity Summary
    summary = res["sensitivity_summary"]
    assert 0.0 <= summary.overall_fragility_score <= 1.0
    assert "Section 63" in summary.legal_statutory_disclaimer
    assert "not establish guilt" in summary.legal_statutory_disclaimer.lower() or "not criminal guilt" in summary.legal_statutory_disclaimer.lower()


def test_entity_and_relationship_removal_simulations():
    """
    Direct unit test for:
    1. Entity removal (measuring network fragmentation and component partition).
    2. Relationship removal (measuring bridge edge impact).
    """
    # Create network: A <-> B (bridge) <-> C <-> D
    nodes = [
        {"id": "A", "name": "Alice", "label": "Person"},
        {"id": "B", "name": "Bob (Broker)", "label": "Person"},
        {"id": "C", "name": "Charlie", "label": "Person"},
        {"id": "D", "name": "David", "label": "Person"},
    ]
    edges = [
        {"id": "e1", "source": "A", "target": "B", "label": "ASSOCIATED_WITH", "confidence": 0.9},
        {"id": "e2", "source": "B", "target": "C", "label": "TRANSFERRED", "confidence": 0.85},
        {"id": "e3", "source": "C", "target": "D", "label": "CALLED", "confidence": 0.8},
    ]

    # Test Entity Removal on Bob (Broker)
    ent_res = CounterfactualAblationEngine.simulate_entity_removal(
        nodes=nodes,
        edges=edges,
        entity_name="Bob (Broker)",
        hypothesis_statement="Bob facilitates illegal transfers from Alice to Charlie."
    )
    assert ent_res["scenario"].scenario_type == AblationScenarioType.ENTITY_REMOVAL
    assert ent_res["scenario"].metric_deltas.delta_nodes == -1
    # Bob has 2 edges, removing Bob removes 2 edges
    assert ent_res["scenario"].metric_deltas.delta_edges == -2
    assert ent_res["overall_fragility_score"] > 0.0

    # Test Relationship Removal on Bridge edge (B -> C)
    rel_res = CounterfactualAblationEngine.simulate_relationship_removal(
        nodes=nodes,
        edges=edges,
        source_entity="B",
        target_entity="C",
        relationship_type="TRANSFERRED",
        hypothesis_statement="Fund transfer between Bob and Charlie coordinates the smuggling operation."
    )
    assert rel_res["scenario"].scenario_type == AblationScenarioType.RELATIONSHIP_REMOVAL
    assert rel_res["scenario"].metric_deltas.delta_edges == -1
    # Removing bridge increases components from 1 to 2
    assert rel_res["scenario"].metric_deltas.delta_components >= 1


def test_counterfactual_api_integration_flow(client: TestClient, db_session: Session):
    """
    End-to-End Integration Test:
    - Ingests case data with CDR, Location, and Financial records.
    - Calls POST /api/v1/counterfactual/compare/{case_id}
    - Calls POST /api/v1/counterfactual/simulate-entity-removal/{case_id}
    - Calls POST /api/v1/counterfactual/simulate-relationship-removal/{case_id}
    - Calls GET /api/v1/counterfactual/history/{case_id}
    - Calls GET /api/v1/counterfactual/simulation/{simulation_id}
    - Validates response schemas and non-culpability safeguards.
    """
    unique = uuid.uuid4().hex[:6]
    user = User(
        username=f"ablation_lead_{unique}",
        email=f"ablation_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Forensic Scientist Mehta",
        role="INVESTIGATOR",
        badge_number=f"ABL-{unique}",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    case = Case(
        case_number=f"FIR-ABL-2026-{unique}",
        title="Simulated Maritime Smuggling & Hawala Channel",
        description="Investigating coastal transshipment and clandestine banking.",
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
        evidence_code=f"EVID-ABL-{unique}-01",
        file_name="Burner Phone Extraction & Ledger",
        source_type="DIGITAL_FORENSICS",
        file_hash_sha256="aabbccddeeff11223344556677889900",
        file_path="/data/evidence/test.bin",
        file_size_bytes=1024,
    )
    db_session.add(evidence)
    db_session.commit()
    db_session.refresh(evidence)

    # Add entities
    ent_a = ExtractedEntity(
        case_id=case.id,
        evidence_id=evidence.id,
        entity_type="PERSON",
        raw_value="Anil Kapoor",
        normalized_value="Anil Kapoor",
        confidence=0.96,
        char_start=0,
        char_end=11
    )
    ent_b = ExtractedEntity(
        case_id=case.id,
        evidence_id=evidence.id,
        entity_type="PERSON",
        raw_value="Karan Johar",
        normalized_value="Karan Johar",
        confidence=0.92,
        char_start=20,
        char_end=31
    )
    ent_ph = ExtractedEntity(
        case_id=case.id,
        evidence_id=evidence.id,
        entity_type="PHONE_NUMBER",
        raw_value="+91-9988776655",
        normalized_value="+91-9988776655",
        confidence=0.99,
        char_start=40,
        char_end=55
    )
    ent_loc = ExtractedEntity(
        case_id=case.id,
        evidence_id=evidence.id,
        entity_type="LOCATION",
        raw_value="Nhava Sheva Port Gate 4",
        normalized_value="Nhava Sheva Port",
        confidence=0.89,
        char_start=60,
        char_end=84
    )
    ent_acct = ExtractedEntity(
        case_id=case.id,
        evidence_id=evidence.id,
        entity_type="FINANCIAL_ACCOUNT",
        raw_value="SBI-9911223344",
        normalized_value="SBI-9911223344",
        confidence=0.94,
        char_start=90,
        char_end=104
    )
    db_session.add_all([ent_a, ent_b, ent_ph, ent_loc, ent_acct])
    db_session.commit()
    db_session.refresh(ent_a)
    db_session.refresh(ent_b)
    db_session.refresh(ent_ph)
    db_session.refresh(ent_loc)
    db_session.refresh(ent_acct)

    # Add relationships
    rel1 = ExtractedRelationship(
        case_id=case.id,
        evidence_id=evidence.id,
        source_entity_id=ent_a.id,
        target_entity_id=ent_ph.id,
        source_value=ent_a.normalized_value,
        target_value=ent_ph.normalized_value,
        relationship_type="USES_PHONE_NUMBER",
        confidence=0.95
    )
    rel2 = ExtractedRelationship(
        case_id=case.id,
        evidence_id=evidence.id,
        source_entity_id=ent_ph.id,
        target_entity_id=ent_b.id,
        source_value=ent_ph.normalized_value,
        target_value=ent_b.normalized_value,
        relationship_type="CALLED",
        confidence=0.91
    )
    rel3 = ExtractedRelationship(
        case_id=case.id,
        evidence_id=evidence.id,
        source_entity_id=ent_a.id,
        target_entity_id=ent_loc.id,
        source_value=ent_a.normalized_value,
        target_value=ent_loc.normalized_value,
        relationship_type="LOCATED_AT",
        confidence=0.88
    )
    rel4 = ExtractedRelationship(
        case_id=case.id,
        evidence_id=evidence.id,
        source_entity_id=ent_a.id,
        target_entity_id=ent_acct.id,
        source_value=ent_a.normalized_value,
        target_value=ent_acct.normalized_value,
        relationship_type="CONTROLS_BANK_ACCOUNT",
        confidence=0.93
    )
    rel5 = ExtractedRelationship(
        case_id=case.id,
        evidence_id=evidence.id,
        source_entity_id=ent_acct.id,
        target_entity_id=ent_b.id,
        source_value=ent_acct.normalized_value,
        target_value=ent_b.normalized_value,
        relationship_type="TRANSFERRED",
        confidence=0.89
    )
    db_session.add_all([rel1, rel2, rel3, rel4, rel5])
    db_session.commit()

    token = create_access_token(subject=user.username, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test POST /api/v1/counterfactual/compare/{case_id}
    compare_resp = client.post(
        f"/api/v1/counterfactual/compare/{case.id}",
        json={
            "hypothesis_statement": "Anil Kapoor utilized burner phones and SBI accounts to direct port shipments to Karan Johar.",
            "target_entity": "Anil Kapoor"
        },
        headers=headers
    )
    assert compare_resp.status_code == 200, compare_resp.text
    compare_data = compare_resp.json()["data"]
    assert compare_data["case_id"] == case.id
    assert len(compare_data["scenarios"]) == 4
    assert "STATUTORY SAFEGUARD" in compare_data["non_culpability_notice"]
    assert "fragility" in compare_data["sensitivity_summary"]["legal_statutory_disclaimer"].lower()
    sim_id = compare_data["simulation_id"]

    # 2. Test POST /api/v1/counterfactual/simulate-entity-removal/{case_id}
    ent_resp = client.post(
        f"/api/v1/counterfactual/simulate-entity-removal/{case.id}",
        json={
            "hypothesis_statement": "Karan Johar acted as the sole recipient of illicit proceeds.",
            "entity_name": "Karan Johar"
        },
        headers=headers
    )
    assert ent_resp.status_code == 200, ent_resp.text
    ent_data = ent_resp.json()["data"]
    assert ent_data["entity_name"] == "Karan Johar"
    assert ent_data["scenario"]["scenario_type"] == "ENTITY_REMOVAL"

    # 3. Test POST /api/v1/counterfactual/simulate-relationship-removal/{case_id}
    rel_resp = client.post(
        f"/api/v1/counterfactual/simulate-relationship-removal/{case.id}",
        json={
            "hypothesis_statement": "The call link between phone and Karan Johar was the communication channel.",
            "source_entity": ent_ph.id,
            "target_entity": ent_b.id,
            "relationship_type": "CALLED"
        },
        headers=headers
    )
    assert rel_resp.status_code == 200, rel_resp.text
    rel_data = rel_resp.json()["data"]
    assert rel_data["scenario"]["scenario_type"] == "RELATIONSHIP_REMOVAL"

    # 4. Test GET /api/v1/counterfactual/history/{case_id}
    hist_resp = client.get(
        f"/api/v1/counterfactual/history/{case.id}",
        headers=headers
    )
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()["data"]
    assert len(hist_data) >= 3  # compare + entity removal + relationship removal

    # 5. Test GET /api/v1/counterfactual/simulation/{simulation_id}
    lookup_resp = client.get(
        f"/api/v1/counterfactual/simulation/{sim_id}",
        headers=headers
    )
    assert lookup_resp.status_code == 200
    lookup_data = lookup_resp.json()["data"]
    assert lookup_data["id"] == sim_id
    assert lookup_data["hypothesis_statement"] == "Anil Kapoor utilized burner phones and SBI accounts to direct port shipments to Karan Johar."


def test_counterfactual_case_permission_isolation(client: TestClient, db_session: Session):
    """
    Security & Permission Isolation Test:
    Ensures that an investigator without access to a case cannot run counterfactual simulations on it.
    """
    unique = uuid.uuid4().hex[:6]
    owner = User(
        username=f"owner_{unique}",
        email=f"owner_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Lead Inspector",
        role="INVESTIGATOR",
        badge_number=f"OWN-{unique}",
        is_active=True,
    )
    unauthorized_user = User(
        username=f"unauth_{unique}",
        email=f"unauth_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Outside Officer",
        role="INVESTIGATOR",
        badge_number=f"OUT-{unique}",
        is_active=True,
    )
    db_session.add_all([owner, unauthorized_user])
    db_session.commit()
    db_session.refresh(owner)
    db_session.refresh(unauthorized_user)

    case = Case(
        case_number=f"FIR-SEC-2026-{unique}",
        title="Restricted Counter-Narcotics Dossier",
        description="Confidential investigation with restricted access.",
        status="ACTIVE_INVESTIGATION",
        priority="HIGH",
        is_confidential=True,
        lead_investigator_id=owner.username,
        assigned_lead_user_id=owner.id,
    )
    db_session.add(case)
    db_session.commit()
    db_session.refresh(case)

    # Outside investigator attempts to access confidential case
    token = create_access_token(subject=unauthorized_user.username, role=unauthorized_user.role)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        f"/api/v1/counterfactual/compare/{case.id}",
        json={
            "hypothesis_statement": "Restricted suspect facilitated smuggling.",
            "target_entity": "Restricted suspect"
        },
        headers=headers
    )
    assert resp.status_code in (403, 404), f"Expected 403 or 404 Forbidden, got {resp.status_code}"
