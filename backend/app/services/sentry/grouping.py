"""
Grouping Client

Fetches grouping/fingerprinting data from Sentry including:
- Grouping variants
- Fingerprints
- Hashes
- Grouping configs
"""

import logging
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient

logger = logging.getLogger(__name__)


class GroupingVariant(BaseModel):
    """Grouping variant for an event."""

    type: str  # "default", "mobile", etc.
    hash: Optional[str] = None
    description: Optional[str] = None
    component: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"


class Fingerprint(BaseModel):
    """Issue fingerprint."""

    value: List[str]

    class Config:
        extra = "allow"


class GroupingConfig(BaseModel):
    """Grouping configuration."""

    id: str
    strategy: str  # "newstyle", "legacy", etc.

    class Config:
        extra = "allow"


class GroupingClient(BaseDataClient[GroupingVariant]):
    """
    Client for Sentry Grouping/Fingerprinting API.

    Endpoints:
    - GET /issues/{issue_id}/hashes/ - Get issue fingerprints
    - GET /projects/{org}/{project}/events/{event_id}/grouping-info/ - Grouping details

    Example:
        client = GroupingClient(token="your-token")

        # Get grouping variants for an event
        variants = await client.get_grouping_variants("my-org", "my-project", "event123")
        for variant in variants:
            print(f"{variant.type}: {variant.hash}")

        # Get issue fingerprints
        fingerprints = await client.get_issue_fingerprints("12345")
    """

    async def get_grouping_variants(
        self,
        org_slug: str,
        project_slug: str,
        event_id: str,
    ) -> Dict[str, GroupingVariant]:
        """
        Get grouping variants for an event.

        This shows how Sentry grouped the event and what fingerprints
        were calculated using different strategies.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID

        Returns:
            Dictionary of variant_name -> GroupingVariant
        """
        url = f"/projects/{org_slug}/{project_slug}/events/{event_id}/grouping-info/"
        data = await self._request("GET", url)

        variants = {}
        for name, variant_data in data.items():
            if isinstance(variant_data, dict) and "hash" in variant_data:
                variants[name] = GroupingVariant.model_validate(
                    {"type": name, **variant_data}
                )

        return variants

    async def get_issue_fingerprints(
        self,
        issue_id: str,
    ) -> List[str]:
        """
        Get fingerprints (hashes) for an issue.

        Args:
            issue_id: Issue ID

        Returns:
            List of fingerprint hashes
        """
        url = f"/issues/{issue_id}/hashes/"
        data = await self._request("GET", url)

        # API returns list of hash objects
        return [item.get("id", "") for item in data if "id" in item]

    async def get_event_grouping_info(
        self,
        org_slug: str,
        project_slug: str,
        event_id: str,
    ) -> Dict[str, Any]:
        """
        Get full grouping information for an event.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID

        Returns:
            Full grouping information including variants and config
        """
        url = f"/projects/{org_slug}/{project_slug}/events/{event_id}/grouping-info/"
        return await self._request("GET", url)

    async def get_project_grouping_configs(
        self,
        org_slug: str,
        project_slug: str,
    ) -> List[GroupingConfig]:
        """
        Get available grouping configurations for a project.

        Args:
            org_slug: Organization slug
            project_slug: Project slug

        Returns:
            List of grouping configurations
        """
        # Note: This endpoint may not exist in all Sentry versions
        # Using project details endpoint instead
        url = f"/projects/{org_slug}/{project_slug}/"
        data = await self._request("GET", url)

        grouping_config = data.get("groupingConfig")
        if grouping_config:
            return [GroupingConfig.model_validate(grouping_config)]
        return []

    async def get_issue_details(
        self,
        org_slug: str,
        issue_id: str,
    ) -> Dict[str, Any]:
        """
        Get detailed issue information including fingerprints and grouping.

        Args:
            org_slug: Organization slug
            issue_id: Issue ID

        Returns:
            Full issue details with fingerprint and grouping data
        """
        url = f"/organizations/{org_slug}/issues/{issue_id}/"
        return await self._request("GET", url)

    async def get_similar_issues(
        self,
        org_slug: str,
        issue_id: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get issues similar to the specified issue.

        Uses Sentry's built-in similarity algorithm based on:
        - Stack trace similarity
        - Error message similarity
        - Fingerprint overlap

        Args:
            org_slug: Organization slug
            issue_id: Issue ID
            limit: Maximum number of similar issues to return (default: 10)

        Returns:
            List of similar issues with similarity scores
        """
        url = f"/organizations/{org_slug}/issues/{issue_id}/similar-issues/"
        params = {"limit": limit}

        try:
            data = await self._request("GET", url, params=params)
            # Sentry returns list of similar issues
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.warning(f"Failed to fetch similar issues for {issue_id}: {e}")
            # Return empty list if endpoint doesn't exist or fails
            # (similar-issues endpoint may not be available in all Sentry versions)
            return []

    async def get_issue_hashes_details(
        self,
        org_slug: str,
        issue_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Get detailed hash/fingerprint information for an issue.

        Args:
            org_slug: Organization slug
            issue_id: Issue ID

        Returns:
            List of hash details with event counts and metadata
        """
        url = f"/organizations/{org_slug}/issues/{issue_id}/hashes/"
        data = await self._request("GET", url)
        return data if isinstance(data, list) else []
