"""
Attribute-Based Access Control (ABAC) Engine for CIPHERTRACE X.

Extends the existing RBAC system with dynamic, context-aware policies:
- User clearance level vs resource sensitivity
- Operational time windows
- Jurisdiction constraints

Does NOT replace RBAC — runs as an additional gate after RBAC passes.
"""

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone


class ClearanceLevel(IntEnum):
    """
    Clearance hierarchy for ABAC policies.
    Higher numeric value = higher clearance.
    """
    UNCLASSIFIED = 0
    RESTRICTED = 1
    CONFIDENTIAL = 2
    SECRET = 3


# Default clearance for each role
ROLE_CLEARANCE_MAP: Dict[str, ClearanceLevel] = {
    "INVESTIGATOR": ClearanceLevel.RESTRICTED,
    "SENIOR_INVESTIGATOR": ClearanceLevel.SECRET,
    "LEGAL_ANALYST": ClearanceLevel.CONFIDENTIAL,
    "FORENSIC_ANALYST": ClearanceLevel.CONFIDENTIAL,
    "INTELLIGENCE_ANALYST": ClearanceLevel.CONFIDENTIAL,
    "SYSTEM_ADMINISTRATOR": ClearanceLevel.SECRET,
}


@dataclass
class ABACContext:
    """Contextual attributes evaluated during ABAC policy checks."""
    user_id: str = ""
    user_role: str = ""
    user_clearance: ClearanceLevel = ClearanceLevel.UNCLASSIFIED
    resource_sensitivity: ClearanceLevel = ClearanceLevel.UNCLASSIFIED
    resource_case_id: Optional[str] = None
    action: str = ""
    request_ip: str = "127.0.0.1"
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ABACDecision:
    """Result of ABAC policy evaluation."""
    allowed: bool
    reason: str
    policy_name: str = ""
    missing_attributes: List[str] = field(default_factory=list)


def get_user_clearance(role: str) -> ClearanceLevel:
    """Returns the clearance level for a given role string."""
    return ROLE_CLEARANCE_MAP.get(role.upper(), ClearanceLevel.UNCLASSIFIED)


def evaluate_abac(context: ABACContext) -> ABACDecision:
    """
    Evaluates all ABAC policies against the given context.
    Returns the first failing policy, or an ALLOW decision.
    """
    # Policy 1: Clearance Level Check
    if context.resource_sensitivity > context.user_clearance:
        return ABACDecision(
            allowed=False,
            reason=f"Clearance level insufficient. Required: {context.resource_sensitivity.name}, "
                   f"User has: {context.user_clearance.name}.",
            policy_name="CLEARANCE_LEVEL",
            missing_attributes=["clearance"],
        )

    # Policy 2: Operational Hours Check (configurable; for SECRET resources, restrict off-hours access)
    if context.resource_sensitivity >= ClearanceLevel.SECRET:
        hour = context.timestamp.hour
        if hour < 6 or hour >= 23:
            # Only system administrators bypass off-hours restrictions
            if context.user_role.upper() != "SYSTEM_ADMINISTRATOR":
                return ABACDecision(
                    allowed=False,
                    reason=f"Access to SECRET resources restricted outside operational hours (06:00-23:00 UTC). "
                           f"Current time: {context.timestamp.strftime('%H:%M')} UTC.",
                    policy_name="OPERATIONAL_HOURS",
                )

    # All policies passed
    return ABACDecision(
        allowed=True,
        reason="All ABAC policies satisfied.",
        policy_name="PERMIT",
    )


def evaluate_case_abac(
    user_role: str,
    user_id: str,
    case_sensitivity: str,
    action: str = "READ",
) -> ABACDecision:
    """
    Convenience function: evaluates ABAC for case-level operations.
    case_sensitivity is a string like "UNCLASSIFIED", "RESTRICTED", "CONFIDENTIAL", "SECRET".
    """
    user_clearance = get_user_clearance(user_role)

    try:
        resource_sensitivity = ClearanceLevel[case_sensitivity.upper()]
    except (KeyError, AttributeError):
        resource_sensitivity = ClearanceLevel.UNCLASSIFIED

    context = ABACContext(
        user_id=user_id,
        user_role=user_role,
        user_clearance=user_clearance,
        resource_sensitivity=resource_sensitivity,
        action=action,
    )
    return evaluate_abac(context)
