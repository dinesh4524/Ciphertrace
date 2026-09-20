"""
LLM Grounding Evaluation Benchmark — CipherTrace X Phase 19.

Evaluates GroundedAnswerGenerator on 8 queries spanning different evidence
strengths to measure grounding rate, confidence calibration, and answer
relevance. Logs results to MLflow.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.core.mlops_config import EXPERIMENT_LLM_GROUNDING, GLOBAL_RANDOM_SEED
from app.mlops import tracker
from app.mlops.dataset_registry import DatasetRegistry
from app.mlops.evaluator import EvaluationResult, ModelEvaluator
from app.mlops.reproducibility import ReproducibilityManager
from app.utils.grounded_generator import GroundedAnswerGenerator

logger = logging.getLogger(__name__)

# ─── 8-Query evaluation set ───────────────────────────────────────────────────

_EVAL_CASES: List[Dict[str, Any]] = [
    # Strong evidence (2 chunks, high rerank scores)
    {
        "query_id": "llm_q1",
        "query": "Who facilitated the hawala transfers in this case?",
        "reference_answer": "Rajesh Kumar facilitated the hawala transfers through Karim's network.",
        "chunks": [
            {
                "chunk_id": "lc1", "evidence_id": "EV-001", "evidence_code": "EV-HW-001",
                "source_type": "EVIDENCE", "rerank_score": 0.88, "chunk_index": 0,
                "content": "Rajesh Kumar facilitated hawala transfers of INR 45 lakh through Karim's network in March 2024.",
                "chunk_metadata": {"file_name": "hawala.pdf"},
            },
            {
                "chunk_id": "lc2", "evidence_id": "EV-002", "evidence_code": "EV-HW-002",
                "source_type": "EVIDENCE", "rerank_score": 0.75, "chunk_index": 1,
                "content": "The transfers were routed through shell account ACC-9988 to avoid detection.",
                "chunk_metadata": {"file_name": "bank.pdf"},
            },
        ],
    },
    # Medium evidence (1 chunk, moderate rerank score)
    {
        "query_id": "llm_q2",
        "query": "What is the suspect's communication pattern?",
        "reference_answer": "The suspect made 47 calls in February 2024 with no legitimate pattern.",
        "chunks": [
            {
                "chunk_id": "lc3", "evidence_id": "EV-004", "evidence_code": "EV-CDR-001",
                "source_type": "EVIDENCE", "rerank_score": 0.55, "chunk_index": 0,
                "content": "47 calls were detected between two numbers in February 2024 showing no legitimate business pattern.",
                "chunk_metadata": {"file_name": "cdr.pdf"},
            }
        ],
    },
    # Interrogation evidence
    {
        "query_id": "llm_q3",
        "query": "What did witnesses reveal about couriers?",
        "reference_answer": "A witness saw cash packets delivered by courier every Friday using a Honda Activa.",
        "chunks": [
            {
                "chunk_id": "lc4", "evidence_id": "EV-003", "evidence_code": "EV-INT-001",
                "source_type": "INTERROGATION", "rerank_score": 0.72, "chunk_index": 0,
                "content": "Witness Meena Kumari received cash packets from a courier every Friday on a Honda Activa.",
                "chunk_metadata": {
                    "suspect_or_witness_name": "Meena Kumari",
                    "file_name": "interrogation.pdf",
                },
            }
        ],
    },
    # FIR evidence
    {
        "query_id": "llm_q4",
        "query": "What offences are recorded in the FIR?",
        "reference_answer": "FIR 44/2024 records possession of forged currency notes of INR 2 lakh.",
        "chunks": [
            {
                "chunk_id": "lc5", "evidence_id": "EV-005", "evidence_code": "EV-FIR-001",
                "source_type": "FIR", "rerank_score": 0.80, "chunk_index": 0,
                "content": "FIR 44/2024 registered at Andheri PS. Suresh Babu found with forged currency of INR 2 lakh.",
                "chunk_metadata": {"fir_number": "44/2024", "file_name": "fir.pdf"},
            }
        ],
    },
    # Insufficient evidence (threshold guardrail)
    {
        "query_id": "llm_q5",
        "query": "What is the accused's overseas bank account number?",
        "reference_answer": "No evidence of overseas accounts found.",
        "chunks": [],  # empty → should trigger INSUFFICIENT_EVIDENCE
    },
    # Weak evidence (score < 0.20 → guardrail)
    {
        "query_id": "llm_q6",
        "query": "Did the suspect travel abroad before arrest?",
        "reference_answer": "No travel records found in case files.",
        "chunks": [
            {
                "chunk_id": "lc6", "evidence_id": "EV-006", "evidence_code": "EV-TRAVEL-001",
                "source_type": "EVIDENCE", "rerank_score": 0.10, "chunk_index": 0,
                "content": "Some unverified social media posts suggest possible foreign travel.",
                "chunk_metadata": {"file_name": "social_media.pdf"},
            }
        ],
    },
    # Digital forensics
    {
        "query_id": "llm_q7",
        "query": "What digital evidence links suspects to the crime?",
        "reference_answer": "WhatsApp chats mention 'consignment' arriving next Friday.",
        "chunks": [
            {
                "chunk_id": "lc7", "evidence_id": "EV-009", "evidence_code": "EV-DIG-001",
                "source_type": "EVIDENCE", "rerank_score": 0.66, "chunk_index": 0,
                "content": "WhatsApp chats on Rajesh Kumar's phone mention 'consignment' arriving 'next Friday'.",
                "chunk_metadata": {"file_name": "digital_forensics.pdf"},
            }
        ],
    },
    # Case notes
    {
        "query_id": "llm_q8",
        "query": "What directives has the supervising officer issued?",
        "reference_answer": "Surveillance was directed to continue for 30 more days.",
        "chunks": [
            {
                "chunk_id": "lc8", "evidence_id": "EV-008", "evidence_code": "EV-NOTE-001",
                "source_type": "CASE_NOTE", "rerank_score": 0.50, "chunk_index": 0,
                "content": "Supervising officer directed surveillance to continue for 30 more days.",
                "chunk_metadata": {"file_name": "case_note.pdf"},
            }
        ],
    },
]


def run_benchmark(run_name: str = "llm-grounding-eval-v1") -> EvaluationResult:
    """
    Execute the LLM grounding benchmark and log results to MLflow.
    """
    ReproducibilityManager.set_seeds(GLOBAL_RANDOM_SEED)

    registry = DatasetRegistry()
    registry.register(
        name="llm_grounding_benchmark",
        data={"n_queries": len(_EVAL_CASES)},
        feature_schema={"query_id": "str"},
        record_count=len(_EVAL_CASES),
        split="full",
        source="synthetic",
        tags={"phase": "19", "benchmark": "llm_grounding"},
    )

    responses: List[Dict[str, Any]] = []
    for case in _EVAL_CASES:
        resp = GroundedAnswerGenerator.generate_grounded_answer(
            query=case["query"],
            reranked_chunks=case["chunks"],
        )
        responses.append(resp)

    references = [
        {"query_id": c["query_id"], "reference_answer": c["reference_answer"]}
        for c in _EVAL_CASES
    ]

    with tracker.start_run(
        experiment_name=EXPERIMENT_LLM_GROUNDING,
        run_name=run_name,
        tags={"benchmark": "llm_grounding"},
    ) as run:
        snap = ReproducibilityManager.snapshot(GLOBAL_RANDOM_SEED)
        ReproducibilityManager.log_to_mlflow(snap)

        tracker.log_params({
            "n_queries": len(_EVAL_CASES),
            "n_empty_evidence_queries": 1,
            "n_weak_evidence_queries": 1,
            "seed": GLOBAL_RANDOM_SEED,
        })

        result = ModelEvaluator.eval_llm_grounding(responses, references)

    logger.info("LLM Grounding benchmark complete: %s", result.metrics)
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = run_benchmark()
    print("LLM Grounding Metrics:", res.metrics)
