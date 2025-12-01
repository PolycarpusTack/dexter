"""
Measurement Client

Fetches measurement data from Sentry events including:
- Web Vitals (FCP, LCP, FID, CLS, TTFB)
- Custom measurements
- Performance metrics
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient


class Measurement(BaseModel):
    """Event measurement (web vitals, custom metrics)."""

    name: str
    value: float
    unit: str  # "millisecond", "none", etc.

    class Config:
        extra = "allow"


class WebVitals(BaseModel):
    """Web vitals measurements."""

    fcp: Optional[float] = None  # First Contentful Paint
    lcp: Optional[float] = None  # Largest Contentful Paint
    fid: Optional[float] = None  # First Input Delay
    cls: Optional[float] = None  # Cumulative Layout Shift
    ttfb: Optional[float] = None  # Time to First Byte
    fp: Optional[float] = None  # First Paint

    @property
    def is_good_lcp(self) -> bool:
        """Check if LCP is within good threshold (<2.5s)."""
        return self.lcp is not None and self.lcp < 2500

    @property
    def is_good_fid(self) -> bool:
        """Check if FID is within good threshold (<100ms)."""
        return self.fid is not None and self.fid < 100

    @property
    def is_good_cls(self) -> bool:
        """Check if CLS is within good threshold (<0.1)."""
        return self.cls is not None and self.cls < 0.1

    class Config:
        extra = "allow"


class MeasurementClient(BaseDataClient[Measurement]):
    """
    Client for Sentry Measurements API.

    Measurements include:
    - Web Vitals (FCP, LCP, FID, CLS, TTFB)
    - Custom measurements
    - Performance metrics

    Example:
        client = MeasurementClient(token="your-token")

        # Get web vitals from an event
        vitals = await client.get_web_vitals("my-org", "my-project", "event123")
        if not vitals.is_good_lcp:
            print(f"Poor LCP: {vitals.lcp}ms")

        # Get all measurements
        measurements = await client.get_measurements("my-org", "my-project", "event123")
    """

    async def get_measurements(
        self,
        org_slug: str,
        project_slug: str,
        event_id: str,
    ) -> List[Measurement]:
        """
        Get all measurements from an event.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID

        Returns:
            List of measurements
        """
        url = f"/projects/{org_slug}/{project_slug}/events/{event_id}/"
        data = await self._request("GET", url)

        measurements_data = data.get("measurements", {})
        return [
            Measurement.model_validate({"name": name, **value})
            for name, value in measurements_data.items()
        ]

    async def get_web_vitals(
        self,
        org_slug: str,
        project_slug: str,
        event_id: str,
    ) -> WebVitals:
        """
        Get web vitals from an event.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID

        Returns:
            Web vitals data
        """
        url = f"/projects/{org_slug}/{project_slug}/events/{event_id}/"
        data = await self._request("GET", url)

        measurements_data = data.get("measurements", {})

        # Extract web vitals
        vitals = {
            "fcp": measurements_data.get("fcp", {}).get("value"),
            "lcp": measurements_data.get("lcp", {}).get("value"),
            "fid": measurements_data.get("fid", {}).get("value"),
            "cls": measurements_data.get("cls", {}).get("value"),
            "ttfb": measurements_data.get("ttfb", {}).get("value"),
            "fp": measurements_data.get("fp", {}).get("value"),
        }

        return WebVitals.model_validate(vitals)

    async def get_issue_measurements(
        self,
        issue_id: str,
    ) -> List[Measurement]:
        """
        Get measurements from an issue's latest event.

        Args:
            issue_id: Issue ID

        Returns:
            List of measurements
        """
        url = f"/issues/{issue_id}/events/latest/"
        data = await self._request("GET", url)

        measurements_data = data.get("measurements", {})
        return [
            Measurement.model_validate({"name": name, **value})
            for name, value in measurements_data.items()
        ]

    async def get_custom_measurements(
        self,
        org_slug: str,
        project_slug: str,
        event_id: str,
    ) -> List[Measurement]:
        """
        Get custom (non-web-vital) measurements from an event.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID

        Returns:
            List of custom measurements
        """
        all_measurements = await self.get_measurements(org_slug, project_slug, event_id)

        # Filter out standard web vitals
        web_vital_names = {"fcp", "lcp", "fid", "cls", "ttfb", "fp"}
        return [m for m in all_measurements if m.name.lower() not in web_vital_names]
