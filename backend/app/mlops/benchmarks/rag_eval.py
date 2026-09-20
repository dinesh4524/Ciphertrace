"""
RAG Pipeline Evaluation Benchmark — CipherTrace X Phase 19.

10 synthetic document chunks + 5 query/ground-truth answer pairs.
Evaluates GroundedAnswerGenerator citation accuracy, hallucination rate,
ROUGE-L, and faithfulness. Logs results to MLflow.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.core.mlops_config import EXPERIMENT_RAG, GLOBAL_RANDOM_SEED
from app.mlops import tracker
from app.mlops.dataset_registry import DatasetRegistry
from app.mlops.evaluator import EvaluationResult, ModelEvaluator
from app.mlops.reproducibility import ReproducibilityManager
from app.utils.grounded_generator import GroundedAnswerGenerator

logger = logging.getLogger(__name__)

# ─── Synthetic Corpus ─────────────────────────────────────────────────────────

_CHUNKS: List[Dict[str, Any]] = [
    {
        "chunk_id": "chk_001",
        "evidence_id": "EV-001",
        "evidence_code": "EV-HAWALA-001",
        "source_type": "EVIDENCE",
        "content": (
            "Rajesh Kumar transferred INR 45,00,000 to Karim's hawala network "
            "on 2024-03-15 via shell account ACC-9988. "
            "The transaction was routed through three intermediary accounts."
        ),
        "rerank_score": 0.82,
        "chunk_index": 0,
        "chunk_metadata": {"file_name": "hawala_ledger.pdf"},
    },
    {
        "chunk_id": "chk_002",
        "evidence_id": "EV-002",
        "evidence_code": "EV-FIR-002",
        "source_type": "FIR",
        "content": (
            "FIR No. 44/2024 registered at Andheri Police Station. "
            "Accused Suresh Babu was found in possession of forged currency notes "
            "amounting to INR 2,00,000 on 2024-03-20."
        ),
        "rerank_score": 0.75,
        "chunk_index": 0,
        "chunk_metadata": {"fir_number": "44/2024", "file_name": "fir_44_2024.pdf"},
    },
    {
        "chunk_id": "chk_003",
        "evidence_id": "EV-003",
        "evidence_code": "EV-INTERR-003",
        "source_type": "INTERROGATION",
        "content": (
            "During interrogation, Meena Kumari stated she received cash packets "
            "from an unknown courier every Friday. The courier used a black Honda Activa."
        ),
        "rerank_score": 0.68,
        "chunk_index": 0,
        "chunk_metadata": {
            "suspect_or_witness_name": "Meena Kumari",
            "file_name": "interrogation_meena.pdf",
        },
    },
    {
        "chunk_id": "chk_004",
        "evidence_id": "EV-004",
        "evidence_code": "EV-CDR-004",
        "source_type": "EVIDENCE",
        "content": (
            "CDR analysis reveals 47 calls between +917700001234 and +919800005678 "
            "between 2024-02-01 and 2024-02-28. "
            "Call durations averaged 8.3 minutes with no legitimate business pattern."
        ),
        "rerank_score": 0.71,
        "chunk_index": 0,
        "chunk_metadata": {"file_name": "cdr_analysis.pdf"},
    },
    {
        "chunk_id": "chk_005",
        "evidence_id": "EV-005",
        "evidence_code": "EV-BANK-005",
        "source_type": "EVIDENCE",
        "content": (
            "Bank statements of ACC-7721 show 14 cash deposits below INR 50,000 "
            "each on consecutive days — a classic structuring pattern. "
            "Total amount structured: INR 6,50,000 in February 2024."
        ),
        "rerank_score": 0.78,
        "chunk_index": 0,
        "chunk_metadata": {"file_name": "bank_statements.pdf"},
    },
    {
        "chunk_id": "chk_006", "evidence_id": "EV-006", "evidence_code": "EV-REP-006",
        "source_type": "EVIDENCE",
        "content": "Forensic analysis confirmed the SIM card was registered to a fake ID.",
        "rerank_score": 0.55, "chunk_index": 0, "chunk_metadata": {"file_name": "forensics.pdf"},
    },
    {
        "chunk_id": "chk_007", "evidence_id": "EV-007", "evidence_code": "EV-REP-007",
        "source_type": "EVIDENCE",
        "content": "Ballistic report shows the recovered weapon matches the FIR description.",
        "rerank_score": 0.60, "chunk_index": 0, "chunk_metadata": {"file_name": "ballistics.pdf"},
    },
    {
        "chunk_id": "chk_008", "evidence_id": "EV-008", "evidence_code": "EV-REP-008",
        "source_type": "CASE_NOTE",
        "content": "Supervising officer directed surveillance to continue for 30 more days.",
        "rerank_score": 0.45, "chunk_index": 0, "chunk_metadata": {"file_name": "case_note.pdf"},
    },
    {
        "chunk_id": "chk_009", "evidence_id": "EV-009", "evidence_code": "EV-REP-009",
        "source_type": "EVIDENCE",
        "content": "WhatsApp chats recovered from Rajesh Kumar's phone mention 'consignment' arriving 'next Friday'.",
        "rerank_score": 0.66, "chunk_index": 0, "chunk_metadata": {"file_name": "digital_forensics.pdf"},
    },
    {
        "chunk_id": "chk_010", "evidence_id": "EV-010", "evidence_code": "EV-REP-010",
        "source_type": "EVIDENCE",
        "content": "GPS tracker data confirms Vehicle MH04AB1234 visited 5 locations linked to suspects.",
        "rerank_score": 0.73, "chunk_index": 0, "chunk_metadata": {"file_name": "gps_logs.pdf"},
    },
]

# ─── Query/Answer Pairs ───────────────────────────────────────────────────────

_QA_PAIRS: List[Dict[str, Any]] = [
    {
        "query_id": "q1",
        "query": "What hawala transactions did Rajesh Kumar conduct?",
        "expected_evidence_codes": ["EV-HAWALA-001"],
        "reference_answer": "Rajesh Kumar transferred INR 45 lakh to Karim's hawala network on 2024-03-15 via shell account ACC-9988.",
        "relevant_chunks": [_CHUNKS[0]],
    },
    {
        "query_id": "q2",
        "query": "What was found in Suresh Babu's FIR?",
        "expected_evidence_codes": ["EV-FIR-002"],
        "reference_answer": "FIR 44/2024 was registered. Suresh Babu had forged currency notes of INR 2 lakh.",
        "relevant_chunks": [_CHUNKS[1]],
    },
    {
        "query_id": "q3",
        "query": "What did Meena Kumari say about cash deliveries?",
        "expected_evidence_codes": ["EV-INTERR-003"],
        "reference_answer": "Meena Kumari received cash packets from a courier every Friday via a Honda Activa.",
        "relevant_chunks": [_CHUNKS[2]],
    },
    {
        "query_id": "q4",
        "query": "What structured deposits were found in the bank accounts?",
        "expected_evidence_codes": ["EV-BANK-005"],
        "reference_answer": "ACC-7721 had 14 deposits below INR 50,000 each, totalling INR 6.5 lakh — a structuring pattern.",
        "relevant_chunks": [_CHUNKS[4]],
    },
    {
        "query_id": "q5",
        "query": "What CDR anomalies were detected?",
        "expected_evidence_codes": ["EV-CDR-004"],
        "reference_answer": "47 calls were made between two numbers in February 2024 with no legitimate pattern.",
        "relevant_chunks": [_CHUNKS[3]],
    },
]


def run_benchmark(run_name: str = "rag-eval-v1") -> EvaluationResult:
    """
    Execute the RAG grounding benchmark and log results to MLflow.
    """
    ReproducibilityManager.set_seeds(GLOBAL_RANDOM_SEED)

    registry = DatasetRegistry()
    registry.register(
        name="rag_benchmark",
        data={"n_chunks": len(_CHUNKS), "n_queries": len(_QA_PAIRS)},
        feature_schema={"chunk_id": "str", "query_id": "str"},
        record_count=len(_CHUNKS),
        split="full",
        source="synthetic",
        tags={"phase": "19", "benchmark": "rag"},
    )

    # Generate responses for each query using GroundedAnswerGenerator
    responses: List[Dict[str, Any]] = []
    for qa in _QA_PAIRS:
        resp = GroundedAnswerGenerator.generate_grounded_answer(
            query=qa["query"],
            reranked_chunks=qa["relevant_chunks"],
        )
        responses.append(resp)

    ground_truth = [
        {
            "query_id": qa["query_id"],
            "expected_evidence_codes": qa["expected_evidence_codes"],
            "reference_answer": qa["reference_answer"],
        }
        for qa in _QA_PAIRS
    ]

    with tracker.start_run(
        experiment_name=EXPERIMENT_RAG,
        run_name=run_name,
        tags={"benchmark": "rag"},
    ) as run:
        snap = ReproducibilityManager.snapshot(GLOBAL_RANDOM_SEED)
        ReproducibilityManager.log_to_mlflow(snap)

        tracker.log_params({
            "n_chunks": len(_CHUNKS),
            "n_queries": len(_QA_PAIRS),
            "seed": GLOBAL_RANDOM_SEED,
        })

        result = ModelEvaluator.eval_rag_grounding(responses, ground_truth)

    logger.info("RAG benchmark complete: %s", result.metrics)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = run_benchmark()
    print("RAG Metrics:", res.metrics)
