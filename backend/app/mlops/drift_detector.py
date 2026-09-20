"""
Drift Detector — CipherTrace X Phase 19.

Implements KS-test (feature-level) and PSI (Population Stability Index,
prediction-level) drift detection.  Both methods are dependency-free beyond
scipy and numpy, which are already in requirements.

Thresholds (configurable via mlops_config):
  PSI < 0.10  → Stable
  PSI < 0.20  → Slight drift (INFO)
  PSI < 0.25  → WARNING
  PSI ≥ 0.25  → CRITICAL
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import numpy as np
from pydantic import BaseModel
from scipy import stats

from app.core.mlops_config import DRIFT_PSI_CRITICAL, DRIFT_PSI_WARNING

logger = logging.getLogger(__name__)

# PSI severity labels
_STABLE   = "STABLE"
_SLIGHT   = "SLIGHT_DRIFT"
_WARNING  = "WARNING"
_CRITICAL = "CRITICAL"


# ─── Schema ──────────────────────────────────────────────────────────────────

class FeatureDrift(BaseModel):
    feature: str
    ks_statistic: float
    ks_p_value: float
    drifted: bool          # True if p_value < 0.05


class DriftReport(BaseModel):
    feature_drift: List[FeatureDrift]
    prediction_psi: float
    prediction_drift_severity: str
    overall_drifted: bool
    summary: str


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _psi(reference: np.ndarray, current: np.ndarray, n_bins: int = 10) -> float:
    """
    Compute Population Stability Index between *reference* and *current* arrays.
    Uses equal-width bins derived from *reference*.
    """
    ref   = np.asarray(reference, dtype=float)
    cur   = np.asarray(current, dtype=float)

    # Edge case: identical arrays
    if len(ref) == 0 or len(cur) == 0:
        return 0.0

    min_val = min(ref.min(), cur.min())
    max_val = max(ref.max(), cur.max())
    if min_val == max_val:
        return 0.0

    bins = np.linspace(min_val, max_val, n_bins + 1)
    ref_counts, _ = np.histogram(ref, bins=bins)
    cur_counts, _ = np.histogram(cur, bins=bins)

    # Replace 0 with 0.5 to avoid log(0)
    ref_pct = (ref_counts + 0.5) / (len(ref) + 0.5 * n_bins)
    cur_pct = (cur_counts + 0.5) / (len(cur) + 0.5 * n_bins)

    psi_value = float(np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct)))
    return round(max(psi_value, 0.0), 6)


def _psi_severity(psi: float) -> str:
    if psi >= DRIFT_PSI_CRITICAL:
        return _CRITICAL
    if psi >= DRIFT_PSI_WARNING:
        return _WARNING
    if psi >= 0.10:
        return _SLIGHT
    return _STABLE


# ─── Detector ────────────────────────────────────────────────────────────────

class DriftDetector:
    """
    Detects feature-level and prediction-level drift between a reference
    distribution (training/baseline) and a current distribution (live data).
    """

    @staticmethod
    def detect_input_drift(
        reference: Dict[str, List[float]],
        current: Dict[str, List[float]],
        ks_alpha: float = 0.05,
    ) -> DriftReport:
        """
        Detect per-feature drift using the two-sample Kolmogorov-Smirnov test.

        *reference* / *current*: dict mapping feature_name → list of values.
        Features present only in reference are tested; extras in current ignored.
        """
        feature_results: List[FeatureDrift] = []

        for feature, ref_vals in reference.items():
            cur_vals = current.get(feature, [])
            if len(ref_vals) < 2 or len(cur_vals) < 2:
                continue
            ks_stat, p_value = stats.ks_2samp(ref_vals, cur_vals)
            feature_results.append(
                FeatureDrift(
                    feature=feature,
                    ks_statistic=round(float(ks_stat), 6),
                    ks_p_value=round(float(p_value), 6),
                    drifted=(p_value < ks_alpha),
                )
            )

        drifted_count = sum(1 for f in feature_results if f.drifted)
        overall = drifted_count > 0

        # Use first available feature as proxy for prediction PSI
        first_ref = next(iter(reference.values()), [])
        first_cur = next(iter(current.values()), [])
        psi = _psi(np.array(first_ref), np.array(first_cur))
        severity = _psi_severity(psi)

        summary = (
            f"{drifted_count}/{len(feature_results)} features drifted "
            f"(KS α={ks_alpha}). Prediction PSI={psi:.4f} [{severity}]."
        )
        logger.info("Drift report: %s", summary)

        return DriftReport(
            feature_drift=feature_results,
            prediction_psi=psi,
            prediction_drift_severity=severity,
            overall_drifted=overall,
            summary=summary,
        )

    @staticmethod
    def detect_prediction_drift(
        ref_scores: List[float],
        cur_scores: List[float],
    ) -> DriftReport:
        """
        Compute PSI on model output score distributions.
        No feature-level breakdown; returns a DriftReport with empty feature_drift.
        """
        psi      = _psi(np.array(ref_scores), np.array(cur_scores))
        severity = _psi_severity(psi)
        overall  = psi >= DRIFT_PSI_WARNING

        summary = f"Prediction score PSI={psi:.4f} [{severity}]."
        logger.info("Prediction drift: %s", summary)

        return DriftReport(
            feature_drift=[],
            prediction_psi=psi,
            prediction_drift_severity=severity,
            overall_drifted=overall,
            summary=summary,
        )
