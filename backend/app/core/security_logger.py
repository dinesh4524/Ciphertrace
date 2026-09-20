"""
Structured Security Event Logger for CIPHERTRACE X.

Logs security-relevant events to a structured JSONL file:
- Authentication success & failure
- RBAC / ABAC authorization denials
- Rate limit violations
- Prompt injection & suspicious input detections
- Evidence access & AI tool queries

Path: ./storage/audit/security_events.jsonl
"""

import json
import logging
import os
import threading
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("ciphertrace.security")

AUDIT_DIR = Path("./storage/audit")
SECURITY_LOG_FILE = AUDIT_DIR / "security_events.jsonl"

_file_lock = threading.Lock()


class SecurityEventType(str, Enum):
    AUTH_SUCCESS = "AUTH_SUCCESS"
    AUTH_FAILURE = "AUTH_FAILURE"
    TOKEN_INVALID = "TOKEN_INVALID"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    RBAC_DENIED = "RBAC_DENIED"
    ABAC_DENIED = "ABAC_DENIED"
    RATE_LIMIT_HIT = "RATE_LIMIT_HIT"
    PROMPT_INJECTION_DETECTED = "PROMPT_INJECTION_DETECTED"
    SUSPICIOUS_INPUT = "SUSPICIOUS_INPUT"
    EVIDENCE_ACCESS = "EVIDENCE_ACCESS"
    AI_QUERY = "AI_QUERY"
    CASE_ACCESS_DENIED = "CASE_ACCESS_DENIED"


def log_security_event(
    event_type: str,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    endpoint: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    severity: str = "WARNING",
) -> Dict[str, Any]:
    """
    Appends a structured security event entry to the JSONL audit file and logs it.
    Thread-safe.
    """
    ev_type = event_type.value if hasattr(event_type, "value") else str(event_type)
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": ev_type,
        "severity": severity,
        "user_id": user_id or "anonymous",
        "ip_address": ip_address or "unknown",
        "endpoint": endpoint or "unknown",
        "details": details or {},
    }

    try:
        AUDIT_DIR.mkdir(parents=True, exist_ok=True)
        with _file_lock:
            with open(SECURITY_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(event) + "\n")
    except Exception as exc:
        logger.error(f"Failed to write security event to log file: {exc}")

    # Also log to standard Python logger
    log_msg = f"[SECURITY] [{event['event_type']}] user={event['user_id']} ip={event['ip_address']} endpoint={event['endpoint']}"
    if severity == "CRITICAL" or severity == "ERROR":
        logger.error(f"{log_msg} details={event['details']}")
    elif severity == "WARNING":
        logger.warning(f"{log_msg} details={event['details']}")
    else:
        logger.info(f"{log_msg} details={event['details']}")

    return event


def get_recent_security_events(limit: int = 50, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Reads recent security events from the JSONL log file.
    """
    if not SECURITY_LOG_FILE.exists():
        return []

    events = []
    try:
        with _file_lock:
            with open(SECURITY_LOG_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            ev = json.loads(line)
                            if event_type is None or ev.get("event_type") == event_type:
                                events.append(ev)
                        except json.JSONDecodeError:
                            continue
        return events[-limit:]
    except Exception as exc:
        logger.error(f"Failed reading security events: {exc}")
        return []
