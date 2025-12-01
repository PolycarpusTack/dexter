"""
Validation Router for Dexter Knowledge Base.

Provides API endpoints for:
- Validation queue management
- Manual validation/rejection
- Correction processing
- Validation metrics
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.database import get_db
from app.dependencies import require_kb_initialized
from app.services.feedback_service import (
    CorrectionSummary,
    FeedbackStats,
    ValidationResult,
    get_feedback_service,
)
from app.services.validation_service import (
    QualityScore,
    ValidationMetrics,
    ValidationQueueItem,
    get_validation_service,
)

logger = logging.getLogger(__name__)

# Router with KB initialization check
router = APIRouter(
    prefix="/validation",
    tags=["validation"],
    dependencies=[Depends(require_kb_initialized)],
)


# Request/Response Models

class SubmitFeedbackRequest(BaseModel):
    """Request for submitting feedback."""

    issue_id: int = Field(..., description="Database ID of the issue")
    feedback_type: str = Field(
        ..., description="Type: 'positive', 'negative', or 'correction'"
    )
    correction_text: Optional[str] = Field(
        None, description="Correction text (for correction type)"
    )
    user_id: Optional[str] = Field(
        None, description="Optional user identifier (will be hashed)"
    )


class SubmitFeedbackResponse(BaseModel):
    """Response for feedback submission."""

    success: bool
    feedback_id: int
    validation_result: ValidationResult
    message: str


class ValidateRequest(BaseModel):
    """Request for manual validation."""

    issue_id: int
    notes: Optional[str] = None


class RejectRequest(BaseModel):
    """Request for rejection."""

    issue_id: int
    reason: Optional[str] = None


class ApplyCorrectionRequest(BaseModel):
    """Request for applying a correction."""

    issue_id: int
    solution_text: str = Field(..., min_length=10)
    update_embedding: bool = True


class BulkValidateRequest(BaseModel):
    """Request for bulk validation."""

    issue_ids: List[int] = Field(..., min_items=1, max_items=100)


# Dependency

async def check_knowledge_base_enabled():
    """Check if knowledge base is enabled."""
    settings = get_settings()
    if not getattr(settings, "ENABLE_KNOWLEDGE_BASE", False):
        raise HTTPException(
            status_code=503,
            detail="Knowledge base is disabled",
        )


# Endpoints

@router.post("/feedback", response_model=SubmitFeedbackResponse)
async def submit_feedback(
    request: SubmitFeedbackRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Submit feedback on an AI-generated solution.

    This endpoint:
    1. Records the feedback
    2. Checks if validation criteria are met
    3. Auto-validates if thresholds are reached
    4. Returns the current validation status
    """
    # Validate feedback type
    if request.feedback_type not in ("positive", "negative", "correction"):
        raise HTTPException(
            status_code=400,
            detail="Invalid feedback type. Must be 'positive', 'negative', or 'correction'",
        )

    if request.feedback_type == "correction" and not request.correction_text:
        raise HTTPException(
            status_code=400,
            detail="Correction text is required for correction feedback",
        )

    feedback_service = get_feedback_service()

    try:
        feedback_id, validation = await feedback_service.submit_feedback(
            issue_id=request.issue_id,
            feedback_type=request.feedback_type,
            correction_text=request.correction_text,
            user_id=request.user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    message = f"Feedback recorded: {request.feedback_type}"
    if validation.is_validated:
        message += " (issue auto-validated)"

    return SubmitFeedbackResponse(
        success=True,
        feedback_id=feedback_id,
        validation_result=validation,
        message=message,
    )


@router.get("/feedback/{issue_id}/stats", response_model=FeedbackStats)
async def get_feedback_stats(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """Get feedback statistics for an issue."""
    feedback_service = get_feedback_service()
    return await feedback_service.get_feedback_stats(issue_id)


@router.get("/feedback/{issue_id}/corrections", response_model=CorrectionSummary)
async def get_corrections(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """Get corrections submitted for an issue."""
    feedback_service = get_feedback_service()
    return await feedback_service.get_corrections(issue_id)


@router.get("/queue", response_model=List[ValidationQueueItem])
async def get_validation_queue(
    limit: int = Query(50, ge=1, le=200),
    min_feedback: int = Query(1, ge=0),
    sort_by: str = Query("priority", regex="^(priority|feedback_count|created_at)$"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Get the validation queue.

    Returns issues pending validation, sorted by priority.
    """
    validation_service = get_validation_service()
    return await validation_service.get_validation_queue(
        limit=limit,
        min_feedback=min_feedback,
        sort_by=sort_by,
    )


@router.post("/validate")
async def validate_issue(
    request: ValidateRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """Manually validate an issue."""
    validation_service = get_validation_service()

    try:
        result = await validation_service.validate_issue(
            issue_id=request.issue_id,
            validator_notes=request.notes,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/reject")
async def reject_issue(
    request: RejectRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """Reject an issue's AI explanation."""
    validation_service = get_validation_service()

    try:
        result = await validation_service.reject_issue(
            issue_id=request.issue_id,
            reason=request.reason,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/apply-correction")
async def apply_correction(
    request: ApplyCorrectionRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Apply a correction as the human solution.

    This marks the issue as validated and optionally updates the embedding.
    """
    feedback_service = get_feedback_service()

    try:
        success = await feedback_service.apply_correction(
            issue_id=request.issue_id,
            solution_text=request.solution_text,
            update_embedding=request.update_embedding,
        )
        return {
            "success": success,
            "message": "Correction applied and issue validated",
            "issue_id": request.issue_id,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/bulk-validate")
async def bulk_validate(
    request: BulkValidateRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """Bulk validate multiple issues."""
    feedback_service = get_feedback_service()
    result = await feedback_service.bulk_validate(request.issue_ids)
    return result


@router.post("/auto-validate")
async def auto_validate(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Auto-validate all issues that meet the criteria.

    This checks all pending issues and validates those with
    enough positive feedback.
    """
    validation_service = get_validation_service()
    result = await validation_service.auto_validate_eligible()
    return result


@router.get("/metrics", response_model=ValidationMetrics)
async def get_metrics(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """Get validation metrics."""
    validation_service = get_validation_service()
    return await validation_service.get_validation_metrics()


@router.get("/quality/{issue_id}", response_model=QualityScore)
async def get_quality_score(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """Get the quality score for an issue's solution."""
    validation_service = get_validation_service()

    try:
        return await validation_service.score_solution_quality(issue_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/needs-correction")
async def get_needs_correction(
    min_negative: int = Query(2, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Get issues that need correction.

    Returns issues with negative feedback that need human attention.
    """
    feedback_service = get_feedback_service()
    return await feedback_service.get_issues_needing_correction(
        min_negative=min_negative,
        limit=limit,
    )


@router.get("/pending")
async def get_pending_validations(
    min_feedback: int = Query(2, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Get issues pending validation.

    Returns issues with feedback that haven't been validated yet.
    """
    feedback_service = get_feedback_service()
    return await feedback_service.get_pending_validations(
        min_feedback=min_feedback,
        limit=limit,
    )
