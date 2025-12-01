"""
Issue ownership and team routing enrichment.

This service enriches issues with ownership data from Sentry including:
- Ownership rules and code owners
- Suggested owners based on suspect commits
- Team assignments and routing
- Auto-assignment eligibility
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Set
import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.ownership import OwnershipClient, OwnershipSuggestion
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


class OwnershipEnrichmentService:
    """Service for enriching issues with ownership and team data."""

    def __init__(self, db: AsyncSession, sentry_client: OwnershipClient):
        self.db = db
        self.client = sentry_client
        self.pii_scrubber = get_pii_scrubber()
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich issue with ownership data.

        Args:
            issue_id: Database ID of the issue to enrich

        Returns:
            Dict with enrichment status and metadata
        """
        if not self.settings.ENABLE_OWNERSHIP:
            return {"status": "skipped", "reason": "feature disabled"}

        try:
            result = await self.db.execute(
                select(SentryIssue).where(SentryIssue.id == issue_id)
            )
            issue = result.scalar_one_or_none()
            if not issue:
                return {"status": "error", "reason": "issue not found"}

            # Extract organization and project info
            org = self._extract_org(issue)
            project = self._extract_project(issue)

            if not org or not project:
                logger.warning(
                    f"Missing org/project for issue {issue_id}: org={org}, project={project}"
                )
                return {"status": "error", "reason": "missing org or project slug"}

            # Fetch ownership rules from Sentry
            ownership_rules = await self.client.get_ownership_rules(org, project)

            # Get suggested owners for this specific issue
            suggested_owners = await self.client.get_ownership_suggestions(
                issue.sentry_issue_id
            )

            # Parse code owners from stack trace
            code_owners = self._extract_code_owners_from_stack(
                issue.cleaned_stack or {}
            )

            # Build ownership context
            ownership_data = self._build_ownership_data(
                ownership_rules, suggested_owners, code_owners
            )

            # Scrub PII (team names may contain sensitive info, user emails)
            ownership_data = self.pii_scrubber.scrub_dict(ownership_data)

            # Update issue
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    ownership=ownership_data,
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {},
                        "ownership",
                        "completed"
                    ),
                    last_enriched_at=datetime.utcnow()
                )
            )
            await self.db.commit()

            logger.info(
                f"Enriched issue {issue_id} with ownership",
                extra={
                    "issue_id": issue_id,
                    "suggested_owners": len(suggested_owners),
                    "code_owners": len(code_owners),
                    "teams": len(ownership_data.get("teams", [])),
                }
            )

            return {
                "status": "success",
                "owners_count": len(suggested_owners),
                "teams_count": len(ownership_data.get("teams", [])),
                "auto_assignment_eligible": ownership_data.get("auto_assignment_eligible", False),
            }

        except Exception as e:
            logger.error(f"Ownership enrichment failed for issue {issue_id}: {e}", exc_info=True)
            await self._mark_failed(issue_id, str(e))
            return {"status": "error", "reason": str(e)}

    def _extract_code_owners_from_stack(
        self, stack: Dict[str, Any]
    ) -> List[str]:
        """
        Extract potential code owners from file paths in stack trace.

        Uses pattern matching on file paths to infer team ownership.

        Args:
            stack: Cleaned stack trace dictionary

        Returns:
            List of inferred team names
        """
        owners = set()

        frames = stack.get("frames", [])
        for frame in frames:
            filename = frame.get("filename", "")
            if not filename:
                continue

            filename_lower = filename.lower()

            # Pattern matching for common team structures
            # Customize these patterns based on your organization's structure
            if "dashboard" in filename_lower:
                owners.add("team-dashboard")
            elif any(keyword in filename_lower for keyword in ["api", "backend", "server"]):
                owners.add("team-backend")
            elif any(keyword in filename_lower for keyword in ["frontend", "components", "ui", "views"]):
                owners.add("team-frontend")
            elif any(keyword in filename_lower for keyword in ["auth", "login", "oauth"]):
                owners.add("team-auth")
            elif any(keyword in filename_lower for keyword in ["payment", "billing", "checkout"]):
                owners.add("team-payments")
            elif any(keyword in filename_lower for keyword in ["analytics", "metrics", "tracking"]):
                owners.add("team-analytics")
            elif any(keyword in filename_lower for keyword in ["mobile", "ios", "android"]):
                owners.add("team-mobile")

            # Check for explicit team markers in path
            # e.g., /src/teams/dashboard/...
            team_match = re.search(r'/teams?/([a-z0-9_-]+)/', filename_lower)
            if team_match:
                owners.add(f"team-{team_match.group(1)}")

        return list(owners)

    def _build_ownership_data(
        self,
        rules: Dict[str, Any],
        suggested: List[OwnershipSuggestion],
        code_owners: List[str],
    ) -> Dict[str, Any]:
        """
        Build structured ownership data.

        Args:
            rules: Ownership rules from Sentry
            suggested: Suggested owners from Sentry
            code_owners: Code owners inferred from stack trace

        Returns:
            Structured ownership data dictionary
        """
        # Extract teams from suggestions
        teams = set()

        # Parse suggestions
        suggested_owners_list = []
        for suggestion in suggested:
            owner = suggestion.owner

            # Determine owner type and extract team
            owner_type = owner.get("type", "unknown")

            if owner_type == "team":
                team_name = owner.get("name") or owner.get("slug")
                if team_name:
                    teams.add(team_name)
                    suggested_owners_list.append({
                        "owner": team_name,
                        "type": "team",
                        "confidence": self._calculate_confidence(suggestion),
                        "source": suggestion.type,  # suspectCommit, codeowners, ownership
                    })
            elif owner_type == "user":
                # Still track for reference, but don't add to teams
                user_name = owner.get("name") or owner.get("email", "unknown")
                suggested_owners_list.append({
                    "owner": user_name,
                    "type": "user",
                    "confidence": self._calculate_confidence(suggestion),
                    "source": suggestion.type,
                })

        # Add code owners from stack trace analysis
        teams.update(code_owners)

        # Determine primary team (highest confidence)
        primary_team = None
        if suggested_owners_list:
            # Sort by confidence, teams first
            team_suggestions = [s for s in suggested_owners_list if s["type"] == "team"]
            if team_suggestions:
                team_suggestions.sort(key=lambda x: x["confidence"], reverse=True)
                primary_team = team_suggestions[0]["owner"]

        if not primary_team and teams:
            # Fallback to first team
            primary_team = list(teams)[0]

        # Determine auto-assignment eligibility
        # Auto-assign if we have high-confidence team suggestion
        auto_assignment_eligible = False
        if suggested_owners_list:
            top_suggestion = max(suggested_owners_list, key=lambda x: x["confidence"])
            if top_suggestion["type"] == "team" and top_suggestion["confidence"] > 0.8:
                auto_assignment_eligible = True

        return {
            "suggested_owners": suggested_owners_list[:5],  # Top 5 suggestions
            "teams": list(teams),
            "primary_team": primary_team,
            "ownership_rules_count": len(rules.get("rules", [])) if isinstance(rules, dict) else 0,
            "auto_assignment_eligible": auto_assignment_eligible,
            "last_fetched": datetime.utcnow().isoformat(),
        }

    def _calculate_confidence(self, suggestion: OwnershipSuggestion) -> float:
        """
        Calculate confidence score for ownership suggestion.

        Args:
            suggestion: Ownership suggestion from Sentry

        Returns:
            Confidence score between 0.0 and 1.0
        """
        # Base confidence by source type
        confidence_map = {
            "suspectCommit": 0.9,  # Highest confidence - based on recent commits
            "codeowners": 0.8,     # High confidence - explicit CODEOWNERS file
            "ownership": 0.7,      # Medium confidence - ownership rules
        }

        base_confidence = confidence_map.get(suggestion.type, 0.5)

        # Could enhance with additional factors:
        # - Recency of commits
        # - Number of matching commits
        # - Team activity level

        return base_confidence

    def _extract_org(self, issue: SentryIssue) -> Optional[str]:
        """Extract organization slug from settings."""
        # Could also extract from issue metadata if stored
        return (
            self.settings.ORGANIZATION_SLUG or
            self.settings.SENTRY_ORG or
            None
        )

    def _extract_project(self, issue: SentryIssue) -> Optional[str]:
        """Extract project slug from settings."""
        # Could also extract from issue metadata if stored
        return self.settings.PROJECT_SLUG or None

    def _update_status(
        self,
        current: Dict[str, Any],
        source: str,
        status: str,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update enrichment status for a specific source.

        Args:
            current: Current enrichment status dict
            source: Enrichment source name
            status: New status (completed, failed, pending)
            error: Optional error message

        Returns:
            Updated enrichment status dict
        """
        current[source] = {
            "status": status,
            "last_attempt": datetime.utcnow().isoformat(),
        }
        if error:
            current[source]["error"] = error

        return current

    async def _mark_failed(self, issue_id: int, error: str):
        """
        Mark ownership enrichment as failed for an issue.

        Args:
            issue_id: Database ID of the issue
            error: Error message
        """
        try:
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
                            "ownership",
                            "failed",
                            error=error
                        )
                    )
                )
                await self.db.commit()
        except Exception as e:
            logger.error(f"Failed to mark issue {issue_id} as failed: {e}")


async def get_ownership_enrichment_service(
    db: AsyncSession
) -> OwnershipEnrichmentService:
    """
    Factory for ownership enrichment service.

    Args:
        db: Database session

    Returns:
        OwnershipEnrichmentService instance
    """
    settings = get_settings()
    client = OwnershipClient(token=settings.get_sentry_token())
    return OwnershipEnrichmentService(db, client)
