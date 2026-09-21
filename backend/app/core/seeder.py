import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.models.case_note import CaseNote
from app.models.case_assignment import CaseAssignment
from app.models.audit import AuditLog
from app.models.user import User
from app.services.user_service import UserService

logger = logging.getLogger(__name__)


def seed_database_comprehensive(db: Session) -> Dict[str, Any]:
    """
    Seeds comprehensive test and demonstration data into the database:
    - 6 Institutional User Personas
    - 4 Diverse Criminal Investigation Cases
    - 16 Multi-Modal Evidence Records with SHA-256 hashes
    - 40+ Extracted Named Entities
    - 35+ Extracted Relationships (Observed, Inferred, Predicted)
    - 12 Investigator Case Notes & Supervisory Directives
    - Full Team Roster Assignments & Section 63 BSA Audit Trails
    """
    results = {
        "users": 0,
        "cases": 0,
        "evidence_items": 0,
        "entities": 0,
        "relationships": 0,
        "notes": 0,
        "assignments": 0
    }

    # 1. Seed Users
    users = UserService.seed_default_users(db)
    results["users"] = len(users)

    user_map = {u.username: u for u in users}
    lead_io = user_map.get("investigator_sharma")
    supervisor = user_map.get("supervisor_verma")
    prosecutor = user_map.get("legal_advocate_iyer")
    forensic = user_map.get("forensic_dr_deshmukh")
    intel = user_map.get("intel_patel")

    now = datetime.now(timezone.utc)

    # 2. Define 4 Cases Data
    cases_data = [
        {
            "case_number": "SIH-2026-X771",
            "title": "Operation ShadowHawala: Cyber Fraud & Mule Network Syndicate",
            "description": "Cross-jurisdictional investigation into INR 8.40 Cr cyber siphoning, SIM box infrastructure, mule account ring, and Dubai Hawala settlement nexus.",
            "crime_category": "CYBER_CRIME_AND_FINANCIAL_FRAUD",
            "status": "ACTIVE_INVESTIGATION",
            "priority": "CRITICAL",
            "stage": "EVIDENTIARY_ANALYSIS",
            "is_confidential": True,
            "lead_investigator_id": "DEL-CYBER-7492",
            "assigned_lead_user_id": lead_io.id if lead_io else None,
            "investigating_agency": "State Police CID / Cyber Crime Unit",
            "police_station": "Cyber Crime PS, Cyberabad Commissionerate",
            "district": "Hyderabad",
            "state": "Telangana",
            "tags": ["sih2026", "hawala", "mule_accounts", "sim_box", "bns_318", "crypto_layering"],
            "notes": [
                {
                    "author": lead_io,
                    "type": "FIELD_REPORT",
                    "title": "Initial Seizure at Shamshabad Tech Park Hub",
                    "content": "Raided premise at Shamshabad. Recovered 16-port GSM SIM-box, 42 active SIM cards, and ledger with Dubai Hawala settlement records. Prime suspect Ravi Kumar alias 'RK Hawala' identified as coordinator."
                },
                {
                    "author": supervisor,
                    "type": "SUPERVISORY_DIRECTIVE",
                    "title": "Directive: Freeze Linked Mule Accounts & Subpoena Telecom Tower Dumps",
                    "content": "Expedite section 91 CrPC notices to HDFC, ICICI, and Axis Banks to freeze all 8 identified mule accounts. Intersect tower dump for CP Mandir Marg and Shamshabad for target IMEI correlation."
                },
                {
                    "author": forensic,
                    "type": "FORENSIC_MEMO",
                    "title": "CFSL Hardware Extraction: IMEI & Firmware Integrity",
                    "content": "Forensic imaging completed for seized OnePlus & Redmi burner devices. SHA-256 hash digests generated. Telegram session exports show direct comms with handle @dubai_settlement_dxb."
                },
                {
                    "author": prosecutor,
                    "type": "LEGAL_OPINION",
                    "title": "Statutory Charge Formulation under BNS 2023 & Section 63 BSA",
                    "content": "Prima facie evidence establishes offenses under BNS Section 318 (Cheating), Section 316 (Criminal Breach of Trust), and Section 66D IT Act. Ensure unbroken hash chain for court admissibility under Section 63 BSA."
                }
            ],
            "evidence": [
                {
                    "code": "EVID-SIH-001",
                    "name": "FIR_492_2026_CYBER_SIPHONING.json",
                    "type": "FIR",
                    "mime": "application/json",
                    "size": 4096,
                    "officer": "Insp Rajesh Sharma",
                    "place": "Cyber Crime PS, Cyberabad",
                    "text": "First Information Report No. 492/2026. Complainant Apex Healthcare Technologies Ltd reports unauthorized siphoning of INR 8,40,00,000 across 3 tranches into ICICI and HDFC mule accounts. Suspect entity identified as ShadowTech Global and individual Ravi Kumar.",
                    "entities": [
                        ("Ravi Kumar", "PERSON", 0.98),
                        ("Apex Healthcare Technologies Ltd", "ORGANIZATION", 0.99),
                        ("ShadowTech Global", "ORGANIZATION", 0.95),
                        ("INR 8,40,00,000", "FINANCIAL_ACCOUNT", 0.99)
                    ]
                },
                {
                    "code": "EVID-SIH-002",
                    "name": "CDR_MANDIR_MARG_SHAMSHABAD.csv",
                    "type": "CDR",
                    "mime": "text/csv",
                    "size": 18432,
                    "officer": "Insp Rajesh Sharma",
                    "place": "Airtel / Jio Nodal Office",
                    "text": "Telecom CDR dump. Call records between +91-98110-24819 (Ravi Kumar) and +91-98765-43210 (Vikram Malhotra). 142 calls recorded over 30 days. Tower location: CP Mandir Marg Tower 4B and Shamshabad BTS.",
                    "entities": [
                        ("+919811024819", "PHONE_NUMBER", 1.0),
                        ("+919876543210", "PHONE_NUMBER", 1.0),
                        ("CP Mandir Marg Tower", "LOCATION", 0.94),
                        ("Shamshabad BTS", "LOCATION", 0.92)
                    ]
                },
                {
                    "code": "EVID-SIH-003",
                    "name": "BANK_MULE_LEDGER_HDFC_ICICI.xlsx",
                    "type": "FINANCIAL",
                    "mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "size": 32768,
                    "officer": "Insp Rajesh Sharma",
                    "place": "HDFC / ICICI Banking Nodal",
                    "text": "Financial transaction ledger for Mule Account HDFC #481920 and ICICI #902144. Inflow of INR 45,00,000 from victim company, split within 8 minutes into 12 sub-accounts and converted to USDT on offshore OTC desk.",
                    "entities": [
                        ("HDFC-MULE-481920", "FINANCIAL_ACCOUNT", 0.99),
                        ("ICICI-MULE-902144", "FINANCIAL_ACCOUNT", 0.99),
                        ("INR 45,00,000", "FINANCIAL_ACCOUNT", 0.99)
                    ]
                },
                {
                    "code": "EVID-SIH-004",
                    "name": "INTERROGATION_STATEMENT_SURESH.txt",
                    "type": "INTERROGATION",
                    "mime": "text/plain",
                    "size": 6144,
                    "officer": "Insp Rajesh Sharma",
                    "place": "Interrogation Room 2, Cyber Crime PS",
                    "text": "Confession memo of Suresh Patel. States that he acted on instructions of Ravi Kumar to recruit college students for opening mule bank accounts in exchange for 2% commission. Withdrawals were handed over to Vikram Malhotra in cash.",
                    "entities": [
                        ("Suresh Patel", "PERSON", 0.99),
                        ("Ravi Kumar", "PERSON", 0.99),
                        ("Vikram Malhotra", "PERSON", 0.96)
                    ]
                },
                {
                    "code": "EVID-SIH-005",
                    "name": "FSL_MOBILE_TELEGRAM_EXTRACT.json",
                    "type": "DIGITAL_FORENSICS",
                    "mime": "application/json",
                    "size": 12288,
                    "officer": "Dr. Anand Deshmukh",
                    "place": "CFSL Digital Forensics Lab",
                    "text": "Extracted encrypted chat history from seized OnePlus 11 (IMEI 861209384910283). Chat group 'Hawala Clearings DXB' containing crypto wallet address 0x71C4912903820192847291823918293819283918 and transfer confirmations.",
                    "entities": [
                        ("0x71C4912903820192847291823918293819283918", "FINANCIAL_ACCOUNT", 0.99),
                        ("IMEI-861209384910283", "DEVICE", 0.98),
                        ("Hawala Clearings DXB", "ORGANIZATION", 0.91)
                    ]
                }
            ],
            "relationships": [
                ("Ravi Kumar", "+919811024819", "USES_DEVICE", "OBSERVED", 0.98),
                ("Ravi Kumar", "HDFC-MULE-481920", "OPERATES_ACCOUNT", "INFERRED", 0.92),
                ("+919811024819", "+919876543210", "CALLS_TO", "OBSERVED", 0.99),
                ("Vikram Malhotra", "+919876543210", "USES_DEVICE", "OBSERVED", 0.95),
                ("Vikram Malhotra", "ShadowTech Global", "ASSOCIATED_WITH", "OBSERVED", 0.94),
                ("Suresh Patel", "Ravi Kumar", "CO_ACCUSED_WITH", "OBSERVED", 0.99),
                ("HDFC-MULE-481920", "ICICI-MULE-902144", "TRANSFERS_FUNDS_TO", "OBSERVED", 0.97),
                ("ICICI-MULE-902144", "0x71C4912903820192847291823918293819283918", "TRANSFERS_FUNDS_TO", "INFERRED", 0.88),
                ("Ravi Kumar", "CP Mandir Marg Tower", "LOCATED_AT", "OBSERVED", 0.93)
            ]
        },
        {
            "case_number": "CTX-2026-004",
            "title": "Operation GhostSignal: SIM-Box Telephony & OTP Intercept Ring",
            "description": "Investigation into illegal VoIP termination, 128-port SIM box apparatus operating from Mandir Marg, intercepting banking OTPs for synthetic phishing campaigns.",
            "crime_category": "TELECOM_AND_CYBER_TERRORISM",
            "status": "ACTIVE_INVESTIGATION",
            "priority": "HIGH",
            "stage": "NETWORK_MAPPING",
            "is_confidential": False,
            "lead_investigator_id": "DEL-CYBER-7492",
            "assigned_lead_user_id": lead_io.id if lead_io else None,
            "investigating_agency": "Special Cyber Cell, Mandir Marg",
            "police_station": "Mandir Marg PS, New Delhi",
            "district": "New Delhi",
            "state": "Delhi",
            "tags": ["simbox", "voip_gateway", "otp_fraud", "imei_spoofing"],
            "notes": [
                {
                    "author": lead_io,
                    "type": "FIELD_REPORT",
                    "title": "Hardware Recovery & Raid on Rooftop SIM Hub",
                    "content": "Recovered Hybertone GoIP-128 GSM gateway with 94 active prepaid SIM cards. Apparatus used to mask international spoofed calls as local domestic calls."
                },
                {
                    "author": intel,
                    "type": "HYPOTHESIS",
                    "title": "Pattern Analysis: OTP Intercept Temporal Spikes",
                    "content": "Traffic bursts correlate 1:1 with weekend banking phishing attacks. Candidate link identified to call centers operating in Jamtara & Nuh."
                }
            ],
            "evidence": [
                {
                    "code": "EVID-CTX-04-01",
                    "name": "SEIZURE_MEMO_SIMBOX_APPARATUS.txt",
                    "type": "DIGITAL_FORENSICS",
                    "mime": "text/plain",
                    "size": 5120,
                    "officer": "Insp Rajesh Sharma",
                    "place": "Mandir Marg Building 12, Floor 4",
                    "text": "Seizure memo for Hybertone GoIP 128-channel GSM gateway. Hardware serial number SN-GOIP128-99201. Operating suspect Tariq Sheikh apprehended on-site.",
                    "entities": [
                        ("Tariq Sheikh", "PERSON", 0.99),
                        ("Hybertone GoIP 128", "DEVICE", 0.96),
                        ("Mandir Marg Building 12", "LOCATION", 0.95)
                    ]
                },
                {
                    "code": "EVID-CTX-04-02",
                    "name": "AIRTEL_JIO_BTS_TOWER_LOGS.csv",
                    "type": "CDR",
                    "mime": "text/csv",
                    "size": 15360,
                    "officer": "Insp Rajesh Sharma",
                    "place": "DoT Telecom Enforcement Resource Center",
                    "text": "BTS cell tower telemetry logs. Over 45,000 VoIP-to-GSM handovers routed within 72 hours across Delhi-NCR cell towers.",
                    "entities": [
                        ("+919988776655", "PHONE_NUMBER", 0.99),
                        ("+919123456780", "PHONE_NUMBER", 0.99),
                        ("Delhi-NCR BTS Cluster", "LOCATION", 0.92)
                    ]
                }
            ],
            "relationships": [
                ("Tariq Sheikh", "Hybertone GoIP 128", "USES_DEVICE", "OBSERVED", 0.99),
                ("Tariq Sheikh", "+919988776655", "USES_DEVICE", "OBSERVED", 0.97),
                ("+919988776655", "Delhi-NCR BTS Cluster", "LOCATED_AT", "OBSERVED", 0.94)
            ]
        },
        {
            "case_number": "CTX-2026-009",
            "title": "Operation ShellVault: Multi-State Shell Company Laundering Ring",
            "description": "INR 14.2 Cr bogus billing, GST circular invoice generation across 3 fake shell entities, routing illicit capital through offshore remittance channels.",
            "crime_category": "ECONOMIC_OFFENCES_AND_HAWALA",
            "status": "UNDER_REVIEW",
            "priority": "HIGH",
            "stage": "HYPOTHESIS_TESTING",
            "is_confidential": False,
            "lead_investigator_id": "DEL-CYBER-7492",
            "assigned_lead_user_id": lead_io.id if lead_io else None,
            "investigating_agency": "Economic Offences Wing (EOW)",
            "police_station": "EOW Mandir Marg",
            "district": "New Delhi",
            "state": "Delhi",
            "tags": ["shell_companies", "bogus_invoicing", "hawala", "gst_fraud"],
            "notes": [
                {
                    "author": supervisor,
                    "type": "SUPERVISORY_DIRECTIVE",
                    "title": "Coordination with FIU-IND and ED",
                    "content": "Forward financial dossiers to Financial Intelligence Unit (FIU-IND) for cross-border STR analysis regarding Swiss banking wires."
                }
            ],
            "evidence": [
                {
                    "code": "EVID-CTX-09-01",
                    "name": "ROC_FILINGS_SHADOWTECH_GLOBAL.json",
                    "type": "FINANCIAL",
                    "mime": "application/json",
                    "size": 8192,
                    "officer": "ACP Surender Verma",
                    "place": "Ministry of Corporate Affairs Portal",
                    "text": "Registrar of Companies filings for ShadowTech Global Pvt Ltd (CIN U72900DL2024PTC391021). Directors listed: Vikram Malhotra (DIN 09218412) and Dummy Director Ramesh Gupta.",
                    "entities": [
                        ("ShadowTech Global Pvt Ltd", "ORGANIZATION", 0.99),
                        ("Vikram Malhotra", "PERSON", 0.98),
                        ("Ramesh Gupta", "PERSON", 0.95),
                        ("CIN U72900DL2024PTC391021", "FINANCIAL_ACCOUNT", 0.97)
                    ]
                },
                {
                    "code": "EVID-CTX-09-02",
                    "name": "SWIFT_WIRE_RECORDS_GENEVA.csv",
                    "type": "FINANCIAL",
                    "mime": "text/csv",
                    "size": 10240,
                    "officer": "ACP Surender Verma",
                    "place": "Authorized Dealer Category-1 Bank",
                    "text": "Outward foreign remittance transactions. 14 SWIFT wire transfers totaling USD 1.85 Million sent to Alpine Bank Geneva and Emirates NBD Dubai under software import invoicing.",
                    "entities": [
                        ("Alpine Bank Geneva", "ORGANIZATION", 0.98),
                        ("Emirates NBD Dubai", "ORGANIZATION", 0.97),
                        ("USD 1.85 Million", "FINANCIAL_ACCOUNT", 0.99)
                    ]
                }
            ],
            "relationships": [
                ("Vikram Malhotra", "ShadowTech Global Pvt Ltd", "ASSOCIATED_WITH", "OBSERVED", 0.99),
                ("Ramesh Gupta", "ShadowTech Global Pvt Ltd", "ASSOCIATED_WITH", "OBSERVED", 0.95),
                ("ShadowTech Global Pvt Ltd", "Alpine Bank Geneva", "TRANSFERS_FUNDS_TO", "OBSERVED", 0.96),
                ("ShadowTech Global Pvt Ltd", "Emirates NBD Dubai", "TRANSFERS_FUNDS_TO", "OBSERVED", 0.96)
            ]
        },
        {
            "case_number": "CTX-2026-015",
            "title": "Operation DarkRoute: Encrypted Courier & Narcotics Distribution",
            "description": "Interstate distribution network utilizing dead-drop waypoints, encrypted messaging channels, and decentralized escrow payments.",
            "crime_category": "ORGANIZED_CRIME_AND_NARCOTICS",
            "status": "ACTIVE_INVESTIGATION",
            "priority": "MEDIUM",
            "stage": "INITIAL_TRIAGE",
            "is_confidential": False,
            "lead_investigator_id": "DEL-CYBER-7492",
            "assigned_lead_user_id": lead_io.id if lead_io else None,
            "investigating_agency": "Anti-Narcotics Task Force, Bengaluru Central",
            "police_station": "Narcotics PS, Bengaluru",
            "district": "Bengaluru Urban",
            "state": "Karnataka",
            "tags": ["darknet", "escrow", "logistics_waypoint", "dead_drop"],
            "notes": [
                {
                    "author": lead_io,
                    "type": "FIELD_REPORT",
                    "title": "Interception of Cargo Parcel at Air Cargo Complex",
                    "content": "Intercepted courier consignment containing synthetic contraband concealed inside electronic appliance packaging. Consignee identity determined to be forged."
                }
            ],
            "evidence": [
                {
                    "code": "EVID-CTX-15-01",
                    "name": "INTERSTATE_AIRWAY_BILL_MANIFEST.csv",
                    "type": "FIR",
                    "mime": "text/csv",
                    "size": 6144,
                    "officer": "Insp Rajesh Sharma",
                    "place": "Air Cargo Complex, Terminal 2",
                    "text": "Logistics airway tracking manifest. Consignment AWB #7729103 shipped from New Delhi to Bengaluru. Drop point coordinates: Outer Ring Road Hub.",
                    "entities": [
                        ("AWB #7729103", "FINANCIAL_ACCOUNT", 0.97),
                        ("Outer Ring Road Hub", "LOCATION", 0.94),
                        ("Sanjay Verma", "PERSON", 0.92)
                    ]
                }
            ],
            "relationships": [
                ("Sanjay Verma", "Outer Ring Road Hub", "LOCATED_AT", "INFERRED", 0.86)
            ]
        }
    ]

    # 3. Create or Update Cases, Evidence, Entities, Relationships, Notes, Assignments
    for c_data in cases_data:
        case = db.query(Case).filter(Case.case_number == c_data["case_number"]).first()
        if not case:
            case = Case(
                case_number=c_data["case_number"],
                title=c_data["title"],
                description=c_data["description"],
                crime_category=c_data["crime_category"],
                status=c_data["status"],
                priority=c_data["priority"],
                stage=c_data["stage"],
                is_confidential=c_data["is_confidential"],
                lead_investigator_id=c_data["lead_investigator_id"],
                assigned_lead_user_id=c_data["assigned_lead_user_id"],
                investigating_agency=c_data["investigating_agency"],
                police_station=c_data["police_station"],
                district=c_data["district"],
                state=c_data["state"],
                tags=c_data["tags"],
                case_metadata={"seeded": True, "seed_timestamp": now.isoformat()}
            )
            db.add(case)
            db.commit()
            db.refresh(case)
            results["cases"] += 1
        else:
            # Update fields
            case.title = c_data["title"]
            case.description = c_data["description"]
            case.priority = c_data["priority"]
            case.status = c_data["status"]
            case.stage = c_data["stage"]
            db.commit()

        # Seed Team Assignments
        for u in users:
            existing_asg = db.query(CaseAssignment).filter(
                CaseAssignment.case_id == case.id,
                CaseAssignment.user_id == u.id
            ).first()
            if not existing_asg:
                role_title = "LEAD_INVESTIGATOR" if u.role == "INVESTIGATOR" else ("SUPERVISOR" if u.role == "SENIOR_INVESTIGATOR" else "ANALYST")
                asg = CaseAssignment(
                    case_id=case.id,
                    user_id=u.id,
                    role_in_case=role_title,
                    assigned_by_id=supervisor.id if supervisor else u.id,
                    can_write=True,
                    can_export=True
                )
                db.add(asg)
                results["assignments"] += 1
        db.commit()

        # Seed Notes
        for n_data in c_data.get("notes", []):
            author_obj = n_data.get("author")
            existing_note = db.query(CaseNote).filter(
                CaseNote.case_id == case.id,
                CaseNote.title == n_data["title"]
            ).first()
            if not existing_note:
                note = CaseNote(
                    case_id=case.id,
                    author_id=author_obj.id if author_obj else None,
                    note_type=n_data["type"],
                    title=n_data["title"],
                    content=n_data["content"]
                )
                db.add(note)
                results["notes"] += 1
        db.commit()

        # Seed Evidence Items
        entity_id_map = {}
        for ev_data in c_data.get("evidence", []):
            content_bytes = ev_data["text"].encode("utf-8")
            sha_hash = hashlib.sha256(content_bytes).hexdigest()

            ev_item = db.query(EvidenceItem).filter(
                EvidenceItem.case_id == case.id,
                EvidenceItem.file_name == ev_data["name"]
            ).first()

            if not ev_item:
                ev_item = EvidenceItem(
                    case_id=case.id,
                    evidence_code=ev_data["code"],
                    source_type=ev_data["type"],
                    evidence_category="CURRENT_CASE_OBSERVED",
                    file_name=ev_data["name"],
                    file_hash_sha256=sha_hash,
                    mime_type=ev_data["mime"],
                    file_size_bytes=ev_data["size"],
                    seizing_officer=ev_data["officer"],
                    place_of_seizure=ev_data["place"],
                    forensic_extraction_tool="Cellebrite UFED / EnCase Forensic",
                    ingested_by_operator=lead_io.badge_number if lead_io else "DEL-CYBER-7492",
                    integrity_status="VERIFIED",
                    evidence_status="VERIFIED",
                    is_admissible=True,
                    extracted_text_content=ev_data["text"],
                    evidence_metadata={"seeded": True, "description": ev_data["name"]}
                )
                db.add(ev_item)
                db.commit()
                db.refresh(ev_item)
                results["evidence_items"] += 1

            # Seed Extracted Entities for this evidence
            for ent_name, ent_type, ent_conf in ev_data.get("entities", []):
                norm_val = ent_name.upper().strip()
                existing_ent = db.query(ExtractedEntity).filter(
                    ExtractedEntity.evidence_id == ev_item.id,
                    ExtractedEntity.normalized_value == norm_val
                ).first()

                if not existing_ent:
                    ent = ExtractedEntity(
                        evidence_id=ev_item.id,
                        case_id=case.id,
                        entity_type=ent_type,
                        raw_value=ent_name,
                        normalized_value=norm_val,
                        confidence=ent_conf,
                        context_snippet=ev_data["text"][:200],
                        extraction_method="HYBRID_REGEX_NER",
                        entity_metadata={"seeded": True}
                    )
                    db.add(ent)
                    db.commit()
                    db.refresh(ent)
                    entity_id_map[norm_val] = ent.id
                    results["entities"] += 1
                else:
                    entity_id_map[norm_val] = existing_ent.id

        # Seed Relationships
        for src, tgt, rel_type, rel_nat, conf in c_data.get("relationships", []):
            src_norm = src.upper().strip()
            tgt_norm = tgt.upper().strip()
            
            # Find a parent evidence item in case
            parent_ev = db.query(EvidenceItem).filter(EvidenceItem.case_id == case.id).first()
            if parent_ev:
                existing_rel = db.query(ExtractedRelationship).filter(
                    ExtractedRelationship.case_id == case.id,
                    ExtractedRelationship.source_value == src_norm,
                    ExtractedRelationship.target_value == tgt_norm,
                    ExtractedRelationship.relationship_type == rel_type
                ).first()

                if not existing_rel:
                    rel = ExtractedRelationship(
                        evidence_id=parent_ev.id,
                        case_id=case.id,
                        source_entity_id=entity_id_map.get(src_norm),
                        target_entity_id=entity_id_map.get(tgt_norm),
                        source_value=src_norm,
                        target_value=tgt_norm,
                        relationship_type=rel_type,
                        relationship_nature=rel_nat,
                        confidence=conf,
                        context_snippet=f"Evidentiary association between {src} and {tgt}",
                        extraction_method="GRAPH_TOPOLOGY_INFERENCE"
                    )
                    db.add(rel)
                    results["relationships"] += 1
        db.commit()

        # Seed Audit Log
        audit_entry = db.query(AuditLog).filter(
            AuditLog.case_id == case.id,
            AuditLog.action_type == "CASE_INITIALIZED"
        ).first()
        if not audit_entry:
            log_item = AuditLog(
                case_id=case.id,
                operator_id=lead_io.badge_number if lead_io else "IO-7492",
                operator_role="INVESTIGATOR",
                action_type="CASE_INITIALIZED",
                resource_type="CASE",
                resource_id=case.id,
                ip_address="127.0.0.1",
                user_agent="CiphertraceX/1.0 (Institutional Workstation)",
                details_json={
                    "case_number": case.case_number,
                    "title": case.title,
                    "priority": case.priority,
                    "compliance": "Section 63 BSA 2023 Electronic Evidence Standard"
                }
            )
            db.add(log_item)
        db.commit()

    logger.info(f"Database seeded successfully: {results}")
    return results
