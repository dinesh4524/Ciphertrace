"""
Reproducibility Manager — CipherTrace X Phase 19.

Captures an immutable environment snapshot (Python version, package versions,
BLAS/NumPy/sklearn build info, random seeds) and attaches it to an MLflow run
as a JSON artifact.  Also provides set_seeds() for deterministic training.
"""
from __future__ import annotations

import json
import logging
import os
import platform
import random
import sys
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ─── Schema ──────────────────────────────────────────────────────────────────

class EnvironmentSnapshot(BaseModel):
    captured_at: str
    python_version: str
    platform: str
    random_seed: int
    packages: Dict[str, str]       # package_name → version
    numpy_config: Dict[str, Any]
    sklearn_version: str
    scipy_version: str


# ─── Manager ─────────────────────────────────────────────────────────────────

class ReproducibilityManager:
    """
    Captures environment state for experiment reproducibility.

    Usage::

        ReproducibilityManager.set_seeds(42)
        snap = ReproducibilityManager.snapshot(seed=42)
        ReproducibilityManager.log_to_mlflow(run_id="abc123", snapshot=snap)
    """

    _KEY_PACKAGES = [
        "mlflow", "scikit-learn", "scipy", "numpy", "pandas",
        "networkx", "pydantic", "fastapi", "sqlalchemy",
        "cryptography", "evidently",
    ]

    @classmethod
    def set_seeds(cls, seed: int = 42) -> None:
        """Set all relevant random seeds for deterministic behaviour."""
        random.seed(seed)
        np.random.seed(seed)
        os.environ["PYTHONHASHSEED"] = str(seed)
        logger.info("Random seeds set to %d (random, numpy, PYTHONHASHSEED)", seed)

    @classmethod
    def _get_package_versions(cls) -> Dict[str, str]:
        """Read installed package versions via importlib.metadata."""
        versions: Dict[str, str] = {}
        try:
            import importlib.metadata as meta
            for pkg in cls._KEY_PACKAGES:
                try:
                    versions[pkg] = meta.version(pkg)
                except meta.PackageNotFoundError:
                    versions[pkg] = "not_installed"
        except ImportError:
            versions["_error"] = "importlib.metadata unavailable"
        return versions

    @classmethod
    def _numpy_config(cls) -> Dict[str, Any]:
        """Extract numpy build info relevant to numerical reproducibility."""
        cfg: Dict[str, Any] = {"version": np.__version__}
        try:
            info = np.show_config(mode="dicts")  # type: ignore[call-arg]
            cfg["blas"] = info.get("blas_opt_info", {}).get("libraries", "unknown")
        except Exception:
            cfg["blas"] = "unavailable"
        return cfg

    @classmethod
    def snapshot(cls, seed: int = 42) -> EnvironmentSnapshot:
        """
        Capture a full environment snapshot.

        Returns
        -------
        EnvironmentSnapshot pydantic model.
        """
        packages = cls._get_package_versions()

        snap = EnvironmentSnapshot(
            captured_at=datetime.now(timezone.utc).isoformat(),
            python_version=sys.version,
            platform=platform.platform(),
            random_seed=seed,
            packages=packages,
            numpy_config=cls._numpy_config(),
            sklearn_version=packages.get("scikit-learn", "unknown"),
            scipy_version=packages.get("scipy", "unknown"),
        )
        logger.info(
            "Environment snapshot captured (Python %s, seed=%d)",
            sys.version.split()[0], seed,
        )
        return snap

    @classmethod
    def log_to_mlflow(
        cls,
        snapshot: EnvironmentSnapshot,
        artifact_filename: str = "environment/environment_snapshot.json",
    ) -> None:
        """
        Attach *snapshot* as a JSON artifact to the active MLflow run.
        No-ops gracefully if no run is active.
        """
        try:
            import mlflow
            if mlflow.active_run() is None:
                logger.debug("No active MLflow run — skipping env snapshot logging")
                return
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False, encoding="utf-8"
            ) as f:
                json.dump(snapshot.model_dump(), f, indent=2, default=str)
                tmp = f.name
            mlflow.log_artifact(tmp, artifact_path="environment")
            os.unlink(tmp)
            logger.info("Environment snapshot logged to MLflow artifact '%s'", artifact_filename)
        except Exception as exc:
            logger.warning("Could not log environment snapshot to MLflow: %s", exc)

    @classmethod
    def to_dict(cls, snapshot: EnvironmentSnapshot) -> Dict[str, Any]:
        """Serialise snapshot to a plain dict."""
        return snapshot.model_dump()
