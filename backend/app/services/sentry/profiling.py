"""
Profiling Client

Fetches profiling data from Sentry including:
- Profiling profiles
- Flamegraphs
- Function performance data
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient


class ProfileFunction(BaseModel):
    """Function in a profile."""

    name: str
    package: Optional[str] = None
    in_app: bool = Field(default=False, alias="inApp")
    self_times_ns: List[int] = Field(default_factory=list, alias="selfTimesNs")

    class Config:
        populate_by_name = True
        extra = "allow"


class Profile(BaseModel):
    """Profiling profile data."""

    profile_id: str = Field(alias="id")
    transaction_name: str = Field(alias="transactionName")
    trace_id: str = Field(alias="traceId")
    timestamp: datetime
    platform: str
    duration_ns: int = Field(alias="durationNs")
    device_classification: Optional[str] = Field(None, alias="deviceClassification")

    @property
    def duration_ms(self) -> float:
        """Convert duration from nanoseconds to milliseconds."""
        return self.duration_ns / 1_000_000

    class Config:
        populate_by_name = True
        extra = "allow"


class ProfileFrame(BaseModel):
    """A frame in a profiling call stack."""

    function: str
    file: Optional[str] = None
    line: Optional[int] = None
    package: Optional[str] = None
    in_app: bool = Field(default=False, alias="inApp")
    self_time_ns: int = Field(default=0, alias="selfTimeNs")
    total_time_ns: int = Field(default=0, alias="totalTimeNs")

    @property
    def self_time_ms(self) -> float:
        """Convert self time from nanoseconds to milliseconds."""
        return self.self_time_ns / 1_000_000

    @property
    def total_time_ms(self) -> float:
        """Convert total time from nanoseconds to milliseconds."""
        return self.total_time_ns / 1_000_000

    class Config:
        populate_by_name = True
        extra = "allow"


class ProfilingClient(BaseDataClient[Profile]):
    """
    Client for Sentry Profiling API.

    Endpoints:
    - GET /organizations/{org}/profiling/profiles/ - List profiles
    - GET /organizations/{org}/profiling/profiles/{profile_id}/ - Get profile details

    Example:
        client = ProfilingClient(token="your-token")
        profiles = await client.get_profiles("my-org", project="my-project")

        # Find slow profiles
        slow_profiles = [p for p in profiles if p.duration_ms > 1000]
    """

    async def get_profiles(
        self,
        org_slug: str,
        project: Optional[str] = None,
        limit: int = 50,
        query: Optional[str] = None,
    ) -> List[Profile]:
        """
        List profiling profiles.

        Args:
            org_slug: Organization slug
            project: Project slug to filter by
            limit: Maximum results
            query: Additional query filter

        Returns:
            List of profiles
        """
        url = f"/organizations/{org_slug}/profiling/profiles/"

        params: Dict[str, Any] = {"per_page": min(limit, 100)}
        if project:
            params["project"] = project
        if query:
            params["query"] = query

        data = await self._request("GET", url, params=params)
        profiles = data.get("data", [])
        return [Profile.model_validate(profile) for profile in profiles]

    async def get_profile(
        self,
        org_slug: str,
        profile_id: str,
    ) -> Profile:
        """
        Get profile details.

        Args:
            org_slug: Organization slug
            profile_id: Profile ID

        Returns:
            Profile details
        """
        url = f"/organizations/{org_slug}/profiling/profiles/{profile_id}/"
        data = await self._request("GET", url)
        return Profile.model_validate(data)

    async def get_profiles_for_issue(
        self,
        issue_id: str,
        org_slug: Optional[str] = None,
        project: Optional[str] = None,
        limit: int = 10,
    ) -> List[Profile]:
        """
        Fetch profiling data for a specific issue.

        Args:
            issue_id: Sentry issue ID
            org_slug: Organization slug (optional if set in token context)
            project: Project slug (optional filter)
            limit: Maximum number of profiles to fetch

        Returns:
            List of profiles associated with the issue
        """
        query = f"issue.id:{issue_id}"

        if not org_slug:
            # Try to get from environment or use default
            org_slug = "sentry"  # Will be overridden by actual implementation

        return await self.get_profiles(
            org_slug=org_slug,
            project=project,
            limit=limit,
            query=query,
        )

    async def get_profile_functions(
        self,
        org_slug: str,
        profile_id: str,
    ) -> List[ProfileFrame]:
        """
        Extract function-level profiling data from a profile.

        Args:
            org_slug: Organization slug
            profile_id: Profile ID

        Returns:
            List of profiled functions with timing data
        """
        url = f"/organizations/{org_slug}/profiling/profiles/{profile_id}/flamegraph/"

        try:
            data = await self._request("GET", url)

            # Extract frames from flamegraph data
            frames = []
            if isinstance(data, dict):
                # Parse flamegraph structure to extract function timings
                frames_data = data.get("frames", [])
                for frame_data in frames_data:
                    try:
                        frame = ProfileFrame.model_validate(frame_data)
                        frames.append(frame)
                    except Exception:
                        # Skip invalid frames
                        continue

            return frames
        except Exception:
            # If flamegraph endpoint fails, return empty list
            # This allows graceful degradation
            return []

    def extract_hotspots(
        self,
        frames: List[ProfileFrame],
        top_n: int = 10,
        min_time_ms: float = 10.0,
    ) -> List[Dict[str, Any]]:
        """
        Extract top N slowest functions (hotspots) from profiling frames.

        Args:
            frames: List of profiling frames
            top_n: Number of top functions to return
            min_time_ms: Minimum self-time in milliseconds to consider

        Returns:
            List of hotspot dictionaries with function details
        """
        # Filter frames by minimum time threshold
        significant_frames = [
            frame for frame in frames
            if frame.self_time_ms >= min_time_ms
        ]

        # Sort by self time descending
        sorted_frames = sorted(
            significant_frames,
            key=lambda f: f.self_time_ms,
            reverse=True
        )

        # Extract top N
        hotspots = []
        for frame in sorted_frames[:top_n]:
            hotspots.append({
                "function": frame.function,
                "file": frame.file,
                "line": frame.line,
                "package": frame.package,
                "in_app": frame.in_app,
                "self_time_ms": frame.self_time_ms,
                "total_time_ms": frame.total_time_ms,
            })

        return hotspots

    def build_flamegraph_data(
        self,
        frames: List[ProfileFrame],
        max_depth: int = 20,
    ) -> Dict[str, Any]:
        """
        Build simplified flamegraph data for visualization.

        Args:
            frames: List of profiling frames
            max_depth: Maximum call stack depth to include

        Returns:
            Simplified flamegraph structure
        """
        if not frames:
            return {"nodes": [], "total_time_ms": 0}

        # Calculate total time
        total_time_ms = sum(f.self_time_ms for f in frames)

        # Build simplified node structure
        nodes = []
        for i, frame in enumerate(frames[:max_depth]):
            nodes.append({
                "id": i,
                "function": frame.function,
                "file": frame.file,
                "self_time_ms": frame.self_time_ms,
                "total_time_ms": frame.total_time_ms,
                "percentage": (frame.self_time_ms / total_time_ms * 100) if total_time_ms > 0 else 0,
                "in_app": frame.in_app,
            })

        return {
            "nodes": nodes,
            "total_time_ms": total_time_ms,
            "max_depth": min(len(frames), max_depth),
        }
