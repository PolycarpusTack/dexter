"""
Feedback Service for Dexter Knowledge Base.

Manages the feedback loop for continuous improvement:
- Tracks positive/negative feedback
- Processes corrections to improve solutions
- Validates solutions based on feedback thresholds
- Triggers re-embedding when solutions are updated
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal
from app.db.models import SentryIssue
from app.db.repositories.feedback import FeedbackRepository
from app.db.repositories.issues import IssueRepository
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


class FeedbackStats(BaseModel):
    """Statistics for an issue's feedback."""

    issue_id: int
    positive_count: int = 0
    negative_count: int = 0
    correction_count: int = 0
    net_score: int = 0
    validation_status: str = "pending"  # pending, validated, rejected
    confidence_score: float = 0.0


class ValidationResult(BaseModel):
    """Result of a validation check."""

    issue_id: int
    is_validated: bool
    reason: str
    confidence_score: float
    feedback_summary: Dict[str, int]


class CorrectionSummary(BaseModel):
    """Summary of corrections for an issue."""

    issue_id: int
    correction_count: int
    latest_correction: Optional[str] = None
    suggested_solution: Optional[str] = None


# Validation thresholds
VALIDATION_THRESHOLDS = {
    "min_positive_for_validation": 3,  # Min positive votes to validate
    "min_net_score_for_validation": 2,  # Net score (positive - negative)
    "max_negative_for_rejection": 5,  # Max negative before rejection
    "correction_weight": 2,  # Weight of corrections vs simple feedback
    "confidence_base": 0.5,  # Base confidence score
    "confidence_per_positive": 0.1,  # Confidence increase per positive
    "confidence_max": 0.95,  # Maximum confidence
}


class FeedbackService:
    """
    Service for managing feedback and validation.

    Implements the feedback loop:
    1. Collect feedback (positive, negative, correction)
    2. Calculate validation scores
    3. Auto-validate/reject based on thresholds
    4. Process corrections to improve solutions
    """

    def __init__(self, thresholds: Optional[Dict[str, Any]] = None):
        self.thresholds = thresholds or VALIDATION_THRESHOLDS
        self.pii_scrubber = get_pii_scrubber()

    async def submit_feedback(
        self,
        issue_id: int,
        feedback_type: str,
        correction_text: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Tuple[int, ValidationResult]:
        """
        Submit feedback and check for validation status change.

        Args:
            issue_id: Database ID of the issue
            feedback_type: 'positive', 'negative', or 'correction'
            correction_text: Text for correction feedback
            user_id: Optional hashed user ID

        Returns:
            Tuple of (feedback_id, validation_result)
        """
        # Scrub correction text
        if correction_text:
            correction_text = self.pii_scrubber.scrub_string(correction_text)

        # Hash user ID if provided
        if user_id:
            user_id = self.pii_scrubber.hash_value(user_id)

        async with AsyncSessionLocal() as session:
            # Create feedback entry
            feedback_repo = FeedbackRepository(session)
            issue_repo = IssueRepository(session)

            # Verify issue exists
            issue = await issue_repo.get_by_id(issue_id)
            if not issue:
                raise ValueError(f"Issue {issue_id} not found")

            # Create feedback
            feedback = await feedback_repo.create(
                issue_id=issue_id,
                feedback_type=feedback_type,
                correction_text=correction_text,
                user_id=user_id,
            )

            # Update issue feedback count
            await issue_repo.increment_feedback_count(issue_id)

            # Check validation status
            validation = await self._check_validation(session, issue_id)

            # Apply validation if status changed
            if validation.is_validated and not issue.is_useful:
                await issue_repo.update(
                    issue_id,
                    is_useful=True,
                    confidence_score=validation.confidence_score,
                )
                logger.info(f"Issue {issue_id} auto-validated with confidence {validation.confidence_score}")

            await session.commit()

            return feedback.id, validation

    async def get_feedback_stats(self, issue_id: int) -> FeedbackStats:
        """Get feedback statistics for an issue."""
        async with AsyncSessionLocal() as session:
            feedback_repo = FeedbackRepository(session)
            counts = await feedback_repo.count_by_type(issue_id)

            positive = counts.get("positive", 0)
            negative = counts.get("negative", 0)
            corrections = counts.get("correction", 0)

            net_score = positive - negative + (corrections * self.thresholds["correction_weight"])

            # Determine validation status
            if positive >= self.thresholds["min_positive_for_validation"] and \
               net_score >= self.thresholds["min_net_score_for_validation"]:
                status = "validated"
            elif negative >= self.thresholds["max_negative_for_rejection"]:
                status = "rejected"
            else:
                status = "pending"

            confidence = self._calculate_confidence(positive, negative, corrections)

            return FeedbackStats(
                issue_id=issue_id,
                positive_count=positive,
                negative_count=negative,
                correction_count=corrections,
                net_score=net_score,
                validation_status=status,
                confidence_score=confidence,
            )

    async def get_corrections(self, issue_id: int) -> CorrectionSummary:
        """Get correction summary for an issue."""
        async with AsyncSessionLocal() as session:
            feedback_repo = FeedbackRepository(session)
            corrections = await feedback_repo.get_corrections_for_issue(issue_id)

            suggested = None
            if corrections:
                # Use the most recent correction as suggested solution
                suggested = corrections[0]

            return CorrectionSummary(
                issue_id=issue_id,
                correction_count=len(corrections),
                latest_correction=corrections[0] if corrections else None,
                suggested_solution=suggested,
            )

    async def apply_correction(
        self,
        issue_id: int,
        solution_text: str,
        update_embedding: bool = True,
    ) -> bool:
        """
        Apply a correction as the new human solution.

        Args:
            issue_id: Database ID of the issue
            solution_text: The corrected solution text
            update_embedding: Whether to regenerate embedding

        Returns:
            True if successful
        """
        # Scrub the solution
        solution_text = self.pii_scrubber.scrub_string(solution_text)

        async with AsyncSessionLocal() as session:
            issue_repo = IssueRepository(session)

            issue = await issue_repo.get_by_id(issue_id)
            if not issue:
                raise ValueError(f"Issue {issue_id} not found")

            # Update the issue with human solution
            updates = {
                "human_solution": solution_text,
                "is_useful": True,  # Mark as useful since human-verified
            }

            # Optionally regenerate embedding with solution context
            if update_embedding and issue.error_type and issue.error_message:
                try:
                    from app.services.embeddings_service import get_embeddings_service
                    from app.services.embedding_formatter import frames_to_embedding_text, CleanedFrame

                    embeddings = get_embeddings_service()

                    # Include solution in embedding text for better retrieval
                    frames = []
                    if issue.cleaned_stack:
                        frames = [CleanedFrame(**f) for f in issue.cleaned_stack]

                    embedding_text = frames_to_embedding_text(
                        error_type=issue.error_type,
                        error_message=issue.error_message,
                        frames=frames,
                        platform=issue.platform,
                    )
                    # Append solution for richer embedding
                    embedding_text += f"\nSolution: {solution_text[:500]}"

                    embedding = embeddings.encode_single(embedding_text)
                    updates["embedding"] = embedding
                    updates["processing_status"] = "completed"

                except Exception as e:
                    logger.error(f"Failed to update embedding for issue {issue_id}: {e}")
                    # Continue without embedding update

            await issue_repo.update(issue_id, **updates)
            await session.commit()

            logger.info(f"Applied correction to issue {issue_id}")
            return True

    async def get_pending_validations(
        self,
        min_feedback: int = 2,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Get issues pending validation review.

        Returns issues with enough feedback but not yet validated.
        """
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(SentryIssue)
                .where(SentryIssue.is_useful == False)
                .where(SentryIssue.feedback_count >= min_feedback)
                .order_by(SentryIssue.feedback_count.desc())
                .limit(limit)
            )
            issues = result.scalars().all()

            pending = []
            for issue in issues:
                stats = await self.get_feedback_stats(issue.id)
                pending.append({
                    "issue_id": issue.id,
                    "sentry_issue_id": issue.sentry_issue_id,
                    "error_type": issue.error_type,
                    "error_message": issue.error_message[:200],
                    "feedback_stats": stats.model_dump(),
                    "ai_explanation": issue.ai_explanation,
                })

            return pending

    async def get_issues_needing_correction(
        self,
        min_negative: int = 2,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Get issues with negative feedback that need correction.

        Returns issues that have been marked unhelpful.
        """
        async with AsyncSessionLocal() as session:
            # Find issues with AI explanation but negative feedback
            feedback_repo = FeedbackRepository(session)
            recent_negative = await feedback_repo.get_recent(
                limit=limit * 2,
                feedback_type="negative",
            )

            # Group by issue and filter
            issue_ids = set(f["issue_id"] for f in recent_negative)

            needing_correction = []
            issue_repo = IssueRepository(session)

            for issue_id in list(issue_ids)[:limit]:
                issue = await issue_repo.get_by_id(issue_id)
                if issue and issue.ai_explanation and not issue.human_solution:
                    stats = await self.get_feedback_stats(issue_id)
                    if stats.negative_count >= min_negative:
                        needing_correction.append({
                            "issue_id": issue.id,
                            "sentry_issue_id": issue.sentry_issue_id,
                            "error_type": issue.error_type,
                            "error_message": issue.error_message[:200],
                            "ai_explanation": issue.ai_explanation,
                            "negative_count": stats.negative_count,
                        })

            return needing_correction

    async def bulk_validate(
        self,
        issue_ids: List[int],
    ) -> Dict[str, Any]:
        """
        Bulk validate multiple issues.

        Returns summary of validation results.
        """
        results = {"validated": 0, "already_valid": 0, "failed": 0}

        async with AsyncSessionLocal() as session:
            issue_repo = IssueRepository(session)

            for issue_id in issue_ids:
                try:
                    issue = await issue_repo.get_by_id(issue_id)
                    if not issue:
                        results["failed"] += 1
                        continue

                    if issue.is_useful:
                        results["already_valid"] += 1
                        continue

                    stats = await self.get_feedback_stats(issue_id)
                    await issue_repo.update(
                        issue_id,
                        is_useful=True,
                        confidence_score=stats.confidence_score,
                    )
                    results["validated"] += 1

                except Exception as e:
                    logger.error(f"Failed to validate issue {issue_id}: {e}")
                    results["failed"] += 1

            await session.commit()

        return results

    async def _check_validation(
        self,
        session: AsyncSession,
        issue_id: int,
    ) -> ValidationResult:
        """Check if an issue meets validation criteria."""
        feedback_repo = FeedbackRepository(session)
        counts = await feedback_repo.count_by_type(issue_id)

        positive = counts.get("positive", 0)
        negative = counts.get("negative", 0)
        corrections = counts.get("correction", 0)

        confidence = self._calculate_confidence(positive, negative, corrections)

        # Check validation criteria
        is_validated = (
            positive >= self.thresholds["min_positive_for_validation"] and
            (positive - negative) >= self.thresholds["min_net_score_for_validation"]
        )

        if is_validated:
            reason = f"Met threshold: {positive} positive, net score {positive - negative}"
        elif negative >= self.thresholds["max_negative_for_rejection"]:
            reason = f"Rejected: {negative} negative votes"
        else:
            reason = f"Pending: {positive} positive, {negative} negative"

        return ValidationResult(
            issue_id=issue_id,
            is_validated=is_validated,
            reason=reason,
            confidence_score=confidence,
            feedback_summary=counts,
        )

    def _calculate_confidence(
        self,
        positive: int,
        negative: int,
        corrections: int,
    ) -> float:
        """Calculate confidence score based on feedback."""
        base = self.thresholds["confidence_base"]
        per_positive = self.thresholds["confidence_per_positive"]
        max_conf = self.thresholds["confidence_max"]

        # Positive feedback increases confidence
        confidence = base + (positive * per_positive)

        # Corrections count as stronger positive signal
        confidence += corrections * per_positive * self.thresholds["correction_weight"]

        # Negative feedback decreases confidence
        confidence -= negative * (per_positive / 2)

        # Clamp to valid range
        return max(0.0, min(confidence, max_conf))


# Singleton instance
_feedback_service: Optional[FeedbackService] = None


def get_feedback_service() -> FeedbackService:
    """Get singleton feedback service."""
    global _feedback_service
    if _feedback_service is None:
        _feedback_service = FeedbackService()
    return _feedback_service
