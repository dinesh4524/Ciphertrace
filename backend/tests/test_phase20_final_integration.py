"""
Phase 20 — Final Integration & SIH Demo Test Suite
CIPHERTRACE X Criminal Intelligence Platform
"""
import os
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.services.integration_service import IntegrationService


@pytest.fixture
def admin_user(db_session):
    user = db_session.query(User).filter(User.username == "admin_io").first()
    if not user:
        user = User(
            username="admin_io",
            email="admin.io@ciphertrace.police.gov.in",
            hashed_password="hashed_placeholder",
            full_name="Inspector Rajiv Sharma",
            role="SYSTEM_ADMINISTRATOR",
            badge_number="IO-7492-INSP-SHARMA",
            department="Cyber Crime Special Intelligence Unit",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


class TestSIHDemoDataset:
    """Tests verifying integrity and presence of the dedicated SIH demonstration dataset."""

    def test_sih_dataset_files_present(self):
        demo_dir = Path(__file__).resolve().parents[1] / "demo_data" / "sih_demo_dataset"
        expected_files = [
            "fir_sih_001.json",
            "fir_sih_002.txt",
            "cdr_sih_telecom.csv",
            "financial_sih_transactions.csv",
            "interrogation_sih_memo.txt",
            "digital_forensics_sih.json",
        ]
        for fname in expected_files:
            fpath = demo_dir / fname
            assert fpath.exists(), f"Missing SIH demo dataset file: {fname}"
            assert fpath.stat().st_size > 50, f"SIH demo file is empty or too small: {fname}"

    def test_fir_json_structure(self):
        demo_dir = Path(__file__).resolve().parents[1] / "demo_data" / "sih_demo_dataset"
        with open(demo_dir / "fir_sih_001.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data["fir_number"] == "FIR-2026-CYBER-0771"
        assert "acts_and_sections" in data
        assert data["incident_details"]["total_loss_inr"] == 84000000.0

    def test_digital_forensics_json_structure(self):
        demo_dir = Path(__file__).resolve().parents[1] / "demo_data" / "sih_demo_dataset"
        with open(demo_dir / "digital_forensics_sih.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data["forensic_report_id"] == "FSL-CYB-2026-8941"
        assert len(data["extracted_artifacts"]["telegram_channels"]) > 0
        assert len(data["extracted_artifacts"]["crypto_wallets"]) > 0


class TestIntegrationWorkflowService:
    """Tests executing the complete 19-stage workflow via IntegrationService."""

    def test_seed_and_run_sih_demo_all_19_steps(self, db_session, admin_user):
        result = IntegrationService.seed_and_run_sih_demo(db=db_session, user=admin_user)
        
        assert result.success is True
        assert result.case_number == "SIH-2026-X771"
        assert result.execution_progress.total_steps == 19
        assert result.execution_progress.current_step == 19
        assert result.execution_progress.status == "COMPLETED"
        assert len(result.execution_progress.steps) == 19

        # Verify all 19 step names and statuses
        expected_step_keywords = [
            "Create Case",
            "Upload Multi-Modal Evidence",
            "Extract Entities",
            "Resolve Entities",
            "Build Criminal Knowledge Graph",
            "Visualize Network Topology",
            "Detect Syndicate Communities",
            "Identify Bridge Nodes",
            "Predict Hidden Links",
            "Detect Anomalies",
            "Retrieve Evidence with GraphRAG",
            "Multi-Perspective Reasoning",
            "Counterfactual Analysis",
            "Investigative Priority Ranking",
            "Generate Next Best Actions",
            "Legal Intelligence",
            "Human Challenge",
            "Blockchain Merkle Anchoring",
            "Generate Final Investigation Dossier",
        ]

        for i, (step, keyword) in enumerate(zip(result.execution_progress.steps, expected_step_keywords), start=1):
            assert step.step_number == i
            assert step.status == "COMPLETED"
            assert keyword.lower() in step.step_name.lower(), f"Step {i} mismatch: {step.step_name}"
            assert step.duration_ms >= 0.0
            assert len(step.summary) > 10

    def test_dossier_report_content_integrity(self, db_session, admin_user):
        result = IntegrationService.seed_and_run_sih_demo(db=db_session, user=admin_user)
        dossier = result.dossier_report

        assert dossier.case_number == "SIH-2026-X771"
        assert dossier.total_loss_inr == 84000000.0
        assert "Operation ShadowHawala" in dossier.title or "ShadowHawala" in dossier.title
        assert len(dossier.executive_summary) > 100

        # Topology and Analytics
        assert dossier.entity_network_summary["total_nodes"] >= 15
        assert len(dossier.key_players) >= 3
        assert len(dossier.syndicate_communities) >= 3
        assert len(dossier.bridge_nodes) >= 2
        assert len(dossier.hidden_links_predicted) >= 2

        # Reasoning, Priority & Legal
        assert dossier.multi_perspective_consensus["dominant_hypothesis"] == "ORGANIZED_TRANSNATIONAL_CYBER_HAWALA_SYNDICATE"
        assert len(dossier.ranked_suspects) >= 3
        assert len(dossier.next_best_actions) >= 3
        assert len(dossier.legal_charges_bns) >= 4
        assert len(dossier.chargesheet_points) >= 4

        # Blockchain & Cryptographic Certificate
        assert len(dossier.blockchain_merkle_root) == 64
        assert "BSA-SEC63-CERT" in dossier.bsa_sec_63_certificate_token
        assert dossier.bsa_section_63_status == "COMPLIANT_HASH_VERIFIED"
        assert dossier.judicial_admissibility_score >= 0.90


class TestIntegrationAPIEndpoints:
    """Tests verifying FastAPI integration REST API endpoints."""

    def test_sih_demo_status_endpoint(self, client):
        res = client.get("/api/v1/integration/sih-demo/status")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["sih_case_number"] == "SIH-2026-X771"
        assert data["data"]["total_workflow_stages"] == 19

    def test_run_sih_demo_endpoint(self, client):
        res = client.post("/api/v1/integration/run-sih-demo")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["case_number"] == "SIH-2026-X771"
        assert data["data"]["execution_progress"]["total_steps"] == 19
        assert len(data["data"]["execution_progress"]["steps"]) == 19
        assert "dossier_report" in data["data"]
        assert data["data"]["dossier_report"]["bsa_section_63_status"] == "COMPLIANT_HASH_VERIFIED"

    def test_get_case_dossier_endpoint(self, client):
        init_res = client.post("/api/v1/integration/run-sih-demo")
        case_id = init_res.json()["data"]["case_id"]

        res = client.get(f"/api/v1/integration/dossier/{case_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["case_number"] == "SIH-2026-X771"
        assert len(data["data"]["chargesheet_points"]) > 0
        assert len(data["data"]["blockchain_merkle_root"]) == 64
