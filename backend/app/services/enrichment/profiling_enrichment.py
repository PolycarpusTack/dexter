"""
Profiling hotspot enrichment service.

Fetches profiling data from Sentry and extracts performance hotspots,
storing function-level timing data for analysis and visualization.

IMPORTANT: All data is PII-scrubbed before storage (function names may contain sensitive info).
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.profiling import ProfilingClient, Profile, ProfileFrame
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


# Thresholds for hotspot detection
HOTSPOT_TIME_PERCENTAGE = 10.0  # Functions consuming >10% of total time
HOTSPOT_MIN_TIME_MS = 10.0  # Minimum 10ms to be considered
TOP_FUNCTIONS_COUNT = 10  # Top 10 slowest functions


class ProfilingEnrichmentService:
    """Service for enriching issues with profiling hotspot data."""

    def __init__(self, db: AsyncSession, sentry_client: ProfilingClient):
        """
        Initialize profiling enrichment service.

        Args:
            db: Database session
            sentry_client: Sentry profiling client
        """
        self.db = db
        self.client = sentry_client
        self.pii_scrubber = get_pii_scrubber()
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich issue with profiling hotspot data.

        Args:
            issue_id: Database ID of the issue to enrich

        Returns:
            Dict with enrichment status and metrics
        """
        if not self.settings.ENABLE_PROFILING:
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

            if not org:
                logger.warning(f"Missing org for issue {issue_id}, skipping profiling enrichment")
                return {"status": "skipped", "reason": "missing org"}

            # Fetch profiling data for this issue
            try:
                profiles = await self.client.get_profiles_for_issue(
                    issue.sentry_issue_id,
                    org_slug=org,
                    project=project,
                    limit=5  # Get top 5 profiles
                )
            except Exception as e:
                logger.error(f"Failed to fetch profiles for issue {issue.sentry_issue_id}: {e}")
                profiles = []

            if not profiles:
                logger.debug(f"No profiling data available for issue {issue_id}")
                return {"status": "skipped", "reason": "no profiling data"}

            # Process profiling data
            all_frames: List[ProfileFrame] = []
            total_profile_duration_ms = 0.0

            for profile in profiles:
                total_profile_duration_ms += profile.duration_ms

                # Fetch detailed function data
                try:
                    frames = await self.client.get_profile_functions(org, profile.profile_id)
                    all_frames.extend(frames)
                except Exception as e:
                    logger.warning(f"Failed to fetch functions for profile {profile.profile_id}: {e}")
                    continue

            # Detect hotspots
            hotspots = self._detect_hotspots(all_frames, total_profile_duration_ms)

            # Build flamegraph data
            flamegraph_data = self.client.build_flamegraph_data(all_frames)

            # Build profiling context
            profiling_data = self._build_profiling_data(
                hotspots,
                flamegraph_data,
                total_profile_duration_ms,
                len(profiles)
            )

            # Scrub PII from function names and file paths
            profiling_data = self.pii_scrubber.scrub_dict(profiling_data)

            # Update issue
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    profiling_data=profiling_data,
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {},
                        "profiling",
                        "completed"
                    ),
                    last_enriched_at=datetime.utcnow()
                )
            )
            await self.db.commit()

            logger.info(
                f"Enriched issue {issue_id} with profiling data",
                extra={
                    "issue_id": issue_id,
                    "profiles_count": len(profiles),
                    "hotspots_count": len(hotspots),
                    "total_frames": len(all_frames)
                }
            )

            return {
                "status": "success",
                "profiles_count": len(profiles),
                "hotspots_count": len(hotspots),
                "total_frames": len(all_frames)
            }

        except Exception as e:
            logger.error(
                f"Profiling enrichment failed for issue {issue_id}: {e}",
                exc_info=True
            )
            await self._mark_failed(issue_id, str(e))
            return {"status": "error", "reason": str(e)}

    def _detect_hotspots(
        self,
        frames: List[ProfileFrame],
        total_duration_ms: float
    ) -> List[Dict[str, Any]]:
        """
        Identify function hotspots (functions consuming >10% of total time).

        Args:
            frames: List of profiling frames
            total_duration_ms: Total profile duration in milliseconds

        Returns:
            List of hotspot dictionaries ranked by time consumption
        """
        if not frames or total_duration_ms == 0:
            return []

        # Extract top functions using client's hotspot extraction
        top_functions = self.client.extract_hotspots(
            frames,
            top_n=TOP_FUNCTIONS_COUNT,
            min_time_ms=HOTSPOT_MIN_TIME_MS
        )

        # Filter and annotate hotspots with percentage
        hotspots = []
        for func in top_functions:
            time_percentage = (func["self_time_ms"] / total_duration_ms) * 100

            # Only include functions consuming >10% of total time
            if time_percentage >= HOTSPOT_TIME_PERCENTAGE:
                func["time_percentage"] = round(time_percentage, 2)
                func["severity"] = self._compute_hotspot_severity(time_percentage)
                hotspots.append(func)

        # If no functions meet the 10% threshold, include top 3 anyway
        if not hotspots and top_functions:
            for func in top_functions[:3]:
                time_percentage = (func["self_time_ms"] / total_duration_ms) * 100
                func["time_percentage"] = round(time_percentage, 2)
                func["severity"] = self._compute_hotspot_severity(time_percentage)
                hotspots.append(func)

        return hotspots

    def _compute_hotspot_severity(self, time_percentage: float) -> str:
        """
        Compute severity level for hotspot based on time consumption.

        Args:
            time_percentage: Percentage of total time consumed

        Returns:
            Severity level: critical, high, medium, or low
        """
        if time_percentage >= 50:
            return "critical"
        elif time_percentage >= 30:
            return "high"
        elif time_percentage >= 15:
            return "medium"
        else:
            return "low"

    def _build_profiling_data(
        self,
        hotspots: List[Dict[str, Any]],
        flamegraph_data: Dict[str, Any],
        total_duration_ms: float,
        profiles_count: int
    ) -> Dict[str, Any]:
        """
        Build structured profiling data for storage.

        Args:
            hotspots: List of detected hotspot functions
            flamegraph_data: Flamegraph visualization data
            total_duration_ms: Total profile duration
            profiles_count: Number of profiles analyzed

        Returns:
            Structured profiling data dictionary
        """
        return {
            "hot_functions": hotspots,
            "hotspot_count": len(hotspots),
            "total_profile_duration_ms": round(total_duration_ms, 2),
            "profiles_analyzed": profiles_count,
            "flamegraph_data": flamegraph_data,
            "summary": {
                "has_critical_hotspots": any(h["severity"] == "critical" for h in hotspots),
                "has_high_hotspots": any(h["severity"] == "high" for h in hotspots),
                "top_function": hotspots[0]["function"] if hotspots else None,
                "top_function_time_pct": hotspots[0]["time_percentage"] if hotspots else 0,
            },
            "last_fetched": datetime.utcnow().isoformat()
        }

    def _extract_org(self, issue: SentryIssue) -> Optional[str]:
        """Extract organization from issue."""
        # Try to get from context_tags first
        if issue.context_tags and "organization" in issue.context_tags:
            return issue.context_tags["organization"]

        # Fallback to config
        org_from_config = getattr(self.settings, "SENTRY_ORGANIZATION_SLUG", None)
        if org_from_config:
            return org_from_config

        # Try deprecated fields
        return self.settings.SENTRY_ORG or self.settings.ORGANIZATION_SLUG or None

    def _extract_project(self, issue: SentryIssue) -> Optional[str]:
        """Extract project from issue."""
        # Try to get from context_tags first
        if issue.context_tags and "project" in issue.context_tags:
            return issue.context_tags["project"]

        # Fallback to config
        project_from_config = getattr(self.settings, "SENTRY_PROJECT_SLUG", None)
        if project_from_config:
            return project_from_config

        # Try deprecated field
        return self.settings.PROJECT_SLUG or None

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
                        "profiling",
                        "failed",
                        error=error
                    )
                )
            )
            await self.db.commit()


async def get_profiling_enrichment_service(
    db: AsyncSession
) -> ProfilingEnrichmentService:
    """
    Factory for profiling enrichment service.

    Args:
        db: Database session

    Returns:
        ProfilingEnrichmentService instance
    """
    settings = get_settings()
    client = ProfilingClient(token=settings.get_sentry_token())
    return ProfilingEnrichmentService(db, client)
