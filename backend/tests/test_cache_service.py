"""
Test suite for cache service functionality
"""
import pytest
import asyncio
import json
from unittest.mock import Mock, patch
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse

from app.services.cache_service import CacheService, InMemoryCache, cached, invalidate_issue_cache


class TestInMemoryCache:
    """Test InMemoryCache class"""
    
    @pytest.mark.asyncio
    async def test_set_and_get(self):
        cache = InMemoryCache()
        
        # Set a value
        await cache.set("test_key", "test_value", ttl=60)
        
        # Get the value
        value = await cache.get("test_key")
        assert value == "test_value"
    
    @pytest.mark.asyncio
    async def test_expire(self):
        cache = InMemoryCache()
        
        # Set a value with short TTL
        await cache.set("test_key", "test_value", ttl=1)
        
        # Wait for expiration
        await asyncio.sleep(2)
        
        # Should return None
        value = await cache.get("test_key")
        assert value is None
    
    @pytest.mark.asyncio
    async def test_delete(self):
        cache = InMemoryCache()
        
        # Set a value
        await cache.set("test_key", "test_value", ttl=60)
        
        # Delete the value
        result = await cache.delete("test_key")
        assert result is True
        
        # Should return None
        value = await cache.get("test_key")
        assert value is None
    
    @pytest.mark.asyncio
    async def test_clear(self):
        cache = InMemoryCache()
        
        # Set multiple values
        await cache.set("key1", "value1", ttl=60)
        await cache.set("key2", "value2", ttl=60)
        
        # Clear cache
        await cache.clear()
        
        # Both should return None
        assert await cache.get("key1") is None
        assert await cache.get("key2") is None


class TestCacheService:
    """Test CacheService class"""
    
    @pytest.mark.asyncio
    async def test_init_without_redis(self):
        cache_service = CacheService()
        assert cache_service.redis_client is None
        assert cache_service.in_memory_cache is not None
    
    @pytest.mark.asyncio
    async def test_set_and_get_json(self):
        cache_service = CacheService()
        
        # Set a dictionary
        test_data = {"key": "value", "number": 42}
        await cache_service.set("test_key", test_data, ttl=60)
        
        # Get the value
        result = await cache_service.get("test_key")
        assert result == test_data
    
    @pytest.mark.asyncio
    async def test_create_key(self):
        cache_service = CacheService()
        
        # Test with params
        key = cache_service.create_key("test_prefix", {"param1": "value1", "param2": "value2"})
        assert key == "test_prefix:param1=value1&param2=value2"
        
        # Test with empty params
        key = cache_service.create_key("test_prefix", {})
        assert key == "test_prefix"
        
        # Test with None values (should be filtered)
        key = cache_service.create_key("test_prefix", {"param1": "value1", "param2": None})
        assert key == "test_prefix:param1=value1"
    
    @pytest.mark.asyncio
    async def test_clear_pattern(self):
        cache_service = CacheService()
        
        # Set multiple values
        await cache_service.set("issues:1", {"id": 1}, ttl=60)
        await cache_service.set("issues:2", {"id": 2}, ttl=60)
        await cache_service.set("other:1", {"id": 1}, ttl=60)
        
        # Clear pattern
        await cache_service.clear_pattern("issues:*")
        
        # Issues should be cleared
        assert await cache_service.get("issues:1") is None
        assert await cache_service.get("issues:2") is None
        
        # Other key should remain
        assert await cache_service.get("other:1") == {"id": 1}


class TestCachedDecorator:
    """Test cached decorator functionality"""
    
    @pytest.mark.asyncio
    async def test_cache_hit(self):
        # Mock request and app
        mock_request = Mock(spec=Request)
        mock_request.url.path = "/test/path"
        mock_request.query_params = {}
        
        mock_cache = Mock(spec=CacheService)
        mock_cache.create_key.return_value = "test_key"
        mock_cache.get.return_value = {"cached": "data"}
        
        mock_request.app.state.cache = mock_cache
        
        # Define decorated function
        @cached(ttl=300, prefix="test")
        async def test_func(request, **kwargs):
            return JSONResponse(content={"new": "data"})
        
        # Call function
        response = await test_func(mock_request)
        
        # Should return cached data
        assert response.headers['X-Cache'] = 'HIT'
        mock_cache.get.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_cache_miss(self):
        # Mock request and app
        mock_request = Mock(spec=Request)
        mock_request.url.path = "/test/path"
        mock_request.query_params = {}
        
        mock_cache = Mock(spec=CacheService)
        mock_cache.create_key.return_value = "test_key"
        mock_cache.get.return_value = None  # Cache miss
        
        mock_request.app.state.cache = mock_cache
        
        # Define decorated function
        @cached(ttl=300, prefix="test")
        async def test_func(request, **kwargs):
            return JSONResponse(content={"new": "data"})
        
        # Call function
        response = await test_func(mock_request)
        
        # Should set cache and return new data
        assert response.headers['X-Cache'] = 'MISS'
        mock_cache.set.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_cache_bypass(self):
        # Mock request with no_cache parameter
        mock_request = Mock(spec=Request)
        mock_request.url.path = "/test/path"
        mock_request.query_params = {"no_cache": "true"}
        
        mock_cache = Mock(spec=CacheService)
        mock_request.app.state.cache = mock_cache
        
        # Define decorated function
        @cached(ttl=300, prefix="test")
        async def test_func(request, **kwargs):
            return JSONResponse(content={"new": "data"})
        
        # Call function
        response = await test_func(mock_request)
        
        # Should bypass cache
        assert response.headers['X-Cache'] = 'BYPASS'
        mock_cache.get.assert_not_called()
        mock_cache.set.assert_not_called()


@pytest.mark.asyncio
async def test_invalidate_issue_cache():
    """Test cache invalidation function"""
    mock_cache = Mock(spec=CacheService)
    
    # Test with specific issue ID
    await invalidate_issue_cache(mock_cache, "123")
    mock_cache.delete.assert_called_once_with("get_issue:path=/api/v1/issues/123&query=")
    mock_cache.clear_pattern.assert_called_once_with("list_issues:*")
    
    # Reset mocks
    mock_cache.reset_mock()
    
    # Test without issue ID
    await invalidate_issue_cache(mock_cache)
    mock_cache.clear_pattern.assert_called_once_with("*issues*")
