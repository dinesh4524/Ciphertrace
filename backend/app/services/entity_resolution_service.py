import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.entity_resolution import (
    CanonicalEntity,
    CanonicalEntityMember,
    EntityResolutionCandidate,
)
from app.models.extracted_entity import ExtractedEntity
from app.models.user import User
from app.schemas.entity_resolution import (
    CanonicalEntityResponse,
    EntityResolutionCandidateResponse,
    ResolutionRunResult,
)
from app.services.audit_service import AuditService
from app.utils.entity_resolver import EntityResolutionEngine

logger = logging.getLogger(__name__)


class EntityResolutionService:
    @staticmethod
    def generate_canonical_code(db: Session, case_id: str, entity_type: str) -> str:
        count = db.query(CanonicalEntity).filter(CanonicalEntity.case_id == case_id).count() + 1
        prefix = entity_type[:4].upper()
        year = datetime.utcnow().year
        return f"CANON-{year}-{prefix}-{count:04d}"

    @staticmethod
    def run_case_entity_resolution(
        db: Session,
        case_id: str,
        operator_username: str = "intel_analyst",
        threshold: float = 0.70
    ) -> ResolutionRunResult:
        """
        Executes candidate generation across all extracted entities in a case.
        STRICT POLICY: Proposes candidates for human review. Never silently merges.
        """
        entities = db.query(ExtractedEntity).filter(ExtractedEntity.case_id == case_id).all()
        entity_dicts = [
            {
                "id": e.id,
                "entity_type": e.entity_type,
                "raw_value": e.raw_value,
                "normalized_value": e.normalized_value,
                "entity_metadata": e.entity_metadata or {}
            }
            for e in entities
        ]

        # Generate candidates using multi-strategy engine
        matches = EntityResolutionEngine.generate_candidates(entity_dicts, confidence_threshold=threshold)

        # Check existing candidates to avoid duplicates
        existing = db.query(EntityResolutionCandidate).filter(EntityResolutionCandidate.case_id == case_id).all()
        existing_pairs = {
            (c.source_entity_id, c.target_entity_id) for c in existing
        }.union({
            (c.target_entity_id, c.source_entity_id) for c in existing
        })

        new_candidates: List[EntityResolutionCandidate] = []
        for m in matches:
            if (m.source_id, m.target_id) not in existing_pairs:
                cand = EntityResolutionCandidate(
                    case_id=case_id,
                    source_entity_id=m.source_id,
                    target_entity_id=m.target_id,
                    source_value=m.source_value,
                    target_value=m.target_value,
                    entity_type=m.entity_type,
                    match_type=m.match_type,
                    confidence_score=m.confidence_score,
                    feature_scores=m.feature_scores,
                    review_status="PENDING_REVIEW",
                    merge_directive=m.merge_directive
                )
                db.add(cand)
                new_candidates.append(cand)
                existing_pairs.add((m.source_id, m.target_id))

        db.commit()

        # Audit event
        AuditService.log_action(
            db=db,
            action_type="ENTITY_RESOLUTION_EXECUTED",
            resource_type="CASE",
            case_id=case_id,
            operator_id=operator_username,
            details={
                "threshold": threshold,
                "total_entities_evaluated": len(entities),
                "candidates_proposed": len(new_candidates)
            }
        )

        all_candidates = db.query(EntityResolutionCandidate).filter(
            EntityResolutionCandidate.case_id == case_id
        ).order_by(EntityResolutionCandidate.confidence_score.desc()).all()

        return ResolutionRunResult(
            case_id=case_id,
            candidates_generated=len(new_candidates),
            candidates=[EntityResolutionCandidateResponse.model_validate(c) for c in all_candidates]
        )

    @staticmethod
    def get_case_candidates(
        db: Session,
        case_id: str,
        status: Optional[str] = None,
        entity_type: Optional[str] = None
    ) -> List[EntityResolutionCandidate]:
        query = db.query(EntityResolutionCandidate).filter(EntityResolutionCandidate.case_id == case_id)
        if status:
            query = query.filter(EntityResolutionCandidate.review_status == status.upper())
        if entity_type:
            query = query.filter(EntityResolutionCandidate.entity_type == entity_type.upper())
        return query.order_by(EntityResolutionCandidate.confidence_score.desc()).all()

    @staticmethod
    def review_candidate(
        db: Session,
        candidate_id: str,
        decision: str,
        decision_reason: str,
        merge_directive: str,
        reviewer: User
    ) -> EntityResolutionCandidate:
        """
        Processes human investigator decision:
        - ACCEPTED: Creates or adds to CanonicalEntity cluster, consolidating aliases and identifiers.
        - REJECTED: Flags match as false positive.
        - CHALLENGED: Flags identity conflict for supervisor / legal review.
        """
        candidate = db.query(EntityResolutionCandidate).filter(EntityResolutionCandidate.id == candidate_id).first()
        if not candidate:
            raise ValueError(f"Resolution candidate {candidate_id} not found")

        decision_upper = decision.upper()
        if decision_upper not in ("ACCEPTED", "REJECTED", "CHALLENGED"):
            raise ValueError(f"Invalid review decision: {decision}")

        candidate.review_status = decision_upper
        candidate.decision_reason = decision_reason
        candidate.merge_directive = merge_directive
        candidate.reviewed_by_user_id = reviewer.id
        candidate.reviewer_username = reviewer.username
        candidate.reviewed_at = datetime.utcnow()

        if decision_upper == "ACCEPTED":
            # Check if source or target entity already belongs to a CanonicalEntity
            src_member = db.query(CanonicalEntityMember).filter(
                CanonicalEntityMember.extracted_entity_id == candidate.source_entity_id
            ).first()
            tgt_member = db.query(CanonicalEntityMember).filter(
                CanonicalEntityMember.extracted_entity_id == candidate.target_entity_id
            ).first()

            canonical = None
            if src_member:
                canonical = db.query(CanonicalEntity).filter(CanonicalEntity.id == src_member.canonical_id).first()
            elif tgt_member:
                canonical = db.query(CanonicalEntity).filter(CanonicalEntity.id == tgt_member.canonical_id).first()

            if not canonical:
                # Create a new Canonical Entity
                canonical_code = EntityResolutionService.generate_canonical_code(
                    db=db, case_id=candidate.case_id, entity_type=candidate.entity_type
                )
                canonical = CanonicalEntity(
                    canonical_code=canonical_code,
                    case_id=candidate.case_id,
                    entity_type=candidate.entity_type,
                    canonical_name=candidate.source_value,
                    aliases=[candidate.source_value, candidate.target_value],
                    is_verified=True,
                    verified_by_user_id=reviewer.id
                )
                db.add(canonical)
                db.flush()

            # Add source entity member if not present
            if not src_member:
                m1 = CanonicalEntityMember(
                    canonical_id=canonical.id,
                    extracted_entity_id=candidate.source_entity_id,
                    association_confidence=candidate.confidence_score,
                    added_by_user_id=reviewer.id,
                    decision_reason=decision_reason
                )
                db.add(m1)

            # Add target entity member if not present
            if not tgt_member:
                m2 = CanonicalEntityMember(
                    canonical_id=canonical.id,
                    extracted_entity_id=candidate.target_entity_id,
                    association_confidence=candidate.confidence_score,
                    added_by_user_id=reviewer.id,
                    decision_reason=decision_reason
                )
                db.add(m2)

            # Update canonical aliases list
            current_aliases = set(canonical.aliases or [])
            current_aliases.add(candidate.source_value)
            current_aliases.add(candidate.target_value)
            canonical.aliases = list(current_aliases)
            canonical.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(candidate)

        # Record audit log
        AuditService.log_action(
            db=db,
            action_type="ENTITY_RESOLUTION_REVIEWED",
            resource_type="ENTITY_RESOLUTION_CANDIDATE",
            case_id=candidate.case_id,
            resource_id=candidate.id,
            operator_id=reviewer.username,
            details={
                "decision": decision_upper,
                "decision_reason": decision_reason,
                "source_value": candidate.source_value,
                "target_value": candidate.target_value,
                "confidence_score": candidate.confidence_score,
                "merge_directive": merge_directive
            }
        )

        return candidate

    @staticmethod
    def get_case_canonical_entities(db: Session, case_id: str) -> List[CanonicalEntityResponse]:
        entities = db.query(CanonicalEntity).filter(CanonicalEntity.case_id == case_id).all()
        results = []
        for e in entities:
            members_count = db.query(CanonicalEntityMember).filter(CanonicalEntityMember.canonical_id == e.id).count()
            resp = CanonicalEntityResponse(
                id=e.id,
                canonical_code=e.canonical_code,
                case_id=e.case_id,
                entity_type=e.entity_type,
                canonical_name=e.canonical_name,
                aliases=e.aliases or [],
                phone_numbers=e.phone_numbers or [],
                devices=e.devices or [],
                accounts=e.accounts or [],
                locations=e.locations or [],
                entity_metadata=e.entity_metadata or {},
                is_verified=e.is_verified,
                created_at=e.created_at,
                members_count=members_count
            )
            results.append(resp)
        return results
