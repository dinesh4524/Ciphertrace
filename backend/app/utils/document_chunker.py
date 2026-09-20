import re
from typing import Dict, List, Any, Optional


class EvidenceDocumentChunker:
    """
    Semantic sliding-window document chunking engine.
    Splits evidentiary transcripts, depositions, police FIRs, and case notes
    while preserving token spans, character offsets, and legal metadata.
    """

    DEFAULT_CHUNK_SIZE = 800      # Target character length per chunk (~150-200 tokens)
    DEFAULT_CHUNK_OVERLAP = 150   # Overlap between consecutive chunks to maintain context

    @classmethod
    def chunk_text(
        cls,
        text: str,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
        base_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Recursively splits text on natural boundaries (\n\n, \n, sentence ends, words)
        while strictly calculating character offsets [char_start, char_end].
        """
        if not text or not text.strip():
            return []

        cleaned_text = text.strip()
        chunks: List[Dict[str, Any]] = []
        meta = base_metadata.copy() if base_metadata else {}

        # If text is shorter than chunk_size, return as single chunk
        if len(cleaned_text) <= chunk_size:
            token_count = len(re.findall(r"\w+|[^\w\s]", cleaned_text))
            chunks.append({
                "chunk_index": 0,
                "content": cleaned_text,
                "char_start": 0,
                "char_end": len(cleaned_text),
                "token_count": token_count,
                "metadata": meta
            })
            return chunks

        # Sliding window with boundary awareness
        start_idx = 0
        chunk_idx = 0
        text_len = len(cleaned_text)

        while start_idx < text_len:
            end_idx = min(start_idx + chunk_size, text_len)

            # If not at the end of the text, look backwards for a clean split boundary
            if end_idx < text_len:
                # 1. Paragraph boundary (\n\n)
                paragraph_boundary = cleaned_text.rfind("\n\n", start_idx, end_idx)
                if paragraph_boundary != -1 and paragraph_boundary > start_idx + (chunk_size // 3):
                    end_idx = paragraph_boundary + 2
                else:
                    # 2. Line boundary (\n)
                    line_boundary = cleaned_text.rfind("\n", start_idx, end_idx)
                    if line_boundary != -1 and line_boundary > start_idx + (chunk_size // 3):
                        end_idx = line_boundary + 1
                    else:
                        # 3. Sentence boundary (. or ? or !)
                        sentence_match = re.search(r"[\.\?!]\s+", cleaned_text[start_idx:end_idx])
                        if sentence_match:
                            # find the last sentence boundary in the window
                            last_punct = -1
                            for m in re.finditer(r"[\.\?!]\s+", cleaned_text[start_idx:end_idx]):
                                last_punct = m.end()
                            if last_punct != -1 and (start_idx + last_punct) > start_idx + (chunk_size // 3):
                                end_idx = start_idx + last_punct
                            else:
                                # 4. Word boundary (space)
                                space_boundary = cleaned_text.rfind(" ", start_idx, end_idx)
                                if space_boundary != -1 and space_boundary > start_idx + (chunk_size // 3):
                                    end_idx = space_boundary + 1

            chunk_str = cleaned_text[start_idx:end_idx].strip()
            if chunk_str:
                token_count = len(re.findall(r"\w+|[^\w\s]", chunk_str))
                chunks.append({
                    "chunk_index": chunk_idx,
                    "content": chunk_str,
                    "char_start": start_idx,
                    "char_end": end_idx,
                    "token_count": token_count,
                    "metadata": {
                        **meta,
                        "chunk_seq": chunk_idx
                    }
                })
                chunk_idx += 1

            if end_idx >= text_len:
                break

            # Advance start_idx with overlap
            new_start = max(start_idx + 1, end_idx - chunk_overlap)
            # Avoid getting stuck
            if new_start <= start_idx:
                new_start = start_idx + chunk_size
            start_idx = new_start

        return chunks

    @classmethod
    def chunk_interrogation_report(cls, report: Any, evidence_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Chunks an InterrogationReport, enriching metadata with suspect identity and key admissions.
        """
        raw = getattr(report, "raw_transcript", "") or ""
        suspect = getattr(report, "suspect_or_witness_name", "UNKNOWN")
        role = getattr(report, "role_in_case", "SUSPECT")
        admissions = getattr(report, "key_admissions", []) or []

        base_meta = {
            "source_type": "INTERROGATION",
            "evidence_code": evidence_code,
            "suspect_or_witness_name": suspect,
            "role_in_case": role,
            "has_admissions": len(admissions) > 0,
            "sample_admission": admissions[0] if admissions else None
        }
        return cls.chunk_text(raw, base_metadata=base_meta)

    @classmethod
    def chunk_fir_document(cls, fir: Any, evidence_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Chunks an FIRDocument, extracting statutory sections and incident narratives.
        """
        sections = getattr(fir, "sections_invoked", []) or []
        fir_num = getattr(fir, "fir_number", "")
        ps = getattr(fir, "police_station", "")
        desc = getattr(fir, "incident_description", "") or ""

        # Prepend statutory header
        header = f"FIR #{fir_num} | Police Station: {ps} | Sections: {', '.join(sections)}\n\n"
        full_text = header + desc

        base_meta = {
            "source_type": "FIR",
            "evidence_code": evidence_code,
            "fir_number": fir_num,
            "police_station": ps,
            "sections_invoked": sections
        }
        return cls.chunk_text(full_text, base_metadata=base_meta)
