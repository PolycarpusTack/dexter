# File: backend/app/routers/api/__init__.py

"""
API module for versioned API endpoints
"""
import logging

from fastapi import APIRouter, FastAPI

from app.core.config import AppSettings

logger = logging.getLogger(__name__)


def setup_api_v1_router(app: FastAPI, settings: AppSettings) -> None:
    """
    Set up the API v1 router.

    Args:
        app: The FastAPI application instance
        settings: Application settings
    """
    try:
        # Create API v1 router
        api_v1_router = APIRouter(prefix="/api/v1")

        # Import and include v1 routers
        from app.routers.api.v1 import (
            alert_health,
            analytics,
            chaos_testing,
            events,
            external_apis,
            issues,
            memory_leak,
            n_plus_one,
        )

        # Include all v1 routers
        api_v1_router.include_router(
            issues.router, prefix="/issues", tags=["issues"], default_response_class=None
        )
        api_v1_router.include_router(
            events.router, prefix="/events", tags=["events"], default_response_class=None
        )
        api_v1_router.include_router(
            analytics.router, prefix="/analytics", tags=["analytics"], default_response_class=None
        )
        api_v1_router.include_router(
            memory_leak.router,
            prefix="/memory-leak",
            tags=["memory-leak"],
            default_response_class=None,
        )
        api_v1_router.include_router(
            n_plus_one.router,
            prefix="/n-plus-one",
            tags=["n-plus-one"],
            default_response_class=None,
        )
        api_v1_router.include_router(
            alert_health.router,
            prefix="/alert-health",
            tags=["alert-health"],
            default_response_class=None,
        )
        api_v1_router.include_router(
            chaos_testing.router,
            prefix="/chaos-testing",
            tags=["chaos-testing"],
            default_response_class=None,
        )

        # Include external APIs router if enabled
        if settings.ENABLE_EXTERNAL_APIS:
            api_v1_router.include_router(
                external_apis.router,
                prefix="/external-apis",
                tags=["external-apis"],
                default_response_class=None,
            )
            logger.info("External APIs router included")

        # Include the v1 router in the app
        app.include_router(api_v1_router)
        logger.info("API v1 router configured successfully")

    except Exception as e:
        logger.error(f"Failed to set up API v1 router: {str(e)}")
        if settings.DEBUG:
            import traceback

            logger.error(f"Traceback for API v1 router setup:\n{traceback.format_exc()}")
