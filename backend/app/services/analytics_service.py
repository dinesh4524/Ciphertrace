import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.schemas.analytics import (
    CentralityScore,
    CommunityCluster,
    CommunityDetectionResponse,
    CommunityMember,
    GraphAnomaliesResponse,
    GraphAnomalyItem,
    HiddenLinkPredictionResponse,
    KeyPlayerResponse,
    LinkReviewRequest,
    PathfindingResponse,
    PathStep,
    PredictedLink,
    KCoreMember,
    KCoreShell,
    KCoreResponse,
    StructuralOverviewResponse,
    MetricGlossaryItem,
    MetricGlossaryResponse,
    HiddenLinkMLResponse,
    HiddenLinkMLPrediction,
    ReviewPredictionRequest,
    TimelineEventItem,
    CommunicationBurstItem,
    TransactionBurstItem,
    LocationAnomalyItem,
    RelationshipEmergenceItem,
    CleanSlateAnomalyItem,
    TemporalIntelligenceResponse
)
from app.models.cdr import CDRRecord
from app.models.financial import FinancialRecord
from app.models.fir import FIRDocument
from app.services.audit_service import AuditService
from app.services.graph_service import GraphService
from app.utils.graph_analytics import GraphAnalyticsEngine
from app.utils.hidden_link_engine import HiddenLinkPredictionEngine
from app.utils.temporal_engine import TemporalIntelligenceEngine

logger = logging.getLogger(__name__)

Tuple_Graph = Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]


class AnalyticsService:
    @staticmethod
    def _get_raw_graph_data(db: Session, case_id: str) -> Tuple_Graph:
        subgraph = GraphService.get_case_subgraph(db, case_id)
        nodes = [
            {"id": n.id, "name": n.name, "label": n.label, "properties": n.properties}
            for n in subgraph.nodes
        ]
        edges = [
            {
                "id": e.id,
                "source": e.source,
                "target": e.target,
                "label": e.label,
                "confidence": e.confidence,
                "nature": e.relationship_nature
            }
            for e in subgraph.edges
        ]
        return nodes, edges

    @staticmethod
    def get_key_players(db: Session, case_id: str, operator_id: str = "analyst") -> KeyPlayerResponse:
        nodes, edges = AnalyticsService._get_raw_graph_data(db, case_id)
        scores_raw = GraphAnalyticsEngine.calculate_centralities(nodes, edges)

        all_players = [CentralityScore(**item) for item in scores_raw]
        
        top_kingpins = sorted(
            [p for p in all_players if p.archetype == "KINGPIN_INFLUENCER" or p.pagerank > 0.15],
            key=lambda p: (p.pagerank, p.closeness_centrality),
            reverse=True
        )[:5]

        top_brokers = sorted(
            [p for p in all_players if p.archetype == "COMMUNICATION_BROKER" or p.betweenness_centrality > 0.1],
            key=lambda p: p.betweenness_centrality,
            reverse=True
        )[:5]

        top_hubs = sorted(
            [p for p in all_players if p.archetype == "OPERATIONAL_HUB" or p.degree_centrality > 0.2],
            key=lambda p: p.degree_centrality,
            reverse=True
        )[:5]

        # Audit logging
        AuditService.log_action(
            db=db,
            action_type="KEY_PLAYERS_ANALYSIS",
            resource_type="GRAPH_ANALYTICS",
            case_id=case_id,
            operator_id=operator_id,
            details={"analyzed_nodes": len(nodes), "top_player": all_players[0].name if all_players else None}
        )

        return KeyPlayerResponse(
            case_id=case_id,
            total_analyzed_nodes=len(all_players),
            top_kingpins=top_kingpins,
            top_brokers=top_brokers,
            top_hubs=top_hubs,
            all_players=all_players
        )

    @staticmethod
    def get_communities(db: Session, case_id: str, operator_id: str = "analyst") -> CommunityDetectionResponse:
        nodes, edges = AnalyticsService._get_raw_graph_data(db, case_id)
        raw_res = GraphAnalyticsEngine.detect_communities(nodes, edges)

        clusters: List[CommunityCluster] = []
        for c in raw_res["communities"]:
            members = [CommunityMember(**m) for m in c["members"]]
            clusters.append(CommunityCluster(
                community_id=c["community_id"],
                name=c["name"],
                centroid_node_id=c["centroid_node_id"],
                centroid_name=c["centroid_name"],
                size=c["size"],
                internal_edges=c["internal_edges"],
                external_edges=c["external_edges"],
                density=c["density"],
                members=members
            ))

        AuditService.log_action(
            db=db,
            action_type="COMMUNITY_DETECTION",
            resource_type="GRAPH_ANALYTICS",
            case_id=case_id,
            operator_id=operator_id,
            details={"total_communities": len(clusters), "modularity": raw_res["modularity"]}
        )

        return CommunityDetectionResponse(
            case_id=case_id,
            total_communities=len(clusters),
            modularity=raw_res["modularity"],
            communities=clusters
        )

    @staticmethod
    def find_shortest_path(
        db: Session,
        case_id: str,
        source_node_id: str,
        target_node_id: str,
        operator_id: str = "analyst"
    ) -> PathfindingResponse:
        nodes, edges = AnalyticsService._get_raw_graph_data(db, case_id)
        res = GraphAnalyticsEngine.find_shortest_path(nodes, edges, source_node_id, target_node_id)

        path_steps = [PathStep(**ps) for ps in res.get("path_nodes", [])]

        AuditService.log_action(
            db=db,
            action_type="INVESTIGATIVE_PATHFINDING",
            resource_type="GRAPH_ANALYTICS",
            case_id=case_id,
            operator_id=operator_id,
            details={
                "source": source_node_id,
                "target": target_node_id,
                "found": res["found"],
                "hops": res["hops"]
            }
        )

        return PathfindingResponse(
            case_id=case_id,
            found=res["found"],
            source_node_id=source_node_id,
            target_node_id=target_node_id,
            hops=res["hops"],
            total_weight=res.get("total_weight", 0.0),
            composite_confidence=res.get("composite_confidence", 0.0),
            path_nodes=path_steps,
            path_edges=res.get("path_edges", [])
        )

    @staticmethod
    def predict_hidden_links(
        db: Session,
        case_id: str,
        min_probability: float = 0.35,
        operator_id: str = "analyst"
    ) -> HiddenLinkPredictionResponse:
        nodes, edges = AnalyticsService._get_raw_graph_data(db, case_id)
        raw_predictions = GraphAnalyticsEngine.predict_hidden_links(nodes, edges, min_probability=min_probability)

        predictions = [PredictedLink(**p) for p in raw_predictions]

        AuditService.log_action(
            db=db,
            action_type="HIDDEN_LINK_PREDICTION",
            resource_type="GRAPH_ANALYTICS",
            case_id=case_id,
            operator_id=operator_id,
            details={"min_probability": min_probability, "predictions_count": len(predictions)}
        )

        return HiddenLinkPredictionResponse(
            case_id=case_id,
            total_predicted_links=len(predictions),
            min_probability_threshold=min_probability,
            predictions=predictions
        )

    @staticmethod
    def accept_or_dismiss_predicted_link(
        db: Session,
        case_id: str,
        req: LinkReviewRequest,
        operator_id: str
    ) -> Dict[str, Any]:
        """
        Processes human investigator review of an AI-predicted hidden link.
        If ACCEPTED: persists as an INFERRED relationship in PostgreSQL & Neo4j.
        """
        if req.decision == "ACCEPTED":
            # Lookup evidence to anchor the link
            evidence = db.query(EvidenceItem).filter(EvidenceItem.case_id == case_id).first()
            evidence_id = evidence.id if evidence else None

            # Lookup entity names if available
            src_ent = db.query(ExtractedEntity).filter(ExtractedEntity.id == req.source_id).first()
            tgt_ent = db.query(ExtractedEntity).filter(ExtractedEntity.id == req.target_id).first()

            src_val = src_ent.normalized_value if src_ent else req.source_id
            tgt_val = tgt_ent.normalized_value if tgt_ent else req.target_id

            new_rel = ExtractedRelationship(
                evidence_id=evidence_id or "AI_INFERENCE_FABRIC",
                case_id=case_id,
                source_entity_id=req.source_id,
                target_entity_id=req.target_id,
                source_value=src_val,
                target_value=tgt_val,
                relationship_type=req.relationship_type,
                relationship_nature="INFERRED",
                confidence=0.88,
                context_snippet=f"AI-Predicted topological link accepted by {operator_id}. Rationale: {req.justification_reason}",
                extraction_method="GRAPH_ADAMIC_ADAR_ML",
                relationship_metadata={
                    "ai_predicted": True,
                    "investigator_id": operator_id,
                    "justification": req.justification_reason
                }
            )
            db.add(new_rel)
            db.commit()
            db.refresh(new_rel)

            # Resync to Neo4j knowledge graph
            try:
                GraphService.sync_case_to_graph(db, case_id, operator_username=operator_id)
            except Exception as e:
                logger.warning(f"Neo4j sync warning on accepted link: {e}")

            AuditService.log_action(
                db=db,
                action_type="PREDICTED_LINK_ACCEPTED",
                resource_type="KNOWLEDGE_GRAPH",
                case_id=case_id,
                operator_id=operator_id,
                details={
                    "source_id": req.source_id,
                    "target_id": req.target_id,
                    "relationship_type": req.relationship_type,
                    "justification": req.justification_reason
                }
            )

            return {
                "status": "ACCEPTED",
                "relationship_id": new_rel.id,
                "message": "AI-Predicted link accepted and registered as an INFERRED evidentiary relationship."
            }
        else:
            AuditService.log_action(
                db=db,
                action_type="PREDICTED_LINK_DISMISSED",
                resource_type="KNOWLEDGE_GRAPH",
                case_id=case_id,
                operator_id=operator_id,
                details={
                    "source_id": req.source_id,
                    "target_id": req.target_id,
                    "justification": req.justification_reason
                }
            )
            return {
                "status": "DISMISSED",
                "message": "AI-Predicted link dismissed by investigator."
            }

    @staticmethod
    def get_anomalies(db: Session, case_id: str, operator_id: str = "analyst") -> GraphAnomaliesResponse:
        nodes, edges = AnalyticsService._get_raw_graph_data(db, case_id)
        raw_res = GraphAnalyticsEngine.detect_graph_anomalies(nodes, edges)

        anomaly_items = [GraphAnomalyItem(**a) for a in raw_res["anomalies"]]

        AuditService.log_action(
            db=db,
            action_type="GRAPH_ANOMALY_SCAN",
            resource_type="GRAPH_ANALYTICS",
            case_id=case_id,
            operator_id=operator_id,
            details={"anomalies_detected": len(anomaly_items)}
        )

        return GraphAnomaliesResponse(
            case_id=case_id,
            total_anomalies=len(anomaly_items),
            anomalies=anomaly_items
        )

    @staticmethod
    def get_k_core_decomposition(db: Session, case_id: str, operator_id: str = "analyst") -> KCoreResponse:
        nodes, edges = AnalyticsService._get_raw_graph_data(db, case_id)
        raw_res = GraphAnalyticsEngine.calculate_k_core(nodes, edges)

        shells: List[KCoreShell] = []
        for s in raw_res["shells"]:
            members = [KCoreMember(**m) for m in s["members"]]
            shells.append(KCoreShell(
                k=s["k"],
                shell_name=s["shell_name"],
                member_count=s["member_count"],
                members=members
            ))

        AuditService.log_action(
            db=db,
            action_type="K_CORE_DECOMPOSITION",
            resource_type="GRAPH_ANALYTICS",
            case_id=case_id,
            operator_id=operator_id,
            details={"max_core": raw_res["max_core"], "total_shells": len(shells)}
        )

        return KCoreResponse(
            case_id=case_id,
            max_core=raw_res["max_core"],
            total_shells=len(shells),
            shells=shells,
            node_coreness=raw_res["node_coreness"]
        )

    @staticmethod
    def get_structural_overview(db: Session, case_id: str, operator_id: str = "analyst") -> StructuralOverviewResponse:
        nodes, edges = AnalyticsService._get_raw_graph_data(db, case_id)
        raw_res = GraphAnalyticsEngine.analyze_network_topology(nodes, edges)

        AuditService.log_action(
            db=db,
            action_type="NETWORK_TOPOLOGY_ANALYSIS",
            resource_type="GRAPH_ANALYTICS",
            case_id=case_id,
            operator_id=operator_id,
            details={
                "density": raw_res["density"],
                "average_degree": raw_res["average_degree"],
                "connected_components": raw_res["connected_components_count"]
            }
        )

        return StructuralOverviewResponse(
            case_id=case_id,
            total_nodes=raw_res["total_nodes"],
            total_edges=raw_res["total_edges"],
            density=raw_res["density"],
            average_degree=raw_res["average_degree"],
            connected_components_count=raw_res["connected_components_count"],
            largest_component_size=raw_res.get("largest_component_size", raw_res["total_nodes"]),
            diameter=raw_res["diameter"],
            average_path_length=raw_res["average_path_length"],
            transitivity=raw_res["transitivity"],
            average_clustering=raw_res["average_clustering"],
            critical_bridges_count=raw_res["critical_bridges_count"],
            judicial_non_culpability_caveat=raw_res["judicial_non_culpability_caveat"]
        )

    @staticmethod
    def get_metrics_glossary() -> MetricGlossaryResponse:
        items = [MetricGlossaryItem(**g) for g in GraphAnalyticsEngine.get_metrics_glossary()]
        return MetricGlossaryResponse(
            total_metrics=len(items),
            glossary=items
        )

    @staticmethod
    def predict_hidden_links_ml(
        db: Session,
        case_id: str,
        min_confidence: float = 0.40,
        limit: int = 25,
        operator_id: str = "analyst"
    ) -> HiddenLinkMLResponse:
        """
        Phase 9: Heterogeneous Graph ML Link Prediction Engine.
        Returns candidate links, calibrated confidence, baseline scores,
        supporting signals, contradictory signals, and evidence paths.
        """
        nodes, edges = AnalyticsService._get_raw_graph_data(db, case_id)
        raw_res = HiddenLinkPredictionEngine.predict_hidden_links(
            nodes=nodes,
            edges=edges,
            min_confidence_threshold=min_confidence,
            limit=limit
        )

        predictions = [HiddenLinkMLPrediction(**p) for p in raw_res["predictions"]]

        AuditService.log_action(
            db=db,
            action_type="ML_HIDDEN_LINK_PREDICTION",
            resource_type="MACHINE_LEARNING_ENGINE",
            case_id=case_id,
            operator_id=operator_id,
            details={
                "min_confidence": min_confidence,
                "predictions_count": len(predictions),
                "model": raw_res["model_name"]
            }
        )

        return HiddenLinkMLResponse(
            case_id=case_id,
            total_predicted_links=len(predictions),
            min_confidence_threshold=min_confidence,
            model_name=raw_res["model_name"],
            predictions=predictions,
            judicial_warning=raw_res["judicial_warning"]
        )

    @staticmethod
    def review_ml_predicted_link(
        db: Session,
        case_id: str,
        req: ReviewPredictionRequest,
        operator_id: str
    ) -> Dict[str, Any]:
        """
        Phase 9 Human-in-the-Loop Review under Section 63 BSA 2023.
        A predicted link is NEVER automatically converted into confirmed evidence.
        Explicit acceptance logs an INFERRED_HYPOTHESIS relationship with officer badge provenance.
        """
        if req.decision == "ACCEPTED_AS_HYPOTHESIS":
            evidence = db.query(EvidenceItem).filter(EvidenceItem.case_id == case_id).first()
            evidence_id = evidence.id if evidence else None

            src_ent = db.query(ExtractedEntity).filter(ExtractedEntity.id == req.source_id).first()
            tgt_ent = db.query(ExtractedEntity).filter(ExtractedEntity.id == req.target_id).first()

            src_val = src_ent.normalized_value if src_ent else req.source_id
            tgt_val = tgt_ent.normalized_value if tgt_ent else req.target_id

            rel_type = req.relationship_type or "INFERRED_ASSOCIATION"

            new_rel = ExtractedRelationship(
                evidence_id=evidence_id or "AI_ML_INFERENCE_FABRIC",
                case_id=case_id,
                source_entity_id=req.source_id,
                target_entity_id=req.target_id,
                source_value=src_val,
                target_value=tgt_val,
                relationship_type=rel_type,
                relationship_nature="INFERRED",
                confidence=0.85,
                context_snippet=(
                    f"Phase 9 ML Link Accepted as Investigative Hypothesis by Officer {req.investigator_badge} ({operator_id}). "
                    f"Legal Justification: {req.justification_reason}"
                ),
                extraction_method="HETEROGENEOUS_GRAPH_ML_ENSEMBLE",
                relationship_metadata={
                    "is_hypothesis": True,
                    "model_source": "Heterogeneous-GraphSAGE-RF-Ensemble",
                    "investigator_badge": req.investigator_badge,
                    "investigator_username": operator_id,
                    "legal_justification": req.justification_reason,
                    "statutory_compliance": "Section 63 Bharatiya Sakshya Adhiniyam 2023"
                }
            )
            db.add(new_rel)
            db.commit()
            db.refresh(new_rel)

            try:
                GraphService.sync_case_to_graph(db, case_id, operator_username=operator_id)
            except Exception as e:
                logger.warning(f"Neo4j sync warning on accepted hypothesis: {e}")

            AuditService.log_action(
                db=db,
                action_type="ML_LINK_ACCEPTED_AS_HYPOTHESIS",
                resource_type="KNOWLEDGE_GRAPH",
                case_id=case_id,
                operator_id=operator_id,
                details={
                    "source_id": req.source_id,
                    "target_id": req.target_id,
                    "relationship_type": rel_type,
                    "badge": req.investigator_badge,
                    "justification": req.justification_reason
                }
            )

            return {
                "decision": "ACCEPTED_AS_HYPOTHESIS",
                "relationship_id": new_rel.id,
                "message": (
                    f"Predicted link successfully recorded as an INFERRED_HYPOTHESIS under Section 63 BSA 2023 "
                    f"by Officer {req.investigator_badge}."
                )
            }
        else:
            AuditService.log_action(
                db=db,
                action_type=f"ML_LINK_{req.decision}",
                resource_type="KNOWLEDGE_GRAPH",
                case_id=case_id,
                operator_id=operator_id,
                details={
                    "source_id": req.source_id,
                    "target_id": req.target_id,
                    "badge": req.investigator_badge,
                    "justification": req.justification_reason
                }
            )
            return {
                "decision": req.decision,
                "message": f"ML predicted link marked as {req.decision} by Officer {req.investigator_badge}."
            }

    @staticmethod
    def get_temporal_intelligence(
        db: Session,
        case_id: str,
        operator_id: str = "analyst"
    ) -> TemporalIntelligenceResponse:
        """
        Phase 10: Unified Temporal Intelligence Pipeline.
        Gathers multi-source telemetry (CDRs, Financials, FIRs, Evidence),
        constructs unified chronological timelines, identifies communication & financial bursts,
        flags spatiotemporal location anomalies, and models relationship emergence.
        """
        # 1. Fetch case evidence items
        evidence_items = db.query(EvidenceItem).filter(EvidenceItem.case_id == case_id).all()
        evidence_ids = [e.id for e in evidence_items]
        ev_dicts = [
            {
                "id": e.id,
                "evidence_code": e.evidence_code,
                "evidence_category": e.evidence_category,
                "source_type": e.source_type
            }
            for e in evidence_items
        ]

        # 2. Fetch CDRs, Financials, FIRs, Entities, and Relationships
        cdrs = db.query(CDRRecord).filter(CDRRecord.evidence_id.in_(evidence_ids)).all() if evidence_ids else []
        financials = db.query(FinancialRecord).filter(FinancialRecord.evidence_id.in_(evidence_ids)).all() if evidence_ids else []
        firs = db.query(FIRDocument).filter(FIRDocument.evidence_id.in_(evidence_ids)).all() if evidence_ids else []
        entities = db.query(ExtractedEntity).filter(ExtractedEntity.case_id == case_id).all()
        relationships = db.query(ExtractedRelationship).filter(ExtractedRelationship.case_id == case_id).all()

        cdr_dicts = [
            {
                "id": c.id,
                "evidence_id": c.evidence_id,
                "calling_number": c.calling_number,
                "called_number": c.called_number,
                "call_type": c.call_type,
                "start_time": c.start_time,
                "duration_sec": c.duration_sec,
                "cell_tower_id": c.cell_tower_id,
                "latitude": c.latitude,
                "longitude": c.longitude,
            }
            for c in cdrs
        ]

        fin_dicts = [
            {
                "id": f.id,
                "evidence_id": f.evidence_id,
                "sender_account": f.sender_account,
                "receiver_account": f.receiver_account,
                "amount": f.amount,
                "currency": f.currency,
                "txn_type": f.txn_type,
                "utr_reference": f.utr_reference,
                "timestamp": f.timestamp,
                "channel": f.channel,
            }
            for f in financials
        ]

        fir_dicts = [
            {
                "id": fir.id,
                "evidence_id": fir.evidence_id,
                "fir_number": fir.fir_number,
                "police_station": fir.police_station,
                "incident_date_time": fir.incident_date or fir.filing_date,
                "acts_and_sections": fir.sections_invoked or [],
            }
            for fir in firs
        ]

        entity_dicts = [
            {
                "id": ent.id,
                "evidence_id": ent.evidence_id,
                "entity_type": ent.entity_type,
                "raw_value": ent.raw_value,
                "normalized_value": ent.normalized_value,
            }
            for ent in entities
        ]

        rel_dicts = [
            {
                "id": r.id,
                "source_value": r.source_value,
                "target_value": r.target_value,
                "relationship_type": r.relationship_type,
                "created_at": r.created_at,
            }
            for r in relationships
        ]

        # 3. Build Timeline
        raw_timeline = TemporalIntelligenceEngine.build_unified_timeline(
            cdrs=cdr_dicts,
            financials=fin_dicts,
            firs=fir_dicts,
            evidence_items=ev_dicts
        )
        timeline_items = [TimelineEventItem(**evt) for evt in raw_timeline]

        # 4. Detect Bursts
        raw_comm_bursts = TemporalIntelligenceEngine.detect_communication_bursts(cdr_dicts)
        comm_bursts = [CommunicationBurstItem(**b) for b in raw_comm_bursts]

        raw_fin_bursts = TemporalIntelligenceEngine.detect_transaction_bursts(fin_dicts)
        fin_bursts = [TransactionBurstItem(**b) for b in raw_fin_bursts]

        # 5. Detect Spatiotemporal Anomalies
        raw_loc_anomalies = TemporalIntelligenceEngine.detect_location_anomalies(cdr_dicts)
        loc_anomalies = [LocationAnomalyItem(**l) for l in raw_loc_anomalies]

        # 6. Model Relationship Emergence
        raw_emergence = TemporalIntelligenceEngine.analyze_relationship_emergence(rel_dicts, cdr_dicts, fin_dicts)
        emergence_items = [RelationshipEmergenceItem(**em) for em in raw_emergence]

        # 7. Evaluate Clean-Slate Hypotheses
        raw_clean_slate = TemporalIntelligenceEngine.evaluate_clean_slate_anomalies(
            entities=entity_dicts,
            current_case_timeline=raw_timeline,
            evidence_items=ev_dicts,
            detected_bursts=raw_comm_bursts + raw_fin_bursts,
            location_anomalies=raw_loc_anomalies
        )
        clean_slate_items = [CleanSlateAnomalyItem(**cs) for cs in raw_clean_slate]

        # 8. Audit Log
        AuditService.log_action(
            db=db,
            action_type="TEMPORAL_INTELLIGENCE_REASONING",
            resource_type="TEMPORAL_ENGINE",
            case_id=case_id,
            operator_id=operator_id,
            details={
                "timeline_events": len(timeline_items),
                "comm_bursts": len(comm_bursts),
                "tx_bursts": len(fin_bursts),
                "loc_anomalies": len(loc_anomalies),
                "clean_slate_hypotheses": len(clean_slate_items),
            }
        )

        return TemporalIntelligenceResponse(
            case_id=case_id,
            total_events=len(timeline_items),
            timeline=timeline_items,
            communication_bursts=comm_bursts,
            transaction_bursts=fin_bursts,
            location_anomalies=loc_anomalies,
            relationship_emergence=emergence_items,
            clean_slate_anomalies=clean_slate_items
        )

    @staticmethod
    def get_clean_slate_anomalies(
        db: Session,
        case_id: str,
        operator_id: str = "analyst"
    ) -> List[CleanSlateAnomalyItem]:
        """
        Extracts only Clean-Slate Anomaly hypotheses for rapid investigator triage.
        """
        temp_resp = AnalyticsService.get_temporal_intelligence(db, case_id, operator_id)
        return temp_resp.clean_slate_anomalies


