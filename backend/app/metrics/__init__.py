# Metrics module initialization
#
# This module re-exports both the base Prometheus metrics (from metrics_base.py)
# and custom Dexter-specific metrics (from custom_metrics.py).

# Import base metrics setup (Prometheus middleware, core HTTP metrics)
from app.metrics.metrics_base import (
    PrometheusMiddleware,
    setup_metrics,
    REQUEST_COUNT,
    REQUEST_LATENCY,
    HTTP_ACTIVE_REQUESTS,
    ERROR_COUNT,
    SENTRY_REQUESTS,
    OLLAMA_REQUESTS,
    CACHE_HITS,
    CACHE_MISSES,
    TOKENS_PROCESSED,
)

# Import custom Dexter metrics
from app.metrics.custom_metrics import (
    # Counters
    AI_REQUESTS_TOTAL,
    KB_QUERIES_TOTAL,
    RAG_CACHE_HITS,
    RAG_CACHE_MISSES,
    EMBEDDING_REQUESTS_TOTAL,
    FEEDBACK_TOTAL,
    SENTRY_WEBHOOK_TOTAL,

    # Histograms
    AI_REQUEST_DURATION,
    KB_QUERY_DURATION,
    EMBEDDING_DURATION,
    EMBEDDING_BATCH_SIZE,
    CLUSTERING_DURATION,
    CLUSTERS_CREATED,
    RAG_RETRIEVAL_RESULTS,

    # Gauges
    KB_ISSUES_TOTAL,
    ACTIVE_REQUESTS,

    # Info
    SYSTEM_INFO,

    # Decorators
    track_ai_request,
    track_kb_query,
    track_embedding_generation,
    track_clustering,

    # Setup functions
    initialize_system_info,
    setup_metrics_endpoint,
)

__all__ = [
    # Base metrics
    "PrometheusMiddleware",
    "setup_metrics",
    "REQUEST_COUNT",
    "REQUEST_LATENCY",
    "HTTP_ACTIVE_REQUESTS",
    "ERROR_COUNT",
    "SENTRY_REQUESTS",
    "OLLAMA_REQUESTS",
    "CACHE_HITS",
    "CACHE_MISSES",
    "TOKENS_PROCESSED",

    # Counters
    "AI_REQUESTS_TOTAL",
    "KB_QUERIES_TOTAL",
    "RAG_CACHE_HITS",
    "RAG_CACHE_MISSES",
    "EMBEDDING_REQUESTS_TOTAL",
    "FEEDBACK_TOTAL",
    "SENTRY_WEBHOOK_TOTAL",

    # Histograms
    "AI_REQUEST_DURATION",
    "KB_QUERY_DURATION",
    "EMBEDDING_DURATION",
    "EMBEDDING_BATCH_SIZE",
    "CLUSTERING_DURATION",
    "CLUSTERS_CREATED",
    "RAG_RETRIEVAL_RESULTS",

    # Gauges
    "KB_ISSUES_TOTAL",
    "ACTIVE_REQUESTS",

    # Info
    "SYSTEM_INFO",

    # Decorators
    "track_ai_request",
    "track_kb_query",
    "track_embedding_generation",
    "track_clustering",

    # Setup functions
    "initialize_system_info",
    "setup_metrics_endpoint",
]
