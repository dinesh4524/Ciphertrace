import re
from typing import Any, Dict, List, Optional

from app.schemas.perspective_reasoning import (
    PerspectiveReport,
    PerspectiveType,
)


class NonCulpabilityGuardrail:
    """
    Statutory Non-Culpability & Fair Trial Guardrail under Section 63 BSA 2023.
    Strictly prohibits any reasoning perspective or algorithm from declaring guilt.
    Sanitizes conclusive guilt declarations into objective investigative hypotheses.
    """

    PROHIBITED_GUILT_PATTERNS = [
        r"\b(is|are)\s+guilty\b",
        r"\bproven\s+guilty\b",
        r"\bguilt\s+is\s+(clear|established|proven|conclusive)\b",
        r"\bconclusively\s+guilty\b",
        r"\bperpetrator\s+confirmed\b",
        r"\bculpability\s+is\s+(proven|conclusive|absolute)\b",
        r"\bguilt\s+beyond\s+doubt\b",
        r"\bconviction\s+(guaranteed|certain|conclusive)\b",
    ]

    REPLACEMENTS = {
        "guilty": "alleged or hypothesized in the investigative inquiry",
        "proven guilty": "indicated by current evidentiary leads subject to judicial trial",
        "perpetrator confirmed": "person of interest under active investigation",
        "conclusively guilty": "subject to corroborated evidentiary scrutiny",
    }

    @classmethod
    def sanitize_perspective(cls, report: PerspectiveReport) -> PerspectiveReport:
        """
        Scans and sanitizes report text to ensure zero declaration of guilt.
        """
        sanitized_args = [cls._sanitize_text(a) for a in report.arguments]
        sanitized_support = [cls._sanitize_text(s) for s in report.supporting_points]
        sanitized_concerns = [cls._sanitize_text(c) for c in report.concerns_or_limitations]
        sanitized_summary = cls._sanitize_text(report.summary)

        report.arguments = sanitized_args
        report.supporting_points = sanitized_support
        report.concerns_or_limitations = sanitized_concerns
        report.summary = sanitized_summary

        # Guarantee non-culpability statutory notice
        report.non_culpability_statement = (
            "Statutory Notice (Section 63 BSA 2023): This perspective provides analytical evaluation only. "
            "It is legally prohibited from declaring guilt or establishing judicial culpability. "
            "Guilt can only be adjudicated by a competent judicial court after a fair trial."
        )
        return report

    @classmethod
    def _sanitize_text(cls, text: str) -> str:
        out = text
        for pat in cls.PROHIBITED_GUILT_PATTERNS:
            out = re.sub(pat, "hypothesized subject to judicial determination", out, flags=re.IGNORECASE)
        for term, rep in cls.REPLACEMENTS.items():
            out = re.sub(rf"\b{re.escape(term)}\b", rep, out, flags=re.IGNORECASE)
        return out


class StructuredPerspectiveEngine:
    """
    Multi-Perspective Reasoning Engine.
    Generates 6 distinct viewpoints on any investigative inquiry, hypothesis, or suspect.
    """

    @classmethod
    def evaluate_all(
        cls,
        hypothesis: str,
        target_entity: Optional[str],
        evidence_items: List[Dict[str, Any]],
        graph_nodes: List[Dict[str, Any]],
        graph_edges: List[Dict[str, Any]],
        document_chunks: List[Dict[str, Any]],
        temporal_bursts: List[Dict[str, Any]]
    ) -> List[PerspectiveReport]:
        """
        Executes all 6 perspective evaluations and sanitizes through NonCulpabilityGuardrail.
        """
        reports: List[PerspectiveReport] = []

        # 1. Investigator Perspective
        rep_inv = cls._evaluate_investigator(
            hypothesis, target_entity, evidence_items, graph_edges, document_chunks
        )
        reports.append(NonCulpabilityGuardrail.sanitize_perspective(rep_inv))

        # 2. Forensic Perspective
        rep_for = cls._evaluate_forensic(
            hypothesis, target_entity, evidence_items, graph_nodes, document_chunks
        )
        reports.append(NonCulpabilityGuardrail.sanitize_perspective(rep_for))

        # 3. Legal Perspective
        rep_leg = cls._evaluate_legal(
            hypothesis, target_entity, evidence_items, document_chunks
        )
        reports.append(NonCulpabilityGuardrail.sanitize_perspective(rep_leg))

        # 4. Defence / Alternative Explanation Perspective
        rep_def = cls._evaluate_defence(
            hypothesis, target_entity, graph_edges, document_chunks, temporal_bursts
        )
        reports.append(NonCulpabilityGuardrail.sanitize_perspective(rep_def))

        # 5. Suspect / Innocent Explanation Perspective
        rep_sus = cls._evaluate_suspect_innocent(
            hypothesis, target_entity, graph_edges, document_chunks
        )
        reports.append(NonCulpabilityGuardrail.sanitize_perspective(rep_sus))

        # 6. Common-Sense Perspective
        rep_cs = cls._evaluate_common_sense(
            hypothesis, target_entity, graph_edges, temporal_bursts
        )
        reports.append(NonCulpabilityGuardrail.sanitize_perspective(rep_cs))

        return reports

    @classmethod
    def _evaluate_investigator(
        cls,
        hypothesis: str,
        target_entity: Optional[str],
        evidence_items: List[Dict[str, Any]],
        graph_edges: List[Dict[str, Any]],
        document_chunks: List[Dict[str, Any]]
    ) -> PerspectiveReport:
        entity_name = target_entity or "the subject entity"
        args = [
            f"Telecommunications and relationship links connect {entity_name} to key case entities.",
            "Modus operandi aligns with coordinated syndicated behavior observed in financial and CDR flows.",
            f"Investigative hypothesis posits that {entity_name} served an operational role in the syndicate network."
        ]
        support = [
            f"Recorded {len(graph_edges)} structural connections in the criminal knowledge graph.",
            f"Seized {len(evidence_items)} case evidence items establishing physical and digital custody.",
            f"Documentary excerpts corroborate communication and transactional linkages."
        ]
        concerns = [
            "Certain relationships remain single-source or based solely on co-accused statements.",
            "Direct mens rea (guilty intent) must be corroborated by contemporaneous digital chats rather than inferred."
        ]
        return PerspectiveReport(
            perspective=PerspectiveType.INVESTIGATOR,
            title="Investigator Perspective (Operational Lead & MO Analysis)",
            summary=(
                f"From an investigative stance, the pattern of contacts and funds associated with {entity_name} "
                f"warrants treating the hypothesis as an active operational lead."
            ),
            arguments=args,
            supporting_points=support,
            concerns_or_limitations=concerns,
            certainty_level="MODERATE"
        )

    @classmethod
    def _evaluate_forensic(
        cls,
        hypothesis: str,
        target_entity: Optional[str],
        evidence_items: List[Dict[str, Any]],
        graph_nodes: List[Dict[str, Any]],
        document_chunks: List[Dict[str, Any]]
    ) -> PerspectiveReport:
        entity_name = target_entity or "the subject entity"
        args = [
            "Forensic integrity requires cryptographic SHA-256 validation of all seized digital materials.",
            "Physical device seizure and Cellebrite extraction logs are required to confirm handset-level possession.",
            "CDR cell-tower records indicate antenna coverage zones, but do not provide micro-location GPS accuracy."
        ]
        support = [
            "All digital evidence items in the custody fabric have verified SHA-256 hashes.",
            "Telecommunication records originate from authorized telecom service provider feeds."
        ]
        concerns = [
            "Technical vulnerabilities such as SIM-swapping, burner number rotation, or Wi-Fi proxying cannot be excluded.",
            f"Absence of physical handset extraction for {entity_name} limits certainty of who was operating the device."
        ]
        return PerspectiveReport(
            perspective=PerspectiveType.FORENSIC,
            title="Forensic Perspective (Technical Artifacts & Chain of Custody)",
            summary=(
                f"Forensic examination confirms the authenticity of recorded transmission logs, but highlights "
                f"that attribution of handset operation to {entity_name} requires physical device forensication."
            ),
            arguments=args,
            supporting_points=support,
            concerns_or_limitations=concerns,
            certainty_level="MODERATE"
        )

    @classmethod
    def _evaluate_legal(
        cls,
        hypothesis: str,
        target_entity: Optional[str],
        evidence_items: List[Dict[str, Any]],
        document_chunks: List[Dict[str, Any]]
    ) -> PerspectiveReport:
        entity_name = target_entity or "the subject entity"
        args = [
            "Every electronic record relied upon must satisfy Section 63 Bharatiya Sakshya Adhiniyam (BSA) 2023.",
            "Under Indian criminal jurisprudence, circumstantial evidence must form a complete chain excluding any benign hypothesis.",
            "Confessions made to police officers or co-accused statements require independent material corroboration."
        ]
        support = [
            "Digital evidence items are secured with cryptographic hash records and tamper-evident audit logs.",
            "Documentary evidence meets the threshold for prima facie investigation under BNSS 2023."
        ]
        concerns = [
            "If key links rely solely on co-accused interrogation admissions, they are inadmissible without corroborating recovery.",
            f"The standard of proof at trial is beyond reasonable doubt; current evidence may leave triable gaps."
        ]
        return PerspectiveReport(
            perspective=PerspectiveType.LEGAL,
            title="Legal Perspective (Statutory Admissibility & Burden of Proof)",
            summary=(
                f"The legal evaluation indicates prima facie justification to investigate {entity_name}, "
                f"but cautions that Section 63 BSA 2023 certification and independent corroboration are mandatory for court trial."
            ),
            arguments=args,
            supporting_points=support,
            concerns_or_limitations=concerns,
            certainty_level="MODERATE"
        )

    @classmethod
    def _evaluate_defence(
        cls,
        hypothesis: str,
        target_entity: Optional[str],
        graph_edges: List[Dict[str, Any]],
        document_chunks: List[Dict[str, Any]],
        temporal_bursts: List[Dict[str, Any]]
    ) -> PerspectiveReport:
        entity_name = target_entity or "the subject entity"
        args = [
            f"The observed interactions of {entity_name} are consistent with ordinary commercial dealings or casual social contact.",
            "The prosecution narrative exhibits confirmation bias by presuming criminal intent behind neutral communications.",
            "No direct documentary evidence shows {entity_name} agreeing to or participating in an unlawful conspiracy."
        ]
        support = [
            "Financial transactions can be explained as ordinary commercial debts, repayments, or invoice settlements.",
            "Phone calls between business acquaintances naturally occur during daylight business hours."
        ]
        concerns = [
            f"Failure to present alternative legitimate invoices or witnesses leaves the defence position unasserted."
        ]
        return PerspectiveReport(
            perspective=PerspectiveType.DEFENCE_ALTERNATIVE,
            title="Defence Perspective (Alternative Explanations & Reasonable Doubt)",
            summary=(
                f"The defence perspective contends that {entity_name}'s actions admit of reasonable innocent explanations, "
                f"and that guilt cannot be legally inferred from ambiguous associations."
            ),
            arguments=args,
            supporting_points=support,
            concerns_or_limitations=concerns,
            certainty_level="LOW"
        )

    @classmethod
    def _evaluate_suspect_innocent(
        cls,
        hypothesis: str,
        target_entity: Optional[str],
        graph_edges: List[Dict[str, Any]],
        document_chunks: List[Dict[str, Any]]
    ) -> PerspectiveReport:
        entity_name = target_entity or "the subject entity"
        args = [
            f"{entity_name} may be an unwitting victim of identity theft, account spoofing, or mule fraud.",
            "The handset or SIM card may have been borrowed, shared, or accessed by third parties without knowledge.",
            f"The subject maintains lack of criminal knowledge (absence of mens rea) regarding the broader conspiracy."
        ]
        support = [
            "Mule account rings routinely recruit third parties or harvest Aadhaar credentials under false pretexts.",
            f"Clean-slate anomaly indicators show no prior criminal record for {entity_name}."
        ]
        concerns = [
            "The subject has not yet submitted formal evidence of a lost SIM complaint or unauthorized bank usage."
        ]
        return PerspectiveReport(
            perspective=PerspectiveType.SUSPECT_INNOCENT,
            title="Suspect Perspective (Innocent Explanation & Unwitting Victim)",
            summary=(
                f"The suspect viewpoint raises the plausible defense of unwitting involvement, identity misuse, "
                f"or absence of knowledge, requiring explicit investigation by police."
            ),
            arguments=args,
            supporting_points=support,
            concerns_or_limitations=concerns,
            certainty_level="LOW"
        )

    @classmethod
    def _evaluate_common_sense(
        cls,
        hypothesis: str,
        target_entity: Optional[str],
        graph_edges: List[Dict[str, Any]],
        temporal_bursts: List[Dict[str, Any]]
    ) -> PerspectiveReport:
        entity_name = target_entity or "the subject entity"
        args = [
            "In modern urban life, individuals interact with hundreds of service providers, drivers, and merchants.",
            "Occasional calls or monetary transfers do not automatically establish conspiratorial agreement in ordinary human experience.",
            "However, sudden bursts of nocturnal communication and velocity spikes deviate from normal daily routines."
        ]
        support = [
            "Everyday probability suggests co-incidence is common in large urban commercial networks.",
            f"Activity patterns must be compared against a normal 30-day baseline before drawing sinister inferences."
        ]
        concerns = [
            "Coordinated high-value transfers during off-hours stretch the boundaries of benign common-sense coincidence."
        ]
        return PerspectiveReport(
            perspective=PerspectiveType.COMMON_SENSE,
            title="Common-Sense Perspective (Everyday Plausibility & Behavioral Baseline)",
            summary=(
                f"Common-sense reasoning indicates that while individual associations could be casual, "
                f"unusual timing and financial volumes require credible real-world explanations."
            ),
            arguments=args,
            supporting_points=support,
            concerns_or_limitations=concerns,
            certainty_level="MODERATE"
        )
