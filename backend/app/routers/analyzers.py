# File: app/routers/analyzers.py

"""
API Router for specialized analyzers like PostgreSQL deadlock parsing.
"""
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from typing import Dict, Any, Optional
import logging

from ..services.sentry_client import SentryApiClient, get_sentry_client
from ..utils.deadlock_parser import parse_postgresql_deadlock, DeadlockInfo

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get(
    "/analyze-deadlock/{event_id}",
    summary="Analyze PostgreSQL Deadlock",
    description="Parse and analyze a PostgreSQL deadlock error to provide visualization and recommendations.",
    response_model=Dict[str, Any],
)
async def analyze_deadlock_endpoint(
    event_id: str = Path(..., description="Sentry event ID to analyze"),
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    """Analyze a PostgreSQL deadlock error from Sentry."""
    logger.info(f"Analyzing deadlock for event {event_id}")
    
    try:
        # Fetch event details from Sentry
        event_details = await sentry_client.get_event_by_id(event_id)
        
        # Check if this is a deadlock error
        is_deadlock = False
        exception_values = event_details.get("exception", {}).get("values", [])
        
        # Check for deadlock message or 40P01 error code in various places
        # 1. Check exception values
        if exception_values:
            exception_value = str(exception_values[0].get("value", ""))
            if "deadlock detected" in exception_value.lower() or "40P01" in exception_value:
                is_deadlock = True
        
        # 2. Check message field
        message = event_details.get("message", "")
        if "deadlock detected" in message.lower() or "40P01" in message:
            is_deadlock = True
            
        # 3. Check tags for error code
        tags = event_details.get("tags", {})
        if isinstance(tags, list):
            # Handle Sentry's tag format which could be a list of {key, value} dicts
            for tag in tags:
                if tag.get("key") in ["error_code", "db_error_code", "sql_state"] and tag.get("value") == "40P01":
                    is_deadlock = True
                    break
        else:
            # Handle tag format as a dictionary
            if tags.get("error_code") == "40P01" or tags.get("db_error_code") == "40P01" or tags.get("sql_state") == "40P01":
                is_deadlock = True
        
        # If not a deadlock, return early
        if not is_deadlock:
            logger.info(f"Event {event_id} is not a PostgreSQL deadlock error")
            return {
                "analysis": None,
                "error": "This event does not appear to be a PostgreSQL deadlock error (40P01)"
            }
        
        # Parse the deadlock information
        deadlock_info = parse_postgresql_deadlock(event_details)
        
        if not deadlock_info:
            logger.warning(f"Failed to parse deadlock information for event {event_id}")
            return {
                "analysis": None,
                "error": "Unable to parse deadlock information from the error message"
            }
        
        # Success! Return the parsed deadlock info
        logger.info(f"Successfully analyzed deadlock for event {event_id}")
        
        # Convert to dict for JSON response (includes visualization_data field)
        response_data = deadlock_info.dict() if hasattr(deadlock_info, 'dict') else deadlock_info
        
        return {
            "analysis": response_data,
            "error": None
        }
    
    except Exception as e:
        logger.exception(f"Error analyzing deadlock for event {event_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze deadlock: {str(e)}"
        )
