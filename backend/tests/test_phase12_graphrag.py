import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.case_assignment import CaseAssignment
from app.models.cdr import CDRRecord
from app.models.document_chunk import DocumentChunk
from app.models.entity_resolution import CanonicalEntity
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.models.financial import FinancialRecord
from app.models.user import User
from app.schemas.graphrag import (
    GraphRAGQueryRequest,
    PrimaryRoute,
    QueryIntent,
)
from app.services.graphrag_service import GraphRAGService
from app.utils.embedding_engine import DenseSemanticEmbeddingEngine
from app.utils.query_classifier import QueryClassifier


def test_query_classifier_all_intents():
    """
    Unit test for QueryClassifier:
    Validates classification and routing for all 5 core investigative question patterns.
    """
    # 1. Entity Connectivity
    c1 = QueryClassifier.classify("How is Vikram Sharma connected to the case?")
    assert c1.question_intent == QueryIntent.ENTITY_CONNECTIVITY
    assert c1.primary_route == PrimaryRoute.GRAPH
    assert "Vikram Sharma" in c1.target_entities
    assert c1.engine_plan["needs_graph"] is True

    # 2. Relationship Evidence
    c2 = QueryClassifier.classify("What evidence supports the relationship between Vikram Sharma and Rajesh Kumar?")
    assert c2.question_intent == QueryIntent.RELATIONSHIP_EVIDENCE
    assert c2.primary_route == PrimaryRoute.DOC_RAG
    assert c2.engine_plan["needs_rag"] is True
    assert "Vikram Sharma" in c2.target_entities

    # 3. Temporal Change
    c3 = QueryClassifier.classify("What changed before the incident?")
    assert c3.question_intent == QueryIntent.TEMPORAL_CHANGE
    assert c3.primary_route == PrimaryRoute.TEMPORAL
    assert c3.engine_plan["needs_temporal"] is True

    # 4. Cross-Cluster Connections
    c4 = QueryClassifier.classify("Show cross-cluster connections and cell bridges.")
    assert c4.question_intent == QueryIntent.CROSS_CLUSTER
    assert c4.primary_route == PrimaryRoute.ML_PREDICTION
    assert c4.engine_plan["needs_ml"] is True

    # 5. Missing Evidence / Gap Analysis
    c5 = QueryClassifier.classify("Which evidence is missing from this case?")
    assert c5.question_intent == QueryIntent.MISSING_EVIDENCE
    assert c5.primary_route == PrimaryRoute.EVIDENCE_GAP
    assert c5.engine_plan["needs_gap_analysis"] is True


def test_entity_connectivity_and_evidence_support(client: TestClient, db_session: Session):
    """
    Tests GraphRAG execution for:
    1. 'How is entity X connected to the case?' (Topological Subgraph + Document RAG citations)
    2. 'What evidence supports this relationship?' (Dual citations with verbatim quotes)
    """
    unique = uuid.uuid4().hex[:6]
    user = User(
        username=f"gr_agent_{unique}",
        email=f"gr_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Agent Sharma",
        role="INVESTIGATOR",
        badge_number=f"GR-{unique}",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-GR-{unique}",
        title="Operation Cybershield Hawala Syndicate",
        description="Investigation into cross-border mule routing and encrypted channels",
        lead_investigator_id=user.username,
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="CRITICAL"
    )
    db_session.add(case)
    db_session.commit()

    evidence = EvidenceItem(
        case_id=case.id,
        evidence_code=f"EVID-INT-{unique}",
        evidence_category="CURRENT_CASE_OBSERVED",
        source_type="INTERROGATION",
        file_name="interrogation_report.pdf",
        file_hash_sha256="aa11bb22cc33dd44ee55ff667788990011223344556677889900aabbccddeeff",
        seizing_officer="Insp. Patil",
        ingested_by_operator=user.username
    )
    db_session.add(evidence)
    db_session.commit()

    # Create canonical and extracted entities
    canon = CanonicalEntity(
        case_id=case.id,
        canonical_code=f"CANON-{unique}",
        canonical_name="Vikram Sharma",
        entity_type="PERSON"
    )
    db_session.add(canon)
    db_session.commit()

    ent1 = ExtractedEntity(
        evidence_id=evidence.id,
        case_id=case.id,
        entity_type="PERSON",
        raw_value="Vikram Sharma",
        normalized_value="Vikram Sharma",
        confidence=0.98,
        char_start=0,
        char_end=13
    )
    ent2 = ExtractedEntity(
        evidence_id=evidence.id,
        case_id=case.id,
        entity_type="PERSON",
        raw_value="Rajesh Kumar",
        normalized_value="Rajesh Kumar",
        confidence=0.95,
        char_start=20,
        char_end=32
    )
    db_session.add_all([ent1, ent2])
    db_session.commit()

    # Relationship between them
    rel = ExtractedRelationship(
        evidence_id=evidence.id,
        case_id=case.id,
        source_entity_id=ent1.id,
        target_entity_id=ent2.id,
        source_value="Vikram Sharma",
        target_value="Rajesh Kumar",
        relationship_type="TRANSFERRED",
        relationship_nature="OBSERVED",
        confidence=0.95,
        context_snippet="Vikram Sharma transferred INR 25 Lakhs to Rajesh Kumar for clearing port logistics."
    )
    db_session.add(rel)

    # Document vector chunk
    doc_text = "Suspect Vikram Sharma admitted to transferring INR 25 Lakhs to Rajesh Kumar using Bank Account ACC-9988 under Section 318 BNS."
    chunk_emb = DenseSemanticEmbeddingEngine.embed_text(doc_text)
    chunk = DocumentChunk(
        case_id=case.id,
        evidence_id=evidence.id,
        chunk_index=0,
        content=doc_text,
        char_start=0,
        char_end=len(doc_text),
        token_count=22,
        embedding=chunk_emb,
        source_type="INTERROGATION",
        evidence_code=evidence.evidence_code,
        chunk_metadata={"officer": "Insp. Patil"}
    )
    db_session.add(chunk)
    db_session.commit()

    # 1. Query: "How is Vikram Sharma connected to the case?"
    req1 = GraphRAGQueryRequest(
        query="How is Vikram Sharma connected to the case?",
        focus_entity="Vikram Sharma"
    )
    res1 = GraphRAGService.query_graphrag(db_session, case.id, user, req1)
    assert res1.case_id == case.id
    assert res1.classification.question_intent == QueryIntent.ENTITY_CONNECTIVITY
    assert len(res1.graph_citations) >= 1
    assert any("Vikram Sharma" in cit.source_node or "Vikram Sharma" in cit.target_node for cit in res1.graph_citations)
    assert "[Graph:" in res1.answer or "Vikram Sharma" in res1.answer

    # 2. Query: "What evidence supports this relationship?"
    req2 = GraphRAGQueryRequest(
        query="What evidence supports the relationship between Vikram Sharma and Rajesh Kumar?",
        focus_entity="Vikram Sharma"
    )
    res2 = GraphRAGService.query_graphrag(db_session, case.id, user, req2)
    assert res2.classification.question_intent == QueryIntent.RELATIONSHIP_EVIDENCE
    assert res2.grounding_status in ("FULLY_GROUNDED", "PARTIALLY_GROUNDED")
    assert len(res2.graph_citations) >= 1
    assert "Section 63 Bharatiya Sakshya Adhiniyam" in res2.statutory_safeguard


def test_temporal_change_and_cross_cluster_queries(client: TestClient, db_session: Session):
    """
    Tests GraphRAG execution for:
    3. 'What changed before the incident?' (Temporal burst detection)
    4. 'Show cross-cluster connections.' (ML inter-cell predictions & broker bridges)
    """
    unique = uuid.uuid4().hex[:6]
    user = User(
        username=f"gr_temp_{unique}",
        email=f"gr_temp_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Agent Verma",
        role="INVESTIGATOR",
        badge_number=f"GRT-{unique}",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-TEMP-{unique}",
        title="Hawala Cell Cross-Cluster Analysis",
        description="Temporal and community bridge intelligence",
        lead_investigator_id=user.username,
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="HIGH"
    )
    db_session.add(case)
    db_session.commit()

    ev = EvidenceItem(
        case_id=case.id,
        evidence_code=f"EVID-CDR-{unique}",
        evidence_category="CURRENT_CASE_OBSERVED",
        source_type="CDR_EXCEL",
        file_name="telecom_logs.xlsx",
        file_hash_sha256="bb22cc33dd44ee55ff667788990011223344556677889900aabbccddeeff1122",
        ingested_by_operator=user.username
    )
    db_session.add(ev)
    db_session.commit()

    # Add CDR records that create telephone nodes and calls
    cdr = CDRRecord(
        evidence_id=ev.id,
        calling_number="9876500001",
        called_number="9876500002",
        call_type="VOICE",
        start_time=datetime(2026, 9, 10, 14, 30),
        duration_sec=360,
        provider="JIO"
    )
    db_session.add(cdr)
    db_session.commit()

    # Query 3: "What changed before the incident?"
    req_temp = GraphRAGQueryRequest(query="What changed before the incident?")
    res_temp = GraphRAGService.query_graphrag(db_session, case.id, user, req_temp)
    assert res_temp.classification.question_intent == QueryIntent.TEMPORAL_CHANGE
    assert res_temp.classification.primary_route == PrimaryRoute.TEMPORAL
    assert "Pre-Incident Temporal Shift" in res_temp.answer

    # Query 4: "Show cross-cluster connections."
    req_cluster = GraphRAGQueryRequest(query="Show cross-cluster connections and cell bridges.")
    res_cluster = GraphRAGService.query_graphrag(db_session, case.id, user, req_cluster)
    assert res_cluster.classification.question_intent == QueryIntent.CROSS_CLUSTER
    assert res_cluster.classification.primary_route == PrimaryRoute.ML_PREDICTION
    assert "Cross-Cluster Syndicate Structure" in res_cluster.answer


def test_evidence_gap_detection(client: TestClient, db_session: Session):
    """
    Tests GraphRAG execution for:
    5. 'Which evidence is missing?' (Evidence gap analysis)
    Identifies uncorroborated single-source links, unrecovered burner SIMs, and unverified predictions.
    """
    unique = uuid.uuid4().hex[:6]
    user = User(
        username=f"gr_gap_{unique}",
        email=f"gr_gap_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Agent Nair",
        role="INVESTIGATOR",
        badge_number=f"GAP-{unique}",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-GAP-{unique}",
        title="Evidence Gap & Deficiency Evaluation",
        description="Case with uncorroborated leads and missing device seizures",
        lead_investigator_id=user.username,
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="MEDIUM"
    )
    db_session.add(case)
    db_session.commit()

    ev = EvidenceItem(
        case_id=case.id,
        evidence_code=f"EVID-MEMO-{unique}",
        evidence_category="CURRENT_CASE_OBSERVED",
        source_type="POLICE_MEMO",
        file_name="field_officer_memo.pdf",
        file_hash_sha256="cc33dd44ee55ff667788990011223344556677889900aabbccddeeff11223344",
        ingested_by_operator=user.username
    )
    db_session.add(ev)
    db_session.commit()

    # Add single-source contested relationship
    rel = ExtractedRelationship(
        evidence_id=ev.id,
        case_id=case.id,
        source_value="Mule Kingpin",
        target_value="Hawala Broker",
        relationship_type="WORKS_FOR",
        relationship_nature="CONTESTED",
        confidence=0.50,
        context_snippet="Informant tip claimed Mule Kingpin answers to Hawala Broker without corroboration."
    )
    db_session.add(rel)
    db_session.commit()

    # Query 5: "Which evidence is missing?"
    req_gap = GraphRAGQueryRequest(query="Which evidence is missing or uncorroborated?")
    res_gap = GraphRAGService.query_graphrag(db_session, case.id, user, req_gap)
    assert res_gap.classification.question_intent == QueryIntent.MISSING_EVIDENCE
    assert res_gap.classification.primary_route == PrimaryRoute.EVIDENCE_GAP
    assert len(res_gap.evidence_gaps) >= 1
    assert any(g.gap_type in ("SINGLE_SOURCE_CORROBORATION", "UNRECOVERED_DEVICE", "UNSUBSTANTIATED_PREDICTED_LINK") for g in res_gap.evidence_gaps)
    assert "Evidence Gap & Evidentiary Corroboration Analysis" in res_gap.answer
    assert res_gap.grounding_status == "EVIDENCE_GAP_HIGHLIGHTED"


def test_graphrag_case_and_permission_isolation(client: TestClient, db_session: Session):
    """
    Validates strict security:
    - User with access to Case A is denied access (403) to confidential Case B.
    - Zero cross-case data leakage.
    """
    unique = uuid.uuid4().hex[:6]
    analyst = User(
        username=f"analyst_iso_{unique}",
        email=f"iso_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Pass1234!"),
        full_name="Analyst Kapoor",
        role="INVESTIGATOR",
        badge_number=f"ISO-{unique}",
        is_active=True
    )
    db_session.add(analyst)
    db_session.commit()

    # Confidential Case restricted to another lead
    case_confidential = Case(
        case_number=f"CASE-CONF-{unique}",
        title="Classified National Cyber Espionage",
        description="Strictly confidential case",
        lead_investigator_id="other_investigator",
        is_confidential=True,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="CRITICAL"
    )
    db_session.add(case_confidential)
    db_session.commit()

    token = create_access_token(subject=analyst.username, role=analyst.role)
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt GraphRAG query on confidential unauthorized case
    resp = client.post(
        f"/api/v1/graphrag/query/{case_confidential.id}",
        json={"query": "How is entity connected to this classified case?"},
        headers=headers
    )
    assert resp.status_code in (403, 404)


def test_graphrag_api_endpoints(client: TestClient, db_session: Session):
    """
    Tests REST endpoints:
    - POST /api/v1/graphrag/classify
    - GET /api/v1/graphrag/suggested-prompts/{case_id}
    - POST /api/v1/graphrag/query/{case_id}
    """
    unique = uuid.uuid4().hex[:6]
    user = User(
        username=f"api_tester_{unique}",
        email=f"tester_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="API Tester",
        role="ADMIN",
        badge_number=f"ADM-{unique}",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-API-{unique}",
        title="API Integration Test Case",
        lead_investigator_id=user.username,
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="LOW"
    )
    db_session.add(case)
    db_session.commit()

    token = create_access_token(subject=user.username, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test /classify endpoint
    classify_resp = client.post(
        "/api/v1/graphrag/classify",
        json={"query": "What changed before the incident?", "focus_entity": None},
        headers=headers
    )
    assert classify_resp.status_code == 200
    c_data = classify_resp.json()["data"]
    assert c_data["question_intent"] == "TEMPORAL_CHANGE"
    assert c_data["primary_route"] == "TEMPORAL"

    # 2. Test /suggested-prompts endpoint
    prompts_resp = client.get(
        f"/api/v1/graphrag/suggested-prompts/{case.id}",
        headers=headers
    )
    assert prompts_resp.status_code == 200
    p_data = prompts_resp.json()["data"]
    assert len(p_data["prompts"]) == 5

    # 3. Test /query endpoint
    query_resp = client.post(
        f"/api/v1/graphrag/query/{case.id}",
        json={"query": "Which evidence is missing?"},
        headers=headers
    )
    assert query_resp.status_code == 200
    q_data = query_resp.json()["data"]
    assert q_data["classification"]["question_intent"] == "MISSING_EVIDENCE"
    assert "statutory_safeguard" in q_data
