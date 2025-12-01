"""
Repository for FeedbackLog data access.

Provides CRUD operations for feedback tracking.
"""

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import FeedbackLog

logger = logging.getLogger(__name__)


class FeedbackRepository:
    """
    Repository for FeedbackLog database operations.

    User IDs should be hashed before storage.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        issue_id: int,
        feedback_type: str,
        correction_text: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> FeedbackLog:
        """
        Create a new feedback entry.

        Args:
            issue_id: Database ID of the issue
            feedback_type: Type of feedback ('positive', 'negative', 'correction')
            correction_text: Text for correction feedback (PII-scrubbed)
            user_id: Hashed user identifier

        Returns:
            Created FeedbackLog instance
        """
        if feedback_type not in ("positive", "negative", "correction"):
            raise ValueError(f"Invalid feedback type: {feedback_type}")

        feedback = FeedbackLog(
            issue_id=issue_id,
            feedback_type=feedback_type,
            correction_text=correction_text,
            user_id=user_id,
        )

        self.session.add(feedback)
        await self.session.flush()
        await self.session.refresh(feedback)

        logger.info(
            f"Created {feedback_type} feedback {feedback.id} for issue {issue_id}"
        )
        return feedback

    async def get_by_id(self, feedback_id: int) -> Optional[FeedbackLog]:
        """Get feedback by ID."""
        result = await self.session.execute(
            select(FeedbackLog).where(FeedbackLog.id == feedback_id)
        )
        return result.scalar_one_or_none()

    async def get_by_issue_id(self, issue_id: int) -> List[FeedbackLog]:
        """Get all feedback for an issue."""
        result = await self.session.execute(
            select(FeedbackLog)
            .where(FeedbackLog.issue_id == issue_id)
            .order_by(FeedbackLog.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_by_type(self, issue_id: int) -> Dict[str, int]:
        """
        Count feedback by type for an issue.

        Returns:
            Dict with counts for each feedback type
        """
        result = await self.session.execute(
            select(FeedbackLog.feedback_type, func.count())
            .where(FeedbackLog.issue_id == issue_id)
            .group_by(FeedbackLog.feedback_type)
        )

        counts = {"positive": 0, "negative": 0, "correction": 0}
        for row in result.fetchall():
            counts[row[0]] = row[1]

        return counts

    async def get_recent(
        self,
        limit: int = 50,
        feedback_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get recent feedback entries.

        Args:
            limit: Maximum number of entries
            feedback_type: Optional filter by type

        Returns:
            List of feedback entries with issue info
        """
        query = select(FeedbackLog).order_by(FeedbackLog.created_at.desc())

        if feedback_type:
            query = query.where(FeedbackLog.feedback_type == feedback_type)

        query = query.limit(limit)

        result = await self.session.execute(query)
        entries = result.scalars().all()

        return [
            {
                "id": entry.id,
                "issue_id": entry.issue_id,
                "feedback_type": entry.feedback_type,
                "correction_text": entry.correction_text,
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
            }
            for entry in entries
        ]

    async def get_stats(self) -> Dict[str, Any]:
        """Get feedback statistics."""
        # Total by type
        type_result = await self.session.execute(
            select(FeedbackLog.feedback_type, func.count())
            .group_by(FeedbackLog.feedback_type)
        )
        by_type = {row[0]: row[1] for row in type_result.fetchall()}

        # Total count
        total_result = await self.session.execute(
            select(func.count()).select_from(FeedbackLog)
        )
        total = total_result.scalar()

        # Unique issues with feedback
        unique_issues_result = await self.session.execute(
            select(func.count(func.distinct(FeedbackLog.issue_id)))
        )
        unique_issues = unique_issues_result.scalar()

        return {
            "total_feedback": total,
            "positive": by_type.get("positive", 0),
            "negative": by_type.get("negative", 0),
            "corrections": by_type.get("correction", 0),
            "unique_issues_with_feedback": unique_issues,
            "net_sentiment": by_type.get("positive", 0) - by_type.get("negative", 0),
        }

    async def get_corrections_for_issue(self, issue_id: int) -> List[str]:
        """Get all correction texts for an issue."""
        result = await self.session.execute(
            select(FeedbackLog.correction_text)
            .where(FeedbackLog.issue_id == issue_id)
            .where(FeedbackLog.feedback_type == "correction")
            .where(FeedbackLog.correction_text.isnot(None))
            .order_by(FeedbackLog.created_at.desc())
        )
        return [row[0] for row in result.fetchall() if row[0]]
