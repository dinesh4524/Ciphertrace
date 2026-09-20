import pytest
from app.core.permissions import Role, Permission, ROLE_PERMISSIONS, role_has_permission


def test_seed_and_login_all_six_roles(client):
    """Verifies that all 6 organizational personas can be seeded and authenticated."""
    # 1. Seed users
    seed_res = client.post("/api/v1/auth/seed")
    assert seed_res.status_code == 200
    assert seed_res.json()["success"] is True

    personas = [
        ("investigator_sharma", Role.INVESTIGATOR),
        ("supervisor_verma", Role.SENIOR_INVESTIGATOR),
        ("legal_advocate_iyer", Role.LEGAL_ANALYST),
        ("forensic_dr_deshmukh", Role.FORENSIC_ANALYST),
        ("intel_patel", Role.INTELLIGENCE_ANALYST),
        ("admin_ciphertrace", Role.SYSTEM_ADMINISTRATOR),
    ]

    for username, expected_role in personas:
        login_payload = {"username": username, "password": "Password123!"}
        login_res = client.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200, f"Login failed for {username}"
        data = login_res.json()["data"]
        assert data["access_token"] is not None
        assert data["user"]["role"] == expected_role.value
        assert len(data["user"]["permissions"]) > 0


def test_rbac_permissions_matrix():
    """Validates the mathematical integrity of the RBAC role-permission matrix."""
    # Investigator
    assert role_has_permission(Role.INVESTIGATOR.value, Permission.INGEST_CDR) is True
    assert role_has_permission(Role.INVESTIGATOR.value, Permission.CASE_CREATE) is True
    assert role_has_permission(Role.INVESTIGATOR.value, Permission.CASE_ASSIGN) is False # Only Supervisor / Admin
    assert role_has_permission(Role.INVESTIGATOR.value, Permission.USER_MANAGE) is False

    # Senior Investigator / Supervisor
    assert role_has_permission(Role.SENIOR_INVESTIGATOR.value, Permission.CASE_ASSIGN) is True
    assert role_has_permission(Role.SENIOR_INVESTIGATOR.value, Permission.CASE_CHANGE_STATUS) is True
    assert role_has_permission(Role.SENIOR_INVESTIGATOR.value, Permission.CASE_ADD_DIRECTIVE) is True

    # Legal Analyst
    assert role_has_permission(Role.LEGAL_ANALYST.value, Permission.EVIDENCE_CERTIFY_BSA) is True
    assert role_has_permission(Role.LEGAL_ANALYST.value, Permission.CASE_CREATE) is False

    # Forensic Analyst
    assert role_has_permission(Role.FORENSIC_ANALYST.value, Permission.EVIDENCE_UPLOAD) is True
    assert role_has_permission(Role.FORENSIC_ANALYST.value, Permission.INGEST_CDR) is True
    assert role_has_permission(Role.FORENSIC_ANALYST.value, Permission.CASE_ASSIGN) is False

    # System Administrator
    for perm in Permission:
        assert role_has_permission(Role.SYSTEM_ADMINISTRATOR.value, perm) is True


def test_login_invalid_credentials(client):
    """Verifies rejection of invalid passwords with 401."""
    res = client.post("/api/v1/auth/login", json={"username": "investigator_sharma", "password": "WrongPassword!"})
    assert res.status_code == 401
