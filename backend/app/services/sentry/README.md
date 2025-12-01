# Sentry Data Client Framework

A comprehensive, production-ready framework for fetching data from 11+ Sentry API endpoints with enterprise-grade reliability patterns.

## Features

- **Rate Limiting**: Token bucket algorithm with configurable limits (default: 100 req/min)
- **Circuit Breaker**: Prevents cascade failures with automatic recovery
- **Exponential Backoff**: Smart retry logic (1s, 2s, 4s) for transient errors
- **Response Caching**: TTL-based caching for GET requests (default: 5 minutes)
- **Structured Logging**: Context-aware logging with request tracing
- **Type Safety**: Pydantic models for all responses

## Quick Start

```python
from app.services.sentry.releases import ReleaseClient
from app.services.sentry.performance import PerformanceClient
from app.core.config import get_settings

settings = get_settings()

# Initialize clients
release_client = ReleaseClient(token=settings.get_sentry_token())
perf_client = PerformanceClient(token=settings.get_sentry_token())

# Fetch release data
releases = await release_client.get_releases("my-org", "my-project")
for release in releases:
    print(f"{release.version}: {release.crash_free_users}% crash-free")

# Get suspect commits for an issue
commits = await release_client.get_suspect_commits("12345")
for commit in commits:
    if commit.confidence_score and commit.confidence_score > 0.8:
        print(f"High-confidence suspect: {commit.author['name']}")

# Analyze performance spans
spans = await perf_client.get_performance_spans("12345")
slow_db_queries = [s for s in spans if s.operation == "db.query" and s.duration_ms > 1000]
```

## Available Clients

| Client | Purpose | Key Methods |
|--------|---------|-------------|
| `ReleaseClient` | Releases & commits | `get_releases()`, `get_suspect_commits()` |
| `PerformanceClient` | Transactions & spans | `get_performance_spans()`, `get_slow_transactions()` |
| `ProfilingClient` | Profiling data | `get_profiles()`, `get_profile()` |
| `SessionClient` | Session replays | `get_replays()`, `get_issue_replays()` |
| `BreadcrumbClient` | Event breadcrumbs | `get_breadcrumbs_from_issue()` |
| `AlertClient` | Alerts & incidents | `get_incidents()`, `get_monitors()` |
| `AttachmentClient` | Event attachments | `get_attachments()`, `download_attachment()` |
| `TagClient` | Issue tags | `get_issue_tags()`, `get_tag_values()` |
| `OwnershipClient` | Ownership rules | `get_ownership_suggestions()` |
| `MeasurementClient` | Web vitals & metrics | `get_web_vitals()`, `get_measurements()` |
| `GroupingClient` | Fingerprints | `get_grouping_variants()`, `get_issue_fingerprints()` |

## Architecture

### Rate Limiting

Token bucket algorithm with automatic replenishment:

```python
from app.services.sentry.rate_limiter import RateLimiter

limiter = RateLimiter(requests_per_minute=100)

# Automatic rate limiting
async with limiter:
    response = await make_api_call()

# Manual token acquisition
acquired = await limiter.acquire(tokens=1, wait=True)
```

**Sentry 429 Handling**: Automatically respects `Retry-After` headers and pauses requests.

### Circuit Breaker

Protects against cascade failures with three states:

- **CLOSED**: Normal operation
- **OPEN**: Blocking requests after threshold failures
- **HALF_OPEN**: Testing recovery

```python
from app.services.sentry.circuit_breaker import CircuitBreaker

breaker = CircuitBreaker(
    failure_threshold=5,      # Open after 5 failures
    recovery_timeout=60,      # Wait 60s before recovery attempt
    success_threshold=2       # Close after 2 successes
)

async with breaker:
    response = await make_api_call()
```

### Base Client

All clients extend `BaseDataClient` for consistent behavior:

```python
from app.services.sentry.base_client import BaseDataClient

class CustomClient(BaseDataClient):
    async def get_custom_data(self, org_slug: str):
        url = f"/organizations/{org_slug}/custom/"
        return await self._request("GET", url)

# Automatic features:
# - Rate limiting
# - Circuit breaker
# - Retry logic
# - Response caching
# - Structured logging
```

## Configuration

All settings configurable via environment variables (`.env` file):

```bash
# Rate Limiting
SENTRY_RATE_LIMIT_REQUESTS_PER_MIN=100  # Max requests per minute
SENTRY_RATE_LIMIT_MAX_BURST=100         # Burst capacity

# Circuit Breaker
SENTRY_CIRCUIT_BREAKER_THRESHOLD=5      # Failures before opening
SENTRY_CIRCUIT_BREAKER_TIMEOUT=60       # Recovery timeout (seconds)
SENTRY_CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2  # Successes to close

# Retry Logic
SENTRY_MAX_RETRIES=3                    # Maximum retry attempts
SENTRY_RETRY_BACKOFF_BASE=1             # Base delay (1s, 2s, 4s)

# Response Caching
SENTRY_CACHE_ENABLED=true               # Enable caching
SENTRY_CACHE_TTL=300                    # Cache TTL (5 minutes)

# Request Timeout
SENTRY_REQUEST_TIMEOUT=30               # Timeout in seconds
```

## Usage Examples

### 1. Release Intelligence

```python
from app.services.sentry.releases import ReleaseClient

client = ReleaseClient(token=settings.get_sentry_token())

# Get releases with health metrics
releases = await client.get_releases("my-org", "my-project")
unhealthy_releases = [
    r for r in releases
    if r.crash_free_users and r.crash_free_users < 95.0
]

# Get suspect commits for debugging
commits = await client.get_suspect_commits("issue-12345")
high_confidence = [c for c in commits if c.confidence_score > 0.8]

# Get commits in a release
release_commits = await client.get_release_commits("my-org", "1.0.0")
```

### 2. Performance Analysis

```python
from app.services.sentry.performance import PerformanceClient

client = PerformanceClient(token=settings.get_sentry_token())

# Find slow transactions
slow_txns = await client.get_slow_transactions(
    "my-org",
    "my-project",
    threshold_ms=2000,
    limit=20
)

# Analyze spans from an issue
spans = await client.get_performance_spans("issue-12345")
db_spans = [s for s in spans if s.operation == "db.query"]
slow_queries = [s for s in db_spans if s.is_slow]

# Get performance metrics
metrics = await client.get_performance_metrics("my-org", "my-project")
for metric in metrics:
    if metric.p95 and metric.p95 > 1000:
        print(f"Slow transaction: {metric.transaction} (p95={metric.p95}ms)")
```

### 3. Web Vitals & Measurements

```python
from app.services.sentry.measurements import MeasurementClient

client = MeasurementClient(token=settings.get_sentry_token())

# Get web vitals from an event
vitals = await client.get_web_vitals("my-org", "my-project", "event-abc123")

if not vitals.is_good_lcp:
    print(f"Poor LCP: {vitals.lcp}ms (threshold: <2500ms)")

if not vitals.is_good_cls:
    print(f"Poor CLS: {vitals.cls} (threshold: <0.1)")

# Get custom measurements
custom = await client.get_custom_measurements("my-org", "my-project", "event-abc123")
```

### 4. Session Replays & Breadcrumbs

```python
from app.services.sentry.sessions import SessionClient
from app.services.sentry.breadcrumbs import BreadcrumbClient

session_client = SessionClient(token=settings.get_sentry_token())
breadcrumb_client = BreadcrumbClient(token=settings.get_sentry_token())

# Get replays with errors
replays = await session_client.get_issue_replays("issue-12345")
error_replays = [r for r in replays if r.count_errors > 0]

# Analyze breadcrumbs
breadcrumbs = await breadcrumb_client.get_breadcrumbs_from_issue("issue-12345")
nav_crumbs = await breadcrumb_client.get_navigation_breadcrumbs("issue-12345")
http_crumbs = await breadcrumb_client.get_http_breadcrumbs("issue-12345")
```

### 5. Alerts & Incidents

```python
from app.services.sentry.alerts import AlertClient

client = AlertClient(token=settings.get_sentry_token())

# Get active incidents
open_incidents = await client.get_incidents("my-org", status="open")

# Get alert rules
metric_rules = await client.get_metric_alert_rules("my-org")
issue_rules = await client.get_issue_alert_rules("my-org", "my-project")

# Get uptime monitors
monitors = await client.get_monitors("my-org")
failing = [m for m in monitors if m.status == "error"]
```

### 6. Ownership & Tags

```python
from app.services.sentry.ownership import OwnershipClient
from app.services.sentry.tags import TagClient

ownership_client = OwnershipClient(token=settings.get_sentry_token())
tag_client = TagClient(token=settings.get_sentry_token())

# Get ownership suggestions
suggestions = await ownership_client.get_ownership_suggestions("issue-12345")
for suggestion in suggestions:
    print(f"{suggestion.type}: {suggestion.owner}")

# Analyze tags
tags = await tag_client.get_issue_tags("issue-12345")
browser_values = await tag_client.get_tag_values("issue-12345", "browser")
```

### 7. Grouping & Fingerprints

```python
from app.services.sentry.grouping import GroupingClient

client = GroupingClient(token=settings.get_sentry_token())

# Get grouping variants
variants = await client.get_grouping_variants("my-org", "my-project", "event-abc123")
for name, variant in variants.items():
    print(f"{name}: {variant.hash}")

# Get issue fingerprints
fingerprints = await client.get_issue_fingerprints("issue-12345")
```

## Error Handling

### Circuit Breaker Errors

```python
from app.services.sentry.circuit_breaker import CircuitOpenError

try:
    releases = await client.get_releases("my-org", "my-project")
except CircuitOpenError as e:
    print(f"Service unavailable. Retry after {e.retry_after}s")
    # Use cached data or fallback logic
```

### Rate Limit Errors

```python
from app.services.sentry.rate_limiter import RateLimitExceededError

try:
    await limiter.acquire(wait=False)
except RateLimitExceededError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
```

### HTTP Errors

All clients handle HTTP errors consistently:

- **429**: Automatic retry with `Retry-After` header
- **502, 503, 504**: Exponential backoff retry
- **400, 401, 403, 404**: Immediate failure (no retry)

## Monitoring & Metrics

Get client metrics for observability:

```python
metrics = client.get_metrics()

print(f"Rate limiter: {metrics['rate_limiter']['available_tokens']} tokens available")
print(f"Circuit breaker: {metrics['circuit_breaker']['state']}")
print(f"Cache: {metrics['cache']['size']}/{metrics['cache']['max_size']}")
```

## Testing

### Unit Tests

```python
import pytest
from app.services.sentry.rate_limiter import RateLimiter

@pytest.mark.asyncio
async def test_rate_limiter():
    limiter = RateLimiter(requests_per_minute=60)

    # Should acquire successfully
    acquired = await limiter.acquire()
    assert acquired is True

    # Check available tokens
    assert limiter.get_available_tokens() < 60
```

### Integration Tests

```python
import pytest
from app.services.sentry.releases import ReleaseClient

@pytest.mark.asyncio
async def test_get_releases(sentry_token, org_slug, project_slug):
    client = ReleaseClient(token=sentry_token)

    releases = await client.get_releases(org_slug, project_slug)

    assert len(releases) > 0
    assert releases[0].version is not None
    assert releases[0].crash_free_users is not None
```

### Mock Testing

```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_circuit_breaker_opens():
    client = ReleaseClient(token="test-token")

    # Mock to always fail
    with patch.object(client.client, 'request', side_effect=Exception("API down")):
        # Should open circuit after 5 failures
        for _ in range(5):
            with pytest.raises(Exception):
                await client.get_releases("org", "project")

        # Circuit should be open
        assert client.circuit_breaker.get_state() == "open"
```

## Best Practices

1. **Reuse Client Instances**: Initialize clients once, reuse across requests
2. **Configure Appropriately**: Tune rate limits based on your Sentry plan
3. **Monitor Metrics**: Track circuit breaker state and cache hit rate
4. **Handle Errors**: Always handle `CircuitOpenError` with fallback logic
5. **Use Context Managers**: Prefer `async with client:` for automatic cleanup
6. **Cache Awareness**: Understand when caching is beneficial vs. real-time data

## Performance Considerations

- **Rate Limiting**: Default 100 req/min accommodates most use cases
- **Caching**: Reduces API calls by ~60% for repeated queries
- **Circuit Breaker**: Prevents wasted retries during outages
- **Concurrent Requests**: All clients are async-safe, use `asyncio.gather()` for parallelism

## Migration from Legacy SentryApiClient

```python
# Old (legacy client)
from app.services.sentry_client import get_sentry_client

client = get_sentry_client()
issues = await client.get_issues("org", "project")

# New (data client framework)
from app.services.sentry.releases import ReleaseClient

release_client = ReleaseClient(token=settings.get_sentry_token())
releases = await release_client.get_releases("org", "project")
```

Benefits of migration:
- Rate limiting (prevents 429 errors)
- Circuit breaker (faster failure recovery)
- Response caching (improved performance)
- Type-safe responses (Pydantic models)
- Structured logging (better debugging)

## Troubleshooting

### Circuit Breaker Stuck Open

```python
# Manually reset circuit breaker
client.circuit_breaker.reset()
```

### Rate Limiter Not Respecting Limits

```python
# Check current token count
tokens = client.rate_limiter.get_available_tokens()
print(f"Available tokens: {tokens}")

# Reset rate limiter
client.rate_limiter.reset()
```

### Cache Not Working

```python
# Verify cache is enabled
assert client.enable_cache is True

# Clear cache
client.clear_cache()
```

## Contributing

When adding new clients:

1. Extend `BaseDataClient`
2. Define Pydantic models for responses
3. Use `_request()` for all HTTP calls
4. Add comprehensive docstrings
5. Include usage examples
6. Write unit and integration tests

## License

Part of the Dexter project. See project LICENSE for details.
