import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
from jose import jwt, JWTError
import bcrypt
from app.core.config import settings

ALGORITHM = "HS256"


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    role: str = "INVESTIGATING_OFFICER",
    user_id: Optional[str] = None,
) -> str:
    """
    Encodes a JWT access token for an authenticated officer/user.
    Includes jti for revocation support and typ for token type differentiation.
    """
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": now,
        "jti": secrets.token_hex(16),   # Unique JWT ID for revocation
        "typ": "access",                # Token type (future: "refresh")
        "role": role,
        "iss": "ciphertrace-auth-authority",
    }
    if user_id:
        to_encode["user_id"] = user_id

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generates a secure bcrypt hash for a plaintext password."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token. Returns None on any error."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        # Reject tokens missing required claims
        if not payload.get("sub") or not payload.get("role"):
            return None
        return payload
    except JWTError:
        return None


def generate_secure_token(n_bytes: int = 32) -> str:
    """Generates a cryptographically secure random hex token."""
    return secrets.token_hex(n_bytes)

