"""
Main entry point for the Dexter application.

This module creates and configures the FastAPI application using the
factory function and appropriate settings.
"""
import logging
import sys

import uvicorn

from app.core.compatibility import ensure_compatibility
from app.core.config import get_settings
from app.core.factory import create_app

# First, ensure compatibility with existing codebase
ensure_compatibility()

# Create application instance using factory
settings = get_settings()
app = create_app(settings)

# Configure logger
logger = logging.getLogger(__name__)

# Add success indicator
logger.info("FastAPI application initialized successfully")
logger.info("Application is ready to serve requests")

# Explain the workaround for future reference
logger.info("NOTE: The warning about 'Invalid args for response field' can be safely ignored.")
logger.info("We're using async generator dependency functions for SentryApiClient, which causes")
logger.info("FastAPI to show a warning about dependencies in response models.")
logger.info("The application will function correctly despite this warning.")

# Entry point for running the application
if __name__ == "__main__":
    logger.info(f"Starting Dexter server on {settings.HOST}:{settings.PORT}")

    # Run with uvicorn
    try:
        uvicorn.run(
            "app.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.RELOAD,
            workers=settings.WORKERS,
            log_level=settings.LOG_LEVEL.value.lower(),
        )
    except Exception as e:
        logger.critical(f"Failed to start server: {str(e)}")
        sys.exit(1)
