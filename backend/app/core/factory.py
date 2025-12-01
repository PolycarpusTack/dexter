"""
Application factory for the Dexter application.

This module provides a centralized factory for creating and configuring
the FastAPI application with appropriate middleware and routers based
on the application configuration.

Enhanced with Phase 8 production hardening:
- Rate limiting (slowapi)
- Structured logging (structlog)
- Custom Prometheus metrics
- Request context propagation
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
from .logging import setup_logging, configure_structlog, RequestContextMiddleware
from .middleware import setup_middlewares

# Phase 8: Rate limiting (optional, graceful fallback)
try:
    from app.middleware.rate_limit import setup_rate_limiting
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    RATE_LIMITING_AVAILABLE = False

# Phase 8: Custom metrics (optional, graceful fallback)
try:
    from app.metrics.custom_metrics import initialize_system_info
    CUSTOM_METRICS_AVAILABLE = True
except ImportError:
    CUSTOM_METRICS_AVAILABLE = False

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

    # Phase 8: Configure structured logging with structlog
    try:
        configure_structlog(
            json_output=not settings.DEBUG,
            log_level=settings.LOG_LEVEL.value if hasattr(settings.LOG_LEVEL, 'value') else str(settings.LOG_LEVEL)
        )
        logger.info("Structured logging configured with structlog")
    except Exception as e:
        logger.warning(f"Failed to configure structlog, using standard logging: {e}")

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

    # Phase 8: Add request context middleware for structured logging
    try:
        app.add_middleware(RequestContextMiddleware)
        logger.info("Request context middleware added for structured logging")
    except Exception as e:
        logger.warning(f"Failed to add request context middleware: {e}")

    # Phase 8: Setup rate limiting
    if RATE_LIMITING_AVAILABLE:
        try:
            setup_rate_limiting(app)
            logger.info("Rate limiting middleware configured")
        except Exception as e:
            logger.warning(f"Failed to setup rate limiting: {e}")
    else:
        logger.info("Rate limiting not available (slowapi not installed)")

    # Setup metrics
    setup_metrics(app)

    # Phase 8: Initialize custom metrics system info
    if CUSTOM_METRICS_AVAILABLE:
        try:
            initialize_system_info(
                version=settings.VERSION,
                environment=settings.APP_MODE if hasattr(settings, 'APP_MODE') else "development",
                embedding_model="jina-embeddings-v2-base-code",
                vector_dimension=768
            )
            logger.info("Custom Prometheus metrics initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize custom metrics: {e}")

    # Register exception handlers
    app.add_exception_handler(StarletteHTTPException, handle_http_exception)
    app.add_exception_handler(RequestValidationError, handle_validation_exception)

    # Register application startup and shutdown events
    @app.on_event("startup")
    async def startup_event():
        logger.info(f"Starting Dexter in {settings.APP_MODE} mode")

        # Initialize database connection (if knowledge base is enabled)
        app.state.kb_initialized = False
        if getattr(settings, "ENABLE_KNOWLEDGE_BASE", False):
            try:
                from app.db.database import init_db

                init_db(
                    database_url=settings.DATABASE_URL,
                    debug=settings.DATABASE_ECHO,
                )
                app.state.kb_initialized = True
                logger.info("✓ Database connection initialized successfully")
                logger.info(f"  Knowledge base features are ENABLED at {settings.DATABASE_URL[:30]}...")
            except Exception as e:
                logger.error(f"✗ Failed to initialize database: {e}")
                logger.warning("  Knowledge base features are DISABLED - endpoints will return 503")
                logger.warning("  To enable KB features:")
                logger.warning("    1. Ensure PostgreSQL with pgvector is running")
                logger.warning("    2. Run migrations: PYTHONPATH=/path/to/backend alembic upgrade head")
                logger.warning("    3. Verify DATABASE_URL in your environment")
        else:
            logger.info("Knowledge base features are disabled by configuration (ENABLE_KNOWLEDGE_BASE=false)")

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

        # Close cache service connection
        if hasattr(app.state, "cache"):
            try:
                await app.state.cache.close()
                logger.info("Cache service closed successfully")
            except Exception as e:
                logger.error(f"Error closing cache service: {e}")

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
    async def health(request: Request):
        """
        Health check endpoint with detailed feature status.

        Returns overall health plus status of all features including the
        11 data enrichment sources.
        """
        kb_enabled = getattr(settings, "ENABLE_KNOWLEDGE_BASE", False)
        kb_initialized = getattr(request.app.state, "kb_initialized", False)

        # Check each enrichment source
        # Master toggle: when ON, individual flags control sources; when OFF, all disabled
        master_enabled = getattr(settings, "ENABLE_ALL_ENRICHMENTS", True)  # Default to True

        # Helper function to determine if a source is enabled
        def is_source_enabled(individual_flag: bool) -> bool:
            """Check if enrichment source is enabled (requires both master AND individual flag)."""
            return master_enabled and individual_flag

        enrichment_sources = {
            "releases": {
                "enabled": is_source_enabled(settings.ENABLE_RELEASES),
                "status": "ready" if is_source_enabled(settings.ENABLE_RELEASES) else "disabled",
            },
            "performance_spans": {
                "enabled": is_source_enabled(settings.ENABLE_PERFORMANCE_SPANS),
                "status": "ready" if is_source_enabled(settings.ENABLE_PERFORMANCE_SPANS) else "disabled",
            },
            "profiling": {
                "enabled": is_source_enabled(settings.ENABLE_PROFILING),
                "status": "ready" if is_source_enabled(settings.ENABLE_PROFILING) else "disabled",
            },
            "sessions_replays": {
                "enabled": is_source_enabled(settings.ENABLE_SESSIONS_REPLAYS),
                "status": "ready" if is_source_enabled(settings.ENABLE_SESSIONS_REPLAYS) else "disabled",
            },
            "breadcrumbs": {
                "enabled": is_source_enabled(settings.ENABLE_BREADCRUMBS),
                "status": "ready" if is_source_enabled(settings.ENABLE_BREADCRUMBS) else "disabled",
            },
            "alerts": {
                "enabled": is_source_enabled(settings.ENABLE_ALERTS),
                "status": "ready" if is_source_enabled(settings.ENABLE_ALERTS) else "disabled",
            },
            "attachments": {
                "enabled": is_source_enabled(settings.ENABLE_ATTACHMENTS),
                "status": "ready" if is_source_enabled(settings.ENABLE_ATTACHMENTS) else "disabled",
            },
            "tag_distributions": {
                "enabled": is_source_enabled(settings.ENABLE_TAG_DISTRIBUTIONS),
                "status": "ready" if is_source_enabled(settings.ENABLE_TAG_DISTRIBUTIONS) else "disabled",
            },
            "ownership": {
                "enabled": is_source_enabled(settings.ENABLE_OWNERSHIP),
                "status": "ready" if is_source_enabled(settings.ENABLE_OWNERSHIP) else "disabled",
            },
            "measurements": {
                "enabled": is_source_enabled(settings.ENABLE_MEASUREMENTS),
                "status": "ready" if is_source_enabled(settings.ENABLE_MEASUREMENTS) else "disabled",
            },
            "grouping_insights": {
                "enabled": is_source_enabled(settings.ENABLE_GROUPING_INSIGHTS),
                "status": "ready" if is_source_enabled(settings.ENABLE_GROUPING_INSIGHTS) else "disabled",
            },
        }

        # Count enabled sources
        enabled_count = sum(1 for s in enrichment_sources.values() if s["enabled"])

        health_status = {
            "status": "healthy",
            "service": f"dexter-api-{settings.APP_MODE}",
            "version": settings.VERSION,
            "features": {
                "knowledge_base": {
                    "enabled": kb_enabled,
                    "initialized": kb_initialized,
                    "status": "ready" if kb_initialized else ("disabled" if not kb_enabled else "unavailable"),
                },
                "ollama": {
                    "enabled": settings.ENABLE_OLLAMA,
                    "status": "ready" if settings.ENABLE_OLLAMA else "disabled",
                },
                "real_time": {
                    "enabled": settings.ENABLE_REAL_TIME,
                    "status": "ready" if settings.ENABLE_REAL_TIME else "disabled",
                },
                "enrichments": {
                    "enabled_count": enabled_count,
                    "total_count": 11,
                    "master_override": master_enabled,
                    "sources": enrichment_sources,
                },
            },
        }

        return health_status

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
