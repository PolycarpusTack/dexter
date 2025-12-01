"""
Session Client

Fetches session replay data from Sentry including:
- Session replays for issues
- Session replay details
- Session replay events
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient


class SessionReplay(BaseModel):
    """Session replay data."""

    replay_id: str = Field(alias="id")
    project_id: str = Field(alias="projectId")
    timestamp: datetime = Field(alias="startedAt")
    finished_at: Optional[datetime] = Field(None, alias="finishedAt")
    duration: int  # Duration in seconds
    count_errors: int = Field(0, alias="countErrors")
    count_segments: int = Field(0, alias="countSegments")
    user: Optional[Dict[str, Any]] = None
    tags: Dict[str, Any] = Field(default_factory=dict)
    urls: List[str] = Field(default_factory=list)

    class Config:
        populate_by_name = True
        extra = "allow"


class SessionClient(BaseDataClient[SessionReplay]):
    """
    Client for Sentry Session Replay API.

    Endpoints:
    - GET /organizations/{org}/replays/ - List session replays
    - GET /projects/{org}/{project}/replays/{replay_id}/ - Get replay details
    - GET /organizations/{org}/issues/{issue_id}/replays/ - Get replays for issue

    Example:
        client = SessionClient(token="your-token")
        replays = await client.get_issue_replays("12345")

        # Analyze replays with errors
        error_replays = [r for r in replays if r.count_errors > 0]
    """

    async def get_replays(
        self,
        org_slug: str,
        project: Optional[str] = None,
        limit: int = 50,
        query: Optional[str] = None,
    ) -> List[SessionReplay]:
        """
        List session replays.

        Args:
            org_slug: Organization slug
            project: Project slug to filter by
            limit: Maximum results
            query: Additional query filter

        Returns:
            List of session replays
        """
        url = f"/organizations/{org_slug}/replays/"

        params: Dict[str, Any] = {"per_page": min(limit, 100)}
        if project:
            params["project"] = project
        if query:
            params["query"] = query

        data = await self._request("GET", url, params=params)
        replays = data.get("data", [])
        return [SessionReplay.model_validate(replay) for replay in replays]

    async def get_issue_replays(
        self,
        issue_id: str,
    ) -> List[SessionReplay]:
        """
        Get session replays associated with an issue.

        Args:
            issue_id: Issue ID

        Returns:
            List of session replays for the issue
        """
        # Note: This endpoint path is inferred, may need org_slug parameter
        url = f"/issues/{issue_id}/replays/"
        data = await self._request("GET", url)
        return [SessionReplay.model_validate(replay) for replay in data]

    async def get_replay(
        self,
        org_slug: str,
        project_slug: str,
        replay_id: str,
    ) -> SessionReplay:
        """
        Get session replay details.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            replay_id: Replay ID

        Returns:
            Session replay details
        """
        url = f"/projects/{org_slug}/{project_slug}/replays/{replay_id}/"
        data = await self._request("GET", url)
        return SessionReplay.model_validate(data)
