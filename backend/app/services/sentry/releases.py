"""
Release Client

Fetches release data from Sentry including:
- Release lists with health metrics
- Suspect commits from events
- Release commits
- Deploys
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient


class SentryRelease(BaseModel):
    """Sentry release with health metrics."""

    version: str
    date_created: datetime = Field(alias="dateCreated")
    date_released: Optional[datetime] = Field(None, alias="dateReleased")
    new_groups: int = Field(0, alias="newGroups")
    owner: Optional[Dict[str, Any]] = None
    ref: Optional[str] = None
    url: Optional[str] = None
    projects: List[Dict[str, Any]] = Field(default_factory=list)

    # Health metrics
    crash_free_users: Optional[float] = Field(None, alias="healthData.crashFreeUsers")
    crash_free_sessions: Optional[float] = Field(None, alias="healthData.crashFreeSessions")
    total_users: Optional[int] = Field(None, alias="healthData.totalUsers")
    total_sessions: Optional[int] = Field(None, alias="healthData.totalSessions")
    session_crashed: Optional[int] = Field(None, alias="healthData.sessionsCrashed")

    class Config:
        populate_by_name = True
        extra = "allow"


class SuspectCommit(BaseModel):
    """Suspect commit from issue/event analysis."""

    id: str
    repository: Dict[str, str]
    author: Dict[str, str]  # name, email
    message: str
    timestamp: datetime = Field(alias="dateCreated")
    confidence_score: Optional[float] = Field(None, alias="score")  # Sentry's attribution score

    class Config:
        populate_by_name = True
        extra = "allow"


class ReleaseCommit(BaseModel):
    """Commit in a release."""

    id: str
    repository: Optional[Dict[str, str]] = None
    author: Optional[Dict[str, str]] = None
    message: str
    timestamp: datetime = Field(alias="dateCreated")

    class Config:
        populate_by_name = True
        extra = "allow"


class ReleaseDeploy(BaseModel):
    """Deployment of a release."""

    id: str
    environment: str
    date_started: datetime = Field(alias="dateStarted")
    date_finished: Optional[datetime] = Field(None, alias="dateFinished")
    url: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "allow"


class ReleaseClient(BaseDataClient[SentryRelease]):
    """
    Client for Sentry Release API.

    Endpoints:
    - GET /projects/{org}/{project}/releases/ - List releases
    - GET /organizations/{org}/releases/{version}/ - Release details
    - GET /organizations/{org}/releases/{version}/commits/ - Release commits
    - GET /issues/{issue_id}/events/latest/ - Get suspect commits from latest event
    - GET /projects/{org}/{project}/releases/{version}/deploys/ - List deploys

    Example:
        client = ReleaseClient(token="your-token")
        releases = await client.get_releases("my-org", "my-project")

        # Get suspect commits for an issue
        commits = await client.get_suspect_commits("12345")
    """

    async def get_releases(
        self,
        org_slug: str,
        project_slug: str,
        per_page: int = 20,
        cursor: Optional[str] = None,
    ) -> List[SentryRelease]:
        """
        List releases for a project with health metrics.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            per_page: Results per page (max 100)
            cursor: Pagination cursor

        Returns:
            List of releases with health metrics

        Example:
            releases = await client.get_releases("my-org", "my-project")
            for release in releases:
                print(f"{release.version}: {release.crash_free_users}% crash free")
        """
        url = f"/projects/{org_slug}/{project_slug}/releases/"
        params: Dict[str, Any] = {"per_page": min(per_page, 100)}
        if cursor:
            params["cursor"] = cursor

        data = await self._request("GET", url, params=params)
        return [SentryRelease.model_validate(release) for release in data]

    async def get_release(
        self,
        org_slug: str,
        version: str,
    ) -> SentryRelease:
        """
        Get details for a specific release.

        Args:
            org_slug: Organization slug
            version: Release version

        Returns:
            Release details with health metrics

        Example:
            release = await client.get_release("my-org", "1.0.0")
        """
        url = f"/organizations/{org_slug}/releases/{version}/"
        data = await self._request("GET", url)
        return SentryRelease.model_validate(data)

    async def get_release_commits(
        self,
        org_slug: str,
        version: str,
    ) -> List[ReleaseCommit]:
        """
        Get commits in a release.

        Args:
            org_slug: Organization slug
            version: Release version

        Returns:
            List of commits in the release

        Example:
            commits = await client.get_release_commits("my-org", "1.0.0")
            for commit in commits:
                print(f"{commit.author['name']}: {commit.message}")
        """
        url = f"/organizations/{org_slug}/releases/{version}/commits/"
        data = await self._request("GET", url)
        return [ReleaseCommit.model_validate(commit) for commit in data]

    async def get_suspect_commits(
        self,
        issue_id: str,
    ) -> List[SuspectCommit]:
        """
        Get suspect commits for an issue from its latest event.

        This analyzes the stack trace and identifies commits that likely
        introduced the issue based on Sentry's attribution algorithm.

        Args:
            issue_id: Issue ID

        Returns:
            List of suspect commits with confidence scores

        Example:
            commits = await client.get_suspect_commits("12345")
            for commit in commits:
                if commit.confidence_score and commit.confidence_score > 0.8:
                    print(f"High confidence: {commit.author['name']}")
                    print(f"Message: {commit.message}")
        """
        # Get latest event to access suspect commits
        url = f"/issues/{issue_id}/events/latest/"
        data = await self._request("GET", url)

        # Extract suspect commits from event
        suspect_commits_data = data.get("suspectCommits", [])
        return [SuspectCommit.model_validate(commit) for commit in suspect_commits_data]

    async def get_release_deploys(
        self,
        org_slug: str,
        project_slug: str,
        version: str,
    ) -> List[ReleaseDeploy]:
        """
        Get deploys for a release.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            version: Release version

        Returns:
            List of deploys for the release

        Example:
            deploys = await client.get_release_deploys("my-org", "my-project", "1.0.0")
            for deploy in deploys:
                print(f"Deployed to {deploy.environment} at {deploy.date_started}")
        """
        url = f"/projects/{org_slug}/{project_slug}/releases/{version}/deploys/"
        data = await self._request("GET", url)
        return [ReleaseDeploy.model_validate(deploy) for deploy in data]

    async def get_release_by_issue(
        self,
        issue_id: str,
    ) -> Optional[str]:
        """
        Get the release version associated with an issue's latest event.

        Args:
            issue_id: Issue ID

        Returns:
            Release version string or None if no release

        Example:
            version = await client.get_release_by_issue("12345")
            if version:
                release = await client.get_release("my-org", version)
        """
        url = f"/issues/{issue_id}/events/latest/"
        data = await self._request("GET", url)
        return data.get("release", {}).get("version")
