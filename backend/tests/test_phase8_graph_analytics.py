from datetime import datetime
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.models.user import User
from app.utils.graph_analytics import GraphAnalyticsEngine


def test_phase8_direct_algorithms():
    """
    Direct unit test for Phase 8 algorithms:
    - Eigenvector Centrality
    - Local & Global Clustering Coefficients
    - k-Core Decomposition
    - Structural Network Topology & Density
    - Metrics Glossary & Judicial Caveats
    """
    # Create graph with a 3-node clique (triangle) + a tail node
    # Triangle: (A, B, C), Tail: (C, D)
    nodes = [
        {"id": "A", "name": "Node A", "label": "Person"},
        {"id": "B", "name": "Node B", "label": "Person"},
        {"id": "C", "name": "Node C", "label": "Person"},
        {"id": "D", "name": "Node D", "label": "Person"},
    ]
    edges = [
        {"source": "A", "target": "B", "confidence": 1.0},
        {"source": "B", "target": "C", "confidence": 1.0},
        {"source": "C", "target": "A", "confidence": 1.0},
        {"source": "C", "target": "D", "confidence": 1.0},
    ]

    # 1. Centralities with Eigenvector, Clustering, and k-core
    centralities = GraphAnalyticsEngine.calculate_centralities(nodes, edges)
    assert len(centralities) == 4

    c_map = {c["node_id"]: c for c in centralities}
    # C is the hub connecting triangle and tail, so it should have highest eigenvector & degree
    assert c_map["C"]["eigenvector_centrality"] > c_map["D"]["eigenvector_centrality"]
    assert c_map["C"]["degree_centrality"] > c_map["D"]["degree_centrality"]
    assert "non_culpability_caveat" in c_map["C"]
    assert "BSA 2023" in c_map["C"]["non_culpability_caveat"]

    # Nodes A and B have neighbors that are mutually connected -> local clustering = 1.0
    assert c_map["A"]["local_clustering_coefficient"] == 1.0
    assert c_map["B"]["local_clustering_coefficient"] == 1.0

    # 2. k-Core Decomposition
    kcore = GraphAnalyticsEngine.calculate_k_core(nodes, edges)
    assert kcore["max_core"] >= 2
    # Triangle nodes (A, B, C) have coreness 2, D has degree 1 so coreness 1
    assert kcore["node_coreness"]["A"] == 2
    assert kcore["node_coreness"]["B"] == 2
    assert kcore["node_coreness"]["C"] == 2
    assert kcore["node_coreness"]["D"] == 1
    assert len(kcore["shells"]) >= 2

    # 3. Clustering Coefficients & Transitivity
    clustering = GraphAnalyticsEngine.calculate_clustering_coefficients(nodes, edges)
    assert clustering["transitivity"] > 0.0
    assert clustering["average_clustering"] > 0.0

    # 4. Structural Topology Analysis
    topology = GraphAnalyticsEngine.analyze_network_topology(nodes, edges)
    assert topology["total_nodes"] == 4
    assert topology["total_edges"] == 4
    assert topology["density"] > 0.0
    assert topology["connected_components_count"] == 1
    assert topology["critical_bridges_count"] >= 1  # C-D is a bridge
    assert "judicial_non_culpability_caveat" in topology

    # 5. Metrics Glossary
    glossary = GraphAnalyticsEngine.get_metrics_glossary()
    assert len(glossary) >= 8
    metric_ids = {g["metric_id"] for g in glossary}
    assert "DEGREE_CENTRALITY" in metric_ids
    assert "BETWEENNESS_CENTRALITY" in metric_ids
    assert "EIGENVECTOR_CENTRALITY" in metric_ids
    assert "K_CORE_DECOMPOSITION" in metric_ids
    assert "CLUSTERING_COEFFICIENT" in metric_ids
    for item in glossary:
        assert "benign_alternative_explanation" in item
        assert "judicial_non_culpability_statement" in item


def test_phase8_api_endpoints(client: TestClient, db_session: Session):
    """
    Tests Phase 8 REST endpoints:
    - /key-players (with eigenvector, clustering, k-core, and non-culpability warning)
    - /structural-overview (density, transitivity, components, diameter)
    - /k-core (core shells and member breakdown)
    - /metrics-glossary (judicial doctrine and metric definitions)
    """
    unique_suffix = uuid.uuid4().hex[:6]
    user = User(
        username=f"senior_analyst_{unique_suffix}",
        email=f"verma_{unique_suffix}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="Rajiv Verma",
        role="SENIOR_INVESTIGATOR",
        badge_number=f"SI-{unique_suffix}",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-PH8-{unique_suffix}",
        title="Hawala Cell Topological Dissection",
        description="Phase 8 Graph Analytics and structural intelligence verification",
        lead_investigator_id=f"senior_analyst_{unique_suffix}",
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="HIGH"
    )
    db_session.add(case)
    db_session.commit()

    evidence = EvidenceItem(
        evidence_code=f"EVID-2026-PH8-{uuid.uuid4().hex[:4]}",
        case_id=case.id,
        source_type="DIGITAL_FORENSICS",
        file_name="syndicate_cluster_graph.json",
        file_hash_sha256="aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899",
        ingested_by_operator="senior_analyst_verma"
    )
    db_session.add(evidence)
    db_session.commit()

    e1 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Operative A", normalized_value="Operative A", confidence=0.95)
    e2 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Operative B", normalized_value="Operative B", confidence=0.95)
    e3 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Operative C", normalized_value="Operative C", confidence=0.95)
    e4 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Operative D", normalized_value="Operative D", confidence=0.90)
    db_session.add_all([e1, e2, e3, e4])
    db_session.commit()

    # Form a triangle (e1, e2, e3) + bridge to e4
    r1 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e1.id, target_entity_id=e2.id, source_value="Operative A", target_value="Operative B", relationship_type="CALLED", confidence=0.95)
    r2 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e2.id, target_entity_id=e3.id, source_value="Operative B", target_value="Operative C", relationship_type="CALLED", confidence=0.95)
    r3 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e3.id, target_entity_id=e1.id, source_value="Operative C", target_value="Operative A", relationship_type="CALLED", confidence=0.95)
    r4 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e3.id, target_entity_id=e4.id, source_value="Operative C", target_value="Operative D", relationship_type="TRANSFERRED", confidence=0.90)
    db_session.add_all([r1, r2, r3, r4])
    db_session.commit()

    token = create_access_token(subject=user.id, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test Key Players Centrality API (Check Phase 8 fields)
    kp_res = client.get(f"/api/v1/analytics/key-players/{case.id}", headers=headers)
    assert kp_res.status_code == 200
    kp_data = kp_res.json()["data"]
    assert "judicial_disclaimer" in kp_data
    assert "BSA 2023" in kp_data["judicial_disclaimer"]
    first_player = kp_data["all_players"][0]
    assert "eigenvector_centrality" in first_player
    assert "local_clustering_coefficient" in first_player
    assert "coreness" in first_player
    assert "non_culpability_caveat" in first_player

    # 2. Test Structural Overview API
    struct_res = client.get(f"/api/v1/analytics/structural-overview/{case.id}", headers=headers)
    assert struct_res.status_code == 200
    struct_data = struct_res.json()["data"]
    assert struct_data["total_nodes"] >= 4
    assert struct_data["total_edges"] >= 4
    assert struct_data["density"] > 0.0
    assert struct_data["transitivity"] > 0.0
    assert struct_data["critical_bridges_count"] >= 1
    assert "judicial_non_culpability_caveat" in struct_data

    # 3. Test k-Core API
    kcore_res = client.get(f"/api/v1/analytics/k-core/{case.id}", headers=headers)
    assert kcore_res.status_code == 200
    kcore_data = kcore_res.json()["data"]
    assert kcore_data["max_core"] >= 1
    assert "shells" in kcore_data
    assert "node_coreness" in kcore_data

    # 4. Test Metrics Glossary API
    glossary_res = client.get("/api/v1/analytics/metrics-glossary", headers=headers)
    assert glossary_res.status_code == 200
    glossary_data = glossary_res.json()["data"]
    assert glossary_data["total_metrics"] >= 8
    assert "overarching_judicial_doctrine" in glossary_data
    assert "Section 63" in glossary_data["overarching_judicial_doctrine"]
