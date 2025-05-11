# File: backend/app/models/issues.py

"""
Pydantic models related to Sentry Issues (Groups).
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .common import User

class IssueMetadata(BaseModel):
    type: Optional[str] = None
    value: Optional[str] = None
    filename: Optional[str] = None
    function: Optional[str] = None

class IssueSummary(BaseModel):
    id: str
    shortId: str
    title: str
    culprit: Optional[str] = None
    level: str
    status: str
    assignee: Optional[Any] = None
    isBookmarked: bool
    isPublic: bool
    hasSeen: bool
    count: str
    userCount: int
    firstSeen: datetime
    lastSeen: datetime
    project: Dict[str, Any]
    metadata: Optional[IssueMetadata] = None
    platform: Optional[str] = None # Added platform

    class Config:
        from_attributes = True

class PaginationInfo(BaseModel):
    next_cursor: Optional[str] = None
    prev_cursor: Optional[str] = None

# The model that was previously referred to as IssuePagination
class IssuePagination(BaseModel):
    next: Optional[Dict[str, Any]] = None
    prev: Optional[Dict[str, Any]] = None
    cursor: Optional[str] = None

class PaginatedIssueSummaryResponse(BaseModel):
    data: List[IssueSummary]
    pagination: PaginationInfo

# Model that matches the expected return type in the router
class IssueResponse(BaseModel):
    data: List[IssueSummary]
    pagination: IssuePagination

class IssueStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(resolved|unresolved|ignored)$")
    ignoreDuration: Optional[int] = None # Example other fields

class IssueAssignment(BaseModel):
    assignee: str = Field(..., description="User ID or email of the assignee")