import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.core.database import Base


class DocumentChunk(Base):
    """
    Case-aware and permission-aware document chunk model with pgvector 384-dimensional embeddings.
    Strictly partitions evidentiary vector spaces by case_id under Section 63 BSA 2023.
    """
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=True, index=True)

    chunk_index = Column(Integer, default=0, nullable=False)
    content = Column(Text, nullable=False)
    char_start = Column(Integer, default=0, nullable=False)
    char_end = Column(Integer, default=0, nullable=False)
    token_count = Column(Integer, default=0, nullable=False)

    # 384-dimensional dense semantic vector for cosine similarity retrieval
    embedding = Column(Vector(384), nullable=True)

    source_type = Column(String(50), default="PDF_DOCUMENT", nullable=False, index=True)
    evidence_code = Column(String(100), nullable=True, index=True)
    chunk_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    case = relationship("Case", backref="document_chunks")
    evidence = relationship("EvidenceItem", backref="document_chunks")
