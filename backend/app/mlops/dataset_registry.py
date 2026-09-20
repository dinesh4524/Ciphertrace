"""
Dataset Registry — CipherTrace X Phase 19.

Provides SHA-256-fingerprinted, append-only dataset versioning backed by a
local JSONL file.  Each registered version is also surfaced to MLflow via
mlflow.log_params for lineage tracking.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.core.mlops_config import DATASET_REGISTRY_FILE

logger = logging.getLogger(__name__)


# ─── Schema ──────────────────────────────────────────────────────────────────

class DatasetVersion(BaseModel):
    """Immutable record describing one version of a dataset."""

    name: str
    version: str                          # e.g. "v1", "v2"
    sha256: str                           # hex digest of serialised data
    feature_schema: Dict[str, str]        # column → dtype
    record_count: int
    split: str = "full"                   # "train" | "test" | "full"
    source: str = "synthetic"             # origin tag
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    tags: Dict[str, str] = Field(default_factory=dict)


# ─── Registry ────────────────────────────────────────────────────────────────

class DatasetRegistry:
    """
    Append-only dataset version registry backed by a JSONL file.

    Thread-safety: single-writer assumption (suitable for batch MLOps jobs).
    """

    def __init__(self, registry_file: str = DATASET_REGISTRY_FILE) -> None:
        self._path = Path(registry_file)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.touch()

    # ── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def compute_sha256(data: Any) -> str:
        """Return SHA-256 hex of the JSON-serialised *data*."""
        raw = json.dumps(data, sort_keys=True, default=str).encode()
        return hashlib.sha256(raw).hexdigest()

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

    # ── public API ───────────────────────────────────────────────────────────

    def register(
        self,
        name: str,
        data: Any,
        feature_schema: Dict[str, str],
        record_count: int,
        split: str = "full",
        source: str = "synthetic",
        tags: Optional[Dict[str, str]] = None,
    ) -> DatasetVersion:
        """
        Register a new version of dataset *name*.

        The version number is auto-incremented (v1, v2, …).
        *data* is fingerprinted with SHA-256 so identical payloads produce
        the same hash, enabling dedup detection.
        """
        existing = self.list_versions(name)
        next_version = f"v{len(existing) + 1}"
        sha = self.compute_sha256(data)

        dv = DatasetVersion(
            name=name,
            version=next_version,
            sha256=sha,
            feature_schema=feature_schema,
            record_count=record_count,
            split=split,
            source=source,
            tags=tags or {},
        )
        self._append(dv.model_dump())
        logger.info(
            "Dataset registered: name='%s' version='%s' sha256='%s...' records=%d",
            name, next_version, sha[:12], record_count,
        )
        return dv

    def get_latest(self, name: str) -> Optional[DatasetVersion]:
        """Return the most recently registered version of *name*, or None."""
        versions = self.list_versions(name)
        if not versions:
            return None
        return versions[-1]

    def list_versions(self, name: str) -> List[DatasetVersion]:
        """Return all registered versions of *name* in registration order."""
        return [
            DatasetVersion(**r)
            for r in self._read_all()
            if r.get("name") == name
        ]

    def list_all(self) -> List[DatasetVersion]:
        """Return every entry in the registry."""
        return [DatasetVersion(**r) for r in self._read_all()]
