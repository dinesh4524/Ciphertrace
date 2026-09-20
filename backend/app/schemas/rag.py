from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class CitationItem(BaseModel):
    """
    Cryptographically grounded evidence citation anchor under Section 63 BSA 2023.
    """
    citation_id: str
    evidence_id: Optional[str] = None
    evidence_code: Optional[str] = None
    source_type: str
    file_name: Optional[str] = None
    chunk_id: str
    chunk_index: int
    exact_quote: str
    relevance_score: float
    page_or_line: Optional[str] = None


class RetrievedChunkItem(BaseModel):
    """
    Retrieved and reranked evidentiary text chunk.
    """
    chunk_id: str
    case_id: str
    evidence_id: Optional[str] = None
    chunk_index: int
    content: str
    source_type: str
    evidence_code: Optional[str] = None
    similarity_score: float
    rerank_score: float
    chunk_metadata: Dict[str, Any] = Field(default_factory=dict)


class RAGQueryRequest(BaseModel):
    """
    Case-aware and permission-aware RAG query parameters.
    """
    query: str = Field(..., min_length=2, description="Investigation inquiry or question")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of top reranked chunks to retrieve")
    source_type_filter: Optional[List[str]] = Field(None, description="Filter chunks by source types (e.g., INTERROGATION, FIR, PDF_DOCUMENT)")
    evidence_id_filter: Optional[str] = Field(None, description="Optional filter to a specific evidence item")
    min_relevance_score: float = Field(default=0.15, ge=0.0, le=1.0, description="Minimum similarity threshold")


class RAGQueryResponse(BaseModel):
    """
    Grounded synthesis response with source citations and statutory compliance notice.
    """
    case_id: str
    query: str
    answer: str
    citations: List[CitationItem] = Field(default_factory=list)
    retrieved_chunks_count: int
    grounding_status: str = Field(default="FULLY_GROUNDED", description="FULLY_GROUNDED, PARTIALLY_GROUNDED, or INSUFFICIENT_EVIDENCE")
    confidence_score: float
    statutory_safeguard: str
    chunks: List[RetrievedChunkItem] = Field(default_factory=list)


class IndexCaseDocumentsResponse(BaseModel):
    """
    Result of chunking and embedding all case evidentiary documents.
    """
    case_id: str
    total_documents_processed: int
    total_chunks_created: int
    source_breakdown: Dict[str, int] = Field(default_factory=dict)
    message: str


class RAGStatsResponse(BaseModel):
    """
    Vector index telemetry for a case.
    """
    case_id: str
    total_chunks: int
    source_type_distribution: Dict[str, int] = Field(default_factory=dict)
    last_indexed_at: Optional[str] = None
