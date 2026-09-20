import logging
from typing import Any, Dict, List, Optional, Set

from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.document_chunk import DocumentChunk
from app.models.extracted_relationship import ExtractedRelationship
from app.models.user import User
from app.schemas.graphrag import (
    EvidenceGapItem,
    GraphCitationItem,
    QueryClassificationResult,
)
from app.schemas.rag import CitationItem, RAGQueryRequest, RetrievedChunkItem
from app.services.analytics_service import AnalyticsService
from app.services.graph_service import GraphService
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)


class EvidenceFusionEngine:
    """
    Multi-Engine Evidence Fusion.
    Unifies Neo4j topological knowledge graphs, pgvector dense document RAG chunks,
    ML link prediction models, and temporal telemetry into a coherent evidentiary fabric.
    """

    @classmethod
    def fuse(
        cls,
        db: Session,
        case_id: str,
        user: User,
        query: str,
        classification: QueryClassificationResult,
        focus_entity: Optional[str] = None,
        max_graph_hops: int = 2,
        top_k_chunks: int = 5,
        include_evidence_gaps: bool = True
    ) -> Dict[str, Any]:
        """
        Executes selective multi-engine retrieval according to the engine_plan.
        """
        plan = classification.engine_plan
        target_entities = classification.target_entities
        if focus_entity and focus_entity not in target_entities:
            target_entities.insert(0, focus_entity)

        graph_citations: List[GraphCitationItem] = []
        matching_nodes: List[Dict[str, Any]] = []
        matching_edges: List[Dict[str, Any]] = []
        document_citations: List[CitationItem] = []
        retrieved_chunks: List[RetrievedChunkItem] = []
        ml_predictions: List[Dict[str, Any]] = []
        cross_cluster_insights: List[Dict[str, Any]] = []
        temporal_bursts: List[Dict[str, Any]] = []
        evidence_gaps: List[EvidenceGapItem] = []

        # 1. Graph Engine (Topological Subgraph & Citations)
        if plan.get("needs_graph", True):
            graph_res = cls._fetch_graph_evidence(
                db=db,
                case_id=case_id,
                target_entities=target_entities,
                target_rels=classification.target_relationships,
                max_hops=max_graph_hops
            )
            graph_citations = graph_res["citations"]
            matching_nodes = graph_res["nodes"]
            matching_edges = graph_res["edges"]

        # 2. Document RAG Engine (pgvector Dense Retrieval & Citations)
        if plan.get("needs_rag", True):
            rag_res = cls._fetch_rag_evidence(
                db=db,
                case_id=case_id,
                user=user,
                query=query,
                top_k=top_k_chunks
            )
            document_citations = rag_res["citations"]
            retrieved_chunks = rag_res["chunks"]

        # 3. Machine Learning Prediction Engine & Community Bridge Discovery
        if plan.get("needs_ml", False):
            ml_res = cls._fetch_ml_evidence(
                db=db,
                case_id=case_id,
                user=user
            )
            ml_predictions = ml_res.get("predictions", [])
            cross_cluster_insights = ml_res.get("cross_cluster", [])

        # 4. Temporal Intelligence Engine (Timelines & Communication Bursts)
        if plan.get("needs_temporal", False):
            temp_res = cls._fetch_temporal_evidence(
                db=db,
                case_id=case_id,
                user=user
            )
            temporal_bursts = temp_res.get("bursts", [])

        # 5. Evidence Gap & Discrepancy Detection
        if include_evidence_gaps and plan.get("needs_gap_analysis", True):
            evidence_gaps = cls._detect_evidence_gaps(
                db=db,
                case_id=case_id,
                graph_nodes=matching_nodes,
                graph_edges=matching_edges,
                ml_predictions=ml_predictions,
                chunks=retrieved_chunks,
                target_entities=target_entities
            )

        return {
            "graph_citations": graph_citations,
            "matching_nodes": matching_nodes,
            "matching_edges": matching_edges,
            "document_citations": document_citations,
            "retrieved_chunks": retrieved_chunks,
            "ml_predictions": ml_predictions,
            "cross_cluster_insights": cross_cluster_insights,
            "temporal_bursts": temporal_bursts,
            "evidence_gaps": evidence_gaps,
        }

    @classmethod
    def _fetch_graph_evidence(
        cls,
        db: Session,
        case_id: str,
        target_entities: List[str],
        target_rels: List[str],
        max_hops: int = 2
    ) -> Dict[str, Any]:
        """
        Retrieves case subgraph and filters to ego-networks around target entities if specified.
        """
        subgraph = GraphService.get_case_subgraph(db, case_id)
        all_nodes = subgraph.nodes
        all_edges = subgraph.edges

        nodes_by_id = {n.id: n for n in all_nodes}

        # If target entities specified, find seed node IDs
        seed_node_ids: Set[str] = set()
        if target_entities:
            for n in all_nodes:
                name_l = n.name.lower()
                id_l = n.id.lower()
                for te in target_entities:
                    te_l = te.lower()
                    if te_l in name_l or te_l in id_l:
                        seed_node_ids.add(n.id)

        # If no specific entities found or specified, retain entire subgraph (or top connected nodes)
        if not seed_node_ids:
            selected_node_ids = set(nodes_by_id.keys())
        else:
            # Expand to 1-hop or 2-hop radius
            selected_node_ids = set(seed_node_ids)
            current_frontier = set(seed_node_ids)
            for _ in range(max_hops):
                next_frontier: Set[str] = set()
                for e in all_edges:
                    if e.source in current_frontier and e.target not in selected_node_ids:
                        next_frontier.add(e.target)
                        selected_node_ids.add(e.target)
                    elif e.target in current_frontier and e.source not in selected_node_ids:
                        next_frontier.add(e.source)
                        selected_node_ids.add(e.source)
                current_frontier = next_frontier

        # Filter edges connecting selected nodes
        selected_edges = [
            e for e in all_edges
            if e.source in selected_node_ids and e.target in selected_node_ids
        ]

        if target_rels:
            # If relationship types were targeted (e.g. CALLED, TRANSFERRED), filter or prioritize
            filtered = [e for e in selected_edges if e.label in target_rels]
            if filtered:
                selected_edges = filtered

        # Build GraphCitationItem list
        citations: List[GraphCitationItem] = []
        for idx, edge in enumerate(selected_edges[:25]):
            src_node = nodes_by_id.get(edge.source)
            tgt_node = nodes_by_id.get(edge.target)
            src_name = src_node.name if src_node else edge.source
            tgt_name = tgt_node.name if tgt_node else edge.target

            citations.append(
                GraphCitationItem(
                    citation_id=f"GRAPH-CIT-{idx + 1:03d}",
                    source_node=src_name,
                    target_node=tgt_name,
                    relationship_type=edge.label,
                    confidence=edge.confidence,
                    relationship_nature=edge.relationship_nature or "OBSERVED",
                    verification_status=edge.verification_status or "VERIFIED",
                    evidence_id=edge.evidence_id,
                    properties=edge.properties or {}
                )
            )

        return {
            "nodes": [nodes_by_id[nid].dict() for nid in selected_node_ids if nid in nodes_by_id],
            "edges": [e.dict() for e in selected_edges],
            "citations": citations,
        }

    @classmethod
    def _fetch_rag_evidence(
        cls,
        db: Session,
        case_id: str,
        user: User,
        query: str,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Executes dense vector document RAG search for the case.
        """
        try:
            req = RAGQueryRequest(
                query=query,
                top_k=top_k,
                min_relevance_score=0.10
            )
            rag_res = RAGService.query_rag(
                db=db,
                case_id=case_id,
                user=user,
                payload=req
            )
            return {
                "citations": rag_res.citations,
                "chunks": rag_res.chunks,
            }
        except Exception as e:
            logger.warning(f"Error querying RAG engine during fusion: {e}")
            return {"citations": [], "chunks": []}

    @classmethod
    def _fetch_ml_evidence(
        cls,
        db: Session,
        case_id: str,
        user: User
    ) -> Dict[str, Any]:
        """
        Gathers ML hidden link predictions and cross-cluster broker communities.
        """
        predictions: List[Dict[str, Any]] = []
        cross_cluster: List[Dict[str, Any]] = []
        try:
            # 1. Hidden link predictions
            ml_res = AnalyticsService.predict_hidden_links_ml(
                db=db,
                case_id=case_id,
                min_confidence=0.35,
                limit=10,
                operator_id=user.username
            )
            for p in ml_res.predictions:
                predictions.append(p.dict())

            # 2. Community detection & cross-cluster links
            comm_res = AnalyticsService.get_communities(
                db=db,
                case_id=case_id,
                operator_id=user.username
            )
            if comm_res and comm_res.communities:
                # Find nodes identified as cross-community brokers or critical bridges
                struct_res = AnalyticsService.get_structural_overview(
                    db=db,
                    case_id=case_id,
                    operator_id=user.username
                )
                cross_cluster.append({
                    "total_communities": comm_res.total_communities,
                    "modularity": comm_res.modularity,
                    "critical_bridges_count": struct_res.critical_bridges_count if struct_res else 0,
                    "communities": [
                        {
                            "id": c.community_id,
                            "label": c.name,
                            "size": c.size,
                            "members": [m.name for m in c.members[:5]]
                        }
                        for c in comm_res.communities
                    ]
                })
        except Exception as e:
            logger.warning(f"Error executing ML engine during fusion: {e}")

        return {
            "predictions": predictions,
            "cross_cluster": cross_cluster,
        }

    @classmethod
    def _fetch_temporal_evidence(
        cls,
        db: Session,
        case_id: str,
        user: User
    ) -> Dict[str, Any]:
        """
        Gathers temporal timelines, burst activity, and velocity anomalies.
        """
        bursts: List[Dict[str, Any]] = []
        try:
            temp_res = AnalyticsService.get_temporal_intelligence(
                db=db,
                case_id=case_id,
                operator_id=user.username
            )
            for b in temp_res.bursts:
                bursts.append(b.dict())
        except Exception as e:
            logger.warning(f"Error executing Temporal engine during fusion: {e}")

        return {"bursts": bursts}

    @classmethod
    def _detect_evidence_gaps(
        cls,
        db: Session,
        case_id: str,
        graph_nodes: List[Dict[str, Any]],
        graph_edges: List[Dict[str, Any]],
        ml_predictions: List[Dict[str, Any]],
        chunks: List[RetrievedChunkItem],
        target_entities: List[str]
    ) -> List[EvidenceGapItem]:
        """
        Discrepancy detector identifying missing evidentiary corroboration,
        unrecovered physical devices, unverified predicted links, and single-source statements.
        """
        gaps: List[EvidenceGapItem] = []
        gap_counter = 1

        # 1. Unsubstantiated ML Predicted Links
        for pred in ml_predictions[:3]:
            conf = pred.get("confidence", 0.0)
            src = pred.get("source_name", pred.get("source_id", "Unknown"))
            tgt = pred.get("target_name", pred.get("target_id", "Unknown"))
            gaps.append(
                EvidenceGapItem(
                    gap_id=f"GAP-{gap_counter:03d}",
                    gap_type="UNSUBSTANTIATED_PREDICTED_LINK",
                    entity_or_relationship=f"{src} <-> {tgt}",
                    description=(
                        f"Machine learning model predicted a hidden link between {src} and {tgt} "
                        f"(Confidence: {conf * 100:.1f}%), but no direct documentary or CDR evidence is yet recorded."
                    ),
                    investigative_recommendation=(
                        f"Subpoena call detail records or bank transaction statements between {src} and {tgt} "
                        f"to corroborate the predicted link under Section 63 BSA 2023."
                    ),
                    severity="HIGH" if conf > 0.6 else "MEDIUM"
                )
            )
            gap_counter += 1

        # 2. Unrecovered Devices / Burner SIMs without IMEI
        for node in graph_nodes:
            label = node.get("label", "")
            props = node.get("properties", {})
            name = node.get("name", "")
            if label == "Phone" and not props.get("imei"):
                gaps.append(
                    EvidenceGapItem(
                        gap_id=f"GAP-{gap_counter:03d}",
                        gap_type="UNRECOVERED_DEVICE",
                        entity_or_relationship=name,
                        description=(
                            f"Phone identifier '{name}' is active in CDR logs but lacks physical handset seizure "
                            f"and IMEI binding."
                        ),
                        investigative_recommendation=(
                            f"Issue CDR tower request to extract IMEI and obtain Section 63 BSA 2023 device seizure warrant."
                        ),
                        severity="MEDIUM"
                    )
                )
                gap_counter += 1
                if gap_counter > 5:
                    break

        # 3. Single-Source / Contested Extracted Relationships from graph edges
        for edge in graph_edges:
            nature = edge.get("relationship_nature", "")
            label = edge.get("label", "")
            if nature in ("CONTESTED", "INFERRED"):
                src = edge.get("source", "")
                tgt = edge.get("target", "")
                gaps.append(
                    EvidenceGapItem(
                        gap_id=f"GAP-{gap_counter:03d}",
                        gap_type="SINGLE_SOURCE_CORROBORATION",
                        entity_or_relationship=f"{src} -[{label}]-> {tgt}",
                        description=(
                            f"Relationship {src} -> {label} -> {tgt} is marked as '{nature}' "
                            f"without independent corroborative physical proof."
                        ),
                        investigative_recommendation=(
                            f"Cross-reference financial UTRs or interrogations to substantiate the {label} relationship."
                        ),
                        severity="HIGH"
                    )
                )
                gap_counter += 1
                if gap_counter > 8:
                    break

        # 4. Also check direct Database Contested / Inferred Relationships
        try:
            db_contested = db.query(ExtractedRelationship).filter(
                ExtractedRelationship.case_id == case_id,
                ExtractedRelationship.relationship_nature.in_(["CONTESTED", "INFERRED"])
            ).all()
            for rel in db_contested:
                src = rel.source_value or rel.source_entity_id
                tgt = rel.target_value or rel.target_entity_id
                rel_str = f"{src} -[{rel.relationship_type}]-> {tgt}"
                # Avoid duplicate
                if any(g.entity_or_relationship == rel_str for g in gaps):
                    continue
                gaps.append(
                    EvidenceGapItem(
                        gap_id=f"GAP-{gap_counter:03d}",
                        gap_type="SINGLE_SOURCE_CORROBORATION",
                        entity_or_relationship=rel_str,
                        description=(
                            f"Relationship {src} -> {rel.relationship_type} -> {tgt} is marked as '{rel.relationship_nature}' "
                            f"without independent corroborative physical proof."
                        ),
                        investigative_recommendation=(
                            f"Cross-reference financial UTRs or interrogations to substantiate the {rel.relationship_type} relationship."
                        ),
                        severity="HIGH"
                    )
                )
                gap_counter += 1
                if gap_counter > 10:
                    break
        except Exception as e:
            logger.warning(f"Error querying contested relationships for gap analysis: {e}")

        return gaps
