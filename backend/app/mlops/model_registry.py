"""
Model Registry — CipherTrace X Phase 19.

Lightweight JSONL-backed model lifecycle manager with stage gating:
    STAGING → PRODUCTION → ARCHIVED

Wraps the MLflow Model Registry concept locally so that:
  - staging models can be promoted to production after evaluation
  - the production model can be fetched deterministically
  - old versions are archived automatically on promotion
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.core.mlops_config import MODEL_REGISTRY_FILE

logger = logging.getLogger(__name__)

# Valid lifecycle stages
STAGE_STAGING    = "STAGING"
STAGE_PRODUCTION = "PRODUCTION"
STAGE_ARCHIVED   = "ARCHIVED"
_VALID_STAGES    = {STAGE_STAGING, STAGE_PRODUCTION, STAGE_ARCHIVED}


# ─── Schema ──────────────────────────────────────────────────────────────────

class ModelVersion(BaseModel):
    """One immutable registration record for a trained model."""

    model_name: str
    version: str                             # e.g. "v1", "v2"
    run_id: Optional[str] = None             # MLflow run_id (if tracked)
    metrics: Dict[str, float] = Field(default_factory=dict)
    params: Dict[str, Any] = Field(default_factory=dict)
    stage: str = STAGE_STAGING
    description: str = ""
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    tags: Dict[str, str] = Field(default_factory=dict)


# ─── Registry ────────────────────────────────────────────────────────────────

class ModelRegistry:
    """
    Stage-gated model lifecycle registry backed by a JSONL file.

    Operations are idempotent-safe (each call appends a new record;
    the *current* state is derived from the last record per model+version).
    """

    def __init__(self, registry_file: str = MODEL_REGISTRY_FILE) -> None:
        self._path = Path(registry_file)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.touch()

    # ── helpers ──────────────────────────────────────────────────────────────

    def _read_all(self) -> List[Dict[str, Any]]:
        records: List[Dict[str, Any]] = []
        with self._path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    records.append(json.loads(line))
        return records

    def _append(self, record: Dict[str, Any]) -> None:
        with self._path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, default=str) + "\n")

    def _latest_state(self) -> Dict[str, Dict[str, Any]]:
        """
        Derive current state: for each (model_name, version) pair keep only
        the most recent record (last-write-wins).
        """
        state: Dict[str, Dict[str, Any]] = {}
        for rec in self._read_all():
            key = f"{rec['model_name']}::{rec['version']}"
            state[key] = rec
        return state

    # ── public API ───────────────────────────────────────────────────────────

    def register(
        self,
        model_name: str,
        metrics: Dict[str, float],
        params: Optional[Dict[str, Any]] = None,
        run_id: Optional[str] = None,
        description: str = "",
        tags: Optional[Dict[str, str]] = None,
    ) -> ModelVersion:
        """Register a new version (auto-incremented) in STAGING."""
        existing = self.list_versions(model_name)
        next_version = f"v{len(existing) + 1}"

        mv = ModelVersion(
            model_name=model_name,
            version=next_version,
            run_id=run_id,
            metrics=metrics,
            params=params or {},
            stage=STAGE_STAGING,
            description=description,
            tags=tags or {},
        )
        self._append(mv.model_dump())
        logger.info(
            "Model registered: name='%s' version='%s' stage=STAGING",
            model_name, next_version,
        )
        return mv

    def promote(self, model_name: str, version: str) -> ModelVersion:
        """
        Promote *version* to PRODUCTION.
        Any existing PRODUCTION version is automatically archived.
        """
        state = self._latest_state()

        # Archive current production version(s)
        for key, rec in state.items():
            if rec["model_name"] == model_name and rec["stage"] == STAGE_PRODUCTION:
                archived = ModelVersion(**rec)
                archived.stage = STAGE_ARCHIVED
                self._append(archived.model_dump())
                logger.info(
                    "Archived '%s' version=%s (superseded by %s)",
                    model_name, rec["version"], version,
                )

        # Promote target version
        key = f"{model_name}::{version}"
        if key not in state:
            raise KeyError(f"No record found for model '{model_name}' version '{version}'")

        promoted = ModelVersion(**state[key])
        promoted.stage = STAGE_PRODUCTION
        self._append(promoted.model_dump())
        logger.info("Promoted '%s' version=%s to PRODUCTION", model_name, version)
        return promoted

    def archive(self, model_name: str, version: str) -> ModelVersion:
        """Manually archive a specific version."""
        state = self._latest_state()
        key = f"{model_name}::{version}"
        if key not in state:
            raise KeyError(f"No record for '{model_name}' version '{version}'")
        rec = ModelVersion(**state[key])
        rec.stage = STAGE_ARCHIVED
        self._append(rec.model_dump())
        return rec

    def get_production_model(self, model_name: str) -> Optional[ModelVersion]:
        """Return the current PRODUCTION version, or None."""
        state = self._latest_state()
        for rec in state.values():
            if rec["model_name"] == model_name and rec["stage"] == STAGE_PRODUCTION:
                return ModelVersion(**rec)
        return None

    def list_versions(self, model_name: str) -> List[ModelVersion]:
        """All versions for *model_name* in registration order."""
        state = self._latest_state()
        versions = [
            ModelVersion(**rec)
            for rec in state.values()
            if rec["model_name"] == model_name
        ]
        versions.sort(key=lambda mv: mv.version)
        return versions

    def list_all_models(self) -> List[str]:
        """Return distinct model names."""
        state = self._latest_state()
        return sorted({rec["model_name"] for rec in state.values()})

    def get_registry_summary(self) -> List[Dict[str, Any]]:
        """Return one summary dict per (model_name, version)."""
        state = self._latest_state()
        return [
            {
                "model_name": rec["model_name"],
                "version": rec["version"],
                "stage": rec["stage"],
                "metrics": rec.get("metrics", {}),
                "created_at": rec.get("created_at"),
                "run_id": rec.get("run_id"),
            }
            for rec in state.values()
        ]
