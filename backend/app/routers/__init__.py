"""
Router setup for the Dexter application.

This module provides functions to set up and configure all routers
for the FastAPI application based on the application settings.
"""
import logging
import traceback
from importlib import import_module

from fastapi import APIRouter, FastAPI

from app.core.config import AppSettings

logger = logging.getLogger(__name__)


def setup_routers(app: FastAPI, settings: AppSettings) -> None:
    """
    Configure application routers based on settings.

    Args:
        app: The FastAPI application instance
        settings: Application settings
    """
    # Create main API router with prefix
    api_router = APIRouter(prefix=settings.API_PREFIX)

    # Core routers - always included
    _include_core_routers(api_router)

    # Feature-flagged routers
    _include_optional_routers(api_router, settings)

    # Include the API router in the app
    app.include_router(api_router)

    # Setup API v1 routers
    from app.routers.api import setup_api_v1_router

    setup_api_v1_router(app, settings)

    logger.info(f"Routers configured with prefix: {settings.API_PREFIX}")


def _include_core_routers(api_router: APIRouter) -> None:
    """
    Include core routers that are always enabled.

    Args:
        api_router: The main API router
    """
    core_routers = [
        ("events", None),  # Uses router's own prefix: /organizations/...
        ("issues", None),  # Uses router's own prefix: /organizations/...
        ("config", "config"),
        ("debug", "debug"),  # Add debug router for development
        ("auth", "auth"),  # Add auth router for token refresh
    ]

    for module_name, prefix in core_routers:
        try:
            module = import_module(f"app.routers.{module_name}")
            router = getattr(module, "router")
            # Handle routers with no prefix (they use their own paths)
            if prefix is None:
                api_router.include_router(router, tags=[module_name])
            else:
                api_router.include_router(router, prefix=f"/{prefix}", tags=[prefix])
            logger.debug(f"Included core router: {module_name}")
        except (ImportError, AttributeError) as e:
            logger.error(f"Failed to load core router {module_name}: {str(e)}")
            logger.error(f"Traceback for {module_name}:\n{traceback.format_exc()}")


def _include_optional_routers(api_router: APIRouter, settings: AppSettings) -> None:
    """
    Include feature-flagged routers based on settings.

    Args:
        api_router: The main API router
        settings: Application settings
    """
    # Define optional routers with their feature flags
    # Check for knowledge base flag (may not exist in older configs)
    knowledge_base_enabled = getattr(settings, "ENABLE_KNOWLEDGE_BASE", False)

    optional_routers = [
        ("ai", "ai", settings.ENABLE_OLLAMA),
        (
            "enhanced_ai",
            None,
            settings.ENABLE_OLLAMA,
        ),  # Enhanced AI endpoints with /ai-enhanced prefix
        ("websocket", "websocket", settings.ENABLE_REAL_TIME),
        ("analyzers", "analyzers", settings.ENABLE_DEADLOCK_ANALYSIS),
        (
            "enhanced_analyzers",
            None,
            settings.ENABLE_DEADLOCK_ANALYSIS,
        ),  # Enhanced analyzers with own prefix
        ("enhanced_issues", None, True),  # Enhanced issues endpoints
        ("discover", None, True),  # Uses router's own prefix: /discover
        ("alerts", None, True),  # Uses router's own prefix: /projects/{project}/alerts
        ("organization_alerts", None, True),  # Organization-level alerts (no prefix)
        ("templates", None, True),  # Uses router's own prefix: /templates
        ("metrics", None, True),  # Uses router's own prefix: /metrics
        ("system", None, True),  # Uses router's own prefix: /system
        ("integrations", "integrations", True),  # External integrations framework
        # Knowledge base routers (Phase 1, 2 & 3)
        ("webhooks", None, knowledge_base_enabled),  # Sentry webhook ingestion
        ("knowledge_base", None, knowledge_base_enabled),  # KB search and feedback
        ("validation", None, knowledge_base_enabled),  # Validation workflow
        ("enrichment", None, knowledge_base_enabled),  # Data enrichment (EPIC C, E, etc.)
    ]

    for module_name, prefix, is_enabled in optional_routers:
        if not is_enabled:
            logger.debug(f"Router {module_name} is disabled by configuration")
            continue

        try:
            module = import_module(f"app.routers.{module_name}")
            router = getattr(module, "router")

            # Handle routers with no prefix
            if prefix is None or module_name == "websocket":
                api_router.include_router(router, tags=[module_name.replace("_", "-")])
            else:
                api_router.include_router(router, prefix=f"/{prefix}", tags=[prefix])
            logger.debug(f"Included optional router: {module_name}")
        except (ImportError, AttributeError) as e:
            logger.error(f"Failed to load optional router {module_name}: {str(e)}")
            if settings.DEBUG:
                logger.error(f"Traceback for {module_name}:\n{traceback.format_exc()}")
