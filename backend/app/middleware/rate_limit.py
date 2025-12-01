"""
Rate Limiting Middleware using slowapi.

Based on: external/rag_api/app/core/middleware.py
Protects expensive AI endpoints from abuse.

This module provides configurable rate limiting for FastAPI endpoints,
with special limits for AI and embedding operations.
"""

import logging
from typing import Callable

from fastapi import FastAPI, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

logger = logging.getLogger(__name__)


def get_rate_limit_key(request: Request) -> str:
    """
    Generate rate limit key from request.

    Uses API key if provided (for higher limits), otherwise falls back to IP.

    Args:
        request: FastAPI request object

    Returns:
        Rate limit key string
    """
    # Check for API key first (higher limits for authenticated users)
    api_key = request.headers.get("X-API-Key")
    if api_key:
        # Use hashed prefix of API key (don't log full key)
        return f"apikey:{api_key[:16]}"

    # Check for user ID from auth (if implemented)
    if hasattr(request.state, "user_id") and request.state.user_id:
        return f"user:{request.state.user_id}"

    # Fall back to IP address
    return get_remote_address(request)


def get_client_ip(request: Request) -> str:
    """
    Get client IP address, handling proxies.

    Checks X-Forwarded-For header for proxied requests.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in the chain is the client
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


# Create limiter instance with sensible defaults
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["100/minute"],  # Default for all endpoints
    storage_uri="memory://",  # Use Redis in production: "redis://localhost:6379"
    strategy="fixed-window",
    headers_enabled=True,  # Add rate limit headers to responses
)


def setup_rate_limiting(app: FastAPI) -> None:
    """
    Configure rate limiting for FastAPI app.

    Call this in main.py after creating the app:
        app = FastAPI()
        setup_rate_limiting(app)

    Args:
        app: FastAPI application instance
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    logger.info("Rate limiting middleware configured")


async def custom_rate_limit_exceeded_handler(
    request: Request,
    exc: RateLimitExceeded
) -> Response:
    """
    Custom handler for rate limit exceeded errors.

    Provides a more informative error response.
    """
    client_key = get_rate_limit_key(request)
    logger.warning(
        f"Rate limit exceeded for {client_key} on {request.url.path}"
    )

    return Response(
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down.",
            "detail": str(exc.detail),
            "retry_after": getattr(exc, "retry_after", 60),
        },
        status_code=429,
        media_type="application/json",
        headers={
            "Retry-After": str(getattr(exc, "retry_after", 60)),
            "X-RateLimit-Limit": "See response headers",
        }
    )


# ==================== Rate Limit Decorators ====================
# Usage:
#   @router.post("/explain")
#   @limit_ai_requests
#   async def explain_error(request: Request, ...):


def limit_ai_requests(func: Callable) -> Callable:
    """
    Limit AI explanation requests to 10/minute per client.

    AI operations are expensive (LLM API calls), so we limit them more strictly.
    """
    return limiter.limit("10/minute")(func)


def limit_embedding_requests(func: Callable) -> Callable:
    """
    Limit embedding generation to 50/minute per client.

    Embedding generation is moderately expensive.
    """
    return limiter.limit("50/minute")(func)


def limit_search_requests(func: Callable) -> Callable:
    """
    Limit search/retrieval to 30/minute per client.

    Search operations involve database queries and vector similarity.
    """
    return limiter.limit("30/minute")(func)


def limit_clustering_requests(func: Callable) -> Callable:
    """
    Limit clustering operations to 5/minute per client.

    Clustering is computationally expensive and operates on entire dataset.
    """
    return limiter.limit("5/minute")(func)


def limit_webhook_requests(func: Callable) -> Callable:
    """
    Limit webhook ingestion to 100/minute per source.

    Webhooks from Sentry can come in bursts during incidents.
    """
    return limiter.limit("100/minute")(func)


def limit_feedback_requests(func: Callable) -> Callable:
    """
    Limit feedback submissions to 20/minute per client.

    Prevent spam feedback submissions.
    """
    return limiter.limit("20/minute")(func)


# ==================== Rate Limit Exemptions ====================

def exempt_from_rate_limit(func: Callable) -> Callable:
    """
    Exempt an endpoint from rate limiting.

    Use sparingly, typically for health checks and internal endpoints.
    """
    return limiter.exempt(func)


# ==================== Dynamic Rate Limits ====================

def dynamic_limit(limit_string: str) -> Callable:
    """
    Apply a custom rate limit to an endpoint.

    Args:
        limit_string: Rate limit string (e.g., "5/minute", "100/hour")

    Usage:
        @router.get("/custom")
        @dynamic_limit("5/minute")
        async def custom_endpoint():
            ...
    """
    return limiter.limit(limit_string)


def limit_by_tier(
    free_limit: str = "10/minute",
    pro_limit: str = "100/minute",
    enterprise_limit: str = "1000/minute"
) -> Callable:
    """
    Apply tiered rate limits based on user subscription.

    Requires request.state.user_tier to be set by auth middleware.

    Args:
        free_limit: Rate limit for free tier users
        pro_limit: Rate limit for pro tier users
        enterprise_limit: Rate limit for enterprise users

    Usage:
        @router.post("/ai/explain")
        @limit_by_tier(free_limit="5/minute", pro_limit="50/minute")
        async def explain(request: Request):
            ...
    """
    def decorator(func: Callable) -> Callable:
        async def wrapper(request: Request, *args, **kwargs):
            tier = getattr(request.state, "user_tier", "free")

            if tier == "enterprise":
                limit = enterprise_limit
            elif tier == "pro":
                limit = pro_limit
            else:
                limit = free_limit

            # Apply the appropriate limit
            limited_func = limiter.limit(limit)(func)
            return await limited_func(request, *args, **kwargs)

        return wrapper
    return decorator


# ==================== Rate Limit Configuration ====================

class RateLimitConfig:
    """Configuration for rate limits."""

    # Default limits
    DEFAULT = "100/minute"

    # AI-related limits (expensive operations)
    AI_EXPLAIN = "10/minute"
    AI_ANALYZE = "10/minute"

    # Embedding limits
    EMBEDDING_SINGLE = "50/minute"
    EMBEDDING_BATCH = "10/minute"

    # Search limits
    SEARCH = "30/minute"
    CLUSTERING = "5/minute"

    # Knowledge base limits
    KB_READ = "60/minute"
    KB_WRITE = "20/minute"
    FEEDBACK = "20/minute"

    # Webhook limits
    WEBHOOK = "100/minute"

    # Health check (high limit for monitoring)
    HEALTH = "1000/minute"
