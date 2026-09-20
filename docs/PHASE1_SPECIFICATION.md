# CIPHERTRACE X — Phase 1 Specification & System Guide
## Foundation, Multi-Modal Evidence Fabric & Ingestion Engine

### 1. Phase Objective
Establish a reliable data ingestion pipeline and evidentiary fabric for heterogenous criminal records (CDRs, Banking records, FIR complaints, Interrogation transcripts, OSINT feeds) while enforcing strict Section 65B Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam 2023 cryptographic chain of custody standards (SHA-256 hash preservation, immutable audit trails, and strict separation of current-case observed facts vs historical criminal records).

---

### 2. Evidentiary & Ethical Principles Maintained
- **Separation of Evidence Classes**:
  - `CURRENT_CASE_OBSERVED`: Direct factual evidence (CDRs, bank accounts, seizure memos).
  - `CURRENT_CASE_INFERRED`: Derived links or investigative deductions.
  - `HISTORICAL_RECORD`: Prior dossiers used strictly for Modus Operandi (MO) comparison. Never equated with current-case guilt.
  - `OSINT_UNVERIFIED`: Open-source intelligence requiring formal corroboration.
- **Section 63 BSA / Section 65B IEA Parity**: Every file has its SHA-256 digest calculated at the exact moment of ingestion. The system provides an on-demand re-verification certificate proving bit-level parity with the intake record.
- **Append-Only Cryptographic Audit Trail**: Every ingestion, view, query, and verification event is anchored with a SHA-256 digest to prevent retroactive log alteration.

---

### 3. API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | System diagnostics & database connectivity status |
| `POST` | `/api/v1/cases` | Register a new criminal case in the intelligence registry |
| `GET` | `/api/v1/cases` | Paginated listing with search & category filters |
| `GET` | `/api/v1/cases/{case_id}` | Fetch detailed case record & evidence count |
| `POST` | `/api/v1/evidence/upload` | Direct file upload with SHA-256 calculation |
| `GET` | `/api/v1/evidence/case/{case_id}` | List all evidence artifacts for a case |
| `POST` | `/api/v1/evidence/verify-integrity/{evidence_id}` | On-demand Sec 63 BSA runtime hash verification |
| `POST` | `/api/v1/ingest/cdr/upload` | Ingest CDR CSV & normalize call records |
| `POST` | `/api/v1/ingest/financial/upload` | Ingest Banking/Hawala CSV & normalize transactions |
| `POST` | `/api/v1/ingest/fir/upload` | Ingest structured/unstructured FIR document |
| `POST` | `/api/v1/ingest/interrogation` | Ingest suspect/witness interrogation memo |
| `GET` | `/api/v1/audit/logs` | Query immutable audit trail |

---

### 4. Database Schema Design (Phase 1)
- `cases`: Root entity anchoring investigation metadata, jurisdiction, police station, tags, and status.
- `evidence_items`: Master evidence fabric table storing file path, SHA-256 digest, MIME type, category, operator ID, and integrity status.
- `cdr_records`: Normalized telecom call detail records (A-party, B-party, IMEI, IMSI, call type, start time, duration, tower ID, lat/long, provider).
- `financial_records`: Normalized banking/hawala ledger records (sender account, receiver account, banks, amount, UTR, channel, timestamp).
- `fir_documents`: Normalized First Information Reports (FIR number, police station, sections invoked, incident date, informant narrative, full raw text).
- `interrogation_reports`: Normalized suspect disclosures (suspect name, alias, role, interrogating officer, key admissions, verbatim transcript).
- `audit_logs`: Immutable ledger recording operator ID, action type, resource type, timestamps, details JSON, and SHA-256 entry digest.
