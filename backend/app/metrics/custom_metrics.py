"""
Custom Prometheus Metrics for Dexter.

Based on: external/text-embeddings-inference metrics patterns
Provides application-specific observability.

This module defines custom Prometheus metrics for:
- AI request tracking
- Knowledge base operations
- RAG pipeline performance
- Embedding generation
- Clustering operations
- System health

Usage:
    from app.metrics import AI_REQUESTS_TOTAL, track_ai_request

    # Direct metric update
    AI_REQUESTS_TOTAL.labels(model="gpt-4", status="success", error_type="TypeError").inc()

    # Or use decorators
    @track_ai_request(model="gpt-4")
    async def explain_error(...):
        ...
"""

import time
import logging
from functools import wraps
from typing import Callable, Any

from prometheus_client import Counter, Histogram, Gauge, Info
from fastapi import FastAPI

logger = logging.getLogger(__name__)


# ============= Request Metrics =============

AI_REQUESTS_TOTAL = Counter(
    'dexter_ai_requests_total',
    'Total AI explanation requests',
    ['model', 'status', 'error_type']
)

AI_REQUEST_DURATION = Histogram(
    'dexter_ai_request_duration_seconds',
    'AI request duration in seconds',
    ['model', 'complexity'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0]
)

ACTIVE_REQUESTS = Gauge(
    'dexter_active_requests',
    'Number of currently active requests',
    ['endpoint_type']
)


# ============= Knowledge Base Metrics =============

KB_QUERIES_TOTAL = Counter(
    'dexter_kb_queries_total',
    'Total knowledge base queries',
    ['query_type', 'status']  # query_type: search, cluster, similar, hybrid
)

KB_QUERY_DURATION = Histogram(
    'dexter_kb_query_duration_seconds',
    'Knowledge base query duration',
    ['query_type'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

KB_ISSUES_TOTAL = Gauge(
    'dexter_kb_issues_total',
    'Total issues in knowledge base',
    ['status']  # validated, pending, all
)


# ============= RAG Metrics =============

RAG_CACHE_HITS = Counter(
    'dexter_rag_cache_hits_total',
    'RAG cache hit count',
    ['cache_type']  # embedding, retrieval, explanation
)

RAG_CACHE_MISSES = Counter(
    'dexter_rag_cache_misses_total',
    'RAG cache miss count',
    ['cache_type']
)

RAG_RETRIEVAL_RESULTS = Histogram(
    'dexter_rag_retrieval_results',
    'Number of similar issues retrieved',
    buckets=[0, 1, 2, 3, 5, 10, 20, 50]
)


# ============= Embedding Metrics =============

EMBEDDING_REQUESTS_TOTAL = Counter(
    'dexter_embedding_requests_total',
    'Total embedding generation requests',
    ['status']
)

EMBEDDING_DURATION = Histogram(
    'dexter_embedding_duration_seconds',
    'Embedding generation duration',
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0]
)

EMBEDDING_BATCH_SIZE = Histogram(
    'dexter_embedding_batch_size',
    'Embedding batch size',
    buckets=[1, 5, 10, 25, 50, 100, 200]
)


# ============= Feedback Metrics =============

FEEDBACK_TOTAL = Counter(
    'dexter_feedback_total',
    'Total feedback submissions',
    ['feedback_type']  # positive, negative, correction
)


# ============= Clustering Metrics =============

CLUSTERING_DURATION = Histogram(
    'dexter_clustering_duration_seconds',
    'Error clustering duration',
    buckets=[0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0]
)

CLUSTERS_CREATED = Histogram(
    'dexter_clusters_created',
    'Number of clusters created',
    buckets=[1, 5, 10, 25, 50, 100, 250, 500]
)


# ============= Sentry Integration Metrics =============

SENTRY_WEBHOOK_TOTAL = Counter(
    'dexter_sentry_webhook_total',
    'Total Sentry webhooks received',
    ['event_type', 'status']  # event_type: error, issue, etc.
)


# ============= System Info =============

SYSTEM_INFO = Info(
    'dexter_system',
    'Dexter system information'
)


# ============= Decorators =============

def track_ai_request(model: str = "unknown", error_type: str = "unknown"):
    """
    Decorator to track AI request metrics.

    Args:
        model: The AI model being used
        error_type: Type of error being explained

    Usage:
        @track_ai_request(model="gpt-4")
        async def explain_error(...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            status = "success"
            complexity = "unknown"

            ACTIVE_REQUESTS.labels(endpoint_type="ai").inc()

            try:
                result = await func(*args, **kwargs)

                # Try to extract complexity from result
                if hasattr(result, 'confidence'):
                    complexity = str(result.confidence).lower()
                elif isinstance(result, dict) and 'confidence' in result:
                    complexity = str(result['confidence']).lower()

                return result
            except Exception as e:
                status = "error"
                logger.error(f"AI request failed: {e}")
                raise
            finally:
                duration = time.time() - start_time

                ACTIVE_REQUESTS.labels(endpoint_type="ai").dec()

                AI_REQUESTS_TOTAL.labels(
                    model=model,
                    status=status,
                    error_type=error_type
                ).inc()

                AI_REQUEST_DURATION.labels(
                    model=model,
                    complexity=complexity
                ).observe(duration)

        return wrapper
    return decorator


def track_kb_query(query_type: str):
    """
    Decorator to track knowledge base query metrics.

    Args:
        query_type: Type of query (search, cluster, similar, hybrid)

    Usage:
        @track_kb_query(query_type="search")
        async def search_issues(...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            status = "success"

            try:
                result = await func(*args, **kwargs)

                # Track result count if applicable
                if isinstance(result, (list, tuple)):
                    RAG_RETRIEVAL_RESULTS.observe(len(result))

                return result
            except Exception as e:
                status = "error"
                logger.error(f"KB query failed: {e}")
                raise
            finally:
                duration = time.time() - start_time

                KB_QUERIES_TOTAL.labels(
                    query_type=query_type,
                    status=status
                ).inc()

                KB_QUERY_DURATION.labels(
                    query_type=query_type
                ).observe(duration)

        return wrapper
    return decorator


def track_embedding_generation(func: Callable) -> Callable:
    """
    Decorator to track embedding generation metrics.

    Usage:
        @track_embedding_generation
        def generate_embedding(text: str):
            ...
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        start_time = time.time()
        status = "success"

        try:
            result = func(*args, **kwargs)

            # Track batch size if applicable
            if isinstance(result, list):
                EMBEDDING_BATCH_SIZE.observe(len(result))

            return result
        except Exception as e:
            status = "error"
            logger.error(f"Embedding generation failed: {e}")
            raise
        finally:
            duration = time.time() - start_time

            EMBEDDING_REQUESTS_TOTAL.labels(status=status).inc()
            EMBEDDING_DURATION.observe(duration)

    return wrapper


def track_clustering(func: Callable) -> Callable:
    """
    Decorator to track clustering operation metrics.

    Usage:
        @track_clustering
        def cluster_errors(embeddings: List[List[float]]):
            ...
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        start_time = time.time()

        try:
            result = func(*args, **kwargs)

            # Track number of clusters created
            if isinstance(result, list):
                CLUSTERS_CREATED.observe(len(result))

            return result
        except Exception as e:
            logger.error(f"Clustering failed: {e}")
            raise
        finally:
            duration = time.time() - start_time
            CLUSTERING_DURATION.observe(duration)

    return wrapper


# ============= Setup Functions =============

def initialize_system_info(
    version: str = "unknown",
    environment: str = "development",
    embedding_model: str = "jina-embeddings-v2-base-code",
    vector_dimension: int = 768
) -> None:
    """
    Set system info metric at startup.

    Args:
        version: Application version
        environment: Deployment environment (development, staging, production)
        embedding_model: Embedding model in use
        vector_dimension: Dimension of embedding vectors

    Usage:
        # In main.py startup
        initialize_system_info(
            version=settings.VERSION,
            environment=settings.ENVIRONMENT
        )
    """
    SYSTEM_INFO.info({
        'version': version,
        'environment': environment,
        'embedding_model': embedding_model,
        'vector_dimension': str(vector_dimension)
    })

    logger.info(
        f"System info initialized: version={version}, env={environment}"
    )


def setup_metrics_endpoint(app: FastAPI) -> None:
    """
    Mount Prometheus metrics endpoint on FastAPI app.

    Args:
        app: FastAPI application instance

    Usage:
        app = FastAPI()
        setup_metrics_endpoint(app)
        # Metrics available at /metrics
    """
    from prometheus_client import make_asgi_app

    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

    logger.info("Prometheus metrics endpoint mounted at /metrics")


# ============= Helper Functions =============

def record_cache_hit(cache_type: str) -> None:
    """Record a cache hit."""
    RAG_CACHE_HITS.labels(cache_type=cache_type).inc()


def record_cache_miss(cache_type: str) -> None:
    """Record a cache miss."""
    RAG_CACHE_MISSES.labels(cache_type=cache_type).inc()


def record_feedback(feedback_type: str) -> None:
    """Record a feedback submission."""
    FEEDBACK_TOTAL.labels(feedback_type=feedback_type).inc()


def record_sentry_webhook(event_type: str, status: str = "success") -> None:
    """Record a Sentry webhook."""
    SENTRY_WEBHOOK_TOTAL.labels(event_type=event_type, status=status).inc()


def update_kb_issue_count(validated: int, pending: int, total: int) -> None:
    """Update knowledge base issue counts."""
    KB_ISSUES_TOTAL.labels(status="validated").set(validated)
    KB_ISSUES_TOTAL.labels(status="pending").set(pending)
    KB_ISSUES_TOTAL.labels(status="all").set(total)
