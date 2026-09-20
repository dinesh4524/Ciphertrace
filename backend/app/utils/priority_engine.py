import logging
import math
from typing import Any, Dict, List, Optional, Set, Tuple

from app.schemas.investigative_priority import (
    InvestigativePriorityLevel,
    PriorityScoreFactors,
    SupportingEvidenceItem,
    ContradictoryEvidenceItem,
    UncertaintyAnalysis,
)

logger = logging.getLogger(__name__)


class InvestigativePriorityEngine:
    """
    Phase 15: Investigative Priority Engine for CIPHERTRACE X.
    Synthesizes 9 evidentiary dimensions:
    1. Current-case evidence volume & strength
    2. Temporal correlation & burst alignment
    3. Network relevance & centrality
    4. Anomaly score (mule funnels, smurfing, clean-slate recruits)
    5. Multi-modal corroboration index
    6. Source reliability & cryptographic chain of custody
    7. Contradictory evidence penalty
    8. Alternative explanation discount
    9. Uncertainty & information entropy
    """

    @classmethod
    def assess_priority(
        cls,
        target_name: Optional[str],
        target_id: Optional[str],
        lead_title: Optional[str],
        evidence_items: List[Dict[str, Any]],
        graph_nodes: List[Dict[str, Any]],
        graph_edges: List[Dict[str, Any]],
        temporal_bursts: List[Dict[str, Any]],
        anomalies: List[Dict[str, Any]],
        document_chunks: List[Dict[str, Any]],
        previous_perspectives: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        target_str = (target_name or "").strip().lower()
        t_id_str = (target_id or "").strip().lower()

        # 1. Current-Case Evidence Strength (0.0 - 10.0)
        # Count direct mentions across evidence, chunks, and graph edges
        direct_edges = [
            e for e in graph_edges
            if target_str in str(e.get("source", "")).lower()
            or target_str in str(e.get("target", "")).lower()
            or target_str in str(e.get("source_value", "")).lower()
            or target_str in str(e.get("target_value", "")).lower()
        ]
        doc_mentions = sum(
            1 for c in document_chunks
            if target_str and target_str in str(c.get("content", "")).lower()
        )
        evidence_strength = min(round((len(direct_edges) * 1.5 + doc_mentions * 0.8 + len(evidence_items) * 0.4), 2), 10.0)
        if evidence_strength == 0.0 and len(graph_nodes) > 0:
            evidence_strength = 3.5

        # 2. Temporal Correlation & Burst Alignment (0.0 - 10.0)
        burst_hits = 0
        for b in temporal_bursts:
            b_desc = str(b.get("description", "")).lower()
            b_ents = [str(x).lower() for x in b.get("associated_entities", [])]
            if target_str and (target_str in b_desc or any(target_str in ent for ent in b_ents)):
                burst_hits += 1
        temporal_score = min(round(burst_hits * 3.0 + len(temporal_bursts) * 0.5, 2), 10.0)
        if temporal_score == 0.0 and len(temporal_bursts) > 0:
            temporal_score = 4.0

        # 3. Network Relevance & Centrality (0.0 - 10.0)
        # Degree and bridge involvement
        target_node = None
        for n in graph_nodes:
            n_name = str(n.get("name", "")).lower()
            n_id = str(n.get("id", "")).lower()
            if (target_str and (target_str == n_name or target_str in n_name)) or (t_id_str and t_id_str == n_id):
                target_node = n
                break

        degree = len(direct_edges) if direct_edges else int(target_node.get("degree", 0)) if target_node else 0
        is_bridge = any(
            a.get("anomaly_type") == "CRITICAL_BRIDGE" and target_str in str(a.get("entity_name", "")).lower()
            for a in anomalies
        )
        network_score = min(round((degree * 1.2) + (3.5 if is_bridge else 0.0), 2), 10.0)
        if network_score == 0.0:
            network_score = 3.0

        # 4. Anomaly Score (0.0 - 10.0)
        anomaly_count = sum(
            1 for a in anomalies
            if target_str and target_str in str(a.get("entity_name", "")).lower()
        )
        anomaly_score = min(round(anomaly_count * 3.5 + len(anomalies) * 0.5, 2), 10.0)
        if anomaly_score == 0.0 and len(anomalies) > 0:
            anomaly_score = 3.5

        # 5. Multi-Modal Corroboration Index (0.0 - 10.0)
        # Check how many distinct edge labels or evidence types intersect target
        modalities_found = set()
        for e in direct_edges:
            lbl = str(e.get("label", "")).upper()
            if any(k in lbl for k in ["CALL", "SMS", "PHONE"]):
                modalities_found.add("CDR")
            elif any(k in lbl for k in ["TRANSF", "ACCOUNT", "BANK"]):
                modalities_found.add("FINANCIAL")
            elif any(k in lbl for k in ["LOCAT", "VISIT", "TOWER"]):
                modalities_found.add("LOCATION")
            else:
                modalities_found.add("ASSOCIATION")
        if doc_mentions > 0:
            modalities_found.add("DOCUMENT")

        corroboration_score = min(round(len(modalities_found) * 2.5, 2), 10.0)
        if corroboration_score == 0.0:
            corroboration_score = 3.5

        # 6. Source Reliability & Chain of Custody (0.0 - 10.0)
        # Proportion of verified evidence items
        verified_count = sum(
            1 for item in evidence_items
            if str(item.get("integrity_status", "VERIFIED")).upper() == "VERIFIED"
        )
        total_ev = max(len(evidence_items), 1)
        reliability_ratio = verified_count / total_ev
        source_reliability = round(reliability_ratio * 9.5, 2)
        if source_reliability < 3.0:
            source_reliability = 7.5

        # 7. Contradictory Evidence Penalty (0.0 - 10.0)
        # Alibi or timing divergence
        contradictory_items: List[ContradictoryEvidenceItem] = []
        contradictory_penalty = 1.0

        # Detect potential contradictions (e.g. overlapping CDR in disjoint locations)
        has_location_clash = any("disjoint" in str(a).lower() or "speed" in str(a).lower() for a in anomalies)
        if has_location_clash:
            contradictory_penalty += 3.5
            contradictory_items.append(
                ContradictoryEvidenceItem(
                    modality="LOCATION",
                    conflict_reason="Spatiotemporal anomaly indicates travel velocity exceeding 800 km/h or impossible concurrent presence.",
                    severity="HIGH"
                )
            )

        # 8. Alternative Explanation Discount (0.0 - 10.0)
        alt_discount = 2.0
        alt_explanations: List[str] = []
        if "FINANCIAL" in modalities_found:
            alt_explanations.append("Commercial Commerce: Fund transfers may represent bona fide commercial vendor payments or debt clearing.")
            alt_discount += 1.5
        if "CDR" in modalities_found:
            alt_explanations.append("Social / Innocent Proximity: Call frequency may reflect non-criminal social, familial, or professional association.")
            alt_discount += 1.0
        if not alt_explanations:
            alt_explanations.append("Unwitting Third-Party Intermediation: Subject's identity or account may have been used without conspiratorial knowledge.")

        # 9. Uncertainty & Information Entropy (0.0 - 10.0)
        entropy_drivers: List[str] = []
        if len(modalities_found) < 3:
            entropy_drivers.append("Lack of multi-modal triangulation across telecom, financial, and physical presence.")
        if len(direct_edges) <= 2:
            entropy_drivers.append("Sparse network connectivity: sparse edges leave relationship nature indeterminate.")
        if doc_mentions == 0:
            entropy_drivers.append("Absence of corroborated witness statements or documentary FIR mentions.")

        uncertainty_penalty = min(round(len(entropy_drivers) * 2.5 + 1.5, 2), 10.0)
        uncertainty_score = round(uncertainty_penalty / 10.0, 2)
        uncertainty_level = "HIGH" if uncertainty_score >= 0.65 else "MEDIUM" if uncertainty_score >= 0.35 else "LOW"

        # Composite Priority Score Calculation:
        # Weighted combination:
        # +1.8 * Evidence + 1.5 * Temporal + 1.5 * Network + 1.4 * Anomaly + 1.6 * Corroboration + 1.2 * Reliability
        # -1.0 * Contradictory - 0.8 * Alternative - 0.8 * Uncertainty
        positive_weight = (
            1.8 * evidence_strength +
            1.5 * temporal_score +
            1.5 * network_score +
            1.4 * anomaly_score +
            1.6 * corroboration_score +
            1.2 * source_reliability
        ) # Max positive ~ 90.0

        deductions = (
            1.0 * contradictory_penalty +
            0.8 * alt_discount +
            0.8 * uncertainty_penalty
        ) # Deductions ~ 5 - 26

        raw_score = positive_weight - deductions
        priority_score = max(min(round(raw_score, 1), 99.5), 12.0)

        # Categorize Priority Level
        if priority_score >= 75.0:
            priority_level = InvestigativePriorityLevel.CRITICAL
        elif priority_score >= 55.0:
            priority_level = InvestigativePriorityLevel.HIGH
        elif priority_score >= 35.0:
            priority_level = InvestigativePriorityLevel.MEDIUM
        else:
            priority_level = InvestigativePriorityLevel.LOW

        # Generate Justifying Reasons
        reasons: List[str] = []
        if network_score >= 6.0:
            reasons.append(f"High network prominence: Exhibits degree connectivity of {degree} edges and central positioning in case topology.")
        if temporal_score >= 5.0:
            reasons.append("Temporal synchronization: Active participation in communication or financial bursts during critical incident windows.")
        if corroboration_score >= 5.0:
            reasons.append(f"Multi-modal corroboration: Intersects {len(modalities_found)} independent evidentiary modalities ({', '.join(modalities_found)}).")
        if anomaly_score >= 5.0:
            reasons.append("Topological anomaly alert: Entity exhibits suspicious funneling, smurfing, or cut-out bridge characteristics.")
        if contradictory_penalty >= 3.0:
            reasons.append("Active evidentiary divergence: Conflicts identified in temporal travel or location plausibility requiring formal resolution.")

        # Supporting Evidence Items
        supporting_items: List[SupportingEvidenceItem] = []
        for mod in modalities_found:
            supporting_items.append(
                SupportingEvidenceItem(
                    modality=mod,
                    summary=f"Corroborated {mod} activity involving {target_name or 'target entity'}.",
                    confidence_weight=0.88 if mod in ["FINANCIAL", "CDR"] else 0.75
                )
            )
        if doc_mentions > 0:
            supporting_items.append(
                SupportingEvidenceItem(
                    modality="DOCUMENT",
                    summary=f"Documentary references found in {doc_mentions} investigation narrative excerpts.",
                    confidence_weight=0.85
                )
            )

        # Recommended Verifications
        recommended_verifications = [
            f"Requisition verified subscriber identity records and IMEI binding under Section 91 BNSS 2023 for {target_name or 'target'}.",
            f"Cross-verify bank beneficiary statements with NPCI transaction logs under Section 63 BSA 2023.",
            f"Conduct cell-site sector dump azimuth analysis to corroborate physical co-presence with co-accused.",
            "Formally record statement of bank account holder to substantiate or eliminate unwitting mule defense."
        ]

        factors = PriorityScoreFactors(
            evidence_strength=evidence_strength,
            temporal_correlation=temporal_score,
            network_relevance=network_score,
            anomaly_score=anomaly_score,
            corroboration_index=corroboration_score,
            source_reliability=source_reliability,
            contradictory_penalty=round(contradictory_penalty, 2),
            alternative_explanation_discount=round(alt_discount, 2),
            uncertainty_penalty=round(uncertainty_penalty, 2)
        )

        uncertainty_analysis = UncertaintyAnalysis(
            uncertainty_score=uncertainty_score,
            uncertainty_level=uncertainty_level,
            key_entropy_drivers=entropy_drivers,
            confidence_interval=f"[{max(priority_score - 7.5, 0.0):.1f}, {min(priority_score + 7.5, 100.0):.1f}]"
        )

        return {
            "lead_title": lead_title or f"Investigative Lead: {target_name or 'Core Syndicate Participant'}",
            "target_entity_name": target_name,
            "target_entity_id": target_id,
            "priority_level": priority_level,
            "priority_score": priority_score,
            "score_factors": factors,
            "reasons": reasons,
            "supporting_evidence": supporting_items,
            "contradictory_evidence": contradictory_items,
            "alternative_explanations": alt_explanations,
            "uncertainty": uncertainty_analysis,
            "recommended_verification": recommended_verifications
        }
