from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class CanonicalEntityMemberResponse(BaseModel):
    id: str
    canonical_id: str
    extracted_entity_id: str
    association_confidence: float
    added_at: datetime
    decision_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CanonicalEntityResponse(BaseModel):
    id: str
    canonical_code: str
    case_id: str
    entity_type: str
    canonical_name: str
    aliases: List[str] = Field(default_factory=list)
    phone_numbers: List[str] = Field(default_factory=list)
    devices: List[str] = Field(default_factory=list)
    accounts: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    entity_metadata: Dict[str, Any] = Field(default_factory=dict)
    is_verified: bool
    created_at: datetime
    members_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class EntityResolutionCandidateResponse(BaseModel):
    id: str
    case_id: str
    source_entity_id: str
    target_entity_id: str
    source_value: str
    target_value: str
    entity_type: str
    match_type: str
    confidence_score: float
    feature_scores: Dict[str, Any] = Field(default_factory=dict)
    review_status: str # PENDING_REVIEW, ACCEPTED, REJECTED, CHALLENGED
    reviewed_by_user_id: Optional[str] = None
    reviewer_username: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    decision_reason: Optional[str] = None
    merge_directive: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateReviewRequest(BaseModel):
    decision: str = Field(..., description="ACCEPTED, REJECTED, CHALLENGED")
    decision_reason: str = Field(..., min_length=3, description="Mandatory investigative justification for Section 63 BSA audit trail")
    merge_directive: str = Field(default="MERGE_AS_CANONICAL", description="MERGE_AS_CANONICAL, LINK_AS_ASSOCIATE, KEEP_SEPARATE")


class ResolutionRunResult(BaseModel):
    case_id: str
    candidates_generated: int
    candidates: List[EntityResolutionCandidateResponse]
