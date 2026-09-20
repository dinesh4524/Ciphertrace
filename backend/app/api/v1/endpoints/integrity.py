from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_permissions
from app.core.permissions import Permission
from app.models.user import User
from app.schemas.common import APIResponse
from app.services.blockchain_service import BlockchainService
from app.schemas.blockchain import (
    BlockchainBlockItem,
    EvidenceAnchorItem,
    BatchAnchorRequest,
    BatchAnchorResponse,
    IntegrityVerificationResult,
    LedgerStatsResponse,
    TamperSimulationResponse,
)

router = APIRouter()


@router.get(
    "/blocks",
    response_model=APIResponse[List[BlockchainBlockItem]],
    summary="List all blocks in the integrity blockchain ledger",
)
def get_blockchain_blocks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all blocks from Block #0 (Genesis) to latest block with headers, Merkle roots, and TX receipts.
    """
    blocks = BlockchainService.get_blockchain_ledger(db)
    return APIResponse(
        success=True,
        data=blocks,
        message="Blockchain ledger blocks retrieved successfully.",
    )


@router.get(
    "/stats",
    response_model=APIResponse[LedgerStatsResponse],
    summary="Get blockchain ledger statistics and chain continuity validation",
)
def get_ledger_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Computes ledger stats and cryptographically validates unbroken block header continuity.
    """
    stats_data = BlockchainService.get_ledger_stats(db)
    return APIResponse(
        success=True,
        data=stats_data,
        message="Ledger statistics and chain validation completed.",
    )


@router.get(
    "/anchors/{case_id}",
    response_model=APIResponse[List[EvidenceAnchorItem]],
    summary="Get all blockchain anchors for a case",
)
def get_case_anchors(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ)),
):
    """
    Retrieve all cryptographic anchors, Merkle inclusion proofs, and transaction hashes for a case.
    """
    anchors = BlockchainService.get_case_anchors(case_id, db, current_user)
    return APIResponse(
        success=True,
        data=anchors,
        message="Case blockchain anchors retrieved successfully.",
    )


@router.post(
    "/anchor/{case_id}",
    response_model=APIResponse[BatchAnchorResponse],
    summary="Anchor unanchored case evidence into a new blockchain block",
)
def anchor_case_evidence(
    case_id: str,
    payload: Optional[BatchAnchorRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ)),
):
    """
    Batches off-chain evidence items, computes Merkle Tree & root hash,
    mines a new block, and attaches individual inclusion proofs.
    """
    result = BlockchainService.anchor_case_evidence(case_id, db, current_user, payload)
    return APIResponse(
        success=True,
        data=result,
        message=result.message,
    )


@router.post(
    "/verify/{evidence_id}",
    response_model=APIResponse[IntegrityVerificationResult],
    summary="Execute 4-step cryptographic verification of evidence integrity",
)
def verify_evidence_integrity(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.EVIDENCE_READ)),
):
    """
    Executes the 4-step verification pipeline:
    1. Off-Chain File Stream -> 2. SHA-256 Digest Match -> 3. Blockchain Anchor & Merkle Proof -> 4. BSA §63 Verdict.
    """
    result = BlockchainService.verify_evidence_integrity(evidence_id, db, current_user)
    return APIResponse(
        success=True,
        data=result,
        message="Cryptographic integrity verification completed.",
    )


@router.post(
    "/tamper-simulation/{evidence_id}",
    response_model=APIResponse[TamperSimulationResponse],
    summary="Controlled tamper simulation sandbox",
)
def simulate_evidence_tamper(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions(Permission.CASE_READ, Permission.EVIDENCE_READ)),
):
    """
    Controlled sandbox: Simulates off-chain byte corruption and demonstrates how the
    verification engine immediately flags TAMPER_DETECTED and invalidates judicial admissibility.
    """
    result = BlockchainService.simulate_tamper(evidence_id, db, current_user)
    return APIResponse(
        success=True,
        data=result,
        message="Tamper simulation completed. Verification engine rejected tampered state.",
    )
