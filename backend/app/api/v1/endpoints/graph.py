from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import check_case_access, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.graph import (
    GraphDataResponse,
    GraphQueryRequest,
    GraphStatsResponse,
)
from app.services.graph_service import GraphService

router = APIRouter()


@router.post("/sync/{case_id}", response_model=APIResponse[dict], status_code=status.HTTP_200_OK)
def sync_case_to_graph_endpoint(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synchronizes case entities, verified canonical profiles, CDR call flows,
    financial transfers, and grounded relationships into the Neo4j Knowledge Graph.
    """
    check_case_access(db, current_user, case_id)
    res = GraphService.sync_case_to_graph(db, case_id, operator_username=current_user.username)
    return APIResponse(
        success=True,
        message=f"Case {case_id} synchronized to Knowledge Graph successfully.",
        data=res
    )


@router.get("/case/{case_id}", response_model=APIResponse[GraphDataResponse])
def get_case_graph_endpoint(
    case_id: str,
    node_types: Optional[List[str]] = Query(None, description="Filter by node labels e.g. Person, Phone, Device, Account"),
    rel_types: Optional[List[str]] = Query(None, description="Filter by edge labels e.g. CALLED, TRANSFERRED, USES"),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the complete Criminal Knowledge Graph subgraph for a case.
    """
    check_case_access(db, current_user, case_id)
    graph = GraphService.get_case_subgraph(
        db=db,
        case_id=case_id,
        node_types=node_types,
        rel_types=rel_types,
        min_confidence=min_confidence
    )
    return APIResponse(
        success=True,
        message=f"Retrieved graph topology with {graph.total_nodes} nodes and {graph.total_edges} edges.",
        data=graph
    )


@router.get("/node/{node_id}/expand", response_model=APIResponse[GraphDataResponse])
def expand_node_endpoint(
    node_id: str,
    depth: int = Query(1, ge=1, le=3),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Expands the 1-hop or 2-hop neighborhood of a given node in the graph.
    """
    graph = GraphService.expand_node_neighborhood(db=db, node_id=node_id, depth=depth)
    return APIResponse(
        success=True,
        message=f"Expanded neighborhood of node '{node_id}' with {graph.total_nodes} connected nodes.",
        data=graph
    )


@router.get("/stats/{case_id}", response_model=APIResponse[GraphStatsResponse])
def get_graph_stats_endpoint(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves topology metrics, density, node distribution, and primary hub nodes for the case graph.
    """
    check_case_access(db, current_user, case_id)
    stats = GraphService.get_graph_stats(db=db, case_id=case_id)
    return APIResponse(
        success=True,
        message=f"Graph statistics computed for case {case_id}",
        data=stats
    )


@router.post("/query", response_model=APIResponse[GraphDataResponse])
def query_graph_endpoint(
    payload: GraphQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes a structured query or Cypher filter against the case graph.
    """
    check_case_access(db, current_user, payload.case_id)
    graph = GraphService.get_case_subgraph(
        db=db,
        case_id=payload.case_id,
        node_types=payload.node_types,
        rel_types=payload.relationship_types,
        min_confidence=payload.min_confidence
    )
    return APIResponse(
        success=True,
        message=f"Query matched {graph.total_nodes} nodes and {graph.total_edges} edges.",
        data=graph
    )
