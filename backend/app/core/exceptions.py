from fastapi import HTTPException, status


class CaseNotFoundError(HTTPException):
    def __init__(self, case_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation case with ID '{case_id}' was not found in the system."
        )


class EvidenceNotFoundError(HTTPException):
    def __init__(self, evidence_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence artifact with ID '{evidence_id}' was not found in the evidence fabric."
        )


class IntegrityVerificationFailedError(HTTPException):
    def __init__(self, evidence_id: str, expected_hash: str, computed_hash: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Cryptographic Integrity Check FAILED. Possible evidence tampering detected.",
                "evidence_id": evidence_id,
                "expected_hash_sha256": expected_hash,
                "computed_hash_sha256": computed_hash,
                "compliance_status": "SECTION_65B_BSA63_VIOLATION"
            }
        )


class IngestionParsingError(HTTPException):
    def __init__(self, source_type: str, reason: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse {source_type} payload: {reason}"
        )
