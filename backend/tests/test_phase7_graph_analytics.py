from datetime import datetime
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.cdr import CDRRecord
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.models.financial import FinancialRecord
from app.models.user import User
from app.utils.graph_analytics import GraphAnalyticsEngine


def test_graph_analytics_engine_direct():
    """
    Direct algorithmic verification of Centrality, Louvain Communities,
    Dijkstra Pathfinding, Adamic-Adar Hidden-Link ML, and Structural Anomalies.
    """
    nodes = [
        {"id": "kingpin_dawood", "name": "Dawood (Kingpin)", "label": "Person"},
        {"id": "broker_rajan", "name": "Rajan (Broker)", "label": "Person"},
        {"id": "hub_call_center", "name": "Nuh Call Hub", "label": "Phone"},
        {"id": "operative_altaf", "name": "Altaf (Operative 1)", "label": "Person"},
        {"id": "operative_bilal", "name": "Bilal (Operative 2)", "label": "Person"},
        {"id": "mule_account", "name": "HDFC Mule 001", "label": "Account"},
        {"id": "burner_phone", "name": "+919811002233", "label": "Phone"},
    ]

    edges = [
        # Kingpin is insulated, only talks to Broker
        {"source": "kingpin_dawood", "target": "broker_rajan", "confidence": 0.95},
        # Broker bridges to Hub and Operative 1
        {"source": "broker_rajan", "target": "hub_call_center", "confidence": 0.90},
        {"source": "broker_rajan", "target": "operative_altaf", "confidence": 0.85},
        # Hub connects to Operatives and Mule
        {"source": "hub_call_center", "target": "operative_altaf", "confidence": 0.95},
        {"source": "hub_call_center", "target": "operative_bilal", "confidence": 0.92},
        {"source": "hub_call_center", "target": "mule_account", "confidence": 0.90},
        # Both operatives communicate with a rare shared burner phone (hidden link candidate)
        {"source": "operative_altaf", "target": "burner_phone", "confidence": 0.98},
        {"source": "operative_bilal", "target": "burner_phone", "confidence": 0.97},
    ]

    # 1. Test Centralities
    centralities = GraphAnalyticsEngine.calculate_centralities(nodes, edges)
    assert len(centralities) == len(nodes)
    
    node_archetypes = {c["node_id"]: c["archetype"] for c in centralities}
    # Broker bridges disjoint components
    broker_score = next(c for c in centralities if c["node_id"] == "broker_rajan")
    assert broker_score["betweenness_centrality"] > 0.0

    hub_score = next(c for c in centralities if c["node_id"] == "hub_call_center")
    assert hub_score["degree_centrality"] > 0.3

    # 2. Test Community Detection
    comm_res = GraphAnalyticsEngine.detect_communities(nodes, edges)
    assert comm_res["total_communities"] >= 1
    assert len(comm_res["communities"]) >= 1

    # 3. Test Dijkstra Shortest Path (Kingpin to Mule Account)
    path_res = GraphAnalyticsEngine.find_shortest_path(nodes, edges, "kingpin_dawood", "mule_account")
    assert path_res["found"] is True
    assert path_res["hops"] >= 2
    assert path_res["path_nodes"][0]["node_id"] == "kingpin_dawood"
    assert path_res["path_nodes"][-1]["node_id"] == "mule_account"

    # 4. Test Hidden Link Prediction (Adamic-Adar on Altaf and Bilal)
    # Operative Altaf and Operative Bilal are not directly connected by an edge,
    # but share "burner_phone" and "hub_call_center"
    predictions = GraphAnalyticsEngine.predict_hidden_links(nodes, edges, min_probability=0.2)
    assert len(predictions) > 0

    pair_found = any(
        (p["source_id"] in ["operative_altaf", "operative_bilal"] and p["target_id"] in ["operative_altaf", "operative_bilal"])
        for p in predictions
    )
    assert pair_found is True

    # 5. Test Anomaly Detection (Critical bridge between Kingpin and Broker)
    anomalies = GraphAnalyticsEngine.detect_graph_anomalies(nodes, edges)
    assert anomalies["total_anomalies"] > 0
    bridge_found = any(a["anomaly_type"] == "CRITICAL_BRIDGE" for a in anomalies["anomalies"])
    assert bridge_found is True


def test_phase7_api_analytics_pipeline(client: TestClient, db_session: Session):
    """
    End-to-end API pipeline test for Phase 7:
    - Key Players Centrality API
    - Community Detection API
    - Investigative Pathfinding API
    - Hidden Link ML Prediction API
    - Human Investigator Link Review (Acceptance with Section 63 BSA audit justification)
    - Structural Anomalies API
    """
    # 1. Setup User and Case
    user = User(
        username="lead_analyst_mehta",
        email="mehta@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="Radhika Mehta",
        role="INTELLIGENCE_ANALYST",
        badge_number="INT-8831",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-PH7-{uuid.uuid4().hex[:6]}",
        title="Operation Hawala Syndicate Radar",
        description="Graph analytics and hidden-link ML verification",
        lead_investigator_id="lead_analyst_mehta",
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="CRITICAL"
    )
    db_session.add(case)
    db_session.commit()

    evidence = EvidenceItem(
        evidence_code=f"EVID-2026-PH7-{uuid.uuid4().hex[:4]}",
        case_id=case.id,
        source_type="DIGITAL_FORENSICS",
        file_name="syndicate_forensics_dump.json",
        file_hash_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        ingested_by_operator="lead_analyst_mehta"
    )
    db_session.add(evidence)
    db_session.commit()

    # Add entities
    e1 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Mastermind Rashid", normalized_value="Rashid Khan", confidence=0.98)
    e2 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Broker Vikas", normalized_value="Vikas Sharma", confidence=0.95)
    e3 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Operative Sameer", normalized_value="Sameer Ali", confidence=0.93)
    e4 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Mule Ramesh", normalized_value="Ramesh Yadav", confidence=0.91)
    e5 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PHONE_NUMBER", raw_value="+919876500112", normalized_value="+919876500112", confidence=1.0)
    db_session.add_all([e1, e2, e3, e4, e5])
    db_session.commit()

    # Add relationships
    r1 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e1.id, target_entity_id=e2.id, source_value=e1.normalized_value, target_value=e2.normalized_value, relationship_type="COMMANDS", confidence=0.96)
    r2 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e2.id, target_entity_id=e3.id, source_value=e2.normalized_value, target_value=e3.normalized_value, relationship_type="DIRECTS", confidence=0.92)
    # Both e3 (Sameer) and e4 (Ramesh) contact burner e5 (+919876500112), forming a common contact
    r3 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e3.id, target_entity_id=e5.id, source_value=e3.normalized_value, target_value=e5.normalized_value, relationship_type="CALLED", confidence=0.95)
    r4 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e4.id, target_entity_id=e5.id, source_value=e4.normalized_value, target_value=e5.normalized_value, relationship_type="CALLED", confidence=0.94)
    db_session.add_all([r1, r2, r3, r4])
    db_session.commit()

    token = create_access_token(subject=user.id, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test Key Players Centrality Endpoint
    kp_res = client.get(f"/api/v1/analytics/key-players/{case.id}", headers=headers)
    assert kp_res.status_code == 200
    kp_data = kp_res.json()["data"]
    assert kp_data["total_analyzed_nodes"] >= 5
    assert len(kp_data["all_players"]) >= 5

    # 2. Test Community Detection Endpoint
    comm_res = client.get(f"/api/v1/analytics/communities/{case.id}", headers=headers)
    assert comm_res.status_code == 200
    comm_data = comm_res.json()["data"]
    assert comm_data["total_communities"] >= 1

    # 3. Test Pathfinding Endpoint (e1 Rashid to e5 Burner)
    path_payload = {"source_node_id": e1.id, "target_node_id": e5.id}
    pf_res = client.post(f"/api/v1/analytics/pathfinding/{case.id}", json=path_payload, headers=headers)
    assert pf_res.status_code == 200
    pf_data = pf_res.json()["data"]
    assert pf_data["found"] is True
    assert pf_data["hops"] >= 2

    # 4. Test Hidden Link Prediction Endpoint
    hl_res = client.post(f"/api/v1/analytics/predict-links/{case.id}?min_probability=0.2", headers=headers)
    assert hl_res.status_code == 200
    hl_data = hl_res.json()["data"]
    assert hl_data["total_predicted_links"] >= 1

    # Find the predicted link between e3 and e4
    pred = hl_data["predictions"][0]
    assert "common_neighbor_names" in pred
    assert pred["probability"] > 0.2

    # 5. Test Accept Predicted Link Endpoint (with mandatory justification)
    accept_payload = {
        "source_id": pred["source_id"],
        "target_id": pred["target_id"],
        "decision": "ACCEPTED",
        "justification_reason": "Verified common burner phone towers match both suspect geolocations in Nuh.",
        "relationship_type": "CO_CONSPIRATOR_WITH"
    }
    accept_res = client.post(f"/api/v1/analytics/accept-predicted-link/{case.id}", json=accept_payload, headers=headers)
    assert accept_res.status_code == 200
    assert accept_res.json()["data"]["status"] == "ACCEPTED"

    # Verify the accepted link was added as an INFERRED relationship
    new_rel = db_session.query(ExtractedRelationship).filter(
        ExtractedRelationship.case_id == case.id,
        ExtractedRelationship.relationship_nature == "INFERRED"
    ).first()
    assert new_rel is not None
    assert new_rel.relationship_type == "CO_CONSPIRATOR_WITH"

    # 6. Test Graph Anomalies Endpoint
    anom_res = client.get(f"/api/v1/analytics/anomalies/{case.id}", headers=headers)
    assert anom_res.status_code == 200
    anom_data = anom_res.json()["data"]
    assert "total_anomalies" in anom_data
    assert anom_data["total_anomalies"] >= 1
