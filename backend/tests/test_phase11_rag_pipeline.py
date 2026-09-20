import uuid
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.case_assignment import CaseAssignment
from app.models.document_chunk import DocumentChunk
from app.models.evidence import EvidenceItem
from app.models.fir import FIRDocument
from app.models.interrogation import InterrogationReport
from app.models.user import User
from app.schemas.rag import RAGQueryRequest
from app.services.rag_service import RAGService
from app.utils.document_chunker import EvidenceDocumentChunker
from app.utils.embedding_engine import DenseSemanticEmbeddingEngine
from app.utils.grounded_generator import GroundedAnswerGenerator
from app.utils.reranker_engine import HybridRerankerEngine


def test_document_chunker_and_dense_embedding_engine():
    """
    Direct unit test of:
    1. EvidenceDocumentChunker character and token tracking
    2. DenseSemanticEmbeddingEngine 384-dim vector generation and normalization
    3. Semantic cosine similarity calculation
    """
    sample_text = (
        "During the raid on Bandra safehouse, officers seized three SIM-boxes and five mobile phones. "
        "The primary suspect confessed that hawala transfers totaling INR 45 Lakhs were coordinated "
        "via Telegram channel 'ShadowOps' to beneficiary mule accounts.\n\n"
        "A separate ledger recovered from the bedside drawer detailed payments made to custom clearing agents "
        "at Mumbai port under the supervision of mastermind Vikram Singhania."
    )

    chunks = EvidenceDocumentChunker.chunk_text(
        text=sample_text,
        chunk_size=200,
        chunk_overlap=40,
        base_metadata={"source_type": "PDF_DOCUMENT", "case_id": "case-test-1"}
    )

    assert len(chunks) >= 2
    for idx, c in enumerate(chunks):
        assert c["chunk_index"] == idx
        assert "content" in c
        assert c["char_start"] < c["char_end"]
        assert c["token_count"] > 0
        assert c["metadata"]["source_type"] == "PDF_DOCUMENT"

    # Test Embedding Engine
    vec1 = DenseSemanticEmbeddingEngine.embed_text("Hawala mule account fund transfer in Bandra")
    vec2 = DenseSemanticEmbeddingEngine.embed_text("Illegal money routing through bank mule accounts in Bandra Mumbai")
    vec3 = DenseSemanticEmbeddingEngine.embed_text("Traffic collision between bus and private sedan on highway")

    assert len(vec1) == 384
    assert len(vec2) == 384
    assert len(vec3) == 384

    sim_related = DenseSemanticEmbeddingEngine.cosine_similarity(vec1, vec2)
    sim_unrelated = DenseSemanticEmbeddingEngine.cosine_similarity(vec1, vec3)

    assert sim_related > sim_unrelated
    assert sim_related > 0.25
    assert sim_unrelated < 0.20


def test_hybrid_reranker_and_grounded_generation():
    """
    Direct unit test of:
    1. HybridRerankerEngine exact identifier boost & composite scoring
    2. GroundedAnswerGenerator answer synthesis and citation anchoring
    3. Hallucination guardrail on unsupported queries
    """
    query = "What phone number was used to transfer money to ACCT-MULE-44 under Section 318 BNS?"

    chunks = [
        {
            "chunk_id": "c1",
            "content": "Suspect admitted using mobile phone +91-9876543210 to authorize UPI transfers into ACCT-MULE-44 under Section 318 BNS.",
            "source_type": "INTERROGATION",
            "evidence_code": "EVID-INT-001",
            "similarity_score": 0.55,
            "chunk_metadata": {"suspect_or_witness_name": "Ramesh Verma"}
        },
        {
            "chunk_id": "c2",
            "content": "Vehicle registration DL-01-AB-1234 was seen parked outside the shopping complex during afternoon hours.",
            "source_type": "PDF_DOCUMENT",
            "evidence_code": "EVID-VEH-002",
            "similarity_score": 0.08,
            "chunk_metadata": {}
        }
    ]

    reranked = HybridRerankerEngine.rerank_chunks(query, chunks, top_k=5, min_relevance=0.15)
    assert len(reranked) >= 1
    top_chunk = reranked[0]
    assert top_chunk["chunk_id"] == "c1"
    # Identifier boost should be applied for phone, account, and section match
    assert top_chunk["identifier_boost"] > 0.30
    assert top_chunk["rerank_score"] > 0.50

    # Grounded answer generation
    synthesis = GroundedAnswerGenerator.generate_grounded_answer(query, reranked)
    assert synthesis["grounding_status"] == "FULLY_GROUNDED"
    assert synthesis["confidence_score"] >= 0.60
    assert len(synthesis["citations"]) == 1
    cit = synthesis["citations"][0]
    assert cit["citation_id"] == "CIT-1"
    assert cit["evidence_code"] == "EVID-INT-001"
    assert "+91-9876543210" in cit["exact_quote"]
    assert "[CIT-1]" in synthesis["answer"]

    # Test Hallucination Guardrail with zero relevant chunks
    empty_synthesis = GroundedAnswerGenerator.generate_grounded_answer("How to fly to Mars?", [])
    assert empty_synthesis["grounding_status"] == "INSUFFICIENT_EVIDENCE"
    assert "Insufficient evidentiary record" in empty_synthesis["answer"]
    assert len(empty_synthesis["citations"]) == 0


def test_rag_service_indexing_and_query_pipeline(client: TestClient, db_session: Session):
    """
    Integration test for RAG indexing, pgvector storage, and query execution.
    """
    unique = uuid.uuid4().hex[:6]
    user = User(
        username=f"rag_analyst_{unique}",
        email=f"rag_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="Vikram Rathore",
        role="INVESTIGATOR",
        badge_number=f"RAG-{unique}",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-RAG-{unique}",
        title="Hawala Syndicate Document Intelligence Investigation",
        description="RAG retrieval across interrogation memos and banking reports",
        lead_investigator_id=user.username,
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="HIGH"
    )
    db_session.add(case)
    db_session.commit()

    # Evidence 1: Seizure memo with extracted text
    ev1 = EvidenceItem(
        evidence_code=f"EVID-RAG-{unique}-1",
        case_id=case.id,
        source_type="PDF_DOCUMENT",
        evidence_category="CURRENT_CASE_OBSERVED",
        file_name="raid_inventory_memo.pdf",
        file_hash_sha256="11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
        extracted_text_content=(
            "Officers recovered a ledger containing records of cash courier deliveries. "
            "Courier code name 'Eagle' handed over INR 15 Lakhs in cash at Dadar railway station to operative Suresh Rao. "
            "The consignment was verified using serial number note XYZ-9871."
        ),
        ingested_by_operator=user.username
    )
    # Evidence 2: Interrogation report
    ev2 = EvidenceItem(
        evidence_code=f"EVID-RAG-{unique}-2",
        case_id=case.id,
        source_type="INTERROGATION",
        evidence_category="CURRENT_CASE_OBSERVED",
        file_name="suresh_rao_interrogation.pdf",
        file_hash_sha256="22334455667788990011aabbccddeeff22334455667788990011aabbccddeeff",
        ingested_by_operator=user.username
    )
    db_session.add_all([ev1, ev2])
    db_session.commit()

    interrogation = InterrogationReport(
        evidence_id=ev2.id,
        suspect_or_witness_name="Suresh Rao",
        role_in_case="CO-ACCUSED",
        key_admissions=["Admitted receiving cash from courier Eagle at Dadar station"],
        raw_transcript=(
            "Q: Who gave you instructions to meet courier Eagle?\n"
            "A: I received a message on Signal from handle @kingpin_dx. He told me to reach Dadar platform 4 "
            "and collect the bag containing INR 15 Lakhs cash, then deposit it into ICICI mule account ACCT-991100."
        )
    )
    db_session.add(interrogation)
    db_session.commit()

    # 1. Index Case Documents via Service
    index_res = RAGService.index_case_documents(db_session, case.id, user)
    assert index_res.total_documents_processed >= 2
    assert index_res.total_chunks_created >= 2

    # Verify chunks persisted in db with pgvector embeddings
    chunks_in_db = db_session.query(DocumentChunk).filter(DocumentChunk.case_id == case.id).all()
    assert len(chunks_in_db) >= 2
    assert chunks_in_db[0].embedding is not None
    assert len(chunks_in_db[0].embedding) == 384

    # 2. Query Case Documents via Service
    query_req = RAGQueryRequest(
        query="Where did Suresh Rao meet courier Eagle and how much cash was handed over?",
        top_k=3
    )
    rag_res = RAGService.query_rag(db_session, case.id, user, query_req)
    assert rag_res.grounding_status == "FULLY_GROUNDED"
    assert len(rag_res.citations) >= 1
    assert any("Dadar" in cit.exact_quote for cit in rag_res.citations)
    assert "Bharatiya Sakshya Adhiniyam" in rag_res.statutory_safeguard or "BSA" in rag_res.statutory_safeguard

    # 3. Test REST API Endpoints
    token = create_access_token(subject=user.id, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # Test POST /api/v1/rag/query/{case_id}
    api_query_res = client.post(
        f"/api/v1/rag/query/{case.id}",
        json={"query": "What ICICI mule account did Suresh Rao mention?", "top_k": 3},
        headers=headers
    )
    assert api_query_res.status_code == 200
    api_data = api_query_res.json()["data"]
    assert "ACCT-991100" in api_data["answer"] or len(api_data["citations"]) >= 1

    # Test GET /api/v1/rag/stats/{case_id}
    stats_res = client.get(f"/api/v1/rag/stats/{case.id}", headers=headers)
    assert stats_res.status_code == 200
    stats_data = stats_res.json()["data"]
    assert stats_data["total_chunks"] >= 2
    assert "INTERROGATION" in stats_data["source_type_distribution"]


def test_case_aware_and_permission_aware_isolation(client: TestClient, db_session: Session):
    """
    CRITICAL SECURITY & RBAC ISOLATION TEST:
    Verifies that RAG retrieval strictly isolates cases and prevents
    unauthorized or confidential information leakage.
    """
    unique = uuid.uuid4().hex[:6]

    # User A (Investigator)
    user_a = User(
        username=f"user_alpha_{unique}",
        email=f"alpha_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="Agent Alpha",
        role="INVESTIGATOR",
        badge_number=f"ALPHA-{unique}",
        is_active=True
    )
    # User B (Senior Investigator / Lead of confidential case)
    user_b = User(
        username=f"user_beta_{unique}",
        email=f"beta_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="Agent Beta",
        role="SENIOR_INVESTIGATOR",
        badge_number=f"BETA-{unique}",
        is_active=True
    )
    db_session.add_all([user_a, user_b])
    db_session.commit()

    # Case A (Public/Standard Case assigned to User A)
    case_a = Case(
        case_number=f"CASE-ALPHA-{unique}",
        title="Standard Retail Smuggling Case",
        lead_investigator_id=user_a.username,
        assigned_lead_user_id=user_a.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="MEDIUM",
        is_confidential=False
    )
    # Case B (CONFIDENTIAL Case assigned exclusively to User B)
    case_b = Case(
        case_number=f"CASE-BETA-{unique}",
        title="Top Secret Counter-Cartel Operation",
        lead_investigator_id=user_b.username,
        assigned_lead_user_id=user_b.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="CRITICAL",
        is_confidential=True
    )
    db_session.add_all([case_a, case_b])
    db_session.commit()

    # Ingest mundane evidence in Case A
    ev_a = EvidenceItem(
        evidence_code=f"EVID-ALPHA-{unique}",
        case_id=case_a.id,
        source_type="PDF_DOCUMENT",
        file_name="customs_memo.pdf",
        file_hash_sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        extracted_text_content="Customs officer intercepted commercial shipment of untaxed cigarettes at terminal 2.",
        ingested_by_operator=user_a.username
    )

    # Ingest TOP SECRET cartel intelligence in Case B
    ev_b = EvidenceItem(
        evidence_code=f"EVID-BETA-{unique}",
        case_id=case_b.id,
        source_type="INTERROGATION",
        file_name="classified_cartel_memo.pdf",
        file_hash_sha256="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        extracted_text_content=(
            "TOP SECRET EYES ONLY: Code-word 'OPERATION_VIPER_999_SWISS_VAULT' "
            "refers to offshore bullion holding account IBAN CH93-0000-8888 in Zurich under control of Boss Dawood."
        ),
        ingested_by_operator=user_b.username
    )
    db_session.add_all([ev_a, ev_b])
    db_session.commit()

    # Index both cases
    RAGService.index_case_documents(db_session, case_a.id, user_a)
    RAGService.index_case_documents(db_session, case_b.id, user_b)

    # 1. User A queries Case A searching for the secret Swiss Vault codeword
    query_leak_attempt = RAGQueryRequest(
        query="Tell me about OPERATION_VIPER_999_SWISS_VAULT in Zurich",
        top_k=5
    )
    res_case_a = RAGService.query_rag(db_session, case_a.id, user_a, query_leak_attempt)

    # Verify ZERO leakage: Case A retrieval MUST NOT contain the secret codeword from Case B
    assert res_case_a.grounding_status == "INSUFFICIENT_EVIDENCE"
    assert "VIPER" not in res_case_a.answer
    assert "Zurich" not in res_case_a.answer
    assert len(res_case_a.citations) == 0

    # 2. User A attempts to query Case B directly via Service (Unauthorized Confidential Case)
    try:
        RAGService.query_rag(db_session, case_b.id, user_a, query_leak_attempt)
        assert False, "Expected HTTPException 403 Forbidden for unauthorized confidential case access"
    except HTTPException as exc:
        assert exc.status_code == 403
        assert "CONFIDENTIAL" in exc.detail

    # 3. User A attempts to query Case B via REST API Endpoint
    token_a = create_access_token(subject=user_a.id, role=user_a.role)
    headers_a = {"Authorization": f"Bearer {token_a}"}

    api_leak_res = client.post(
        f"/api/v1/rag/query/{case_b.id}",
        json={"query": "Tell me about OPERATION_VIPER_999_SWISS_VAULT", "top_k": 5},
        headers=headers_a
    )
    assert api_leak_res.status_code == 403
