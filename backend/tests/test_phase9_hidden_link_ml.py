import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.models.user import User
from app.utils.hidden_link_engine import HiddenLinkPredictionEngine


def test_baseline_link_algorithms():
    """
    Direct test of Phase 9 baseline heuristic algorithms:
    - Common Neighbours
    - Jaccard Coefficient
    - Adamic-Adar Index
    - Preferential Attachment
    - Resource Allocation Index
    """
    # Suppose u and v share neighbors {X, Y}
    u_nbrs = {"X", "Y", "Z"}
    v_nbrs = {"X", "Y", "W"}
    degrees = {"X": 2, "Y": 4, "Z": 5, "W": 3}

    # 1. Common Neighbours
    cn = HiddenLinkPredictionEngine.common_neighbours(u_nbrs, v_nbrs)
    assert cn == {"X", "Y"}
    assert len(cn) == 2

    # 2. Jaccard: 2 / 4 = 0.5
    jacc = HiddenLinkPredictionEngine.jaccard_coefficient(u_nbrs, v_nbrs)
    assert jacc == 0.5

    # 3. Adamic-Adar: 1/log(2) + 1/log(4) > 0
    aa = HiddenLinkPredictionEngine.adamic_adar_index(cn, degrees)
    assert aa > 1.0

    # 4. Preferential Attachment: 3 * 3 = 9
    pa = HiddenLinkPredictionEngine.preferential_attachment(len(u_nbrs), len(v_nbrs))
    assert pa == 9

    # 5. Resource Allocation: 1/2 + 1/4 = 0.75
    ra = HiddenLinkPredictionEngine.resource_allocation_index(cn, degrees)
    assert ra == 0.75


def test_hidden_link_engine_prediction_pipeline():
    """
    Test the full Phase 9 ML link prediction pipeline on a 5-node test network:
    Nodes: A, B, C (triangle), D (connected to C), E (connected to D).
    Tests whether an unobserved link between A and D is discovered and explained.
    """
    nodes = [
        {"id": "A", "name": "Operative A", "label": "PERSON"},
        {"id": "B", "name": "Operative B", "label": "PERSON"},
        {"id": "C", "name": "Broker C", "label": "PERSON"},
        {"id": "D", "name": "Mule D", "label": "ACCOUNT"},
        {"id": "E", "name": "Hawala E", "label": "PERSON"},
    ]
    edges = [
        {"source": "A", "target": "B", "confidence": 0.9},
        {"source": "B", "target": "C", "confidence": 0.9},
        {"source": "C", "target": "A", "confidence": 0.9},
        {"source": "C", "target": "D", "confidence": 0.85},
        {"source": "D", "target": "E", "confidence": 0.85},
    ]

    res = HiddenLinkPredictionEngine.predict_hidden_links(nodes, edges, min_confidence_threshold=0.30)
    assert res["total_predicted_links"] >= 1
    assert "Heterogeneous" in res["model_name"]
    assert "Section 63" in res["judicial_warning"]

    # Check candidate link outputs
    pred = res["predictions"][0]
    assert "candidate_link" in pred
    assert "confidence" in pred
    assert "ml_probability" in pred
    assert pred["prediction_status"] == "PREDICTED"
    assert "baseline_scores" in pred
    assert "supporting_graph_signals" in pred
    assert "contradictory_signals" in pred
    assert "evidence_paths" in pred

    # Verify baseline metrics are populated
    baselines = pred["baseline_scores"]
    assert "common_neighbours_count" in baselines
    assert "jaccard_coefficient" in baselines
    assert "adamic_adar_score" in baselines
    assert "preferential_attachment" in baselines

    # Check non-automatic warning
    assert "BSA 2023" in pred["judicial_notice"]


def test_phase9_api_endpoints_and_human_review(client: TestClient, db_session: Session):
    """
    Test Phase 9 REST Endpoints:
    1. POST /predict-links-ml/{case_id}
    2. POST /review-prediction/{case_id} (Accept as hypothesis with officer badge & justification)
    3. POST /review-prediction/{case_id} (Reject)
    4. Verify BSA 2023 Non-Automatic Confirmation Principle.
    """
    unique_suffix = uuid.uuid4().hex[:6]
    user = User(
        username=f"investigator_{unique_suffix}",
        email=f"investigator_{unique_suffix}@ciphertrace.gov.in",
        hashed_password=get_password_hash("SecretPass123!"),
        full_name="Vikram Rathore",
        role="INVESTIGATOR",
        badge_number=f"INSP-{unique_suffix}",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-PH9-{unique_suffix}",
        title="Phase 9 Covert Syndicate Link ML Dissection",
        description="Testing Phase 9 ML link predictions and human review",
        lead_investigator_id=f"investigator_{unique_suffix}",
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="HIGH"
    )
    db_session.add(case)
    db_session.commit()

    evidence = EvidenceItem(
        evidence_code=f"EVID-PH9-{unique_suffix}",
        case_id=case.id,
        source_type="BANK_RECORDS",
        file_name="mule_financial_chain.csv",
        file_hash_sha256="11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
        ingested_by_operator=f"investigator_{unique_suffix}"
    )
    db_session.add(evidence)
    db_session.commit()

    # Create syndicate members
    e1 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Kingpin X", normalized_value="Kingpin X", confidence=0.95)
    e2 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Cutout Y", normalized_value="Cutout Y", confidence=0.95)
    e3 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="ACCOUNT", raw_value="Mule Acc 9988", normalized_value="Mule Acc 9988", confidence=0.95)
    e4 = ExtractedEntity(evidence_id=evidence.id, case_id=case.id, entity_type="PERSON", raw_value="Smurfer Z", normalized_value="Smurfer Z", confidence=0.90)
    db_session.add_all([e1, e2, e3, e4])
    db_session.commit()

    # Kingpin X -> Cutout Y, Cutout Y -> Mule Acc 9988, Smurfer Z -> Cutout Y
    # Kingpin X and Smurfer Z both connect to Cutout Y (shared intermediary)
    r1 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e1.id, target_entity_id=e2.id, source_value="Kingpin X", target_value="Cutout Y", relationship_type="MESSAGED", confidence=0.95)
    r2 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e2.id, target_entity_id=e3.id, source_value="Cutout Y", target_value="Mule Acc 9988", relationship_type="TRANSFERRED", confidence=0.95)
    r3 = ExtractedRelationship(evidence_id=evidence.id, case_id=case.id, source_entity_id=e4.id, target_entity_id=e2.id, source_value="Smurfer Z", target_value="Cutout Y", relationship_type="TRANSFERRED", confidence=0.90)
    db_session.add_all([r1, r2, r3])
    db_session.commit()

    token = create_access_token(subject=user.id, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test POST /predict-links-ml/{case_id}
    ml_res = client.post(f"/api/v1/analytics/predict-links-ml/{case.id}?min_confidence=0.30", headers=headers)
    assert ml_res.status_code == 200
    ml_data = ml_res.json()["data"]
    assert ml_data["total_predicted_links"] >= 1
    assert "Heterogeneous" in ml_data["model_name"]
    assert "Section 63" in ml_data["judicial_warning"]

    first_pred = ml_data["predictions"][0]
    candidate = first_pred["candidate_link"]
    assert "source_id" in candidate
    assert "target_id" in candidate
    assert first_pred["confidence"] >= 0.30
    assert first_pred["prediction_status"] == "PREDICTED"
    assert len(first_pred["supporting_graph_signals"]) >= 1

    # 2. Test Human Review: ACCEPT_AS_HYPOTHESIS
    review_payload = {
        "source_id": candidate["source_id"],
        "target_id": candidate["target_id"],
        "decision": "ACCEPTED_AS_HYPOTHESIS",
        "justification_reason": "Intermediary Cutout Y received transfers from both accounts on same calendar date.",
        "investigator_badge": user.badge_number,
        "relationship_type": "INFERRED_COORDINATION"
    }
    review_res = client.post(f"/api/v1/analytics/review-prediction/{case.id}", json=review_payload, headers=headers)
    assert review_res.status_code == 200
    review_data = review_res.json()["data"]
    assert review_data["decision"] == "ACCEPTED_AS_HYPOTHESIS"
    assert "relationship_id" in review_data
    assert "Section 63 BSA 2023" in review_data["message"]

    # Verify the relationship was persisted as INFERRED in database
    inferred_rel = db_session.query(ExtractedRelationship).filter(ExtractedRelationship.id == review_data["relationship_id"]).first()
    assert inferred_rel is not None
    assert inferred_rel.relationship_nature == "INFERRED"
    assert inferred_rel.relationship_metadata["is_hypothesis"] is True
    assert inferred_rel.relationship_metadata["investigator_badge"] == user.badge_number

    # 3. Test Human Review: REJECTED
    reject_payload = {
        "source_id": e1.id,
        "target_id": e3.id,
        "decision": "REJECTED",
        "justification_reason": "No financial nexus discovered after bank branch subpoena.",
        "investigator_badge": user.badge_number,
    }
    reject_res = client.post(f"/api/v1/analytics/review-prediction/{case.id}", json=reject_payload, headers=headers)
    assert reject_res.status_code == 200
    reject_data = reject_res.json()["data"]
    assert reject_data["decision"] == "REJECTED"
