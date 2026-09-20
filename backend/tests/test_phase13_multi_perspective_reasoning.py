import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.document_chunk import DocumentChunk
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.models.perspective_reasoning import PerspectiveAssessment
from app.models.user import User
from app.schemas.perspective_reasoning import (
    MultiPerspectiveAnalysisRequest,
    PerspectiveReport,
    PerspectiveType,
)
from app.services.perspective_reasoning_service import PerspectiveReasoningService
from app.utils.consensus_synthesis_engine import ConsensusSynthesisEngine
from app.utils.embedding_engine import DenseSemanticEmbeddingEngine
from app.utils.perspective_engines import (
    NonCulpabilityGuardrail,
    StructuredPerspectiveEngine,
)


def test_six_perspective_engines_and_non_culpability_guardrail():
    """
    Direct unit test for:
    1. StructuredPerspectiveEngine generating all 6 distinct perspectives.
    2. NonCulpabilityGuardrail intercepting and sanitizing explicit declarations of guilt.
    """
    hypothesis = "Vikram Sharma operated as the primary hawala coordinator for port clearing funds."
    target_entity = "Vikram Sharma"

    reports = StructuredPerspectiveEngine.evaluate_all(
        hypothesis=hypothesis,
        target_entity=target_entity,
        evidence_items=[{"id": "ev-1", "source_type": "PDF_DOCUMENT"}],
        graph_nodes=[{"id": "node-1", "name": "Vikram Sharma"}],
        graph_edges=[{"source": "Vikram Sharma", "target": "Rajesh Kumar", "label": "TRANSFERRED", "confidence": 0.95}],
        document_chunks=[{"evidence_code": "EVID-01", "content": "Ledger entry shows transfer to Vikram Sharma."}],
        temporal_bursts=[]
    )

    # 1. Verify all 6 perspectives exist
    perspectives_found = {r.perspective for r in reports}
    assert len(reports) == 6
    assert PerspectiveType.INVESTIGATOR in perspectives_found
    assert PerspectiveType.FORENSIC in perspectives_found
    assert PerspectiveType.LEGAL in perspectives_found
    assert PerspectiveType.DEFENCE_ALTERNATIVE in perspectives_found
    assert PerspectiveType.SUSPECT_INNOCENT in perspectives_found
    assert PerspectiveType.COMMON_SENSE in perspectives_found

    for r in reports:
        assert len(r.arguments) >= 2
        assert len(r.supporting_points) >= 1
        assert len(r.concerns_or_limitations) >= 1
        assert "Section 63 BSA 2023" in r.non_culpability_statement

    # 2. Test NonCulpabilityGuardrail on forbidden text
    bad_report = PerspectiveReport(
        perspective=PerspectiveType.INVESTIGATOR,
        title="Unregulated Draft",
        summary="The suspect is guilty beyond doubt and culpability is proven.",
        arguments=["The perpetrator confirmed was conclusively guilty."],
        supporting_points=["Guilt is clear based on phone records."],
        concerns_or_limitations=["None, proven guilty."],
        certainty_level="HIGH"
    )

    sanitized = NonCulpabilityGuardrail.sanitize_perspective(bad_report)
    assert "conclusively guilty" not in sanitized.arguments[0]
    assert "guilt is clear" not in sanitized.supporting_points[0].lower()
    assert "guilt beyond doubt" not in sanitized.summary.lower()
    assert "Section 63 BSA 2023" in sanitized.non_culpability_statement


def test_consensus_synthesis_engine_output_schema():
    """
    Direct unit test for ConsensusSynthesisEngine:
    Verifies that the synthesized output contains:
    - supporting evidence
    - contradictory evidence
    - alternative explanations
    - uncertainty
    - unresolved questions
    - recommended verification
    """
    hypothesis = "Hawala fund transfer coordination via encrypted channels"
    target_entity = "Rajesh Kumar"

    reports = StructuredPerspectiveEngine.evaluate_all(
        hypothesis=hypothesis,
        target_entity=target_entity,
        evidence_items=[],
        graph_nodes=[],
        graph_edges=[{"source": "Rajesh Kumar", "target": "Hawala Broker", "label": "TRANSFERRED", "confidence": 0.88}],
        document_chunks=[{"evidence_code": "EVID-BANK-01", "content": "Transaction ref UTR-9988 credited INR 25L."}],
        temporal_bursts=[]
    )

    consensus = ConsensusSynthesisEngine.synthesize(
        hypothesis=hypothesis,
        target_entity=target_entity,
        perspectives=reports,
        evidence_items=[],
        graph_edges=[{"source": "Rajesh Kumar", "target": "Hawala Broker", "label": "TRANSFERRED", "confidence": 0.88}],
        document_chunks=[{"evidence_code": "EVID-BANK-01", "content": "Transaction ref UTR-9988 credited INR 25L."}],
        temporal_bursts=[]
    )

    # Required Output Fields Verification:
    # 1. Supporting evidence
    assert len(consensus.supporting_evidence) >= 1
    assert "description" in consensus.supporting_evidence[0]

    # 2. Contradictory evidence
    assert len(consensus.contradictory_evidence) >= 1
    assert "significance" in consensus.contradictory_evidence[0]

    # 3. Alternative explanations
    assert len(consensus.alternative_explanations) >= 2
    assert any("Commercial" in alt or "Mule" in alt for alt in consensus.alternative_explanations)

    # 4. Uncertainty
    assert "uncertainty_score" in consensus.uncertainty
    assert "uncertainty_level" in consensus.uncertainty
    assert "key_uncertainty_drivers" in consensus.uncertainty

    # 5. Unresolved questions
    assert len(consensus.unresolved_questions) >= 3

    # 6. Recommended verification
    assert len(consensus.recommended_verification) >= 2
    for v in consensus.recommended_verification:
        assert "action_type" in v
        assert "statutory_mandate" in v

    # 7. Judicial non-culpability doctrine
    assert "Section 63 Bharatiya Sakshya Adhiniyam" in consensus.judicial_non_culpability_doctrine


def test_multi_perspective_analysis_service_pipeline(client: TestClient, db_session: Session):
    """
    Integration test for PerspectiveReasoningService:
    - Runs multi-perspective analysis on an active case.
    - Verifies persistence in database (PerspectiveAssessment).
    - Verifies history retrieval and individual assessment lookup.
    """
    unique = uuid.uuid4().hex[:6]
    user = User(
        username=f"reasoning_lead_{unique}",
        email=f"reason_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Lead Analyst Joshi",
        role="INVESTIGATOR",
        badge_number=f"MPR-{unique}",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()

    case = Case(
        case_number=f"CASE-MPR-{unique}",
        title="Multi-Perspective Syndicate Infiltration Evaluation",
        description="Comprehensive evaluation of prime suspect role under 6 perspectives",
        lead_investigator_id=user.username,
        assigned_lead_user_id=user.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="HIGH"
    )
    db_session.add(case)
    db_session.commit()

    evidence = EvidenceItem(
        case_id=case.id,
        evidence_code=f"EVID-DOC-{unique}",
        evidence_category="CURRENT_CASE_OBSERVED",
        source_type="PDF_DOCUMENT",
        file_name="investigation_dossier.pdf",
        file_hash_sha256="ff11ee22dd33cc44bb55aa667788990011223344556677889900aabbccddeeff",
        seizing_officer="IO Sharma",
        ingested_by_operator=user.username
    )
    db_session.add(evidence)
    db_session.commit()

    # Add entities and relation
    ent1 = ExtractedEntity(
        evidence_id=evidence.id,
        case_id=case.id,
        entity_type="PERSON",
        raw_value="Sameer Khan",
        normalized_value="Sameer Khan",
        confidence=0.95,
        char_start=0,
        char_end=11
    )
    ent2 = ExtractedEntity(
        evidence_id=evidence.id,
        case_id=case.id,
        entity_type="ACCOUNT",
        raw_value="ACC-998877",
        normalized_value="ACC-998877",
        confidence=0.90,
        char_start=20,
        char_end=30
    )
    db_session.add_all([ent1, ent2])
    db_session.commit()

    rel = ExtractedRelationship(
        evidence_id=evidence.id,
        case_id=case.id,
        source_entity_id=ent1.id,
        target_entity_id=ent2.id,
        source_value="Sameer Khan",
        target_value="ACC-998877",
        relationship_type="CONTROLS_BANK_ACCOUNT",
        relationship_nature="OBSERVED",
        confidence=0.92,
        context_snippet="Sameer Khan was recorded controlling beneficiary account ACC-998877."
    )
    db_session.add(rel)

    # Document Chunk
    chunk = DocumentChunk(
        case_id=case.id,
        evidence_id=evidence.id,
        chunk_index=0,
        content="Bank ledger shows Sameer Khan received transfers into ACC-998877 from international routing.",
        char_start=0,
        char_end=95,
        token_count=18,
        embedding=DenseSemanticEmbeddingEngine.embed_text("Sameer Khan received transfers into ACC-998877"),
        source_type="PDF_DOCUMENT",
        evidence_code=evidence.evidence_code,
        chunk_metadata={"officer": "IO Sharma"}
    )
    db_session.add(chunk)
    db_session.commit()

    # 1. Execute Analysis
    req = MultiPerspectiveAnalysisRequest(
        hypothesis="Sameer Khan acted as a knowing cutout operative for syndicate funds",
        target_entity="Sameer Khan"
    )
    res = PerspectiveReasoningService.run_analysis(db_session, case.id, user, req)

    assert res.case_id == case.id
    assert res.target_entity == "Sameer Khan"
    assert len(res.perspectives) == 6
    assert len(res.consensus.supporting_evidence) >= 1
    assert len(res.consensus.contradictory_evidence) >= 1
    assert len(res.consensus.alternative_explanations) >= 1
    assert len(res.consensus.unresolved_questions) >= 1
    assert len(res.consensus.recommended_verification) >= 1

    # 2. Check Database Persistence
    saved = db_session.query(PerspectiveAssessment).filter(PerspectiveAssessment.id == res.assessment_id).first()
    assert saved is not None
    assert saved.case_id == case.id
    assert saved.target_entity_name == "Sameer Khan"

    # 3. Test History Retrieval
    history = PerspectiveReasoningService.get_case_history(db_session, case.id, user)
    assert history.total_assessments >= 1
    assert history.assessments[0].id == res.assessment_id

    # 4. Test Single Assessment Retrieval
    fetched = PerspectiveReasoningService.get_assessment_by_id(db_session, res.assessment_id, user)
    assert fetched.assessment_id == res.assessment_id
    assert len(fetched.perspectives) == 6


def test_case_and_permission_isolation(client: TestClient, db_session: Session):
    """
    Verifies that unauthorized investigators cannot run perspective reasoning on confidential cases (403 Forbidden).
    """
    unique = uuid.uuid4().hex[:6]
    analyst = User(
        username=f"iso_user_{unique}",
        email=f"iso_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("Password123!"),
        full_name="External Analyst",
        role="INVESTIGATOR",
        badge_number=f"EXT-{unique}",
        is_active=True
    )
    db_session.add(analyst)
    db_session.commit()

    conf_case = Case(
        case_number=f"CASE-SECRET-{unique}",
        title="Classified Sensitive Counter-Intelligence",
        lead_investigator_id="national_director",
        is_confidential=True,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="CRITICAL"
    )
    db_session.add(conf_case)
    db_session.commit()

    token = create_access_token(subject=analyst.username, role=analyst.role)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        f"/api/v1/perspective-reasoning/analyze/{conf_case.id}",
        json={
            "hypothesis": "Unauthorized probe into classified case",
            "target_entity": "Target"
        },
        headers=headers
    )
    assert resp.status_code in (403, 404)


def test_perspective_reasoning_api_endpoints(client: TestClient, db_session: Session):
    """
    Tests REST API endpoints:
    - POST /api/v1/perspective-reasoning/analyze/{case_id}
    - GET /api/v1/perspective-reasoning/history/{case_id}
    - GET /api/v1/perspective-reasoning/assessment/{assessment_id}
    """
    unique = uuid.uuid4().hex[:6]
    admin = User(
        username=f"adm_reason_{unique}",
        email=f"adm_{unique}@ciphertrace.gov.in",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin Officer",
        role="ADMIN",
        badge_number=f"ADM-REASON-{unique}",
        is_active=True
    )
    db_session.add(admin)
    db_session.commit()

    case = Case(
        case_number=f"CASE-API-REASON-{unique}",
        title="API Multi-Perspective Reasoning Test Case",
        lead_investigator_id=admin.username,
        assigned_lead_user_id=admin.id,
        stage="INVESTIGATION_IN_PROGRESS",
        priority="LOW"
    )
    db_session.add(case)
    db_session.commit()

    token = create_access_token(subject=admin.username, role=admin.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test /analyze endpoint
    analyze_resp = client.post(
        f"/api/v1/perspective-reasoning/analyze/{case.id}",
        json={
            "hypothesis": "Evaluation of bank transactions under BNS 318",
            "target_entity": "Mule Account Holder"
        },
        headers=headers
    )
    assert analyze_resp.status_code == 200
    data = analyze_resp.json()["data"]
    assert len(data["perspectives"]) == 6
    assessment_id = data["assessment_id"]
    assert "supporting_evidence" in data["consensus"]
    assert "contradictory_evidence" in data["consensus"]
    assert "alternative_explanations" in data["consensus"]
    assert "uncertainty" in data["consensus"]
    assert "unresolved_questions" in data["consensus"]
    assert "recommended_verification" in data["consensus"]

    # 2. Test /history endpoint
    hist_resp = client.get(
        f"/api/v1/perspective-reasoning/history/{case.id}",
        headers=headers
    )
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()["data"]
    assert hist_data["total_assessments"] >= 1

    # 3. Test /assessment/{assessment_id} endpoint
    detail_resp = client.get(
        f"/api/v1/perspective-reasoning/assessment/{assessment_id}",
        headers=headers
    )
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()["data"]
    assert detail_data["assessment_id"] == assessment_id
    assert len(detail_data["perspectives"]) == 6
