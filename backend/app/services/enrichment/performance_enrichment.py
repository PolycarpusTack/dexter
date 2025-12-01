"""
Performance span and transaction enrichment.

This module implements Story E-1: Performance Span Integration from EPIC E.
It enriches issues with performance data including:
- Slow database queries
- N+1 query patterns
- Slow HTTP requests
- Performance span analysis
- Integration with existing analyzers

IMPORTANT: All data is PII-scrubbed before storage.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.performance import PerformanceClient, PerformanceSpan
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


# Thresholds for "problem spans"
SLOW_DB_THRESHOLD_MS = 1000  # 1 second
SLOW_HTTP_THRESHOLD_MS = 3000  # 3 seconds
N_PLUS_ONE_QUERY_COUNT = 5  # 5+ similar queries


class PerformanceEnrichmentService:
    """Service for enriching issues with performance span data."""

    def __init__(self, db: AsyncSession, sentry_client: PerformanceClient):
        """
        Initialize performance enrichment service.

        Args:
            db: Database session
            sentry_client: Sentry performance client
        """
        self.db = db
        self.client = sentry_client
        self.pii_scrubber = get_pii_scrubber()
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich issue with performance spans and transactions.

        Args:
            issue_id: Database ID of the issue to enrich

        Returns:
            Dict with enrichment status and metrics
        """
        if not self.settings.ENABLE_PERFORMANCE_SPANS:
            return {"status": "skipped", "reason": "feature disabled"}

        try:
            result = await self.db.execute(
                select(SentryIssue).where(SentryIssue.id == issue_id)
            )
            issue = result.scalar_one_or_none()
            if not issue:
                return {"status": "error", "reason": "issue not found"}

            # Fetch performance spans for this issue
            spans = await self.client.get_performance_spans(issue.sentry_issue_id)

            # Detect problem spans
            problem_spans = self._detect_problem_spans(spans)

            # Check for N+1 patterns
            n_plus_one_patterns = self._detect_n_plus_one(spans)

            # Build performance context
            performance_data = self._build_performance_data(
                spans, problem_spans, n_plus_one_patterns
            )

            # Scrub PII
            performance_data = self.pii_scrubber.scrub_dict(performance_data)

            # Update issue
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    performance_data=performance_data,
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {},
                        "performance_spans",
                        "completed"
                    ),
                    last_enriched_at=datetime.utcnow()
                )
            )
            await self.db.commit()

            logger.info(
                f"Enriched issue {issue_id} with performance data",
                extra={
                    "issue_id": issue_id,
                    "spans_count": len(spans),
                    "problem_spans": len(problem_spans),
                    "n_plus_one_detected": len(n_plus_one_patterns) > 0
                }
            )

            return {
                "status": "success",
                "spans_count": len(spans),
                "problem_spans_count": len(problem_spans),
                "n_plus_one_patterns": len(n_plus_one_patterns)
            }

        except Exception as e:
            logger.error(
                f"Performance enrichment failed for issue {issue_id}: {e}",
                exc_info=True
            )
            await self._mark_failed(issue_id, str(e))
            return {"status": "error", "reason": str(e)}

    def _detect_problem_spans(self, spans: List[PerformanceSpan]) -> List[Dict[str, Any]]:
        """
        Identify spans with performance issues.

        Args:
            spans: List of performance spans to analyze

        Returns:
            List of problem span dictionaries with details
        """
        problems = []

        for span in spans:
            if not span.duration_ms:
                continue

            problem_type = None

            if span.operation == "db.query" and span.duration_ms > SLOW_DB_THRESHOLD_MS:
                problem_type = "slow_db_query"
            elif span.operation.startswith("http") and span.duration_ms > SLOW_HTTP_THRESHOLD_MS:
                problem_type = "slow_http_request"
            elif span.is_slow:  # PerformanceClient marks slow spans
                problem_type = "slow_operation"

            if problem_type:
                problems.append({
                    "span_id": span.span_id,
                    "operation": span.operation,
                    "description": span.description[:100] if span.description else None,
                    "duration_ms": span.duration_ms,
                    "problem_type": problem_type,
                    "severity": self._compute_severity(span.duration_ms, span.operation)
                })

        return problems

    def _detect_n_plus_one(self, spans: List[PerformanceSpan]) -> List[Dict[str, Any]]:
        """
        Detect N+1 query patterns.

        Args:
            spans: List of performance spans to analyze

        Returns:
            List of detected N+1 patterns with statistics
        """
        db_spans = [s for s in spans if s.operation == "db.query"]

        if len(db_spans) < N_PLUS_ONE_QUERY_COUNT:
            return []

        # Group by similar descriptions (naive approach)
        query_groups = {}
        for span in db_spans:
            if not span.description:
                continue

            # Normalize query (remove values, keep structure)
            normalized = self._normalize_query(span.description)

            if normalized not in query_groups:
                query_groups[normalized] = []
            query_groups[normalized].append(span)

        # Find groups with 5+ similar queries
        n_plus_one = []
        for normalized_query, group in query_groups.items():
            if len(group) >= N_PLUS_ONE_QUERY_COUNT:
                total_time = sum(s.duration_ms or 0 for s in group)
                n_plus_one.append({
                    "pattern": normalized_query[:200],
                    "occurrence_count": len(group),
                    "total_duration_ms": total_time,
                    "avg_duration_ms": total_time / len(group),
                    "severity": "high" if total_time > 5000 else "medium"
                })

        return n_plus_one

    def _normalize_query(self, query: str) -> str:
        """
        Normalize SQL query to detect patterns.

        Args:
            query: SQL query string

        Returns:
            Normalized query string
        """
        import re
        # Remove numbers and quoted strings
        normalized = re.sub(r'\d+', 'N', query)
        normalized = re.sub(r"'[^']*'", "'X'", normalized)
        normalized = re.sub(r'"[^"]*"', '"X"', normalized)
        return normalized

    def _compute_severity(self, duration_ms: float, operation: str) -> str:
        """
        Compute severity level for slow span.

        Args:
            duration_ms: Span duration in milliseconds
            operation: Span operation type

        Returns:
            Severity level: critical, high, medium, or low
        """
        if operation == "db.query":
            if duration_ms > 5000:
                return "critical"
            elif duration_ms > 2000:
                return "high"
            elif duration_ms > 1000:
                return "medium"
        elif operation.startswith("http"):
            if duration_ms > 10000:
                return "critical"
            elif duration_ms > 5000:
                return "high"
            elif duration_ms > 3000:
                return "medium"

        return "low"

    def _build_performance_data(
        self,
        spans: List[PerformanceSpan],
        problem_spans: List[Dict[str, Any]],
        n_plus_one: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Build structured performance data.

        Args:
            spans: All performance spans
            problem_spans: Detected problem spans
            n_plus_one: Detected N+1 patterns

        Returns:
            Structured performance data dictionary
        """
        return {
            "total_spans": len(spans),
            "problem_spans": problem_spans,
            "n_plus_one_patterns": n_plus_one,
            "summary": {
                "total_db_queries": len([s for s in spans if s.operation == "db.query"]),
                "total_http_requests": len([s for s in spans if s.operation.startswith("http")]),
                "slowest_operation": max(
                    (s.duration_ms for s in spans if s.duration_ms),
                    default=0
                )
            },
            "last_fetched": datetime.utcnow().isoformat()
        }

    def _update_status(
        self, current: Dict, source: str, status: str, error: Optional[str] = None
    ) -> Dict:
        """
        Update enrichment status.

        Args:
            current: Current enrichment status
            source: Enrichment source name
            status: New status (completed, failed, pending)
            error: Optional error message

        Returns:
            Updated enrichment status dictionary
        """
        current[source] = {
            "status": status,
            "last_attempt": datetime.utcnow().isoformat(),
            "error": error
        }
        return current

    async def _mark_failed(self, issue_id: int, error: str):
        """
        Mark enrichment as failed.

        Args:
            issue_id: Database ID of the issue
            error: Error message
        """
        result = await self.db.execute(
            select(SentryIssue).where(SentryIssue.id == issue_id)
        )
        issue = result.scalar_one_or_none()
        if issue:
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {},
                        "performance_spans",
                        "failed",
                        error=error
                    )
                )
            )
            await self.db.commit()


async def get_performance_enrichment_service(
    db: AsyncSession
) -> PerformanceEnrichmentService:
    """
    Factory for performance enrichment service.

    Args:
        db: Database session

    Returns:
        PerformanceEnrichmentService instance
    """
    settings = get_settings()
    client = PerformanceClient(token=settings.get_sentry_token())
    return PerformanceEnrichmentService(db, client)
