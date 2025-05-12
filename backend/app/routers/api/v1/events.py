# File: backend/app/routers/api/v1/events.py

"""
API Router for frontend-compatible event endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any, List
import logging
import httpx

from app.services.sentry_client import SentryApiClient
from app.core.settings import settings
from app.utils.enhanced_deadlock_parser import parse_postgresql_deadlock, model_to_dict

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
    "/issue/{issue_id}/events",
    response_model=Dict[str, Any],
    summary="List Issue Events",
    description="Returns a list of events for a specific issue"
)
async def list_issue_events(
    issue_id: str,
    limit: Optional[int] = Query(50, description="Number of events to return"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    sort: Optional[str] = Query("-timestamp", description="Sort field"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    logger.info(f"Listing events for issue: {issue_id}, limit: {limit}, sort: {sort}")
    org_slug = get_organization_slug()
    
    try:
        # Use the Sentry client to fetch events
        events_data = await sentry_client.list_issue_events(
            organization_slug=org_slug,
            issue_id=issue_id,
            cursor=cursor,
            environment=environment
        )
        
        # Process deadlock parsing for each event if applicable
        for event in events_data.get("data", []):
            try:
                is_potential_deadlock = False
                exception_values = event.get("exception", {}).get("values", [])
                if exception_values and "40P01" in str(exception_values[0].get("value", "")):
                    is_potential_deadlock = True
                
                if is_potential_deadlock:
                    deadlock_info = parse_postgresql_deadlock(event)
                    if deadlock_info:
                        event["dexterParsedDeadlock"] = model_to_dict(deadlock_info)
            except Exception as e:
                logger.warning(f"Error parsing deadlock for event: {str(e)}")
        
        # Format response to match frontend expectations
        response = {
            "events": events_data.get("data", []),
            "links": events_data.get("links", {}),
            "meta": events_data.get("meta", {})
        }
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error listing events for issue {issue_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list issue events: {str(e)}")

@router.get(
    "/event/{event_id}",
    response_model=Dict[str, Any],
    summary="Get Event Details",
    description="Retrieve the full details for a specific event occurrence"
)
async def get_event_details(
    event_id: str,
    project_id: Optional[str] = Query(None, description="Project ID"),
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    logger.info(f"Fetching details for event ID: {event_id}")
    org_slug = get_organization_slug()
    
    # Get project slug
    project_slug = project_id if project_id else settings.project_slug
    
    try:
        event_data = await sentry_client.get_event_details(
            organization_slug=org_slug,
            project_slug=project_slug,
            event_id=event_id
        )
        
        # Try to parse deadlock if applicable
        try:
            is_potential_deadlock = False
            exception_values = event_data.get("exception", {}).get("values", [])
            if exception_values and "40P01" in str(exception_values[0].get("value", "")):
                is_potential_deadlock = True
            
            if is_potential_deadlock:
                deadlock_info = parse_postgresql_deadlock(event_data)
                if deadlock_info:
                    event_data["dexterParsedDeadlock"] = model_to_dict(deadlock_info)
        except Exception as e:
            logger.warning(f"Error in deadlock parsing for event {event_id}: {str(e)}")
        
        return event_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching event details for {event_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch event details: {str(e)}")

@router.get(
    "/events",
    response_model=Dict[str, Any],
    summary="List Events",
    description="List events with filtering"
)
async def list_events(
    query: Optional[str] = Query(None, description="Search query"),
    limit: Optional[int] = Query(50, description="Number of events to return"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    logger.info(f"Listing events with query: {query}, limit: {limit}")
    org_slug = get_organization_slug()
    
    try:
        # Build the URL with query parameters
        url = f"{sentry_client.base_url}/organizations/{org_slug}/events/"
        params = {}
        
        if query:
            params["query"] = query
        if limit:
            params["limit"] = limit
        if cursor:
            params["cursor"] = cursor
        if environment:
            params["environment"] = environment
        if project_id:
            params["project"] = project_id
        
        # Make direct API call
        response = await sentry_client._make_request("GET", url, params=params)
        
        # Format response
        return {
            "events": response.get("data", []),
            "links": response.get("links", {}),
            "meta": response.get("meta", {})
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error listing events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list events: {str(e)}")

@router.get(
    "/user/{user_id}/events",
    response_model=Dict[str, Any],
    summary="List User Events",
    description="List events for a specific user"
)
async def list_user_events(
    user_id: str,
    limit: Optional[int] = Query(50, description="Number of events to return"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    logger.info(f"Listing events for user: {user_id}")
    org_slug = get_organization_slug()
    
    try:
        # Build query for user events
        query = f"user.id:{user_id}"
        
        # Use the list_events endpoint with user filter
        return await list_events(
            query=query,
            limit=limit,
            cursor=cursor,
            environment=environment,
            sentry_client=sentry_client
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error listing events for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list user events: {str(e)}")
