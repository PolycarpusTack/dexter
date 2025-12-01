"""
Grouping insights enrichment.

Implements EPIC N: Grouping Insights
- Fetches fingerprint variants and grouping data from Sentry
- Finds similar issues using Sentry's similarity API
- Detects grouping problems (over-grouping and under-grouping)
- Computes similarity scores across multiple dimensions
"""

from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from collections import defaultdict
import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.grouping import GroupingClient
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


# Thresholds for grouping health detection
OVERGROUPING_ERROR_COUNT_THRESHOLD = 5  # >5 distinct errors = potential over-grouping
UNDERGROUPING_SIMILARITY_THRESHOLD = 0.80  # >80% similarity = potential under-grouping
SIMILARITY_MATCH_THRESHOLD = 0.70  # >70% similarity = "similar issue"


class GroupingEnrichmentService:
    """
    Service for enriching issues with grouping insights.

    This service:
    1. Fetches fingerprint variants and grouping metadata
    2. Finds similar issues using Sentry's API
    3. Computes multi-dimensional similarity scores
    4. Detects grouping health problems (over/under grouping)
    5. Stores enriched data in grouping_insights JSONB column
    """

    def __init__(self, db: AsyncSession, sentry_client: GroupingClient):
        """
        Initialize grouping enrichment service.

        Args:
            db: Database session
            sentry_client: GroupingClient for fetching grouping data
        """
        self.db = db
        self.client = sentry_client
        self.pii_scrubber = get_pii_scrubber()
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich issue with grouping insights.

        Args:
            issue_id: Database ID of the issue

        Returns:
            Status dict with enrichment results
        """
        if not self.settings.ENABLE_GROUPING_INSIGHTS:
            return {"status": "skipped", "reason": "feature disabled"}

        try:
            # Fetch issue from database
            result = await self.db.execute(
                select(SentryIssue).where(SentryIssue.id == issue_id)
            )
            issue = result.scalar_one_or_none()
            if not issue:
                return {"status": "error", "reason": "issue not found"}

            # Extract org_slug from issue metadata (assumed to be stored in context_tags)
            org_slug = self._extract_org_slug(issue)
            if not org_slug:
                logger.warning(f"Could not extract org_slug for issue {issue_id}")
                return {"status": "error", "reason": "org_slug not found"}

            # Fetch issue details including fingerprints
            issue_details = await self.client.get_issue_details(
                org_slug, issue.sentry_issue_id
            )

            # Extract fingerprint variants
            fingerprint_data = self._extract_fingerprint_variants(issue_details)

            # Find similar issues
            similar_issues_raw = await self._find_similar_issues(
                org_slug, issue.sentry_issue_id
            )

            # Compute similarity scores and rank
            similar_issues = self._compute_similarity_scores(
                issue_details, similar_issues_raw
            )

            # Detect grouping problems
            grouping_health = await self._detect_grouping_problems(
                issue, issue_details, similar_issues
            )

            # Build grouping insights data
            grouping_insights = self._build_grouping_insights(
                fingerprint_data,
                similar_issues,
                grouping_health,
                issue_details,
            )

            # No PII scrubbing needed (fingerprints are hashes)
            # But scrub just in case there's any metadata
            grouping_insights = self.pii_scrubber.scrub_dict(grouping_insights)

            # Update issue
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    grouping_insights=grouping_insights,
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {},
                        "grouping_insights",
                        "completed",
                    ),
                    last_enriched_at=datetime.utcnow(),
                )
            )
            await self.db.commit()

            logger.info(
                f"Enriched issue {issue_id} with grouping insights",
                extra={
                    "issue_id": issue_id,
                    "similar_issues_count": len(similar_issues),
                    "has_variants": fingerprint_data.get("has_variants", False),
                    "is_overgrouped": grouping_health.get("is_overgrouped", False),
                    "is_undergrouped": grouping_health.get("is_undergrouped", False),
                },
            )

            return {
                "status": "success",
                "similar_issues_count": len(similar_issues),
                "has_variants": fingerprint_data.get("has_variants", False),
                "grouping_health_score": grouping_health.get("confidence", 0.0),
            }

        except Exception as e:
            logger.error(f"Grouping enrichment failed for issue {issue_id}: {e}", exc_info=True)
            await self._mark_failed(issue_id, str(e))
            return {"status": "error", "reason": str(e)}

    def _extract_org_slug(self, issue: SentryIssue) -> Optional[str]:
        """
        Extract organization slug from issue metadata.

        Args:
            issue: SentryIssue model

        Returns:
            Organization slug or None
        """
        # Try to get from context_tags
        if issue.context_tags and isinstance(issue.context_tags, dict):
            org_slug = issue.context_tags.get("organization")
            if org_slug:
                return org_slug

        # Try to get from release_context
        if issue.release_context and isinstance(issue.release_context, dict):
            org_slug = issue.release_context.get("organization")
            if org_slug:
                return org_slug

        # Fallback: try to get from settings if there's a default
        return getattr(self.settings, "SENTRY_ORG_SLUG", None)

    def _extract_fingerprint_variants(
        self, issue_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract fingerprint variants from issue details.

        Args:
            issue_details: Full issue details from Sentry API

        Returns:
            Fingerprint data with variants and algorithm info
        """
        # Primary fingerprint (how Sentry grouped this issue)
        fingerprint = issue_details.get("fingerprint", [])

        # Grouping algorithm
        metadata = issue_details.get("metadata", {})
        grouping_algorithm = metadata.get("type", "default")

        # Check if there are fingerprint variants (multiple ways to group)
        # Sentry may return this in different formats depending on version
        has_variants = len(fingerprint) > 1 or bool(metadata.get("variants"))

        return {
            "primary_fingerprint": fingerprint if isinstance(fingerprint, list) else [fingerprint],
            "grouping_algorithm": grouping_algorithm,
            "has_variants": has_variants,
            "variant_count": len(fingerprint) if isinstance(fingerprint, list) else 1,
        }

    async def _find_similar_issues(
        self, org_slug: str, issue_id: str
    ) -> List[Dict[str, Any]]:
        """
        Find similar issues using Sentry's similarity API.

        Args:
            org_slug: Organization slug
            issue_id: Issue ID

        Returns:
            List of similar issues from Sentry
        """
        try:
            similar_issues = await self.client.get_similar_issues(
                org_slug, issue_id, limit=10
            )
            return similar_issues
        except Exception as e:
            logger.warning(f"Failed to fetch similar issues: {e}")
            return []

    def _compute_similarity_scores(
        self,
        current_issue: Dict[str, Any],
        similar_issues: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Compute similarity scores and rank similar issues.

        Uses Sentry's built-in similarity data and enhances it with our own scoring.

        Args:
            current_issue: Current issue details
            similar_issues: List of similar issues from Sentry

        Returns:
            Ranked list of similar issues with enhanced scores
        """
        scored_issues = []

        current_error = current_issue.get("title", "")
        current_fingerprint = current_issue.get("fingerprint", [])
        current_stack = self._extract_stack_trace(current_issue)

        for similar in similar_issues:
            # Sentry provides a similarity score (if available)
            sentry_score = similar.get("score", 0.0)

            # Compute our own multi-dimensional score
            stack_sim = self._compute_stack_similarity(
                current_stack, self._extract_stack_trace(similar)
            )
            message_sim = self._compute_message_similarity(
                current_error, similar.get("title", "")
            )
            fingerprint_sim = self._compute_fingerprint_similarity(
                current_fingerprint, similar.get("fingerprint", [])
            )

            # Weighted composite score (60% stack, 30% message, 10% fingerprint)
            composite_score = (
                (stack_sim * 0.6) + (message_sim * 0.3) + (fingerprint_sim * 0.1)
            )

            # Use Sentry's score if available and higher
            final_score = max(sentry_score, composite_score)

            # Only include if above threshold
            if final_score >= SIMILARITY_MATCH_THRESHOLD:
                scored_issues.append(
                    {
                        "issue_id": similar.get("id"),
                        "similarity_score": round(final_score, 3),
                        "error_message": similar.get("title", "")[:200],
                        "event_count": similar.get("count", 0),
                        "last_seen": similar.get("lastSeen"),
                        "short_id": similar.get("shortId"),
                    }
                )

        # Sort by similarity score (descending), then event count (descending)
        scored_issues.sort(
            key=lambda x: (x["similarity_score"], x["event_count"]), reverse=True
        )

        # Limit to top 10
        return scored_issues[:10]

    def _extract_stack_trace(self, issue: Dict[str, Any]) -> List[str]:
        """
        Extract stack trace frames from issue data.

        Args:
            issue: Issue details

        Returns:
            List of stack frame strings
        """
        # Try to get from entries
        entries = issue.get("entries", [])
        for entry in entries:
            if entry.get("type") == "exception":
                values = entry.get("data", {}).get("values", [])
                for value in values:
                    stacktrace = value.get("stacktrace", {})
                    frames = stacktrace.get("frames", [])
                    return [
                        f"{f.get('function', '')}:{f.get('filename', '')}:{f.get('lineNo', '')}"
                        for f in frames
                        if f.get("function")
                    ]

        # Fallback: try metadata
        metadata = issue.get("metadata", {})
        if "value" in metadata:
            return [metadata["value"]]

        return []

    def _compute_stack_similarity(
        self, stack1: List[str], stack2: List[str]
    ) -> float:
        """
        Compute stack trace similarity using Levenshtein-like approach.

        Args:
            stack1: First stack trace
            stack2: Second stack trace

        Returns:
            Similarity score (0.0 to 1.0)
        """
        if not stack1 or not stack2:
            return 0.0

        # Use set intersection for simplicity (Jaccard similarity)
        set1 = set(stack1)
        set2 = set(stack2)

        if not set1 or not set2:
            return 0.0

        intersection = len(set1 & set2)
        union = len(set1 | set2)

        return intersection / union if union > 0 else 0.0

    def _compute_message_similarity(self, msg1: str, msg2: str) -> float:
        """
        Compute error message similarity using fuzzy matching.

        Args:
            msg1: First error message
            msg2: Second error message

        Returns:
            Similarity score (0.0 to 1.0)
        """
        if not msg1 or not msg2:
            return 0.0

        # Normalize messages (lowercase, remove special chars)
        norm1 = re.sub(r"[^\w\s]", "", msg1.lower())
        norm2 = re.sub(r"[^\w\s]", "", msg2.lower())

        # Tokenize
        tokens1 = set(norm1.split())
        tokens2 = set(norm2.split())

        if not tokens1 or not tokens2:
            return 0.0

        # Jaccard similarity
        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)

        return intersection / union if union > 0 else 0.0

    def _compute_fingerprint_similarity(
        self, fp1: List[str], fp2: List[str]
    ) -> float:
        """
        Compute fingerprint overlap using Jaccard similarity.

        Args:
            fp1: First fingerprint
            fp2: Second fingerprint

        Returns:
            Similarity score (0.0 to 1.0)
        """
        if not fp1 or not fp2:
            return 0.0

        set1 = set(fp1) if isinstance(fp1, list) else {fp1}
        set2 = set(fp2) if isinstance(fp2, list) else {fp2}

        if not set1 or not set2:
            return 0.0

        intersection = len(set1 & set2)
        union = len(set1 | set2)

        return intersection / union if union > 0 else 0.0

    async def _detect_grouping_problems(
        self,
        issue: SentryIssue,
        issue_details: Dict[str, Any],
        similar_issues: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Detect over-grouping and under-grouping problems.

        Over-grouping: Too many different errors in one issue group
        Under-grouping: Same error split across multiple issues

        Args:
            issue: Database issue model
            issue_details: Issue details from Sentry
            similar_issues: List of similar issues

        Returns:
            Grouping health assessment
        """
        # Check for over-grouping: Multiple distinct error messages
        is_overgrouped, overgrouping_reason, distinct_count = (
            await self._check_overgrouping(issue, issue_details)
        )

        # Check for under-grouping: Multiple issues with high similarity
        is_undergrouped, undergrouping_candidates = self._check_undergrouping(
            similar_issues
        )

        # Compute confidence score (inverse of problems detected)
        problems_detected = int(is_overgrouped) + int(is_undergrouped)
        confidence = 1.0 - (problems_detected * 0.3)  # Each problem reduces by 30%
        confidence = max(0.0, min(1.0, confidence))  # Clamp to [0, 1]

        # Assess fingerprint stability
        fingerprint_stability = self._assess_fingerprint_stability(issue_details)

        health = {
            "is_overgrouped": is_overgrouped,
            "is_undergrouped": is_undergrouped,
            "confidence": round(confidence, 2),
            "fingerprint_stability": fingerprint_stability,
        }

        if is_overgrouped:
            health["overgrouping_reason"] = overgrouping_reason
            health["distinct_error_count"] = distinct_count

        if is_undergrouped:
            health["undergrouping_candidates"] = undergrouping_candidates

        return health

    async def _check_overgrouping(
        self, issue: SentryIssue, issue_details: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], int]:
        """
        Check if issue is over-grouped.

        Returns:
            Tuple of (is_overgrouped, reason, distinct_error_count)
        """
        # We would need to fetch multiple events for this issue to check distinct errors
        # For now, use heuristics from issue details

        # Check if metadata indicates multiple error types
        metadata = issue_details.get("metadata", {})
        error_type = metadata.get("type", "")

        # If error type is generic (like "Error"), might be over-grouped
        generic_errors = ["Error", "Exception", "RuntimeError", "TypeError"]
        if error_type in generic_errors:
            event_count = issue_details.get("count", 0)
            # If many events but generic error type, likely over-grouped
            if event_count > 100:
                return True, "Generic error type with high event count", 1

        # For more accurate detection, we'd need to:
        # 1. Sample multiple events from this issue
        # 2. Extract distinct error messages
        # 3. Count unique patterns
        # This is expensive, so we'll do a simplified check

        return False, None, 1

    def _check_undergrouping(
        self, similar_issues: List[Dict[str, Any]]
    ) -> Tuple[bool, List[str]]:
        """
        Check if issue is under-grouped (split across multiple issues).

        Returns:
            Tuple of (is_undergrouped, list_of_candidate_issue_ids)
        """
        candidates = []

        for similar in similar_issues:
            # If similarity is very high (>80%), might be under-grouped
            if similar["similarity_score"] > UNDERGROUPING_SIMILARITY_THRESHOLD:
                candidates.append(
                    {
                        "issue_id": similar["issue_id"],
                        "similarity": similar["similarity_score"],
                    }
                )

        return len(candidates) > 0, candidates

    def _assess_fingerprint_stability(self, issue_details: Dict[str, Any]) -> str:
        """
        Assess fingerprint stability (stable, unstable, unknown).

        Args:
            issue_details: Issue details from Sentry

        Returns:
            Stability assessment string
        """
        # Check if fingerprint has wildcards or generic patterns
        fingerprint = issue_details.get("fingerprint", [])

        if not fingerprint:
            return "unknown"

        # If fingerprint contains wildcards, it's less stable
        fingerprint_str = str(fingerprint).lower()
        if "*" in fingerprint_str or "{{" in fingerprint_str:
            return "unstable"

        # If fingerprint is specific, it's stable
        if len(fingerprint) >= 3:
            return "stable"

        return "moderate"

    def _build_grouping_insights(
        self,
        fingerprint_data: Dict[str, Any],
        similar_issues: List[Dict[str, Any]],
        grouping_health: Dict[str, Any],
        issue_details: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Build structured grouping insights data for storage.

        Args:
            fingerprint_data: Extracted fingerprint information
            similar_issues: Ranked similar issues
            grouping_health: Grouping health assessment
            issue_details: Full issue details

        Returns:
            Structured grouping insights dict
        """
        return {
            "primary_fingerprint": fingerprint_data.get("primary_fingerprint", []),
            "fingerprint_variants": [],  # Sentry doesn't always expose this
            "grouping_algorithm": fingerprint_data.get("grouping_algorithm", "default"),
            "similar_issues": similar_issues,
            "grouping_health": grouping_health,
            "summary": {
                "similar_issues_count": len(similar_issues),
                "has_variants": fingerprint_data.get("has_variants", False),
                "variant_count": fingerprint_data.get("variant_count", 1),
            },
            "last_fetched": datetime.utcnow().isoformat(),
        }

    def _update_status(
        self, current: Dict, source: str, status: str, error: Optional[str] = None
    ) -> Dict:
        """Update enrichment status for a source."""
        current[source] = {
            "status": status,
            "last_attempt": datetime.utcnow().isoformat(),
            "error": error,
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
                        "grouping_insights",
                        "failed",
                        error=error,
                    )
                )
            )
            await self.db.commit()


async def get_grouping_enrichment_service(db: AsyncSession) -> GroupingEnrichmentService:
    """
    Factory for grouping enrichment service.

    Args:
        db: Database session

    Returns:
        GroupingEnrichmentService instance
    """
    settings = get_settings()
    client = GroupingClient(token=settings.get_sentry_token())
    return GroupingEnrichmentService(db, client)
