"""
Hidden-Link Prediction Evaluation Benchmark — CipherTrace X Phase 19.

Builds a synthetic 30-node criminal network, holds out 20% of edges as the
test set, runs HiddenLinkPredictionEngine, evaluates Precision@10, MAP, NDCG,
AUC, and Brier score, then logs to MLflow.
"""
from __future__ import annotations

import logging
import random
from typing import Any, Dict, List, Set, Tuple

from app.core.mlops_config import EXPERIMENT_HIDDEN_LINK, GLOBAL_RANDOM_SEED
from app.mlops import tracker
from app.mlops.dataset_registry import DatasetRegistry
from app.mlops.evaluator import EvaluationResult, ModelEvaluator
from app.mlops.reproducibility import ReproducibilityManager
from app.utils.hidden_link_engine import HiddenLinkPredictionEngine

logger = logging.getLogger(__name__)


# ─── Synthetic Network Builder ────────────────────────────────────────────────

_ENTITY_TYPES = ["PERSON", "PHONE", "ACCOUNT", "VEHICLE", "LOCATION"]

def _build_synthetic_network(
    n_nodes: int = 30,
    n_edges: int = 60,
    seed: int = GLOBAL_RANDOM_SEED,
) -> Tuple[List[Dict], List[Dict]]:
    """
    Build a random criminal network with *n_nodes* nodes and *n_edges* edges.
    Returns (nodes_list, edges_list) as dicts compatible with
    HiddenLinkPredictionEngine.
    """
    rng = random.Random(seed)
    entity_names = [
        f"Entity-{i}" for i in range(n_nodes)
    ]
    nodes = [
        {
            "id": f"node_{i}",
            "name": entity_names[i],
            "label": rng.choice(_ENTITY_TYPES),
            "properties": {"weight": rng.uniform(0.5, 3.0)},
        }
        for i in range(n_nodes)
    ]
    node_ids = [n["id"] for n in nodes]

    edges_set: Set[Tuple[str, str]] = set()
    edges: List[Dict] = []
    attempts = 0
    while len(edges) < n_edges and attempts < n_edges * 20:
        attempts += 1
        u, v = rng.sample(node_ids, 2)
        if (u, v) not in edges_set and (v, u) not in edges_set:
            edges_set.add((u, v))
            edges.append({
                "id": f"edge_{len(edges)}",
                "source": u,
                "target": v,
                "label": rng.choice(["CALLED", "TRANSACTED", "CO-LOCATED", "ASSOCIATED"]),
                "confidence": rng.uniform(0.6, 1.0),
                "nature": "UNDIRECTED",
            })

    return nodes, edges


def _hold_out_edges(
    edges: List[Dict], holdout_frac: float = 0.20, seed: int = GLOBAL_RANDOM_SEED
) -> Tuple[List[Dict], List[Tuple[str, str]]]:
    """Split edges into train set and held-out (ground truth) set."""
    rng = random.Random(seed)
    shuffled = edges[:]
    rng.shuffle(shuffled)
    cut = max(1, int(len(shuffled) * holdout_frac))
    held_out_raw = shuffled[:cut]
    train_edges  = shuffled[cut:]
    held_out_pairs = [(e["source"], e["target"]) for e in held_out_raw]
    return train_edges, held_out_pairs


def run_benchmark(run_name: str = "hidden-link-eval-v1") -> EvaluationResult:
    """
    Execute the hidden-link prediction benchmark and log to MLflow.

    Returns EvaluationResult with hl_precision_at_10, hl_map, hl_ndcg, hl_auc, hl_brier_score.
    """
    ReproducibilityManager.set_seeds(GLOBAL_RANDOM_SEED)
    rng = random.Random(GLOBAL_RANDOM_SEED)

    nodes, all_edges = _build_synthetic_network(n_nodes=30, n_edges=60)
    train_edges, held_out_pairs = _hold_out_edges(all_edges, holdout_frac=0.20)

    # Register dataset
    registry = DatasetRegistry()
    registry.register(
        name="hidden_link_benchmark",
        data={"nodes": nodes, "train_edges": train_edges, "held_out": held_out_pairs},
        feature_schema={"node_id": "str", "edge_source": "str", "edge_target": "str"},
        record_count=len(nodes) + len(all_edges),
        split="train_test",
        source="synthetic",
        tags={"phase": "19", "benchmark": "hidden_link"},
    )

    # Run HiddenLinkPredictionEngine on all non-existing candidate pairs
    train_edge_set: Set[Tuple[str, str]] = {
        (e["source"], e["target"]) for e in train_edges
    } | {(e["target"], e["source"]) for e in train_edges}
    node_ids = [n["id"] for n in nodes]

    # Get predictions from engine (runs its own candidate generation internally)
    raw_result = HiddenLinkPredictionEngine.predict_hidden_links(
        nodes=nodes,
        edges=train_edges,
        min_confidence_threshold=0.30,
        limit=50,
    )

    # raw_result["predictions"] is a list of rich dicts with "candidate_link" + "confidence"
    predictions = [
        {
            "source_id": p["candidate_link"]["source_id"],
            "target_id": p["candidate_link"]["target_id"],
            "confidence_score": float(p.get("confidence", 0.5)),
        }
        for p in raw_result.get("predictions", [])
    ]

    with tracker.start_run(
        experiment_name=EXPERIMENT_HIDDEN_LINK,
        run_name=run_name,
        tags={"benchmark": "hidden_link"},
    ) as run:
        snap = ReproducibilityManager.snapshot(GLOBAL_RANDOM_SEED)
        ReproducibilityManager.log_to_mlflow(snap)

        tracker.log_params({
            "n_nodes": len(nodes),
            "n_train_edges": len(train_edges),
            "n_held_out_edges": len(held_out_pairs),
            "n_predictions_returned": len(predictions),
            "seed": GLOBAL_RANDOM_SEED,
        })

        result = ModelEvaluator.eval_hidden_link(
            predictions=predictions,
            ground_truth_edges=held_out_pairs,
            k=10,
        )

    logger.info("Hidden-Link benchmark complete: %s", result.metrics)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = run_benchmark()
    print("Hidden-Link Metrics:", res.metrics)
