# File: backend/app/routers/events.py

"""
API Router for Sentry Events (specific occurrences).
"""
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..services.sentry_client import SentryApiClient

# Use the enhanced deadlock parser instead of the stub
from ..utils.enhanced_deadlock_parser import model_to_dict, parse_postgresql_deadlock
from ..utils.error_handlers import (
    create_success_response,
    error_handler,
    handle_sentry_api_error,
    validate_required_params,
)

# EventDetail model is not currently used as response model

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Dependency ---


async def get_sentry_client():
    """Get a properly configured Sentry API client"""
    # Get token from settings or config service
    from ..core.settings import settings
    from ..services.config_service import get_config_service

    try:
        config_service = get_config_service()
        config = config_service.get_config()
        token = config.sentry_api_token or settings.get_sentry_token()
    except:
        token = settings.get_sentry_token()

    return SentryApiClient(token=token)


# --- Endpoints ---
@router.get(
    "/organizations/{organization_slug}/projects/{project_slug}/events/{event_id}",
    response_model=Dict[str, Any],  # Keep flexible Dict for complex/varying event structure
    # response_model=EventDetail, # Switch to this if model coverage is good enough
    summary="Get Event Details",
    description="Retrieve the full details for a specific event occurrence. Attempts to parse deadlock info if relevant.",
)
@error_handler(context="get_event_details", default_message="Failed to retrieve event details")
async def get_event_details_endpoint(
    organization_slug: str,
    project_slug: str,
    event_id: str,
    sentry_client: SentryApiClient = Depends(get_sentry_client),
):
    # Validate required parameters
    validate_required_params(
        organization_slug=organization_slug, project_slug=project_slug, event_id=event_id
    )

    logger.info(f"Fetching details for event ID: {event_id} in {organization_slug}/{project_slug}")

    try:
        event_data = await sentry_client.get_event_details(
            organization_slug=organization_slug, project_slug=project_slug, event_id=event_id
        )
    except Exception as e:
        raise handle_sentry_api_error(e, "get event details")

    # --- Deadlock Parsing Section (using enhanced parser) ---
    try:
        is_potential_deadlock = False
        exception_values = event_data.get("exception", {}).get("values", [])
        # Basic check on exception value - enhance if needed
        if exception_values and "40P01" in str(exception_values[0].get("value", "")):
            is_potential_deadlock = True
            # Could also check tags: e.g., if tag['sqlstate'] == '40P01'

        deadlock_info_result = None
        if is_potential_deadlock:
            logger.info(
                f"Event {event_id} identified as potential deadlock, attempting parse using enhanced parser."
            )
            # Call the parser
            deadlock_info_result = parse_postgresql_deadlock(
                event_data
            )  # Returns DeadlockInfo or None
            # Attach result to response, even if None (indicates attempt was made)
            if deadlock_info_result:
                event_data["dexterParsedDeadlock"] = model_to_dict(deadlock_info_result)
                logger.info(f"Enhanced deadlock parser returned info for event {event_id}.")
            else:
                event_data["dexterParsedDeadlock"] = None
                logger.info(f"Enhanced deadlock parser returned None for event {event_id}.")
    except Exception as e:
        logger.exception(f"Error in deadlock parsing for event {event_id}: {str(e)}")
        # Don't fail the whole request if just the deadlock parsing fails
        event_data["dexterParsedDeadlock"] = None
    # --- End Deadlock Parsing Section ---

    # Return potentially augmented event data using standardized response format
    return create_success_response(
        data=event_data,
        message="Event details retrieved successfully",
        metadata={
            "organization_slug": organization_slug,
            "project_slug": project_slug,
            "event_id": event_id,
            "has_deadlock_analysis": "dexterParsedDeadlock" in event_data,
        },
    )


@router.get(
    "/organizations/{organization_slug}/issues/{issue_id}/events",
    response_model=Dict[str, Any],
    summary="List Issue Events",
    description="Returns a list of events for a specific issue.",
)
async def list_issue_events_endpoint(
    organization_slug: str,
    issue_id: str,
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    environment: Optional[str] = Query(None, description="Filter events by environment"),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
):
    logger.info(f"Listing events for issue: {issue_id}")
    events_data = await sentry_client.list_issue_events(
        organization_slug=organization_slug,
        issue_id=issue_id,
        cursor=cursor,
        environment=environment,
    )
    return events_data


@router.get(
    "/organizations/{organization_slug}/issues/{issue_id}/events/{event_id}",
    response_model=Dict[str, Any],
    summary="Get Issue Event",
    description="Retrieves a specific event for an issue. The event_id can be a specific ID or one of: 'latest', 'oldest', or 'recommended'.",
)
async def get_issue_event_endpoint(
    organization_slug: str,
    issue_id: str,
    event_id: str,
    environment: Optional[str] = Query(None, description="Filter by environment"),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
):
    logger.info(f"Fetching event '{event_id}' for issue: {issue_id}")
    event_data = await sentry_client.get_issue_event(
        organization_slug=organization_slug,
        issue_id=issue_id,
        event_id=event_id,
        environment=environment,
    )

    # --- Deadlock Parsing Section (using enhanced parser) ---
    try:
        is_potential_deadlock = False
        exception_values = event_data.get("exception", {}).get("values", [])
        # Basic check on exception value - enhance if needed
        if exception_values and "40P01" in str(exception_values[0].get("value", "")):
            is_potential_deadlock = True
            # Could also check tags: e.g., if tag['sqlstate'] == '40P01'

        deadlock_info_result = None
        if is_potential_deadlock:
            logger.info(
                f"Event {event_id} identified as potential deadlock, attempting parse using enhanced parser."
            )
            # Call the parser
            deadlock_info_result = parse_postgresql_deadlock(
                event_data
            )  # Returns DeadlockInfo or None
            # Attach result to response, even if None (indicates attempt was made)
            if deadlock_info_result:
                event_data["dexterParsedDeadlock"] = model_to_dict(deadlock_info_result)
                logger.info(f"Enhanced deadlock parser returned info for event {event_id}.")
            else:
                event_data["dexterParsedDeadlock"] = None
                logger.info(f"Enhanced deadlock parser returned None for event {event_id}.")
    except Exception as e:
        logger.exception(f"Error in deadlock parsing for event {event_id}: {str(e)}")
        # Don't fail the whole request if just the deadlock parsing fails
        event_data["dexterParsedDeadlock"] = None
    # --- End Deadlock Parsing Section ---

    # Return potentially augmented event data
    return event_data


@router.get(
    "/organizations/{organization_slug}/issues/{issue_id}/latest-event",
    response_model=Dict[str, Any],
    summary="Get Latest Issue Event",
    description="Helper endpoint to specifically retrieve the latest event for an issue.",
)
async def get_latest_issue_event_endpoint(
    organization_slug: str,
    issue_id: str,
    environment: Optional[str] = Query(None, description="Filter by environment"),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
):
    logger.info(f"Fetching latest event for issue: {issue_id}")
    try:
        event_data = await sentry_client.get_issue_event(
            organization_slug=organization_slug,
            issue_id=issue_id,
            event_id="latest",
            environment=environment,
        )

        # --- Deadlock Parsing Section (using enhanced parser) ---
        try:
            is_potential_deadlock = False
            exception_values = event_data.get("exception", {}).get("values", [])
            # Basic check on exception value - enhance if needed
            if exception_values and "40P01" in str(exception_values[0].get("value", "")):
                is_potential_deadlock = True
                # Could also check tags: e.g., if tag['sqlstate'] == '40P01'

            deadlock_info_result = None
            if is_potential_deadlock:
                logger.info(
                    f"Latest event for issue {issue_id} identified as potential deadlock, attempting parse using enhanced parser."
                )
                # Call the parser
                deadlock_info_result = parse_postgresql_deadlock(
                    event_data
                )  # Returns DeadlockInfo or None
                # Attach result to response, even if None (indicates attempt was made)
                if deadlock_info_result:
                    event_data["dexterParsedDeadlock"] = model_to_dict(deadlock_info_result)
                    logger.info(
                        f"Enhanced deadlock parser returned info for latest event of issue {issue_id}."
                    )
                else:
                    event_data["dexterParsedDeadlock"] = None
                    logger.info(
                        f"Enhanced deadlock parser returned None for latest event of issue {issue_id}."
                    )
        except Exception as e:
            logger.exception(
                f"Error in deadlock parsing for latest event of issue {issue_id}: {str(e)}"
            )
            # Don't fail the whole request if just the deadlock parsing fails
            event_data["dexterParsedDeadlock"] = None
        # --- End Deadlock Parsing Section ---

        # Return potentially augmented event data
        return event_data
    except HTTPException as e:
        if e.status_code == status.HTTP_404_NOT_FOUND:
            # If the 'latest' endpoint fails, try to list events and get the first one
            try:
                events_data = await sentry_client.list_issue_events(
                    organization_slug=organization_slug, issue_id=issue_id, environment=environment
                )

                if events_data and events_data.get("data") and len(events_data["data"]) > 0:
                    # Return the first event from the list
                    return events_data["data"][0]
                else:
                    # No events found
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"No events found for issue: {issue_id}",
                    )
            except Exception as list_error:
                # Re-raise the original error if the fallback fails
                logger.error(f"Fallback for retrieving latest event failed: {list_error}")
                raise e
        else:
            # For other HTTP errors, just re-raise
            raise
