# Backend: app/routers/enhanced_analyzers.py

"""
Enhanced API Router for specialized analyzers like PostgreSQL deadlock parsing.
This version uses the enhanced deadlock parser that provides more structured data and better analysis.
"""
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from typing import Dict, List, Any, Optional
import logging
import time

from ..services.sentry_client import SentryApiClient, get_sentry_client
from ..utils.enhanced_deadlock_parser import parse_postgresql_deadlock

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
    """Analyze a PostgreSQL deadlock error from Sentry with enhanced details."""
    start_time = time.time()
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
        
        # Parse the deadlock information using the enhanced parser
        deadlock_info = parse_postgresql_deadlock(event_details)
        
        if not deadlock_info:
            logger.warning(f"Failed to parse deadlock information for event {event_id}")
            return {
                "analysis": None,
                "error": "Unable to parse deadlock information from the error message"
            }
        
        # Success! Return the parsed deadlock info
        execution_time = time.time() - start_time
        logger.info(f"Successfully analyzed deadlock for event {event_id} in {execution_time:.2f}s")
        
        # Convert to dict for JSON response
        response_data = deadlock_info.dict()
        
        # Add metadata for monitoring
        response_data["metadata"] = {
            "execution_time_ms": int(execution_time * 1000),
            "parser_version": "enhanced-1.0.0",
            "cycles_found": len(deadlock_info.cycles),
            "severity_score": deadlock_info.severity_score
        }
        
        return {
            "analysis": response_data,
            "error": None
        }
    
    except Exception as e:
        execution_time = time.time() - start_time
        logger.exception(f"Error analyzing deadlock for event {event_id} after {execution_time:.2f}s: {str(e)}")
        
        # Provide more detailed error information
        error_context = {
            "event_id": event_id,
            "execution_time_ms": int(execution_time * 1000),
            "error_type": type(e).__name__
        }
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": f"Failed to analyze deadlock: {str(e)}",
                "context": error_context
            }
        )

@router.get(
    "/deadlock-history",
    summary="Get Deadlock History",
    description="Retrieve history of analyzed deadlocks with severity and trends.",
    response_model=Dict[str, Any],
)
async def deadlock_history_endpoint(
    days: int = Query(30, description="Number of days to look back"),
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    """Retrieve history of detected deadlocks with trends and patterns.
    
    This is a placeholder endpoint that would be implemented to track deadlock
    trends over time. It would require persistence of analyzed deadlocks.
    """
    # This would be implemented to retrieve saved deadlock analysis results
    # from a database or other storage mechanism
    
    return {
        "message": "Deadlock history feature not yet implemented",
        "planned_features": [
            "Historical trends of deadlock frequency",
            "Common tables involved in deadlocks",
            "Most severe deadlocks",
            "Recurring query patterns"
        ]
    }

@router.get(
    "/lock-compatibility-matrix",
    summary="PostgreSQL Lock Compatibility Matrix",
    description="Get the PostgreSQL lock compatibility matrix for reference.",
)
async def lock_compatibility_matrix_endpoint():
    """Return the PostgreSQL lock compatibility matrix for reference."""
    from ..utils.enhanced_deadlock_parser import LOCK_COMPATIBILITY_MATRIX, LockMode
    
    # Convert enum keys to strings for JSON response
    matrix = {}
    for mode1 in LockMode:
        matrix[mode1.value] = {}
        for mode2 in LockMode:
            matrix[mode1.value][mode2.value] = LOCK_COMPATIBILITY_MATRIX.get(mode1, {}).get(mode2, False)
    
    return {
        "matrix": matrix,
        "lock_modes": [mode.value for mode in LockMode],
        "description": """
        PostgreSQL uses a lock compatibility matrix to determine when transactions
        can acquire locks. True values indicate compatibility (both locks can be held
        simultaneously), while False values indicate conflict (the second lock will wait).
        """
    }

# Add this router to main.py
# app.include_router(enhanced_analyzers.router, prefix=API_PREFIX, tags=["Enhanced Analyzers"])
