import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "CIPHERTRACE X — Criminal Network Intelligence Platform"
    VERSION: str = "1.0.0-phase18"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./ciphertrace.db",
        description="Database connection string (e.g. postgresql://user:pass@localhost:5432/ciphertrace or sqlite:///./ciphertrace.db)"
    )

    # Graph Database (Neo4j)
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "ciphertrace_dev"

    # Cache & Queue (Redis)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage paths
    UPLOAD_DIR: str = "./storage/evidence"
    AUDIT_LOG_DIR: str = "./storage/audit"

    # -------------------------------------------------------------------
    # Security & Authentication
    # -------------------------------------------------------------------
    DEFAULT_HASH_ALGO: str = "SHA-256"

    # WARNING: Override this via environment variable in production.
    # Never deploy with the default development key.
    SECRET_KEY: str = Field(
        default="ciphertrace-development-secret-key-change-in-production-32bytes",
        description="HMAC signing key for JWT tokens. MUST be overridden in production via SECRET_KEY env var."
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours (reduced from 24h)

    # When True, unauthenticated requests are rejected with 401.
    # When False (development only), a default fallback user is returned.
    REQUIRE_AUTH: bool = True

    # AES-256 encryption key for sensitive field encryption (32 bytes hex-encoded).
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    FIELD_ENCRYPTION_KEY: str = Field(
        default="",
        description="Hex-encoded 32-byte AES key for PII field encryption. Empty disables field encryption."
    )

    # -------------------------------------------------------------------
    # Rate Limiting (requests per minute per user/IP)
    # -------------------------------------------------------------------
    RATE_LIMIT_GENERAL: int = 60
    RATE_LIMIT_AUTH: int = 10       # Brute-force protection
    RATE_LIMIT_AI: int = 10         # AI endpoints are expensive
    RATE_LIMIT_INGEST: int = 30

    # -------------------------------------------------------------------
    # Upload Limits
    # -------------------------------------------------------------------
    MAX_UPLOAD_SIZE_MB: int = 50

    # -------------------------------------------------------------------
    # CORS — hardened: no wildcard in production
    # -------------------------------------------------------------------
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]

    # Trusted hostnames for Host header validation
    TRUSTED_HOSTS: List[str] = ["localhost", "127.0.0.1"]

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"


settings = Settings()

# Ensure required storage directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.AUDIT_LOG_DIR, exist_ok=True)

