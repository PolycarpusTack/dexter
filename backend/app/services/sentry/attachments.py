"""
Attachment Client

Fetches event attachments from Sentry including:
- Screenshots
- Minidumps
- Log files
- Other file attachments
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient


class Attachment(BaseModel):
    """Event attachment metadata."""

    id: str
    name: str
    type: str  # "event.attachment", "event.minidump", etc.
    size: int  # Size in bytes
    mimetype: str = Field(alias="mimetype")
    headers: Dict[str, str] = Field(default_factory=dict)

    class Config:
        populate_by_name = True
        extra = "allow"


class AttachmentClient(BaseDataClient[Attachment]):
    """
    Client for Sentry Event Attachments API.

    Endpoints:
    - GET /projects/{org}/{project}/events/{event_id}/attachments/ - List attachments
    - GET /projects/{org}/{project}/events/{event_id}/attachments/{attachment_id}/ - Download

    Example:
        client = AttachmentClient(token="your-token")
        attachments = await client.get_attachments("my-org", "my-project", "abc123")

        # Download screenshots
        for attachment in attachments:
            if "image" in attachment.mimetype:
                content = await client.download_attachment(
                    "my-org", "my-project", "abc123", attachment.id
                )
    """

    async def get_attachments(
        self,
        org_slug: str,
        project_slug: str,
        event_id: str,
    ) -> List[Attachment]:
        """
        List attachments for an event.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID

        Returns:
            List of attachment metadata
        """
        url = f"/projects/{org_slug}/{project_slug}/events/{event_id}/attachments/"
        data = await self._request("GET", url)
        return [Attachment.model_validate(att) for att in data]

    async def download_attachment(
        self,
        org_slug: str,
        project_slug: str,
        event_id: str,
        attachment_id: str,
    ) -> bytes:
        """
        Download attachment content.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID
            attachment_id: Attachment ID

        Returns:
            Attachment content as bytes
        """
        url = f"/projects/{org_slug}/{project_slug}/events/{event_id}/attachments/{attachment_id}/"

        # Build full URL
        if not url.startswith("http"):
            url = f"{self.base_url}/{url.lstrip('/')}"

        # Prepare headers
        headers = {"Authorization": f"Bearer {self.token}"}

        # Download binary content
        response = await self.client.get(url, headers=headers)
        response.raise_for_status()
        return response.content

    async def get_issue_attachments(
        self,
        org_slug: str,
        project_slug: str,
        issue_id: str,
    ) -> List[Attachment]:
        """
        Get attachments from an issue's latest event.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            issue_id: Issue ID

        Returns:
            List of attachments from latest event
        """
        # First get the latest event ID
        url = f"/issues/{issue_id}/events/latest/"
        event_data = await self._request("GET", url)
        event_id = event_data.get("id")

        if not event_id:
            return []

        # Then get attachments for that event
        return await self.get_attachments(org_slug, project_slug, event_id)
