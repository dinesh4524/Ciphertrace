"""
MLOps API Endpoints — CipherTrace X Phase 19.

Protected by SYSTEM_ADMINISTRATOR role (RBAC).

Routes:
  GET  /mlops/experiments                → list all MLflow experiments
  GET  /mlops/experiments/{name}/runs    → list runs for an experiment
  GET  /mlops/models                     → model registry summary
  POST /mlops/evaluate/{benchmark}       → trigger a benchmark run
  GET  /mlops/drift/latest               → latest drift report
  GET  /mlops/bias/report                → latest bias benchmark report
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.permissions import Role
from app.models.user import User
from app.mlops import tracker
from app.mlops.model_registry import ModelRegistry
from app.mlops.drift_detector import DriftDetector, DriftReport
from app.mlops.dataset_registry import DatasetRegistry

logger = logging.getLogger(__name__)

router = APIRouter()

_VALID_BENCHMARKS = {
    "entity_resolution",
    "hidden_link",
    "anomaly_detection",
    "rag",
    "llm_grounding",
    "bias",
}


# ─── Guards ──────────────────────────────────────────────────────────────────

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Raises 403 if the current user is not a SYSTEM_ADMINISTRATOR."""
    if current_user.role != Role.SYSTEM_ADMINISTRATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MLOps endpoints require SYSTEM_ADMINISTRATOR role.",
        )
    return current_user


# ─── Response Schemas ────────────────────────────────────────────────────────

class ExperimentSummary(BaseModel):
    experiment_id: str
    name: str
    artifact_location: str
    lifecycle_stage: str


class RunSummary(BaseModel):
    run_id: str
    run_name: Optional[str]
    status: str
    start_time: Optional[int]
    metrics: Dict[str, float]
    params: Dict[str, str]


class BenchmarkTriggerResponse(BaseModel):
    benchmark: str
    status: str
    metrics: Dict[str, Any]
    message: str


class BiasReportResponse(BaseModel):
    suspects: List[Dict[str, Any]]
    original_scores: Dict[str, float]
    swapped_scores: Dict[str, float]
    counterfactual_deltas: Dict[str, float]
    demographic_parity_difference: float
    disparate_impact_ratio: float
    individual_fairness_violations: List[str]
    bias_benchmark_passed: bool
    summary: str


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get(
    "/experiments",
    response_model=List[ExperimentSummary],
    summary="List all MLflow experiments",
)
def list_experiments(
    current_user: User = Depends(_require_admin),
) -> List[ExperimentSummary]:
    """Return all MLflow experiments registered for CipherTrace X."""
    exps = tracker.list_experiments()
    return [ExperimentSummary(**e) for e in exps]


@router.get(
    "/experiments/{experiment_name}/runs",
    response_model=List[RunSummary],
    summary="List runs for an MLflow experiment",
)
def list_runs(
    experiment_name: str,
    max_results: int = 20,
    current_user: User = Depends(_require_admin),
) -> List[RunSummary]:
    """Return the most recent runs for the named experiment."""
    runs = tracker.list_runs(experiment_name, max_results=max_results)
    return [
        RunSummary(
            run_id=r["run_id"],
            run_name=r.get("run_name"),
            status=r.get("status", "UNKNOWN"),
            start_time=r.get("start_time"),
            metrics=r.get("metrics", {}),
            params=r.get("params", {}),
        )
        for r in runs
    ]


@router.get(
    "/models",
    summary="List model registry",
)
def list_models(
    current_user: User = Depends(_require_admin),
) -> List[Dict[str, Any]]:
    """Return the current state of the local model registry."""
    registry = ModelRegistry()
    return registry.get_registry_summary()


@router.post(
    "/evaluate/{benchmark}",
    response_model=BenchmarkTriggerResponse,
    summary="Trigger a named benchmark run",
)
def run_benchmark(
    benchmark: str,
    current_user: User = Depends(_require_admin),
) -> BenchmarkTriggerResponse:
    """
    Trigger one of the five evaluation benchmarks or the bias benchmark.

    Valid values: entity_resolution, hidden_link, anomaly_detection,
                  rag, llm_grounding, bias
    """
    if benchmark not in _VALID_BENCHMARKS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown benchmark '{benchmark}'. Valid: {sorted(_VALID_BENCHMARKS)}",
        )

    try:
        if benchmark == "entity_resolution":
            from app.mlops.benchmarks.entity_resolution_eval import run_benchmark as _run
            result = _run()
            return BenchmarkTriggerResponse(
                benchmark=benchmark, status="SUCCESS",
                metrics=result.metrics, message="Entity resolution evaluation complete.",
            )

        elif benchmark == "hidden_link":
            from app.mlops.benchmarks.hidden_link_eval import run_benchmark as _run
            result = _run()
            return BenchmarkTriggerResponse(
                benchmark=benchmark, status="SUCCESS",
                metrics=result.metrics, message="Hidden-link prediction evaluation complete.",
            )

        elif benchmark == "anomaly_detection":
            from app.mlops.benchmarks.anomaly_detection_eval import run_benchmark as _run
            result = _run()
            return BenchmarkTriggerResponse(
                benchmark=benchmark, status="SUCCESS",
                metrics=result.metrics, message="Anomaly detection evaluation complete.",
            )

        elif benchmark == "rag":
            from app.mlops.benchmarks.rag_eval import run_benchmark as _run
            result = _run()
            return BenchmarkTriggerResponse(
                benchmark=benchmark, status="SUCCESS",
                metrics=result.metrics, message="RAG grounding evaluation complete.",
            )

        elif benchmark == "llm_grounding":
            from app.mlops.benchmarks.llm_grounding_eval import run_benchmark as _run
            result = _run()
            return BenchmarkTriggerResponse(
                benchmark=benchmark, status="SUCCESS",
                metrics=result.metrics, message="LLM grounding evaluation complete.",
            )

        elif benchmark == "bias":
            from app.mlops.benchmarks.bias_benchmark import run_benchmark as _run
            result = _run()
            return BenchmarkTriggerResponse(
                benchmark=benchmark,
                status="SUCCESS" if result.passed else "BIAS_DETECTED",
                metrics={
                    "demographic_parity_diff": result.demographic_parity_diff,
                    "disparate_impact_ratio":  result.disparate_impact,
                    "violations_count":        float(len(result.individual_fairness_violations)),
                    "passed":                  float(1 if result.passed else 0),
                },
                message=result.summary,
            )

    except Exception as exc:
        logger.exception("Benchmark '%s' failed: %s", benchmark, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Benchmark '{benchmark}' failed: {exc}",
        )


@router.get(
    "/drift/latest",
    response_model=DriftReport,
    summary="Run a synthetic drift check and return the latest drift report",
)
def get_drift_report(
    current_user: User = Depends(_require_admin),
) -> DriftReport:
    """
    Computes a drift report between synthetic reference and current distributions.
    In production, replace with real training vs. live score distributions.
    """
    import numpy as np
    rng = np.random.default_rng(42)

    # Reference: training distribution (normal, mean=0.3, std=0.1)
    ref = {"risk_score": list(rng.normal(0.3, 0.1, 200).clip(0, 1).tolist())}
    # Current: slightly shifted distribution (mean=0.35, std=0.12)
    cur = {"risk_score": list(rng.normal(0.35, 0.12, 200).clip(0, 1).tolist())}

    return DriftDetector.detect_input_drift(ref, cur)


@router.get(
    "/bias/report",
    response_model=BiasReportResponse,
    summary="Run and return the criminal-history-bias benchmark report",
)
def get_bias_report(
    current_user: User = Depends(_require_admin),
) -> BiasReportResponse:
    """Execute the five-person bias benchmark and return the full report."""
    from app.mlops.benchmarks.bias_benchmark import run_benchmark as _run
    result = _run()
    data = result.to_dict()
    return BiasReportResponse(
        suspects=data["suspects"],
        original_scores=data["original_scores"],
        swapped_scores=data["swapped_scores"],
        counterfactual_deltas=data["counterfactual_deltas"],
        demographic_parity_difference=data["demographic_parity_difference"],
        disparate_impact_ratio=data["disparate_impact_ratio"],
        individual_fairness_violations=data["individual_fairness_violations"],
        bias_benchmark_passed=data["bias_benchmark_passed"],
        summary=data["summary"],
    )


@router.get(
    "/datasets",
    summary="List all registered dataset versions",
)
def list_datasets(
    current_user: User = Depends(_require_admin),
) -> List[Dict[str, Any]]:
    """Return all dataset versions in the dataset registry."""
    registry = DatasetRegistry()
    return [dv.model_dump() for dv in registry.list_all()]
