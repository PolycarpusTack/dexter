"""
Application factory for the Dexter application.

This module provides a centralized factory for creating and configuring
the FastAPI application with appropriate middleware and routers based
on the application configuration.
"""
import logging
from typing import Optional

# Make Sentry SDK optional
try:
    import sentry_sdk
    from sentry_sdk.integrations.logging import LoggingIntegration

    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.metrics import setup_metrics

from .config import AppSettings, get_settings
from .logging import setup_logging
from .middleware import setup_middlewares

logger = logging.getLogger(__name__)


def configure_sentry(settings: AppSettings) -> None:
    """
    Configure Sentry SDK based on application settings.

    Args:
        settings: Application settings containing Sentry configuration
    """
    if not SENTRY_AVAILABLE:
        logger.warning(
            "Sentry SDK not installed. Run 'pip install sentry_sdk' to enable error tracking."
        )
        return

    if not settings.SENTRY_DSN:
        logger.info("Sentry integration disabled (no DSN provided)")
        return

    try:
        # Set up logging integration
        logging_integration = LoggingIntegration(
            level=logging.INFO,  # Capture info and above as breadcrumbs
            event_level=logging.ERROR,  # Send errors as events
        )

        # Initialize Sentry SDK
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.SENTRY_ENVIRONMENT,
            traces_sample_rate=1.0 if settings.DEBUG else 0.2,
            integrations=[logging_integration],
        )
        logger.info(f"Sentry initialized with environment: {settings.SENTRY_ENVIRONMENT}")
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {str(e)}")


def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


def handle_validation_exception(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation exceptions."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": exc.errors()}
    )


def create_app(settings: Optional[AppSettings] = None) -> FastAPI:
    """
    Create and configure the FastAPI application.

    Args:
        settings: Optional AppSettings to use (if None, loads from environment)

    Returns:
        Configured FastAPI application instance
    """
    if settings is None:
        settings = get_settings()

    # Setup logging first
    setup_logging(settings)

    # Configure Sentry if enabled
    if settings.SENTRY_DSN:
        configure_sentry(settings)

    # Application metadata
    app_kwargs = {
        "title": settings.APP_NAME,
        "description": "Enhanced Sentry monitoring with AI-powered analysis",
        "version": settings.VERSION,
    }

    # Only show docs in debug mode
    if not settings.DEBUG:
        app_kwargs.update(
            {
                "docs_url": None,
                "redoc_url": None,
                "openapi_url": None,
            }
        )

    # Create the FastAPI app using configured debug flag
    app = FastAPI(debug=settings.DEBUG, **app_kwargs)

    # Setup middlewares
    setup_middlewares(app, settings)

    # Setup metrics
    setup_metrics(app)

    # Register exception handlers
    app.add_exception_handler(StarletteHTTPException, handle_http_exception)
    app.add_exception_handler(RequestValidationError, handle_validation_exception)

    # Register application startup and shutdown events
    @app.on_event("startup")
    async def startup_event():
        logger.info(f"Starting Dexter in {settings.APP_MODE} mode")

        # Initialize cache service and attach to app state
        try:
            from app.services.cache_service import CacheService

            app.state.cache = CacheService(redis_url=settings.REDIS_URL)
            logger.info("Cache service initialized and attached to app state")
        except Exception as e:
            logger.error(f"Failed to initialize cache service: {e}")

        # Initialize API path manager
        try:
            from app.config.api.path_mappings import api_path_manager

            api_path_manager.load_all_configs()
            logger.info("API path manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize API path manager: {e}")
            # Don't fail startup, but log the error

        # Initialize analyzer framework with LLM service
        try:
            import httpx

            from app.services.analyzer_init import initialize_analyzers
            from app.services.llm_service import LLMService

            # Create LLM service for analyzer framework
            # Using a dedicated client for the analyzer framework
            analyzer_llm_client = httpx.AsyncClient(timeout=60.0)
            llm_service = LLMService(analyzer_llm_client)

            # Initialize analyzers with LLM service
            initialize_analyzers(llm_service=llm_service)
            logger.info("Analyzer framework initialized successfully with LLM support")
        except Exception as e:
            logger.error(f"Failed to initialize analyzer framework: {e}")
            # Don't fail startup, but log the error

    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("Shutting down Dexter")

    # Add root route for healthcheck
    @app.get("/")
    async def root():
        """Root endpoint to verify the application is running."""
        return {
            "message": f"Dexter API ({settings.APP_MODE})",
            "version": settings.VERSION,
            "status": "running",
        }

    # Add health check route
    @app.get("/health")
    async def health():
        """Health check endpoint."""
        return {"status": "healthy", "service": f"dexter-api-{settings.APP_MODE}"}

    # Add diagnostics route if error handler is available
    @app.get("/api/v1/diagnostics/errors")
    async def get_recent_errors(limit: int = 50):
        """Get recent errors from the in-memory cache."""
        if hasattr(app.state, "error_handler"):
            return {"errors": app.state.error_handler.get_error_log(limit=limit)}
        return {"errors": []}

    # Include routers based on configuration
    try:
        from app.routers import setup_routers

        setup_routers(app, settings)
    except Exception as e:
        logger.error(f"Failed to set up routers: {str(e)}")
        if settings.DEBUG:
            raise

    return app
