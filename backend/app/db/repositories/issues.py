"""
Repository for SentryIssue data access.

Provides CRUD operations and similarity search for issues.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EMBEDDING_DIMENSION, SentryIssue

logger = logging.getLogger(__name__)


class IssueRepository:
    """
    Repository for SentryIssue database operations.

    All methods assume data has been PII-scrubbed before calling.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        sentry_issue_id: str,
        sentry_event_id: str,
        error_type: str,
        error_message: str,
        platform: Optional[str] = None,
        level: str = "error",
        cleaned_stack: Optional[List[Dict[str, Any]]] = None,
        context_tags: Optional[Dict[str, Any]] = None,
        embedding: Optional[List[float]] = None,
        processing_status: str = "completed",
        sentry_timestamp: Optional[datetime] = None,
    ) -> SentryIssue:
        """
        Create a new issue in the knowledge base.

        Args:
            sentry_issue_id: Sentry's issue ID
            sentry_event_id: Sentry's event ID
            error_type: Type of error (e.g., TypeError, ValueError)
            error_message: Error message text
            platform: Platform (e.g., python, javascript)
            level: Error level
            cleaned_stack: PII-scrubbed stack frames
            context_tags: Sanitized context tags
            embedding: 768-dim embedding vector
            processing_status: Status of processing
            sentry_timestamp: Original timestamp from Sentry

        Returns:
            Created SentryIssue instance
        """
        issue = SentryIssue(
            sentry_issue_id=sentry_issue_id,
            sentry_event_id=sentry_event_id,
            error_type=error_type,
            error_message=error_message,
            platform=platform,
            level=level,
            cleaned_stack=cleaned_stack,
            context_tags=context_tags,
            embedding=embedding,
            processing_status=processing_status,
            sentry_timestamp=sentry_timestamp,
        )

        self.session.add(issue)
        await self.session.flush()
        await self.session.refresh(issue)

        logger.debug(f"Created issue {issue.id} for sentry_issue_id={sentry_issue_id}")
        return issue

    async def get_by_id(self, issue_id: int) -> Optional[SentryIssue]:
        """Get issue by database ID."""
        result = await self.session.execute(
            select(SentryIssue).where(SentryIssue.id == issue_id)
        )
        return result.scalar_one_or_none()

    async def get_by_sentry_issue_id(self, sentry_issue_id: str) -> Optional[SentryIssue]:
        """Get issue by Sentry issue ID."""
        result = await self.session.execute(
            select(SentryIssue).where(SentryIssue.sentry_issue_id == sentry_issue_id)
        )
        return result.scalar_one_or_none()

    async def get_by_sentry_event_id(self, sentry_event_id: str) -> Optional[SentryIssue]:
        """Get issue by Sentry event ID."""
        result = await self.session.execute(
            select(SentryIssue).where(SentryIssue.sentry_event_id == sentry_event_id)
        )
        return result.scalar_one_or_none()

    async def exists_by_sentry_issue_id(self, sentry_issue_id: str) -> bool:
        """Check if issue exists by Sentry issue ID."""
        result = await self.session.execute(
            select(func.count()).where(SentryIssue.sentry_issue_id == sentry_issue_id)
        )
        return result.scalar() > 0

    async def update(self, issue_id: int, **kwargs) -> Optional[SentryIssue]:
        """
        Update issue fields.

        Args:
            issue_id: Database ID of issue
            **kwargs: Fields to update

        Returns:
            Updated issue or None if not found
        """
        issue = await self.get_by_id(issue_id)
        if not issue:
            return None

        for key, value in kwargs.items():
            if hasattr(issue, key):
                setattr(issue, key, value)

        await self.session.flush()
        await self.session.refresh(issue)

        logger.debug(f"Updated issue {issue_id} with fields: {list(kwargs.keys())}")
        return issue

    async def increment_feedback_count(self, issue_id: int) -> None:
        """Increment the feedback count for an issue."""
        await self.session.execute(
            update(SentryIssue)
            .where(SentryIssue.id == issue_id)
            .values(feedback_count=SentryIssue.feedback_count + 1)
        )

    async def find_similar(
        self,
        query_embedding: List[float],
        error_type: Optional[str] = None,
        platform: Optional[str] = None,
        limit: int = 5,
        similarity_threshold: float = 0.7,
        prefer_validated: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Find similar issues using pgvector cosine similarity.

        Args:
            query_embedding: 768-dim query embedding
            error_type: Optional filter by error type
            platform: Optional filter by platform
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score (0-1)
            prefer_validated: Prioritize validated (is_useful=True) issues

        Returns:
            List of issues with similarity scores
        """
        if not query_embedding or len(query_embedding) != EMBEDDING_DIMENSION:
            logger.warning(
                f"Invalid query embedding: expected {EMBEDDING_DIMENSION} dims, "
                f"got {len(query_embedding) if query_embedding else 0}"
            )
            return []

        # Build WHERE clauses
        where_clauses = [
            "embedding IS NOT NULL",
            "1 - (embedding <=> :embedding) >= :threshold",
        ]
        params: Dict[str, Any] = {
            "embedding": str(query_embedding),
            "threshold": similarity_threshold,
            "limit": limit,
        }

        if error_type:
            where_clauses.append("error_type = :error_type")
            params["error_type"] = error_type

        if platform:
            where_clauses.append("platform = :platform")
            params["platform"] = platform

        # Order by validation status first if preferred, then similarity
        order_clause = (
            "is_useful DESC, similarity DESC" if prefer_validated else "similarity DESC"
        )

        query = text(f"""
            SELECT
                id, sentry_issue_id, error_type, error_message,
                ai_explanation, ai_suggested_fix, human_solution,
                is_useful, feedback_count, platform,
                1 - (embedding <=> :embedding) as similarity
            FROM sentry_issues
            WHERE {" AND ".join(where_clauses)}
            ORDER BY {order_clause}
            LIMIT :limit
        """)

        try:
            result = await self.session.execute(query, params)
            rows = result.fetchall()

            return [
                {
                    "id": row.id,
                    "sentry_issue_id": row.sentry_issue_id,
                    "error_type": row.error_type,
                    "error_message": row.error_message,
                    "ai_explanation": row.ai_explanation,
                    "ai_suggested_fix": row.ai_suggested_fix,
                    "human_solution": row.human_solution,
                    "is_useful": row.is_useful,
                    "feedback_count": row.feedback_count,
                    "platform": row.platform,
                    "similarity_score": float(row.similarity),
                }
                for row in rows
            ]
        except Exception as e:
            logger.error(f"Similarity search failed: {e}", exc_info=True)
            return []

    async def list_issues(
        self,
        search: Optional[str] = None,
        filter_validated: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """
        List issues with pagination and filtering.

        Args:
            search: Search term for error type/message
            filter_validated: Filter by validation status
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Dict with issues list and pagination info
        """
        query = select(SentryIssue)

        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.where(
                (SentryIssue.error_type.ilike(search_term))
                | (SentryIssue.error_message.ilike(search_term))
            )

        if filter_validated is not None:
            query = query.where(SentryIssue.is_useful == filter_validated)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar()

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.order_by(SentryIssue.created_at.desc())
        query = query.offset(offset).limit(page_size)

        result = await self.session.execute(query)
        issues = result.scalars().all()

        return {
            "issues": [
                {
                    "id": issue.id,
                    "sentry_issue_id": issue.sentry_issue_id,
                    "error_type": issue.error_type,
                    "error_message": issue.error_message,
                    "platform": issue.platform,
                    "is_useful": issue.is_useful,
                    "feedback_count": issue.feedback_count,
                    "ai_explanation": issue.ai_explanation,
                    "human_solution": issue.human_solution,
                    "created_at": issue.created_at.isoformat() if issue.created_at else None,
                }
                for issue in issues
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }

    async def get_failed_processing(self, limit: int = 100) -> List[SentryIssue]:
        """Get issues with failed processing status for retry."""
        result = await self.session.execute(
            select(SentryIssue)
            .where(SentryIssue.processing_status == "failed")
            .order_by(SentryIssue.created_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_all_with_embeddings(self, limit: int = 10000) -> List[SentryIssue]:
        """
        Get all issues that have embeddings for clustering.

        Args:
            limit: Maximum number of issues to return (for memory safety)

        Returns:
            List of SentryIssue instances with embeddings
        """
        result = await self.session.execute(
            select(SentryIssue)
            .where(SentryIssue.embedding.isnot(None))
            .order_by(SentryIssue.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics."""
        total_result = await self.session.execute(
            select(func.count()).select_from(SentryIssue)
        )
        total = total_result.scalar()

        validated_result = await self.session.execute(
            select(func.count()).where(SentryIssue.is_useful == True)
        )
        validated = validated_result.scalar()

        with_embedding_result = await self.session.execute(
            select(func.count()).where(SentryIssue.embedding.isnot(None))
        )
        with_embedding = with_embedding_result.scalar()

        failed_result = await self.session.execute(
            select(func.count()).where(SentryIssue.processing_status == "failed")
        )
        failed = failed_result.scalar()

        return {
            "total_issues": total,
            "validated_issues": validated,
            "issues_with_embedding": with_embedding,
            "failed_processing": failed,
            "validation_rate": validated / total if total > 0 else 0,
        }
