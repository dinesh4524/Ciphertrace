import re
from typing import Dict, List, Optional, Tuple

from app.schemas.graphrag import (
    PrimaryRoute,
    QueryClassificationResult,
    QueryIntent,
)


class QueryClassifier:
    """
    Intelligent Query Router and Classifier for GraphRAG.
    Classifies investigator questions into topological graph exploration,
    vector document RAG retrieval, ML link prediction, temporal intelligence,
    or evidence gap analysis.
    """

    # Regex patterns for intent detection
    INTENT_PATTERNS = {
        QueryIntent.ENTITY_CONNECTIVITY: [
            r"how\s+is\s+(.+?)\s+connected",
            r"how\s+(.+?)\s+is\s+connected",
            r"connected\s+to\s+the\s+case",
            r"role\s+of\s+(.+)",
            r"connections?\s+(for|of)\s+(.+)",
            r"involvement\s+of\s+(.+)",
            r"how\s+does\s+(.+?)\s+relate",
            r"path\s+(from|between)\s+(.+)",
            r"who\s+did\s+(.+?)\s+(call|meet|transfer|message)",
        ],
        QueryIntent.RELATIONSHIP_EVIDENCE: [
            r"what\s+evidence\s+supports",
            r"evidence\s+supports\s+(this|the)",
            r"what\s+proof\s+(supports|exists)",
            r"proof\s+of\s+(this|the)?\s*relationship",
            r"what\s+document\s+(proves|shows|substantiates)",
            r"how\s+do\s+we\s+know\s+(.+)",
            r"substantiate\s+(the|this)?\s*relationship",
            r"corroborat(e|ion|ing)\s+evidence",
            r"what\s+records?\s+confirm",
        ],
        QueryIntent.TEMPORAL_CHANGE: [
            r"what\s+changed\s+before",
            r"before\s+the\s+incident",
            r"prior\s+to\s+the\s+(incident|event|crime|attack|arrest)",
            r"what\s+happened\s+(before|prior|leading\s+up\s+to)",
            r"timeline\s+of\s+events",
            r"bursts?\s+in\s+communication",
            r"communication\s+burst",
            r"transaction\s+spike",
            r"unusual\s+(timing|activity|velocity)",
            r"temporal\s+(anomaly|pattern|change)",
        ],
        QueryIntent.CROSS_CLUSTER: [
            r"cross[- ]cluster",
            r"cross[- ]community",
            r"between\s+clusters",
            r"between\s+(the\s+)?(cells|communities|syndicates|groups)",
            r"connecting\s+separate\s+(clusters|cells|groups)",
            r"broker(s|ing)?",
            r"bridge(s)?\s+(between|across)",
            r"hidden\s+links?\s+(between|across)",
            r"inter[- ]cell\s+connections",
        ],
        QueryIntent.MISSING_EVIDENCE: [
            r"which\s+evidence\s+is\s+missing",
            r"what\s+evidence\s+is\s+missing",
            r"missing\s+evidence",
            r"evidence\s+gaps?",
            r"uncorroborated\s+(leads?|links?|claims?|statements?)",
            r"what\s+(is\s+)?missing",
            r"unverified\s+relationships?",
            r"single[- ]source\s+(corroboration|evidence)",
            r"what\s+has\s+not\s+been\s+proved",
            r"unrecovered\s+(devices?|phones?|handsets?|sims?)",
        ],
    }

    RELATIONSHIP_KEYWORDS = {
        "CALLED": ["call", "called", "phone call", "voice call"],
        "MESSAGED": ["message", "messaged", "sms", "whatsapp", "chat"],
        "TRANSFERRED": ["transfer", "transferred", "hawala", "sent money", "bank transfer", "payment"],
        "OWNS": ["owns", "owner", "registered to"],
        "USED": ["used", "operates", "handled", "operated"],
        "VISITED": ["visited", "travelled to", "stayed at", "located at"],
        "ASSOCIATED_WITH": ["associated", "linked to", "connected with", "known associate"],
        "WORKS_FOR": ["works for", "boss", "superior", "handler", "underling"],
    }

    @classmethod
    def classify(
        cls,
        query: str,
        focus_entity: Optional[str] = None
    ) -> QueryClassificationResult:
        """
        Classifies query text into investigative intent and engine routing flags.
        """
        q_lower = query.lower().strip()
        matched_intent = QueryIntent.GENERAL_INQUIRY
        highest_score = 0.0
        rationale_items: List[str] = []

        # 1. Evaluate intent patterns
        for intent, patterns in cls.INTENT_PATTERNS.items():
            for pat in patterns:
                match = re.search(pat, q_lower)
                if match:
                    matched_intent = intent
                    highest_score = 0.95
                    rationale_items.append(f"Matched pattern '{pat}' -> {intent.value}")
                    break
            if matched_intent != QueryIntent.GENERAL_INQUIRY:
                break

        # Fallback heuristic checking keywords
        if matched_intent == QueryIntent.GENERAL_INQUIRY:
            if "gap" in q_lower or "missing" in q_lower or "unsubstantiated" in q_lower:
                matched_intent = QueryIntent.MISSING_EVIDENCE
                highest_score = 0.85
                rationale_items.append("Keyword detection for missing evidence / gap")
            elif "cluster" in q_lower or "broker" in q_lower or "hidden link" in q_lower or "syndicate" in q_lower:
                matched_intent = QueryIntent.CROSS_CLUSTER
                highest_score = 0.85
                rationale_items.append("Keyword detection for cross-cluster / brokers")
            elif "before" in q_lower or "timeline" in q_lower or "burst" in q_lower or "changed" in q_lower or "prior" in q_lower:
                matched_intent = QueryIntent.TEMPORAL_CHANGE
                highest_score = 0.85
                rationale_items.append("Keyword detection for temporal changes / bursts")
            elif "evidence" in q_lower or "document" in q_lower or "proof" in q_lower or "support" in q_lower:
                matched_intent = QueryIntent.RELATIONSHIP_EVIDENCE
                highest_score = 0.85
                rationale_items.append("Keyword detection for evidentiary proof / documents")
            elif "connect" in q_lower or "how" in q_lower or "role" in q_lower or "who is" in q_lower:
                matched_intent = QueryIntent.ENTITY_CONNECTIVITY
                highest_score = 0.80
                rationale_items.append("Keyword detection for entity connectivity")

        # 2. Extract entities
        extracted_entities = cls._extract_entities(query, focus_entity)

        # 3. Extract relationship types
        extracted_rels = cls._extract_relationships(q_lower)

        # 4. Map Intent to Primary Route & Engine Plan
        primary_route, engine_plan = cls._derive_route_and_plan(matched_intent)

        rationale = "; ".join(rationale_items) if rationale_items else "Default general hybrid query routing"

        return QueryClassificationResult(
            primary_route=primary_route,
            question_intent=matched_intent,
            target_entities=extracted_entities,
            target_relationships=extracted_rels,
            engine_plan=engine_plan,
            confidence=highest_score if highest_score > 0 else 0.75,
            classification_rationale=rationale
        )

    @classmethod
    def _extract_entities(cls, query: str, focus_entity: Optional[str] = None) -> List[str]:
        entities: List[str] = []
        if focus_entity and focus_entity.strip():
            entities.append(focus_entity.strip())

        # Phone numbers (+91... or 10-digit)
        phone_matches = re.findall(r"(?:\+91[\-\s]?)?[6-9]\d{9}", query)
        entities.extend(phone_matches)

        # Quoted strings (e.g. "Vikram Sharma" or 'ACC-9988')
        quoted = re.findall(r"[\"']([^\"']+)[\"']", query)
        entities.extend([q.strip() for q in quoted if len(q.strip()) > 1])

        # Named Entity heuristics: Look for capitalized multi-word phrases (e.g. "Vikram Sharma", "Hawala King")
        name_matches = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b", query)
        for name in name_matches:
            if name.lower() not in {"what evidence", "which evidence", "how is", "show cross"}:
                entities.append(name.strip())

        # Account identifiers (ACC-..., HAWALA-..., SIM-...)
        id_matches = re.findall(r"\b(?:ACC|BANK|SIM|IMEI|VEH|NODE|CASE)[-_A-Za-z0-9]+\b", query, re.IGNORECASE)
        entities.extend([i.strip() for i in id_matches])

        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for e in entities:
            clean = e.strip()
            if clean and clean.lower() not in seen:
                seen.add(clean.lower())
                deduped.append(clean)
        return deduped

    @classmethod
    def _extract_relationships(cls, query_lower: str) -> List[str]:
        rels: List[str] = []
        for rel_type, keywords in cls.RELATIONSHIP_KEYWORDS.items():
            for kw in keywords:
                if kw in query_lower:
                    rels.append(rel_type)
                    break
        return rels

    @classmethod
    def _derive_route_and_plan(cls, intent: QueryIntent) -> Tuple[PrimaryRoute, Dict[str, bool]]:
        if intent == QueryIntent.ENTITY_CONNECTIVITY:
            return PrimaryRoute.GRAPH, {
                "needs_graph": True,
                "needs_rag": True,
                "needs_ml": True,
                "needs_temporal": False,
                "needs_gap_analysis": True,
            }
        elif intent == QueryIntent.RELATIONSHIP_EVIDENCE:
            return PrimaryRoute.DOC_RAG, {
                "needs_graph": True,
                "needs_rag": True,
                "needs_ml": False,
                "needs_temporal": False,
                "needs_gap_analysis": True,
            }
        elif intent == QueryIntent.TEMPORAL_CHANGE:
            return PrimaryRoute.TEMPORAL, {
                "needs_graph": True,
                "needs_rag": True,
                "needs_ml": False,
                "needs_temporal": True,
                "needs_gap_analysis": False,
            }
        elif intent == QueryIntent.CROSS_CLUSTER:
            return PrimaryRoute.ML_PREDICTION, {
                "needs_graph": True,
                "needs_rag": False,
                "needs_ml": True,
                "needs_temporal": False,
                "needs_gap_analysis": True,
            }
        elif intent == QueryIntent.MISSING_EVIDENCE:
            return PrimaryRoute.EVIDENCE_GAP, {
                "needs_graph": True,
                "needs_rag": True,
                "needs_ml": True,
                "needs_temporal": False,
                "needs_gap_analysis": True,
            }
        else:
            return PrimaryRoute.HYBRID_FUSION, {
                "needs_graph": True,
                "needs_rag": True,
                "needs_ml": True,
                "needs_temporal": True,
                "needs_gap_analysis": True,
            }
