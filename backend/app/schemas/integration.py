from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WorkflowStepResult(BaseModel):
    step_number: int = Field(..., description="Step index 1 to 19")
    step_name: str = Field(..., description="Name of the workflow stage")
    step_category: str = Field(default="CORE", description="INGESTION, NLP, GRAPH, REASONING, LEGAL, INTEGRITY, REPORT")
    status: str = Field(default="COMPLETED", description="PENDING, RUNNING, COMPLETED, FAILED, SKIPPED")
    duration_ms: float = Field(default=0.0, description="Execution duration in milliseconds")
    summary: str = Field(..., description="High-level narrative outcome of this stage")
    key_metrics: Dict[str, Any] = Field(default_factory=dict, description="Key numerical and categorical metrics")
    artifacts: Dict[str, Any] = Field(default_factory=dict, description="Generated preview entities, charts, or tables")
    error: Optional[str] = None


class WorkflowExecutionProgress(BaseModel):
    case_id: str
    case_number: str
    status: str = Field(default="COMPLETED", description="IDLE, RUNNING, COMPLETED, FAILED")
    current_step: int = Field(default=19)
    total_steps: int = Field(default=19)
    steps: List[WorkflowStepResult] = Field(default_factory=list)
    started_at: str
    completed_at: Optional[str] = None
    total_duration_ms: float = 0.0


class InvestigationDossierReport(BaseModel):
    case_id: str
    case_number: str
    title: str
    crime_category: str
    police_station: str
    total_loss_inr: float
    status: str
    io_name: str
    generated_at: str
    
    executive_summary: str
    
    # Entity & Graph Topology
    entity_network_summary: Dict[str, Any] = Field(default_factory=dict)
    key_players: List[Dict[str, Any]] = Field(default_factory=list)
    syndicate_communities: List[Dict[str, Any]] = Field(default_factory=list)
    bridge_nodes: List[Dict[str, Any]] = Field(default_factory=list)
    hidden_links_predicted: List[Dict[str, Any]] = Field(default_factory=list)
    anomalies_detected: List[Dict[str, Any]] = Field(default_factory=list)
    
    # AI Reasoning & Evidence Fusion
    graphrag_insights: List[Dict[str, Any]] = Field(default_factory=list)
    multi_perspective_consensus: Dict[str, Any] = Field(default_factory=dict)
    counterfactual_vulnerability: Dict[str, Any] = Field(default_factory=dict)
    
    # Priority & Action Directives
    ranked_suspects: List[Dict[str, Any]] = Field(default_factory=list)
    next_best_actions: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Legal & Judicial Safeguards
    legal_charges_bns: List[str] = Field(default_factory=list)
    bsa_section_63_status: str = Field(default="COMPLIANT_HASH_VERIFIED")
    judicial_admissibility_score: float = Field(default=0.95)
    chargesheet_points: List[str] = Field(default_factory=list)
    
    # Cryptographic Chain of Custody & Blockchain
    blockchain_merkle_root: str
    blockchain_block_height: int
    bsa_sec_63_certificate_token: str
    evidence_hashes: List[Dict[str, Any]] = Field(default_factory=list)
    audit_events_count: int = 0
    audit_chain_valid: bool = True


class RunSIHDemoResponse(BaseModel):
    success: bool = True
    message: str = "SIH 2026 End-to-End Criminal Intelligence Demo executed successfully."
    case_id: str
    case_number: str
    execution_progress: WorkflowExecutionProgress
    dossier_report: InvestigationDossierReport
