"""
Input Validation & Prompt Injection Protection for CIPHERTRACE X.

Provides:
- Prompt injection pattern detection and sanitization
- Path traversal prevention for filenames
- Query length and content validation
- UUID format validation

Every sanitization action is returned in an InputGuardResult for audit trails.
"""

import re
import uuid
from dataclasses import dataclass, field
from typing import List, Optional


# ────────────────────────────────────────────────────────────────
# Prompt injection patterns (case-insensitive)
# ────────────────────────────────────────────────────────────────
PROMPT_INJECTION_PATTERNS = [
    # Direct instruction override
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"disregard\s+(all\s+)?previous",
    r"forget\s+(all\s+)?previous",
    r"ignore\s+(the\s+)?above",
    r"override\s+(system|previous|all)",

    # Role manipulation
    r"you\s+are\s+now\s+",
    r"act\s+as\s+(a\s+)?",
    r"pretend\s+(to\s+be|you\s+are)",
    r"your\s+new\s+(role|instructions|purpose)",

    # System prompt extraction
    r"(show|print|reveal|display|output)\s+(the\s+)?(system\s+)?(prompt|instructions)",
    r"what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions)",
    r"repeat\s+(your|the)\s+(system\s+)?(prompt|instructions)",

    # Delimiter injection (ChatML / OpenAI internal format)
    r"<\|im_start\|>",
    r"<\|im_end\|>",
    r"<\|system\|>",
    r"<\|assistant\|>",
    r"<\|user\|>",
    r"\[INST\]",
    r"\[/INST\]",
    r"<<SYS>>",

    # Code execution attempts
    r"(exec|eval|import|__import__)\s*\(",
    r"os\.(system|popen|exec)",
    r"subprocess\.",

    # SQL injection probes (basic)
    r";\s*(DROP|DELETE|UPDATE|INSERT|ALTER)\s+",
    r"'\s*(OR|AND)\s+\d+\s*=\s*\d+",
    r"UNION\s+SELECT",
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in PROMPT_INJECTION_PATTERNS]

MAX_QUERY_LENGTH = 2000
MAX_FILENAME_LENGTH = 255


@dataclass
class InputGuardResult:
    """Result of input validation and sanitization."""
    clean_text: str
    was_sanitized: bool = False
    violations: List[str] = field(default_factory=list)
    is_rejected: bool = False
    rejection_reason: Optional[str] = None


def sanitize_query(text: str) -> InputGuardResult:
    """
    Validates and sanitizes a user query for AI endpoints.

    Returns InputGuardResult with cleaned text and any violations detected.
    Queries exceeding MAX_QUERY_LENGTH are rejected outright.
    Prompt injection patterns are stripped and logged.
    """
    violations = []

    if not text or not text.strip():
        return InputGuardResult(
            clean_text="",
            is_rejected=True,
            rejection_reason="Empty query submitted.",
        )

    # Strip null bytes and control characters (except newlines/tabs)
    clean = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Collapse excessive whitespace
    clean = re.sub(r"\s{5,}", "    ", clean)

    if len(clean) > MAX_QUERY_LENGTH:
        return InputGuardResult(
            clean_text=clean[:MAX_QUERY_LENGTH],
            is_rejected=True,
            rejection_reason=f"Query exceeds maximum length of {MAX_QUERY_LENGTH} characters ({len(clean)} received).",
            violations=["QUERY_TOO_LONG"],
        )

    # Scan for prompt injection patterns
    was_sanitized = False
    for i, pattern in enumerate(COMPILED_PATTERNS):
        match = pattern.search(clean)
        if match:
            violations.append(f"PROMPT_INJECTION_PATTERN_{i}: '{match.group()[:50]}'")
            clean = pattern.sub("[REDACTED]", clean)
            was_sanitized = True

    return InputGuardResult(
        clean_text=clean.strip(),
        was_sanitized=was_sanitized,
        violations=violations,
    )


def validate_filename(filename: str) -> InputGuardResult:
    """
    Validates an evidence filename for path traversal and injection.
    Rejects filenames containing: ../, ..\\, absolute paths, null bytes.
    """
    violations = []

    if not filename:
        return InputGuardResult(
            clean_text="",
            is_rejected=True,
            rejection_reason="Empty filename.",
        )

    # Strip null bytes
    clean = filename.replace("\x00", "")

    # Path traversal detection
    traversal_patterns = [
        r"\.\./",        # Unix path traversal
        r"\.\.\\",       # Windows path traversal
        r"^[A-Za-z]:",   # Windows absolute path (C:, D:, etc.)
        r"^/",           # Unix absolute path
        r"^\\\\",        # UNC path
    ]
    for pattern in traversal_patterns:
        if re.search(pattern, clean):
            violations.append(f"PATH_TRAVERSAL: pattern '{pattern}' detected in '{clean[:50]}'")

    if len(clean) > MAX_FILENAME_LENGTH:
        violations.append(f"FILENAME_TOO_LONG: {len(clean)} chars (max {MAX_FILENAME_LENGTH})")

    if violations:
        return InputGuardResult(
            clean_text=clean,
            is_rejected=True,
            rejection_reason=f"Filename validation failed: {'; '.join(violations)}",
            violations=violations,
        )

    return InputGuardResult(clean_text=clean)


# Alias for evidence upload validation
validate_evidence_filename = validate_filename


def validate_uuid(value: str) -> bool:
    """Validates that a string is a valid UUID4 format."""
    try:
        uuid.UUID(str(value), version=4)
        return True
    except (ValueError, AttributeError):
        return False
