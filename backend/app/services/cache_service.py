"""
Cache service for Dexter application.
Provides Redis-based caching with in-memory fallback.
"""

import json
import time
import asyncio
from typing import Any, Optional, Union, Dict, Callable
from datetime import timedelta
from functools import wraps
import logging
from fastapi import Request, Response
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Try to import Redis, but don't fail if it's not available
redis_available = False
try:
    import redis
    from redis.exceptions import RedisError
    redis_available = True
    logger.info("Redis module found and loaded successfully")
except ImportError:
    logger.warning("Redis module not found. Using in-memory cache only.")
    # Create placeholder for RedisError to avoid undefined reference
    class RedisError(Exception):
        """Placeholder for Redis errors when Redis is not available."""
        pass


class InMemoryCache:
    """Simple in-memory cache with TTL support."""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache if not expired."""
        async with self._lock:
            if key in self._cache:
                item = self._cache[key]
                if item['expires_at'] > time.time():
                    return item['value']
                else:
                    del self._cache[key]
            return None
    
    async def set(self, key: str, value: str, ttl: int) -> bool:
        """Set value in cache with TTL."""
        async with self._lock:
            self._cache[key] = {
                'value': value,
                'expires_at': time.time() + ttl
            }
            return True
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    async def clear(self) -> bool:
        """Clear entire cache."""
        async with self._lock:
            self._cache.clear()
            return True


class CacheService:
    """
    Cache service with Redis support and in-memory fallback.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_client = None
        self.in_memory_cache = InMemoryCache()
        
        if redis_url and redis_available:
            try:
                self.redis_client = redis.Redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                # Test connection
                self.redis_client.ping()
                logger.info("Redis cache initialized successfully")
            except (RedisError, ConnectionError) as e:
                logger.warning(f"Failed to connect to Redis: {e}. Using in-memory cache.")
                self.redis_client = None
        else:
            if not redis_available:
                logger.warning("Redis module not available. Using in-memory cache only.")
            else:
                logger.info("No Redis URL provided. Using in-memory cache.")
    
    async def _get_from_redis(self, key: str) -> Optional[str]:
        """Get value from Redis with error handling."""
        if not self.redis_client:
            return None
        
        try:
            return self.redis_client.get(key)
        except RedisError as e:
            logger.warning(f"Redis get error: {e}")
            return None
    
    async def _set_to_redis(self, key: str, value: str, ttl: int) -> bool:
        """Set value in Redis with error handling."""
        if not self.redis_client:
            return False
        
        try:
            return bool(self.redis_client.setex(key, ttl, value))
        except RedisError as e:
            logger.warning(f"Redis set error: {e}")
            return False
    
    async def _delete_from_redis(self, key: str) -> bool:
        """Delete key from Redis with error handling."""
        if not self.redis_client:
            return False
        
        try:
            return bool(self.redis_client.delete(key))
        except RedisError as e:
            logger.warning(f"Redis delete error: {e}")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache (Redis first, then in-memory)."""
        # Try Redis first
        value = await self._get_from_redis(key)
        if value is not None:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        
        # Fallback to in-memory cache
        value = await self.in_memory_cache.get(key)
        if value is not None:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL in seconds."""
        # Serialize value
        if isinstance(value, (dict, list)):
            value_str = json.dumps(value)
        else:
            value_str = str(value)
        
        # Try Redis first
        redis_success = await self._set_to_redis(key, value_str, ttl)
        
        # Also set in in-memory cache for redundancy
        memory_success = await self.in_memory_cache.set(key, value_str, ttl)
        
        return redis_success or memory_success
    
    async def delete(self, key: str) -> bool:
        """Delete key from both caches."""
        redis_success = await self._delete_from_redis(key)
        memory_success = await self.in_memory_cache.delete(key)
        
        return redis_success or memory_success
    
    async def clear_pattern(self, pattern: str) -> bool:
        """Clear keys matching pattern."""
        success = False
        
        # Clear from Redis
        if self.redis_client and redis_available:
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
                success = True
            except RedisError as e:
                logger.warning(f"Redis clear pattern error: {e}")
        
        # For in-memory cache, we need to iterate through all keys
        # This is less efficient but works for the fallback case
        keys_to_delete = []
        async with self.in_memory_cache._lock:
            for key in self.in_memory_cache._cache:
                if pattern.replace('*', '') in key:
                    keys_to_delete.append(key)
        
        for key in keys_to_delete:
            await self.in_memory_cache.delete(key)
            success = True
        
        return success
    
    def create_key(self, prefix: str, params: Dict[str, Any]) -> str:
        """Create cache key from prefix and parameters."""
        # Sort params for consistent keys
        sorted_params = sorted(params.items())
        param_str = "&".join([f"{k}={v}" for k, v in sorted_params if v is not None])
        return f"{prefix}:{param_str}" if param_str else prefix


def cached(ttl: int = 300, prefix: str = ""):
    """
    Decorator for caching endpoint responses.
    
    Args:
        ttl: Time to live in seconds
        prefix: Cache key prefix
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Check if cache bypass is requested
            if request.query_params.get('no_cache') == 'true':
                response = await func(request, *args, **kwargs)
                if isinstance(response, Response):
                    response.headers['X-Cache'] = 'BYPASS'
                return response
            
            # Get cache service from app state
            cache_service: CacheService = request.app.state.cache
            
            # Create cache key
            cache_params = {
                'path': request.url.path,
                'query': str(request.query_params),
                **kwargs  # Include path parameters
            }
            cache_key = cache_service.create_key(prefix or func.__name__, cache_params)
            
            # Try to get from cache
            cached_value = await cache_service.get(cache_key)
            if cached_value is not None:
                response = JSONResponse(content=cached_value)
                response.headers['X-Cache'] = 'HIT'
                response.headers['Cache-Control'] = f'max-age={ttl}'
                return response
            
            # Call the actual function
            response = await func(request, *args, **kwargs)
            
            # Cache the response
            if response.status_code == 200:
                if isinstance(response, JSONResponse):
                    # Extract content from JSONResponse
                    content = json.loads(response.body.decode())
                    await cache_service.set(cache_key, content, ttl)
                elif hasattr(response, 'body'):
                    # Handle other response types
                    try:
                        content = json.loads(response.body.decode())
                        await cache_service.set(cache_key, content, ttl)
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        pass
                
                response.headers['X-Cache'] = 'MISS'
                response.headers['Cache-Control'] = f'max-age={ttl}'
            
            return response
        
        return wrapper
    return decorator


# Cache invalidation functions
async def invalidate_issue_cache(cache_service: CacheService, issue_id: Optional[str] = None):
    """Invalidate issue-related cache entries."""
    if issue_id:
        # Invalidate specific issue
        await cache_service.delete(f"get_issue:path=/api/v1/issues/{issue_id}&query=")
        # Also invalidate the list cache as it might be affected
        await cache_service.clear_pattern("list_issues:*")
    else:
        # Invalidate all issue caches
        await cache_service.clear_pattern("*issues*")


async def invalidate_analytics_cache(cache_service: CacheService):
    """Invalidate analytics cache entries."""
    await cache_service.clear_pattern("*analytics*")


# Initialize global cache service (to be set in app startup)
cache_service = None
