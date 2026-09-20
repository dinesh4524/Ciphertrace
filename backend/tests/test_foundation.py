import os
from datetime import timedelta
from app.core.config import settings
from app.core.security import create_access_token, decode_token, get_password_hash, verify_password
from app.core.neo4j import check_neo4j_health, get_neo4j_driver
from app.core.redis import check_redis_health, get_redis_client
from app.api.deps import get_current_user
from app.models.user import User


def test_system_health_endpoint(client):
    """Verifies that the /health endpoint checks DB, Neo4j, Redis, and Storage."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "services" in data
    assert "relational_database" in data["services"]
    assert "graph_database" in data["services"]
    assert "cache_and_queue" in data["services"]
    assert "evidence_filesystem_storage" in data["services"]
    assert data["services"]["evidence_filesystem_storage"]["status"] == "HEALTHY"


def test_password_hashing_and_jwt_security():
    """Verifies authentication-ready cryptographic primitives."""
    raw_pass = "InvestigatorSecret2026!#"
    hashed = get_password_hash(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

    # JWT generation & decoding
    token = create_access_token(subject="IO-7492-SHARMA", role="LEAD_INVESTIGATOR", expires_delta=timedelta(hours=2))
    assert token is not None
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "IO-7492-SHARMA"
    assert payload["role"] == "LEAD_INVESTIGATOR"


def test_auth_dependency(db_session):
    """Verifies the default and bearer auth dependency."""
    user = get_current_user(credentials=None, db=db_session)
    assert isinstance(user, User)
    assert user.role == "INVESTIGATOR"


def test_storage_filesystem_initialization():
    """Verifies that evidence and audit storage directories exist and are writable."""
    assert os.path.exists(settings.UPLOAD_DIR)
    assert os.path.exists(settings.AUDIT_LOG_DIR)
    test_file = os.path.join(settings.UPLOAD_DIR, ".write_test")
    with open(test_file, "w") as f:
        f.write("ok")
    assert os.path.exists(test_file)
    os.remove(test_file)
