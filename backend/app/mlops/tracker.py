"""
MLflow Experiment Tracker — CipherTrace X Phase 19.

Thin, typed wrapper around mlflow that:
  - auto-creates experiments on first use
  - provides a context-manager API for clean run lifecycle management
  - exposes helpers for param / metric / artifact logging
  - wraps MLflow Model Registry for sklearn model promotion
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient

from app.core.mlops_config import (
    MLFLOW_ARTIFACT_ROOT,
    MLFLOW_TRACKING_URI,
)

logger = logging.getLogger(__name__)

# Initialise once at import time
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
Path(MLFLOW_ARTIFACT_ROOT).mkdir(parents=True, exist_ok=True)


def _get_or_create_experiment(experiment_name: str) -> str:
    """Return experiment_id, creating the experiment if it does not yet exist."""
    client = MlflowClient()
    exp = client.get_experiment_by_name(experiment_name)
    if exp is None:
        exp_id = client.create_experiment(
            name=experiment_name,
            artifact_location=str(Path(MLFLOW_ARTIFACT_ROOT) / experiment_name),
        )
        logger.info("Created MLflow experiment '%s' (id=%s)", experiment_name, exp_id)
        return exp_id
    return exp.experiment_id


@contextmanager
def start_run(
    experiment_name: str,
    run_name: str,
    tags: Optional[Dict[str, str]] = None,
) -> Generator[mlflow.ActiveRun, None, None]:
    """
    Context manager that creates / resumes an MLflow run.

    Usage::

        with start_run("ciphertrace_entity_resolution", "eval-v1") as run:
            log_params({"threshold": 0.7})
            log_metrics({"f1": 0.88})
    """
    exp_id = _get_or_create_experiment(experiment_name)
    effective_tags = {"project": "ciphertrace_x", "phase": "19"}
    if tags:
        effective_tags.update(tags)

    with mlflow.start_run(
        experiment_id=exp_id,
        run_name=run_name,
        tags=effective_tags,
    ) as run:
        logger.info(
            "MLflow run started: experiment='%s' run='%s' id=%s",
            experiment_name,
            run_name,
            run.info.run_id,
        )
        try:
            yield run
        except Exception:
            mlflow.set_tag("run_status", "FAILED")
            raise
        else:
            mlflow.set_tag("run_status", "SUCCESS")


def log_params(params: Dict[str, Any]) -> None:
    """Log a dict of hyperparameters to the active run."""
    # MLflow expects string values for params
    mlflow.log_params({k: str(v) for k, v in params.items()})


def log_metrics(metrics: Dict[str, float], step: Optional[int] = None) -> None:
    """Log a dict of scalar metrics to the active run."""
    mlflow.log_metrics(metrics, step=step)


def log_artifact(local_path: str, artifact_path: Optional[str] = None) -> None:
    """Log a local file or directory as an artifact."""
    mlflow.log_artifact(local_path, artifact_path=artifact_path)


def log_dict_as_artifact(data: Dict[str, Any], filename: str) -> None:
    """Serialise *data* to JSON and log as an artifact."""
    import json, tempfile, os
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(data, f, indent=2, default=str)
        tmp_path = f.name
    try:
        mlflow.log_artifact(tmp_path, artifact_path=filename)
    finally:
        os.unlink(tmp_path)


def register_model(run_id: str, model_name: str, stage: str = "Staging") -> None:
    """
    Register a model from *run_id* in the MLflow Model Registry and
    transition it to *stage* ('Staging' | 'Production' | 'Archived').
    """
    client = MlflowClient()
    model_uri = f"runs:/{run_id}/model"
    mv = mlflow.register_model(model_uri=model_uri, name=model_name)
    client.transition_model_version_stage(
        name=model_name,
        version=mv.version,
        stage=stage,
        archive_existing_versions=(stage == "Production"),
    )
    logger.info(
        "Registered model '%s' version=%s stage='%s'",
        model_name,
        mv.version,
        stage,
    )


def load_sklearn_model(model_name: str, stage: str = "Production") -> Any:
    """Load a registered sklearn model from the Model Registry."""
    model_uri = f"models:/{model_name}/{stage}"
    return mlflow.sklearn.load_model(model_uri)


def list_runs(experiment_name: str, max_results: int = 50) -> List[Dict[str, Any]]:
    """Return a list of run summaries for the given experiment."""
    client = MlflowClient()
    exp = client.get_experiment_by_name(experiment_name)
    if exp is None:
        return []
    runs = client.search_runs(
        experiment_ids=[exp.experiment_id],
        max_results=max_results,
        order_by=["start_time DESC"],
    )
    return [
        {
            "run_id": r.info.run_id,
            "run_name": r.info.run_name,
            "status": r.info.status,
            "start_time": r.info.start_time,
            "metrics": r.data.metrics,
            "params": r.data.params,
            "tags": r.data.tags,
        }
        for r in runs
    ]


def list_experiments() -> List[Dict[str, Any]]:
    """Return all MLflow experiments."""
    client = MlflowClient()
    exps = client.search_experiments()
    return [
        {
            "experiment_id": e.experiment_id,
            "name": e.name,
            "artifact_location": e.artifact_location,
            "lifecycle_stage": e.lifecycle_stage,
        }
        for e in exps
    ]
