"""
Tag Client

Fetches tag data from Sentry including:
- Issue tags
- Tag values
- Tag distributions
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient


class TagKey(BaseModel):
    """Tag key metadata."""

    key: str
    name: str
    unique_values: int = Field(alias="uniqueValues")
    total_values: int = Field(alias="totalValues")

    class Config:
        populate_by_name = True
        extra = "allow"


class TagValue(BaseModel):
    """Tag value with statistics."""

    key: str
    value: str
    count: int
    last_seen: Optional[str] = Field(None, alias="lastSeen")
    first_seen: Optional[str] = Field(None, alias="firstSeen")

    class Config:
        populate_by_name = True
        extra = "allow"


class TagDistribution(BaseModel):
    """Tag distribution with top values."""

    tag_key: str
    unique_count: int
    top_values: List[TagValue]

    class Config:
        populate_by_name = True
        extra = "allow"


class TagClient(BaseDataClient[TagKey]):
    """
    Client for Sentry Tags API.

    Endpoints:
    - GET /issues/{issue_id}/tags/ - List tags for an issue
    - GET /issues/{issue_id}/tags/{key}/ - Get tag values
    - GET /organizations/{org}/tags/ - List organization tags

    Example:
        client = TagClient(token="your-token")
        tags = await client.get_issue_tags("12345")

        # Get values for a specific tag
        browser_values = await client.get_tag_values("12345", "browser")
        for tag_value in browser_values:
            print(f"{tag_value.value}: {tag_value.count} occurrences")
    """

    async def get_issue_tags(
        self,
        issue_id: str,
    ) -> List[TagKey]:
        """
        List all tags for an issue.

        Args:
            issue_id: Issue ID

        Returns:
            List of tag keys with statistics
        """
        url = f"/issues/{issue_id}/tags/"
        data = await self._request("GET", url)
        return [TagKey.model_validate(tag) for tag in data]

    async def get_tag_values(
        self,
        issue_id: str,
        tag_key: str,
        limit: int = 100,
    ) -> List[TagValue]:
        """
        Get values for a specific tag on an issue.

        Args:
            issue_id: Issue ID
            tag_key: Tag key (e.g., "browser", "environment", "release")
            limit: Maximum results

        Returns:
            List of tag values with occurrence counts
        """
        url = f"/issues/{issue_id}/tags/{tag_key}/"
        params = {"per_page": min(limit, 1000)}

        data = await self._request("GET", url, params=params)

        # API returns format: {"key": "browser", "topValues": [...]}
        values_data = data.get("topValues", [])
        return [
            TagValue.model_validate({**val, "key": tag_key}) for val in values_data
        ]

    async def get_organization_tags(
        self,
        org_slug: str,
    ) -> List[TagKey]:
        """
        List all available tags for an organization.

        Args:
            org_slug: Organization slug

        Returns:
            List of tag keys
        """
        url = f"/organizations/{org_slug}/tags/"
        data = await self._request("GET", url)
        return [TagKey.model_validate(tag) for tag in data]

    async def get_project_tag_values(
        self,
        org_slug: str,
        project_slug: str,
        tag_key: str,
        query: Optional[str] = None,
        limit: int = 100,
    ) -> List[TagValue]:
        """
        Get tag values across a project.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            tag_key: Tag key
            query: Additional query filter
            limit: Maximum results

        Returns:
            List of tag values
        """
        url = f"/projects/{org_slug}/{project_slug}/tags/{tag_key}/values/"
        params: Dict[str, Any] = {"per_page": min(limit, 1000)}

        if query:
            params["query"] = query

        data = await self._request("GET", url, params=params)
        return [TagValue.model_validate({**val, "key": tag_key}) for val in data]

    async def get_tag_distributions(
        self,
        issue_id: str,
        top_tags: int = 20,
        top_values_per_tag: int = 10,
    ) -> List[TagDistribution]:
        """
        Get tag distributions for an issue (all tags with their top values).

        This is optimized to fetch tag distributions in batch for enrichment.

        Args:
            issue_id: Issue ID
            top_tags: Number of top tags to fetch (default 20)
            top_values_per_tag: Number of top values per tag (default 10)

        Returns:
            List of tag distributions with top values
        """
        # First get all tags
        tags = await self.get_issue_tags(issue_id)

        # Sort by total_values (most frequent tags first)
        tags_sorted = sorted(tags, key=lambda t: t.total_values, reverse=True)

        # Get top N tags
        top_tag_keys = tags_sorted[:top_tags]

        # Fetch values for each tag
        distributions = []
        for tag_key in top_tag_keys:
            try:
                values = await self.get_tag_values(
                    issue_id, tag_key.key, limit=top_values_per_tag
                )
                distributions.append(
                    TagDistribution(
                        tag_key=tag_key.key,
                        unique_count=tag_key.unique_values,
                        top_values=values,
                    )
                )
            except Exception as e:
                # Log and skip tags that fail to fetch
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    f"Failed to fetch values for tag {tag_key.key}: {e}",
                    extra={"issue_id": issue_id, "tag_key": tag_key.key}
                )
                continue

        return distributions
