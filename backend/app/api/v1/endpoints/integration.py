from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_permissions
from app.core.permissions import Permission
from app.models.user import User
from app.models.case import Case
from app.schemas.common import APIResponse
from app.schemas.integration import (
    RunSIHDemoResponse,
    InvestigationDossierReport,
    WorkflowExecutionProgress,
)
from app.services.integration_service import IntegrationService

router = APIRouter()


@router.post(
    "/run-sih-demo",
    response_model=APIResponse[RunSIHDemoResponse],
    summary="Execute 1-Click SIH 2026 End-to-End Criminal Intelligence Demo",
)
def run_sih_demo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes the complete 19-stage CIPHERTRACE X investigation workflow:
    1. Case Registration -> 2. Ingest Evidence -> 3. NER Extraction -> 4. Entity Resolution ->
    5. Build Graph -> 6. Network Topology -> 7. Louvain Communities -> 8. Bridge Nodes ->
    9. Hidden Links ML -> 10. Anomalies & Mule Detection -> 11. GraphRAG -> 12. Multi-Perspective ->
    13. Counterfactual Ablation -> 14. Priority Ranking -> 15. Next Actions -> 16. Legal Intelligence (BNS/BSA) ->
    17. Human Review -> 18. Blockchain Merkle Hash (Sec 63 BSA) -> 19. Final Investigation Dossier.
    """
    result = IntegrationService.seed_and_run_sih_demo(db=db, user=current_user)
    return APIResponse(
        success=True,
        data=result,
        message="SIH 2026 End-to-End Criminal Intelligence Demo executed successfully.",
    )


@router.get(
    "/dossier/{case_id}",
    response_model=APIResponse[InvestigationDossierReport],
    summary="Retrieve court-admissible Investigation Report Dossier for a case",
)
def get_case_dossier(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the comprehensive Investigation Report Dossier including executive summary,
    network analytics, legal charges under BNS, and cryptographic evidence hashes.
    """
    dossier = IntegrationService.generate_investigation_dossier(case_id=case_id, db=db)
    return APIResponse(
        success=True,
        data=dossier,
        message="Investigation Report Dossier compiled successfully.",
    )


@router.get(
    "/sih-demo/status",
    summary="Get SIH Demo metadata and sample dataset overview",
)
def get_sih_demo_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns SIH demonstration dataset overview and workflow configuration.
    """
    sih_case = db.query(Case).filter(Case.case_number == "SIH-2026-X771").first()
    return APIResponse(
        success=True,
        data={
            "sih_case_number": "SIH-2026-X771",
            "sih_case_title": "Operation ShadowHawala: Cyber Fraud & Mule Network Syndicate",
            "is_seeded": sih_case is not None,
            "case_id": str(sih_case.id) if sih_case else None,
            "total_workflow_stages": 19,
            "available_sources": ["FIR (JSON & Text)", "Telecom CDR (CSV)", "Financial Bank Ledger (CSV)", "Interrogation Memo (Text)", "FSL Mobile Forensics (JSON)"],
            "legal_framework": "Bharatiya Nyaya Sanhita (BNS) 2023 / Bharatiya Sakshya Adhiniyam (BSA) 2023 Section 63",
        },
        message="SIH Demo information retrieved.",
    )
