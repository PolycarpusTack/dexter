"""
Ownership Client

Fetches ownership and codeowners data from Sentry including:
- Issue ownership rules
- Code owners
- Assignment suggestions
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient


class OwnershipRule(BaseModel):
    """Ownership rule for automatic assignment."""

    matcher: str  # "path", "url", "tag", etc.
    identifier: str  # The pattern to match
    owners: List[Dict[str, str]]  # List of owner objects

    class Config:
        extra = "allow"


class CodeOwner(BaseModel):
    """Code owner from CODEOWNERS file."""

    type: str  # "user", "team"
    id: str
    name: str
    email: Optional[str] = None

    class Config:
        extra = "allow"


class OwnershipSuggestion(BaseModel):
    """Suggested owner for an issue."""

    type: str  # "suspectCommit", "codeowners", "ownership"
    owner: Dict[str, Any]
    date_created: Optional[str] = Field(None, alias="dateCreated")

    class Config:
        populate_by_name = True
        extra = "allow"


class OwnershipClient(BaseDataClient[OwnershipRule]):
    """
    Client for Sentry Ownership API.

    Endpoints:
    - GET /projects/{org}/{project}/ownership/ - Get ownership rules
    - PUT /projects/{org}/{project}/ownership/ - Update ownership rules
    - GET /issues/{issue_id}/owners/ - Get ownership suggestions

    Example:
        client = OwnershipClient(token="your-token")

        # Get ownership suggestions for an issue
        suggestions = await client.get_ownership_suggestions("12345")
        for suggestion in suggestions:
            print(f"Suggested owner ({suggestion.type}): {suggestion.owner}")
    """

    async def get_ownership_rules(
        self,
        org_slug: str,
        project_slug: str,
    ) -> Dict[str, Any]:
        """
        Get ownership rules for a project.

        Args:
            org_slug: Organization slug
            project_slug: Project slug

        Returns:
            Ownership configuration
        """
        url = f"/projects/{org_slug}/{project_slug}/ownership/"
        return await self._request("GET", url)

    async def update_ownership_rules(
        self,
        org_slug: str,
        project_slug: str,
        rules: str,
    ) -> Dict[str, Any]:
        """
        Update ownership rules for a project.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            rules: Ownership rules in Sentry format

        Returns:
            Updated ownership configuration
        """
        url = f"/projects/{org_slug}/{project_slug}/ownership/"
        data = {"raw": rules}
        return await self._request("PUT", url, data=data)

    async def get_ownership_suggestions(
        self,
        issue_id: str,
    ) -> List[OwnershipSuggestion]:
        """
        Get ownership suggestions for an issue.

        This returns suggested owners based on:
        - Suspect commits
        - Code owners
        - Ownership rules

        Args:
            issue_id: Issue ID

        Returns:
            List of ownership suggestions
        """
        url = f"/issues/{issue_id}/owners/"
        data = await self._request("GET", url)

        # API returns format: {"owners": [...], "rules": [...]}
        owners_data = data.get("owners", [])
        return [OwnershipSuggestion.model_validate(owner) for owner in owners_data]

    async def get_codeowners(
        self,
        org_slug: str,
        project_slug: str,
    ) -> List[Dict[str, Any]]:
        """
        Get code owners configuration.

        Args:
            org_slug: Organization slug
            project_slug: Project slug

        Returns:
            Code owners data
        """
        url = f"/projects/{org_slug}/{project_slug}/codeowners/"
        return await self._request("GET", url)
