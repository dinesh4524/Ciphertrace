from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import check_case_access
from app.models.case import Case
from app.models.case_note import CaseNote
from app.models.document_chunk import DocumentChunk
from app.models.evidence import EvidenceItem
from app.models.fir import FIRDocument
from app.models.interrogation import InterrogationReport
from app.models.user import User
from app.schemas.rag import (
    RAGQueryRequest,
    RAGQueryResponse,
    CitationItem,
    RetrievedChunkItem,
    IndexCaseDocumentsResponse,
    RAGStatsResponse,
)
from app.services.audit_service import AuditService
from app.utils.document_chunker import EvidenceDocumentChunker
from app.utils.embedding_engine import DenseSemanticEmbeddingEngine
from app.utils.reranker_engine import HybridRerankerEngine
from app.utils.grounded_generator import GroundedAnswerGenerator


class RAGService:
    """
    Case-aware and permission-aware Document RAG Service.
    Enforces zero information leakage across case boundaries and cryptographically
    links all generated answers to verified source evidence under Section 63 BSA 2023.
    """

    @classmethod
    def index_case_documents(
        cls,
        db: Session,
        case_id: str,
        user: User
    ) -> IndexCaseDocumentsResponse:
        """
        Indexes all evidentiary text from evidence items, interrogation reports,
        police FIRs, and case notes into pgvector document chunks.
        """
        # 1. Enforce Case Access Control
        case = check_case_access(db, case_id, user, write_required=False)

        # 2. Clear old chunks for fresh indexing
        db.query(DocumentChunk).filter(DocumentChunk.case_id == case.id).delete()
        db.commit()

        total_docs = 0
        total_chunks = 0
        source_counts: Dict[str, int] = {}
        new_chunks: List[DocumentChunk] = []

        # 3. Index EvidenceItem extracted text content (PDFs, transcripts, memos)
        evidence_items = db.query(EvidenceItem).filter(
            EvidenceItem.case_id == case.id,
            EvidenceItem.extracted_text_content.isnot(None)
        ).all()

        for ev in evidence_items:
            text = ev.extracted_text_content or ""
            if len(text.strip()) < 10:
                continue

            raw_chunks = EvidenceDocumentChunker.chunk_text(
                text=text,
                base_metadata={
                    "evidence_id": ev.id,
                    "evidence_code": ev.evidence_code,
                    "source_type": ev.source_type,
                    "file_name": ev.file_name,
                    "file_hash": ev.file_hash_sha256,
                    "seizing_officer": ev.seizing_officer,
                    "evidence_category": ev.evidence_category
                }
            )

            for c in raw_chunks:
                emb = DenseSemanticEmbeddingEngine.embed_text(c["content"])
                chunk_obj = DocumentChunk(
                    case_id=case.id,
                    evidence_id=ev.id,
                    chunk_index=c["chunk_index"],
                    content=c["content"],
                    char_start=c["char_start"],
                    char_end=c["char_end"],
                    token_count=c["token_count"],
                    embedding=emb,
                    source_type=ev.source_type,
                    evidence_code=ev.evidence_code,
                    chunk_metadata=c["metadata"]
                )
                new_chunks.append(chunk_obj)
                source_counts[ev.source_type] = source_counts.get(ev.source_type, 0) + 1

            total_docs += 1

        # 4. Index Interrogation Reports
        interrogations = db.query(InterrogationReport).join(
            EvidenceItem, InterrogationReport.evidence_id == EvidenceItem.id
        ).filter(EvidenceItem.case_id == case.id).all()

        for ir in interrogations:
            ev = ir.evidence
            ev_code = ev.evidence_code if ev else None
            raw_chunks = EvidenceDocumentChunker.chunk_interrogation_report(ir, evidence_code=ev_code)

            for c in raw_chunks:
                emb = DenseSemanticEmbeddingEngine.embed_text(c["content"])
                chunk_obj = DocumentChunk(
                    case_id=case.id,
                    evidence_id=ir.evidence_id,
                    chunk_index=c["chunk_index"],
                    content=c["content"],
                    char_start=c["char_start"],
                    char_end=c["char_end"],
                    token_count=c["token_count"],
                    embedding=emb,
                    source_type="INTERROGATION",
                    evidence_code=ev_code,
                    chunk_metadata=c["metadata"]
                )
                new_chunks.append(chunk_obj)
                source_counts["INTERROGATION"] = source_counts.get("INTERROGATION", 0) + 1

            total_docs += 1

        # 5. Index FIR Documents
        firs = db.query(FIRDocument).join(
            EvidenceItem, FIRDocument.evidence_id == EvidenceItem.id
        ).filter(EvidenceItem.case_id == case.id).all()

        for fir in firs:
            ev = fir.evidence
            ev_code = ev.evidence_code if ev else None
            raw_chunks = EvidenceDocumentChunker.chunk_fir_document(fir, evidence_code=ev_code)

            for c in raw_chunks:
                emb = DenseSemanticEmbeddingEngine.embed_text(c["content"])
                chunk_obj = DocumentChunk(
                    case_id=case.id,
                    evidence_id=fir.evidence_id,
                    chunk_index=c["chunk_index"],
                    content=c["content"],
                    char_start=c["char_start"],
                    char_end=c["char_end"],
                    token_count=c["token_count"],
                    embedding=emb,
                    source_type="FIR",
                    evidence_code=ev_code,
                    chunk_metadata=c["metadata"]
                )
                new_chunks.append(chunk_obj)
                source_counts["FIR"] = source_counts.get("FIR", 0) + 1

            total_docs += 1

        # 6. Index Case Notes & Supervisory Directives
        notes = db.query(CaseNote).filter(CaseNote.case_id == case.id).all()
        for note in notes:
            text = f"{note.title}\n\n{note.content}"
            raw_chunks = EvidenceDocumentChunker.chunk_text(
                text=text,
                base_metadata={
                    "source_type": "CASE_NOTE",
                    "note_id": note.id,
                    "note_type": note.note_type,
                    "author_id": note.author_id
                }
            )

            for c in raw_chunks:
                emb = DenseSemanticEmbeddingEngine.embed_text(c["content"])
                chunk_obj = DocumentChunk(
                    case_id=case.id,
                    evidence_id=None,
                    chunk_index=c["chunk_index"],
                    content=c["content"],
                    char_start=c["char_start"],
                    char_end=c["char_end"],
                    token_count=c["token_count"],
                    embedding=emb,
                    source_type="CASE_NOTE",
                    evidence_code="NOTE-" + note.id[:8],
                    chunk_metadata=c["metadata"]
                )
                new_chunks.append(chunk_obj)
                source_counts["CASE_NOTE"] = source_counts.get("CASE_NOTE", 0) + 1

            total_docs += 1

        # Save all chunks
        if new_chunks:
            db.add_all(new_chunks)
            db.commit()
            total_chunks = len(new_chunks)

        # Audit Event
        AuditService.log_action(
            db=db,
            action_type="RAG_CASE_INDEXED",
            resource_type="DOCUMENT_CHUNKS",
            case_id=case.id,
            resource_id=case.id,
            operator_id=user.username,
            operator_role=user.role,
            details={
                "total_documents": total_docs,
                "total_chunks": total_chunks,
                "breakdown": source_counts
            }
        )

        return IndexCaseDocumentsResponse(
            case_id=case.id,
            total_documents_processed=total_docs,
            total_chunks_created=total_chunks,
            source_breakdown=source_counts,
            message=f"Successfully indexed {total_chunks} evidentiary vector chunks across {total_docs} documents."
        )

    @classmethod
    def query_rag(
        cls,
        db: Session,
        case_id: str,
        user: User,
        payload: RAGQueryRequest
    ) -> RAGQueryResponse:
        """
        Executes a case-isolated and permission-checked RAG retrieval and grounded generation.
        Strictly blocks cross-case and unauthorized confidential access.
        """
        # 1. Enforce Case Access Control (Blocks unauthorized / confidential access)
        case = check_case_access(db, case_id, user, write_required=False)

        # 2. Embed the incoming inquiry
        query_vec = DenseSemanticEmbeddingEngine.embed_text(payload.query)

        # 3. Retrieve Case-Isolated Candidates from pgvector store
        # STRICT CASE FILTER: WHERE case_id = :case_id
        q = db.query(DocumentChunk).filter(DocumentChunk.case_id == case.id)

        if payload.source_type_filter:
            q = q.filter(DocumentChunk.source_type.in_(payload.source_type_filter))

        if payload.evidence_id_filter:
            q = q.filter(DocumentChunk.evidence_id == payload.evidence_id_filter)

        candidate_records = q.all()

        if not candidate_records:
            # Auto-index if table is empty for this case and retry once
            cls.index_case_documents(db, case.id, user)
            candidate_records = q.all()

        # 4. Calculate Vector Cosine Similarity
        candidates_with_sim: List[Dict[str, Any]] = []
        for chk in candidate_records:
            if chk.embedding is None:
                continue
            sim = DenseSemanticEmbeddingEngine.cosine_similarity(query_vec, chk.embedding)
            candidates_with_sim.append({
                "chunk_id": chk.id,
                "case_id": chk.case_id,
                "evidence_id": chk.evidence_id,
                "chunk_index": chk.chunk_index,
                "content": chk.content,
                "source_type": chk.source_type,
                "evidence_code": chk.evidence_code,
                "similarity_score": sim,
                "chunk_metadata": chk.chunk_metadata or {}
            })

        # 5. Hybrid Reranking (Dense similarity + Lexical overlap + Identifier boosts)
        reranked = HybridRerankerEngine.rerank_chunks(
            query=payload.query,
            chunks=candidates_with_sim,
            top_k=payload.top_k,
            min_relevance=payload.min_relevance_score
        )

        # 6. Grounded Answer Synthesis & Evidentiary Citations
        synthesis = GroundedAnswerGenerator.generate_grounded_answer(
            query=payload.query,
            reranked_chunks=reranked
        )

        # 7. Convert items to schemas
        citation_models = [CitationItem(**c) for c in synthesis["citations"]]
        retrieved_chunk_models = [
            RetrievedChunkItem(
                chunk_id=r["chunk_id"],
                case_id=r["case_id"],
                evidence_id=r.get("evidence_id"),
                chunk_index=r["chunk_index"],
                content=r["content"],
                source_type=r["source_type"],
                evidence_code=r.get("evidence_code"),
                similarity_score=r.get("similarity_score", 0.0),
                rerank_score=r.get("rerank_score", 0.0),
                chunk_metadata=r.get("chunk_metadata", {})
            )
            for r in reranked
        ]

        # 8. Audit Logging under Section 63 BSA 2023
        AuditService.log_action(
            db=db,
            action_type="RAG_QUERY_EXECUTED",
            resource_type="CASE_RAG",
            case_id=case.id,
            resource_id=case.id,
            operator_id=user.username,
            operator_role=user.role,
            details={
                "query": payload.query,
                "retrieved_count": len(retrieved_chunk_models),
                "citations_count": len(citation_models),
                "grounding_status": synthesis["grounding_status"],
                "confidence_score": synthesis["confidence_score"]
            }
        )

        return RAGQueryResponse(
            case_id=case.id,
            query=payload.query,
            answer=synthesis["answer"],
            citations=citation_models,
            retrieved_chunks_count=len(retrieved_chunk_models),
            grounding_status=synthesis["grounding_status"],
            confidence_score=synthesis["confidence_score"],
            statutory_safeguard=synthesis["statutory_safeguard"],
            chunks=retrieved_chunk_models
        )

    @classmethod
    def get_rag_stats(
        cls,
        db: Session,
        case_id: str,
        user: User
    ) -> RAGStatsResponse:
        """
        Returns telemetry regarding the case's vector index status.
        """
        case = check_case_access(db, case_id, user, write_required=False)

        total_chunks = db.query(func.count(DocumentChunk.id)).filter(
            DocumentChunk.case_id == case.id
        ).scalar() or 0

        # Source type distribution
        dist = db.query(
            DocumentChunk.source_type, func.count(DocumentChunk.id)
        ).filter(DocumentChunk.case_id == case.id).group_by(DocumentChunk.source_type).all()

        distribution = {k: v for k, v in dist}

        last_chunk = db.query(DocumentChunk).filter(
            DocumentChunk.case_id == case.id
        ).order_by(DocumentChunk.created_at.desc()).first()

        last_indexed = last_chunk.created_at.isoformat() if last_chunk else None

        return RAGStatsResponse(
            case_id=case.id,
            total_chunks=total_chunks,
            source_type_distribution=distribution,
            last_indexed_at=last_indexed
        )
