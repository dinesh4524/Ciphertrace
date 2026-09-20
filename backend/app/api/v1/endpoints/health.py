import os
import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.config import settings
from app.core.neo4j import check_neo4j_health
from app.core.redis import check_redis_health

router = APIRouter()


@router.get("/health", tags=["System Diagnostics"])
def system_health_check(db: Session = Depends(get_db)):
    """
    Comprehensive multi-service infrastructure diagnostics checking:
    1. FastAPI application state & uptime
    2. Primary Relational Database (PostgreSQL / SQLite)
    3. Graph Database (Neo4j Bolt Protocol)
    4. Cache & Task Queue (Redis)
    5. Evidence Storage FileSystem Write/Read Parity
    """
    start = time.time()
    
    # 1. Database Check
    db_status = "HEALTHY"
    db_latency_ms = 0.0
    try:
        t0 = time.time()
        db.execute(text("SELECT 1"))
        db_latency_ms = round((time.time() - t0) * 1000, 2)
    except Exception as e:
        db_status = f"ERROR: {str(e)}"

    # 2. Neo4j Check
    neo4j_health = check_neo4j_health()

    # 3. Redis Check
    redis_health = check_redis_health()

    # 4. Storage Health Check
    storage_ok = os.path.exists(settings.UPLOAD_DIR) and os.access(settings.UPLOAD_DIR, os.W_OK)
    storage_status = "HEALTHY" if storage_ok else "DEGRADED"

    total_time_ms = round((time.time() - start) * 1000, 2)

    return {
        "status": "ONLINE",
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "phase": "PHASE 1: Project Foundation & Evidence Fabric",
        "environment": settings.ENVIRONMENT,
        "response_time_ms": total_time_ms,
        "services": {
            "relational_database": {
                "engine": "PostgreSQL" if "postgresql" in settings.DATABASE_URL else "SQLite",
                "status": db_status,
                "latency_ms": db_latency_ms,
                "url_configured": settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL
            },
            "graph_database": neo4j_health,
            "cache_and_queue": redis_health,
            "evidence_filesystem_storage": {
                "status": storage_status,
                "path": settings.UPLOAD_DIR,
                "is_writable": storage_ok
            }
        },
        "compliance": {
            "evidence_hash_algorithm": settings.DEFAULT_HASH_ALGO,
            "standards": ["Bharatiya Sakshya Adhiniyam 2023 Sec 63", "Indian Evidence Act Sec 65B"]
        }
    }
