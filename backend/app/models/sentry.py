from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime


class SentryEventTag(BaseModel):
    """Represents a tag in a Sentry event."""
    key: str
    value: str


class SentryEventContext(BaseModel):
    """Represents context information in a Sentry event."""
    type: str
    data: Dict[str, Any]


class SentryEventFrame(BaseModel):
    """Represents a stack frame in a Sentry event."""
    filename: Optional[str] = None
    function: Optional[str] = None
    lineNo: Optional[int] = None
    colNo: Optional[int] = None
    context: Optional[List[List[Any]]] = None
    inApp: bool = False
    vars: Optional[Dict[str, Any]] = None


class SentryEventException(BaseModel):
    """Represents an exception in a Sentry event."""
    type: str
    value: str
    module: Optional[str] = None
    stacktrace: Optional[Dict[str, Any]] = None


class SentryEvent(BaseModel):
    """Represents a Sentry event."""
    id: str
    groupID: str
    eventID: str
    projectID: str
    title: Optional[str] = None
    message: Optional[str] = None
    dateCreated: datetime
    dateReceived: datetime
    platform: str
    user: Optional[Dict[str, Any]] = None
    tags: List[SentryEventTag] = []
    contexts: Dict[str, SentryEventContext] = {}
    entries: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}
    
    class Config:
        arbitrary_types_allowed = True


class SentryIssue(BaseModel):
    """Represents a Sentry issue (group of events)."""
    id: str
    shortId: str
    title: str
    culprit: str
    permalink: str
    level: str
    status: str
    statusDetails: Optional[Dict[str, Any]] = None
    isPublic: bool
    platform: str
    project: Dict[str, Any]
    type: str
    metadata: Dict[str, Any]
    numComments: int
    assignedTo: Optional[Dict[str, Any]] = None
    isBookmarked: bool
    isSubscribed: bool
    hasSeen: bool
    count: Optional[int] = None
    userCount: Optional[int] = None
    firstSeen: datetime
    lastSeen: datetime
    
    class Config:
        arbitrary_types_allowed = True
