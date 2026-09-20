from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import check_case_access, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.analytics import (
    CommunityDetectionResponse,
    GraphAnomaliesResponse,
    HiddenLinkPredictionResponse,
    KeyPlayerResponse,
    LinkReviewRequest,
    PathfindingRequest,
    PathfindingResponse,
    KCoreResponse,
    StructuralOverviewResponse,
    MetricGlossaryResponse,
    HiddenLinkMLResponse,
    ReviewPredictionRequest,
    TemporalIntelligenceResponse,
    CleanSlateAnomalyItem,
)
from app.schemas.common import APIResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/key-players/{case_id}", response_model=APIResponse[KeyPlayerResponse])
def get_key_players_endpoint(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes centrality metrics (Degree, Betweenness, Closeness, PageRank, Eigenvector)
    and classifies key players into investigative archetypes (Kingpin, Broker, Hub).
    Includes non-culpability warning under Section 63 BSA 2023.
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.get_key_players(db, case_id, operator_id=current_user.username)
    return APIResponse(
        success=True,
        message=f"Analyzed {res.total_analyzed_nodes} entities for centrality and syndicate roles.",
        data=res
    )


@router.get("/communities/{case_id}", response_model=APIResponse[CommunityDetectionResponse])
def get_communities_endpoint(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Partitions the criminal network into syndicates and operational cells
    using modularity-optimized community detection.
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.get_communities(db, case_id, operator_id=current_user.username)
    return APIResponse(
        success=True,
        message=f"Identified {res.total_communities} syndicate communities with modularity Q={res.modularity}.",
        data=res
    )


@router.get("/structural-overview/{case_id}", response_model=APIResponse[StructuralOverviewResponse])
def get_structural_overview_endpoint(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes global topological properties: network density, average degree,
    diameter, clustering transitivity, and connected components.
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.get_structural_overview(db, case_id, operator_id=current_user.username)
    return APIResponse(
        success=True,
        message=f"Computed network topology: density={res.density}, transitivity={res.transitivity}.",
        data=res
    )


@router.get("/k-core/{case_id}", response_model=APIResponse[KCoreResponse])
def get_k_core_decomposition_endpoint(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes k-core decomposition peeling away peripheral nodes to isolate the
    resilient inner core of the criminal network.
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.get_k_core_decomposition(db, case_id, operator_id=current_user.username)
    return APIResponse(
        success=True,
        message=f"k-Core decomposition complete with maximum coreness k={res.max_core}.",
        data=res
    )


@router.get("/metrics-glossary", response_model=APIResponse[MetricGlossaryResponse])
def get_metrics_glossary_endpoint():
    """
    Returns legal & scientific glossary defining each graph metric, its formula,
    investigative meaning, benign alternative explanations, and the overarching Section 63 BSA doctrine.
    """
    res = AnalyticsService.get_metrics_glossary()
    return APIResponse(
        success=True,
        message=f"Loaded {res.total_metrics} graph metric definitions with judicial non-culpability statements.",
        data=res
    )


@router.post("/pathfinding/{case_id}", response_model=APIResponse[PathfindingResponse])
def find_investigative_path_endpoint(
    case_id: str,
    req: PathfindingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Traces multi-hop chain-of-custody path between any two suspects or entities
    using Dijkstra weighted traversal.
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.find_shortest_path(
        db=db,
        case_id=case_id,
        source_node_id=req.source_node_id,
        target_node_id=req.target_node_id,
        operator_id=current_user.username
    )
    msg = f"Path found across {res.hops} hops." if res.found else "No connected path found between selected entities."
    return APIResponse(
        success=True,
        message=msg,
        data=res
    )


@router.post("/predict-links/{case_id}", response_model=APIResponse[HiddenLinkPredictionResponse])
def predict_hidden_links_endpoint(
    case_id: str,
    min_probability: float = Query(0.35, ge=0.1, le=1.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes topological ML link prediction (Adamic-Adar, Jaccard, Common Contacts)
    to uncover latent criminal connections and conspirators.
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.predict_hidden_links(
        db=db,
        case_id=case_id,
        min_probability=min_probability,
        operator_id=current_user.username
    )
    return APIResponse(
        success=True,
        message=f"Generated {res.total_predicted_links} predicted links above probability threshold {min_probability}.",
        data=res
    )


@router.post("/accept-predicted-link/{case_id}", response_model=APIResponse[dict])
def accept_or_dismiss_predicted_link_endpoint(
    case_id: str,
    req: LinkReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Human investigator review for an AI-predicted hidden link.
    Admitted links are saved with Section 63 BSA audit rationale and tagged as INFERRED.
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.accept_or_dismiss_predicted_link(
        db=db,
        case_id=case_id,
        req=req,
        operator_id=current_user.username
    )
    return APIResponse(
        success=True,
        message=res["message"],
        data=res
    )


@router.get("/anomalies/{case_id}", response_model=APIResponse[GraphAnomaliesResponse])
def get_graph_anomalies_endpoint(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Detects critical network choke-points (bridges) and financial smurfing
    (fan-in aggregation / fan-out dispersion) anomalies.
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.get_anomalies(db, case_id, operator_id=current_user.username)
    return APIResponse(
        success=True,
        message=f"Detected {res.total_anomalies} topological anomalies.",
        data=res
    )


@router.post("/predict-links-ml/{case_id}", response_model=APIResponse[HiddenLinkMLResponse])
def predict_links_ml_endpoint(
    case_id: str,
    min_confidence: float = Query(0.40, ge=0.1, le=1.0, description="Minimum calibrated ML confidence threshold"),
    limit: int = Query(25, ge=1, le=100, description="Maximum candidate predictions to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Phase 9: Heterogeneous Graph ML Hidden-Link Prediction.
    Uncovers candidate covert links, computes calibrated ML confidence,
    supporting signals, contradictory signals, and multi-hop evidence paths.
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.predict_hidden_links_ml(
        db=db,
        case_id=case_id,
        min_confidence=min_confidence,
        limit=limit,
        operator_id=current_user.username
    )
    return APIResponse(
        success=True,
        message=f"Generated {res.total_predicted_links} ML predicted links via {res.model_name}.",
        data=res
    )


@router.post("/review-prediction/{case_id}", response_model=APIResponse[dict])
def review_ml_prediction_endpoint(
    case_id: str,
    req: ReviewPredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Phase 9: Human-in-the-Loop Review under Section 63 BSA 2023.
    A predicted link is NEVER automatically converted into confirmed evidence.
    Investigator reviews candidate, provides statutory justification, logs badge,
    and assigns status (ACCEPTED_AS_HYPOTHESIS, REJECTED, CHALLENGED).
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.review_ml_predicted_link(
        db=db,
        case_id=case_id,
        req=req,
        operator_id=current_user.username
    )
    return APIResponse(
        success=True,
        message=res["message"],
        data=res
    )


@router.get("/temporal-intelligence/{case_id}", response_model=APIResponse[TemporalIntelligenceResponse])
def get_temporal_intelligence_endpoint(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Phase 10: Unified Temporal Intelligence Pipeline.
    Reconstructs chronological multi-modal event timelines, communication bursts,
    transaction bursts, spatiotemporal anomalies, relationship emergence, and clean-slate hypotheses.
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.get_temporal_intelligence(
        db=db,
        case_id=case_id,
        operator_id=current_user.username
    )
    return APIResponse(
        success=True,
        message=f"Synthesized {res.total_events} timeline events across {len(res.communication_bursts)} comm bursts and {len(res.clean_slate_anomalies)} clean-slate hypotheses.",
        data=res
    )


@router.get("/clean-slate-anomalies/{case_id}", response_model=APIResponse[list[CleanSlateAnomalyItem]])
def get_clean_slate_anomalies_endpoint(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Phase 10: Clean-Slate Anomaly Engine under Section 63 BSA 2023.
    Retrieves prioritized investigative hypotheses for subjects with NO historical criminal record
    who exhibit acute current-case transaction/communication velocity (recruited mules, front cut-outs).
    """
    check_case_access(db, current_user, case_id)
    res = AnalyticsService.get_clean_slate_anomalies(
        db=db,
        case_id=case_id,
        operator_id=current_user.username
    )
    return APIResponse(
        success=True,
        message=f"Identified {len(res)} clean-slate recruited operative hypotheses under Section 63 BSA.",
        data=res
    )


