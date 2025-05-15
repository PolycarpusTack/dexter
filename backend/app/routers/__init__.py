"""
Router setup for the Dexter application.

This module provides functions to set up and configure all routers
for the FastAPI application based on the application settings.
"""
import logging
from importlib import import_module
from typing import Dict, List, Optional, Tuple

from fastapi import FastAPI, APIRouter

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
    
    logger.info(f"Routers configured with prefix: {settings.API_PREFIX}")


def _include_core_routers(api_router: APIRouter) -> None:
    """
    Include core routers that are always enabled.
    
    Args:
        api_router: The main API router
    """
    core_routers = [
        ("events", "events"),
        ("issues", "issues"),
        ("config", "config"),
    ]
    
    for module_name, prefix in core_routers:
        try:
            module = import_module(f"app.routers.{module_name}")
            router = getattr(module, "router")
            api_router.include_router(
                router,
                prefix=f"/{prefix}",
                tags=[prefix]
            )
            logger.debug(f"Included core router: {module_name}")
        except (ImportError, AttributeError) as e:
            logger.warning(f"Failed to load core router {module_name}: {str(e)}")


def _include_optional_routers(api_router: APIRouter, settings: AppSettings) -> None:
    """
    Include feature-flagged routers based on settings.
    
    Args:
        api_router: The main API router
        settings: Application settings
    """
    # Define optional routers with their feature flags
    optional_routers = [
        ("ai", "ai", settings.ENABLE_OLLAMA),
        ("websocket", "websocket", settings.ENABLE_REAL_TIME),
        ("analyzers", "analyzers", settings.ENABLE_DEADLOCK_ANALYSIS),
        ("discover", "discover", True),  # Always enabled for now
        ("alerts", "alerts", True),      # Always enabled for now
        ("templates", "templates", True),  # Template management system
        ("metrics", "metrics", True),     # AI Performance Metrics
    ]
    
    for module_name, prefix, is_enabled in optional_routers:
        if not is_enabled:
            logger.debug(f"Router {module_name} is disabled by configuration")
            continue
            
        try:
            module = import_module(f"app.routers.{module_name}")
            router = getattr(module, "router")
            
            # Handle websocket router differently as it doesn't have a prefix
            if module_name == "websocket":
                api_router.include_router(
                    router,
                    tags=[prefix]
                )
            else:
                api_router.include_router(
                    router,
                    prefix=f"/{prefix}",
                    tags=[prefix]
                )
            logger.debug(f"Included optional router: {module_name}")
        except (ImportError, AttributeError) as e:
            logger.warning(f"Failed to load optional router {module_name}: {str(e)}")
