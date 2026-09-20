"""
MLOps Configuration for CipherTrace X — Phase 19.

Uses MLflow in local-SQLite tracking mode; no external server required.
All artifacts are stored under backend/mlflow_artifacts.
"""
import os
from pathlib import Path

# ─── Base paths ──────────────────────────────────────────────────────────────
_BACKEND_ROOT = Path(__file__).resolve().parents[2]   # backend/

MLFLOW_TRACKING_URI: str = os.getenv(
    "MLFLOW_TRACKING_URI",
    f"sqlite:///{_BACKEND_ROOT / 'mlflow.db'}"
)
MLFLOW_ARTIFACT_ROOT: str = os.getenv(
    "MLFLOW_ARTIFACT_ROOT",
    str(_BACKEND_ROOT / "mlflow_artifacts")
)

# ─── Experiment names (one per AI subsystem) ─────────────────────────────────
EXPERIMENT_ENTITY_RESOLUTION  = "ciphertrace_entity_resolution"
EXPERIMENT_HIDDEN_LINK         = "ciphertrace_hidden_link_prediction"
EXPERIMENT_ANOMALY_DETECTION   = "ciphertrace_anomaly_detection"
EXPERIMENT_RAG                 = "ciphertrace_rag_pipeline"
EXPERIMENT_LLM_GROUNDING       = "ciphertrace_llm_grounding"
EXPERIMENT_BIAS_BENCHMARK      = "ciphertrace_bias_benchmark"

# ─── Dataset / Model registry persistence files ───────────────────────────────
DATASET_REGISTRY_FILE: str = str(_BACKEND_ROOT / "mlops_datasets.jsonl")
MODEL_REGISTRY_FILE: str   = str(_BACKEND_ROOT / "mlops_models.jsonl")

# ─── Drift thresholds (PSI) ───────────────────────────────────────────────────
DRIFT_PSI_WARNING:  float = 0.20
DRIFT_PSI_CRITICAL: float = 0.25

# ─── Bias thresholds ─────────────────────────────────────────────────────────
BIAS_COUNTERFACTUAL_MAX_DELTA: float = 0.10   # max score diff after cf-swap
BIAS_DEMOGRAPHIC_PARITY_MAX:   float = 0.10

# ─── Reproducibility ─────────────────────────────────────────────────────────
GLOBAL_RANDOM_SEED: int = 42
