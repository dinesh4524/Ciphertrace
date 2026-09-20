import hashlib
import os
from typing import BinaryIO, Optional, Union


def calculate_bytes_sha256(data: bytes) -> str:
    """Computes SHA-256 hex digest for raw bytes."""
    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.hexdigest()


def calculate_string_sha256(text: str) -> str:
    """Computes SHA-256 hex digest for a string."""
    return calculate_bytes_sha256(text.encode("utf-8"))


def calculate_file_sha256(file_path: str, chunk_size: int = 65536) -> str:
    """
    Computes SHA-256 hex digest for a local file by streaming chunks.
    Ensures memory efficiency even with gigabyte-scale evidence dumps.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Evidence file not found: {file_path}")
    
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            hasher.update(chunk)
    return hasher.hexdigest()


def calculate_stream_sha256(file_obj: BinaryIO, chunk_size: int = 65536) -> str:
    """Computes SHA-256 for a file-like stream without consuming stream permanently."""
    current_pos = file_obj.tell() if hasattr(file_obj, "tell") else None
    hasher = hashlib.sha256()
    while chunk := file_obj.read(chunk_size):
        hasher.update(chunk)
    if current_pos is not None and hasattr(file_obj, "seek"):
        file_obj.seek(current_pos)
    return hasher.hexdigest()


def verify_evidence_integrity(file_path: str, recorded_hash: str) -> bool:
    """
    Verifies that the current disk file matches the registered SHA-256 hash.
    Crucial for Section 65B Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam 2023.
    """
    current_hash = calculate_file_sha256(file_path)
    return current_hash.lower() == recorded_hash.lower()


# ────────────────────────────────────────────────────────────────
# AES-256-GCM Field-Level Encryption & Key Generation
# ────────────────────────────────────────────────────────────────
import base64
import secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings


def generate_secure_token(n_bytes: int = 32) -> str:
    """Generates a cryptographically secure random hexadecimal token."""
    return secrets.token_hex(n_bytes)


def generate_aes_key() -> str:
    """Generates a random 256-bit (32-byte) AES key, hex-encoded."""
    return AESGCM.generate_key(bit_length=256).hex()


def _resolve_key_bytes(key: Optional[Union[str, bytes]] = None) -> bytes:
    if key is None:
        key_str = getattr(settings, "FIELD_ENCRYPTION_KEY", "") or ""
        if not key_str:
            # Fallback deterministic key derived from SECRET_KEY if not explicitly set
            return hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        key = key_str

    if isinstance(key, str):
        try:
            k_bytes = bytes.fromhex(key)
            if len(k_bytes) in (16, 24, 32):
                return k_bytes
        except ValueError:
            pass
        return hashlib.sha256(key.encode("utf-8")).digest()
    return key


def encrypt_field(plaintext: str, key: Optional[Union[str, bytes]] = None) -> str:
    """
    Encrypts sensitive PII or evidentiary text using AES-256-GCM.
    Returns URL-safe base64 string formatted as: [12-byte nonce][ciphertext + tag].
    """
    if not plaintext:
        return ""
    key_bytes = _resolve_key_bytes(key)
    aesgcm = AESGCM(key_bytes)
    nonce = os.urandom(12)  # Standard 96-bit nonce
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_field(ciphertext_b64: str, key: Optional[Union[str, bytes]] = None) -> str:
    """
    Decrypts an AES-256-GCM payload produced by encrypt_field.
    """
    if not ciphertext_b64:
        return ""
    key_bytes = _resolve_key_bytes(key)
    raw = base64.urlsafe_b64decode(ciphertext_b64.encode("utf-8"))
    if len(raw) < 12:
        raise ValueError("Ciphertext too short to contain valid nonce.")
    nonce = raw[:12]
    ct = raw[12:]
    aesgcm = AESGCM(key_bytes)
    plaintext_bytes = aesgcm.decrypt(nonce, ct, None)
    return plaintext_bytes.decode("utf-8")

