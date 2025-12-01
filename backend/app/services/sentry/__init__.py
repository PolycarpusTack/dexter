"""
Sentry Data Client Framework

This package provides a comprehensive, modular framework for fetching data
from 11+ Sentry API endpoints with consistent error handling, rate limiting,
circuit breaker patterns, and exponential backoff retry logic.

Usage:
    from app.services.sentry.releases import ReleaseClient
    from app.services.sentry.performance import PerformanceClient

    release_client = ReleaseClient(token="your-token")
    releases = await release_client.get_releases(org_slug="my-org", project_slug="my-project")

Available Clients:
    - ReleaseClient: Release and suspect commit data
    - PerformanceClient: Transaction events and performance spans
    - ProfilingClient: Profiling data
    - SessionClient: Session replays
    - BreadcrumbClient: Event breadcrumbs
    - AlertClient: Incidents, alerts, and monitors
    - AttachmentClient: Event attachments
    - TagClient: Issue tags
    - OwnershipClient: Issue ownership and codeowners
    - MeasurementClient: Event measurements (web vitals, custom metrics)
    - GroupingClient: Grouping variants and fingerprints
"""

from .alerts import AlertClient
from .attachments import AttachmentClient
from .base_client import BaseDataClient
from .breadcrumbs import BreadcrumbClient
from .circuit_breaker import CircuitBreaker, CircuitBreakerError, CircuitOpenError
from .grouping import GroupingClient
from .measurements import MeasurementClient
from .ownership import OwnershipClient
from .performance import PerformanceClient
from .profiling import ProfilingClient
from .rate_limiter import RateLimiter, RateLimitExceededError
from .releases import ReleaseClient
from .sessions import SessionClient
from .tags import TagClient

__all__ = [
    # Base infrastructure
    "BaseDataClient",
    "RateLimiter",
    "RateLimitExceededError",
    "CircuitBreaker",
    "CircuitBreakerError",
    "CircuitOpenError",
    # Data clients
    "ReleaseClient",
    "PerformanceClient",
    "ProfilingClient",
    "SessionClient",
    "BreadcrumbClient",
    "AlertClient",
    "AttachmentClient",
    "TagClient",
    "OwnershipClient",
    "MeasurementClient",
    "GroupingClient",
]
