"""
Attachments Metadata Enrichment.

This module implements Story L-1 and L-2 from EPIC L: Attachments Metadata.
It enriches issues with:
- Attachment metadata (ID, name, size, content type)
- Attachment categorization (screenshots, logs, minidumps, source maps)
- Important attachment detection (high debugging value)
- URL expiration tracking

CRITICAL PRIVACY NOTE: This service ONLY stores metadata. It NEVER downloads
or stores attachment content. Signed URLs are stored for reference only.

Security: All URLs are time-limited by Sentry (default: 7 days).
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.attachments import AttachmentClient, Attachment

logger = logging.getLogger(__name__)


# Attachment category definitions
CATEGORY_SCREENSHOTS = "screenshots"
CATEGORY_LOGS = "logs"
CATEGORY_MINIDUMPS = "minidumps"
CATEGORY_SOURCE_MAPS = "source_maps"
CATEGORY_OTHER = "other"

# Content type mappings
CONTENT_TYPE_MAPPINGS = {
    # Screenshots (visual debugging context)
    "image/png": CATEGORY_SCREENSHOTS,
    "image/jpeg": CATEGORY_SCREENSHOTS,
    "image/jpg": CATEGORY_SCREENSHOTS,
    "image/gif": CATEGORY_SCREENSHOTS,
    "image/webp": CATEGORY_SCREENSHOTS,

    # Logs (textual debugging output)
    "text/plain": CATEGORY_LOGS,
    "text/log": CATEGORY_LOGS,
    "application/x-log": CATEGORY_LOGS,
    "text/x-log": CATEGORY_LOGS,

    # Minidumps (crash dumps)
    "application/x-dmp": CATEGORY_MINIDUMPS,
    "application/octet-stream": CATEGORY_MINIDUMPS,  # Could be minidump

    # Source maps (debugging JS)
    "application/json": CATEGORY_SOURCE_MAPS,  # *.map files
}

# Important attachment types (high debugging value)
IMPORTANT_CATEGORIES = {CATEGORY_SCREENSHOTS, CATEGORY_MINIDUMPS}

# Maximum attachment size to track (100MB - Sentry limit)
MAX_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024

# URL expiration period (Sentry default: 7 days)
URL_EXPIRATION_DAYS = 7


class AttachmentsEnrichmentService:
    """Service for enriching issues with attachment metadata."""

    def __init__(self, db: AsyncSession, sentry_client: AttachmentClient):
        """
        Initialize attachments enrichment service.

        Args:
            db: Database session
            sentry_client: Sentry attachments client
        """
        self.db = db
        self.client = sentry_client
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich issue with attachment metadata.

        CRITICAL: This method ONLY fetches metadata. It NEVER downloads
        or stores attachment content.

        Fetches:
        - Attachment ID, name, size, content type
        - Signed download URLs (time-limited)
        - Upload timestamps
        - Categorization by type
        - Important attachment detection

        Args:
            issue_id: Database ID of the issue to enrich

        Returns:
            Dict with enrichment status and metrics
        """
        if not self.settings.ENABLE_ATTACHMENTS:
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

            # Fetch attachment metadata from Sentry
            attachments_raw = await self._fetch_attachments(
                org, project, issue.sentry_issue_id
            )

            # Build structured attachment metadata
            attachments_metadata = self._build_attachments_metadata(attachments_raw)

            # Categorize attachments by type
            categories = self._categorize_attachments(attachments_metadata)

            # Generate summary statistics
            summary = self._generate_summary(attachments_metadata, categories)

            # Detect important attachments (screenshots, minidumps)
            important_attachments = self._detect_important_attachments(
                attachments_metadata
            )

            # Build final data structure
            attachments_data = {
                "attachments": attachments_metadata,
                "categories": categories,
                "summary": summary,
                "important_attachments": important_attachments,
                "last_fetched": datetime.now(timezone.utc).isoformat()
            }

            # Update issue
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    attachments_meta=attachments_data,
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {},
                        "attachments",
                        "completed"
                    ),
                    last_enriched_at=datetime.now(timezone.utc)
                )
            )
            await self.db.commit()

            logger.info(
                f"Enriched issue {issue_id} with attachment metadata",
                extra={
                    "issue_id": issue_id,
                    "total_attachments": summary["total_count"],
                    "important_count": summary["important_count"],
                    "has_screenshots": summary["has_screenshots"],
                    "has_minidumps": summary["has_minidumps"]
                }
            )

            return {
                "status": "success",
                "total_attachments": summary["total_count"],
                "important_count": summary["important_count"],
                "categories": list(categories.keys())
            }

        except Exception as e:
            logger.error(
                f"Attachments enrichment failed for issue {issue_id}: {e}",
                exc_info=True
            )
            await self._mark_failed(issue_id, str(e))
            return {"status": "error", "reason": str(e)}

    async def _fetch_attachments(
        self, org_slug: str, project_slug: str, issue_id: str
    ) -> List[Attachment]:
        """
        Fetch attachment metadata from Sentry.

        IMPORTANT: This only fetches metadata, NOT content.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            issue_id: Sentry issue ID

        Returns:
            List of Attachment objects
        """
        try:
            # Fetch attachments for the issue's latest event
            attachments = await self.client.get_issue_attachments(
                org_slug, project_slug, issue_id
            )

            # Filter out oversized attachments (>100MB)
            filtered = [
                att for att in attachments
                if att.size <= MAX_ATTACHMENT_SIZE_BYTES
            ]

            if len(filtered) < len(attachments):
                logger.warning(
                    f"Filtered out {len(attachments) - len(filtered)} "
                    f"oversized attachments for issue {issue_id}"
                )

            logger.debug(
                f"Fetched {len(filtered)} attachments for issue {issue_id}"
            )
            return filtered

        except Exception as e:
            logger.warning(
                f"Failed to fetch attachments for issue {issue_id}: {e}"
            )
            return []

    def _build_attachments_metadata(
        self, attachments: List[Attachment]
    ) -> List[Dict[str, Any]]:
        """
        Build structured metadata for each attachment.

        CRITICAL: Only metadata is stored, NEVER content.

        Args:
            attachments: List of Attachment objects from Sentry

        Returns:
            List of attachment metadata dictionaries
        """
        metadata_list = []
        current_time = datetime.now(timezone.utc)

        for att in attachments:
            # Calculate URL expiration (Sentry default: 7 days from now)
            url_expires_at = current_time + timedelta(days=URL_EXPIRATION_DAYS)

            # Determine category based on content type
            category = self._determine_category(att.mimetype, att.name)

            # Check if important (screenshots, minidumps)
            is_important = category in IMPORTANT_CATEGORIES

            metadata = {
                "id": att.id,
                "name": att.name,
                "size_bytes": att.size,
                "content_type": att.mimetype,
                "uploaded_at": None,  # Sentry doesn't provide this in basic API
                "download_url": self._build_download_url(att.id),
                "url_expires_at": url_expires_at.isoformat(),
                "category": category,
                "is_important": is_important
            }
            metadata_list.append(metadata)

        return metadata_list

    def _categorize_attachments(
        self, attachments: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Categorize attachments by type.

        Categories:
        - screenshots: Visual debugging context (PNG, JPEG, etc.)
        - logs: Textual debugging output (text/plain, etc.)
        - minidumps: Crash dumps (DMP files)
        - source_maps: JavaScript source maps (*.map files)
        - other: Unknown or miscellaneous types

        Args:
            attachments: List of attachment metadata dictionaries

        Returns:
            Dict mapping category names to lists of attachments
        """
        categories = {
            CATEGORY_SCREENSHOTS: [],
            CATEGORY_LOGS: [],
            CATEGORY_MINIDUMPS: [],
            CATEGORY_SOURCE_MAPS: [],
            CATEGORY_OTHER: []
        }

        for att in attachments:
            category = att.get("category", CATEGORY_OTHER)
            categories[category].append(att)

        # Remove empty categories
        return {k: v for k, v in categories.items() if v}

    def _generate_summary(
        self,
        attachments: List[Dict[str, Any]],
        categories: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Generate summary statistics for attachments.

        Args:
            attachments: List of attachment metadata
            categories: Categorized attachments

        Returns:
            Summary statistics dictionary
        """
        total_size_bytes = sum(att["size_bytes"] for att in attachments)
        total_size_mb = total_size_bytes / (1024 * 1024)

        important_count = sum(1 for att in attachments if att["is_important"])

        return {
            "total_count": len(attachments),
            "has_screenshots": CATEGORY_SCREENSHOTS in categories,
            "has_minidumps": CATEGORY_MINIDUMPS in categories,
            "has_logs": CATEGORY_LOGS in categories,
            "has_source_maps": CATEGORY_SOURCE_MAPS in categories,
            "total_size_mb": round(total_size_mb, 2),
            "important_count": important_count
        }

    def _detect_important_attachments(
        self, attachments: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Detect important attachments for debugging.

        Important attachment types:
        - Screenshots: Provide visual context of the error state
        - Minidumps: Critical for crash analysis

        Args:
            attachments: List of attachment metadata

        Returns:
            List of attachment IDs flagged as important
        """
        return [
            att["id"]
            for att in attachments
            if att["is_important"]
        ]

    def _determine_category(
        self, content_type: str, filename: str
    ) -> str:
        """
        Determine attachment category from content type and filename.

        Args:
            content_type: MIME type (e.g., "image/png")
            filename: Attachment filename (e.g., "screenshot.png")

        Returns:
            Category name (screenshots, logs, minidumps, source_maps, other)
        """
        # First, try exact content type match
        if content_type in CONTENT_TYPE_MAPPINGS:
            # Special handling for application/json (could be source map)
            if content_type == "application/json" and filename.endswith(".map"):
                return CATEGORY_SOURCE_MAPS
            # Special handling for application/octet-stream (could be minidump)
            if content_type == "application/octet-stream" and filename.endswith(".dmp"):
                return CATEGORY_MINIDUMPS
            return CONTENT_TYPE_MAPPINGS[content_type]

        # Fallback: Try filename extension matching
        filename_lower = filename.lower()

        # Screenshots
        if any(filename_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp"]):
            return CATEGORY_SCREENSHOTS

        # Logs
        if any(filename_lower.endswith(ext) for ext in [".log", ".txt"]):
            return CATEGORY_LOGS

        # Minidumps
        if filename_lower.endswith(".dmp"):
            return CATEGORY_MINIDUMPS

        # Source maps
        if filename_lower.endswith(".map"):
            return CATEGORY_SOURCE_MAPS

        return CATEGORY_OTHER

    def _build_download_url(self, attachment_id: str) -> str:
        """
        Build download URL for attachment.

        NOTE: URLs are signed and time-limited (7 days by default).
        This method returns a placeholder. In production, the actual
        signed URL would come from Sentry's API response.

        Args:
            attachment_id: Attachment ID

        Returns:
            Download URL (placeholder for now)
        """
        # In production, this would be the actual signed URL from Sentry
        # For now, we return a placeholder structure
        return f"https://sentry.io/api/0/attachments/{attachment_id}/"

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
                        "attachments",
                        "failed",
                        error=error
                    )
                )
            )
            await self.db.commit()


async def get_attachments_enrichment_service(
    db: AsyncSession
) -> AttachmentsEnrichmentService:
    """
    Factory for attachments enrichment service.

    Args:
        db: Database session

    Returns:
        AttachmentsEnrichmentService instance
    """
    settings = get_settings()
    client = AttachmentClient(token=settings.get_sentry_token())
    return AttachmentsEnrichmentService(db, client)
