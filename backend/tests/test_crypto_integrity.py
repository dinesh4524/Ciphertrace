import os
import tempfile
import pytest
from app.utils.crypto import (
    calculate_bytes_sha256,
    calculate_file_sha256,
    calculate_string_sha256,
    verify_evidence_integrity,
)


def test_calculate_string_sha256():
    sample_text = "CIPHERTRACE_X_EVIDENCE_PAYLOAD"
    hash_val = calculate_string_sha256(sample_text)
    assert len(hash_val) == 64
    # Recomputing must be deterministic
    assert calculate_string_sha256(sample_text) == hash_val


def test_file_sha256_and_tamper_detection():
    # Create temp file
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(b"Initial pristine forensic disk dump image 1010101")
        tmp_path = tmp.name

    try:
        initial_hash = calculate_file_sha256(tmp_path)
        assert len(initial_hash) == 64
        assert verify_evidence_integrity(tmp_path, initial_hash) is True

        # Simulate tampering by modifying 1 byte
        with open(tmp_path, "ab") as f:
            f.write(b"TAMPERED_BYTE")

        tampered_hash = calculate_file_sha256(tmp_path)
        assert tampered_hash != initial_hash
        assert verify_evidence_integrity(tmp_path, initial_hash) is False
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
