"""
Release and commit enrichment service.

Fetches release health metrics and suspect commits from Sentry,
stores in knowledge base for issue correlation.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.releases import ReleaseClient, SentryRelease, SuspectCommit
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


class ReleaseEnrichmentService:
    """Service for enriching issues with release and commit data."""

    def __init__(self, db: AsyncSession, sentry_client: ReleaseClient):
        self.db = db
        self.client = sentry_client
        self.pii_scrubber = get_pii_scrubber()
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich a single issue with release context.

        Args:
            issue_id: Database ID of the issue

        Returns:
            Enrichment result with status and data
        """
        # Check feature flag
        if not self.settings.ENABLE_RELEASES:
            return {"status": "skipped", "reason": "feature disabled"}

        try:
            # Get issue from database
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
                logger.warning(f"Missing org/project for issue {issue_id}, skipping enrichment")
                return {"status": "skipped", "reason": "missing org/project"}

            # Fetch releases
            try:
                releases = await self.client.get_releases(org, project, per_page=10)
            except Exception as e:
                logger.error(f"Failed to fetch releases for {org}/{project}: {e}")
                releases = []

            # Fetch suspect commits for this issue
            try:
                suspect_commits = await self.client.get_suspect_commits(issue.sentry_issue_id)
            except Exception as e:
                logger.warning(f"Failed to fetch suspect commits for issue {issue.sentry_issue_id}: {e}")
                suspect_commits = []

            # Build release context
            release_context = self._build_release_context(releases, suspect_commits)

            # Scrub PII from context (especially commit author emails)
            release_context = self.pii_scrubber.scrub_dict(release_context)

            # Update issue with release context
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    release_context=release_context,
                    enrichment_status=self._update_enrichment_status(
                        issue.enrichment_status or {},
                        "releases",
                        "completed"
                    ),
                    last_enriched_at=datetime.utcnow()
                )
            )
            await self.db.commit()

            logger.info(f"Enriched issue {issue_id} with release context", extra={
                "issue_id": issue_id,
                "releases_count": len(releases),
                "suspects_count": len(suspect_commits)
            })

            return {
                "status": "success",
                "releases_count": len(releases),
                "suspects_count": len(suspect_commits)
            }

        except Exception as e:
            logger.error(f"Failed to enrich issue {issue_id}: {e}", exc_info=True)

            # Update status to failed
            try:
                await self.db.execute(
                    update(SentryIssue)
                    .where(SentryIssue.id == issue_id)
                    .values(
                        enrichment_status=self._update_enrichment_status(
                            {},
                            "releases",
                            "failed",
                            error=str(e)
                        )
                    )
                )
                await self.db.commit()
            except Exception as db_error:
                logger.error(f"Failed to update enrichment status: {db_error}")

            return {"status": "error", "reason": str(e)}

    def _build_release_context(
        self,
        releases: List[SentryRelease],
        suspects: List[SuspectCommit]
    ) -> Dict[str, Any]:
        """Build structured release context for storage."""
        return {
            "releases": [
                {
                    "version": r.version,
                    "date_created": r.date_created.isoformat() if r.date_created else None,
                    "crash_free_users": r.crash_free_users,
                    "crash_free_sessions": r.crash_free_sessions,
                    "total_sessions": r.total_sessions,
                    "health_score": self._compute_health_score(r)
                }
                for r in releases[:5]  # Store top 5 recent releases
            ],
            "suspect_commits": [
                {
                    "id": s.id,
                    "repository": s.repository,
                    "author_name": s.author.get("name") if s.author else None,
                    "message": s.message[:200] if s.message else None,  # Truncate
                    "timestamp": s.timestamp.isoformat() if s.timestamp else None,
                    "confidence_score": s.confidence_score
                }
                for s in suspects if s.confidence_score and s.confidence_score > 0.5
            ],
            "last_fetched": datetime.utcnow().isoformat()
        }

    def _compute_health_score(self, release: SentryRelease) -> float:
        """Compute overall health score (0.0 to 1.0)."""
        if release.crash_free_users is None or release.crash_free_sessions is None:
            return 0.5  # Unknown

        # Weighted average: users (60%) + sessions (40%)
        return (release.crash_free_users * 0.6 + release.crash_free_sessions * 0.4) / 100

    def _extract_org(self, issue: SentryIssue) -> Optional[str]:
        """Extract organization from issue."""
        # Try to get from context_tags first
        if issue.context_tags and "organization" in issue.context_tags:
            return issue.context_tags["organization"]

        # Fallback to config (for now, until we add org tracking to schema)
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

        # Fallback to config (for now, until we add project tracking to schema)
        project_from_config = getattr(self.settings, "SENTRY_PROJECT_SLUG", None)
        if project_from_config:
            return project_from_config

        # Try deprecated field
        return self.settings.PROJECT_SLUG or None

    def _update_enrichment_status(
        self,
        current_status: Dict[str, Any],
        source: str,
        status: str,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update enrichment status for a source."""
        current_status[source] = {
            "status": status,
            "last_attempt": datetime.utcnow().isoformat(),
            "error": error
        }
        return current_status


async def get_release_enrichment_service(
    db: AsyncSession
) -> ReleaseEnrichmentService:
    """Factory function for release enrichment service."""
    settings = get_settings()
    client = ReleaseClient(token=settings.get_sentry_token())
    return ReleaseEnrichmentService(db, client)
