import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class CDRRecord(Base):
    """
    Normalized Call Detail Record (CDR) / IPDR Entity.
    """
    __tablename__ = "cdr_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False, index=True)
    
    calling_number = Column(String(50), nullable=False, index=True)
    called_number = Column(String(50), nullable=False, index=True)
    imei = Column(String(50), nullable=True, index=True)
    imsi = Column(String(50), nullable=True, index=True)
    
    call_type = Column(String(50), default="VOICE_CALL", nullable=False) # VOICE_CALL, SMS, DATA, ROAMING
    start_time = Column(DateTime, nullable=False, index=True)
    duration_sec = Column(Integer, default=0, nullable=False)
    
    cell_tower_id = Column(String(100), nullable=True, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    provider = Column(String(100), nullable=True)
    
    raw_payload = Column(JSON, default=dict)

    # Relationships
    evidence = relationship("EvidenceItem", back_populates="cdr_records")
