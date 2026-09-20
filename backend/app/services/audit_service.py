import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogCreate
from app.utils.crypto import calculate_string_sha256


class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action_type: str,
        resource_type: str,
        case_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        operator_id: str = "IO_OFFICER_01",
        operator_role: str = "INVESTIGATING_OFFICER",
        ip_address: str = "127.0.0.1",
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Creates an immutable audit record with cryptographic hash anchoring.
        """
        details_dict = details or {}
        now = datetime.utcnow()

        # Generate cryptographic digest of the log payload
        log_payload = f"{action_type}|{resource_type}|{resource_id}|{case_id}|{operator_id}|{now.isoformat()}|{json.dumps(details_dict, sort_keys=True)}"
        entry_hash = calculate_string_sha256(log_payload)

        audit_entry = AuditLog(
            case_id=case_id,
            operator_id=operator_id,
            operator_role=operator_role,
            action_type=action_type,
            resource_type=resource_type,
            resource_id=resource_id,
            timestamp=now,
            ip_address=ip_address,
            details_json=details_dict,
            entry_hash_sha256=entry_hash
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry

    @staticmethod
    def get_logs(
        db: Session,
        case_id: Optional[str] = None,
        action_type: Optional[str] = None,
        operator_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[AuditLog], int]:
        query = db.query(AuditLog)
        if case_id:
            query = query.filter(AuditLog.case_id == case_id)
        if action_type:
            query = query.filter(AuditLog.action_type == action_type)
        if operator_id:
            query = query.filter(AuditLog.operator_id == operator_id)
        
        total = query.count()
        logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
        return logs, total
