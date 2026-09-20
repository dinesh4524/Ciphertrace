import hashlib
import json
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey, event
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditLog(Base):
    """
    Immutable Audit Log ensuring evidentiary chain of custody and full transparency.
    Every operation (Ingestion, Search, Graph Traversal, Export, Human Verification) is recorded here.
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=True, index=True)

    operator_id = Column(String(100), default="IO_OFFICER_01", nullable=False, index=True)
    operator_role = Column(String(50), default="INVESTIGATING_OFFICER")

    # Action types: INGESTION, EVIDENCE_VIEWED, INTEGRITY_VERIFIED, EXPORT_GENERATED, STATUS_CHANGED, NOTE_ADDED
    action_type = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)

    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    ip_address = Column(String(50), default="127.0.0.1")
    user_agent = Column(String(255), nullable=True, default="unknown")

    details_json = Column(JSON, default=dict)
    # Cryptographic digest of this entry to prevent retroactive manipulation
    entry_hash_sha256 = Column(String(64), nullable=True)

    # Relationships
    case = relationship("Case", back_populates="audit_logs")

    def compute_hash(self) -> str:
        """Computes SHA-256 digest of the audit record for tamper-evidence."""
        ts_str = self.timestamp.isoformat() if self.timestamp else ""
        details_str = json.dumps(self.details_json or {}, sort_keys=True)
        payload = f"{self.id}:{self.case_id}:{self.operator_id}:{self.action_type}:{self.resource_type}:{self.resource_id}:{ts_str}:{self.ip_address}:{details_str}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()


@event.listens_for(AuditLog, "before_insert")
def populate_audit_hash(mapper, connection, target: AuditLog):
    if not target.entry_hash_sha256:
        target.entry_hash_sha256 = target.compute_hash()

