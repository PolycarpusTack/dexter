# File: backend/app/models/analytics.py

"""
Data models for analytics endpoints
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class AnalyticsResponse(BaseModel):
    """Response model for analytics data"""
    data: Dict[str, Any]
    meta: Optional[Dict[str, Any]] = None
    links: Optional[Dict[str, Any]] = None


class ImpactData(BaseModel):
    """Impact data for an issue"""
    issueId: str
    userCount: int
    sessionCount: int
    eventCount: int
    firstSeen: Optional[str] = None
    lastSeen: Optional[str] = None
    stats: Optional[List[List[Any]]] = None
    statsPeriod: str


class FrequencyData(BaseModel):
    """Frequency data for an issue"""
    issueId: str
    statsPeriod: str
    interval: Optional[str] = None
    data: List[Dict[str, Any]]


class TagDistribution(BaseModel):
    """Tag distribution for an issue"""
    issueId: str
    tags: List[Dict[str, Any]]
    tagsByCategory: Dict[str, List[Dict[str, Any]]]
