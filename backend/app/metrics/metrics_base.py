"""
Prometheus metrics for the FastAPI application.
"""
from typing import Callable

from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Gauge, Histogram
from prometheus_client.openmetrics.exposition import generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.routing import Match

# Define metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)

HTTP_ACTIVE_REQUESTS = Gauge(
    "http_requests_active", "Number of active HTTP requests", ["method", "endpoint"]
)

ERROR_COUNT = Counter(
    "http_request_errors_total",
    "Total number of HTTP request errors",
    ["method", "endpoint", "error_type"],
)

SENTRY_REQUESTS = Counter(
    "sentry_api_requests_total",
    "Total number of requests to Sentry API",
    ["endpoint", "status"],
)

OLLAMA_REQUESTS = Counter(
    "ollama_api_requests_total",
    "Total number of requests to Ollama API",
    ["model", "status"],
)

CACHE_HITS = Counter("cache_hits_total", "Total number of cache hits", ["cache_type"])

CACHE_MISSES = Counter("cache_misses_total", "Total number of cache misses", ["cache_type"])

TOKENS_PROCESSED = Counter(
    "tokens_processed_total",
    "Total number of tokens processed by AI models",
    ["model", "operation"],
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware to collect metrics for Prometheus."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip metrics endpoint to avoid recursive metrics
        if request.url.path == "/metrics":
            return await call_next(request)

        # Determine the endpoint by matching route
        endpoint = self._get_endpoint(request)

        method = request.method
        HTTP_ACTIVE_REQUESTS.labels(method=method, endpoint=endpoint).inc()

        try:
            # Record request latency
            with REQUEST_LATENCY.labels(method=method, endpoint=endpoint).time():
                response = await call_next(request)

            # Record request count with status code
            status_code = response.status_code
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status_code).inc()

            return response
        except Exception as exc:
            # Record error
            error_type = type(exc).__name__
            ERROR_COUNT.labels(method=method, endpoint=endpoint, error_type=error_type).inc()
            raise
        finally:
            HTTP_ACTIVE_REQUESTS.labels(method=method, endpoint=endpoint).dec()

    @staticmethod
    def _get_endpoint(request: Request) -> str:
        """Get the endpoint from the request route."""
        for route in request.app.routes:
            match, _ = route.matches(request.scope)
            if match == Match.FULL:
                return route.path
        return request.url.path


def setup_metrics(app: FastAPI) -> None:
    """Setup metrics for the FastAPI application."""
    # Add metrics middleware
    app.add_middleware(PrometheusMiddleware)

    # Add metrics endpoint
    @app.get("/metrics")
    async def metrics():
        return Response(content=generate_latest(), media_type="text/plain")
