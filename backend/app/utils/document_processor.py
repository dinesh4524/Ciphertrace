import io
import os
import re
from typing import Any, Dict, List, Optional, Tuple

try:
    from pypdf import PdfReader
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False


def extract_text_from_pdf(pdf_bytes: bytes) -> Tuple[str, Dict[str, Any]]:
    """
    Extracts text content and metadata from PDF bytes.
    Extracts page-by-page text preserving paragraph structures.
    """
    if not HAS_PYPDF:
        # Fallback simple string extraction for text streams
        try:
            text = pdf_bytes.decode('utf-8', errors='ignore')
            return text, {"page_count": 1, "extractor": "raw_stream_fallback"}
        except Exception:
            return "", {"page_count": 0, "extractor": "error"}

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        num_pages = len(reader.pages)
        text_parts = []
        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                text_parts.append(f"--- PAGE {idx + 1} ---\n{page_text}")
        
        full_text = "\n\n".join(text_parts)
        meta = {
            "page_count": num_pages,
            "pdf_metadata": {k: str(v) for k, v in (reader.metadata or {}).items()},
            "character_count": len(full_text),
            "word_count": len(full_text.split())
        }
        return full_text, meta
    except Exception as e:
        # Fallback
        text = pdf_bytes.decode('utf-8', errors='ignore')
        return text, {"page_count": 1, "extractor": "fallback", "error": str(e)}


def detect_document_language(text: str) -> Dict[str, Any]:
    """
    Detects language characteristics and presence of Indian Police / Legal Hinglish vocabulary.
    """
    if not text:
        return {"primary_language": "UNKNOWN", "is_hinglish": False, "confidence": 0.0}

    # Indian investigative terminology keywords
    hinglish_markers = [
        "thana", "chowki", "tehsil", "zila", "fariyadi", "aaropi", "muddayi",
        "hawala", "panchnama", "jabti", "talashi", "halafnama", "bayan",
        "shamil", "girftari", "muddaya", "tarik", "rokad", "benami"
    ]
    
    text_lower = text.lower()
    matched_markers = [m for m in hinglish_markers if re.search(r'\b' + m + r'\b', text_lower)]
    is_hinglish = len(matched_markers) >= 2

    return {
        "primary_language": "ENGLISH_INDIAN_LEGAL" if is_hinglish else "ENGLISH",
        "is_hinglish": is_hinglish,
        "matched_legal_keywords": matched_markers,
        "confidence": 0.95 if is_hinglish else 0.85
    }


def clean_and_preprocess_text(raw_text: str) -> str:
    """
    Cleans raw document text, normalizes whitespace and Unicode formatting.
    """
    if not raw_text:
        return ""
    
    # Normalize multiple newlines and tab characters
    cleaned = re.sub(r'\r\n', '\n', raw_text)
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', cleaned)
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()
