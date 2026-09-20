"""
Model Calibrator — CipherTrace X Phase 19.

Provides:
  - ModelCalibrator.calibrate(): wraps sklearn CalibratedClassifierCV
  - ModelCalibrator.reliability_diagram_data(): bin-level calibration metrics
  - ModelCalibrator.expected_calibration_error(): scalar ECE for comparison

All outputs can be logged to the active MLflow run.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ─── Schema ──────────────────────────────────────────────────────────────────

class CalibrationBin(BaseModel):
    bin_lower: float
    bin_upper: float
    mean_predicted_prob: float
    fraction_of_positives: float
    count: int


class CalibrationReport(BaseModel):
    n_bins: int
    bins: List[CalibrationBin]
    ece: float        # Expected Calibration Error
    mce: float        # Maximum Calibration Error
    method: str       # "isotonic" | "sigmoid" | "none"


# ─── Calibrator ──────────────────────────────────────────────────────────────

class ModelCalibrator:
    """
    Calibration utilities for probabilistic classifiers.

    Calibration is applied post-hoc: the raw sklearn classifier is wrapped
    in CalibratedClassifierCV(cv='prefit') so the base model is unchanged
    and only the calibration layer is fitted on a held-out calibration set.
    """

    @staticmethod
    def calibrate(
        model: Any,
        X_cal: Any,
        y_cal: Any,
        method: str = "isotonic",
    ) -> Any:
        """
        Wrap *model* with isotonic or Platt (sigmoid) calibration.

        Parameters
        ----------
        model   : fitted sklearn estimator with predict_proba
        X_cal   : calibration features (array-like)
        y_cal   : calibration labels (array-like)
        method  : "isotonic" | "sigmoid"

        Returns
        -------
        Calibrated sklearn estimator.
        """
        try:
            from sklearn.calibration import CalibratedClassifierCV
            calibrated = CalibratedClassifierCV(
                estimator=model, method=method, cv="prefit"
            )
            calibrated.fit(X_cal, y_cal)
            logger.info("Calibration fitted (method=%s)", method)
            return calibrated
        except Exception as exc:
            logger.warning("Calibration failed (%s); returning original model: %s", method, exc)
            return model

    @staticmethod
    def reliability_diagram_data(
        y_true: List[int],
        y_prob: List[float],
        n_bins: int = 10,
    ) -> CalibrationReport:
        """
        Compute reliability diagram bin statistics.

        Returns a CalibrationReport with per-bin mean_predicted_prob vs.
        fraction_of_positives (the perfect-calibration diagonal), plus ECE and MCE.
        """
        y_true_arr = np.asarray(y_true, dtype=float)
        y_prob_arr = np.asarray(y_prob, dtype=float)

        bins_edges = np.linspace(0, 1, n_bins + 1)
        bin_records: List[CalibrationBin] = []
        weighted_errs: List[float] = []
        max_err = 0.0
        n = len(y_true_arr)

        for i in range(n_bins):
            lo, hi = bins_edges[i], bins_edges[i + 1]
            mask = (y_prob_arr >= lo) & (y_prob_arr < hi) if i < n_bins - 1 else (y_prob_arr >= lo) & (y_prob_arr <= hi)
            count = int(mask.sum())
            if count == 0:
                bin_records.append(CalibrationBin(
                    bin_lower=round(lo, 2),
                    bin_upper=round(hi, 2),
                    mean_predicted_prob=0.0,
                    fraction_of_positives=0.0,
                    count=0,
                ))
                continue

            mean_pred = float(y_prob_arr[mask].mean())
            frac_pos  = float(y_true_arr[mask].mean())
            err       = abs(mean_pred - frac_pos)

            weighted_errs.append(err * count / n)
            max_err = max(max_err, err)

            bin_records.append(CalibrationBin(
                bin_lower=round(lo, 2),
                bin_upper=round(hi, 2),
                mean_predicted_prob=round(mean_pred, 4),
                fraction_of_positives=round(frac_pos, 4),
                count=count,
            ))

        ece = round(float(sum(weighted_errs)), 4)
        mce = round(max_err, 4)

        return CalibrationReport(
            n_bins=n_bins,
            bins=bin_records,
            ece=ece,
            mce=mce,
            method="none",
        )

    @staticmethod
    def expected_calibration_error(
        y_true: List[int],
        y_prob: List[float],
        n_bins: int = 10,
    ) -> float:
        """Return the scalar ECE value."""
        report = ModelCalibrator.reliability_diagram_data(y_true, y_prob, n_bins)
        return report.ece
