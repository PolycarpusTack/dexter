# File: backend/app/routers/api/v1/__init__.py

"""
API v1 module for frontend-compatible routes
"""

from . import (
    alert_health,
    analytics,
    chaos_testing,
    events,
    external_apis,
    issues,
    memory_leak,
    n_plus_one,
)

__all__ = [
    "issues",
    "events",
    "analytics",
    "external_apis",
    "memory_leak",
    "n_plus_one",
    "alert_health",
    "chaos_testing",
]
