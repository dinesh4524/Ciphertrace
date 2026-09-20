from enum import Enum
from typing import Dict, List, Set


class Role(str, Enum):
    INVESTIGATOR = "INVESTIGATOR"
    SENIOR_INVESTIGATOR = "SENIOR_INVESTIGATOR"
    LEGAL_ANALYST = "LEGAL_ANALYST"
    FORENSIC_ANALYST = "FORENSIC_ANALYST"
    INTELLIGENCE_ANALYST = "INTELLIGENCE_ANALYST"
    SYSTEM_ADMINISTRATOR = "SYSTEM_ADMINISTRATOR"


class Permission(str, Enum):
    # Case Permissions
    CASE_READ = "CASE_READ"
    CASE_CREATE = "CASE_CREATE"
    CASE_UPDATE = "CASE_UPDATE"
    CASE_DELETE = "CASE_DELETE"
    CASE_ASSIGN = "CASE_ASSIGN"
    CASE_CHANGE_STATUS = "CASE_CHANGE_STATUS"
    CASE_ADD_DIRECTIVE = "CASE_ADD_DIRECTIVE"
    CASE_VIEW_CONFIDENTIAL = "CASE_VIEW_CONFIDENTIAL"

    # Evidence Permissions
    EVIDENCE_READ = "EVIDENCE_READ"
    EVIDENCE_UPLOAD = "EVIDENCE_UPLOAD"
    EVIDENCE_VERIFY_INTEGRITY = "EVIDENCE_VERIFY_INTEGRITY"
    EVIDENCE_DELETE = "EVIDENCE_DELETE"
    EVIDENCE_CERTIFY_BSA = "EVIDENCE_CERTIFY_BSA"

    # Ingestion Permissions
    INGEST_CDR = "INGEST_CDR"
    INGEST_FINANCIAL = "INGEST_FINANCIAL"
    INGEST_FIR = "INGEST_FIR"
    INGEST_INTERROGATION = "INGEST_INTERROGATION"

    # Audit & User Management
    AUDIT_READ = "AUDIT_READ"
    USER_MANAGE = "USER_MANAGE"
    SYSTEM_CONFIG = "SYSTEM_CONFIG"

    # AI & Intelligence Tool Permissions
    AI_QUERY = "AI_QUERY"
    AI_RAG_EVIDENCE = "AI_RAG_EVIDENCE"
    AI_GRAPH_QUERY = "AI_GRAPH_QUERY"
    AI_REASONING = "AI_REASONING"


from app.core.abac import ClearanceLevel  # Re-export for convenience


# Granular Role-to-Permissions Mapping
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.INVESTIGATOR: {
        Permission.CASE_READ,
        Permission.CASE_CREATE,
        Permission.CASE_UPDATE,
        Permission.EVIDENCE_READ,
        Permission.EVIDENCE_UPLOAD,
        Permission.EVIDENCE_VERIFY_INTEGRITY,
        Permission.INGEST_CDR,
        Permission.INGEST_FINANCIAL,
        Permission.INGEST_FIR,
        Permission.INGEST_INTERROGATION,
        Permission.AUDIT_READ,
        Permission.AI_QUERY,
        Permission.AI_RAG_EVIDENCE,
        Permission.AI_GRAPH_QUERY,
        Permission.AI_REASONING,
    },
    Role.SENIOR_INVESTIGATOR: {
        Permission.CASE_READ,
        Permission.CASE_CREATE,
        Permission.CASE_UPDATE,
        Permission.CASE_DELETE,
        Permission.CASE_ASSIGN,
        Permission.CASE_CHANGE_STATUS,
        Permission.CASE_ADD_DIRECTIVE,
        Permission.CASE_VIEW_CONFIDENTIAL,
        Permission.EVIDENCE_READ,
        Permission.EVIDENCE_UPLOAD,
        Permission.EVIDENCE_VERIFY_INTEGRITY,
        Permission.EVIDENCE_DELETE,
        Permission.EVIDENCE_CERTIFY_BSA,
        Permission.INGEST_CDR,
        Permission.INGEST_FINANCIAL,
        Permission.INGEST_FIR,
        Permission.INGEST_INTERROGATION,
        Permission.AUDIT_READ,
        Permission.AI_QUERY,
        Permission.AI_RAG_EVIDENCE,
        Permission.AI_GRAPH_QUERY,
        Permission.AI_REASONING,
    },
    Role.LEGAL_ANALYST: {
        Permission.CASE_READ,
        Permission.CASE_VIEW_CONFIDENTIAL,
        Permission.EVIDENCE_READ,
        Permission.EVIDENCE_VERIFY_INTEGRITY,
        Permission.EVIDENCE_CERTIFY_BSA,
        Permission.AUDIT_READ,
        Permission.AI_QUERY,
        Permission.AI_RAG_EVIDENCE,
        Permission.AI_REASONING,
    },
    Role.FORENSIC_ANALYST: {
        Permission.CASE_READ,
        Permission.EVIDENCE_READ,
        Permission.EVIDENCE_UPLOAD,
        Permission.EVIDENCE_VERIFY_INTEGRITY,
        Permission.EVIDENCE_CERTIFY_BSA,
        Permission.INGEST_CDR,
        Permission.INGEST_FINANCIAL,
        Permission.INGEST_INTERROGATION,
        Permission.AUDIT_READ,
        Permission.AI_QUERY,
        Permission.AI_RAG_EVIDENCE,
        Permission.AI_GRAPH_QUERY,
    },
    Role.INTELLIGENCE_ANALYST: {
        Permission.CASE_READ,
        Permission.CASE_UPDATE,
        Permission.EVIDENCE_READ,
        Permission.EVIDENCE_UPLOAD,
        Permission.INGEST_CDR,
        Permission.INGEST_FINANCIAL,
        Permission.INGEST_FIR,
        Permission.INGEST_INTERROGATION,
        Permission.AUDIT_READ,
        Permission.AI_QUERY,
        Permission.AI_RAG_EVIDENCE,
        Permission.AI_GRAPH_QUERY,
        Permission.AI_REASONING,
    },
    Role.SYSTEM_ADMINISTRATOR: {
        # System Admin has all administrative and operational permissions
        *list(Permission),
    },
}


def role_has_permission(role: str, permission: Permission) -> bool:
    """Checks whether a given role string possesses the specified permission."""
    try:
        role_enum = Role(role.upper())
        return permission in ROLE_PERMISSIONS.get(role_enum, set())
    except ValueError:
        return False
