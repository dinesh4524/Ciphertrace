"""
Model Evaluator — CipherTrace X Phase 19.

Standardised evaluation methods for every AI subsystem:

  ┌────────────────────────────┬────────────────────────────────────────────┐
  │ Evaluator method           │ Key metrics                                │
  ├────────────────────────────┼────────────────────────────────────────────┤
  │ eval_entity_resolution     │ Precision, Recall, F1, FPR, FNR, AUC-ROC  │
  │ eval_hidden_link           │ Precision@K, NDCG, MAP, AUC, Brier score  │
  │ eval_anomaly_detection     │ F1, Precision, Recall, AUROC, FPR@Recall   │
  │ eval_rag_grounding         │ Citation accuracy, hallucination rate,     │
  │                            │ ROUGE-L, faithfulness score                │
  │ eval_llm_grounding         │ Grounding rate, answer relevance,          │
  │                            │ grounding_status distribution              │
  └────────────────────────────┴────────────────────────────────────────────┘

All methods return a typed EvaluationResult and — when called inside an active
MLflow run — automatically log metrics to that run.
"""
from __future__ import annotations

import logging
import math
import re
from typing import Any, Dict, List, Optional, Tuple

import mlflow
import numpy as np
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ─── Result Schema ───────────────────────────────────────────────────────────

class EvaluationResult(BaseModel):
    evaluator: str
    metrics: Dict[str, float]
    metadata: Dict[str, Any] = {}
    logged_to_mlflow: bool = False


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _safe_div(num: float, denom: float, default: float = 0.0) -> float:
    return num / denom if denom else default


def _precision_recall_f1(
    y_true: List[int], y_pred: List[int]
) -> Tuple[float, float, float]:
    tp = sum(1 for a, b in zip(y_true, y_pred) if a == 1 and b == 1)
    fp = sum(1 for a, b in zip(y_true, y_pred) if a == 0 and b == 1)
    fn = sum(1 for a, b in zip(y_true, y_pred) if a == 1 and b == 0)
    p  = _safe_div(tp, tp + fp)
    r  = _safe_div(tp, tp + fn)
    f1 = _safe_div(2 * p * r, p + r)
    return p, r, f1


def _trapezoid_auc(xs: List[float], ys: List[float]) -> float:
    """Trapezoidal-rule AUC over sorted xs."""
    pairs = sorted(zip(xs, ys))
    xs_s, ys_s = zip(*pairs) if pairs else ([], [])
    area = 0.0
    for i in range(1, len(xs_s)):
        area += (xs_s[i] - xs_s[i - 1]) * (ys_s[i - 1] + ys_s[i]) / 2
    return round(area, 4)


def _roc_auc(y_true: List[int], y_scores: List[float]) -> float:
    """Compute ROC-AUC via manual threshold sweep."""
    thresholds = sorted(set(y_scores), reverse=True)
    tprs, fprs = [0.0], [0.0]
    pos = sum(y_true)
    neg = len(y_true) - pos
    if pos == 0 or neg == 0:
        return 0.5
    for t in thresholds:
        y_pred = [1 if s >= t else 0 for s in y_scores]
        tp = sum(1 for a, b in zip(y_true, y_pred) if a == 1 and b == 1)
        fp = sum(1 for a, b in zip(y_true, y_pred) if a == 0 and b == 1)
        tprs.append(tp / pos)
        fprs.append(fp / neg)
    tprs.append(1.0)
    fprs.append(1.0)
    return _trapezoid_auc(fprs, tprs)


def _rouge_l(reference: str, hypothesis: str) -> float:
    """Simple ROUGE-L (LCS-based) between two strings."""
    ref_tokens = reference.lower().split()
    hyp_tokens = hypothesis.lower().split()
    m, n = len(ref_tokens), len(hyp_tokens)
    if m == 0 or n == 0:
        return 0.0
    # DP LCS
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if ref_tokens[i - 1] == hyp_tokens[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    lcs = dp[m][n]
    precision = _safe_div(lcs, n)
    recall    = _safe_div(lcs, m)
    return _safe_div(2 * precision * recall, precision + recall)


def _try_log_metrics(metrics: Dict[str, float]) -> bool:
    """Log to MLflow if a run is active; silently skip otherwise."""
    try:
        if mlflow.active_run() is not None:
            mlflow.log_metrics(metrics)
            return True
    except Exception as e:
        logger.warning("MLflow metric logging skipped: %s", e)
    return False


# ─── Main Evaluator Class ────────────────────────────────────────────────────

class ModelEvaluator:
    """
    Stateless evaluator.  All methods are classmethods so the class can be
    used without instantiation.
    """

    # ── 1. Entity Resolution ──────────────────────────────────────────────────

    @classmethod
    def eval_entity_resolution(
        cls,
        predictions: List[Dict[str, Any]],
        ground_truth: List[Dict[str, Any]],
    ) -> EvaluationResult:
        """
        *predictions* and *ground_truth* are lists of dicts with keys:
            source_id, target_id, is_match (bool), confidence_score (float)
        """
        gt_pairs  = {
            (r["source_id"], r["target_id"])
            for r in ground_truth if r.get("is_match")
        }
        y_true    = [
            1 if (p["source_id"], p["target_id"]) in gt_pairs else 0
            for p in predictions
        ]
        y_pred    = [1 if p.get("is_match") else 0 for p in predictions]
        y_scores  = [float(p.get("confidence_score", 0.5)) for p in predictions]

        p, r, f1  = _precision_recall_f1(y_true, y_pred)
        auc       = _roc_auc(y_true, y_scores)
        tn  = sum(1 for a, b in zip(y_true, y_pred) if a == 0 and b == 0)
        fp  = sum(1 for a, b in zip(y_true, y_pred) if a == 0 and b == 1)
        fn  = sum(1 for a, b in zip(y_true, y_pred) if a == 1 and b == 0)
        fpr = _safe_div(fp, fp + tn)
        fnr = _safe_div(fn, fn + (len(y_true) - fn - fp - tn))

        metrics = {
            "er_precision": round(p, 4),
            "er_recall": round(r, 4),
            "er_f1": round(f1, 4),
            "er_fpr": round(fpr, 4),
            "er_fnr": round(fnr, 4),
            "er_auc_roc": round(auc, 4),
        }
        logged = _try_log_metrics(metrics)
        logger.info("Entity Resolution eval: %s", metrics)
        return EvaluationResult(evaluator="entity_resolution", metrics=metrics, logged_to_mlflow=logged)

    # ── 2. Hidden-Link Prediction ─────────────────────────────────────────────

    @classmethod
    def eval_hidden_link(
        cls,
        predictions: List[Dict[str, Any]],
        ground_truth_edges: List[Tuple[str, str]],
        k: int = 10,
    ) -> EvaluationResult:
        """
        *predictions*: list of {source_id, target_id, confidence_score}
        *ground_truth_edges*: list of (u, v) tuples that are true edges.
        """
        gt_set = {(u, v) for u, v in ground_truth_edges} | {
            (v, u) for u, v in ground_truth_edges
        }
        sorted_preds = sorted(predictions, key=lambda x: x.get("confidence_score", 0), reverse=True)

        # Precision@K
        top_k = sorted_preds[:k]
        hits_k = sum(
            1 for p in top_k
            if (p["source_id"], p["target_id"]) in gt_set
        )
        precision_at_k = _safe_div(hits_k, k)

        # MAP
        ap_sum, rel_count = 0.0, 0
        for rank, pred in enumerate(sorted_preds, start=1):
            if (pred["source_id"], pred["target_id"]) in gt_set:
                rel_count += 1
                ap_sum += rel_count / rank
        map_score = _safe_div(ap_sum, len(gt_set)) if gt_set else 0.0

        # NDCG@K
        dcg = sum(
            _safe_div(1, math.log2(rank + 1))
            for rank, p in enumerate(top_k, start=1)
            if (p["source_id"], p["target_id"]) in gt_set
        )
        ideal_hits = min(k, len(gt_set))
        idcg = sum(_safe_div(1, math.log2(i + 2)) for i in range(ideal_hits))
        ndcg = _safe_div(dcg, idcg)

        # AUC & Brier
        y_true   = [1 if (p["source_id"], p["target_id"]) in gt_set else 0 for p in predictions]
        y_scores = [float(p.get("confidence_score", 0.5)) for p in predictions]
        auc      = _roc_auc(y_true, y_scores)
        brier    = float(np.mean([(s - t) ** 2 for s, t in zip(y_scores, y_true)]))

        metrics = {
            f"hl_precision_at_{k}": round(precision_at_k, 4),
            "hl_map": round(map_score, 4),
            f"hl_ndcg_at_{k}": round(ndcg, 4),
            "hl_auc": round(auc, 4),
            "hl_brier_score": round(brier, 4),
        }
        logged = _try_log_metrics(metrics)
        logger.info("Hidden-Link eval: %s", metrics)
        return EvaluationResult(evaluator="hidden_link", metrics=metrics, logged_to_mlflow=logged)

    # ── 3. Anomaly Detection ──────────────────────────────────────────────────

    @classmethod
    def eval_anomaly_detection(
        cls,
        predictions: List[Dict[str, Any]],
        ground_truth: List[Dict[str, Any]],
        target_recall: float = 0.80,
    ) -> EvaluationResult:
        """
        *predictions* / *ground_truth*: lists of {id, is_anomaly (bool), score (float)}
        """
        gt_map    = {r["id"]: int(r.get("is_anomaly", False)) for r in ground_truth}
        y_true    = [gt_map.get(p["id"], 0) for p in predictions]
        y_pred    = [1 if p.get("is_anomaly") else 0 for p in predictions]
        y_scores  = [float(p.get("score", 0.5)) for p in predictions]

        p, r, f1  = _precision_recall_f1(y_true, y_pred)
        auroc     = _roc_auc(y_true, y_scores)

        # FPR at fixed-recall threshold
        sorted_by_score = sorted(
            zip(y_true, y_scores), key=lambda x: x[1], reverse=True
        )
        cumulative_tp, cumulative_fp = 0, 0
        total_pos = max(sum(y_true), 1)
        total_neg = max(len(y_true) - total_pos, 1)
        fpr_at_recall = 1.0
        for lbl, _ in sorted_by_score:
            if lbl == 1:
                cumulative_tp += 1
            else:
                cumulative_fp += 1
            if cumulative_tp / total_pos >= target_recall:
                fpr_at_recall = cumulative_fp / total_neg
                break

        metrics = {
            "ad_precision": round(p, 4),
            "ad_recall": round(r, 4),
            "ad_f1": round(f1, 4),
            "ad_auroc": round(auroc, 4),
            f"ad_fpr_at_{int(target_recall*100)}pct_recall": round(fpr_at_recall, 4),
        }
        logged = _try_log_metrics(metrics)
        logger.info("Anomaly Detection eval: %s", metrics)
        return EvaluationResult(evaluator="anomaly_detection", metrics=metrics, logged_to_mlflow=logged)

    # ── 4. RAG Grounding ─────────────────────────────────────────────────────

    @classmethod
    def eval_rag_grounding(
        cls,
        responses: List[Dict[str, Any]],
        ground_truth: List[Dict[str, Any]],
    ) -> EvaluationResult:
        """
        *responses*: RAGService outputs with keys:
            answer, citations, grounding_status, confidence_score
        *ground_truth*: list of {query_id, expected_evidence_codes (list[str]),
                                  reference_answer (str)}
        """
        citation_hits     = 0
        total_expected    = 0
        hallucination_count = 0
        rouge_scores: List[float] = []
        faithfulness_scores: List[float] = []

        for resp, gt in zip(responses, ground_truth):
            # Citation accuracy
            predicted_codes = {
                c.get("evidence_code", "") for c in resp.get("citations", [])
            }
            expected_codes  = set(gt.get("expected_evidence_codes", []))
            if expected_codes:
                hits = len(predicted_codes & expected_codes)
                citation_hits  += hits
                total_expected += len(expected_codes)

            # Hallucination: INSUFFICIENT_EVIDENCE when evidence existed
            status = resp.get("grounding_status", "")
            if status == "INSUFFICIENT_EVIDENCE" and expected_codes:
                hallucination_count += 1

            # ROUGE-L
            ref_answer  = gt.get("reference_answer", "")
            pred_answer = resp.get("answer", "")
            if ref_answer:
                rouge_scores.append(_rouge_l(ref_answer, pred_answer))

            # Faithfulness proxy: confidence score from grounded generator
            faithfulness_scores.append(float(resp.get("confidence_score", 0.5)))

        citation_accuracy = _safe_div(citation_hits, total_expected)
        hallucination_rate = _safe_div(hallucination_count, len(responses))
        avg_rouge_l       = float(np.mean(rouge_scores)) if rouge_scores else 0.0
        avg_faithfulness  = float(np.mean(faithfulness_scores)) if faithfulness_scores else 0.0

        metrics = {
            "rag_citation_accuracy": round(citation_accuracy, 4),
            "rag_hallucination_rate": round(hallucination_rate, 4),
            "rag_avg_rouge_l": round(avg_rouge_l, 4),
            "rag_avg_faithfulness": round(avg_faithfulness, 4),
        }
        logged = _try_log_metrics(metrics)
        logger.info("RAG Grounding eval: %s", metrics)
        return EvaluationResult(evaluator="rag_grounding", metrics=metrics, logged_to_mlflow=logged)

    # ── 5. LLM Grounding ────────────────────────────────────────────────────

    @classmethod
    def eval_llm_grounding(
        cls,
        responses: List[Dict[str, Any]],
        references: List[Dict[str, Any]],
    ) -> EvaluationResult:
        """
        Evaluates GroundedAnswerGenerator outputs specifically:
          - grounding_rate : fraction with FULLY_GROUNDED status
          - avg_confidence : mean confidence_score
          - answer_relevance: fraction where answer is non-empty and
                              contains ≥1 reference keyword
          - grounding_status_distribution: breakdown of status values
        """
        fully_grounded = 0
        partially_grounded = 0
        insufficient = 0
        relevance_hits = 0
        confidence_scores: List[float] = []

        for resp, ref in zip(responses, references):
            status = resp.get("grounding_status", "INSUFFICIENT_EVIDENCE")
            if status == "FULLY_GROUNDED":
                fully_grounded += 1
            elif status == "PARTIALLY_GROUNDED":
                partially_grounded += 1
            else:
                insufficient += 1

            confidence_scores.append(float(resp.get("confidence_score", 0.0)))

            # Answer relevance: does the answer contain reference keywords?
            answer     = (resp.get("answer") or "").lower()
            ref_terms  = set(re.findall(r"\w{4,}", (ref.get("reference_answer") or "").lower()))
            matches    = sum(1 for t in ref_terms if t in answer)
            relevance_hits += 1 if matches >= max(1, len(ref_terms) // 3) else 0

        n = len(responses) or 1
        grounding_rate   = round(fully_grounded / n, 4)
        avg_confidence   = round(float(np.mean(confidence_scores)) if confidence_scores else 0.0, 4)
        answer_relevance = round(relevance_hits / n, 4)

        metrics = {
            "llm_grounding_rate": grounding_rate,
            "llm_avg_confidence": avg_confidence,
            "llm_answer_relevance": answer_relevance,
            "llm_fully_grounded_count": float(fully_grounded),
            "llm_partially_grounded_count": float(partially_grounded),
            "llm_insufficient_count": float(insufficient),
        }
        logged = _try_log_metrics(metrics)
        logger.info("LLM Grounding eval: %s", metrics)
        return EvaluationResult(
            evaluator="llm_grounding",
            metrics=metrics,
            metadata={
                "grounding_status_distribution": {
                    "FULLY_GROUNDED": fully_grounded,
                    "PARTIALLY_GROUNDED": partially_grounded,
                    "INSUFFICIENT_EVIDENCE": insufficient,
                }
            },
            logged_to_mlflow=logged,
        )
