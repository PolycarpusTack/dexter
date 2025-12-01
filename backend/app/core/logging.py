"""
Logging configuration for the Dexter application.

This module provides functions to set up and configure the logging
system for the application.

Enhanced with structlog for structured logging:
- JSON output for production (machine-parseable)
- Colored console output for development (human-readable)
- Request context propagation
- Consistent log formatting

Based on: external/fastapi-langgraph-agent-production-ready-template/app/core/logging.py
"""
import datetime
import json
import logging
import os
import sys
import traceback
from logging.handlers import RotatingFileHandler
from typing import Any

try:
    import structlog
    STRUCTLOG_AVAILABLE = True
except ImportError:
    STRUCTLOG_AVAILABLE = False
    structlog = None

from .config import AppSettings


def setup_logging(settings: AppSettings) -> None:
    """
    Configure application logging based on settings.

    Args:
        settings: Application settings containing logging configuration
    """
    # Get log level from settings
    try:
        level = getattr(logging, settings.LOG_LEVEL.value)
    except (AttributeError, ValueError):
        level = logging.INFO
        print(f"Invalid log level: {settings.LOG_LEVEL}, using INFO")

    # Root logger configuration
    root_logger = logging.getLogger()
    if root_logger.handlers:
        # Clear existing handlers to avoid duplicate logs
        for handler in root_logger.handlers:
            root_logger.removeHandler(handler)

    # Set log level
    root_logger.setLevel(level)

    # Configure formatter based on format setting
    if settings.LOG_FORMAT.lower() == "json":
        formatter = JsonFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
        )

    # Add console handler if enabled
    if settings.LOG_TO_CONSOLE:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

    # Add file handler if configured
    if settings.LOG_FILE_PATH:
        try:
            # Create log directory if it doesn't exist
            log_dir = os.path.dirname(settings.LOG_FILE_PATH)
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir)

            # Configure rotating file handler
            file_handler = RotatingFileHandler(
                settings.LOG_FILE_PATH,
                maxBytes=settings.LOG_MAX_SIZE,
                backupCount=settings.LOG_BACKUP_COUNT,
            )
            file_handler.setLevel(level)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        except Exception as e:
            print(f"Error setting up file logging: {str(e)}")
            # Continue with console logging only

    # Set levels for noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

    # Log setup completion
    app_logger = logging.getLogger("app")
    app_logger.info(f"Logging configured with level: {settings.LOG_LEVEL.value}")


class JsonFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def format(self, record):
        """Format the log record as JSON."""
        log_data = {
            "timestamp": datetime.datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id

        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info),
            }

        return json.dumps(log_data)


def get_logger(name: str) -> Any:
    """
    Get a logger instance.

    If structlog is available and configured, returns a structlog logger.
    Otherwise, returns a standard library logger for backward compatibility.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Logger instance (structlog or stdlib)

    Usage:
        logger = get_logger(__name__)
        logger.info("request_processed",
                    user_id="abc123",
                    duration_ms=150,
                    status="success")
    """
    if STRUCTLOG_AVAILABLE:
        return structlog.get_logger(name)
    return logging.getLogger(name)


# ==================== Structlog Configuration ====================


def configure_structlog(
    json_output: bool = True,
    log_level: str = "INFO",
    include_timestamp: bool = True
) -> None:
    """
    Configure structured logging with structlog.

    Args:
        json_output: If True, output JSON logs (for production).
                    If False, output colored console logs (for development).
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        include_timestamp: Whether to include timestamps in logs

    Usage:
        from app.core.logging import configure_structlog

        # In main.py
        configure_structlog(
            json_output=not settings.DEBUG,
            log_level="INFO"
        )
    """
    if not STRUCTLOG_AVAILABLE:
        logging.warning("structlog not available, using standard logging")
        return

    # Shared processors for all outputs
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if include_timestamp:
        shared_processors.insert(0, structlog.processors.TimeStamper(fmt="iso"))

    if json_output:
        # Production: JSON output for log aggregation
        processors = shared_processors + [
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ]
    else:
        # Development: Colored console output
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True)
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure standard library logging level
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper()),
    )

    # Suppress noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

    # Log configuration completed
    logger = structlog.get_logger(__name__)
    logger.info(
        "structlog_configured",
        json_output=json_output,
        log_level=log_level
    )


class RequestContextMiddleware:
    """
    ASGI Middleware to add request context to all logs.

    Automatically adds request_id, path, and method to the log context
    for all logs emitted during request processing.

    Usage:
        from app.core.logging import RequestContextMiddleware

        app = FastAPI()
        app.add_middleware(RequestContextMiddleware)
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if not STRUCTLOG_AVAILABLE:
            await self.app(scope, receive, send)
            return

        # Extract request info
        request_id = None
        for header_name, header_value in scope.get("headers", []):
            if header_name == b"x-request-id":
                request_id = header_value.decode()
                break

        # Generate request ID if not provided
        if not request_id:
            request_id = f"{datetime.datetime.now().timestamp():.6f}"

        # Clear any existing context and bind new context
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            path=scope.get("path", "unknown"),
            method=scope.get("method", "unknown"),
        )

        await self.app(scope, receive, send)


def bind_context(**kwargs) -> None:
    """
    Bind additional context to the current request's logs.

    Args:
        **kwargs: Key-value pairs to add to log context

    Usage:
        from app.core.logging import bind_context

        # After authentication
        bind_context(user_id=user.id, user_email=user.email)

        # Subsequent logs will include user_id and user_email
        logger.info("action_performed", action="create_report")
    """
    if STRUCTLOG_AVAILABLE:
        structlog.contextvars.bind_contextvars(**kwargs)


def clear_context() -> None:
    """Clear the current request's log context."""
    if STRUCTLOG_AVAILABLE:
        structlog.contextvars.clear_contextvars()


def unbind_context(*keys: str) -> None:
    """
    Remove specific keys from the current request's log context.

    Args:
        *keys: Keys to remove from context
    """
    if STRUCTLOG_AVAILABLE:
        structlog.contextvars.unbind_contextvars(*keys)


# ==================== Log Event Names ====================


class LogEvents:
    """Standard log event names for consistency across the application."""

    # Request lifecycle
    REQUEST_STARTED = "request_started"
    REQUEST_COMPLETED = "request_completed"
    REQUEST_FAILED = "request_failed"

    # AI operations
    AI_EXPLAIN_STARTED = "ai_explain_started"
    AI_EXPLAIN_COMPLETED = "ai_explain_completed"
    AI_EXPLAIN_FAILED = "ai_explain_failed"
    AI_EXPLAIN_CACHED = "ai_explain_cached"

    # Knowledge base
    KB_SEARCH_STARTED = "kb_search_started"
    KB_SEARCH_COMPLETED = "kb_search_completed"
    KB_ISSUE_INGESTED = "kb_issue_ingested"
    KB_FEEDBACK_RECEIVED = "kb_feedback_received"

    # Clustering
    CLUSTERING_STARTED = "clustering_started"
    CLUSTERING_COMPLETED = "clustering_completed"
    CLUSTER_CREATED = "cluster_created"

    # Embeddings
    EMBEDDING_GENERATED = "embedding_generated"
    EMBEDDING_CACHED = "embedding_cached"
    EMBEDDING_FAILED = "embedding_failed"

    # External services
    SENTRY_API_CALLED = "sentry_api_called"
    SENTRY_API_FAILED = "sentry_api_failed"
    LLM_API_CALLED = "llm_api_called"
    LLM_API_FAILED = "llm_api_failed"

    # Rate limiting
    RATE_LIMIT_APPROACHED = "rate_limit_approached"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"

    # System
    STARTUP = "app_startup"
    SHUTDOWN = "app_shutdown"
    HEALTH_CHECK = "health_check"
