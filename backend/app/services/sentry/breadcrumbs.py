"""
Breadcrumb Client

Fetches breadcrumb data from Sentry events.
Breadcrumbs are event trails leading up to an error.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient


class Breadcrumb(BaseModel):
    """Event breadcrumb."""

    timestamp: datetime
    type: str  # "default", "http", "navigation", "ui", "error", etc.
    category: Optional[str] = None
    message: Optional[str] = None
    level: str = "info"  # "info", "warning", "error"
    data: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        extra = "allow"


class BreadcrumbClient(BaseDataClient[Breadcrumb]):
    """
    Client for Sentry Breadcrumb data.

    Breadcrumbs are extracted from event details and provide context
    about user actions and system events leading up to an error.

    Example:
        client = BreadcrumbClient(token="your-token")
        breadcrumbs = await client.get_breadcrumbs_from_issue("12345")

        # Find navigation breadcrumbs
        nav_crumbs = [b for b in breadcrumbs if b.type == "navigation"]
    """

    async def get_breadcrumbs_from_event(
        self,
        org_slug: str,
        project_slug: str,
        event_id: str,
    ) -> List[Breadcrumb]:
        """
        Get breadcrumbs from a specific event.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID

        Returns:
            List of breadcrumbs from the event
        """
        url = f"/projects/{org_slug}/{project_slug}/events/{event_id}/"
        data = await self._request("GET", url)

        # Extract breadcrumbs from entries
        breadcrumbs_data = []
        for entry in data.get("entries", []):
            if entry.get("type") == "breadcrumbs":
                breadcrumbs_data = entry.get("data", {}).get("values", [])
                break

        return [Breadcrumb.model_validate(crumb) for crumb in breadcrumbs_data]

    async def get_breadcrumbs_from_issue(
        self,
        issue_id: str,
    ) -> List[Breadcrumb]:
        """
        Get breadcrumbs from an issue's latest event.

        Args:
            issue_id: Issue ID

        Returns:
            List of breadcrumbs from the latest event
        """
        url = f"/issues/{issue_id}/events/latest/"
        data = await self._request("GET", url)

        # Extract breadcrumbs from entries
        breadcrumbs_data = []
        for entry in data.get("entries", []):
            if entry.get("type") == "breadcrumbs":
                breadcrumbs_data = entry.get("data", {}).get("values", [])
                break

        return [Breadcrumb.model_validate(crumb) for crumb in breadcrumbs_data]

    async def get_http_breadcrumbs(
        self,
        issue_id: str,
    ) -> List[Breadcrumb]:
        """
        Get only HTTP request breadcrumbs from an issue.

        Args:
            issue_id: Issue ID

        Returns:
            List of HTTP breadcrumbs
        """
        breadcrumbs = await self.get_breadcrumbs_from_issue(issue_id)
        return [b for b in breadcrumbs if b.type == "http"]

    async def get_navigation_breadcrumbs(
        self,
        issue_id: str,
    ) -> List[Breadcrumb]:
        """
        Get only navigation breadcrumbs from an issue.

        Args:
            issue_id: Issue ID

        Returns:
            List of navigation breadcrumbs
        """
        breadcrumbs = await self.get_breadcrumbs_from_issue(issue_id)
        return [b for b in breadcrumbs if b.type == "navigation"]
