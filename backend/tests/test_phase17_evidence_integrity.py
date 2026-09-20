import os
import uuid
import tempfile
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.case import Case
from app.models.evidence import EvidenceItem
from app.models.user import User
from app.utils.crypto import calculate_string_sha256, calculate_file_sha256
from app.utils.blockchain_engine import MerkleTree, BlockchainEngine
from app.services.blockchain_service import BlockchainService


def test_merkle_tree_and_proof_generation():
    """
    Test 1: Merkle Tree construction and cryptographic inclusion proofs.
    - Ensures root hash is deterministic.
    - Generates proofs for all leaves.
    - Verifies valid proofs return True.
    - Verifies altered leaf or proof returns False.
    """
    leaves = [
        calculate_string_sha256("TX_0_EVIDENCE_A"),
        calculate_string_sha256("TX_1_EVIDENCE_B"),
        calculate_string_sha256("TX_2_EVIDENCE_C"),
        calculate_string_sha256("TX_3_EVIDENCE_D"),
    ]

    tree = MerkleTree(leaves)
    assert tree.root is not None
    assert len(tree.root) == 64

    # Verify proofs for each leaf
    for i, leaf in enumerate(leaves):
        proof = tree.get_proof(i)
        assert len(proof) == 2 # log2(4) = 2
        is_valid = MerkleTree.verify_proof(leaf, proof, tree.root)
        assert is_valid is True

    # Tampered leaf MUST fail proof verification
    tampered_leaf = calculate_string_sha256("CORRUPTED_LEAF")
    proof_0 = tree.get_proof(0)
    assert MerkleTree.verify_proof(tampered_leaf, proof_0, tree.root) is False

    # Proof with wrong root MUST fail
    wrong_root = calculate_string_sha256("WRONG_ROOT")
    assert MerkleTree.verify_proof(leaves[0], proof_0, wrong_root) is False


def test_blockchain_engine_and_chain_continuity():
    """
    Test 2: Blockchain block header hashing and chain continuity verification.
    - Genesis Block #0 validation.
    - Block #1 and Block #2 assembly and linking.
    - Verifies unbroken chain validation.
    - Simulates corrupting a block hash and confirms chain broken detection.
    """
    genesis_dict = BlockchainEngine.create_genesis_block()
    assert genesis_dict["block_index"] == 0
    assert genesis_dict["previous_block_hash"] == "0" * 64

    # Dummy block class to test validation
    class MockBlock:
        def __init__(self, index, prev_hash, merkle_root, b_hash, timestamp, nonce=0):
            self.block_index = index
            self.previous_block_hash = prev_hash
            self.merkle_root = merkle_root
            self.block_hash = b_hash
            self.timestamp = timestamp
            self.nonce = nonce

    ts0 = genesis_dict["timestamp"]
    b0 = MockBlock(0, genesis_dict["previous_block_hash"], genesis_dict["merkle_root"], genesis_dict["block_hash"], ts0)

    # Block 1
    txs_1 = [calculate_string_sha256("EVID_1"), calculate_string_sha256("EVID_2")]
    b1_dict, _ = BlockchainEngine.assemble_block(1, b0.block_hash, txs_1)
    b1 = MockBlock(1, b1_dict["previous_block_hash"], b1_dict["merkle_root"], b1_dict["block_hash"], b1_dict["timestamp"])

    # Block 2
    txs_2 = [calculate_string_sha256("EVID_3")]
    b2_dict, _ = BlockchainEngine.assemble_block(2, b1.block_hash, txs_2)
    b2 = MockBlock(2, b2_dict["previous_block_hash"], b2_dict["merkle_root"], b2_dict["block_hash"], b2_dict["timestamp"])

    # Test valid chain
    is_valid, err = BlockchainEngine.validate_chain_continuity([b0, b1, b2])
    assert is_valid is True
    assert err is None

    # Simulate tampered block header
    b1.merkle_root = calculate_string_sha256("TAMPERED_ROOT")
    is_valid, err = BlockchainEngine.validate_chain_continuity([b0, b1, b2])
    assert is_valid is False
    assert "header hash corrupted" in err


def test_four_step_evidence_integrity_pipeline():
    """
    Test 3: Full 4-Step Verification demonstration:
    Evidence -> SHA-256 Digest -> Blockchain Anchor -> Verification Verdict & Section 63 BSA Certificate.
    """
    # Create temporary file to act as off-chain evidence
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".pdf") as tmp:
        tmp.write("CONFIDENTIAL_BANK_STATEMENT_ACCOUNT_109283746")
        tmp_path = tmp.name

    try:
        file_sha256 = calculate_file_sha256(tmp_path)
        
        class MockEvidence:
            id = "evid-test-01"
            evidence_code = "EVID-2024-001"
            file_name = "Bank_Statement_2024.pdf"
            file_path = tmp_path
            file_hash_sha256 = file_sha256
            file_size_bytes = os.path.getsize(tmp_path)

        # Assemble Anchor & Block
        tree = MerkleTree([file_sha256])
        b_dict, _ = BlockchainEngine.assemble_block(1, "0" * 64, [file_sha256])
        
        class MockBlock:
            block_index = 1
            previous_block_hash = "0" * 64
            merkle_root = tree.root
            block_hash = b_dict["block_hash"]
            timestamp = b_dict["timestamp"]
            nonce = 0
            tx_receipt = b_dict["tx_receipt"]

        class MockAnchor:
            evidence_sha256 = file_sha256
            merkle_proof = tree.get_proof(0)  # List of proof steps (no leaf_hash stored - engine falls back to evidence_sha256)

        result = BlockchainEngine.run_evidence_verification(
            evidence_item=MockEvidence,
            anchor=MockAnchor,
            block=MockBlock,
        )

        assert result["evidence_id"] == "evid-test-01"
        assert result["hash_match"] is True
        assert result["merkle_proof_valid"] is True
        assert result["overall_integrity_status"] == "VERIFIED_TAMPER_PROOF"

        # Verify 4 distinct steps in pipeline
        assert len(result["verification_steps"]) == 4
        assert result["verification_steps"][0]["step_name"] == "Off-Chain Storage & Stream"
        assert result["verification_steps"][1]["step_name"] == "SHA-256 Cryptographic Digest"
        assert result["verification_steps"][2]["step_name"] == "Blockchain Anchor & Merkle Proof"
        assert result["verification_steps"][3]["step_name"] == "Statutory Integrity Verification"

        # Verify Section 63 BSA Certificate
        cert = result["statutory_bsa_cert"]
        assert cert["is_judicially_admissible"] is True
        assert "Section 63" in cert["statute"]
        assert cert["sha256_hash"] == file_sha256
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_tamper_detection_and_inadmissibility_alert():
    """
    Test 4: Proves that off-chain byte modification fails SHA-256 matching and triggers TAMPER_DETECTED.
    """
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".csv") as tmp:
        tmp.write("ORIGINAL_CDR_DATA_CALLER_A_CALLEE_B")
        tmp_path = tmp.name

    try:
        original_hash = calculate_file_sha256(tmp_path)

        class MockEvidence:
            id = "evid-tamper-01"
            evidence_code = "EVID-2024-002"
            file_name = "CDR_Record.csv"
            file_path = tmp_path
            file_hash_sha256 = original_hash
            file_size_bytes = os.path.getsize(tmp_path)

        tree = MerkleTree([original_hash])
        b_dict, _ = BlockchainEngine.assemble_block(1, "0" * 64, [original_hash])

        class MockBlock:
            block_index = 1
            previous_block_hash = "0" * 64
            merkle_root = tree.root
            block_hash = b_dict["block_hash"]
            timestamp = b_dict["timestamp"]
            nonce = 0
            tx_receipt = b_dict["tx_receipt"]

        class MockAnchor:
            evidence_sha256 = original_hash
            merkle_proof = tree.get_proof(0)  # List of proof steps (no leaf_hash stored - engine falls back to evidence_sha256)

        # Corrupt off-chain file
        with open(tmp_path, "a") as f:
            f.write("_TAMPERED_INJECTED_BYTES")

        result = BlockchainEngine.run_evidence_verification(
            evidence_item=MockEvidence,
            anchor=MockAnchor,
            block=MockBlock,
        )

        assert result["hash_match"] is False
        assert result["overall_integrity_status"] == "TAMPER_DETECTED"
        assert result["statutory_bsa_cert"]["is_judicially_admissible"] is False
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_blockchain_api_endpoints(client: TestClient, db_session: Session):
    """
    Test 5: Integration testing of all Phase 17 REST API endpoints:
    - GET /api/v1/integrity/blocks
    - GET /api/v1/integrity/stats
    - POST /api/v1/integrity/anchor/{case_id}
    - GET /api/v1/integrity/anchors/{case_id}
    - POST /api/v1/integrity/verify/{evidence_id}
    - POST /api/v1/integrity/tamper-simulation/{evidence_id}
    """
    db = db_session
    user_id = str(uuid.uuid4())
    username = f"integrity_io_{uuid.uuid4().hex[:6]}"
    user = User(
        id=user_id,
        username=username,
        email=f"{username}@ciphertrace.internal",
        hashed_password=get_password_hash("ValidPass123!"),
        full_name="Forensic Integrity Officer",
        role="INVESTIGATOR",
        is_active=True,
    )
    db.add(user)

    case_id = str(uuid.uuid4())
    case = Case(
        id=case_id,
        case_number=f"CHAIN-CASE-{uuid.uuid4().hex[:4]}",
        title="Operation Cyber Ledger",
        description="Investigation into digital banking fraud.",
        status="ACTIVE_INVESTIGATION",
        assigned_lead_user_id=user_id,
    )
    db.add(case)
    db.flush()

    ev_id_1 = str(uuid.uuid4())
    ev1 = EvidenceItem(
        id=ev_id_1,
        case_id=case_id,
        file_name="Encrypted_VoIP_Dump.tar",
        source_type="DIGITAL_FORENSICS",
        file_path="/data/voip.tar",
        file_hash_sha256=calculate_string_sha256("VOIP_PAYLOAD_EVIDENCE_1"),
        file_size_bytes=1048576,
        mime_type="application/x-tar",
    )
    db.add(ev1)

    ev_id_2 = str(uuid.uuid4())
    ev2 = EvidenceItem(
        id=ev_id_2,
        case_id=case_id,
        file_name="Axis_Bank_Mule_Ledger.pdf",
        source_type="FINANCIAL",
        file_path="/data/axis.pdf",
        file_hash_sha256=calculate_string_sha256("FINANCIAL_PAYLOAD_EVIDENCE_2"),
        file_size_bytes=524288,
        mime_type="application/pdf",
    )
    db.add(ev2)
    db.commit()

    token = create_access_token(subject=user.username, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # Endpoint 1: GET /api/v1/integrity/blocks
    r_blocks = client.get("/api/v1/integrity/blocks", headers=headers)
    assert r_blocks.status_code == 200
    blocks_data = r_blocks.json()["data"]
    assert len(blocks_data) >= 1
    assert blocks_data[0]["block_index"] == 0 # Genesis block

    # Endpoint 2: GET /api/v1/integrity/stats
    r_stats = client.get("/api/v1/integrity/stats", headers=headers)
    assert r_stats.status_code == 200
    stats = r_stats.json()["data"]
    assert stats["is_chain_valid"] is True
    assert stats["total_blocks"] >= 1

    # Endpoint 3: POST /api/v1/integrity/anchor/{case_id}
    r_anchor = client.post(f"/api/v1/integrity/anchor/{case_id}", headers=headers)
    assert r_anchor.status_code == 200
    anchor_res = r_anchor.json()["data"]
    assert anchor_res["anchored_count"] == 2
    assert anchor_res["block"]["block_index"] >= 1
    assert len(anchor_res["anchors"]) == 2

    # Endpoint 4: GET /api/v1/integrity/anchors/{case_id}
    r_anchors = client.get(f"/api/v1/integrity/anchors/{case_id}", headers=headers)
    assert r_anchors.status_code == 200
    anchors_list = r_anchors.json()["data"]
    assert len(anchors_list) == 2

    # Endpoint 5: POST /api/v1/integrity/verify/{evidence_id}
    r_verify = client.post(f"/api/v1/integrity/verify/{ev_id_1}", headers=headers)
    assert r_verify.status_code == 200
    v_data = r_verify.json()["data"]
    assert v_data["evidence_id"] == ev_id_1
    assert v_data["hash_match"] is True
    assert v_data["is_anchored"] is True
    assert v_data["merkle_proof_valid"] is True
    assert v_data["overall_integrity_status"] == "VERIFIED_TAMPER_PROOF"
    assert v_data["statutory_bsa_cert"]["is_judicially_admissible"] is True

    # Endpoint 6: POST /api/v1/integrity/tamper-simulation/{evidence_id}
    r_tamper = client.post(f"/api/v1/integrity/tamper-simulation/{ev_id_2}", headers=headers)
    assert r_tamper.status_code == 200
    t_data = r_tamper.json()["data"]
    assert t_data["evidence_id"] == ev_id_2
    assert t_data["verification_result"]["overall_integrity_status"] == "TAMPER_DETECTED"
    assert t_data["verification_result"]["statutory_bsa_cert"]["is_judicially_admissible"] is False
