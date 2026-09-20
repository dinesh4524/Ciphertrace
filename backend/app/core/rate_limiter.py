"""
In-Process Sliding-Window Rate Limiter for CIPHERTRACE X.

Provides per-user rate limiting with configurable categories:
- auth: 10 req/min (brute-force protection)
- ai: 10 req/min (expensive AI endpoints)
- ingest: 30 req/min
- general: 60 req/min

Falls back gracefully — no Redis dependency required.
Uses a thread-safe in-memory sliding window.
"""

import time
import threading
from collections import defaultdict
from typing import Optional

from fastapi import Depends, HTTPException, Request, status

from app.core.config import settings


_lock = threading.Lock()
# Structure: { "category:identifier" : [timestamp1, timestamp2, ...] }
_request_log: dict = defaultdict(list)


CATEGORY_LIMITS = {
    "general": lambda: settings.RATE_LIMIT_GENERAL,
    "auth": lambda: settings.RATE_LIMIT_AUTH,
    "ai": lambda: settings.RATE_LIMIT_AI,
    "ingest": lambda: settings.RATE_LIMIT_INGEST,
}

WINDOW_SECONDS = 60


def _get_identifier(request: Request) -> str:
    """
    Extracts a rate-limit key from the request.
    Uses authenticated user ID from state (set by auth middleware), otherwise client IP.
    """
    # Try to get user from request state (set by auth dependency)
    user = getattr(request.state, "current_user", None)
    if user and hasattr(user, "id"):
        return f"user:{user.id}"
    # Fallback to client IP
    client = request.client
    return f"ip:{client.host}" if client else "ip:unknown"


def _check_rate_limit(identifier: str, category: str) -> bool:
    """
    Returns True if the request is within limits, False if rate-limited.
    """
    limit_fn = CATEGORY_LIMITS.get(category, CATEGORY_LIMITS["general"])
    max_requests = limit_fn()
    now = time.time()
    key = f"{category}:{identifier}"

    with _lock:
        # Prune expired entries
        _request_log[key] = [
            ts for ts in _request_log[key]
            if ts > now - WINDOW_SECONDS
        ]
        if len(_request_log[key]) >= max_requests:
            return False
        _request_log[key].append(now)
        return True


def get_remaining(identifier: str, category: str) -> int:
    """Returns remaining requests in the current window."""
    limit_fn = CATEGORY_LIMITS.get(category, CATEGORY_LIMITS["general"])
    max_requests = limit_fn()
    now = time.time()
    key = f"{category}:{identifier}"

    with _lock:
        active = [ts for ts in _request_log.get(key, []) if ts > now - WINDOW_SECONDS]
        return max(0, max_requests - len(active))


def rate_limit(category: str = "general"):
    """
    FastAPI dependency factory for rate limiting.

    Usage:
        @router.post("/login", dependencies=[Depends(rate_limit("auth"))])
        def login(...): ...
    """
    def _rate_limit_dependency(request: Request):
        identifier = _get_identifier(request)
        if not _check_rate_limit(identifier, category):
            limit_fn = CATEGORY_LIMITS.get(category, CATEGORY_LIMITS["general"])
            from app.core.security_logger import log_security_event, SecurityEventType
            log_security_event(
                event_type=SecurityEventType.RATE_LIMIT_HIT,
                user_id=identifier,
                ip_address=request.client.host if request.client else "unknown",
                endpoint=request.url.path,
                details={"category": category, "max_requests": limit_fn(), "window_seconds": WINDOW_SECONDS},
                severity="WARNING",
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": f"Rate limit exceeded for category '{category}'. "
                               f"Maximum {limit_fn()} requests per {WINDOW_SECONDS}s.",
                    "category": category,
                    "retry_after_seconds": WINDOW_SECONDS,
                },
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )
    return _rate_limit_dependency


def reset_rate_limits():
    """Clears all rate limit state. Used in testing."""
    with _lock:
        _request_log.clear()
