"""
Breadcrumbs Timeline Enrichment Service.

This module implements Story K-1 and K-2 from EPIC K: Breadcrumbs Timeline.
It enriches issues with:
- Chronological timeline of user actions and system events
- Breadcrumb categorization (navigation, user, http, console, system)
- Critical path detection (5-10 most relevant breadcrumbs before error)
- Navigation flow reconstruction (user's page journey)

IMPORTANT: All user data is PII-scrubbed before storage.
Security: URLs, form data, and console messages are sanitized.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.breadcrumbs import BreadcrumbClient, Breadcrumb
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


# Breadcrumb type mapping
BREADCRUMB_CATEGORIES = {
    "navigation": ["navigation", "route"],
    "user": ["ui", "user", "click", "input"],
    "http": ["http", "xhr", "fetch", "request"],
    "console": ["console", "error", "warning", "log"],
    "system": ["default", "transaction", "lifecycle", "state"],
}

# Maximum number of breadcrumbs to store
MAX_BREADCRUMBS = 50

# Critical path configuration
CRITICAL_PATH_SIZE = 10  # Number of breadcrumbs to include in critical path
CRITICAL_PATH_WINDOW_MINUTES = 5  # Only consider breadcrumbs in last 5 minutes


class BreadcrumbsEnrichmentService:
    """Service for enriching issues with breadcrumb timeline data."""

    def __init__(self, db: AsyncSession, sentry_client: BreadcrumbClient):
        """
        Initialize breadcrumbs enrichment service.

        Args:
            db: Database session
            sentry_client: Sentry breadcrumbs client
        """
        self.db = db
        self.client = sentry_client
        self.pii_scrubber = get_pii_scrubber()
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich issue with breadcrumbs timeline.

        Fetches:
        - Timeline: chronological list of breadcrumbs
        - Categories: breadcrumbs grouped by type
        - Critical path: 5-10 most relevant breadcrumbs before error
        - Navigation flow: user's page journey
        - Summary: counts and statistics

        Args:
            issue_id: Database ID of the issue to enrich

        Returns:
            Dict with enrichment status and metrics
        """
        if not self.settings.ENABLE_BREADCRUMBS:
            return {"status": "skipped", "reason": "feature disabled"}

        try:
            result = await self.db.execute(
                select(SentryIssue).where(SentryIssue.id == issue_id)
            )
            issue = result.scalar_one_or_none()
            if not issue:
                return {"status": "error", "reason": "issue not found"}

            # Fetch breadcrumbs from Sentry
            breadcrumbs_list = await self._fetch_breadcrumbs(issue.sentry_issue_id)

            if not breadcrumbs_list:
                logger.info(f"No breadcrumbs found for issue {issue_id}")
                return {"status": "skipped", "reason": "no breadcrumbs available"}

            # Limit to most recent breadcrumbs
            if len(breadcrumbs_list) > MAX_BREADCRUMBS:
                breadcrumbs_list = breadcrumbs_list[-MAX_BREADCRUMBS:]

            # Build timeline (chronological order)
            timeline = self._build_timeline(breadcrumbs_list)

            # Categorize breadcrumbs
            categories = self._categorize_breadcrumbs(breadcrumbs_list)

            # Detect critical path (most relevant breadcrumbs before error)
            critical_path = self._detect_critical_path(breadcrumbs_list)

            # Extract navigation flow
            navigation_flow = self._extract_navigation_flow(breadcrumbs_list)

            # Build summary statistics
            summary = self._build_summary(breadcrumbs_list, categories)

            # Build breadcrumbs data structure
            breadcrumbs_data = {
                "timeline": timeline,
                "categories": categories,
                "critical_path": critical_path,
                "navigation_flow": navigation_flow,
                "summary": summary,
                "last_fetched": datetime.now(timezone.utc).isoformat()
            }

            # Scrub PII from breadcrumbs data
            breadcrumbs_data = self.pii_scrubber.scrub_dict(breadcrumbs_data)

            # Update issue
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    breadcrumbs=breadcrumbs_data,
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {},
                        "breadcrumbs",
                        "completed"
                    ),
                    last_enriched_at=datetime.now(timezone.utc)
                )
            )
            await self.db.commit()

            logger.info(
                f"Enriched issue {issue_id} with breadcrumbs",
                extra={
                    "issue_id": issue_id,
                    "total_breadcrumbs": summary["total_breadcrumbs"],
                    "critical_path_size": len(critical_path),
                    "navigation_steps": len(navigation_flow)
                }
            )

            return {
                "status": "success",
                "total_breadcrumbs": summary["total_breadcrumbs"],
                "critical_path_size": len(critical_path),
                "navigation_steps": len(navigation_flow)
            }

        except Exception as e:
            logger.error(
                f"Breadcrumbs enrichment failed for issue {issue_id}: {e}",
                exc_info=True
            )
            await self._mark_failed(issue_id, str(e))
            return {"status": "error", "reason": str(e)}

    async def _fetch_breadcrumbs(self, sentry_issue_id: str) -> List[Breadcrumb]:
        """
        Fetch breadcrumbs from Sentry API.

        Args:
            sentry_issue_id: Sentry issue ID

        Returns:
            List of breadcrumbs
        """
        try:
            breadcrumbs = await self.client.get_breadcrumbs_from_issue(sentry_issue_id)
            logger.debug(f"Fetched {len(breadcrumbs)} breadcrumbs for issue {sentry_issue_id}")
            return breadcrumbs
        except Exception as e:
            logger.warning(f"Failed to fetch breadcrumbs for issue {sentry_issue_id}: {e}")
            return []

    def _build_timeline(self, breadcrumbs: List[Breadcrumb]) -> List[Dict[str, Any]]:
        """
        Build chronological timeline from breadcrumbs.

        Timeline is reverse-chronological (newest first) for UI display.

        Args:
            breadcrumbs: List of breadcrumbs

        Returns:
            List of breadcrumb dictionaries in reverse chronological order
        """
        timeline = []

        for crumb in breadcrumbs:
            timeline.append({
                "timestamp": crumb.timestamp.isoformat() if crumb.timestamp else None,
                "type": crumb.type,
                "category": crumb.category,
                "message": crumb.message,
                "level": crumb.level,
                "data": crumb.data
            })

        # Sort by timestamp descending (newest first)
        timeline.sort(
            key=lambda x: x["timestamp"] if x["timestamp"] else "",
            reverse=True
        )

        return timeline

    def _categorize_breadcrumbs(
        self, breadcrumbs: List[Breadcrumb]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Categorize breadcrumbs by type.

        Categories:
        - navigation: Page views, route changes
        - user: User actions (clicks, form submissions)
        - http: Network requests
        - console: Console logs, errors, warnings
        - system: Lifecycle events, state changes

        Args:
            breadcrumbs: List of breadcrumbs

        Returns:
            Dict mapping category to list of breadcrumbs
        """
        categories = {
            "navigation": [],
            "user": [],
            "http": [],
            "console": [],
            "system": []
        }

        for crumb in breadcrumbs:
            breadcrumb_type = crumb.type.lower() if crumb.type else "default"

            # Determine category
            category = "system"  # Default
            for cat, types in BREADCRUMB_CATEGORIES.items():
                if breadcrumb_type in types:
                    category = cat
                    break

            # Add to category
            categories[category].append({
                "timestamp": crumb.timestamp.isoformat() if crumb.timestamp else None,
                "type": crumb.type,
                "category": crumb.category,
                "message": crumb.message,
                "level": crumb.level,
                "data": crumb.data
            })

        # Sort each category by timestamp descending
        for category in categories:
            categories[category].sort(
                key=lambda x: x["timestamp"] if x["timestamp"] else "",
                reverse=True
            )

        return categories

    def _detect_critical_path(self, breadcrumbs: List[Breadcrumb]) -> List[Dict[str, Any]]:
        """
        Detect critical path: 5-10 most relevant breadcrumbs before error.

        Relevance scoring considers:
        - Time proximity to error (closer = higher)
        - Navigation events (page changes = important)
        - Network errors (failed requests = important)
        - Console errors (warnings before crash = important)

        Algorithm:
        1. Filter to breadcrumbs in last 5 minutes before error
        2. Score each breadcrumb by relevance
        3. Sort by score descending
        4. Return top 5-10 breadcrumbs

        Args:
            breadcrumbs: List of breadcrumbs (chronologically ordered)

        Returns:
            List of critical breadcrumbs with highest relevance scores
        """
        if not breadcrumbs:
            return []

        # Find the latest breadcrumb timestamp (assumed to be close to error time)
        error_time = max(
            (crumb.timestamp for crumb in breadcrumbs if crumb.timestamp),
            default=datetime.now(timezone.utc)
        )

        # Filter to recent breadcrumbs (last 5 minutes before error)
        cutoff_time = error_time - timedelta(minutes=CRITICAL_PATH_WINDOW_MINUTES)
        recent_breadcrumbs = [
            crumb for crumb in breadcrumbs
            if crumb.timestamp and crumb.timestamp >= cutoff_time
        ]

        if not recent_breadcrumbs:
            # Fallback: use last 10 breadcrumbs if no timestamps
            recent_breadcrumbs = breadcrumbs[-10:]

        # Score each breadcrumb
        scored_breadcrumbs = [
            (crumb, self._score_breadcrumb_relevance(crumb, error_time))
            for crumb in recent_breadcrumbs
        ]

        # Sort by score descending
        scored_breadcrumbs.sort(key=lambda x: x[1], reverse=True)

        # Return top 5-10 breadcrumbs
        critical_count = min(CRITICAL_PATH_SIZE, len(scored_breadcrumbs))
        critical_breadcrumbs = scored_breadcrumbs[:critical_count]

        # Convert to dictionaries with scores
        critical_path = []
        for crumb, score in critical_breadcrumbs:
            critical_path.append({
                "timestamp": crumb.timestamp.isoformat() if crumb.timestamp else None,
                "type": crumb.type,
                "category": crumb.category,
                "message": crumb.message,
                "level": crumb.level,
                "data": crumb.data,
                "relevance_score": round(score, 2)
            })

        return critical_path

    def _score_breadcrumb_relevance(
        self, breadcrumb: Breadcrumb, error_time: datetime
    ) -> float:
        """
        Score breadcrumb relevance for critical path detection.

        Scoring factors:
        - Time proximity to error: 0-40 points (closer = higher)
        - Navigation events: +30 points
        - Network errors: +25 points
        - Console errors: +20 points
        - User actions: +15 points
        - HTTP requests: +10 points

        Args:
            breadcrumb: Breadcrumb to score
            error_time: Time of error

        Returns:
            Relevance score (0-100)
        """
        score = 0.0

        # 1. Time proximity (0-40 points)
        if breadcrumb.timestamp:
            time_diff_seconds = (error_time - breadcrumb.timestamp).total_seconds()
            # Closer breadcrumbs get higher scores
            # Max 40 points for breadcrumbs within 30 seconds
            time_score = max(0, 40 - (time_diff_seconds / 30) * 40)
            score += min(40, time_score)

        # 2. Type-based scoring
        breadcrumb_type = breadcrumb.type.lower() if breadcrumb.type else ""

        # Navigation events are crucial
        if breadcrumb_type in ["navigation", "route"]:
            score += 30

        # Network errors are important
        if breadcrumb_type == "http":
            # Check if it's an error
            status_code = None
            if breadcrumb.data:
                status_code = breadcrumb.data.get("status_code")

            if status_code and status_code >= 400:
                score += 25  # Failed request
            else:
                score += 10  # Normal request

        # Console errors and warnings
        if breadcrumb_type == "console":
            if breadcrumb.level in ["error", "critical"]:
                score += 20
            elif breadcrumb.level == "warning":
                score += 15

        # User actions
        if breadcrumb_type in ["ui", "user", "click", "input"]:
            score += 15

        return score

    def _extract_navigation_flow(self, breadcrumbs: List[Breadcrumb]) -> List[str]:
        """
        Extract navigation flow: user's page journey.

        Reconstructs the sequence of pages/routes visited by the user.

        Args:
            breadcrumbs: List of breadcrumbs

        Returns:
            List of page paths in chronological order
        """
        navigation_flow = []

        # Filter navigation breadcrumbs
        nav_breadcrumbs = [
            crumb for crumb in breadcrumbs
            if crumb.type and crumb.type.lower() in ["navigation", "route"]
        ]

        # Sort by timestamp ascending (chronological order)
        nav_breadcrumbs.sort(
            key=lambda x: x.timestamp if x.timestamp else datetime.min.replace(tzinfo=timezone.utc)
        )

        # Extract page paths
        for crumb in nav_breadcrumbs:
            # Try to extract path from data first, then fallback to message
            path = None

            # Prefer data["to"] and data["url"] over message
            if crumb.data and "to" in crumb.data:
                path = crumb.data["to"]
            elif crumb.data and "url" in crumb.data:
                path = crumb.data["url"]
            elif crumb.message:
                path = crumb.message

            if path:
                # Remove duplicate consecutive paths
                if not navigation_flow or navigation_flow[-1] != path:
                    navigation_flow.append(path)

        return navigation_flow

    def _build_summary(
        self, breadcrumbs: List[Breadcrumb], categories: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, int]:
        """
        Build summary statistics for breadcrumbs.

        Args:
            breadcrumbs: List of breadcrumbs
            categories: Categorized breadcrumbs

        Returns:
            Summary dictionary with counts
        """
        return {
            "total_breadcrumbs": len(breadcrumbs),
            "navigation_count": len(categories["navigation"]),
            "user_count": len(categories["user"]),
            "http_count": len(categories["http"]),
            "console_count": len(categories["console"]),
            "system_count": len(categories["system"]),
            "error_count": sum(
                1 for crumb in breadcrumbs
                if crumb.level in ["error", "critical"]
            ),
            "network_count": len(categories["http"])
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
            "last_attempt": datetime.now(timezone.utc).isoformat(),
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
                        "breadcrumbs",
                        "failed",
                        error=error
                    )
                )
            )
            await self.db.commit()


async def get_breadcrumbs_enrichment_service(
    db: AsyncSession
) -> BreadcrumbsEnrichmentService:
    """
    Factory for breadcrumbs enrichment service.

    Args:
        db: Database session

    Returns:
        BreadcrumbsEnrichmentService instance
    """
    settings = get_settings()
    client = BreadcrumbClient(token=settings.get_sentry_token())
    return BreadcrumbsEnrichmentService(db, client)
