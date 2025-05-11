# Dexter Caching Architecture

## Overview

Dexter implements a flexible caching system with Redis support and an in-memory fallback. This provides performance improvements while ensuring the application remains functional even when Redis is unavailable.

## Features

- **Redis caching** with automatic fallback to in-memory cache
- **Transparent integration** using Python decorators
- **Cache bypass** support via query parameters
- **Automatic cache invalidation** on data modifications
- **Cache headers** for transparency (X-Cache: HIT/MISS/BYPASS)
- **TTL (Time to Live)** configuration per endpoint

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│  API Request    │────▶│  @cached     │────▶│  Redis       │
│                 │     │  Decorator   │     │  Service     │
└─────────────────┘     └──────────────┘     └──────────────┘
                                                     │
                                                     ▼
                               ┌──────────────┐ ┌──────────────┐
                               │  In-Memory   │ │  Original    │
                               │  Fallback    │ │  Function    │
                               └──────────────┘ └──────────────┘
```

## Configuration

### Environment Variables

```env
REDIS_URL=redis://localhost:6379/0  # Optional, defaults to redis://localhost:6379/0
```

### Cache TTL Settings

| Endpoint | TTL | Reason |
|----------|-----|--------|
| `/api/v1/issues` | 5 minutes | Issues list updates frequently |
| `/api/v1/issues/{id}` | 1 minute | Issue details may change rapidly |
| `/api/v1/analytics/*` | 10 minutes | Analytics data is less volatile |

## Usage

### Adding Caching to an Endpoint

```python
from app.services.cache_service import cached

@router.get("/endpoint")
@cached(ttl=300, prefix="my_endpoint")  # 5 minute TTL
async def my_endpoint(request: Request, ...):
    # Your endpoint logic
    return response
```

### Cache Bypass

Users can bypass the cache by adding `?no_cache=true` to any cached endpoint:

```
GET /api/v1/issues?no_cache=true
```

### Cache Headers

All cached responses include cache headers:

```
X-Cache: HIT      # Response served from cache
X-Cache: MISS     # Response computed and cached
X-Cache: BYPASS   # Cache bypassed per request
Cache-Control: max-age=300  # TTL in seconds
```

## Cache Invalidation

The system includes automatic cache invalidation for data-modifying operations:

```python
# When updating an issue
async def update_issue_status(issue_id: str, ...):
    result = await sentry_client.update_issue_status(...)
    
    # Invalidate cache for this issue and the issues list
    await invalidate_issue_cache(request.app.state.cache, issue_id)
    
    return result
```

## Implementation Details

### Cache Service

The `CacheService` class handles all caching operations:

- Attempts to use Redis first
- Falls back to in-memory cache if Redis is unavailable
- Provides consistent API regardless of backend

### In-Memory Cache

The `InMemoryCache` class provides:

- TTL support with automatic expiration
- Thread-safe operations using asyncio locks
- Simple key-value storage

### Cache Key Generation

Cache keys are generated consistently:

```python
def create_key(self, prefix: str, params: Dict[str, Any]) -> str:
    sorted_params = sorted(params.items())
    param_str = "&".join([f"{k}={v}" for k, v in sorted_params if v is not None])
    return f"{prefix}:{param_str}" if param_str else prefix
```

Example keys:
- `list_issues:organization=myorg&project=myproject&status=unresolved`
- `get_issue:path=/api/v1/issues/123&query=`

## Performance Considerations

1. **Redis Connection**: Uses connection pooling and health checks
2. **In-Memory Limits**: No size limits (consider adding LRU eviction for production)
3. **Serialization**: Uses JSON for data serialization
4. **Key Patterns**: Supports wildcard pattern matching for bulk invalidation

## Testing

The cache system includes comprehensive tests:

```bash
pytest backend/tests/test_cache_service.py
```

Test coverage includes:
- Basic cache operations (get, set, delete)
- TTL expiration
- Cache invalidation patterns
- Decorator functionality
- Cache bypass behavior

## Monitoring

Monitor cache performance using:

1. **Response Headers**: Check X-Cache values to see hit rates
2. **Redis Metrics**: Monitor Redis memory usage and hit/miss ratios
3. **Application Logs**: Cache operations are logged for debugging

## Future Enhancements

1. **LRU Eviction**: Add size limits to in-memory cache
2. **Distributed Caching**: Support for Redis Cluster
3. **Cache Warming**: Pre-populate cache for frequently accessed data
4. **Cache Analytics**: Track hit rates and performance metrics
5. **Compression**: Compress large cached values to save memory
