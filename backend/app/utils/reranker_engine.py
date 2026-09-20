import re
from typing import List, Dict, Any


class HybridRerankerEngine:
    """
    Two-stage hybrid reranker.
    Fuses dense vector similarity with lexical BM25-style keyword matching
    and prioritizes critical forensic identifiers (phone numbers, UTRs, statutory legal sections).
    """

    PHONE_REGEX = re.compile(r"(?:\+91|91|0)?[6-9]\d{9}")
    ACCOUNT_REGEX = re.compile(r"\b(?:ACCT|A/C|UTR|IMPS|NEFT)[\w\-]+\b", re.IGNORECASE)
    SECTION_REGEX = re.compile(r"\b(?:section|sec|u/s)\s*\d+[a-z]?\b", re.IGNORECASE)

    @classmethod
    def rerank_chunks(
        cls,
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: int = 5,
        min_relevance: float = 0.15
    ) -> List[Dict[str, Any]]:
        """
        Reranks candidate chunks based on composite dense + lexical + entity boost scores.
        """
        if not chunks:
            return []

        query_lower = query.lower()
        query_terms = set(re.findall(r"\w+", query_lower))
        # Filter out common stop words
        stop_words = {"the", "is", "at", "which", "on", "a", "an", "and", "or", "in", "to", "for", "of", "with", "by"}
        query_terms = query_terms - stop_words

        # Extract special forensic tokens in query
        query_phones = set(cls.PHONE_REGEX.findall(query))
        query_accounts = set(cls.ACCOUNT_REGEX.findall(query))
        query_sections = set(cls.SECTION_REGEX.findall(query))

        reranked: List[Dict[str, Any]] = []

        for item in chunks:
            content = item.get("content", "")
            content_lower = content.lower()
            dense_sim = item.get("similarity_score", 0.0)

            # 1. Lexical Overlap Score
            content_terms = set(re.findall(r"\w+", content_lower))
            if query_terms:
                matching_terms = query_terms.intersection(content_terms)
                lexical_score = len(matching_terms) / len(query_terms)
            else:
                lexical_score = 0.0

            # 2. Exact Identifier Match Boosts
            boost = 0.0

            # Phone match
            if query_phones:
                for p in query_phones:
                    if p in content:
                        boost += 0.25
                        break

            # Account / UTR match
            if query_accounts:
                for a in query_accounts:
                    if a.lower() in content_lower:
                        boost += 0.25
                        break

            # Legal section match
            if query_sections:
                for s in query_sections:
                    if s.lower() in content_lower:
                        boost += 0.20
                        break

            # Suspect name match from chunk metadata
            suspect_name = item.get("chunk_metadata", {}).get("suspect_or_witness_name", "")
            if suspect_name and suspect_name.lower() in query_lower:
                boost += 0.20

            # 3. Composite Hybrid Score
            composite_score = (0.50 * max(0.0, dense_sim)) + (0.35 * lexical_score) + (0.15 * min(1.0, boost))
            final_score = round(min(1.0, composite_score), 4)

            if final_score >= min_relevance:
                reranked.append({
                    **item,
                    "rerank_score": final_score,
                    "lexical_score": round(lexical_score, 4),
                    "identifier_boost": round(boost, 4)
                })

        # Sort descending by final rerank_score
        reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
        return reranked[:top_k]
