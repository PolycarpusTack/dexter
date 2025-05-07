# File: backend/app/models/events.py

"""
Pydantic models related to Sentry Events (specific occurrences).
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from .common import User, Tag

class Breadcrumb(BaseModel):
    timestamp: Optional[datetime] = None
    type: Optional[str] = None
    category: Optional[str] = None
    message: Optional[str] = None
    level: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class StacktraceFrame(BaseModel):
    filename: Optional[str] = None
    abs_path: Optional[HttpUrl | str] = None
    module: Optional[str] = None
    function: Optional[str] = None
    lineno: Optional[int] = None
    colno: Optional[int] = None
    pre_context: Optional[List[str]] = None
    context_line: Optional[str] = None
    post_context: Optional[List[str]] = None
    in_app: Optional[bool] = None
    vars: Optional[Dict[str, Any]] = None

class Stacktrace(BaseModel):
    frames: Optional[List[StacktraceFrame]] = None
    frames_omitted: Optional[List[int]] = None
    has_system_frames: Optional[bool] = None

class ExceptionValue(BaseModel):
    type: Optional[str] = None
    value: Optional[str] = None
    module: Optional[str] = None
    stacktrace: Optional[Stacktrace] = None # Include nested stacktrace

class SentryException(BaseModel):
    values: Optional[List[ExceptionValue]] = None

class EventDetail(BaseModel):
    eventID: str
    id: str
    projectID: Optional[int] = Field(None, alias='project')
    issueId: Optional[str] = None # Sentry API for single event doesn't always include issue ID directly, might need resolving
    title: str
    culprit: Optional[str] = None
    message: Optional[str] = None
    platform: str
    level: str
    timestamp: datetime
    dateCreated: Optional[datetime] = None
    dateReceived: Optional[datetime] = None
    user: Optional[User] = None
    contexts: Optional[Dict[str, Any]] = None
    sdk: Optional[Dict[str, Any]] = None
    entries: List[Dict[str, Any]]
    tags: List[Tag]
    errors: Optional[List[Dict[str, Any]]] = None
    fingerprint: Optional[List[str]] = None
    # Extracted fields (can be derived from entries if needed)
    exception: Optional[SentryException] = None
    breadcrumbs: Optional[List[Breadcrumb]] = None
    request: Optional[Dict[str, Any]] = None
    stacktrace: Optional[Stacktrace] = None # Sometimes top-level exists

    # Include our custom parsed field if present
    dexterParsedDeadlock: Optional[Dict[str, Any]] = Field(None, alias='dexterParsedDeadlock') # Placeholder for parsed data

    class Config:
        from_attributes = True
        populate_by_name = True # Allow alias mapping