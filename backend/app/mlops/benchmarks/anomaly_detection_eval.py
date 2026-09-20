"""
Anomaly Detection Evaluation Benchmark — CipherTrace X Phase 19.

Generates a synthetic temporal event stream with injected anomalies
(communication bursts, clean-slate patterns), evaluates the
TemporalIntelligenceEngine, logs results to MLflow.
"""
from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

from app.core.mlops_config import (
    EXPERIMENT_ANOMALY_DETECTION,
    GLOBAL_RANDOM_SEED,
)
from app.mlops import tracker
from app.mlops.dataset_registry import DatasetRegistry
from app.mlops.evaluator import EvaluationResult, ModelEvaluator
from app.mlops.reproducibility import ReproducibilityManager
from app.utils.temporal_engine import TemporalIntelligenceEngine

logger = logging.getLogger(__name__)

# ─── Synthetic Event Stream Builder ──────────────────────────────────────────

def _build_synthetic_cdr_stream(
    n_normal: int = 60,
    n_burst: int = 20,
    seed: int = GLOBAL_RANDOM_SEED,
) -> Tuple[List[Dict], List[Dict]]:
    """
    Build a synthetic CDR stream with normal calls and injected burst anomalies.
    Returns (cdr_records, ground_truth) where ground_truth is a list of
    {id, is_anomaly (bool), score (float)}.
    """
    rng = random.Random(seed)
    base_dt = datetime(2024, 6, 1, 8, 0, 0)
    records: List[Dict] = []
    ground_truth: List[Dict] = []

    # Normal calls: spread across 30 days
    for i in range(n_normal):
        dt = base_dt + timedelta(
            days=rng.randint(0, 29),
            hours=rng.randint(8, 22),
            minutes=rng.randint(0, 59),
        )
        rec_id = f"cdr_normal_{i}"
        records.append({
            "id": rec_id,
            "calling_number": f"+91{rng.randint(9000000000, 9999999999)}",
            "called_number":  f"+91{rng.randint(9000000000, 9999999999)}",
            "start_time": dt.isoformat(),
            "duration_sec": rng.randint(30, 300),
            "call_type": "VOICE",
        })
        ground_truth.append({"id": rec_id, "is_anomaly": False, "score": 0.0})

    # Burst anomalies: 20 calls between same pair within 2 hours
    burst_caller = "+917777777777"
    burst_called = "+918888888888"
    burst_start = base_dt + timedelta(days=15, hours=2)
    for j in range(n_burst):
        dt = burst_start + timedelta(minutes=j * 5)
        rec_id = f"cdr_burst_{j}"
        records.append({
            "id": rec_id,
            "calling_number": burst_caller,
            "called_number":  burst_called,
            "start_time": dt.isoformat(),
            "duration_sec": rng.randint(5, 60),
            "call_type": "VOICE",
        })
        ground_truth.append({"id": rec_id, "is_anomaly": True, "score": 0.85})

    return records, ground_truth


def run_benchmark(run_name: str = "anomaly-detection-eval-v1") -> EvaluationResult:
    """
    Execute the anomaly detection benchmark and log results to MLflow.
    """
    ReproducibilityManager.set_seeds(GLOBAL_RANDOM_SEED)

    cdr_records, ground_truth_labels = _build_synthetic_cdr_stream()

    registry = DatasetRegistry()
    registry.register(
        name="anomaly_detection_benchmark",
        data={"cdr_count": len(cdr_records), "anomaly_count": 20},
        feature_schema={"id": "str", "is_anomaly": "bool", "score": "float"},
        record_count=len(cdr_records),
        split="full",
        source="synthetic",
        tags={"phase": "19", "benchmark": "anomaly_detection"},
    )

    # Run TemporalIntelligenceEngine communication burst detection
    bursts = TemporalIntelligenceEngine.detect_communication_bursts(
        cdrs=cdr_records,
        window_hours=2,
        z_threshold=2.5,
    )

    # Map burst IDs to predictions
    # Bursts identify windows by entity pair; map back to CDR IDs
    burst_pairs = set()
    for b in bursts:
        caller = b.get("entity_1", "")
        called = b.get("entity_2", "")
        burst_pairs.add((min(caller, called), max(caller, called)))

    predictions: List[Dict] = []
    for rec in cdr_records:
        calling = rec["calling_number"]
        called  = rec["called_number"]
        pair = (min(calling, called), max(calling, called))
        in_burst = pair in burst_pairs
        predictions.append({
            "id": rec["id"],
            "is_anomaly": in_burst,
            "score": 0.85 if in_burst else 0.10,
        })

    with tracker.start_run(
        experiment_name=EXPERIMENT_ANOMALY_DETECTION,
        run_name=run_name,
        tags={"benchmark": "anomaly_detection"},
    ) as run:
        snap = ReproducibilityManager.snapshot(GLOBAL_RANDOM_SEED)
        ReproducibilityManager.log_to_mlflow(snap)

        tracker.log_params({
            "n_cdr_records": len(cdr_records),
            "n_injected_burst_records": 20,
            "burst_window_hours": 2,
            "z_threshold": 2.5,
            "seed": GLOBAL_RANDOM_SEED,
        })

        result = ModelEvaluator.eval_anomaly_detection(
            predictions=predictions,
            ground_truth=ground_truth_labels,
            target_recall=0.80,
        )

    logger.info("Anomaly Detection benchmark complete: %s", result.metrics)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = run_benchmark()
    print("Anomaly Detection Metrics:", res.metrics)
