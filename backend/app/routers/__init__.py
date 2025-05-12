"""
Routers module for organizing API endpoints.
Uses dynamic imports to avoid dependency issues.
"""

import importlib
import logging

logger = logging.getLogger(__name__)

# Import all modules with minimal dependencies first
try:
    from . import config
    logger.info("Successfully imported config router")
except ImportError as e:
    logger.warning(f"Failed to import config router: {e}")
    config = None

# Then try to import modules with more dependencies
# Define a function to dynamically import modules
def import_module(name):
    try:
        module = importlib.import_module(f".{name}", package="app.routers")
        logger.info(f"Successfully imported {name} router")
        return module
    except ImportError as e:
        logger.warning(f"Failed to import {name} router: {e}")
        return None

# Import each module safely
issues = import_module("issues")
events = import_module("events")
ai = import_module("ai")
analyzers = import_module("analyzers")
enhanced_analyzers = import_module("enhanced_analyzers")
alerts = import_module("alerts")
discover = import_module("discover")
websocket = import_module("websocket")

# Export all routers
__all__ = [
    "issues", "events", "ai", "config", "analyzers", 
    "enhanced_analyzers", "alerts", "discover", "websocket"
]
