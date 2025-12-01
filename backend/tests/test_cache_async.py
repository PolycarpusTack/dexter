"""
Security tests for cache service async operations.

Tests Issue 2 fix: Blocking Redis calls in async context.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.cache_service import CacheService


@pytest.fixture
def mock_redis_client():
    """Create a mock async Redis client."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.setex = AsyncMock(return_value=True)
    mock.delete = AsyncMock(return_value=1)
    mock.scan_iter = AsyncMock()
    mock.close = AsyncMock()
    return mock


@pytest.mark.asyncio
async def test_redis_get_is_async():
    """Test that Redis get operations are async (don't block event loop)."""
    # Create cache service without actual Redis
    cache = CacheService(redis_url=None)

    # Mock the redis client
    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value='{"test": "value"}')
    cache.redis_client = mock_redis

    # Call get - should be awaitable
    result = await cache.get("test_key")

    # Verify it called the async method
    mock_redis.get.assert_awaited_once_with("test_key")


@pytest.mark.asyncio
async def test_redis_set_is_async():
    """Test that Redis set operations are async (don't block event loop)."""
    cache = CacheService(redis_url=None)

    # Mock the redis client
    mock_redis = AsyncMock()
    mock_redis.setex = AsyncMock(return_value=True)
    cache.redis_client = mock_redis

    # Call set - should be awaitable
    result = await cache.set("test_key", {"test": "value"}, ttl=300)

    # Verify it called the async method
    mock_redis.setex.assert_awaited_once()


@pytest.mark.asyncio
async def test_redis_delete_is_async():
    """Test that Redis delete operations are async (don't block event loop)."""
    cache = CacheService(redis_url=None)

    # Mock the redis client
    mock_redis = AsyncMock()
    mock_redis.delete = AsyncMock(return_value=1)
    cache.redis_client = mock_redis

    # Call delete - should be awaitable
    result = await cache.delete("test_key")

    # Verify it called the async method
    mock_redis.delete.assert_awaited_once_with("test_key")


@pytest.mark.asyncio
async def test_scan_iter_instead_of_keys():
    """Test that clear_pattern uses scan_iter, not keys() to avoid O(N) blocking."""
    cache = CacheService(redis_url=None)

    # Mock the redis client with scan_iter
    mock_redis = AsyncMock()

    # Mock scan_iter to return an async iterator
    async def mock_scan_iter(match):
        keys = ["key1", "key2", "key3"]
        for key in keys:
            yield key

    mock_redis.scan_iter = mock_scan_iter
    mock_redis.delete = AsyncMock(return_value=1)
    cache.redis_client = mock_redis

    # Clear pattern should use scan_iter
    result = await cache.clear_pattern("test:*")

    # Verify delete was called for each key
    assert mock_redis.delete.await_count == 3


@pytest.mark.asyncio
async def test_multiple_async_operations_dont_block():
    """Test that multiple async Redis operations can run concurrently."""
    cache = CacheService(redis_url=None)

    # Mock redis client with delays to simulate I/O
    mock_redis = AsyncMock()

    async def delayed_get(key):
        await asyncio.sleep(0.01)  # Simulate network delay
        return f"value_{key}"

    mock_redis.get = delayed_get
    cache.redis_client = mock_redis

    # Run multiple operations concurrently
    start = asyncio.get_event_loop().time()
    results = await asyncio.gather(
        cache.get("key1"),
        cache.get("key2"),
        cache.get("key3"),
    )
    end = asyncio.get_event_loop().time()

    # If operations were blocking, this would take 0.03s (3 * 0.01s)
    # If truly async, should take ~0.01s (concurrent)
    elapsed = end - start

    # Should complete in roughly the time of one operation (with some overhead)
    assert elapsed < 0.025  # Less than 2.5x a single operation
    assert len(results) == 3


@pytest.mark.asyncio
async def test_cache_close_is_async():
    """Test that cache close operation is async."""
    cache = CacheService(redis_url=None)

    # Mock redis client
    mock_redis = AsyncMock()
    mock_redis.close = AsyncMock()
    cache.redis_client = mock_redis

    # Close should be awaitable
    await cache.close()

    # Verify close was awaited
    mock_redis.close.assert_awaited_once()


@pytest.mark.asyncio
async def test_scan_iter_handles_empty_results():
    """Test that scan_iter handles empty results gracefully."""
    cache = CacheService(redis_url=None)

    # Mock redis client with empty scan_iter
    mock_redis = AsyncMock()

    async def empty_scan_iter(match):
        # Return empty iterator
        return
        yield  # Never executes

    mock_redis.scan_iter = empty_scan_iter
    mock_redis.delete = AsyncMock()
    cache.redis_client = mock_redis

    # Should handle empty results
    result = await cache.clear_pattern("nonexistent:*")

    # Should succeed without errors
    assert result is True
    # Delete should not be called for empty results
    assert mock_redis.delete.await_count == 0


@pytest.mark.asyncio
async def test_scan_iter_handles_errors_gracefully():
    """Test that scan_iter handles Redis errors gracefully."""
    from redis.exceptions import RedisError

    cache = CacheService(redis_url=None)

    # Mock redis client that raises error
    mock_redis = AsyncMock()

    async def error_scan_iter(match):
        raise RedisError("Connection lost")

    mock_redis.scan_iter = error_scan_iter
    cache.redis_client = mock_redis

    # Should handle error gracefully and fall back to in-memory
    result = await cache.clear_pattern("test:*")

    # Should return True (from in-memory cache clearing)
    assert result is True


@pytest.mark.asyncio
async def test_async_operations_with_fallback_to_memory():
    """Test that async operations work with in-memory fallback."""
    cache = CacheService(redis_url=None)
    # No Redis client - should use in-memory cache

    # Set a value
    await cache.set("test_key", {"test": "value"}, ttl=300)

    # Get the value
    result = await cache.get("test_key")

    assert result == {"test": "value"}

    # Delete the value
    deleted = await cache.delete("test_key")
    assert deleted is True

    # Value should be gone
    result = await cache.get("test_key")
    assert result is None


@pytest.mark.asyncio
async def test_concurrent_in_memory_operations():
    """Test that in-memory cache handles concurrent operations safely."""
    cache = CacheService(redis_url=None)

    # Run many concurrent operations
    async def set_and_get(i):
        await cache.set(f"key_{i}", f"value_{i}", ttl=300)
        result = await cache.get(f"key_{i}")
        return result

    # Run 100 concurrent operations
    results = await asyncio.gather(*[set_and_get(i) for i in range(100)])

    # All should succeed
    assert len(results) == 100
    assert all(results[i] == f"value_{i}" for i in range(100))


def test_redis_client_uses_connection_pool():
    """Test that Redis client is configured with connection pool."""
    # This test checks the initialization, not actual async behavior
    with patch('app.services.cache_service.redis') as mock_redis_module:
        mock_redis_module.from_url = MagicMock(return_value=AsyncMock())

        cache = CacheService(redis_url="redis://localhost:6379/0")

        # Verify from_url was called with max_connections
        mock_redis_module.from_url.assert_called_once()
        call_kwargs = mock_redis_module.from_url.call_args[1]
        assert call_kwargs.get('max_connections') == 50


@pytest.mark.asyncio
async def test_clear_pattern_logs_deleted_count():
    """Test that clear_pattern logs the number of deleted keys."""
    cache = CacheService(redis_url=None)

    # Mock redis client
    mock_redis = AsyncMock()

    async def mock_scan_iter(match):
        keys = ["key1", "key2", "key3", "key4", "key5"]
        for key in keys:
            yield key

    mock_redis.scan_iter = mock_scan_iter
    mock_redis.delete = AsyncMock(return_value=1)
    cache.redis_client = mock_redis

    # Clear pattern
    with patch('app.services.cache_service.logger') as mock_logger:
        result = await cache.clear_pattern("test:*")

        # Verify logging
        mock_logger.info.assert_called()
        # Should log number of deleted keys
        log_message = mock_logger.info.call_args[0][0]
        assert "5 keys" in log_message or "5" in log_message
