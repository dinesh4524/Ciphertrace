import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("ciphertrace.redis")

try:
    import redis
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False
    redis = None

_redis_client: Optional[any] = None


def get_redis_client():
    """
    Returns a singleton Redis client instance configured from settings.
    """
    global _redis_client
    if not HAS_REDIS:
        return None

    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=3.0,
                socket_connect_timeout=3.0
            )
            logger.info(f"Initialized Redis client connected to {settings.REDIS_URL}")
        except Exception as e:
            logger.warning(f"Could not connect to Redis at {settings.REDIS_URL}: {str(e)}")
            _redis_client = None

    return _redis_client


def check_redis_health() -> dict:
    """
    Verifies Redis server ping and connection latency.
    """
    client = get_redis_client()
    if not client:
        return {
            "status": "UNAVAILABLE",
            "message": "Redis client uninitialized or host unreachable.",
            "url": settings.REDIS_URL
        }
    try:
        if client.ping():
            return {
                "status": "HEALTHY",
                "url": settings.REDIS_URL,
                "message": "In-Memory Cache & Queue connected."
            }
    except Exception as e:
        return {
            "status": "ERROR",
            "url": settings.REDIS_URL,
            "error": str(e)
        }

    return {"status": "UNKNOWN", "url": settings.REDIS_URL}
