"""
Tag distribution and environment clustering enrichment.

Implements EPIC G: Tag Distributions & Environment Clustering
- Fetches tag distributions from Sentry
- Detects environment-specific breakage (>80% in one environment)
- Analyzes clustering by environment/device/browser
- Computes tag overlap scores for ranking
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from collections import defaultdict
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.tags import TagClient, TagDistribution
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


class TagEnrichmentService:
    """
    Service for enriching issues with tag distributions.

    This service:
    1. Fetches tag distributions from Sentry API
    2. Analyzes environment clustering patterns
    3. Detects environment-specific breakage
    4. Scrubs PII from tag values (user agents, device IDs)
    5. Stores enriched data in tag_distributions JSONB column
    """

    def __init__(self, db: AsyncSession, sentry_client: TagClient):
        """
        Initialize tag enrichment service.

        Args:
            db: Database session
            sentry_client: TagClient for fetching tag data
        """
        self.db = db
        self.client = sentry_client
        self.pii_scrubber = get_pii_scrubber()
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich issue with tag distributions.

        Args:
            issue_id: Database ID of the issue

        Returns:
            Status dict with enrichment results
        """
        if not self.settings.ENABLE_TAG_DISTRIBUTIONS:
            return {"status": "skipped", "reason": "feature disabled"}

        try:
            # Fetch issue from database
            result = await self.db.execute(
                select(SentryIssue).where(SentryIssue.id == issue_id)
            )
            issue = result.scalar_one_or_none()
            if not issue:
                return {"status": "error", "reason": "issue not found"}

            # Fetch tag distributions from Sentry
            tag_data = await self.client.get_tag_distributions(issue.sentry_issue_id)

            # Analyze environment clustering
            env_analysis = self._analyze_environment_clustering(tag_data)

            # Detect environment-specific breakage
            breakage_flags = self._detect_env_specific_breakage(tag_data)

            # Build tag distribution data
            tag_distributions = self._build_tag_distributions(
                tag_data, env_analysis, breakage_flags
            )

            # Scrub PII (user agents, device IDs, etc.)
            tag_distributions = self.pii_scrubber.scrub_dict(tag_distributions)

            # Update issue
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    tag_distributions=tag_distributions,
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {},
                        "tag_distributions",
                        "completed"
                    ),
                    last_enriched_at=datetime.utcnow()
                )
            )
            await self.db.commit()

            logger.info(
                f"Enriched issue {issue_id} with tag distributions",
                extra={
                    "issue_id": issue_id,
                    "unique_tags": len(tag_data),
                    "env_specific": breakage_flags.get("is_env_specific", False)
                }
            )

            return {
                "status": "success",
                "tags_count": len(tag_data),
                "env_specific": breakage_flags.get("is_env_specific", False)
            }

        except Exception as e:
            logger.error(f"Tag enrichment failed for issue {issue_id}: {e}")
            await self._mark_failed(issue_id, str(e))
            return {"status": "error", "reason": str(e)}

    def _analyze_environment_clustering(
        self, tag_data: List[TagDistribution]
    ) -> Dict[str, Any]:
        """
        Analyze how issue clusters by environment.

        Extracts dominant values for:
        - Environment (production, staging, etc.)
        - Device/Device Family
        - Browser/Browser Name

        Args:
            tag_data: List of tag distributions

        Returns:
            Environment clustering analysis
        """
        env_clusters = defaultdict(int)
        device_clusters = defaultdict(int)
        browser_clusters = defaultdict(int)

        for tag_dist in tag_data:
            if tag_dist.tag_key == "environment":
                for value in tag_dist.top_values:
                    env_clusters[value.value] = value.count
            elif tag_dist.tag_key in ["device", "device.family"]:
                for value in tag_dist.top_values:
                    device_clusters[value.value] = value.count
            elif tag_dist.tag_key in ["browser", "browser.name"]:
                for value in tag_dist.top_values:
                    browser_clusters[value.value] = value.count

        return {
            "environments": dict(env_clusters),
            "devices": dict(device_clusters),
            "browsers": dict(browser_clusters),
            "dominant_environment": max(env_clusters.items(), key=lambda x: x[1])[0]
                if env_clusters else None,
            "dominant_device": max(device_clusters.items(), key=lambda x: x[1])[0]
                if device_clusters else None,
            "dominant_browser": max(browser_clusters.items(), key=lambda x: x[1])[0]
                if browser_clusters else None
        }

    def _detect_env_specific_breakage(
        self, tag_data: List[TagDistribution]
    ) -> Dict[str, Any]:
        """
        Detect if issue is specific to certain environments.

        Environment-specific breakage is flagged when >80% of occurrences
        are in a single environment.

        Args:
            tag_data: List of tag distributions

        Returns:
            Breakage flags with severity
        """
        env_tag = next((t for t in tag_data if t.tag_key == "environment"), None)

        if not env_tag or not env_tag.top_values:
            return {"is_env_specific": False}

        total_count = sum(v.count for v in env_tag.top_values)

        if not total_count:
            return {"is_env_specific": False}

        # Check if >80% of occurrences are in a single environment
        for value in env_tag.top_values:
            percentage = (value.count / total_count) * 100
            if percentage > 80:
                return {
                    "is_env_specific": True,
                    "specific_environment": value.value,
                    "concentration_percentage": percentage,
                    "severity": "high" if percentage > 95 else "medium"
                }

        return {"is_env_specific": False}

    def _build_tag_distributions(
        self,
        tag_data: List[TagDistribution],
        env_analysis: Dict[str, Any],
        breakage: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Build structured tag distribution data for storage.

        Args:
            tag_data: Raw tag distributions from Sentry
            env_analysis: Environment clustering analysis
            breakage: Breakage detection flags

        Returns:
            Structured tag distribution dict
        """
        return {
            "top_tags": [
                {
                    "tag": tag.tag_key,
                    "unique_values": tag.unique_count,
                    "top_values": [
                        {"value": v.value, "count": v.count}
                        for v in tag.top_values[:10]  # Top 10 values
                    ]
                }
                for tag in tag_data[:20]  # Top 20 tags
            ],
            "environment_analysis": env_analysis,
            "breakage_flags": breakage,
            "last_fetched": datetime.utcnow().isoformat()
        }

    def _update_status(
        self, current: Dict, source: str, status: str, error: Optional[str] = None
    ) -> Dict:
        """Update enrichment status for a source."""
        current[source] = {
            "status": status,
            "last_attempt": datetime.utcnow().isoformat(),
            "error": error
        }
        return current

    async def _mark_failed(self, issue_id: int, error: str):
        """Mark enrichment as failed in database."""
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
                        "tag_distributions",
                        "failed",
                        error=error
                    )
                )
            )
            await self.db.commit()


async def get_tag_enrichment_service(
    db: AsyncSession
) -> TagEnrichmentService:
    """
    Factory for tag enrichment service.

    Args:
        db: Database session

    Returns:
        TagEnrichmentService instance
    """
    settings = get_settings()
    client = TagClient(token=settings.get_sentry_token())
    return TagEnrichmentService(db, client)
