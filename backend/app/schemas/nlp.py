from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ExtractedEntityResponse(BaseModel):
    id: str
    evidence_id: str
    case_id: str
    entity_type: str = Field(..., description="PERSON, PHONE_NUMBER, DEVICE, FINANCIAL_ACCOUNT, VEHICLE, LOCATION, ORGANIZATION, LEGAL_SECTION, etc.")
    raw_value: str
    normalized_value: str
    confidence: float
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    context_snippet: Optional[str] = None
    extraction_method: str = "HYBRID_REGEX_NER"
    entity_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExtractedRelationshipResponse(BaseModel):
    id: str
    evidence_id: str
    case_id: str
    source_entity_id: Optional[str] = None
    target_entity_id: Optional[str] = None
    source_value: str
    target_value: str
    relationship_type: str = Field(..., description="CALLS_TO, TRANSFERS_FUNDS_TO, USES_PHONE_NUMBER, OPERATES_HANDSET_DEVICE, CONTROLS_BANK_ACCOUNT, BOOKED_UNDER_SECTION, OPERATES_IN_LOCATION")
    relationship_nature: str = "OBSERVED"
    confidence: float
    context_snippet: Optional[str] = None
    extraction_method: str = "HYBRID_RELATION_EXTRACTOR"
    relationship_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DirectNLPRequest(BaseModel):
    text: str = Field(..., min_length=5, description="Raw text, FIR, statement or transcript to extract intelligence from")
    case_id: Optional[str] = None
    evidence_id: Optional[str] = None


class DirectNLPResult(BaseModel):
    language_info: Dict[str, Any]
    entities: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]
    entities_count: int
    relationships_count: int


class NLPProcessingResponse(BaseModel):
    evidence_id: str
    case_id: str
    status: str
    language_info: Dict[str, Any]
    entities_count: int
    relationships_count: int
    entities: List[ExtractedEntityResponse]
    relationships: List[ExtractedRelationshipResponse]
