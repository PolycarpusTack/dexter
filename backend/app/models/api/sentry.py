from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

# Existing Sentry models - maintains backward compatibility
# This file contains custom model definitions that override or extend
# the auto-generated models in sentry_generated.py

# Custom event type with additional fields


class SentryCustomEvent(BaseModel):
    """Extended Sentry event with custom metadata support"""

    id: str
    project_slug: str = Field(..., alias="projectID")
    title: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    deadlock_info: Optional[Dict[str, Any]] = None

    class Config:
        allow_population_by_field_name = True


# Custom API response wrapper


class SentryApiResponse(BaseModel):
    """Generic API response wrapper"""

    data: Any
    headers: Optional[Dict[str, str]] = None
    error: Optional[Dict[str, Any]] = None


# Paginated response


class SentryPaginatedResponse(SentryApiResponse):
    """Paginated API response"""

    cursor: Optional[str] = None
    has_more: bool = False


# Custom issue with extended stats


class SentryIssueWithStats(BaseModel):
    """Sentry issue with additional statistical information"""

    id: str
    title: str
    stats: Dict[str, List[List[int]]]
    user_report_count: Optional[int] = None
    subscription_details: Optional[Dict[str, Any]] = None

    class Config:
        allow_population_by_field_name = True
