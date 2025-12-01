"""
Validation Service for Dexter Knowledge Base.

Manages the solution validation workflow:
- Auto-validation based on feedback
- Manual validation queue
- Solution quality scoring
- Validation metrics tracking
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import Integer, and_, func, select

from app.db.database import AsyncSessionLocal
from app.db.models import SentryIssue
from app.db.repositories.issues import IssueRepository
from app.services.feedback_service import get_feedback_service

logger = logging.getLogger(__name__)


class ValidationQueueItem(BaseModel):
    """Item in the validation queue."""

    issue_id: int
    sentry_issue_id: str
    error_type: str
    error_message: str
    ai_explanation: Optional[str] = None
    human_solution: Optional[str] = None
    positive_count: int = 0
    negative_count: int = 0
    correction_count: int = 0
    priority_score: float = 0.0
    created_at: Optional[str] = None


class ValidationMetrics(BaseModel):
    """Metrics for validation system."""

    total_issues: int
    validated_issues: int
    pending_issues: int
    rejected_issues: int
    validation_rate: float
    avg_time_to_validation_hours: Optional[float] = None
    top_error_types: List[Dict[str, Any]] = Field(default_factory=list)


class QualityScore(BaseModel):
    """Quality score for a solution."""

    issue_id: int
    overall_score: float = Field(..., ge=0, le=1)
    completeness: float = Field(..., ge=0, le=1)
    feedback_score: float = Field(..., ge=0, le=1)
    has_code_example: bool = False
    has_steps: bool = False


class ValidationService:
    """
    Service for managing validation workflows.

    Responsibilities:
    - Maintain validation queue
    - Calculate priority scores
    - Track validation metrics
    - Score solution quality
    """

    def __init__(self):
        self.feedback_service = get_feedback_service()

    async def get_validation_queue(
        self,
        limit: int = 50,
        min_feedback: int = 1,
        sort_by: str = "priority",  # priority, feedback_count, created_at
    ) -> List[ValidationQueueItem]:
        """
        Get issues pending validation, sorted by priority.

        Priority is calculated based on:
        - Feedback count (more feedback = higher priority)
        - Net sentiment (more positive = higher priority)
        - Age (older issues get priority boost)
        - Error type frequency (common errors = higher priority)
        """
        async with AsyncSessionLocal() as session:
            # Query unvalidated issues with feedback
            query = (
                select(SentryIssue)
                .where(SentryIssue.is_useful == False)
                .where(SentryIssue.feedback_count >= min_feedback)
            )

            if sort_by == "feedback_count":
                query = query.order_by(SentryIssue.feedback_count.desc())
            elif sort_by == "created_at":
                query = query.order_by(SentryIssue.created_at.asc())
            else:
                # Default: by feedback count (proxy for priority)
                query = query.order_by(SentryIssue.feedback_count.desc())

            query = query.limit(limit)

            result = await session.execute(query)
            issues = result.scalars().all()

            queue_items = []
            for issue in issues:
                stats = await self.feedback_service.get_feedback_stats(issue.id)
                priority = self._calculate_priority(issue, stats)

                queue_items.append(ValidationQueueItem(
                    issue_id=issue.id,
                    sentry_issue_id=issue.sentry_issue_id,
                    error_type=issue.error_type,
                    error_message=issue.error_message[:300],
                    ai_explanation=issue.ai_explanation[:500] if issue.ai_explanation else None,
                    human_solution=issue.human_solution,
                    positive_count=stats.positive_count,
                    negative_count=stats.negative_count,
                    correction_count=stats.correction_count,
                    priority_score=priority,
                    created_at=issue.created_at.isoformat() if issue.created_at else None,
                ))

            # Sort by priority if requested
            if sort_by == "priority":
                queue_items.sort(key=lambda x: x.priority_score, reverse=True)

            return queue_items

    async def validate_issue(
        self,
        issue_id: int,
        validator_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Manually validate an issue.

        Args:
            issue_id: Issue to validate
            validator_notes: Optional notes from validator

        Returns:
            Validation result
        """
        async with AsyncSessionLocal() as session:
            repo = IssueRepository(session)
            issue = await repo.get_by_id(issue_id)

            if not issue:
                raise ValueError(f"Issue {issue_id} not found")

            if issue.is_useful:
                return {
                    "success": True,
                    "message": "Issue already validated",
                    "issue_id": issue_id,
                }

            # Calculate confidence based on feedback
            stats = await self.feedback_service.get_feedback_stats(issue_id)

            await repo.update(
                issue_id,
                is_useful=True,
                confidence_score=stats.confidence_score,
            )

            await session.commit()

            logger.info(f"Issue {issue_id} manually validated")

            return {
                "success": True,
                "message": "Issue validated",
                "issue_id": issue_id,
                "confidence_score": stats.confidence_score,
            }

    async def reject_issue(
        self,
        issue_id: int,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Reject an issue's AI explanation as unhelpful.

        The issue remains in the database but is marked as not useful.
        """
        async with AsyncSessionLocal() as session:
            repo = IssueRepository(session)
            issue = await repo.get_by_id(issue_id)

            if not issue:
                raise ValueError(f"Issue {issue_id} not found")

            # Clear the AI explanation since it was rejected
            await repo.update(
                issue_id,
                is_useful=False,
                confidence_score=0.0,
                ai_explanation=None,
                ai_suggested_fix=None,
            )

            await session.commit()

            logger.info(f"Issue {issue_id} rejected: {reason}")

            return {
                "success": True,
                "message": "Issue rejected",
                "issue_id": issue_id,
                "reason": reason,
            }

    async def get_validation_metrics(self) -> ValidationMetrics:
        """Get overall validation metrics."""
        async with AsyncSessionLocal() as session:
            # Total issues
            total_result = await session.execute(
                select(func.count()).select_from(SentryIssue)
            )
            total = total_result.scalar() or 0

            # Validated issues
            validated_result = await session.execute(
                select(func.count()).where(SentryIssue.is_useful == True)
            )
            validated = validated_result.scalar() or 0

            # Pending (has feedback but not validated)
            pending_result = await session.execute(
                select(func.count()).where(
                    and_(
                        SentryIssue.is_useful == False,
                        SentryIssue.feedback_count > 0,
                    )
                )
            )
            pending = pending_result.scalar() or 0

            # Issues with high negative feedback (pseudo-rejected)
            rejected_result = await session.execute(
                select(func.count()).where(
                    and_(
                        SentryIssue.is_useful == False,
                        SentryIssue.confidence_score == 0.0,
                        SentryIssue.ai_explanation.is_(None),
                    )
                )
            )
            rejected = rejected_result.scalar() or 0

            # Top error types
            error_types_result = await session.execute(
                select(
                    SentryIssue.error_type,
                    func.count().label("count"),
                    func.sum(
                        func.cast(SentryIssue.is_useful, Integer)
                    ).label("validated_count"),
                )
                .group_by(SentryIssue.error_type)
                .order_by(func.count().desc())
                .limit(10)
            )

            error_types_result = await session.execute(
                select(
                    SentryIssue.error_type,
                    func.count().label("count"),
                )
                .group_by(SentryIssue.error_type)
                .order_by(func.count().desc())
                .limit(10)
            )

            top_error_types = [
                {"error_type": row[0], "count": row[1]}
                for row in error_types_result.fetchall()
            ]

            validation_rate = validated / total if total > 0 else 0.0

            return ValidationMetrics(
                total_issues=total,
                validated_issues=validated,
                pending_issues=pending,
                rejected_issues=rejected,
                validation_rate=validation_rate,
                top_error_types=top_error_types,
            )

    async def score_solution_quality(
        self,
        issue_id: int,
    ) -> QualityScore:
        """
        Score the quality of a solution.

        Factors:
        - Completeness (has explanation, suggested fix, etc.)
        - Feedback score (positive vs negative)
        - Has code example
        - Has step-by-step instructions
        """
        async with AsyncSessionLocal() as session:
            repo = IssueRepository(session)
            issue = await repo.get_by_id(issue_id)

            if not issue:
                raise ValueError(f"Issue {issue_id} not found")

            # Completeness score
            completeness = 0.0
            total_fields = 3  # ai_explanation, ai_suggested_fix, human_solution

            if issue.ai_explanation:
                completeness += 1 / total_fields
            if issue.ai_suggested_fix:
                completeness += 1 / total_fields
            if issue.human_solution:
                completeness += 1 / total_fields

            # Feedback score
            stats = await self.feedback_service.get_feedback_stats(issue_id)
            feedback_score = stats.confidence_score

            # Check for code examples
            solution_text = (issue.human_solution or issue.ai_suggested_fix or "").lower()
            has_code = any(marker in solution_text for marker in [
                "```", "def ", "function ", "class ", "import ", "const ", "let ", "var "
            ])

            # Check for steps
            has_steps = any(marker in solution_text for marker in [
                "1.", "step 1", "first,", "- ", "• "
            ])

            # Calculate overall score
            overall = (
                completeness * 0.3 +
                feedback_score * 0.5 +
                (0.1 if has_code else 0) +
                (0.1 if has_steps else 0)
            )

            return QualityScore(
                issue_id=issue_id,
                overall_score=min(overall, 1.0),
                completeness=completeness,
                feedback_score=feedback_score,
                has_code_example=has_code,
                has_steps=has_steps,
            )

    async def auto_validate_eligible(self) -> Dict[str, Any]:
        """
        Auto-validate all issues that meet the criteria.

        Returns summary of auto-validation results.
        """
        validated_count = 0
        checked_count = 0

        async with AsyncSessionLocal() as session:
            # Find issues with enough positive feedback
            repo = IssueRepository(session)

            result = await session.execute(
                select(SentryIssue)
                .where(SentryIssue.is_useful == False)
                .where(SentryIssue.feedback_count >= 3)
            )
            candidates = result.scalars().all()

            for issue in candidates:
                checked_count += 1
                stats = await self.feedback_service.get_feedback_stats(issue.id)

                if stats.validation_status == "validated":
                    await repo.update(
                        issue.id,
                        is_useful=True,
                        confidence_score=stats.confidence_score,
                    )
                    validated_count += 1

            await session.commit()

        logger.info(f"Auto-validation: {validated_count}/{checked_count} validated")

        return {
            "checked": checked_count,
            "validated": validated_count,
        }

    def _calculate_priority(
        self,
        issue: SentryIssue,
        stats: Any,
    ) -> float:
        """Calculate priority score for validation queue."""
        priority = 0.0

        # Feedback volume (normalized to ~0-1)
        priority += min(issue.feedback_count / 10, 1.0) * 0.4

        # Net sentiment
        net = stats.positive_count - stats.negative_count
        priority += max(0, min(net / 5, 1.0)) * 0.3

        # Age bonus (older = higher priority)
        if issue.created_at:
            age_days = (datetime.utcnow() - issue.created_at.replace(tzinfo=None)).days
            priority += min(age_days / 30, 1.0) * 0.2

        # Corrections bonus
        priority += min(stats.correction_count / 3, 1.0) * 0.1

        return round(priority, 3)


# Singleton instance
_validation_service: Optional[ValidationService] = None


def get_validation_service() -> ValidationService:
    """Get singleton validation service."""
    global _validation_service
    if _validation_service is None:
        _validation_service = ValidationService()
    return _validation_service
