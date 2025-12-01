"""
Alert Client

Fetches alert/incident data from Sentry including:
- Metric alerts
- Issue alerts
- Uptime monitors
- Incidents
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient


class AlertRule(BaseModel):
    """Alert rule configuration."""

    id: str
    name: str
    status: str  # "active", "disabled", etc.
    conditions: List[Dict[str, Any]] = Field(default_factory=list)
    actions: List[Dict[str, Any]] = Field(default_factory=list)
    date_created: datetime = Field(alias="dateCreated")

    class Config:
        populate_by_name = True
        extra = "allow"


class Incident(BaseModel):
    """Incident/alert triggered event."""

    id: str
    identifier: str
    organization_id: str = Field(alias="organizationId")
    status: str  # "open", "closed", "critical", "warning"
    status_method: str = Field(alias="statusMethod")
    type: str  # Type of incident
    title: str
    date_started: datetime = Field(alias="dateStarted")
    date_detected: datetime = Field(alias="dateDetected")
    date_closed: Optional[datetime] = Field(None, alias="dateClosed")

    class Config:
        populate_by_name = True
        extra = "allow"


class UptimeMonitor(BaseModel):
    """Uptime/cron monitor."""

    id: str
    name: str
    slug: str
    status: str  # "active", "disabled", "error", "ok"
    type: str  # "cron_job", "uptime"
    config: Dict[str, Any] = Field(default_factory=dict)
    date_created: datetime = Field(alias="dateCreated")

    class Config:
        populate_by_name = True
        extra = "allow"


class AlertClient(BaseDataClient[AlertRule]):
    """
    Client for Sentry Alerts/Incidents API.

    Endpoints:
    - GET /organizations/{org}/alert-rules/ - List metric alert rules
    - GET /projects/{org}/{project}/rules/ - List issue alert rules
    - GET /organizations/{org}/incidents/ - List incidents
    - GET /organizations/{org}/monitors/ - List uptime monitors

    Example:
        client = AlertClient(token="your-token")

        # Get all active incidents
        incidents = await client.get_incidents("my-org", status="open")

        # Get alert rules
        rules = await client.get_metric_alert_rules("my-org")
    """

    async def get_metric_alert_rules(
        self,
        org_slug: str,
        project: Optional[str] = None,
    ) -> List[AlertRule]:
        """
        List metric alert rules.

        Args:
            org_slug: Organization slug
            project: Project slug to filter by

        Returns:
            List of metric alert rules
        """
        url = f"/organizations/{org_slug}/alert-rules/"

        params: Dict[str, Any] = {}
        if project:
            params["project"] = project

        data = await self._request("GET", url, params=params)
        return [AlertRule.model_validate(rule) for rule in data]

    async def get_issue_alert_rules(
        self,
        org_slug: str,
        project_slug: str,
    ) -> List[AlertRule]:
        """
        List issue alert rules for a project.

        Args:
            org_slug: Organization slug
            project_slug: Project slug

        Returns:
            List of issue alert rules
        """
        url = f"/projects/{org_slug}/{project_slug}/rules/"
        data = await self._request("GET", url)
        return [AlertRule.model_validate(rule) for rule in data]

    async def get_alert_rule(
        self,
        org_slug: str,
        rule_id: str,
    ) -> AlertRule:
        """
        Get metric alert rule details.

        Args:
            org_slug: Organization slug
            rule_id: Alert rule ID

        Returns:
            Alert rule details
        """
        url = f"/organizations/{org_slug}/alert-rules/{rule_id}/"
        data = await self._request("GET", url)
        return AlertRule.model_validate(data)

    async def get_incidents(
        self,
        org_slug: str,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[Incident]:
        """
        List incidents.

        Args:
            org_slug: Organization slug
            status: Filter by status (open, closed, critical, warning)
            limit: Maximum results

        Returns:
            List of incidents
        """
        url = f"/organizations/{org_slug}/incidents/"

        params: Dict[str, Any] = {"per_page": min(limit, 100)}
        if status:
            params["status"] = status

        data = await self._request("GET", url, params=params)
        return [Incident.model_validate(incident) for incident in data]

    async def get_incident(
        self,
        org_slug: str,
        incident_id: str,
    ) -> Incident:
        """
        Get incident details.

        Args:
            org_slug: Organization slug
            incident_id: Incident ID

        Returns:
            Incident details
        """
        url = f"/organizations/{org_slug}/incidents/{incident_id}/"
        data = await self._request("GET", url)
        return Incident.model_validate(data)

    async def get_monitors(
        self,
        org_slug: str,
        project: Optional[str] = None,
    ) -> List[UptimeMonitor]:
        """
        List uptime/cron monitors.

        Args:
            org_slug: Organization slug
            project: Project slug to filter by

        Returns:
            List of monitors
        """
        url = f"/organizations/{org_slug}/monitors/"

        params: Dict[str, Any] = {}
        if project:
            params["project"] = project

        data = await self._request("GET", url, params=params)
        return [UptimeMonitor.model_validate(monitor) for monitor in data]

    async def get_monitor(
        self,
        org_slug: str,
        monitor_slug: str,
    ) -> UptimeMonitor:
        """
        Get monitor details.

        Args:
            org_slug: Organization slug
            monitor_slug: Monitor slug

        Returns:
            Monitor details
        """
        url = f"/organizations/{org_slug}/monitors/{monitor_slug}/"
        data = await self._request("GET", url)
        return UptimeMonitor.model_validate(data)
