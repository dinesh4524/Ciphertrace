from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    cases,
    evidence,
    ingestion,
    nlp,
    entity_resolution,
    graph,
    analytics,
    audit,
    rag,
    graphrag,
    perspective_reasoning,
    counterfactual,
    investigative_priority,
    legal,
    integrity,
    mlops,
    integration,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["System Diagnostics"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & User Management"])
api_router.include_router(cases.router, prefix="/cases", tags=["Case Management & RBAC"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["Evidence Fabric & Chain of Custody"])
api_router.include_router(ingestion.router, prefix="/ingest", tags=["Multi-Modal Ingestion Engine"])
api_router.include_router(nlp.router, prefix="/nlp", tags=["Document Intelligence & NLP Extraction"])
api_router.include_router(entity_resolution.router, prefix="/entity-resolution", tags=["Entity Resolution & Human-in-the-Loop Hub"])
api_router.include_router(graph.router, prefix="/graph", tags=["Criminal Knowledge Graph & Network Analytics"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Network Analytics & Hidden-Link ML"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Trail & Verification"])
api_router.include_router(rag.router, prefix="/rag", tags=["Document RAG & Evidentiary Citations"])
api_router.include_router(graphrag.router, prefix="/graphrag", tags=["GraphRAG Multi-Engine Router & Evidence Fusion"])
api_router.include_router(perspective_reasoning.router, prefix="/perspective-reasoning", tags=["Multi-Perspective Reasoning & Consensus"])
api_router.include_router(counterfactual.router, prefix="/counterfactual", tags=["Counterfactual & Evidence Ablation"])
api_router.include_router(investigative_priority.router, prefix="/priority", tags=["Investigative Priority & Next Best Action"])
api_router.include_router(legal.router, prefix="/legal", tags=["Indian Legal Intelligence (BNS/BNSS/BSA)"])
api_router.include_router(integrity.router, prefix="/integrity", tags=["Evidence Integrity & Blockchain Ledger (BSA §63)"])
api_router.include_router(mlops.router, prefix="/mlops", tags=["MLOps & Evaluation (Phase 19)"])
api_router.include_router(integration.router, prefix="/integration", tags=["Final Integration & SIH Demo (Phase 20)"])




