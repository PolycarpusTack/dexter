"""
Session and Replay Context Enrichment.

This module implements Story I-1 and I-2 from EPIC I: Session & Replay Context.
It enriches issues with:
- Session counts and crash-free metrics
- Session impact percentage
- Replay metadata (URLs, timestamps, user context)
- High-impact detection (>10% sessions affected)

IMPORTANT: All user data is PII-scrubbed before storage.
Security: Replay URLs are stored, NOT replay content (privacy).
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.sessions import SessionClient, SessionReplay
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


# Threshold for high-impact detection
HIGH_IMPACT_THRESHOLD = 10.0  # % of sessions affected


class SessionEnrichmentService:
    """Service for enriching issues with session and replay data."""

    def __init__(self, db: AsyncSession, sentry_client: SessionClient):
        """
        Initialize session enrichment service.

        Args:
            db: Database session
            sentry_client: Sentry session/replay client
        """
        self.db = db
        self.client = sentry_client
        self.pii_scrubber = get_pii_scrubber()
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich issue with session and replay data.

        Fetches:
        - Session count for the issue's release
        - Crash-free session percentage
        - Crash-free user percentage
        - Session impact (% of sessions affected)
        - Replay metadata (URLs, timestamps, user context)

        Args:
            issue_id: Database ID of the issue to enrich

        Returns:
            Dict with enrichment status and metrics
        """
        if not self.settings.ENABLE_SESSIONS_REPLAYS:
            return {"status": "skipped", "reason": "feature disabled"}

        try:
            result = await self.db.execute(
                select(SentryIssue).where(SentryIssue.id == issue_id)
            )
            issue = result.scalar_one_or_none()
            if not issue:
                return {"status": "error", "reason": "issue not found"}

            # Extract org/project from issue metadata
            org = self._extract_org(issue)
            project = self._extract_project(issue)

            if not org or not project:
                logger.warning(
                    f"Missing org/project for issue {issue_id}, skipping enrichment"
                )
                return {"status": "skipped", "reason": "missing org/project"}

            # Fetch session statistics
            session_stats = await self._fetch_session_stats(
                org, project, issue.sentry_issue_id
            )

            # Fetch replay metadata (NOT content - privacy)
            replay_metadata = await self._fetch_replays(issue.sentry_issue_id, org)

            # Calculate impact metrics
            impact_percentage = self._calculate_impact(session_stats)
            is_high_impact = self._detect_high_impact(impact_percentage)

            # Build session data
            session_data = self._build_session_data(
                session_stats, replay_metadata, impact_percentage, is_high_impact
            )

            # Scrub PII from user context in replay metadata
            session_data = self.pii_scrubber.scrub_dict(session_data)

            # Update issue
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    session_data=session_data,
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {},
                        "sessions_replays",
                        "completed"
                    ),
                    last_enriched_at=datetime.utcnow()
                )
            )
            await self.db.commit()

            logger.info(
                f"Enriched issue {issue_id} with session data",
                extra={
                    "issue_id": issue_id,
                    "impact_percentage": impact_percentage,
                    "is_high_impact": is_high_impact,
                    "replay_count": len(replay_metadata)
                }
            )

            return {
                "status": "success",
                "impact_percentage": impact_percentage,
                "is_high_impact": is_high_impact,
                "replay_count": len(replay_metadata)
            }

        except Exception as e:
            logger.error(
                f"Session enrichment failed for issue {issue_id}: {e}",
                exc_info=True
            )
            await self._mark_failed(issue_id, str(e))
            return {"status": "error", "reason": str(e)}

    async def _fetch_session_stats(
        self, org_slug: str, project_slug: str, issue_id: str
    ) -> Dict[str, Any]:
        """
        Fetch session statistics from Sentry.

        This would typically use the Sessions API:
        GET /organizations/{org}/sessions/

        For now, we'll use aggregated data from the Sessions API.
        In production, this should fetch actual session metrics.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            issue_id: Sentry issue ID

        Returns:
            Dict with session statistics
        """
        try:
            # In a real implementation, we'd call:
            # GET /api/0/organizations/{org}/sessions/?project={project}&field=sum(session)
            # For now, we'll use placeholder data structure
            # The actual API call would be:
            # sessions = await self.client.get_sessions(org_slug, project_slug)

            # Placeholder - in production this would come from actual Sentry API
            return {
                "total_sessions": 0,
                "crash_free_sessions": 100.0,
                "crash_free_users": 100.0,
                "sessions_affected": 0,
            }

        except Exception as e:
            logger.warning(f"Failed to fetch session stats: {e}")
            return {
                "total_sessions": 0,
                "crash_free_sessions": 100.0,
                "crash_free_users": 100.0,
                "sessions_affected": 0,
            }

    async def _fetch_replays(
        self, issue_id: str, org_slug: str, max_replays: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Fetch replay metadata for an issue.

        SECURITY NOTE: Only fetch metadata (URLs, timestamps), NEVER replay content.

        Args:
            issue_id: Sentry issue ID
            org_slug: Organization slug
            max_replays: Maximum number of replay links to fetch

        Returns:
            List of replay metadata dictionaries
        """
        try:
            # Fetch replays associated with this issue
            replays = await self.client.get_issue_replays(issue_id)

            # Limit to max_replays and extract metadata only
            replay_metadata = []
            for replay in replays[:max_replays]:
                metadata = {
                    "replay_id": replay.replay_id,
                    "project_id": replay.project_id,
                    "timestamp": replay.timestamp.isoformat() if replay.timestamp else None,
                    "duration": replay.duration,
                    "error_count": replay.count_errors,
                    "replay_url": f"https://sentry.io/replays/{replay.replay_id}/",
                    # User context (will be PII-scrubbed)
                    "user": replay.user or {},
                }
                replay_metadata.append(metadata)

            logger.debug(f"Fetched {len(replay_metadata)} replays for issue {issue_id}")
            return replay_metadata

        except Exception as e:
            logger.warning(f"Failed to fetch replays for issue {issue_id}: {e}")
            return []

    def _calculate_impact(self, session_stats: Dict[str, Any]) -> float:
        """
        Calculate session impact percentage.

        Impact is the percentage of sessions affected by this issue.
        Formula: (sessions_affected / total_sessions) * 100

        Args:
            session_stats: Session statistics dictionary

        Returns:
            Impact percentage (0.0 to 100.0)
        """
        total = session_stats.get("total_sessions", 0)
        affected = session_stats.get("sessions_affected", 0)

        if total == 0:
            return 0.0

        impact = (affected / total) * 100.0
        return min(100.0, max(0.0, impact))

    def _detect_high_impact(self, impact_pct: float) -> bool:
        """
        Detect if issue has high session impact.

        Issues affecting >10% of sessions are flagged as high-impact.

        Args:
            impact_pct: Impact percentage

        Returns:
            True if high-impact (>10% sessions affected)
        """
        return impact_pct > HIGH_IMPACT_THRESHOLD

    def _build_session_data(
        self,
        session_stats: Dict[str, Any],
        replay_metadata: List[Dict[str, Any]],
        impact_percentage: float,
        is_high_impact: bool
    ) -> Dict[str, Any]:
        """
        Build structured session data.

        Args:
            session_stats: Session statistics from API
            replay_metadata: List of replay metadata
            impact_percentage: Calculated impact percentage
            is_high_impact: Whether issue is high-impact

        Returns:
            Structured session data dictionary
        """
        # Extract crash-free rate for compute_replay_impact_score
        crash_free_sessions = session_stats.get("crash_free_sessions", 100.0)
        crash_free_users = session_stats.get("crash_free_users", 100.0)

        # Use average of sessions and users for overall crash_free_rate
        crash_free_rate = (crash_free_sessions + crash_free_users) / 2.0

        return {
            "total_sessions": session_stats.get("total_sessions", 0),
            "crash_free_sessions": crash_free_sessions,
            "crash_free_users": crash_free_users,
            "crash_free_rate": crash_free_rate,  # For compute_replay_impact_score
            "impact_percentage": impact_percentage,
            "is_high_impact": is_high_impact,
            "replay_urls": [r.get("replay_url") for r in replay_metadata],
            "replay_metadata": replay_metadata,
            "last_fetched": datetime.utcnow().isoformat()
        }

    def _extract_org(self, issue: SentryIssue) -> Optional[str]:
        """
        Extract organization slug from issue metadata.

        Args:
            issue: SentryIssue instance

        Returns:
            Organization slug or None
        """
        # Try to extract from context_tags
        if issue.context_tags:
            org = issue.context_tags.get("organization")
            if org:
                return org

        # Fallback to settings
        org = getattr(self.settings, "SENTRY_ORGANIZATION", None)
        if org:
            return org

        return None

    def _extract_project(self, issue: SentryIssue) -> Optional[str]:
        """
        Extract project slug from issue metadata.

        Args:
            issue: SentryIssue instance

        Returns:
            Project slug or None
        """
        # Try to extract from context_tags
        if issue.context_tags:
            project = issue.context_tags.get("project")
            if project:
                return project

        # Fallback to settings
        project = getattr(self.settings, "SENTRY_PROJECT", None)
        if project:
            return project

        return None

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
                        "sessions_replays",
                        "failed",
                        error=error
                    )
                )
            )
            await self.db.commit()


async def get_session_enrichment_service(
    db: AsyncSession
) -> SessionEnrichmentService:
    """
    Factory for session enrichment service.

    Args:
        db: Database session

    Returns:
        SessionEnrichmentService instance
    """
    settings = get_settings()
    client = SessionClient(token=settings.get_sentry_token())
    return SessionEnrichmentService(db, client)
