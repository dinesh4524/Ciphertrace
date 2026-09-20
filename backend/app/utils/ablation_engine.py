import logging
from collections import defaultdict, deque
from typing import Any, Dict, List, Optional, Set, Tuple

from app.schemas.counterfactual import (
    AblationScenarioType,
    HypothesisSurvivalStatus,
    ScenarioMetricDelta,
    AblatedScenarioResult,
    SensitivityAnalysisSummary,
)

logger = logging.getLogger(__name__)


class CounterfactualAblationEngine:
    """
    Core Analytical Engine for Phase 14: Counterfactual & Evidence Ablation.
    Performs topological perturbation, evidence ablation, entity/relationship removal,
    sensitivity profiling, and alternative explanation generation.
    """

    STATUTORY_SAFEGUARD = (
        "Pursuant to Section 63 Bharatiya Sakshya Adhiniyam 2023 (BSA), counterfactual ablation "
        "is an analytical stress-testing methodology evaluating evidentiary dependence and hypothesis resilience. "
        "It measures the fragility of an investigative theory, NOT criminal guilt or legal liability."
    )

    @staticmethod
    def _calculate_graph_metrics(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        target_name_or_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculates topological metrics:
        - node count, edge count
        - density: 2*E / (V*(V-1))
        - connected components count (BFS)
        - average clustering coefficient
        - target node degree, approximate betweenness, and connectivity
        """
        v_count = len(nodes)
        e_count = len(edges)
        node_map = {n["id"]: n for n in nodes}
        node_ids = list(node_map.keys())

        if v_count == 0:
            return {
                "node_count": 0,
                "edge_count": 0,
                "density": 0.0,
                "components_count": 0,
                "avg_clustering": 0.0,
                "target_degree": None,
                "target_betweenness": None,
                "target_pagerank": None,
            }

        # Build adjacency
        adj: Dict[str, Set[str]] = {nid: set() for nid in node_ids}
        for e in edges:
            s, t = e["source"], e["target"]
            if s in adj and t in adj and s != t:
                adj[s].add(t)
                adj[t].add(s)

        # Density
        possible_edges = v_count * (v_count - 1) / 2.0
        density = round(e_count / possible_edges, 4) if possible_edges > 0 else 0.0

        # Connected Components
        visited: Set[str] = set()
        components_count = 0
        for nid in node_ids:
            if nid not in visited:
                components_count += 1
                queue = deque([nid])
                visited.add(nid)
                while queue:
                    curr = queue.popleft()
                    for neighbor in adj[curr]:
                        if neighbor not in visited:
                            visited.add(neighbor)
                            queue.append(neighbor)

        # Average Clustering Coefficient
        clustering_sum = 0.0
        for nid in node_ids:
            neighbors = list(adj[nid])
            k = len(neighbors)
            if k < 2:
                continue
            links_between_neighbors = 0
            for i in range(k):
                for j in range(i + 1, k):
                    if neighbors[j] in adj[neighbors[i]]:
                        links_between_neighbors += 1
            possible_neighbor_links = k * (k - 1) / 2.0
            clustering_sum += links_between_neighbors / possible_neighbor_links
        avg_clustering = round(clustering_sum / v_count, 4) if v_count > 0 else 0.0

        # Target entity specific metrics
        target_node_id = None
        if target_name_or_id:
            query = target_name_or_id.strip().lower()
            for nid, n in node_map.items():
                name = str(n.get("name", "")).lower()
                if nid.lower() == query or query in name or name in query:
                    target_node_id = nid
                    break

        target_degree = None
        target_betweenness = None
        target_pagerank = None

        if target_node_id and target_node_id in adj:
            target_degree = len(adj[target_node_id])
            
            # Approximate ego-betweenness
            ego_neighbors = adj[target_node_id]
            if len(ego_neighbors) >= 2:
                internal_links = 0
                ego_list = list(ego_neighbors)
                for i in range(len(ego_list)):
                    for j in range(i + 1, len(ego_list)):
                        if ego_list[j] in adj[ego_list[i]]:
                            internal_links += 1
                max_internal = len(ego_list) * (len(ego_list) - 1) / 2.0
                density_ego = internal_links / max_internal if max_internal > 0 else 0.0
                target_betweenness = round((1.0 - density_ego) * (len(ego_neighbors) / max(v_count - 1, 1)), 4)
            else:
                target_betweenness = 0.0

            # Approximate PageRank
            target_pagerank = round(max(target_degree / max(2 * max(e_count, 1), 1), 0.01), 4)

        return {
            "node_count": v_count,
            "edge_count": e_count,
            "density": density,
            "components_count": components_count,
            "avg_clustering": avg_clustering,
            "target_degree": target_degree,
            "target_betweenness": target_betweenness,
            "target_pagerank": target_pagerank,
            "target_node_id": target_node_id
        }

    @classmethod
    def filter_subgraph_by_scenario(
        cls,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        scenario_type: AblationScenarioType,
        target_name_or_id: Optional[str] = None,
        source_name_or_id: Optional[str] = None,
        target_entity_filter: Optional[str] = None,
        relationship_type_filter: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], int, List[str]]:
        """
        Applies ablation filter on graph topology.
        Returns: (ablated_nodes, ablated_edges, excluded_count, excluded_categories)
        """
        cdr_edge_labels = {"CALLED", "MESSAGED", "USES_PHONE_NUMBER", "TELECOM_CONTACT"}
        location_edge_labels = {"LOCATED_AT", "VISITED", "OPERATES_IN_LOCATION", "NEAR_TOWER"}
        financial_edge_labels = {"TRANSFERRED", "TRANSFERS_FUNDS_TO", "CONTROLS_BANK_ACCOUNT", "FINANCIAL_TRANSACTION"}

        excluded_count = 0
        excluded_categories: List[str] = []

        if scenario_type == AblationScenarioType.FULL_EVIDENCE:
            return list(nodes), list(edges), 0, []

        elif scenario_type == AblationScenarioType.WITHOUT_CDR:
            filtered_edges = []
            for e in edges:
                lbl = str(e.get("label", "")).upper()
                if lbl in cdr_edge_labels or "CALL" in lbl or "SMS" in lbl:
                    excluded_count += 1
                else:
                    filtered_edges.append(e)

            # Keep only nodes with remaining edges or non-Phone nodes
            remaining_edge_nodes = set()
            for e in filtered_edges:
                remaining_edge_nodes.add(e["source"])
                remaining_edge_nodes.add(e["target"])

            filtered_nodes = []
            for n in nodes:
                lbl = str(n.get("label", "")).upper()
                # If Phone node and no remaining edges, exclude
                if lbl in {"PHONE", "PHONENUMBER"} and n["id"] not in remaining_edge_nodes:
                    excluded_count += 1
                else:
                    filtered_nodes.append(n)

            excluded_categories = ["Call Detail Records (CDR)", "SMS Logs", "Telecom Edge Intercepts"]
            return filtered_nodes, filtered_edges, excluded_count, excluded_categories

        elif scenario_type == AblationScenarioType.WITHOUT_LOCATION:
            filtered_edges = []
            for e in edges:
                lbl = str(e.get("label", "")).upper()
                if lbl in location_edge_labels or "LOCAT" in lbl or "VISIT" in lbl:
                    excluded_count += 1
                else:
                    filtered_edges.append(e)

            remaining_edge_nodes = set()
            for e in filtered_edges:
                remaining_edge_nodes.add(e["source"])
                remaining_edge_nodes.add(e["target"])

            filtered_nodes = []
            for n in nodes:
                lbl = str(n.get("label", "")).upper()
                if lbl in {"LOCATION", "CELL_TOWER", "TOWER"} and n["id"] not in remaining_edge_nodes:
                    excluded_count += 1
                else:
                    filtered_nodes.append(n)

            excluded_categories = ["Cell Tower Azimuths", "Geo-coordinates", "Tower Triangulation", "Location Pings"]
            return filtered_nodes, filtered_edges, excluded_count, excluded_categories

        elif scenario_type == AblationScenarioType.WITHOUT_FINANCIAL:
            filtered_edges = []
            for e in edges:
                lbl = str(e.get("label", "")).upper()
                if lbl in financial_edge_labels or "TRANSF" in lbl or "ACCOUNT" in lbl or "HAWALA" in lbl:
                    excluded_count += 1
                else:
                    filtered_edges.append(e)

            remaining_edge_nodes = set()
            for e in filtered_edges:
                remaining_edge_nodes.add(e["source"])
                remaining_edge_nodes.add(e["target"])

            filtered_nodes = []
            for n in nodes:
                lbl = str(n.get("label", "")).upper()
                if lbl in {"ACCOUNT", "BANK_ACCOUNT", "FINANCIAL_ACCOUNT"} and n["id"] not in remaining_edge_nodes:
                    excluded_count += 1
                else:
                    filtered_nodes.append(n)

            excluded_categories = ["Bank Account Transfers", "Hawala Ledger Entries", "UPI / Mule Transactions"]
            return filtered_nodes, filtered_edges, excluded_count, excluded_categories

        elif scenario_type == AblationScenarioType.ENTITY_REMOVAL:
            if not target_name_or_id:
                return list(nodes), list(edges), 0, []

            query = target_name_or_id.strip().lower()
            target_ids = set()
            for n in nodes:
                nid = n["id"].lower()
                name = str(n.get("name", "")).lower()
                if query == nid or query in name or name in query:
                    target_ids.add(n["id"])

            filtered_nodes = [n for n in nodes if n["id"] not in target_ids]
            filtered_edges = [e for e in edges if e["source"] not in target_ids and e["target"] not in target_ids]

            excluded_count = (len(nodes) - len(filtered_nodes)) + (len(edges) - len(filtered_edges))
            excluded_categories = [f"Entity [{target_name_or_id}] and all incident communication/transaction edges"]
            return filtered_nodes, filtered_edges, excluded_count, excluded_categories

        elif scenario_type == AblationScenarioType.RELATIONSHIP_REMOVAL:
            src_query = (source_name_or_id or "").strip().lower()
            tgt_query = (target_entity_filter or "").strip().lower()
            rel_filter = (relationship_type_filter or "").strip().upper()

            filtered_edges = []
            for e in edges:
                s_id = str(e.get("source", "")).lower()
                t_id = str(e.get("target", "")).lower()
                lbl = str(e.get("label", "")).upper()

                match_src = (src_query in s_id or src_query in t_id)
                match_tgt = (tgt_query in s_id or tgt_query in t_id)
                match_rel = (not rel_filter or rel_filter in lbl)

                if match_src and match_tgt and match_rel:
                    excluded_count += 1
                else:
                    filtered_edges.append(e)

            excluded_categories = [f"Relationship edge(s) between [{source_name_or_id}] and [{target_entity_filter}]"]
            return list(nodes), filtered_edges, excluded_count, excluded_categories

        return list(nodes), list(edges), 0, []

    @classmethod
    def evaluate_hypothesis_resilience(
        cls,
        scenario_type: AblationScenarioType,
        baseline_confidence: float,
        baseline_metrics: Dict[str, Any],
        scenario_metrics: Dict[str, Any],
        hypothesis_statement: str,
        target_entity: Optional[str] = None
    ) -> Tuple[float, float, HypothesisSurvivalStatus, List[str], List[str]]:
        """
        Determines the shift in hypothesis confidence, survival status,
        surviving vs emergent alternative explanations, and key vulnerabilities.
        """
        delta_edges = scenario_metrics["edge_count"] - baseline_metrics["edge_count"]
        delta_density = scenario_metrics["density"] - baseline_metrics["density"]
        delta_components = scenario_metrics["components_count"] - baseline_metrics["components_count"]

        # Base penalty from topological disconnection
        drop_factor = 0.0
        hyp_lower = hypothesis_statement.lower()

        if scenario_type == AblationScenarioType.FULL_EVIDENCE:
            return baseline_confidence, 0.0, HypothesisSurvivalStatus.ROBUST, [
                "Full multi-modal corroboration: CDR call bursts align with location and financial ledgers."
            ], []

        # Modality sensitivity weighting
        if scenario_type == AblationScenarioType.WITHOUT_CDR:
            telecom_reliant = any(w in hyp_lower for w in ["call", "phone", "communicat", "burner", "contact", "coordinat"])
            drop_factor = 0.35 if telecom_reliant else 0.20
            # If target node lost all connections
            if scenario_metrics.get("target_degree") == 0:
                drop_factor += 0.25

        elif scenario_type == AblationScenarioType.WITHOUT_LOCATION:
            geo_reliant = any(w in hyp_lower for w in ["scene", "location", "met", "physical", "tower", "presence", "co-presence"])
            drop_factor = 0.40 if geo_reliant else 0.18

        elif scenario_type == AblationScenarioType.WITHOUT_FINANCIAL:
            finance_reliant = any(w in hyp_lower for w in ["money", "bribe", "hawala", "transfer", "bank", "fund", "payment", "paid"])
            drop_factor = 0.45 if finance_reliant else 0.22

        elif scenario_type == AblationScenarioType.ENTITY_REMOVAL:
            # If removing entity fragmented the network
            if delta_components > 0:
                drop_factor = 0.50 + min(delta_components * 0.1, 0.3)
            else:
                drop_factor = 0.30

        elif scenario_type == AblationScenarioType.RELATIONSHIP_REMOVAL:
            drop_factor = 0.30 if delta_components > 0 else 0.15

        # Penalize if components partitioned
        if delta_components > 1:
            drop_factor += 0.10

        confidence = max(round(baseline_confidence * (1.0 - drop_factor), 3), 0.05)
        confidence_delta = round(confidence - baseline_confidence, 3)

        # Determine survival status
        if confidence >= 0.70:
            status = HypothesisSurvivalStatus.ROBUST
        elif confidence >= 0.45:
            status = HypothesisSurvivalStatus.MODERATELY_DEGRADED
        elif confidence >= 0.20:
            status = HypothesisSurvivalStatus.HIGHLY_FRAGILE
        else:
            status = HypothesisSurvivalStatus.COLLAPSED

        # Formulate alternative explanations & key vulnerabilities
        alt_explanations: List[str] = []
        vulnerabilities: List[str] = []

        if scenario_type == AblationScenarioType.WITHOUT_CDR:
            alt_explanations.append(
                "Coincidental or Indirect Proximity: Without direct CDR logs, physical co-presence or parallel financial transfers may reflect independent, uncoordinated events."
            )
            alt_explanations.append(
                "Legitimate Commercial Intermediation: Intermediaries could have transacted for lawful commercial purposes without conspiratorial coordination."
            )
            vulnerabilities.append("Hypothesis relies heavily on telecommunication frequency to infer conspiratorial intent.")
            vulnerabilities.append("No independent physical verification exists if CDR tower/call records are suppressed or challenged under BSA Section 63.")

        elif scenario_type == AblationScenarioType.WITHOUT_LOCATION:
            alt_explanations.append(
                "Remote / Third-Party Instruction: Without location triangulation, suspects may have been in distinct jurisdictions with no physical meeting taking place."
            )
            alt_explanations.append(
                "Alibi Plausibility: Absence of geo-triangulation allows defensible alibi assertions that phones were operated by third parties."
            )
            vulnerabilities.append("Inability to place subjects at the physical scene of meeting or crime without cell tower data.")

        elif scenario_type == AblationScenarioType.WITHOUT_FINANCIAL:
            alt_explanations.append(
                "Non-Pecuniary Association: Without ledger transactions, relationships could be strictly social, familial, or non-criminal."
            )
            alt_explanations.append(
                "Independent Business Transactions: In the absence of bank audit trails, any alleged quid-pro-quo lacks quantitative proof."
            )
            vulnerabilities.append("Motive and quid-pro-quo benefit cannot be independently established without financial ledgers.")

        elif scenario_type == AblationScenarioType.ENTITY_REMOVAL:
            entity_label = target_entity or "Target Entity"
            alt_explanations.append(
                f"Autonomous Sub-Clusters: Removal of {entity_label} reveals whether peripheral nodes communicate via secondary channels or if {entity_label} was a sole broker."
            )
            vulnerabilities.append(f"Network is vulnerable to single-node fragmentation around {entity_label}.")

        elif scenario_type == AblationScenarioType.RELATIONSHIP_REMOVAL:
            alt_explanations.append(
                "Alternative Information Paths: Severing this specific link evaluates whether intelligence could have flowed through secondary multi-hop intermediaries."
            )
            vulnerabilities.append("Critical choke-point edge: Hypothesis strength hinges significantly on the validity of this single relation.")

        return confidence, confidence_delta, status, alt_explanations, vulnerabilities

    @classmethod
    def run_comparative_ablation(
        cls,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        hypothesis_statement: str,
        target_entity: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes the full 4-way comparative balance matrix:
        1. Full Evidence Baseline
        2. Without CDR
        3. Without Location
        4. Without Financial Data
        Calculates sensitivity analysis, SPOF identification, and fragility score.
        """
        baseline_metrics = cls._calculate_graph_metrics(nodes, edges, target_entity)
        
        # Initial baseline confidence: higher if multi-modal density exists, default ~ 0.85
        baseline_confidence = 0.85 if len(edges) >= 5 else 0.72

        scenarios_to_run = [
            (AblationScenarioType.FULL_EVIDENCE, "Full Evidence (Baseline)", "All CDR, cell-tower locations, bank transactions, and witness reports included."),
            (AblationScenarioType.WITHOUT_CDR, "Evidence without CDR", "Telecommunication logs, call frequency, and SMS edges ablated."),
            (AblationScenarioType.WITHOUT_LOCATION, "Evidence without Location", "Cell tower triangulation, tower dumps, and geo-presence records ablated."),
            (AblationScenarioType.WITHOUT_FINANCIAL, "Evidence without Financial Data", "Bank account statements, UPI logs, and hawala ledger edges ablated."),
        ]

        scenario_results: List[AblatedScenarioResult] = []
        lowest_conf = baseline_confidence
        lowest_scenario = "Full Evidence"
        spofs: List[str] = []

        for stype, sname, sdesc in scenarios_to_run:
            ab_nodes, ab_edges, exc_count, exc_cats = cls.filter_subgraph_by_scenario(
                nodes, edges, stype, target_entity
            )
            metrics = cls._calculate_graph_metrics(ab_nodes, ab_edges, target_entity)

            # Calculate metric deltas
            metric_delta = ScenarioMetricDelta(
                node_count=metrics["node_count"],
                edge_count=metrics["edge_count"],
                density=metrics["density"],
                components_count=metrics["components_count"],
                avg_clustering=metrics["avg_clustering"],
                target_degree=metrics.get("target_degree"),
                target_betweenness=metrics.get("target_betweenness"),
                target_pagerank=metrics.get("target_pagerank"),
                delta_nodes=metrics["node_count"] - baseline_metrics["node_count"],
                delta_edges=metrics["edge_count"] - baseline_metrics["edge_count"],
                delta_density=round(metrics["density"] - baseline_metrics["density"], 4),
                delta_components=metrics["components_count"] - baseline_metrics["components_count"],
                delta_target_degree=(
                    metrics.get("target_degree") - baseline_metrics.get("target_degree")
                    if metrics.get("target_degree") is not None and baseline_metrics.get("target_degree") is not None
                    else None
                ),
                delta_target_betweenness=(
                    round(metrics.get("target_betweenness") - baseline_metrics.get("target_betweenness"), 4)
                    if metrics.get("target_betweenness") is not None and baseline_metrics.get("target_betweenness") is not None
                    else None
                ),
            )

            conf, delta_c, status, alts, vulns = cls.evaluate_hypothesis_resilience(
                stype, baseline_confidence, baseline_metrics, metrics, hypothesis_statement, target_entity
            )

            if stype != AblationScenarioType.FULL_EVIDENCE:
                if conf < lowest_conf:
                    lowest_conf = conf
                    lowest_scenario = sname
                
                # Single Point of Failure detection: drop >= 0.35 or confidence < 0.40
                if abs(delta_c) >= 0.35 or conf < 0.40:
                    spofs.append(f"{sname} (Confidence drop: {delta_c:+0.2f})")

            scenario_results.append(
                AblatedScenarioResult(
                    scenario_type=stype,
                    scenario_name=sname,
                    description=sdesc,
                    excluded_elements_count=exc_count,
                    excluded_categories=exc_cats,
                    metrics=metrics,
                    metric_deltas=metric_delta,
                    hypothesis_confidence=conf,
                    confidence_delta=delta_c,
                    alternative_explanations=alts,
                    key_vulnerabilities=vulns,
                    survival_status=status
                )
            )

        # Overall fragility score: 1.0 - (lowest_conf / baseline_confidence)
        max_drop = round(baseline_confidence - lowest_conf, 3)
        fragility_score = round(max(min(max_drop / baseline_confidence, 1.0), 0.0), 3)

        if lowest_conf >= 0.65:
            overall_status = HypothesisSurvivalStatus.ROBUST
            finding = "Hypothesis demonstrates high multi-modal resilience across all ablated dimensions."
        elif lowest_conf >= 0.45:
            overall_status = HypothesisSurvivalStatus.MODERATELY_DEGRADED
            finding = f"Hypothesis shows moderate dependency on {lowest_scenario}; secondary corroboration is recommended."
        elif lowest_conf >= 0.25:
            overall_status = HypothesisSurvivalStatus.HIGHLY_FRAGILE
            finding = f"Hypothesis is highly fragile; suppressing {lowest_scenario} critically impairs evidentiary weight."
        else:
            overall_status = HypothesisSurvivalStatus.COLLAPSED
            finding = f"Hypothesis collapses when {lowest_scenario} is omitted; constitutes a critical single point of failure."

        summary = SensitivityAnalysisSummary(
            baseline_confidence=baseline_confidence,
            lowest_confidence_scenario=lowest_scenario,
            max_confidence_drop=max_drop,
            overall_fragility_score=fragility_score,
            single_points_of_failure=spofs,
            survival_status=overall_status,
            synthesis_finding=finding,
            legal_statutory_disclaimer=cls.STATUTORY_SAFEGUARD
        )

        return {
            "baseline_metrics": baseline_metrics,
            "scenarios": scenario_results,
            "sensitivity_summary": summary,
            "overall_fragility_score": fragility_score
        }

    @classmethod
    def simulate_entity_removal(
        cls,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        entity_name: str,
        hypothesis_statement: str
    ) -> Dict[str, Any]:
        """
        Simulates removing a specific entity and measures network fragmentation and hypothesis survival.
        """
        baseline_metrics = cls._calculate_graph_metrics(nodes, edges, entity_name)
        baseline_confidence = 0.85

        ab_nodes, ab_edges, exc_count, exc_cats = cls.filter_subgraph_by_scenario(
            nodes, edges, AblationScenarioType.ENTITY_REMOVAL, target_name_or_id=entity_name
        )
        metrics = cls._calculate_graph_metrics(ab_nodes, ab_edges)

        metric_delta = ScenarioMetricDelta(
            node_count=metrics["node_count"],
            edge_count=metrics["edge_count"],
            density=metrics["density"],
            components_count=metrics["components_count"],
            avg_clustering=metrics["avg_clustering"],
            delta_nodes=metrics["node_count"] - baseline_metrics["node_count"],
            delta_edges=metrics["edge_count"] - baseline_metrics["edge_count"],
            delta_density=round(metrics["density"] - baseline_metrics["density"], 4),
            delta_components=metrics["components_count"] - baseline_metrics["components_count"],
        )

        conf, delta_c, status, alts, vulns = cls.evaluate_hypothesis_resilience(
            AblationScenarioType.ENTITY_REMOVAL,
            baseline_confidence,
            baseline_metrics,
            metrics,
            hypothesis_statement,
            entity_name
        )

        scenario_res = AblatedScenarioResult(
            scenario_type=AblationScenarioType.ENTITY_REMOVAL,
            scenario_name=f"Simulated Removal of [{entity_name}]",
            description=f"Evaluates network topology and hypothesis resilience if {entity_name} is removed from consideration.",
            excluded_elements_count=exc_count,
            excluded_categories=exc_cats,
            metrics=metrics,
            metric_deltas=metric_delta,
            hypothesis_confidence=conf,
            confidence_delta=delta_c,
            alternative_explanations=alts,
            key_vulnerabilities=vulns,
            survival_status=status
        )

        fragility = round(abs(delta_c) / baseline_confidence, 3)
        spofs = [f"Entity [{entity_name}]"] if abs(delta_c) >= 0.35 else []

        summary = SensitivityAnalysisSummary(
            baseline_confidence=baseline_confidence,
            lowest_confidence_scenario=f"Removal of {entity_name}",
            max_confidence_drop=round(abs(delta_c), 3),
            overall_fragility_score=fragility,
            single_points_of_failure=spofs,
            survival_status=status,
            synthesis_finding=(
                f"Removing {entity_name} caused network to fragment into {metrics['components_count']} components "
                f"with {delta_c:+0.2f} shift in hypothesis confidence."
            ),
            legal_statutory_disclaimer=cls.STATUTORY_SAFEGUARD
        )

        return {
            "baseline_metrics": baseline_metrics,
            "scenario": scenario_res,
            "sensitivity_summary": summary,
            "overall_fragility_score": fragility
        }

    @classmethod
    def simulate_relationship_removal(
        cls,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        source_entity: str,
        target_entity: str,
        relationship_type: Optional[str],
        hypothesis_statement: str
    ) -> Dict[str, Any]:
        """
        Simulates severing a specific relationship edge.
        """
        baseline_metrics = cls._calculate_graph_metrics(nodes, edges, source_entity)
        baseline_confidence = 0.85

        ab_nodes, ab_edges, exc_count, exc_cats = cls.filter_subgraph_by_scenario(
            nodes,
            edges,
            AblationScenarioType.RELATIONSHIP_REMOVAL,
            source_name_or_id=source_entity,
            target_entity_filter=target_entity,
            relationship_type_filter=relationship_type
        )
        metrics = cls._calculate_graph_metrics(ab_nodes, ab_edges, source_entity)

        metric_delta = ScenarioMetricDelta(
            node_count=metrics["node_count"],
            edge_count=metrics["edge_count"],
            density=metrics["density"],
            components_count=metrics["components_count"],
            avg_clustering=metrics["avg_clustering"],
            delta_nodes=metrics["node_count"] - baseline_metrics["node_count"],
            delta_edges=metrics["edge_count"] - baseline_metrics["edge_count"],
            delta_density=round(metrics["density"] - baseline_metrics["density"], 4),
            delta_components=metrics["components_count"] - baseline_metrics["components_count"],
        )

        conf, delta_c, status, alts, vulns = cls.evaluate_hypothesis_resilience(
            AblationScenarioType.RELATIONSHIP_REMOVAL,
            baseline_confidence,
            baseline_metrics,
            metrics,
            hypothesis_statement,
            source_entity
        )

        rel_desc = f"{relationship_type or 'Edge'} between [{source_entity}] and [{target_entity}]"
        scenario_res = AblatedScenarioResult(
            scenario_type=AblationScenarioType.RELATIONSHIP_REMOVAL,
            scenario_name=f"Severing {rel_desc}",
            description=f"Simulates counterfactual elimination of {rel_desc} to test if alternative pathways maintain network connectivity.",
            excluded_elements_count=exc_count,
            excluded_categories=exc_cats,
            metrics=metrics,
            metric_deltas=metric_delta,
            hypothesis_confidence=conf,
            confidence_delta=delta_c,
            alternative_explanations=alts,
            key_vulnerabilities=vulns,
            survival_status=status
        )

        fragility = round(abs(delta_c) / baseline_confidence, 3)
        spofs = [rel_desc] if abs(delta_c) >= 0.35 else []

        summary = SensitivityAnalysisSummary(
            baseline_confidence=baseline_confidence,
            lowest_confidence_scenario=f"Severing {rel_desc}",
            max_confidence_drop=round(abs(delta_c), 3),
            overall_fragility_score=fragility,
            single_points_of_failure=spofs,
            survival_status=status,
            synthesis_finding=(
                f"Severing edge between {source_entity} and {target_entity} resulted in confidence delta of {delta_c:+0.2f}. "
                f"Hypothesis is rated {status.value}."
            ),
            legal_statutory_disclaimer=cls.STATUTORY_SAFEGUARD
        )

        return {
            "baseline_metrics": baseline_metrics,
            "scenario": scenario_res,
            "sensitivity_summary": summary,
            "overall_fragility_score": fragility
        }
