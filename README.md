# CIPHERTRACE X — Criminal Network Intelligence & Investigation Workstation

**CIPHERTRACE X** is an institutional-grade law enforcement and criminal intelligence workstation designed for investigating officers (IOs), forensic analysts, supervisory ACPs/DCPs, and public prosecutors. It unifies multi-modal evidence fabric ingestion, entity resolution, criminal knowledge graphs, GraphRAG reasoning, Indian legal intelligence (BNS/BSA concordance), and cryptographic Section 63 BSA court-ready dossier generation.

---

## System Architecture: 19-Stage Investigation Lifecycle

```
1. Create Case Registry
   ↓
2. Multi-Modal Evidence Fabric Ingest (FIR, CDR, Bank Ledgers, Forensics)
   ↓
3. Extract Entities (Custom LEA NER + Regex)
   ↓
4. Resolve Entities & Disambiguate Aliases (Probabilistic + Phonetic)
   ↓
5. Construct Criminal Knowledge Graph (Neo4j Bolt + pgvector)
   ↓
6. 4-Tier Semantic Network Graph Visualization (Observed / Inferred / Predicted / Contested)
   ↓
7. Detect Communities & Syndicate Clusters (Louvain Algorithm)
   ↓
8. Identify Bridge Nodes & Cut Vertices (Betweenness Centrality)
   ↓
9. Predict Hidden Relational Links (Graph ML)
   ↓
10. Detect Temporal Bursts & Mule Account Flow Anomalies
   ↓
11. Hybrid GraphRAG Evidence Retrieval & Semantic Citations
   ↓
12. Multi-Perspective Reasoning & Consensus (6 Independent Angles)
   ↓
13. Counterfactual Evidence Ablation Testing
   ↓
14. Investigative Priority Scoring & Urgency Ranking
   ↓
15. Next Best Action (NBA) Investigative Directives
   ↓
16. Indian Legal Intelligence (BNS 2023 / BSA 2023 Statutory Concordance)
   ↓
17. Human Challenge, IO Verification & Override Controls
   ↓
18. Cryptographic SHA-256 Merkle Chain & Section 63 BSA Electronic Certificate
   ↓
19. Court-Admissible Police Investigation Dossier & Chargesheet Report
```

---

## How to Run the Platform

### Option 1: Local Development Mode (Quickest for Demo / Evaluation)

Open **two PowerShell terminal windows**:

#### Terminal 1 — Start the Backend Server
```powershell
cd c:\projects\Ciphertrace\backend
..\.venv\Scripts\python.exe run_server.py
```
- **Backend Service**: `http://localhost:8000`
- **Interactive Swagger API Docs**: `http://localhost:8000/docs`
- **Fallback Support**: Defaults gracefully to SQLite / in-memory vector store if local PostgreSQL/Neo4j aren't running.

#### Terminal 2 — Start the Frontend Workstation
```powershell
cd c:\projects\Ciphertrace\frontend
npm run dev
```
- **Workstation UI**: Open `http://localhost:5173` in your browser.

---

### Option 2: Full Docker Production Stack

To run the complete containerized stack (PostgreSQL + pgvector, Neo4j Graph Database, Redis, FastAPI Backend, and React Frontend):

```powershell
cd c:\projects\Ciphertrace\docker
docker compose up --build -d
```

| Service | Port | Description |
| :--- | :--- | :--- |
| **Frontend Workstation** | `http://localhost:3000` | Law Enforcement Intelligence UI |
| **Backend REST API** | `http://localhost:8000/docs` | FastAPI Swagger API Explorer |
| **Neo4j Graph Database** | `http://localhost:7474` | Bolt: `7687`, User: `neo4j`, Password: `ciphertrace_neo4j_password_2026` |
| **PostgreSQL + pgvector** | `localhost:5432` | Relational & Vector Evidence Storage |
| **Redis Cache / Queue** | `localhost:6379` | Task Queue & Caching |

---

## 1-Click SIH Live Demonstration Workflow

1. Open the frontend workstation at `http://localhost:5173` (or `http://localhost:3000` on Docker).
2. Go to the **SIH Mission Control** tab (default landing tab).
3. Click the **"Run 1-Click SIH Pipeline"** button.
4. The system will automatically execute all **19 investigative modules** on the real-world dataset:
   - **Case SIH-2026-X771**: *Operation ShadowHawala* (INR 8.40 Cr Digital Siphoning & Hawala Syndicate).
   - Ingests multi-modal artifacts: FIRs, telecom CDR burst streams, banking ledger transactions, interrogation transcripts, and digital forensics.
5. Click **"Inspect Court Dossier"** to view and print the complete judicial chargesheet complete with BNS legal sections and Section 63 BSA cryptographic verification seals.

---

## Key Workstation Standards & Taxonomies

### 1. 4-Tier Semantic Relationship Taxonomy
Every link and graph edge has strict semantic evidentiary meaning:
- **Observed** (`#10b981`, Emerald, Solid Line): Direct physical or forensic evidence (CDR call log, bank statement, seized SIM box).
- **Inferred** (`#38bdf8`, Sky Blue, Dashed Line): Deterministic analytical link (shared address, co-location bursts).
- **Predicted** (`#f59e0b`, Amber, Dotted Line): Machine Learning probabilistic link with confidence score `%`.
- **Contested** (`#f43f5e`, Rose, Hashed Line): Disputed link flagged for judicial review or defense challenge.

### 2. 5-Level AI Epistemic Transparency
- `[EVIDENCE]` Direct extracted artifact with byte offset pointer.
- `[INFERENCE]` Deductive reasoning chain from multiple facts.
- `[PREDICTION]` Probabilistic ML ranking with confidence bounds.
- `[UNCERTAINTY]` Identified missing data and telecom gaps.
- `[HUMAN VERIFIED]` Sworn IO sign-off with audit timestamp.

### 3. Statutory Compliance
- **Section 63, Bharatiya Sakshya Adhiniyam (BSA), 2023** (formerly Section 65B IEA): Automated cryptographic hash certificates, device serials, and custody logs for electronic evidence admissibility.
- **Bharatiya Nyaya Sanhita (BNS), 2023**: Automated statutory concordance (e.g. BNS 318 for cheating, BNS 111 for organized crime).

---

## Pre-Configured Test Personas (RBAC Switcher)

Switch roles instantly using the top-right persona dropdown:
- **Insp Rajesh Sharma** (`INVESTIGATOR`) — Lead Field IO
- **ACP Surender Verma** (`SENIOR_INVESTIGATOR`) — Supervisory Approver
- **Adv Priya Iyer** (`LEGAL_ANALYST`) — Public Prosecutor
- **Dr. Anand Deshmukh** (`FORENSIC_ANALYST`) — CFSL Forensic Lead
- **Kiran Patel** (`INTELLIGENCE_ANALYST`) — CIB Pattern Analyst
- **System Administrator** (`SYSTEM_ADMINISTRATOR`) — Security Admin

---

## Running Automated Tests

Run the complete platform test suite across all 20 phases:

```powershell
c:\projects\Ciphertrace\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```

*Results: **112 / 112 tests passing** (100% coverage across all modules).*

---

## Technology Stack

- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0, Pydantic v2, NetworkX, python-jose, passlib, Faker
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Cytoscape
- **Database & Graph**: PostgreSQL 16 + pgvector, Neo4j 5.18 Community, Redis 7.2
- **Deployment**: Docker & Docker Compose
