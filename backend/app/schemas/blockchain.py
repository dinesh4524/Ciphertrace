from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class BlockchainBlockItem(BaseModel):
    id: str
    block_index: int
    previous_block_hash: str
    merkle_root: str
    block_hash: str
    nonce: int
    network: str
    tx_receipt: str
    timestamp: datetime
    block_metadata: Dict[str, Any] = {}
    anchors_count: int = 0


class EvidenceAnchorItem(BaseModel):
    id: str
    evidence_id: str
    case_id: str
    block_id: str
    evidence_sha256: str
    tx_hash: str
    merkle_proof: Dict[str, Any]
    status: str
    anchored_at: datetime
    last_verified_at: datetime
    block_index: Optional[int] = None
    file_name: Optional[str] = None


class BatchAnchorRequest(BaseModel):
    case_id: Optional[str] = None
    evidence_ids: Optional[List[str]] = None


class BatchAnchorResponse(BaseModel):
    block: BlockchainBlockItem
    anchored_count: int
    anchors: List[EvidenceAnchorItem]
    message: str


class VerificationStepItem(BaseModel):
    step_number: int
    step_name: str
    status: str
    details: str


class StatutoryBSACertificate(BaseModel):
    certificate_title: str
    statute: str
    evidence_code: Optional[str] = "EVID-OFFCHAIN"
    file_name: str
    sha256_hash: str
    blockchain_block_index: Optional[int]
    blockchain_tx_receipt: Optional[str]
    merkle_root: Optional[str]
    verified_at: str
    integrity_verdict: str
    is_judicially_admissible: bool
    custodian_statement: str


class IntegrityVerificationResult(BaseModel):
    evidence_id: str
    file_name: str
    current_sha256: str
    recorded_sha256: str
    hash_match: bool
    is_anchored: bool
    block_index: Optional[int] = None
    block_hash: Optional[str] = None
    merkle_root: Optional[str] = None
    tx_receipt: Optional[str] = None
    merkle_proof_valid: bool
    overall_integrity_status: str
    verification_steps: List[VerificationStepItem]
    statutory_bsa_cert: StatutoryBSACertificate


class LedgerStatsResponse(BaseModel):
    total_blocks: int
    total_anchors: int
    verified_count: int
    tampered_count: int
    is_chain_valid: bool
    chain_validation_message: Optional[str] = None


class TamperSimulationResponse(BaseModel):
    evidence_id: str
    file_name: str
    original_sha256: str
    tampered_sha256: str
    simulation_message: str
    verification_result: IntegrityVerificationResult
