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


def test_phase6_knowledge_graph_pipeline(client: TestClient, db_session: Session):
    # 1. Setup User and Case
    user = User(
        username="graph_officer_deshmukh",
        email="deshmukh@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="Dr. Anil Deshmukh",
        role="FORENSIC_ANALYST",
        badge_number="FOR-9922",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-PH6-{uuid.uuid4().hex[:6]}",
        title="Syndicate Graph Analysis Operation",
        description="Knowledge Graph construction and topology verification",
        lead_investigator_id="graph_officer_deshmukh",
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="CRITICAL"
    )
    db_session.add(case)
    db_session.commit()

    evidence = EvidenceItem(
        evidence_code=f"EVID-2026-PH6-{uuid.uuid4().hex[:4]}",
        case_id=case.id,
        source_type="CDR",
        evidence_category="CURRENT_CASE_OBSERVED",
        file_name="telecom_and_bank_dump.csv",
        file_hash_sha256="d41d8cd98f00b204e9800998ecf8427e00000000000000000000000000000000",
        ingested_by_operator="graph_officer_deshmukh"
    )
    db_session.add(evidence)
    db_session.commit()

    # 1. Extracted Entities
    p1 = ExtractedEntity(
        evidence_id=evidence.id,
        case_id=case.id,
        entity_type="PERSON",
        raw_value="Tariq Ahmed",
        normalized_value="Tariq Ahmed",
        confidence=0.98
    )
    p2 = ExtractedEntity(
        evidence_id=evidence.id,
        case_id=case.id,
        entity_type="PERSON",
        raw_value="Imran Khan",
        normalized_value="Imran Khan",
        confidence=0.96
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    # 2. Extracted Relationship
    rel1 = ExtractedRelationship(
        evidence_id=evidence.id,
        case_id=case.id,
        source_entity_id=p1.id,
        target_entity_id=p2.id,
        source_value=p1.normalized_value,
        target_value=p2.normalized_value,
        relationship_type="ASSOCIATED_WITH",
        relationship_nature="OBSERVED",
        confidence=0.95,
        context_snippet="Tariq Ahmed was observed collaborating with Imran Khan in Mewat."
    )
    db_session.add(rel1)

    # 3. CDR Telecom Flow
    cdr = CDRRecord(
        evidence_id=evidence.id,
        calling_number="+919810123456",
        called_number="+919876543210",
        start_time=datetime.utcnow(),
        duration_sec=340,
        call_type="VOICE_CALL",
        imei="861234567890123",
        provider="Airtel Delhi"
    )
    db_session.add(cdr)

    # 4. Financial Transfer Flow
    txn = FinancialRecord(
        evidence_id=evidence.id,
        sender_account="SBI-40291028471",
        receiver_account="HDFC-99102834102",
        amount=450000.0,
        txn_type="NEFT",
        timestamp=datetime.utcnow(),
        sender_bank="State Bank of India",
        receiver_bank="HDFC Bank"
    )
    db_session.add(txn)
    db_session.commit()

    token = create_access_token(subject=user.id, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 5. Test Graph Synchronization Endpoint
    sync_res = client.post(f"/api/v1/graph/sync/{case.id}", headers=headers)
    assert sync_res.status_code == 200
    sync_data = sync_res.json()["data"]
    assert sync_data["status"] == "SUCCESS"
    assert sync_data["synced_entities"] >= 2

    # 6. Test Subgraph Retrieval Endpoint
    graph_res = client.get(f"/api/v1/graph/case/{case.id}", headers=headers)
    assert graph_res.status_code == 200
    graph_data = graph_res.json()["data"]
    assert graph_data["total_nodes"] >= 4
    assert graph_data["total_edges"] >= 3

    labels = {n["label"] for n in graph_data["nodes"]}
    assert "Person" in labels
    assert "Phone" in labels
    assert "Account" in labels

    edge_labels = {e["label"] for e in graph_data["edges"]}
    assert "ASSOCIATED_WITH" in edge_labels
    assert "CALLED" in edge_labels
    assert "TRANSFERRED" in edge_labels

    # 7. Test Node Expansion Endpoint
    expand_res = client.get(f"/api/v1/graph/node/{p1.id}/expand?depth=1", headers=headers)
    assert expand_res.status_code == 200
    expand_data = expand_res.json()["data"]
    assert expand_data["total_nodes"] >= 2

    # 8. Test Graph Statistics Endpoint
    stats_res = client.get(f"/api/v1/graph/stats/{case.id}", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()["data"]
    assert stats["total_nodes"] >= 4
    assert stats["total_edges"] >= 3
    assert "Person" in stats["nodes_by_label"]
    assert stats["max_degree_node"] is not None
