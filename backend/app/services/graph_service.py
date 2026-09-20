import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from app.core.neo4j import get_neo4j_driver
from app.models.case import Case
from app.models.cdr import CDRRecord
from app.models.entity_resolution import CanonicalEntity, CanonicalEntityMember
from app.models.evidence import EvidenceItem
from app.models.extracted_entity import ExtractedEntity
from app.models.extracted_relationship import ExtractedRelationship
from app.models.financial import FinancialRecord
from app.models.fir import FIRDocument
from app.models.interrogation import InterrogationReport
from app.schemas.graph import GraphDataResponse, GraphEdge, GraphNode, GraphStatsResponse
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)


class GraphService:
    @staticmethod
    def sync_case_to_graph(db: Session, case_id: str, operator_username: str = "graph_sync") -> Dict[str, Any]:
        """
        Synchronizes all case evidence, canonical entities, raw extracted entities,
        CDR records, financial transactions, and relationships into the Knowledge Graph.
        Executes Neo4j Cypher merges if Neo4j is online, and updates in-memory graph projection.
        """
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        driver = get_neo4j_driver()
        neo4j_synced = False
        nodes_count = 0
        edges_count = 0

        # Gather case data
        evidences = db.query(EvidenceItem).filter(EvidenceItem.case_id == case_id).all()
        canonical_entities = db.query(CanonicalEntity).filter(CanonicalEntity.case_id == case_id).all()
        extracted_entities = db.query(ExtractedEntity).filter(ExtractedEntity.case_id == case_id).all()
        extracted_relationships = db.query(ExtractedRelationship).filter(ExtractedRelationship.case_id == case_id).all()
        cdr_records = db.query(CDRRecord).join(EvidenceItem, CDRRecord.evidence_id == EvidenceItem.id).filter(EvidenceItem.case_id == case_id).all()
        financial_records = db.query(FinancialRecord).join(EvidenceItem, FinancialRecord.evidence_id == EvidenceItem.id).filter(EvidenceItem.case_id == case_id).all()

        if driver:
            try:
                with driver.session() as session:
                    # 1. Ensure indexes & constraints
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Case) REQUIRE c.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (ph:Phone) REQUIRE ph.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (d:Device) REQUIRE d.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (a:Account) REQUIRE a.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (v:Vehicle) REQUIRE v.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (e:Evidence) REQUIRE e.id IS UNIQUE")

                    # 2. Merge Case Node
                    session.run(
                        """
                        MERGE (c:Case {id: $case_id})
                        SET c.case_number = $case_number, c.title = $title, c.priority = $priority
                        """,
                        case_id=case.id, case_number=case.case_number, title=case.title, priority=case.priority
                    )
                    nodes_count += 1

                    # 3. Merge Evidence Nodes & CONTAINS_EVIDENCE
                    for ev in evidences:
                        session.run(
                            """
                            MERGE (e:Evidence {id: $ev_id})
                            SET e.evidence_code = $code, e.file_name = $name, e.source_type = $stype, e.file_hash = $hash
                            WITH e
                            MATCH (c:Case {id: $case_id})
                            MERGE (c)-[:CONTAINS_EVIDENCE]->(e)
                            """,
                            ev_id=ev.id, code=ev.evidence_code or ev.id, name=ev.file_name,
                            stype=ev.source_type, hash=ev.file_hash_sha256, case_id=case.id
                        )
                        nodes_count += 1
                        edges_count += 1

                    # 4. Merge Canonical and Extracted Entities
                    for ent in extracted_entities:
                        lbl = GraphService._map_entity_type_to_label(ent.entity_type)
                        session.run(
                            f"""
                            MERGE (n:{lbl} {{id: $id}})
                            SET n.name = $val, n.case_id = $case_id, n.confidence = $conf, n.evidence_id = $ev_id
                            """,
                            id=ent.id, val=ent.normalized_value, case_id=case_id, conf=ent.confidence, ev_id=ent.evidence_id
                        )
                        nodes_count += 1

                    # 5. Merge Extracted Relationships
                    for rel in extracted_relationships:
                        rel_type = GraphService._normalize_relationship_type(rel.relationship_type)
                        session.run(
                            f"""
                            MATCH (s {{id: $src_id}}), (t {{id: $tgt_id}})
                            MERGE (s)-[r:{rel_type}]->(t)
                            SET r.relationship_nature = $nature, r.confidence = $conf,
                                r.evidence_id = $ev_id, r.verification_status = 'VERIFIED'
                            """,
                            src_id=rel.source_entity_id, tgt_id=rel.target_entity_id,
                            nature=rel.relationship_nature, conf=rel.confidence, ev_id=rel.evidence_id
                        )
                        edges_count += 1

                    # 6. Merge CDR Call Edges
                    for c in cdr_records:
                        cid = f"phone_{c.calling_number}"
                        tid = f"phone_{c.called_number}"
                        rel_name = "CALLED" if "VOICE" in (c.call_type or "").upper() else "MESSAGED"
                        session.run(
                            f"""
                            MERGE (p1:Phone {{id: $cid}}) ON CREATE SET p1.name = $cnum
                            MERGE (p2:Phone {{id: $tid}}) ON CREATE SET p2.name = $tnum
                            MERGE (p1)-[r:{rel_name}]->(p2)
                            SET r.duration_seconds = $dur, r.evidence_id = $ev_id, r.confidence = 0.99
                            """,
                            cid=cid, cnum=c.calling_number, tid=tid, tnum=c.called_number,
                            dur=c.duration_sec, ev_id=c.evidence_id
                        )
                        nodes_count += 2
                        edges_count += 1

                    # 7. Merge Financial Transfer Edges
                    for t in financial_records:
                        sid = f"acc_{t.sender_account}"
                        did = f"acc_{t.receiver_account}"
                        session.run(
                            """
                            MERGE (a1:Account {id: $sid}) ON CREATE SET a1.name = $snum, a1.bank = $sbank
                            MERGE (a2:Account {id: $did}) ON CREATE SET a2.name = $dnum, a2.bank = $dbank
                            MERGE (a1)-[r:TRANSFERRED]->(a2)
                            SET r.amount = $amt, r.currency = $curr, r.txn_type = $ttype, r.evidence_id = $ev_id, r.confidence = 1.0
                            """,
                            sid=sid, snum=t.sender_account, sbank=t.sender_bank,
                            did=did, dnum=t.receiver_account, dbank=t.receiver_bank,
                            amt=t.amount, curr=t.currency, ttype=t.txn_type, ev_id=t.evidence_id
                        )
                        nodes_count += 2
                        edges_count += 1

                    neo4j_synced = True
            except Exception as e:
                logger.warning(f"Neo4j synchronization warning: {e}. Falling back to relational graph projection.")

        # Log audit trail
        AuditService.log_action(
            db=db,
            action_type="GRAPH_SYNCHRONIZED",
            resource_type="KNOWLEDGE_GRAPH",
            case_id=case_id,
            operator_id=operator_username,
            details={
                "neo4j_live_sync": neo4j_synced,
                "entities_count": len(extracted_entities),
                "relationships_count": len(extracted_relationships),
                "cdr_records_count": len(cdr_records),
                "financial_records_count": len(financial_records)
            }
        )

        return {
            "case_id": case_id,
            "status": "SUCCESS",
            "neo4j_live": neo4j_synced,
            "synced_entities": len(extracted_entities),
            "synced_relationships": len(extracted_relationships)
        }

    @staticmethod
    def _map_entity_type_to_label(entity_type: str) -> str:
        mapping = {
            "PERSON": "Person",
            "PHONE_NUMBER": "Phone",
            "DEVICE": "Device",
            "FINANCIAL_ACCOUNT": "Account",
            "VEHICLE": "Vehicle",
            "LOCATION": "Location",
            "ORGANIZATION": "Organization",
            "LEGAL_SECTION": "LegalSection"
        }
        return mapping.get(entity_type.upper(), "Entity")

    @staticmethod
    def _normalize_relationship_type(rel_type: str) -> str:
        clean = rel_type.upper().replace(' ', '_').replace('-', '_')
        valid = {
            "CALLED", "MESSAGED", "OWNS", "USED", "VISITED", "LOCATED_AT",
            "TRANSFERRED", "WORKS_FOR", "ASSOCIATED_WITH", "INVOLVED_IN",
            "USES_PHONE_NUMBER", "OPERATES_HANDSET_DEVICE", "CONTROLS_BANK_ACCOUNT",
            "TRANSFERS_FUNDS_TO", "BOOKED_UNDER_SECTION", "OPERATES_IN_LOCATION"
        }
        return clean if clean in valid else "ASSOCIATED_WITH"

    @staticmethod
    def get_case_subgraph(
        db: Session,
        case_id: str,
        node_types: Optional[List[str]] = None,
        rel_types: Optional[List[str]] = None,
        min_confidence: float = 0.0
    ) -> GraphDataResponse:
        """
        Retrieves the complete Case Criminal Knowledge Graph topology.
        Combines Canonical Entities, Extracted Entities, Relationships, CDR flows, and Financial transfers.
        """
        nodes_dict: Dict[str, GraphNode] = {}
        edges_list: List[GraphEdge] = []
        node_degrees: Dict[str, int] = {}

        # 1. Fetch Case
        case = db.query(Case).filter(Case.id == case_id).first()
        if case:
            case_node_id = f"case_{case.id}"
            nodes_dict[case_node_id] = GraphNode(
                id=case_node_id,
                label="Case",
                name=f"{case.case_number}: {case.title}",
                properties={"priority": case.priority, "stage": case.stage, "status": case.status},
                is_canonical=True
            )

        # 2. Fetch Extracted Entities
        query_ent = db.query(ExtractedEntity).filter(ExtractedEntity.case_id == case_id)
        if node_types:
            query_ent = query_ent.filter(ExtractedEntity.entity_type.in_([t.upper() for t in node_types]))
        entities = query_ent.all()

        for ent in entities:
            lbl = GraphService._map_entity_type_to_label(ent.entity_type)
            nodes_dict[ent.id] = GraphNode(
                id=ent.id,
                label=lbl,
                name=ent.normalized_value,
                properties={
                    "raw_value": ent.raw_value,
                    "confidence": ent.confidence,
                    "evidence_id": ent.evidence_id,
                    "char_start": ent.char_start,
                    "char_end": ent.char_end
                },
                is_canonical=False
            )

        # 3. Fetch Extracted Relationships
        query_rel = db.query(ExtractedRelationship).filter(ExtractedRelationship.case_id == case_id)
        if rel_types:
            query_rel = query_rel.filter(ExtractedRelationship.relationship_type.in_([r.upper() for r in rel_types]))
        relationships = query_rel.all()

        for rel in relationships:
            if rel.confidence < min_confidence:
                continue

            src_id = rel.source_entity_id
            tgt_id = rel.target_entity_id

            # Fallback if IDs were not directly mapped
            if not src_id:
                # Find matching entity node by value
                for nid, n in nodes_dict.items():
                    if n.name == rel.source_value:
                        src_id = nid
                        break
            if not tgt_id:
                for nid, n in nodes_dict.items():
                    if n.name == rel.target_value:
                        tgt_id = nid
                        break

            if src_id and tgt_id and src_id in nodes_dict and tgt_id in nodes_dict:
                edge = GraphEdge(
                    id=rel.id,
                    source=src_id,
                    target=tgt_id,
                    label=rel.relationship_type,
                    confidence=rel.confidence,
                    relationship_nature=rel.relationship_nature,
                    verification_status="VERIFIED",
                    evidence_id=rel.evidence_id,
                    properties={"snippet": rel.context_snippet}
                )
                edges_list.append(edge)
                node_degrees[src_id] = node_degrees.get(src_id, 0) + 1
                node_degrees[tgt_id] = node_degrees.get(tgt_id, 0) + 1

        # 4. Integrate CDR Telecommunications Call & SMS Flows
        cdrs = db.query(CDRRecord).join(EvidenceItem, CDRRecord.evidence_id == EvidenceItem.id).filter(EvidenceItem.case_id == case_id).all()
        for cdr in cdrs:
            calling_id = f"phone_{cdr.calling_number}"
            called_id = f"phone_{cdr.called_number}"

            if calling_id not in nodes_dict:
                nodes_dict[calling_id] = GraphNode(
                    id=calling_id, label="Phone", name=cdr.calling_number,
                    properties={"provider": cdr.provider}
                )
            if called_id not in nodes_dict:
                nodes_dict[called_id] = GraphNode(
                    id=called_id, label="Phone", name=cdr.called_number,
                    properties={"provider": cdr.provider}
                )

            edge_id = f"cdr_{cdr.id}"
            lbl = "CALLED" if "VOICE" in (cdr.call_type or "").upper() else "MESSAGED"
            edges_list.append(GraphEdge(
                id=edge_id,
                source=calling_id,
                target=called_id,
                label=lbl,
                confidence=0.99,
                relationship_nature="OBSERVED",
                verification_status="VERIFIED",
                evidence_id=cdr.evidence_id,
                properties={
                    "duration_seconds": cdr.duration_sec,
                    "timestamp": cdr.start_time.isoformat() if cdr.start_time else None,
                    "imei": cdr.imei
                }
            ))
            node_degrees[calling_id] = node_degrees.get(calling_id, 0) + 1
            node_degrees[called_id] = node_degrees.get(called_id, 0) + 1

        # 5. Integrate Financial Hawala & Mule Bank Transfers
        txns = db.query(FinancialRecord).join(EvidenceItem, FinancialRecord.evidence_id == EvidenceItem.id).filter(EvidenceItem.case_id == case_id).all()
        for txn in txns:
            src_acc_id = f"acc_{txn.sender_account}"
            dst_acc_id = f"acc_{txn.receiver_account}"

            if src_acc_id not in nodes_dict:
                nodes_dict[src_acc_id] = GraphNode(
                    id=src_acc_id, label="Account", name=txn.sender_account,
                    properties={"bank_name": txn.sender_bank}
                )
            if dst_acc_id not in nodes_dict:
                nodes_dict[dst_acc_id] = GraphNode(
                    id=dst_acc_id, label="Account", name=txn.receiver_account,
                    properties={"bank_name": txn.receiver_bank}
                )

            edges_list.append(GraphEdge(
                id=f"txn_{txn.id}",
                source=src_acc_id,
                target=dst_acc_id,
                label="TRANSFERRED",
                confidence=1.0,
                relationship_nature="OBSERVED",
                verification_status="VERIFIED",
                evidence_id=txn.evidence_id,
                properties={
                    "amount_inr": txn.amount,
                    "txn_type": txn.txn_type,
                    "utr": txn.utr_reference
                }
            ))
            node_degrees[src_acc_id] = node_degrees.get(src_acc_id, 0) + 1
            node_degrees[dst_acc_id] = node_degrees.get(dst_acc_id, 0) + 1

        # Update node degrees
        for nid, node in nodes_dict.items():
            node.degree = node_degrees.get(nid, 0)

        return GraphDataResponse(
            case_id=case_id,
            nodes=list(nodes_dict.values()),
            edges=edges_list,
            total_nodes=len(nodes_dict),
            total_edges=len(edges_list)
        )

    @staticmethod
    def expand_node_neighborhood(db: Session, node_id: str, depth: int = 1) -> GraphDataResponse:
        """
        Expands the 1-hop / 2-hop neighborhood of a specified node.
        """
        # Search extracted entity by ID
        ent = db.query(ExtractedEntity).filter(ExtractedEntity.id == node_id).first()
        case_id = ent.case_id if ent else None

        if not case_id:
            # Check if phone / account node ID pattern
            if node_id.startswith("phone_"):
                phone_num = node_id.replace("phone_", "")
                cdr = db.query(CDRRecord).filter((CDRRecord.calling_number == phone_num) | (CDRRecord.called_number == phone_num)).first()
                if cdr and cdr.evidence:
                    case_id = cdr.evidence.case_id
            elif node_id.startswith("acc_"):
                acc_num = node_id.replace("acc_", "")
                fin = db.query(FinancialRecord).filter((FinancialRecord.sender_account == acc_num) | (FinancialRecord.receiver_account == acc_num)).first()
                if fin and fin.evidence:
                    case_id = fin.evidence.case_id

        if not case_id:
            return GraphDataResponse(case_id="UNKNOWN", nodes=[], edges=[], total_nodes=0, total_edges=0)

        # Get full case graph and filter to connected component
        full_graph = GraphService.get_case_subgraph(db, case_id)
        
        # Traverse BFS for depth
        visited_nodes: Set[str] = {node_id}
        current_layer = {node_id}

        for _ in range(depth):
            next_layer = set()
            for edge in full_graph.edges:
                if edge.source in current_layer:
                    next_layer.add(edge.target)
                elif edge.target in current_layer:
                    next_layer.add(edge.source)
            visited_nodes.update(next_layer)
            current_layer = next_layer

        filtered_nodes = [n for n in full_graph.nodes if n.id in visited_nodes]
        filtered_edges = [e for e in full_graph.edges if e.source in visited_nodes and e.target in visited_nodes]

        return GraphDataResponse(
            case_id=case_id,
            nodes=filtered_nodes,
            edges=filtered_edges,
            total_nodes=len(filtered_nodes),
            total_edges=len(filtered_edges)
        )

    @staticmethod
    def get_graph_stats(db: Session, case_id: str) -> GraphStatsResponse:
        graph = GraphService.get_case_subgraph(db, case_id)
        
        nodes_by_label: Dict[str, int] = {}
        for n in graph.nodes:
            nodes_by_label[n.label] = nodes_by_label.get(n.label, 0) + 1

        edges_by_type: Dict[str, int] = {}
        for e in graph.edges:
            edges_by_type[e.label] = edges_by_type.get(e.label, 0) + 1

        n_count = len(graph.nodes)
        e_count = len(graph.edges)
        possible_edges = n_count * (n_count - 1) if n_count > 1 else 1
        density = round(e_count / possible_edges, 4) if possible_edges > 0 else 0.0

        max_deg_node = max(graph.nodes, key=lambda n: n.degree).name if graph.nodes else None

        return GraphStatsResponse(
            case_id=case_id,
            nodes_by_label=nodes_by_label,
            edges_by_type=edges_by_type,
            total_nodes=n_count,
            total_edges=e_count,
            density=density,
            max_degree_node=max_deg_node
        )
