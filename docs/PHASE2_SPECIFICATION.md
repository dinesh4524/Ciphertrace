# CIPHERTRACE X — Phase 2 Specification & System Guide
## Authentication, RBAC & Investigator Case Management Ledger

### 1. Phase Objective
Establish the multi-user case-management foundation for **CIPHERTRACE X**, implementing role-based access control (RBAC) across 6 organizational personas, case priority scoring, investigation stage workflows, investigator team assignments, case-level access restrictions, and the chronological Investigator Case Management Ledger.

---

### 2. Organizational Roles & Permissions Matrix

| Role | Description | Key Permissions |
|---|---|---|
| **`INVESTIGATOR`** | Field Investigating Officer (IO) | `CASE_READ`, `CASE_CREATE`, `CASE_UPDATE`, `EVIDENCE_READ`, `EVIDENCE_UPLOAD`, `EVIDENCE_VERIFY_INTEGRITY`, `INGEST_*`, `AUDIT_READ` |
| **`SENIOR_INVESTIGATOR`** | Supervisor / SP / DSP / ACP | All Investigator permissions + `CASE_ASSIGN`, `CASE_CHANGE_STATUS`, `CASE_ADD_DIRECTIVE`, `CASE_DELETE`, `CASE_VIEW_CONFIDENTIAL`, `EVIDENCE_DELETE` |
| **`LEGAL_ANALYST`** | Public Prosecutor / Legal Counsel | `CASE_READ`, `CASE_VIEW_CONFIDENTIAL`, `EVIDENCE_READ`, `EVIDENCE_VERIFY_INTEGRITY`, `EVIDENCE_CERTIFY_BSA`, `AUDIT_READ` |
| **`FORENSIC_ANALYST`** | Digital Forensics / CFSL Specialist | `CASE_READ`, `EVIDENCE_READ`, `EVIDENCE_UPLOAD`, `EVIDENCE_VERIFY_INTEGRITY`, `EVIDENCE_CERTIFY_BSA`, `INGEST_CDR`, `INGEST_FINANCIAL`, `INGEST_INTERROGATION`, `AUDIT_READ` |
| **`INTELLIGENCE_ANALYST`** | Pattern & Crime Network Analyst | `CASE_READ`, `CASE_UPDATE`, `EVIDENCE_READ`, `EVIDENCE_UPLOAD`, `INGEST_*`, `AUDIT_READ` |
| **`SYSTEM_ADMINISTRATOR`** | Platform & Security Administrator | All permissions across the entire platform + `USER_MANAGE`, `SYSTEM_CONFIG` |

---

### 3. Case Lifecycle & Stage Progression

```
  [1. PRELIMINARY_ENQUIRY]
             |
             v
   [2. FIR_REGISTERED]
             |
             v
 [3. EVIDENCE_COLLECTION]  <--->  (Multi-Modal Evidence Fabric Ingress)
             |
             v
[4. INTERROGATION_PHASE]   <--->  (Suspect Admissions & Custodial Memos)
             |
             v
[5. CHARGESHEET_PREPARATION] ---> [6. TRIAL] ---> [7. CLOSED / DISPOSED]
```

#### Status Workflow
- `DRAFT`: Initial complaint verification.
- `ACTIVE_INVESTIGATION`: Ongoing evidence collection, raids, and forensic extractions.
- `UNDER_REVIEW`: Submitted to Senior IO / ACP for supervisory review and directive sign-off.
- `CHARGESHEETED`: Final report / chargesheet filed in the competent Session Court.
- `CLOSED`: Investigation disposed or convictions recorded.
- `ARCHIVED`: Historical record preservation.

---

### 4. Database Schemas Added in Phase 2

1. **`users` Table**:
   - `id`, `username`, `email`, `hashed_password`, `full_name`, `role`, `badge_number`, `department`, `designation`, `is_active`, `is_superuser`, `created_at`, `updated_at`.
2. **`case_assignments` Table**:
   - `id`, `case_id`, `user_id`, `role_in_case` (e.g. `LEAD_INVESTIGATOR`, `ASSISTANT_IO`, `FORENSIC_LEAD`, `LEGAL_COUNSEL`), `assigned_by_id`, `assigned_at`, `can_write`, `can_export`.
3. **`case_notes` Table**:
   - `id`, `case_id`, `author_id`, `note_type` (`FIELD_REPORT`, `SUPERVISORY_DIRECTIVE`, `HYPOTHESIS`, `LEGAL_OPINION`, `FORENSIC_MEMO`, `GENERAL`), `title`, `content`, `created_at`, `updated_at`.
4. **Enhanced `cases` Table**:
   - Added `priority` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), `stage`, `is_confidential`, `assigned_lead_user_id`.

---

### 5. API Reference Summary

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Authenticates user, returns JWT + role permissions |
| `GET` | `/api/v1/auth/me` | Authenticated | Returns active user profile and granted permissions |
| `GET` | `/api/v1/auth/users` | Authenticated | User directory for team assignment dropdowns |
| `POST` | `/api/v1/auth/seed` | Public / Admin | Seeds 6 default test personas covering all roles |
| `GET` | `/api/v1/cases/dashboard/stats` | Authenticated | Aggregated operations & caseload metrics |
| `POST` | `/api/v1/cases` | `CASE_CREATE` | Create case with priority and stage |
| `GET` | `/api/v1/cases` | Authenticated | List cases with RBAC and confidential filtering |
| `GET` | `/api/v1/cases/{case_id}` | Case Team / Supervisor | Fetch case details, team roster, and stats |
| `PUT` | `/api/v1/cases/{case_id}/status` | `CASE_CHANGE_STATUS` | Transition status with supervisory directive |
| `POST` | `/api/v1/cases/{case_id}/assign` | `CASE_ASSIGN` | Assign investigator or analyst to case team |
| `GET` | `/api/v1/cases/{case_id}/team` | Case Team / Supervisor | List assigned team members |
| `POST` | `/api/v1/cases/{case_id}/notes` | Case Team (Write) | Add note / directive to Case Ledger |
| `GET` | `/api/v1/cases/{case_id}/notes` | Case Team / Supervisor | Fetch chronological Case Ledger feed |

---

### 6. Default Test Personas Seeded

| Username | Password | Role | Designation |
|---|---|---|---|
| `investigator_sharma` | `Password123!` | `INVESTIGATOR` | Inspector R.K. Sharma (Lead IO) |
| `supervisor_verma` | `Password123!` | `SENIOR_INVESTIGATOR` | ACP Surender Verma (Supervisory Cell) |
| `legal_advocate_iyer` | `Password123!` | `LEGAL_ANALYST` | Adv. Priya Iyer (Public Prosecutor) |
| `forensic_dr_deshmukh` | `Password123!` | `FORENSIC_ANALYST` | Dr. Anand Deshmukh (Digital Forensics Lead) |
| `intel_patel` | `Password123!` | `INTELLIGENCE_ANALYST` | Kiran Patel (CIB Crime Analyst) |
| `admin_ciphertrace` | `Password123!` | `SYSTEM_ADMINISTRATOR` | System Administrator |
