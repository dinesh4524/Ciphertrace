import math
from collections import defaultdict, deque
import heapq
from typing import Any, Dict, List, Optional, Set, Tuple


class GraphAnalyticsEngine:
    """
    Self-contained pure-Python Graph Analytics & Hidden-Link Machine Learning Engine.
    Engineered specifically for criminal network topology, forensic cut-out analysis,
    Adamic-Adar rare contact scoring, and syndication community detection.
    """

    @staticmethod
    def calculate_centralities(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        damping: float = 0.85,
        max_iter: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Computes Degree, Betweenness (Brandes), Closeness, and PageRank centralities,
        and derives the investigative role archetype for each node.
        """
        node_ids = [n["id"] for n in nodes]
        n_count = len(node_ids)
        if n_count == 0:
            return []

        # Build adjacency graph (undirected representation for structural analysis)
        adj: Dict[str, Set[str]] = {nid: set() for nid in node_ids}
        directed_out: Dict[str, Set[str]] = {nid: set() for nid in node_ids}
        directed_in: Dict[str, Set[str]] = {nid: set() for nid in node_ids}

        for edge in edges:
            src = edge["source"]
            tgt = edge["target"]
            if src in adj and tgt in adj:
                adj[src].add(tgt)
                adj[tgt].add(src)
                directed_out[src].add(tgt)
                directed_in[tgt].add(src)

        norm_factor = max(n_count - 1, 1)

        # 1. Degree Centrality
        degree_centrality: Dict[str, float] = {}
        for nid in node_ids:
            degree_centrality[nid] = round(len(adj[nid]) / norm_factor, 4)

        # 2. Closeness Centrality (Harmonic-augmented for disconnected components)
        closeness_centrality: Dict[str, float] = {}
        for s in node_ids:
            dist: Dict[str, int] = {s: 0}
            queue = deque([s])
            while queue:
                curr = queue.popleft()
                for neighbor in adj[curr]:
                    if neighbor not in dist:
                        dist[neighbor] = dist[curr] + 1
                        queue.append(neighbor)
            
            # Sum reciprocal distances (Harmonic Closeness avoids div-by-zero on disconnected graphs)
            harmonic_sum = sum(1.0 / d for target, d in dist.items() if target != s and d > 0)
            closeness_centrality[s] = round(harmonic_sum / norm_factor, 4)

        # 3. Betweenness Centrality (Brandes' Algorithm O(V * E))
        betweenness: Dict[str, float] = {nid: 0.0 for nid in node_ids}
        for s in node_ids:
            stack: List[str] = []
            pred: Dict[str, List[str]] = {w: [] for w in node_ids}
            sigma: Dict[str, int] = {w: 0 for w in node_ids}
            sigma[s] = 1
            d: Dict[str, int] = {w: -1 for w in node_ids}
            d[s] = 0
            q = deque([s])

            while q:
                v = q.popleft()
                stack.append(v)
                for w in adj[v]:
                    if d[w] < 0:
                        d[w] = d[v] + 1
                        q.append(w)
                    if d[w] == d[v] + 1:
                        sigma[w] += sigma[v]
                        pred[w].append(v)

            delta: Dict[str, float] = {w: 0.0 for w in node_ids}
            while stack:
                w = stack.pop()
                for v in pred[w]:
                    if sigma[w] > 0:
                        delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w])
                if w != s:
                    betweenness[w] += delta[w]

        # Normalize betweenness
        b_scale = ((n_count - 1) * (n_count - 2) / 2.0) if n_count > 2 else 1.0
        for nid in node_ids:
            betweenness[nid] = round(betweenness[nid] / b_scale, 4) if b_scale > 0 else 0.0

        # 4. PageRank (Power Iteration)
        pr: Dict[str, float] = {nid: 1.0 / n_count for nid in node_ids}
        for _ in range(max_iter):
            next_pr: Dict[str, float] = {}
            dangling_sum = sum(pr[nid] for nid in node_ids if len(adj[nid]) == 0)
            for nid in node_ids:
                incoming_sum = sum(pr[neighbor] / len(adj[neighbor]) for neighbor in adj[nid] if len(adj[neighbor]) > 0)
                next_pr[nid] = (1.0 - damping) / n_count + damping * (incoming_sum + dangling_sum / n_count)
            pr = next_pr

        for nid in node_ids:
            pr[nid] = round(pr[nid], 4)

        # 5. Eigenvector Centrality (Power Iteration: A * x = lambda * x)
        ev: Dict[str, float] = {nid: 1.0 / math.sqrt(n_count) for nid in node_ids}
        for _ in range(max_iter):
            next_ev: Dict[str, float] = {}
            for nid in node_ids:
                next_ev[nid] = sum(ev[neighbor] for neighbor in adj[nid])
            norm = math.sqrt(sum(val * val for val in next_ev.values()))
            if norm > 1e-9:
                for nid in node_ids:
                    ev[nid] = next_ev[nid] / norm
            else:
                break
        for nid in node_ids:
            ev[nid] = round(ev[nid], 4)

        # 6. Local Clustering Coefficient C_i = 2 * e_i / (k_i * (k_i - 1))
        local_clustering: Dict[str, float] = {}
        for nid in node_ids:
            neighbors = list(adj[nid])
            k_i = len(neighbors)
            if k_i < 2:
                local_clustering[nid] = 0.0
            else:
                # Count mutual edges between neighbors
                triangle_edges = 0
                for idx_a in range(k_i):
                    for idx_b in range(idx_a + 1, k_i):
                        if neighbors[idx_b] in adj[neighbors[idx_a]]:
                            triangle_edges += 1
                local_clustering[nid] = round((2.0 * triangle_edges) / (k_i * (k_i - 1)), 4)

        # 7. Coreness (k-Core Decomposition)
        k_core_res = GraphAnalyticsEngine.calculate_k_core(nodes, edges)
        node_coreness = k_core_res.get("node_coreness", {nid: 0 for nid in node_ids})

        # 8. Role Archetype Classification
        max_deg = max(degree_centrality.values()) if degree_centrality else 0.0
        max_bet = max(betweenness.values()) if betweenness else 0.0
        max_clo = max(closeness_centrality.values()) if closeness_centrality else 0.0
        max_pr = max(pr.values()) if pr else 0.0
        max_ev = max(ev.values()) if ev else 0.0

        results: List[Dict[str, Any]] = []
        node_map = {n["id"]: n for n in nodes}

        for nid in node_ids:
            deg = degree_centrality[nid]
            bet = betweenness[nid]
            clo = closeness_centrality[nid]
            pgr = pr[nid]
            ev_val = ev[nid]
            lcc = local_clustering[nid]
            core_val = node_coreness.get(nid, 0)
            node_info = node_map[nid]

            # Relative ratios
            r_deg = deg / max_deg if max_deg > 0 else 0.0
            r_bet = bet / max_bet if max_bet > 0 else 0.0
            r_clo = clo / max_clo if max_clo > 0 else 0.0
            r_pr = pgr / max_pr if max_pr > 0 else 0.0

            # Classification heuristic
            if r_pr >= 0.75 and r_clo >= 0.6 and r_deg <= 0.6:
                archetype = "KINGPIN_INFLUENCER"
                justification = "High global authority and closeness, but insulated with low direct operational edges."
            elif r_bet >= 0.65 and r_bet > r_deg:
                archetype = "COMMUNICATION_BROKER"
                justification = "High betweenness bridging distinct sub-syndicates or operational cut-outs."
            elif r_deg >= 0.7:
                archetype = "OPERATIONAL_HUB"
                justification = "High degree of direct transactions and communication; key execution node."
            elif r_deg >= 0.3:
                archetype = "SYNDICATE_OPERATIVE"
                justification = "Active member connected within an operational cluster."
            else:
                archetype = "PERIPHERAL_ASSOCIATE"
                justification = "Low connectivity node; likely incidental contact or end recipient."

            composite_threat = round((r_pr * 0.35 + r_bet * 0.30 + r_deg * 0.25 + r_clo * 0.10) * 100, 1)

            results.append({
                "node_id": nid,
                "name": node_info.get("name", nid),
                "label": node_info.get("label", "Entity"),
                "degree_centrality": deg,
                "betweenness_centrality": bet,
                "closeness_centrality": clo,
                "pagerank": pgr,
                "eigenvector_centrality": ev_val,
                "local_clustering_coefficient": lcc,
                "coreness": core_val,
                "archetype": archetype,
                "justification": justification,
                "composite_threat_score": composite_threat,
                "connections_count": len(adj[nid]),
                "non_culpability_caveat": (
                    "Judicial Notice (Section 63 BSA 2023): Network centrality indicates structural prominence "
                    "or communication flow, NOT criminal culpability or guilt. High centrality can correspond to "
                    "legitimate commercial services, telecom routing gateways, or innocent intermediaries."
                )
            })

        results.sort(key=lambda x: x["composite_threat_score"], reverse=True)
        return results

    @staticmethod
    def detect_communities(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        max_iterations: int = 20
    ) -> Dict[str, Any]:
        """
        Partitions the graph into criminal cells/gangs using an asynchronous Label Propagation
        & Modularity optimization algorithm.
        """
        node_ids = [n["id"] for n in nodes]
        if not node_ids:
            return {"communities": [], "modularity": 0.0, "total_communities": 0}

        adj: Dict[str, List[str]] = {nid: [] for nid in node_ids}
        node_map = {n["id"]: n for n in nodes}

        for edge in edges:
            s, t = edge["source"], edge["target"]
            if s in adj and t in adj:
                adj[s].append(t)
                adj[t].append(s)

        # Label Propagation Initialization: Each node begins in its own community
        labels: Dict[str, str] = {nid: nid for nid in node_ids}

        for _ in range(max_iterations):
            changed = False
            for nid in node_ids:
                neighbors = adj[nid]
                if not neighbors:
                    continue
                # Count neighbor labels
                label_counts: Dict[str, int] = defaultdict(int)
                for nb in neighbors:
                    label_counts[labels[nb]] += 1
                
                # Pick most frequent label (tie-break deterministically)
                max_freq = max(label_counts.values())
                best_labels = [lbl for lbl, count in label_counts.items() if count == max_freq]
                best_label = min(best_labels) # deterministic
                
                if labels[nid] != best_label:
                    labels[nid] = best_label
                    changed = True
            if not changed:
                break

        # Group into communities
        comm_groups: Dict[str, List[str]] = defaultdict(list)
        for nid, lbl in labels.items():
            comm_groups[lbl].append(nid)

        # Compute community details
        communities: List[Dict[str, Any]] = []
        idx = 1

        for _, member_ids in sorted(comm_groups.items(), key=lambda x: len(x[1]), reverse=True):
            member_set = set(member_ids)
            internal_edges = 0
            external_edges = 0

            for mid in member_ids:
                for nb in adj[mid]:
                    if nb in member_set:
                        internal_edges += 1
                    else:
                        external_edges += 1
            internal_edges //= 2 # Undirected

            # Find cell centroid (highest degree within community)
            centroid_id = max(member_ids, key=lambda mid: len(adj[mid]))
            centroid_name = node_map[centroid_id].get("name", centroid_id)

            member_details = [
                {
                    "node_id": mid,
                    "name": node_map[mid].get("name", mid),
                    "label": node_map[mid].get("label", "Entity"),
                    "internal_connections": sum(1 for nb in adj[mid] if nb in member_set)
                }
                for mid in member_ids
            ]

            possible_internal = len(member_ids) * (len(member_ids) - 1) // 2 if len(member_ids) > 1 else 1
            density = round(internal_edges / possible_internal, 3) if possible_internal > 0 else 1.0

            communities.append({
                "community_id": f"CELL-{idx:02d}",
                "name": f"Syndicate Cluster {idx} (Lead: {centroid_name})",
                "centroid_node_id": centroid_id,
                "centroid_name": centroid_name,
                "size": len(member_ids),
                "internal_edges": internal_edges,
                "external_edges": external_edges,
                "density": density,
                "members": member_details
            })
            idx += 1

        # Calculate Newman-Girvan Modularity Q
        m = len(edges)
        if m == 0:
            q_score = 0.0
        else:
            q_sum = 0.0
            for comm in communities:
                Lc = comm["internal_edges"]
                dc = (2 * comm["internal_edges"]) + comm["external_edges"]
                q_sum += (Lc / m) - (dc / (2 * m)) ** 2
            q_score = round(q_sum, 4)

        return {
            "communities": communities,
            "modularity": q_score,
            "total_communities": len(communities)
        }

    @staticmethod
    def find_shortest_path(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        source_id: str,
        target_id: str
    ) -> Dict[str, Any]:
        """
        Dijkstra shortest-path algorithm between two nodes with chain-of-custody link weights.
        Returns node sequence, connecting edge labels, confidence path product, and distance.
        """
        node_map = {n["id"]: n for n in nodes}
        if source_id not in node_map or target_id not in node_map:
            return {"found": False, "hops": 0, "path_nodes": [], "path_edges": [], "composite_confidence": 0.0}

        # Build weighted adjacency list
        # Weight = 1.0 / max(confidence, 0.1)
        adj: Dict[str, List[Tuple[str, float, Dict[str, Any]]]] = defaultdict(list)
        for e in edges:
            s, t = e["source"], e["target"]
            conf = float(e.get("confidence", 0.9))
            weight = round(1.0 / max(conf, 0.1), 3)
            adj[s].append((t, weight, e))
            adj[t].append((s, weight, e))

        # Priority queue for Dijkstra: (cumulative_weight, current_node, path_nodes, path_edges)
        pq: List[Tuple[float, str, List[str], List[Dict[str, Any]]]] = [(0.0, source_id, [source_id], [])]
        visited: Set[str] = set()

        while pq:
            cost, curr, path_n, path_e = heapq.heappop(pq)
            if curr == target_id:
                # Found shortest path
                conf_prod = 1.0
                for edge in path_e:
                    conf_prod *= float(edge.get("confidence", 0.9))

                node_steps = [
                    {
                        "step": i + 1,
                        "node_id": nid,
                        "name": node_map[nid].get("name", nid),
                        "label": node_map[nid].get("label", "Entity")
                    }
                    for i, nid in enumerate(path_n)
                ]

                return {
                    "found": True,
                    "hops": len(path_e),
                    "total_weight": round(cost, 3),
                    "composite_confidence": round(conf_prod, 4),
                    "path_nodes": node_steps,
                    "path_edges": path_e
                }

            if curr in visited:
                continue
            visited.add(curr)

            for neighbor, weight, edge_obj in adj[curr]:
                if neighbor not in visited:
                    heapq.heappush(pq, (cost + weight, neighbor, path_n + [neighbor], path_e + [edge_obj]))

        return {"found": False, "hops": 0, "path_nodes": [], "path_edges": [], "composite_confidence": 0.0}

    @staticmethod
    def predict_hidden_links(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        min_probability: float = 0.35,
        top_k: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Topological link prediction using Adamic-Adar, Jaccard Coefficient,
        and Common Neighbors.
        Crucial for uncovering hidden conspirators who communicate through shared burner phones
        or transact through identical mule bank accounts.
        """
        node_map = {n["id"]: n for n in nodes}
        node_ids = list(node_map.keys())

        # Build existing adjacency and edge set
        existing_edges: Set[Tuple[str, str]] = set()
        adj: Dict[str, Set[str]] = {nid: set() for nid in node_ids}

        for e in edges:
            s, t = e["source"], e["target"]
            if s in adj and t in adj:
                adj[s].add(t)
                adj[t].add(s)
                existing_edges.add((s, t))
                existing_edges.add((t, s))

        candidates: List[Dict[str, Any]] = []

        # Iterate over all unlinked pairs
        for i in range(len(node_ids)):
            u = node_ids[i]
            for j in range(i + 1, len(node_ids)):
                v = node_ids[j]

                # Skip if edge already exists or same node
                if (u, v) in existing_edges or u == v:
                    continue

                neighbors_u = adj[u]
                neighbors_v = adj[v]
                common = neighbors_u.intersection(neighbors_v)
                if not common:
                    continue

                # 1. Common Neighbors Count
                cn_count = len(common)

                # 2. Jaccard Coefficient
                union_len = len(neighbors_u.union(neighbors_v))
                jaccard = cn_count / union_len if union_len > 0 else 0.0

                # 3. Adamic-Adar Index: sum(1 / log(deg(w))) for w in common
                adamic_adar = 0.0
                for w in common:
                    deg_w = len(adj[w])
                    if deg_w > 1:
                        adamic_adar += 1.0 / math.log(deg_w)
                    elif deg_w == 1:
                        adamic_adar += 1.0 # default weight for single contact

                # 4. Preferential Attachment
                pref_attachment = len(neighbors_u) * len(neighbors_v)

                # 5. Composite Link Probability: sigmoid bounded in [0.0, 1.0]
                # High Adamic-Adar means common neighbors are rare contacts (like burner SIMs/safehouses)
                raw_score = (cn_count * 0.25) + (jaccard * 0.40) + (adamic_adar * 0.35)
                # Sigmoid squashing
                prob = round(1.0 / (1.0 + math.exp(-raw_score * 2.5)), 3)

                if prob >= min_probability:
                    common_names = [node_map[w].get("name", w) for w in list(common)[:3]]
                    explanation = (
                        f"Shares {cn_count} mutual link(s) including: {', '.join(common_names)}. "
                        f"Adamic-Adar rarity score: {round(adamic_adar, 2)}."
                    )

                    candidates.append({
                        "source_id": u,
                        "target_id": v,
                        "source_name": node_map[u].get("name", u),
                        "source_label": node_map[u].get("label", "Entity"),
                        "target_name": node_map[v].get("name", v),
                        "target_label": node_map[v].get("label", "Entity"),
                        "predicted_relation": "ASSOCIATED_WITH",
                        "probability": prob,
                        "adamic_adar_score": round(adamic_adar, 3),
                        "jaccard_coefficient": round(jaccard, 3),
                        "common_neighbors_count": cn_count,
                        "common_neighbor_names": common_names,
                        "reason": explanation
                    })

        candidates.sort(key=lambda x: x["probability"], reverse=True)
        return candidates[:top_k]

    @staticmethod
    def detect_graph_anomalies(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Detects topological anomalies:
        1. Cut-edges / Critical Bridges (edges whose failure partitions the network).
        2. Fan-In Mule Funnels (single node receiving edges from >= 3 distinct nodes).
        3. Fan-Out Smurfing (single node dispersing edges to >= 3 distinct nodes).
        4. High-Degree Cut-out Bottlenecks.
        """
        node_map = {n["id"]: n for n in nodes}
        node_ids = list(node_map.keys())

        adj: Dict[str, Set[str]] = {nid: set() for nid in node_ids}
        in_degree: Dict[str, List[str]] = defaultdict(list)
        out_degree: Dict[str, List[str]] = defaultdict(list)

        for e in edges:
            s, t = e["source"], e["target"]
            if s in adj and t in adj:
                adj[s].add(t)
                adj[t].add(s)
                out_degree[s].append(t)
                in_degree[t].append(s)

        anomalies: List[Dict[str, Any]] = []

        # 1. Fan-In Mule Funnel Detection (Smurfing Aggregation)
        for nid, senders in in_degree.items():
            unique_senders = set(senders)
            if len(unique_senders) >= 3:
                anomalies.append({
                    "anomaly_type": "FAN_IN_AGGREGATION",
                    "severity": "HIGH",
                    "entity_id": nid,
                    "entity_name": node_map[nid].get("name", nid),
                    "entity_label": node_map[nid].get("label", "Entity"),
                    "description": f"Suspected money funneling/mule aggregation: receives incoming flows from {len(unique_senders)} distinct entities.",
                    "associated_nodes": list(unique_senders)[:5]
                })

        # 2. Fan-Out Smurfing Dispersion
        for nid, receivers in out_degree.items():
            unique_receivers = set(receivers)
            if len(unique_receivers) >= 3:
                anomalies.append({
                    "anomaly_type": "FAN_OUT_DISPERSION",
                    "severity": "MEDIUM",
                    "entity_id": nid,
                    "entity_name": node_map[nid].get("name", nid),
                    "entity_label": node_map[nid].get("label", "Entity"),
                    "description": f"Suspected layered dispersion/smurfing: distributes outbound flows to {len(unique_receivers)} distinct entities.",
                    "associated_nodes": list(unique_receivers)[:5]
                })

        # 3. Critical Bridges (Tarjan's Bridge-Finding Algorithm O(V + E))
        visited: Set[str] = set()
        tin: Dict[str, int] = {}
        low: Dict[str, int] = {}
        timer = 0
        bridges: List[Dict[str, Any]] = []

        def dfs_bridge(v: str, p: Optional[str] = None):
            nonlocal timer
            visited.add(v)
            timer += 1
            tin[v] = low[v] = timer

            for to in adj[v]:
                if to == p:
                    continue
                if to in visited:
                    low[v] = min(low[v], tin[to])
                else:
                    dfs_bridge(to, v)
                    low[v] = min(low[v], low[to])
                    if low[to] > tin[v]:
                        # (v, to) is a bridge
                        bridges.append({
                            "source_id": v,
                            "source_name": node_map[v].get("name", v),
                            "target_id": to,
                            "target_name": node_map[to].get("name", to)
                        })

        for nid in node_ids:
            if nid not in visited:
                dfs_bridge(nid)

        for b in bridges:
            anomalies.append({
                "anomaly_type": "CRITICAL_BRIDGE",
                "severity": "CRITICAL",
                "entity_id": b["source_id"],
                "entity_name": f"{b['source_name']} <--> {b['target_name']}",
                "entity_label": "BridgeEdge",
                "description": f"Choke-point bridge: Severing communication between {b['source_name']} and {b['target_name']} partitions network clusters.",
                "associated_nodes": [b["source_id"], b["target_id"]]
            })

        return {
            "total_anomalies": len(anomalies),
            "anomalies": anomalies
        }

    @staticmethod
    def calculate_k_core(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Computes the k-core decomposition of the graph.
        A k-core is a maximal subgraph in which every vertex has degree at least k.
        Identifies the deeply embedded, cohesive sub-syndicate nucleus vs peripheral cut-outs.
        """
        node_map = {n["id"]: n for n in nodes}
        node_ids = list(node_map.keys())
        if not node_ids:
            return {"max_core": 0, "node_coreness": {}, "shells": []}

        # Build undirected adjacency
        adj: Dict[str, Set[str]] = {nid: set() for nid in node_ids}
        for e in edges:
            s, t = e["source"], e["target"]
            if s in adj and t in adj and s != t:
                adj[s].add(t)
                adj[t].add(s)

        # Batagelj-Zaversnik O(V + E) k-core algorithm
        degrees = {nid: len(adj[nid]) for nid in node_ids}
        coreness: Dict[str, int] = {}
        active_nodes = set(node_ids)

        k = 1
        while active_nodes:
            while True:
                # Find nodes with degree < k
                to_remove = [nid for nid in active_nodes if degrees[nid] < k]
                if not to_remove:
                    break
                for nid in to_remove:
                    coreness[nid] = k - 1
                    active_nodes.remove(nid)
                    for neighbor in adj[nid]:
                        if neighbor in active_nodes:
                            degrees[neighbor] -= 1
            k += 1

        # Any remaining nodes (should none, but safeguard)
        for nid in active_nodes:
            coreness[nid] = k - 1

        max_k = max(coreness.values()) if coreness else 0

        # Group by k-shell
        shells: List[Dict[str, Any]] = []
        for shell_k in range(1, max_k + 1):
            members = [
                {
                    "node_id": nid,
                    "name": node_map[nid].get("name", nid),
                    "label": node_map[nid].get("label", "Entity"),
                    "degree": len(adj[nid])
                }
                for nid, c_val in coreness.items()
                if c_val >= shell_k
            ]
            if members:
                shells.append({
                    "k": shell_k,
                    "shell_name": f"{shell_k}-Core (Coreness ≥ {shell_k})",
                    "member_count": len(members),
                    "members": members
                })

        return {
            "max_core": max_k,
            "node_coreness": coreness,
            "shells": shells
        }

    @staticmethod
    def calculate_clustering_coefficients(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Computes local clustering coefficients and global transitivity.
        """
        node_ids = [n["id"] for n in nodes]
        n_count = len(node_ids)
        if n_count == 0:
            return {"local_clustering": {}, "average_clustering": 0.0, "transitivity": 0.0}

        adj: Dict[str, Set[str]] = {nid: set() for nid in node_ids}
        for e in edges:
            s, t = e["source"], e["target"]
            if s in adj and t in adj and s != t:
                adj[s].add(t)
                adj[t].add(s)

        local_cc: Dict[str, float] = {}
        total_triangles = 0
        total_triples = 0

        for nid in node_ids:
            neighbors = list(adj[nid])
            k_i = len(neighbors)
            if k_i < 2:
                local_cc[nid] = 0.0
            else:
                triangle_edges = 0
                for i in range(k_i):
                    for j in range(i + 1, k_i):
                        if neighbors[j] in adj[neighbors[i]]:
                            triangle_edges += 1
                local_cc[nid] = round((2.0 * triangle_edges) / (k_i * (k_i - 1)), 4)
                total_triangles += triangle_edges
                total_triples += k_i * (k_i - 1) // 2

        avg_cc = round(sum(local_cc.values()) / n_count, 4)
        transitivity = round(total_triangles / total_triples, 4) if total_triples > 0 else 0.0

        return {
            "local_clustering": local_cc,
            "average_clustering": avg_cc,
            "transitivity": transitivity
        }

    @staticmethod
    def analyze_network_topology(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Computes complete structural network parameters:
        density, average degree, connected components, diameter, and clustering.
        """
        node_map = {n["id"]: n for n in nodes}
        node_ids = list(node_map.keys())
        n_count = len(node_ids)
        e_count = len(edges)

        if n_count == 0:
            return {
                "total_nodes": 0, "total_edges": 0, "density": 0.0,
                "average_degree": 0.0, "connected_components_count": 0,
                "transitivity": 0.0, "average_clustering": 0.0,
                "diameter": 0, "average_path_length": 0.0,
                "critical_bridges_count": 0
            }

        adj: Dict[str, Set[str]] = {nid: set() for nid in node_ids}
        for e in edges:
            s, t = e["source"], e["target"]
            if s in adj and t in adj and s != t:
                adj[s].add(t)
                adj[t].add(s)

        # 1. Density D = 2 * |E| / (|V| * (|V| - 1))
        possible_edges = n_count * (n_count - 1) / 2.0
        density = round(e_count / possible_edges, 4) if possible_edges > 0 else 0.0

        # 2. Average Degree
        avg_degree = round(sum(len(adj[nid]) for nid in node_ids) / n_count, 2)

        # 3. Connected Components (BFS)
        visited: Set[str] = set()
        components: List[List[str]] = []
        for nid in node_ids:
            if nid not in visited:
                comp: List[str] = []
                q = deque([nid])
                visited.add(nid)
                while q:
                    curr = q.popleft()
                    comp.append(curr)
                    for nb in adj[curr]:
                        if nb not in visited:
                            visited.add(nb)
                            q.append(nb)
                components.append(comp)

        # 4. Diameter & Average Shortest Path of largest connected component
        largest_comp = max(components, key=len) if components else []
        diameter = 0
        total_dist = 0
        total_pairs = 0

        for s in largest_comp:
            dist: Dict[str, int] = {s: 0}
            q = deque([s])
            while q:
                curr = q.popleft()
                for nb in adj[curr]:
                    if nb in largest_comp and nb not in dist:
                        dist[nb] = dist[curr] + 1
                        q.append(nb)
            for target, d in dist.items():
                if target != s:
                    diameter = max(diameter, d)
                    total_dist += d
                    total_pairs += 1

        avg_path = round(total_dist / total_pairs, 2) if total_pairs > 0 else 0.0

        # 5. Clustering & Transitivity
        cc_res = GraphAnalyticsEngine.calculate_clustering_coefficients(nodes, edges)

        # 6. Bridge Detection count
        anom = GraphAnalyticsEngine.detect_graph_anomalies(nodes, edges)
        bridge_count = sum(1 for a in anom["anomalies"] if a["anomaly_type"] == "CRITICAL_BRIDGE")

        return {
            "total_nodes": n_count,
            "total_edges": e_count,
            "density": density,
            "average_degree": avg_degree,
            "connected_components_count": len(components),
            "largest_component_size": len(largest_comp),
            "diameter": diameter,
            "average_path_length": avg_path,
            "transitivity": cc_res["transitivity"],
            "average_clustering": cc_res["average_clustering"],
            "critical_bridges_count": bridge_count,
            "judicial_non_culpability_caveat": (
                "Judicial Notice (Section 63 BSA 2023): Network centrality indicates structural prominence "
                "or communication flow, NOT criminal culpability or guilt. High centrality can correspond to "
                "legitimate commercial services, telecom routing gateways, or innocent intermediaries."
            )
        }

    @staticmethod
    def get_metrics_glossary() -> List[Dict[str, Any]]:
        """
        Returns structured definitions, formulas, and judicial non-culpability caveats
        for all network analytics metrics.
        """
        return [
            {
                "metric_id": "DEGREE_CENTRALITY",
                "name": "Degree Centrality (Direct Communication Volume)",
                "formula": "C_D(v) = deg(v) / (N - 1)",
                "investigative_meaning": "Quantifies the total number of direct contacts, calls, or banking transactions a node engages in.",
                "benign_alternative_explanation": "Could represent an innocent customer support number, telecom gateway, high-volume legitimate business account, or delivery dispatcher.",
                "judicial_non_culpability_statement": "Degree centrality measures operational volume, NOT criminal intent or conspiracy."
            },
            {
                "metric_id": "BETWEENNESS_CENTRALITY",
                "name": "Betweenness Centrality (Operational Cut-out & Brokerage)",
                "formula": "C_B(v) = sum(sigma_st(v) / sigma_st) for all s != v != t",
                "investigative_meaning": "Measures how frequently a node falls on the shortest path between distant sub-networks, acting as a communication bridge or cut-out.",
                "benign_alternative_explanation": "Could be a mutual acquaintance, legitimate money exchange agent, shared driver, or public internet cafe.",
                "judicial_non_culpability_statement": "Brokerage positioning does not establish knowledge of illegal acts passing through or between external parties."
            },
            {
                "metric_id": "CLOSENESS_CENTRALITY",
                "name": "Closeness Centrality (Information Dispatch Speed)",
                "formula": "C_C(v) = (N - 1) / sum(d(v, u))",
                "investigative_meaning": "Reflects how rapidly a node can disseminate directives or receive intelligence from all other points in the network.",
                "benign_alternative_explanation": "Well-connected central actors in commercial organizations or family circles naturally exhibit high closeness.",
                "judicial_non_culpability_statement": "Rapid graph access indicates topological centrality, not operational leadership in crime."
            },
            {
                "metric_id": "EIGENVECTOR_CENTRALITY",
                "name": "Eigenvector Centrality (High-Authority Influence)",
                "formula": "A * x = lambda * x",
                "investigative_meaning": "Measures connection to other well-connected and prominent nodes, revealing masterminds and key influencers.",
                "benign_alternative_explanation": "Can reflect high-profile civic, commercial, or community figures communicating with other prominent citizens.",
                "judicial_non_culpability_statement": "Association with influential individuals does not constitute criminal co-conspiracy."
            },
            {
                "metric_id": "PAGERANK",
                "name": "PageRank (Random Walk Prestige / Kingpin Radar)",
                "formula": "PR(v) = (1 - d)/N + d * sum(PR(u)/deg(u))",
                "investigative_meaning": "Simulates random communication flow to surface insulated kingpins who command authority while maintaining minimal direct edges.",
                "benign_alternative_explanation": "Formal enterprise leadership or government nodal contacts frequently accumulate high PageRank scores.",
                "judicial_non_culpability_statement": "Algorithmically derived prestige cannot substitute for direct evidentiary links of criminal acts."
            },
            {
                "metric_id": "K_CORE_DECOMPOSITION",
                "name": "k-Core Decomposition (Sub-Syndicate Nucleus)",
                "formula": "Maximal subgraph where every vertex has degree >= k",
                "investigative_meaning": "Iteratively strips away peripheral noise to isolate the tightly knit, resilient inner core of the criminal network.",
                "benign_alternative_explanation": "Tightly knit groups of colleagues, sports clubs, or families naturally form high k-core shells.",
                "judicial_non_culpability_statement": "Belonging to a cohesive social or transaction group does not establish shared mens rea."
            },
            {
                "metric_id": "CLUSTERING_COEFFICIENT",
                "name": "Clustering Coefficient (Associational Cliquishness)",
                "formula": "C_i = 2 * e_i / (k_i * (k_i - 1))",
                "investigative_meaning": "Measures the extent to which an individual's contacts also know and interact directly with each other.",
                "benign_alternative_explanation": "Neighborhood communities, village networks, or small businesses naturally feature near-complete clustering.",
                "judicial_non_culpability_statement": "High transitivity simply reflects close community ties, not an organized criminal syndicate."
            },
            {
                "metric_id": "CRITICAL_BRIDGES",
                "name": "Critical Bridges (Single Points of Failure)",
                "formula": "Edges whose removal increases the number of connected components",
                "investigative_meaning": "Single communication or financial linkages that hold different wings of a criminal enterprise together.",
                "benign_alternative_explanation": "The sole contact between two different companies or regional offices is structurally a bridge.",
                "judicial_non_culpability_statement": "Bridge edges indicate structural vulnerability, requiring judicial substantiation before lawful interception."
            }
        ]

