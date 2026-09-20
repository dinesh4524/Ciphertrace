import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Integer, Boolean, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class BlockchainBlock(Base):
    """
    Immutable Blockchain Block in the CIPHERTRACE integrity ledger.
    Stores block header hashes, previous block links, Merkle root of off-chain transactions,
    and simulated on-chain transaction receipt.
    """
    __tablename__ = "blockchain_blocks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    block_index = Column(Integer, unique=True, index=True, nullable=False)
    previous_block_hash = Column(String(64), nullable=False)
    merkle_root = Column(String(64), nullable=False)
    block_hash = Column(String(64), unique=True, index=True, nullable=False)
    nonce = Column(Integer, default=0, nullable=False)
    
    # Network tag: CIPHERTRACE_INTEGRITY_LEDGER_V1, ETHEREUM_L1_ANCHOR, POLYGON_POS_ANCHOR
    network = Column(String(100), default="CIPHERTRACE_INTEGRITY_LEDGER_V1", nullable=False)
    tx_receipt = Column(String(66), nullable=False) # e.g. 0x7f9a8b...
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    block_metadata = Column(JSON, default=dict)

    # Relationships
    anchors = relationship("EvidenceBlockchainAnchor", back_populates="block", cascade="all, delete-orphan")


class EvidenceBlockchainAnchor(Base):
    """
    Cryptographic anchor linking an off-chain EvidenceItem to a specific BlockchainBlock.
    Stores the exact SHA-256 digest at anchoring time and the Merkle inclusion proof.
    """
    __tablename__ = "evidence_blockchain_anchors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id = Column(String(36), ForeignKey("blockchain_blocks.id", ondelete="CASCADE"), nullable=False, index=True)

    evidence_sha256 = Column(String(64), nullable=False, index=True)
    tx_hash = Column(String(66), nullable=False, index=True)
    
    # Merkle proof details: {"leaf_index": 0, "path": [{"position": "right", "hash": "..."}]}
    merkle_proof = Column(JSON, default=dict, nullable=False)

    # Status: ANCHORED, VERIFIED, CHALLENGED, TAMPER_FLAGGED
    status = Column(String(50), default="ANCHORED", nullable=False, index=True)
    anchored_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_verified_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # History of verification runs
    verification_history = Column(JSON, default=list)

    # Relationships
    evidence = relationship("EvidenceItem")
    case = relationship("Case")
    block = relationship("BlockchainBlock", back_populates="anchors")
