"""
Compatibility models for Sentry entities used in tests.

Re-export the Pydantic models from the current models.sentry module.
"""
from app.models.sentry import SentryEvent, SentryIssue  # noqa: F401
