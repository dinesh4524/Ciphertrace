from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    label: str = Field(..., description="Person, Phone, Device, Vehicle, Account, Location, Organization, Event, Evidence, Case")
    name: str
    properties: Dict[str, Any] = Field(default_factory=dict)
    is_canonical: bool = False
    degree: int = 0


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str = Field(..., description="CALLED, MESSAGED, OWNS, USED, VISITED, LOCATED_AT, TRANSFERRED, WORKS_FOR, ASSOCIATED_WITH, INVOLVED_IN")
    confidence: float = 1.0
    relationship_nature: str = Field(default="OBSERVED", description="OBSERVED, INFERRED, PREDICTED, CONTESTED")
    verification_status: str = Field(default="VERIFIED", description="VERIFIED, PENDING_REVIEW, CONTESTED, REJECTED")
    evidence_id: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphDataResponse(BaseModel):
    case_id: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_nodes: int
    total_edges: int


class GraphStatsResponse(BaseModel):
    case_id: str
    nodes_by_label: Dict[str, int]
    edges_by_type: Dict[str, int]
    total_nodes: int
    total_edges: int
    density: float = 0.0
    max_degree_node: Optional[str] = None


class GraphQueryRequest(BaseModel):
    case_id: str
    node_types: Optional[List[str]] = None
    relationship_types: Optional[List[str]] = None
    min_confidence: float = 0.0
    max_depth: int = 2
    cypher_query: Optional[str] = None
