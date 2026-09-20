"""
Entity Resolution Evaluation Benchmark — CipherTrace X Phase 19.

Generates 50 synthetic entity pairs (25 true matches, 25 non-matches) with
known ground truth, runs EntityResolutionEngine.generate_candidates(), evaluates
with ModelEvaluator, and logs results to MLflow.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

from app.core.mlops_config import (
    EXPERIMENT_ENTITY_RESOLUTION,
    GLOBAL_RANDOM_SEED,
)
from app.mlops import tracker
from app.mlops.dataset_registry import DatasetRegistry
from app.mlops.evaluator import EvaluationResult, ModelEvaluator
from app.mlops.reproducibility import ReproducibilityManager
from app.utils.entity_resolver import EntityResolutionEngine

logger = logging.getLogger(__name__)

# ─── Synthetic Data Generator ────────────────────────────────────────────────

# True-match pairs: same person, slight name variation
_TRUE_MATCH_PAIRS: List[Tuple[Dict, Dict]] = [
    (
        {"id": f"E{i*2}", "entity_type": "PERSON", "raw_value": name_a,
         "normalized_value": name_a.upper(), "entity_metadata": {}},
        {"id": f"E{i*2+1}", "entity_type": "PERSON", "raw_value": name_b,
         "normalized_value": name_b.upper(), "entity_metadata": {}},
    )
    for i, (name_a, name_b) in enumerate([
        ("Rajesh Kumar", "Rajesh Kumarr"),           # typo
        ("Mohammed Ali", "Mohammad Ali"),              # transliteration
        ("Priya Sharma", "Priya Sharmaa"),             # extra char
        ("Suresh Babu", "Suresh Baabu"),               # vowel elongation
        ("Amit Singh", "Amith Singh"),                 # phonetic swap
        ("Ramesh Yadav", "Ramesh Yadev"),               # spelling var
        ("Sunita Devi", "Sunitha Devi"),                # transliteration
        ("Vikram Bhat", "Vikram Bhatt"),                # geminate
        ("Arun Kumar", "A. Kumar"),                    # initial
        ("Kavita Reddy", "Kavitha Reddy"),              # phonetic
        ("Naresh Gupta", "Naressh Gupta"),              # double-s
        ("Deepak Joshi", "Dipak Joshi"),                # vowel substitution
        ("Manoj Tiwari", "Manoj Tiwary"),               # regional variant
        ("Ravi Shankar", "Ravi Shankhar"),              # aspirate
        ("Sanjay Mishra", "Sanjay Misra"),              # simplification
        ("Anita Patel", "Anitha Patel"),                # southern vs. northern
        ("Vinod Mehta", "Vinod Metha"),                 # aspirate drop
        ("Girish Nair", "Girish Nayar"),                # r/y swap
        ("Hemant Shukla", "Hemant Shukla"),             # identical
        ("Lalita Roy", "Lalita Rai"),                   # dialectal
        ("Rekha Jain", "Rekha Jein"),                  # vowel
        ("Sudhir Chauhan", "Sudheer Chauhan"),          # elongation
        ("Pramod Tripathi", "Pramod Tripathy"),         # terminal
        ("Mukesh Saxena", "Mukesh Saksena"),            # alt spelling
        ("Dinesh Verma", "Dinesh Varma"),               # a/e swap
    ])
]

# Non-match pairs: clearly different entities
_NON_MATCH_PAIRS: List[Tuple[Dict, Dict]] = [
    (
        {"id": f"N{i*2}", "entity_type": "PERSON", "raw_value": name_a,
         "normalized_value": name_a.upper(), "entity_metadata": {}},
        {"id": f"N{i*2+1}", "entity_type": "PERSON", "raw_value": name_b,
         "normalized_value": name_b.upper(), "entity_metadata": {}},
    )
    for i, (name_a, name_b) in enumerate([
        ("Rajesh Kumar", "Sunita Devi"),
        ("Mohammed Ali", "Priya Sharma"),
        ("Arun Kumar", "Lalita Roy"),
        ("Vikram Bhat", "Rekha Jain"),
        ("Deepak Joshi", "Hemant Shukla"),
        ("Ravi Shankar", "Anita Patel"),
        ("Suresh Babu", "Girish Nair"),
        ("Sanjay Mishra", "Mukesh Saxena"),
        ("Pramod Tripathi", "Dinesh Verma"),
        ("Naresh Gupta", "Lalita Roy"),
        ("Kavita Reddy", "Manoj Tiwari"),
        ("Ramesh Yadav", "Vinod Mehta"),
        ("Amit Singh", "Rekha Jain"),
        ("Sudhir Chauhan", "Girish Nair"),
        ("Hemant Shukla", "Kavita Reddy"),
        ("Lalita Roy", "Naresh Gupta"),
        ("Rekha Jain", "Pramod Tripathi"),
        ("Anita Patel", "Sanjay Mishra"),
        ("Girish Nair", "Suresh Babu"),
        ("Dinesh Verma", "Ravi Shankar"),
        ("Mukesh Saxena", "Mohammed Ali"),
        ("Pramod Tripathi", "Amit Singh"),
        ("Sunita Devi", "Deepak Joshi"),
        ("Vinod Mehta", "Rajesh Kumar"),
        ("Manoj Tiwari", "Arun Kumar"),
    ])
]


def _build_dataset() -> Tuple[List[Dict], List[Dict]]:
    """Return (predictions, ground_truth) lists."""
    all_entities: List[Dict] = []
    ground_truth: List[Dict] = []
    seen_ids = set()

    def _add(entity: Dict) -> None:
        if entity["id"] not in seen_ids:
            all_entities.append(entity)
            seen_ids.add(entity["id"])

    # True-match pairs
    for src, tgt in _TRUE_MATCH_PAIRS:
        _add(src)
        _add(tgt)
        ground_truth.append({
            "source_id": src["id"],
            "target_id": tgt["id"],
            "is_match": True,
        })

    # Non-match pairs
    for src, tgt in _NON_MATCH_PAIRS:
        _add(src)
        _add(tgt)
        ground_truth.append({
            "source_id": src["id"],
            "target_id": tgt["id"],
            "is_match": False,
        })

    # Run engine
    matches = EntityResolutionEngine.generate_candidates(
        all_entities, confidence_threshold=0.60
    )
    match_pairs = {(m.source_id, m.target_id) for m in matches}
    match_scores = {(m.source_id, m.target_id): m.confidence_score for m in matches}

    predictions = [
        {
            "source_id": gt["source_id"],
            "target_id": gt["target_id"],
            "is_match": (gt["source_id"], gt["target_id"]) in match_pairs,
            "confidence_score": match_scores.get(
                (gt["source_id"], gt["target_id"]),
                match_scores.get((gt["target_id"], gt["source_id"]), 0.0),
            ),
        }
        for gt in ground_truth
    ]
    return predictions, ground_truth


def run_benchmark(run_name: str = "entity-resolution-eval-v1") -> EvaluationResult:
    """
    Execute the entity resolution benchmark and log results to MLflow.

    Returns EvaluationResult with er_precision, er_recall, er_f1, er_auc_roc, etc.
    """
    ReproducibilityManager.set_seeds(GLOBAL_RANDOM_SEED)

    # Register dataset version
    registry = DatasetRegistry()
    predictions, ground_truth = _build_dataset()
    registry.register(
        name="entity_resolution_benchmark",
        data=ground_truth,
        feature_schema={"source_id": "str", "target_id": "str", "is_match": "bool"},
        record_count=len(ground_truth),
        split="full",
        source="synthetic",
        tags={"phase": "19", "benchmark": "entity_resolution"},
    )

    with tracker.start_run(
        experiment_name=EXPERIMENT_ENTITY_RESOLUTION,
        run_name=run_name,
        tags={"benchmark": "entity_resolution"},
    ) as run:
        snap = ReproducibilityManager.snapshot(GLOBAL_RANDOM_SEED)
        ReproducibilityManager.log_to_mlflow(snap)

        tracker.log_params({
            "n_pairs": len(ground_truth),
            "n_true_matches": 25,
            "n_non_matches": 25,
            "confidence_threshold": 0.60,
            "seed": GLOBAL_RANDOM_SEED,
        })

        result = ModelEvaluator.eval_entity_resolution(predictions, ground_truth)

        tracker.log_dict_as_artifact(
            {"predictions": predictions, "ground_truth": ground_truth},
            "benchmark_data.json",
        )

    logger.info("Entity Resolution benchmark complete: %s", result.metrics)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = run_benchmark()
    print("Entity Resolution Metrics:", res.metrics)
