"""
API endpoints for N+1 query analysis.

This module provides endpoints for analyzing Sentry events for N+1 query patterns
and generating optimization recommendations.
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from app.services.n_plus_one_service import N1QueryService, get_n1_query_service
from app.services.sentry_client import SentryApiClient, get_sentry_client

router = APIRouter(prefix="/n-plus-one", tags=["N+1 Query Analysis"])


@router.get(
    "/analyze/{event_id}",
    response_model=Dict[str, Any],
    response_model_exclude_none=True,
)
async def analyze_n_plus_one(
    event_id: str,
    use_enhanced: bool = Query(False, description="Use enhanced analysis techniques"),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    n1_service: N1QueryService = Depends(get_n1_query_service),
):
    """
    Analyze a Sentry event for N+1 query patterns.

    This endpoint fetches an event from Sentry and analyzes it for N+1 query patterns,
    which occur when an application executes multiple queries to retrieve related data
    instead of using more efficient approaches like JOINs.

    Args:
        event_id: Sentry event ID to analyze
        use_enhanced: Use enhanced analysis techniques (more CPU intensive)

    Returns:
        Analysis results with visualization data and recommendations
    """
    # Set up the service with the Sentry client
    n1_service.sentry_client = sentry_client

    # Analyze the event
    result = await n1_service.analyze_event_by_id(event_id, use_enhanced)

    if not result or not result.get("success"):
        error_msg = (
            result.get("error", "Failed to analyze event")
            if result
            else "No N+1 query patterns detected"
        )
        raise HTTPException(status_code=404, detail=error_msg)

    return result


@router.post("/analyze", response_model=Dict[str, Any], response_model_exclude_none=True)
async def analyze_n_plus_one_data(
    event_data: Dict[str, Any],
    use_enhanced: bool = Query(False, description="Use enhanced analysis techniques"),
    n1_service: N1QueryService = Depends(get_n1_query_service),
):
    """
    Analyze event data directly for N+1 query patterns.

    This endpoint accepts event data directly in the request body and analyzes it
    for N+1 query patterns without fetching from Sentry.

    Args:
        event_data: Sentry event data to analyze
        use_enhanced: Use enhanced analysis techniques (more CPU intensive)

    Returns:
        Analysis results with visualization data and recommendations
    """
    result = await n1_service.analyze_event(event_data, use_enhanced)

    if not result or not result.get("success"):
        error_msg = (
            result.get("error", "Failed to analyze event")
            if result
            else "No N+1 query patterns detected"
        )
        raise HTTPException(status_code=404, detail=error_msg)

    return result
