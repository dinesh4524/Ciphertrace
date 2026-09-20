import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class FinancialRecord(Base):
    """
    Normalized Financial / Banking / Mule Account / Hawala Ledger Transaction.
    """
    __tablename__ = "financial_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False, index=True)
    
    sender_account = Column(String(100), nullable=False, index=True)
    receiver_account = Column(String(100), nullable=False, index=True)
    sender_bank = Column(String(150), nullable=True)
    receiver_bank = Column(String(150), nullable=True)
    
    amount = Column(Float, nullable=False, index=True)
    currency = Column(String(10), default="INR", nullable=False)
    txn_type = Column(String(50), default="NEFT/RTGS/IMPS", nullable=False) # IMPS, NEFT, RTGS, UPI, CASH_DEPOSIT, HAWALA_TOKEN
    
    utr_reference = Column(String(100), nullable=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    
    channel = Column(String(100), nullable=True) # MOBILE_BANKING, ATM, BRANCH, UPI_APP
    remarks = Column(Text, nullable=True)
    
    raw_payload = Column(JSON, default=dict)

    # Relationships
    evidence = relationship("EvidenceItem", back_populates="financial_records")
