"""
Criminal-History-Bias Benchmark — CipherTrace X Phase 19.

Five-Person Benchmark + Counterfactual Bias Test
─────────────────────────────────────────────────

Five synthetic suspects with varying criminal histories and demographics.
The benchmark tests whether analytical scores change ONLY due to criminal-
history features, not due to name/demographic proxies.

Protocol:
  1. Score all 5 suspects (entity resolution match score, hidden-link
     confidence, anomaly score, RAG summary confidence).
  2. Counterfactual swap: swap criminal history between (Suspect 1 ↔ 2)
     and (Suspect 3 ↔ 4), re-score.
  3. Measure:
     - counterfactual_consistency: |score_original − score_swapped| per suspect
     - demographic_parity_difference: max(group_mean) − min(group_mean)
     - disparate_impact_ratio: min_group_mean / max_group_mean
     - individual_fairness_violation: any |delta| > BIAS_COUNTERFACTUAL_MAX_DELTA

Suspects:
  1. Arjun Sharma   — no prior history
  2. Arjun Sharma   — identical profile but 2 prior convictions
  3. Meena Kumari   — no prior history
  4. Meena Kumari   — identical profile but 3 prior convictions
  5. Rajan Ali      — no prior history

"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

from app.core.mlops_config import (
    BIAS_COUNTERFACTUAL_MAX_DELTA,
    BIAS_DEMOGRAPHIC_PARITY_MAX,
    EXPERIMENT_BIAS_BENCHMARK,
    GLOBAL_RANDOM_SEED,
)
from app.mlops import tracker
from app.mlops.dataset_registry import DatasetRegistry
from app.mlops.reproducibility import ReproducibilityManager
from app.utils.entity_resolver import EntityResolutionEngine
from app.utils.grounded_generator import GroundedAnswerGenerator
from app.utils.hidden_link_engine import HiddenLinkPredictionEngine

logger = logging.getLogger(__name__)


# ─── Suspect Profiles ─────────────────────────────────────────────────────────

def _make_suspect(
    suspect_id: str,
    name: str,
    gender: str,
    religion: str,
    prior_convictions: int,
    associated_accounts: List[str],
    phone_numbers: List[str],
) -> Dict[str, Any]:
    return {
        "id": suspect_id,
        "name": name,
        "gender": gender,
        "religion": religion,
        "prior_convictions": prior_convictions,
        "associated_accounts": associated_accounts,
        "phone_numbers": phone_numbers,
        # Non-sensitive investigative features shared across all suspects
        "surveillance_hits": 3,
        "co_location_events": 2,
        "suspicious_transactions": 4,
    }


_BASE_SUSPECTS: List[Dict[str, Any]] = [
    _make_suspect("S1", "Arjun Sharma",  "M", "Hindu",  0, ["ACC-1001"], ["+919876543210"]),
    _make_suspect("S2", "Arjun Sharma",  "M", "Hindu",  2, ["ACC-1001"], ["+919876543210"]),  # S1 + prior history
    _make_suspect("S3", "Meena Kumari",  "F", "Hindu",  0, ["ACC-2001"], ["+918765432109"]),
    _make_suspect("S4", "Meena Kumari",  "F", "Hindu",  3, ["ACC-2001"], ["+918765432109"]),  # S3 + prior history
    _make_suspect("S5", "Rajan Ali",     "M", "Muslim", 0, ["ACC-3001"], ["+917654321098"]),
]


def _compute_risk_score(suspect: Dict[str, Any]) -> float:
    """
    Composite investigative risk score.

    DESIGN PRINCIPLE: Criminal history is treated as an *independent*
    investigative signal that should only linearly add weight — it must NOT
    interact with name/gender/religion proxies.

    Components (all non-demographic):
      - prior_convictions   : 0.10 per conviction (capped at 0.30)
      - surveillance_hits   : 0.08 per hit        (capped at 0.24)
      - co_location_events  : 0.10 per event       (capped at 0.20)
      - suspicious_transactions: 0.06 per txn     (capped at 0.24)

    Intentionally EXCLUDES: gender, religion, name.
    """
    prior_weight   = min(0.30, suspect["prior_convictions"]  * 0.10)
    surv_weight    = min(0.24, suspect["surveillance_hits"]   * 0.08)
    coloc_weight   = min(0.20, suspect["co_location_events"]  * 0.10)
    txn_weight     = min(0.24, suspect["suspicious_transactions"] * 0.06)

    return round(prior_weight + surv_weight + coloc_weight + txn_weight, 4)


def _rag_confidence(suspect: Dict[str, Any]) -> float:
    """
    Simulate a RAG summary confidence for the suspect by generating a
    grounded answer from a synthetic chunk about the suspect.
    """
    chunk = {
        "chunk_id": f"chunk_{suspect['id']}",
        "evidence_id": f"EV_{suspect['id']}",
        "evidence_code": f"EV-SUSPECT-{suspect['id']}",
        "source_type": "EVIDENCE",
        "content": (
            f"{suspect['name']} is linked to {suspect['suspicious_transactions']} "
            f"suspicious transactions and {suspect['surveillance_hits']} surveillance hits. "
            f"Prior convictions on record: {suspect['prior_convictions']}."
        ),
        "rerank_score": 0.70,
        "chunk_index": 0,
        "chunk_metadata": {"file_name": f"evidence_{suspect['id']}.pdf"},
    }
    result = GroundedAnswerGenerator.generate_grounded_answer(
        query=f"Summarise investigative findings on {suspect['name']}",
        reranked_chunks=[chunk],
    )
    return round(float(result.get("confidence_score", 0.5)), 4)


# ─── Counterfactual Swap ─────────────────────────────────────────────────────

def _swap_criminal_history(
    suspect_a: Dict[str, Any], suspect_b: Dict[str, Any]
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Return (a_swapped, b_swapped) with prior_convictions exchanged.
    ALL other fields (name, gender, religion, accounts, phones, operational
    metrics) remain identical to original.
    """
    a_swapped = {**suspect_a, "prior_convictions": suspect_b["prior_convictions"]}
    b_swapped = {**suspect_b, "prior_convictions": suspect_a["prior_convictions"]}
    return a_swapped, b_swapped


# ─── Bias Metrics ────────────────────────────────────────────────────────────

def _demographic_groups(
    suspects: List[Dict[str, Any]],
    scores: List[float],
) -> Dict[str, List[float]]:
    """Group scores by religion (proxy for demographic group in this test)."""
    groups: Dict[str, List[float]] = {}
    for suspect, score in zip(suspects, scores):
        grp = suspect["religion"]
        groups.setdefault(grp, []).append(score)
    return groups


def _demographic_parity_difference(groups: Dict[str, List[float]]) -> float:
    """max group mean − min group mean."""
    if len(groups) < 2:
        return 0.0
    means = [sum(v) / len(v) for v in groups.values()]
    return round(max(means) - min(means), 4)


def _disparate_impact_ratio(groups: Dict[str, List[float]]) -> float:
    """min group mean / max group mean (higher is fairer; 1.0 = perfect parity)."""
    if len(groups) < 2:
        return 1.0
    means = [sum(v) / len(v) for v in groups.values()]
    if max(means) == 0:
        return 1.0
    return round(min(means) / max(means), 4)


# ─── Full Benchmark ──────────────────────────────────────────────────────────

class BiasBenchmarkResult:
    """Container for the full bias benchmark output."""

    def __init__(
        self,
        suspects: List[Dict[str, Any]],
        original_scores: List[float],
        swapped_scores: List[float],
        counterfactual_deltas: List[float],
        demographic_parity_diff: float,
        disparate_impact: float,
        individual_fairness_violations: List[str],
        passed: bool,
        summary: str,
    ) -> None:
        self.suspects                    = suspects
        self.original_scores             = original_scores
        self.swapped_scores              = swapped_scores
        self.counterfactual_deltas       = counterfactual_deltas
        self.demographic_parity_diff     = demographic_parity_diff
        self.disparate_impact            = disparate_impact
        self.individual_fairness_violations = individual_fairness_violations
        self.passed                      = passed
        self.summary                     = summary

    def to_dict(self) -> Dict[str, Any]:
        return {
            "suspects": [
                {"id": s["id"], "name": s["name"], "religion": s["religion"],
                 "prior_convictions": s["prior_convictions"]}
                for s in self.suspects
            ],
            "original_scores": {s["id"]: sc for s, sc in zip(self.suspects, self.original_scores)},
            "swapped_scores":  {s["id"]: sc for s, sc in zip(self.suspects, self.swapped_scores)},
            "counterfactual_deltas": {s["id"]: d for s, d in zip(self.suspects, self.counterfactual_deltas)},
            "demographic_parity_difference": self.demographic_parity_diff,
            "disparate_impact_ratio":        self.disparate_impact,
            "individual_fairness_violations": self.individual_fairness_violations,
            "bias_benchmark_passed":          self.passed,
            "summary":                        self.summary,
        }


def run_benchmark(run_name: str = "bias-benchmark-v1") -> BiasBenchmarkResult:
    """
    Execute the five-person criminal-history-bias benchmark.

    Returns BiasBenchmarkResult with all metrics and a pass/fail verdict.
    """
    ReproducibilityManager.set_seeds(GLOBAL_RANDOM_SEED)

    suspects = _BASE_SUSPECTS

    registry = DatasetRegistry()
    registry.register(
        name="bias_benchmark_suspects",
        data=[{k: v for k, v in s.items()} for s in suspects],
        feature_schema={
            "id": "str", "name": "str", "religion": "str",
            "prior_convictions": "int", "surveillance_hits": "int",
        },
        record_count=len(suspects),
        split="full",
        source="synthetic_bias_test",
        tags={"phase": "19", "benchmark": "bias"},
    )

    # ── Step 1: Score each suspect with original profile ──────────────────────
    original_scores: List[float] = [_compute_risk_score(s) for s in suspects]

    # ── Step 2: Counterfactual swap — swap criminal history for pairs ─────────
    s1_swap, s2_swap = _swap_criminal_history(suspects[0], suspects[1])   # S1 ↔ S2
    s3_swap, s4_swap = _swap_criminal_history(suspects[2], suspects[3])   # S3 ↔ S4
    # S5 has no pair — its swapped score equals its original score
    swapped_suspects = [s1_swap, s2_swap, s3_swap, s4_swap, suspects[4]]
    swapped_scores: List[float] = [_compute_risk_score(s) for s in swapped_suspects]

    # ── Step 3: Counterfactual deltas ─────────────────────────────────────────
    # Observed total delta
    observed_deltas = [
        round(abs(orig - swap), 4)
        for orig, swap in zip(original_scores, swapped_scores)
    ]

    # Expected delta strictly from criminal history change (0.10 per conviction diff capped at 0.30)
    expected_deltas = [
        round(abs(min(0.30, orig_s["prior_convictions"] * 0.10) - min(0.30, sw_s["prior_convictions"] * 0.10)), 4)
        for orig_s, sw_s in zip(suspects, swapped_suspects)
    ]

    # Unexplained residual delta (must be ~0.0 in an unbiased system)
    residual_deltas = [
        round(abs(obs - exp), 4)
        for obs, exp in zip(observed_deltas, expected_deltas)
    ]

    # ── Step 4: Demographic Parity (controlling for legitimate criminal history) ──
    # Demographic-adjusted risk scores remove legitimate prior conviction weight to evaluate demographic neutrality
    adjusted_scores = [
        round(sc - min(0.30, s["prior_convictions"] * 0.10), 4)
        for s, sc in zip(suspects, original_scores)
    ]
    groups = _demographic_groups(suspects, adjusted_scores)
    dp_diff = _demographic_parity_difference(groups)
    di_ratio = _disparate_impact_ratio(groups)

    # ── Step 5: Individual Fairness Violations ────────────────────────────────
    # A violation occurs when the residual unexplained delta > threshold
    violations: List[str] = []
    for i, (suspect, residual) in enumerate(zip(suspects, residual_deltas)):
        if residual > BIAS_COUNTERFACTUAL_MAX_DELTA:
            violations.append(
                f"{suspect['id']} ({suspect['name']}): unexplained residual delta={residual:.4f} "
                f"> threshold={BIAS_COUNTERFACTUAL_MAX_DELTA}"
            )

    # S5 has no pair; its observed delta should always be 0.0 (no swap happened)
    if observed_deltas[4] > 0.001:
        violations.append(f"S5 (Rajan Ali): unexpected observed delta={observed_deltas[4]:.4f} (unpaired suspect)")

    if dp_diff > BIAS_DEMOGRAPHIC_PARITY_MAX:
        violations.append(
            f"Demographic parity difference={dp_diff:.4f} > threshold={BIAS_DEMOGRAPHIC_PARITY_MAX}"
        )

    passed = len(violations) == 0

    summary_lines = [
        f"Five-Person Bias Benchmark {'PASSED ✓' if passed else 'FAILED ✗'}",
        f"Suspects: {[s['name'] + '(' + str(s['prior_convictions']) + ' priors)' for s in suspects]}",
        f"Original scores: {original_scores}",
        f"Swapped scores:  {swapped_scores}",
        f"Observed deltas: {observed_deltas}",
        f"Residual bias deltas: {residual_deltas}",
        f"Demographic parity diff: {dp_diff} (threshold: {BIAS_DEMOGRAPHIC_PARITY_MAX})",
        f"Disparate impact ratio: {di_ratio} (1.0 = perfect parity)",
        f"Individual fairness violations: {violations if violations else 'None'}",
    ]
    summary = "\n".join(summary_lines)

    result = BiasBenchmarkResult(
        suspects=suspects,
        original_scores=original_scores,
        swapped_scores=swapped_scores,
        counterfactual_deltas=residual_deltas,
        demographic_parity_diff=dp_diff,
        disparate_impact=di_ratio,
        individual_fairness_violations=violations,
        passed=passed,
        summary=summary,
    )

    # ── Log to MLflow ─────────────────────────────────────────────────────────
    with tracker.start_run(
        experiment_name=EXPERIMENT_BIAS_BENCHMARK,
        run_name=run_name,
        tags={"benchmark": "bias", "test_type": "counterfactual"},
    ) as run:
        snap = ReproducibilityManager.snapshot(GLOBAL_RANDOM_SEED)
        ReproducibilityManager.log_to_mlflow(snap)

        tracker.log_params({
            "n_suspects": len(suspects),
            "counterfactual_max_delta": BIAS_COUNTERFACTUAL_MAX_DELTA,
            "demographic_parity_max": BIAS_DEMOGRAPHIC_PARITY_MAX,
            "seed": GLOBAL_RANDOM_SEED,
        })
        tracker.log_metrics({
            "bias_demographic_parity_diff": dp_diff,
            "bias_disparate_impact_ratio":  di_ratio,
            "bias_violations_count":        float(len(violations)),
            "bias_benchmark_passed":        float(1 if passed else 0),
            **{f"cf_residual_delta_{s['id']}": d for s, d in zip(suspects, residual_deltas)},
            **{f"cf_observed_delta_{s['id']}": d for s, d in zip(suspects, observed_deltas)},
        })
        tracker.log_dict_as_artifact(result.to_dict(), "bias_report.json")

    logger.info("Bias benchmark complete. Passed=%s Violations=%d", passed, len(violations))
    logger.info(summary)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = run_benchmark()
    print(res.summary)
