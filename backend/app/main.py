import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.logging import logger

# Initialize database schemas
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
# CIPHERTRACE X — Unified AI-Powered Criminal Intelligence & Investigation Platform
### Phase 20: Final Integration, Unified 19-Step Workflow & SIH 2026 Demonstration

Features:
- **Unified 19-Stage Investigation Lifecycle**: From Case Creation, Multi-Modal Ingestion, NLP NER, Multi-Strategy Entity Resolution, Criminal Knowledge Graph, Graph Analytics (Louvain, Bridges, ML Hidden Links), Anomaly Bursts & Mule Detection, GraphRAG Evidence Fusion, Multi-Perspective AI Reasoning, Counterfactual Ablation, Priority Ranking, Next Best Actions, Legal BSA/BNS Intelligence, Human-in-the-Loop Signoff, Blockchain Merkle Anchoring, to Court-Admissible Investigation Dossiers.
- **Section 63 BSA / Section 65B IEA Electronic Admissibility**: Unbroken SHA-256 chain of custody and cryptographic verification certificates.
- **Zero-Trust Security & Governance**: Enterprise ABAC, Rate-Limiting, InputGuard Sanitization, and Local MLflow MLOps Tracking.
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure Trusted Hosts & CORS
from starlette.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "testserver", "*.ciphertrace.internal"] if not settings.DEBUG else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """
    Zero-Trust Security Headers Middleware.
    Enforces defense-in-depth HTTP headers on every response.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path in ("/docs", "/redoc", f"{settings.API_V1_STR}/openapi.json"):
        response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;"
    else:
        response.headers["Content-Security-Policy"] = "default-src 'self'"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.middleware("http")
async def add_process_time_and_audit(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time, 4))
    response.headers["X-Compliance-Framework"] = "BSA-2023-SEC63/IEA-SEC65B"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An internal server error occurred in the investigative processing engine.",
            "error_detail": str(exc) if settings.DEBUG else "Internal Server Error"
        }
    )


# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "phase": "PHASE 20: Final Integration & SIH 2026 Demonstration",
        "documentation": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "OPERATIONAL_READY"
    }
