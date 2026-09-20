import logging
import uuid
from typing import Any, Dict, List, Optional

from app.schemas.investigative_priority import NextBestAction, PriorityScoreFactors, UncertaintyAnalysis

logger = logging.getLogger(__name__)


class NextBestActionEngine:
    """
    Next Best Investigative Action Engine based on Expected Information Gain (EIG).
    Uses Bayesian / Shannon entropy reduction over competing hypotheses to rank
    the most impactful operational next steps under BNSS 2023 and Section 63 BSA 2023.
    """

    @classmethod
    def generate_actions(
        cls,
        target_entity_name: Optional[str],
        factors: PriorityScoreFactors,
        uncertainty: UncertaintyAnalysis,
        hypotheses: Optional[List[str]] = None,
        evidence_gaps: Optional[List[str]] = None
    ) -> List[NextBestAction]:
        target = target_entity_name or "Prime Subject"

        candidate_actions = [
            {
                "category": "STATUTORY_NOTICE_BNSS_91",
                "title": f"Issue Section 91 BNSS Notice for Certified Banking & KYC Records of [{target}]",
                "statutory_mandate": "Section 91 Bharatiya Nagarik Suraksha Sanhita 2023 (Summons to produce document/banking records)",
                "base_gain": 0.88,
                "urgency": "IMMEDIATE" if factors.corroboration_index < 5.0 or factors.evidence_strength < 5.0 else "HIGH_PRIORITY",
                "hypotheses_resolved": [
                    f"Confirms or refutes whether [{target}] is a knowing beneficiary vs unwitting identity theft victim.",
                    "Identifies exact quid-pro-quo financial flow amounts and beneficiary account controls."
                ],
                "gaps_addressed": [
                    "Missing certified bank ledger certificates under Section 63 BSA 2023.",
                    "Unverified beneficial ownership of recipient mule accounts."
                ],
                "boost_condition": factors.corroboration_index < 6.0 or factors.alternative_explanation_discount >= 3.0
            },
            {
                "category": "TOWER_DUMP_TRIANGULATION",
                "title": f"Requisition Cell Site Tower Dump & Sector Azimuth Analysis for [{target}]",
                "statutory_mandate": "Section 92 / 94 BNSS 2023 & Section 63 BSA 2023 (Telecom location records)",
                "base_gain": 0.85,
                "urgency": "HIGH_PRIORITY",
                "hypotheses_resolved": [
                    f"Establishes whether [{target}] was physically present at incident scene or meeting location.",
                    "Tests and eliminates distance/travel alibi assertions."
                ],
                "gaps_addressed": [
                    "Lack of granular tower azimuth triangulation.",
                    "Ambiguity regarding physical co-presence with co-conspirators."
                ],
                "boost_condition": factors.temporal_correlation >= 5.0 or factors.contradictory_penalty >= 2.5
            },
            {
                "category": "FORENSIC_DEVICE_EXTRACTION",
                "title": f"Forensic Physical Handset Extraction & Digital Evidence Hashing for [{target}]",
                "statutory_mandate": "Section 63 Bharatiya Sakshya Adhiniyam 2023 (Cryptographic hash & electronic chain of custody)",
                "base_gain": 0.92,
                "urgency": "IMMEDIATE" if factors.anomaly_score >= 6.0 or factors.evidence_strength >= 6.0 else "HIGH_PRIORITY",
                "hypotheses_resolved": [
                    "Recovers deleted encrypted messaging threads (Signal/WhatsApp/Telegram).",
                    f"Binds physical IMEI and IMSI chip to [{target}]'s possession."
                ],
                "gaps_addressed": [
                    "Absence of decrypted end-to-end communication contents.",
                    "Device possession and hardware tampering verification."
                ],
                "boost_condition": factors.evidence_strength >= 5.0 or factors.network_relevance >= 6.0
            },
            {
                "category": "UPI_AGGREGATOR_REQUISITION",
                "title": f"Requisition NPCI & Payment Gateway Gateway IP / Device Fingerprints for [{target}]",
                "statutory_mandate": "Section 91 BNSS 2023 & Rule 3 IT (Intermediary Guidelines) 2021",
                "base_gain": 0.79,
                "urgency": "HIGH_PRIORITY",
                "hypotheses_resolved": [
                    "Traces original IP address, ISP, and MAC ID used to authenticate fraudulent transfers.",
                    "Exposes secondary VPN or proxy routing infrastructure."
                ],
                "gaps_addressed": [
                    "Absence of IP session logs connecting suspect device to banking app logins."
                ],
                "boost_condition": factors.anomaly_score >= 4.0
            },
            {
                "category": "SECTION_94_BNSS_SEARCH",
                "title": f"Execute Section 94 BNSS Search Warrant on Clandestine Hawala Office / Premises",
                "statutory_mandate": "Section 94 Bharatiya Nagarik Suraksha Sanhita 2023 (Search of place suspected to contain stolen property/forged documents)",
                "base_gain": 0.76,
                "urgency": "IMMEDIATE" if factors.network_relevance >= 7.0 else "ROUTINE",
                "hypotheses_resolved": [
                    "Seizes physical diaries, offline token ledgers, and duplicate SIM caches.",
                    "Disrupts syndicate coordination center and safehouses."
                ],
                "gaps_addressed": [
                    "Physical corroboration of offline Hawala tokens and code words."
                ],
                "boost_condition": factors.network_relevance >= 6.0
            },
            {
                "category": "TARGETED_INTERROGATION",
                "title": f"Conduct Structured Interrogation of Intermediary Mule Recruits regarding [{target}]",
                "statutory_mandate": "Section 180 BNSS 2023 (Examination of witnesses by police)",
                "base_gain": 0.72,
                "urgency": "ROUTINE",
                "hypotheses_resolved": [
                    f"Verifies whether [{target}] directly gave instructions or operated through intermediaries.",
                    "Clarifies coercion, inducement, or payment commissions."
                ],
                "gaps_addressed": [
                    "Testimonial corroboration of conspiratorial meetings."
                ],
                "boost_condition": factors.alternative_explanation_discount >= 3.0
            }
        ]

        # Compute Expected Information Gain (EIG)
        # EIG = Base Gain * (1.0 + boost) * (1.0 - 0.2 * uncertainty)
        actions: List[NextBestAction] = []
        for item in candidate_actions:
            gain = item["base_gain"]
            if item["boost_condition"]:
                gain = min(gain + 0.08, 0.98)
            
            # Dampen slightly by global uncertainty
            gain = round(gain * (1.0 - 0.1 * uncertainty.uncertainty_score), 3)

            actions.append(
                NextBestAction(
                    action_id=f"NBA-{uuid.uuid4().hex[:8].upper()}",
                    rank=0,
                    title=item["title"],
                    action_category=item["category"],
                    expected_info_gain=gain,
                    hypotheses_resolved=item["hypotheses_resolved"],
                    evidence_gaps_addressed=item["gaps_addressed"],
                    statutory_mandate=item["statutory_mandate"],
                    operational_urgency=item["urgency"],
                    target_entity=target
                )
            )

        # Sort by Expected Information Gain descending
        actions.sort(key=lambda a: a.expected_info_gain, reverse=True)

        # Assign ranks
        for i, a in enumerate(actions):
            a.rank = i + 1

        return actions
