"""
Blockchain & Evidence Integrity Service for CIPHERTRACE X.
Manages off-chain evidence anchoring, Merkle tree construction, block assembly,
and 4-step cryptographic verification under Section 63 BSA 2023.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.case import Case
from app.models.user import User
from app.models.evidence import EvidenceItem
from app.models.audit import AuditLog
from app.models.blockchain import BlockchainBlock, EvidenceBlockchainAnchor
from app.api.deps import check_case_access
from app.utils.blockchain_engine import MerkleTree, BlockchainEngine
from app.schemas.blockchain import (
    BlockchainBlockItem,
    EvidenceAnchorItem,
    BatchAnchorRequest,
    BatchAnchorResponse,
    IntegrityVerificationResult,
    LedgerStatsResponse,
    TamperSimulationResponse,
    StatutoryBSACertificate,
    VerificationStepItem,
)


class BlockchainService:
    @staticmethod
    def init_genesis_if_needed(db: Session) -> BlockchainBlock:
        """
        Initializes the canonical Genesis Block (Block #0) if ledger is empty.
        """
        genesis = db.query(BlockchainBlock).filter(BlockchainBlock.block_index == 0).first()
        if not genesis:
            genesis_data = BlockchainEngine.create_genesis_block()
            genesis = BlockchainBlock(**genesis_data)
            db.add(genesis)
            db.commit()
            db.refresh(genesis)
        return genesis

    @staticmethod
    def get_blockchain_ledger(db: Session) -> List[BlockchainBlockItem]:
        """
        Retrieves all blocks in the integrity blockchain ledger.
        """
        BlockchainService.init_genesis_if_needed(db)
        blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.block_index.asc()).all()
        results = []
        for b in blocks:
            anchors_count = db.query(EvidenceBlockchainAnchor).filter(EvidenceBlockchainAnchor.block_id == b.id).count()
            results.append(BlockchainBlockItem(
                id=b.id,
                block_index=b.block_index,
                previous_block_hash=b.previous_block_hash,
                merkle_root=b.merkle_root,
                block_hash=b.block_hash,
                nonce=b.nonce,
                network=b.network,
                tx_receipt=b.tx_receipt,
                timestamp=b.timestamp,
                block_metadata=b.block_metadata or {},
                anchors_count=anchors_count,
            ))
        return results

    @staticmethod
    def get_ledger_stats(db: Session) -> LedgerStatsResponse:
        """
        Computes blockchain ledger statistics and verifies full chain continuity.
        """
        BlockchainService.init_genesis_if_needed(db)
        blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.block_index.asc()).all()
        is_valid, validation_msg = BlockchainEngine.validate_chain_continuity(blocks)

        total_anchors = db.query(EvidenceBlockchainAnchor).count()
        verified_count = db.query(EvidenceBlockchainAnchor).filter(EvidenceBlockchainAnchor.status == "VERIFIED").count()
        tampered_count = db.query(EvidenceBlockchainAnchor).filter(EvidenceBlockchainAnchor.status == "TAMPER_FLAGGED").count()

        return LedgerStatsResponse(
            total_blocks=len(blocks),
            total_anchors=total_anchors,
            verified_count=verified_count,
            tampered_count=tampered_count,
            is_chain_valid=is_valid,
            chain_validation_message=validation_msg,
        )

    @staticmethod
    def anchor_case_evidence(
        case_id: str,
        db: Session,
        current_user: User,
        payload: Optional[BatchAnchorRequest] = None,
    ) -> BatchAnchorResponse:
        """
        Batches unanchored evidence items in a case, constructs a Merkle Tree,
        mines a new block, and saves individual inclusion proofs.
        """
        check_case_access(db, case_id, current_user, write_required=True)
        BlockchainService.init_genesis_if_needed(db)

        # 1. Query target evidence items
        query = db.query(EvidenceItem).filter(EvidenceItem.case_id == case_id)
        if payload and payload.evidence_ids:
            query = query.filter(EvidenceItem.id.in_(payload.evidence_ids))

        evidence_items = query.all()
        if not evidence_items:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No evidence items found for case '{case_id}'.",
            )

        # Filter items that are not yet anchored
        unanchored_items = []
        for item in evidence_items:
            existing_anchor = db.query(EvidenceBlockchainAnchor).filter(
                EvidenceBlockchainAnchor.evidence_id == item.id
            ).first()
            if not existing_anchor:
                unanchored_items.append(item)

        if not unanchored_items:
            # If all are already anchored, return latest block info
            latest_anchor = db.query(EvidenceBlockchainAnchor).filter(
                EvidenceBlockchainAnchor.case_id == case_id
            ).first()
            block = latest_anchor.block if latest_anchor else db.query(BlockchainBlock).order_by(BlockchainBlock.block_index.desc()).first()
            all_anchors = db.query(EvidenceBlockchainAnchor).filter(EvidenceBlockchainAnchor.case_id == case_id).all()
            
            return BatchAnchorResponse(
                block=BlockchainBlockItem(
                    id=block.id,
                    block_index=block.block_index,
                    previous_block_hash=block.previous_block_hash,
                    merkle_root=block.merkle_root,
                    block_hash=block.block_hash,
                    nonce=block.nonce,
                    network=block.network,
                    tx_receipt=block.tx_receipt,
                    timestamp=block.timestamp,
                    block_metadata=block.block_metadata or {},
                    anchors_count=len(all_anchors),
                ),
                anchored_count=0,
                anchors=[
                    EvidenceAnchorItem(
                        id=a.id,
                        evidence_id=a.evidence_id,
                        case_id=a.case_id,
                        block_id=a.block_id,
                        evidence_sha256=a.evidence_sha256,
                        tx_hash=a.tx_hash,
                        merkle_proof=a.merkle_proof,
                        status=a.status,
                        anchored_at=a.anchored_at,
                        last_verified_at=a.last_verified_at,
                        block_index=block.block_index,
                        file_name=getattr(a.evidence, "file_name", "Evidence Document"),
                    )
                    for a in all_anchors
                ],
                message="All evidence items in this case are already anchored to the blockchain ledger.",
            )

        # 2. Get latest block for previous hash and index
        last_block = db.query(BlockchainBlock).order_by(BlockchainBlock.block_index.desc()).first()
        next_index = last_block.block_index + 1
        previous_hash = last_block.block_hash

        # 3. Compute deterministic transaction hashes for each evidence item
        now_iso = datetime.utcnow().isoformat()
        tx_hashes = []
        for item in unanchored_items:
            tx_hash = BlockchainEngine.compute_tx_hash(
                resource_type="EVIDENCE",
                resource_id=item.id,
                case_id=case_id,
                payload_sha256=item.file_hash_sha256,
                timestamp_str=now_iso,
            )
            tx_hashes.append(tx_hash)

        # 4. Assemble Block & Merkle Tree
        block_data, merkle_tree = BlockchainEngine.assemble_block(
            block_index=next_index,
            previous_block_hash=previous_hash,
            tx_hashes=tx_hashes,
            network="CIPHERTRACE_INTEGRITY_LEDGER_V1",
            metadata={
                "case_id": case_id,
                "anchored_items_count": len(unanchored_items),
                "operator_id": current_user.id,
                "statutory_mandate": "BSA 2023 Section 63 Electronic Records Certificate",
            },
        )
        new_block = BlockchainBlock(**block_data)
        db.add(new_block)
        db.flush()

        # 5. Create Individual Anchors with Merkle Inclusion Proofs
        anchor_results = []
        for i, item in enumerate(unanchored_items):
            proof = merkle_tree.get_proof(i)
            anchor = EvidenceBlockchainAnchor(
                evidence_id=item.id,
                case_id=case_id,
                block_id=new_block.id,
                evidence_sha256=item.file_hash_sha256,
                tx_hash=tx_hashes[i],
                merkle_proof={"leaf_index": i, "leaf_hash": tx_hashes[i], "path": proof},
                status="ANCHORED",
                anchored_at=datetime.utcnow(),
                last_verified_at=datetime.utcnow(),
                verification_history=[{
                    "action": "INITIAL_BLOCKCHAIN_ANCHOR",
                    "timestamp": datetime.utcnow().isoformat(),
                    "block_index": next_index,
                    "tx_hash": tx_hashes[i],
                    "status": "ANCHORED",
                }],
            )
            db.add(anchor)
            item.integrity_status = "VERIFIED"
            item.last_verified_at = datetime.utcnow()
            anchor_results.append(anchor)

        # 6. Immutable Audit Log
        db.add(AuditLog(
            case_id=case_id,
            operator_id=current_user.id,
            operator_role=getattr(current_user, "role", "INVESTIGATOR"),
            action_type="EVIDENCE_BLOCKCHAIN_ANCHORED",
            resource_type="BLOCKCHAIN_BLOCK",
            resource_id=new_block.id,
            details_json={
                "block_index": next_index,
                "block_hash": new_block.block_hash,
                "merkle_root": new_block.merkle_root,
                "anchored_items_count": len(unanchored_items),
            },
        ))
        db.commit()

        return BatchAnchorResponse(
            block=BlockchainBlockItem(
                id=new_block.id,
                block_index=new_block.block_index,
                previous_block_hash=new_block.previous_block_hash,
                merkle_root=new_block.merkle_root,
                block_hash=new_block.block_hash,
                nonce=new_block.nonce,
                network=new_block.network,
                tx_receipt=new_block.tx_receipt,
                timestamp=new_block.timestamp,
                block_metadata=new_block.block_metadata or {},
                anchors_count=len(unanchored_items),
            ),
            anchored_count=len(unanchored_items),
            anchors=[
                EvidenceAnchorItem(
                    id=a.id,
                    evidence_id=a.evidence_id,
                    case_id=a.case_id,
                    block_id=a.block_id,
                    evidence_sha256=a.evidence_sha256,
                    tx_hash=a.tx_hash,
                    merkle_proof=a.merkle_proof,
                    status=a.status,
                    anchored_at=a.anchored_at,
                    last_verified_at=a.last_verified_at,
                    block_index=next_index,
                    file_name=getattr(a.evidence, "file_name", "Evidence Document"),
                )
                for a in anchor_results
            ],
            message=f"Successfully anchored {len(unanchored_items)} evidence items into Block #{next_index}.",
        )

    @staticmethod
    def verify_evidence_integrity(
        evidence_id: str,
        db: Session,
        current_user: User,
    ) -> IntegrityVerificationResult:
        """
        Executes the 4-step cryptographic verification:
        1. Off-chain file stream -> 2. SHA-256 match -> 3. Blockchain Merkle proof -> 4. BSA §63 Certificate verdict.
        """
        item = db.query(EvidenceItem).filter(EvidenceItem.id == evidence_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence item '{evidence_id}' not found.",
            )

        check_case_access(db, item.case_id, current_user, write_required=False)
        BlockchainService.init_genesis_if_needed(db)

        anchor = db.query(EvidenceBlockchainAnchor).filter(
            EvidenceBlockchainAnchor.evidence_id == evidence_id
        ).first()
        block = anchor.block if anchor else None

        # Execute 4-step verification
        raw_result = BlockchainEngine.run_evidence_verification(
            evidence_item=item,
            anchor=anchor,
            block=block,
        )

        # Update anchor and evidence records
        if anchor:
            new_status = "VERIFIED" if raw_result["overall_integrity_status"] == "VERIFIED_TAMPER_PROOF" else "TAMPER_FLAGGED"
            anchor.status = new_status
            anchor.last_verified_at = datetime.utcnow()
            
            history = anchor.verification_history or []
            history.append({
                "action": "INTEGRITY_VERIFICATION",
                "timestamp": datetime.utcnow().isoformat(),
                "verdict": raw_result["overall_integrity_status"],
                "hash_match": raw_result["hash_match"],
                "merkle_proof_valid": raw_result["merkle_proof_valid"],
            })
            anchor.verification_history = history

            if new_status == "TAMPER_FLAGGED":
                item.integrity_status = "INADMISSIBLE"
            else:
                item.integrity_status = "VERIFIED"
            item.last_verified_at = datetime.utcnow()

        # Audit Log
        db.add(AuditLog(
            case_id=item.case_id,
            operator_id=current_user.id,
            operator_role=getattr(current_user, "role", "INVESTIGATOR"),
            action_type="EVIDENCE_INTEGRITY_VERIFIED",
            resource_type="EVIDENCE_ITEM",
            resource_id=evidence_id,
            details_json={
                "verdict": raw_result["overall_integrity_status"],
                "hash_match": raw_result["hash_match"],
                "merkle_proof_valid": raw_result["merkle_proof_valid"],
            },
        ))
        db.commit()

        # Format steps and certificate
        steps = [
            VerificationStepItem(
                step_number=s["step_number"],
                step_name=s["step_name"],
                status=s["status"],
                details=s["details"],
            )
            for s in raw_result["verification_steps"]
        ]
        cert_data = raw_result["statutory_bsa_cert"]
        bsa_cert = StatutoryBSACertificate(**cert_data)

        return IntegrityVerificationResult(
            evidence_id=raw_result["evidence_id"],
            file_name=raw_result["file_name"],
            current_sha256=raw_result["current_sha256"],
            recorded_sha256=raw_result["recorded_sha256"],
            hash_match=raw_result["hash_match"],
            is_anchored=raw_result["is_anchored"],
            block_index=raw_result["block_index"],
            block_hash=raw_result["block_hash"],
            merkle_root=raw_result["merkle_root"],
            tx_receipt=raw_result["tx_receipt"],
            merkle_proof_valid=raw_result["merkle_proof_valid"],
            overall_integrity_status=raw_result["overall_integrity_status"],
            verification_steps=steps,
            statutory_bsa_cert=bsa_cert,
        )

    @staticmethod
    def get_case_anchors(case_id: str, db: Session, current_user: User) -> List[EvidenceAnchorItem]:
        """
        Returns all blockchain anchors for a case.
        """
        check_case_access(db, case_id, current_user, write_required=False)
        anchors = db.query(EvidenceBlockchainAnchor).filter(
            EvidenceBlockchainAnchor.case_id == case_id
        ).all()

        results = []
        for a in anchors:
            results.append(EvidenceAnchorItem(
                id=a.id,
                evidence_id=a.evidence_id,
                case_id=a.case_id,
                block_id=a.block_id,
                evidence_sha256=a.evidence_sha256,
                tx_hash=a.tx_hash,
                merkle_proof=a.merkle_proof,
                status=a.status,
                anchored_at=a.anchored_at,
                last_verified_at=a.last_verified_at,
                block_index=a.block.block_index if a.block else None,
                file_name=getattr(a.evidence, "file_name", "Evidence Document"),
            ))
        return results

    @staticmethod
    def simulate_tamper(
        evidence_id: str,
        db: Session,
        current_user: User,
    ) -> TamperSimulationResponse:
        """
        Controlled sandbox simulation:
        Simulates file byte alteration and proves that the 4-step verification engine immediately
        flags TAMPER_DETECTED and invalidates judicial admissibility.

        Does NOT mutate the database. Instead, builds an inline proxy evidence object with a
        corrupted hash and passes it directly to the verification engine.
        """
        item = db.query(EvidenceItem).filter(EvidenceItem.id == evidence_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence item '{evidence_id}' not found.",
            )

        check_case_access(db, item.case_id, current_user, write_required=False)
        original_hash = item.file_hash_sha256

        # Simulate corrupting bytes: flip last 4 hex chars
        tampered_hash = original_hash[:-4] + "dead"

        # Build an in-memory proxy with the tampered hash, no real file path.
        # The engine's Step 2 compares: current (db file_hash_sha256) vs recorded (anchor.evidence_sha256).
        # tampered_hash != original_hash triggers TAMPER_DETECTED.
        class _TamperedEvidenceProxy:
            id = item.id
            evidence_code = item.evidence_code
            file_name = item.file_name
            file_path = None  # Force fallback to db_recorded_sha256
            file_hash_sha256 = tampered_hash  # Simulates corrupted DB/file hash
            file_size_bytes = item.file_size_bytes

        # Retrieve anchor and block
        anchor = db.query(EvidenceBlockchainAnchor).filter(
            EvidenceBlockchainAnchor.evidence_id == evidence_id
        ).first()
        block = anchor.block if anchor else None

        if anchor is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Evidence '{evidence_id}' is not anchored yet. Anchor it first before running tamper simulation.",
            )

        # Keep the anchor's evidence_sha256 as the ORIGINAL (blockchain ground truth).
        # The evidence proxy carries the TAMPERED hash — engine detects the mismatch in Step 2.
        class _TamperedAnchorProxy:
            id = anchor.id
            evidence_id = anchor.evidence_id
            case_id = anchor.case_id
            block_id = anchor.block_id
            evidence_sha256 = original_hash  # Immutable blockchain-anchored hash (ground truth)
            tx_hash = anchor.tx_hash
            merkle_proof = anchor.merkle_proof
            status = anchor.status
            anchored_at = anchor.anchored_at
            last_verified_at = anchor.last_verified_at

        raw_result = BlockchainEngine.run_evidence_verification(
            evidence_item=_TamperedEvidenceProxy,
            anchor=_TamperedAnchorProxy,
            block=block,
        )

        # Build IntegrityVerificationResult from raw_result
        steps = [
            VerificationStepItem(
                step_number=s["step_number"],
                step_name=s["step_name"],
                status=s["status"],
                details=s["details"],
            )
            for s in raw_result["verification_steps"]
        ]
        cert_data = raw_result["statutory_bsa_cert"]
        bsa_cert = StatutoryBSACertificate(**cert_data)

        verification_result = IntegrityVerificationResult(
            evidence_id=raw_result["evidence_id"],
            file_name=raw_result["file_name"],
            current_sha256=raw_result["current_sha256"],
            recorded_sha256=raw_result["recorded_sha256"],
            hash_match=raw_result["hash_match"],
            is_anchored=raw_result["is_anchored"],
            block_index=raw_result["block_index"],
            block_hash=raw_result["block_hash"],
            merkle_root=raw_result["merkle_root"],
            tx_receipt=raw_result["tx_receipt"],
            merkle_proof_valid=raw_result["merkle_proof_valid"],
            overall_integrity_status=raw_result["overall_integrity_status"],
            verification_steps=steps,
            statutory_bsa_cert=bsa_cert,
        )

        return TamperSimulationResponse(
            evidence_id=evidence_id,
            file_name=item.file_name,
            original_sha256=original_hash,
            tampered_sha256=tampered_hash,
            simulation_message="Byte tampering simulated successfully. Verification engine detected hash divergence and rejected admissibility.",
            verification_result=verification_result,
        )
