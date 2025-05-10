# File: backend/app/routers/api/v1/analytics.py

"""
API Router for analytics endpoints compatible with the frontend
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any
import logging
import httpx

from app.services.sentry_client import SentryApiClient
from app.config import settings
from app.models.analytics import AnalyticsResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Get organization slug from settings
def get_organization_slug() -> str:
    """Get default organization slug"""
    return settings.organization_slug

# Dependency for Sentry client
async def get_sentry_client():
    """Get a Sentry API client for dependency injection"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        return SentryApiClient(client=client)

@router.get(
    "/analytics/issues/{issue_id}/impact",
    response_model=Dict[str, Any],
    summary="Get Issue Impact",
    description="Get impact statistics for an issue"
)
async def get_issue_impact(
    issue_id: str,
    stats_period: Optional[str] = Query("7d", description="Stats period (e.g., 7d, 24h, 30d)"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    logger.info(f"Fetching impact for issue: {issue_id}, period: {stats_period}")
    org_slug = get_organization_slug()
    
    try:
        # Get issue details
        issue_data = await sentry_client.get_issue_details(
            organization_slug=org_slug,
            issue_id=issue_id
        )
        
        # Get issue stats
        stats_data = await sentry_client.get_issue_stats(
            organization_slug=org_slug,
            issue_id=issue_id,
            stat="24h",
            interval=stats_period,
            environment=environment
        )
        
        # Extract impact data
        impact_data = {
            "issueId": issue_id,
            "userCount": issue_data.get("userCount", 0),
            "sessionCount": issue_data.get("sessionCount", 0),
            "eventCount": issue_data.get("count", 0),
            "firstSeen": issue_data.get("firstSeen"),
            "lastSeen": issue_data.get("lastSeen"),
            "stats": stats_data,
            "statsPeriod": stats_period
        }
        
        return impact_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching impact for issue {issue_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch issue impact: {str(e)}")

@router.get(
    "/analytics/issues/{issue_id}/frequency",
    response_model=Dict[str, Any],
    summary="Get Issue Frequency",
    description="Get frequency data for an issue over time"
)
async def get_issue_frequency(
    issue_id: str,
    stats_period: Optional[str] = Query("24h", description="Stats period (e.g., 24h, 7d, 30d)"),
    interval: Optional[str] = Query(None, description="Stats interval (e.g., 1h, 1d)"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    logger.info(f"Fetching frequency for issue: {issue_id}, period: {stats_period}")
    org_slug = get_organization_slug()
    
    try:
        # Get issue stats
        stats_data = await sentry_client.get_issue_stats(
            organization_slug=org_slug,
            issue_id=issue_id,
            stat="24h" if interval else "auto",
            interval=interval or "auto",
            environment=environment
        )
        
        # Process stats for frequency chart
        frequency_data = {
            "issueId": issue_id,
            "statsPeriod": stats_period,
            "interval": interval,
            "data": []
        }
        
        # Convert stats to chart format
        if isinstance(stats_data, list):
            frequency_data["data"] = [
                {
                    "timestamp": item[0],
                    "count": item[1]
                }
                for item in stats_data
            ]
        
        return frequency_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching frequency for issue {issue_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch issue frequency: {str(e)}")

@router.get(
    "/analytics/issues/{issue_id}/tags",
    response_model=Dict[str, Any],
    summary="Get Issue Tags Distribution",
    description="Get tag distribution for an issue"
)
async def get_issue_tags(
    issue_id: str,
    stats_period: Optional[str] = Query("7d", description="Stats period (e.g., 7d, 24h, 30d)"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    logger.info(f"Fetching tags for issue: {issue_id}")
    org_slug = get_organization_slug()
    
    try:
        # Get issue details
        issue_data = await sentry_client.get_issue_details(
            organization_slug=org_slug,
            issue_id=issue_id
        )
        
        # Extract tag data
        tags_data = {
            "issueId": issue_id,
            "tags": issue_data.get("tags", []),
            "tagsByCategory": {}
        }
        
        # Group tags by category
        for tag in issue_data.get("tags", []):
            category = tag.get("key", "unknown")
            if category not in tags_data["tagsByCategory"]:
                tags_data["tagsByCategory"][category] = []
            tags_data["tagsByCategory"][category].append({
                "value": tag.get("value"),
                "name": tag.get("name"),
                "count": tag.get("count", 0)
            })
        
        return tags_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching tags for issue {issue_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch issue tags: {str(e)}")
