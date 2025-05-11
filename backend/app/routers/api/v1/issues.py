# backend/app/routers/api/v1/issues.py

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any, List
import logging
import httpx
from fastapi import Request

from app.services.sentry_client import SentryApiClient
from app.services.config_service import ConfigService, get_config_service
from app.services.cache_service import cached, invalidate_issue_cache
from app.utils.error_handling import SentryAPIError

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Dependencies ---
async def get_sentry_client():
    # Create a new httpx.AsyncClient for the SentryApiClient
    client = httpx.AsyncClient()
    try:
        sentry_client = SentryApiClient(client)
        yield sentry_client
    finally:
        await client.aclose()

@router.get("/issues", response_model=None)
@cached(ttl=300, prefix="list_issues")  # 5 minute TTL
async def get_issues(
    request: Request,
    # Query params matching the expected frontend format
    organization: Optional[str] = Query(None, description="Organization slug/ID"),
    project: Optional[str] = Query(None, description="Project slug/ID or comma-separated list"),
    query: Optional[str] = Query("", description="Search query"),
    sort: Optional[str] = Query("timestamp", description="Sort field"),
    sort_direction: Optional[str] = Query("desc", description="Sort direction"),
    stats_period: Optional[str] = Query("24h", description="Time range"),
    level: Optional[str] = Query("", description="Error level filter"),
    page: Optional[int] = Query(1, description="Page number"),
    per_page: Optional[int] = Query(50, description="Items per page"),
    
    # Dependencies
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """
    Proxy endpoint for fetching Sentry issues.
    Accepts query parameters and forwards them to Sentry API.
    """
    try:
        # Validate required parameters
        if not organization:
            # Try to get from config
            organization = config_service.get_organization_slug()
            if not organization:
                raise HTTPException(
                    status_code=400, 
                    detail="Organization slug is required"
                )
        
        if not project:
            # Try to get from config
            project_slug = config_service.get_project_slug()
            if project_slug:
                project = project_slug
            else:
                raise HTTPException(
                    status_code=400, 
                    detail="Project slug is required"
                )
        
        # Build Sentry query based on filters
        sentry_query = []
        if query:
            sentry_query.append(query)
        if level:
            sentry_query.append(f"level:{level}")
        
        # Join query parts
        final_query = " ".join(sentry_query)
        
        # Calculate cursor based on page
        cursor = None
        if page > 1:
            # For now, we're not supporting real cursor pagination
            # This is just a placeholder
            cursor = None
        
        # Call Sentry API
        result = await sentry_client.list_project_issues(
            organization_slug=organization,
            project_slug=project,
            query=final_query,
            cursor=cursor,  # Handle pagination via cursor
            status=None if final_query else None  # Don't use status parameter if query is already built
        )
        
        # Transform the response to match frontend expectations
        issues = result.get("data", [])
        
        # Add mock pagination info
        response = {
            "issues": issues,
            "items": issues,  # For compatibility with EventsResponse
            "count": len(issues),
            "links": {
                "previous": {"cursor": None} if page == 1 else {"cursor": f"page:{page-1}"},
                "next": {"cursor": f"page:{page+1}"} if len(issues) == per_page else {"cursor": None}
            },
            "meta": {
                "total": len(issues),
                "page": page,
                "per_page": per_page
            }
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching issues: {e}")
        raise SentryAPIError(message=f"Failed to fetch issues: {str(e)}")
