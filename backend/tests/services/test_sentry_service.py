# File: backend/tests/services/test_sentry_service.py

import pytest
from unittest.mock import Mock, patch, AsyncMock
import httpx
from datetime import datetime

from app.services.sentry_service import SentryService
from app.core.errors import SentryAPIError, ExternalAPIError
from app.core.cache import cache_service

@pytest.fixture
def sentry_service():
    return SentryService(
        base_url="https://sentry.io/api/0",
        auth_token="test-token",
        organization="test-org",
        project="test-project"
    )

@pytest.fixture
def mock_httpx_client():
    with patch('httpx.AsyncClient') as mock:
        client = AsyncMock()
        mock.return_value.__aenter__.return_value = client
        yield client

class TestSentryService:
    @pytest.mark.asyncio
    async def test_list_events_success(self, sentry_service, mock_httpx_client):
        """Test successful event listing"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": "event-1", "message": "Error 1"},
            {"id": "event-2", "message": "Error 2"}
        ]
        mock_httpx_client.get.return_value = mock_response
        
        events = await sentry_service.list_events()
        
        assert len(events) == 2
        assert events[0]["id"] == "event-1"
        mock_httpx_client.get.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_list_events_with_pagination(self, sentry_service, mock_httpx_client):
        """Test event listing with pagination"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_response.headers = {"Link": '<https://sentry.io/api/0/events?cursor=next>; rel="next"'}
        mock_httpx_client.get.return_value = mock_response
        
        result = await sentry_service.list_events(paginate=True)
        
        assert "results" in result
        assert "next" in result
        assert result["next"] == "next"
    
    @pytest.mark.asyncio
    async def test_get_event_with_cache(self, sentry_service, mock_httpx_client):
        """Test event retrieval with caching"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "event-1", "message": "Error 1"}
        mock_httpx_client.get.return_value = mock_response
        
        # First call should hit the API
        event1 = await sentry_service.get_event("event-1")
        assert event1["id"] == "event-1"
        assert mock_httpx_client.get.call_count == 1
        
        # Second call should use cache
        event2 = await sentry_service.get_event("event-1")
        assert event2["id"] == "event-1"
        assert mock_httpx_client.get.call_count == 1  # Still 1
    
    @pytest.mark.asyncio
    async def test_batch_get_issues(self, sentry_service, mock_httpx_client):
        """Test batch issue retrieval"""
        # Mock individual responses
        issue1_response = Mock()
        issue1_response.status_code = 200
        issue1_response.json.return_value = {"id": "issue-1", "title": "Issue 1"}
        
        issue2_response = Mock()
        issue2_response.status_code = 404
        issue2_response.json.return_value = {"detail": "Not found"}
        
        mock_httpx_client.get.side_effect = [issue1_response, issue2_response]
        
        results = await sentry_service.batch_get_issues(["issue-1", "issue-2"])
        
        assert len(results) == 2
        assert results[0]["id"] == "issue-1"
        assert "error" in results[1]
        assert results[1]["error"] == "Not found"
    
    @pytest.mark.asyncio
    async def test_update_issue_status(self, sentry_service, mock_httpx_client):
        """Test updating issue status"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "issue-1", "status": "resolved"}
        mock_httpx_client.put.return_value = mock_response
        
        result = await sentry_service.update_issue("issue-1", {"status": "resolved"})
        
        assert result["status"] == "resolved"
        mock_httpx_client.put.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_bulk_update_issues(self, sentry_service, mock_httpx_client):
        """Test bulk issue update with partial failures"""
        # Mock responses
        response1 = Mock()
        response1.status_code = 200
        response1.json.return_value = {"id": "issue-1", "status": "resolved"}
        
        response2 = Mock()
        response2.status_code = 403
        response2.json.return_value = {"detail": "Permission denied"}
        
        mock_httpx_client.put.side_effect = [response1, response2]
        
        updates = [
            {"id": "issue-1", "status": "resolved"},
            {"id": "issue-2", "status": "resolved"}
        ]
        
        results = await sentry_service.bulk_update_issues(updates)
        
        assert len(results) == 2
        assert results[0]["status"] == "resolved"
        assert "error" in results[1]
        assert results[1]["error"] == "Permission denied"
    
    @pytest.mark.asyncio
    async def test_add_issue_comment(self, sentry_service, mock_httpx_client):
        """Test adding comment to issue"""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "id": "comment-1",
            "issue": "issue-1",
            "data": {"text": "Test comment"}
        }
        mock_httpx_client.post.return_value = mock_response
        
        result = await sentry_service.add_issue_comment("issue-1", "Test comment")
        
        assert result["data"]["text"] == "Test comment"
    
    @pytest.mark.asyncio
    async def test_search_events(self, sentry_service, mock_httpx_client):
        """Test searching events with filters"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{"id": "event-1", "message": "Search result"}]
        mock_httpx_client.get.return_value = mock_response
        
        results = await sentry_service.search_events(
            query="error",
            tags={"environment": "production"},
            date_range={"start": "2024-01-01", "end": "2024-01-31"}
        )
        
        assert len(results) == 1
        assert results[0]["message"] == "Search result"
        
        # Verify query parameters
        call_args = mock_httpx_client.get.call_args
        assert "params" in call_args[1]
        params = call_args[1]["params"]
        assert params["query"] == "error"
    
    @pytest.mark.asyncio
    async def test_get_event_context(self, sentry_service, mock_httpx_client):
        """Test getting enhanced event context"""
        mock_event = {"id": "event-1", "user": {"id": "user-1"}}
        mock_context = {"user": {"id": "user-1", "email": "test@example.com"}}
        
        event_response = Mock()
        event_response.status_code = 200
        event_response.json.return_value = mock_event
        
        context_response = Mock()
        context_response.status_code = 200
        context_response.json.return_value = mock_context
        
        mock_httpx_client.get.side_effect = [event_response, context_response]
        
        result = await sentry_service.get_event_context("event-1")
        
        assert result["user"]["email"] == "test@example.com"
    
    @pytest.mark.asyncio
    async def test_error_handling(self, sentry_service, mock_httpx_client):
        """Test various error scenarios"""
        # Test 404 error
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.json.return_value = {"detail": "Not found"}
        mock_httpx_client.get.return_value = mock_response
        
        with pytest.raises(SentryAPIError) as exc_info:
            await sentry_service.get_event("non-existent")
        
        assert exc_info.value.status_code == 404
        assert "Not found" in str(exc_info.value)
        
        # Test network error
        mock_httpx_client.get.side_effect = httpx.NetworkError("Connection failed")
        
        with pytest.raises(ExternalAPIError) as exc_info:
            await sentry_service.get_event("event-1")
        
        assert "Connection failed" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, sentry_service, mock_httpx_client):
        """Test rate limit handling"""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.headers = {"Retry-After": "60"}
        mock_response.json.return_value = {"detail": "Rate limit exceeded"}
        mock_httpx_client.get.return_value = mock_response
        
        with pytest.raises(SentryAPIError) as exc_info:
            await sentry_service.list_events()
        
        assert exc_info.value.status_code == 429
        assert exc_info.value.retry_after == 60
    
    @pytest.mark.asyncio
    async def test_cache_invalidation(self, sentry_service, mock_httpx_client):
        """Test cache invalidation on updates"""
        # Setup initial cached value
        event_key = f"sentry:event:event-1"
        await cache_service.set(event_key, {"id": "event-1", "status": "unresolved"})
        
        # Update event
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "event-1", "status": "resolved"}
        mock_httpx_client.put.return_value = mock_response
        
        await sentry_service.update_issue("event-1", {"status": "resolved"})
        
        # Verify cache was invalidated
        cached_value = await cache_service.get(event_key)
        assert cached_value is None
    
    @pytest.mark.asyncio
    async def test_performance_metrics(self, sentry_service, mock_httpx_client):
        """Test getting performance metrics"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "totalEvents": 1000,
            "avgResponseTime": 250,
            "errorRate": 0.05
        }
        mock_httpx_client.get.return_value = mock_response
        
        metrics = await sentry_service.get_performance_metrics()
        
        assert metrics["totalEvents"] == 1000
        assert metrics["errorRate"] == 0.05

class TestSentryServiceOptimizations:
    @pytest.mark.asyncio
    async def test_batch_request_optimization(self, sentry_service, mock_httpx_client):
        """Test that batch requests are optimized"""
        # Mock responses for batch operation
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": "issue-1", "title": "Issue 1"},
            {"id": "issue-2", "title": "Issue 2"}
        ]
        mock_httpx_client.post.return_value = mock_response
        
        # Override to use batch endpoint
        with patch.object(sentry_service, '_use_batch_endpoint', return_value=True):
            results = await sentry_service.batch_get_issues(["issue-1", "issue-2"])
        
        assert len(results) == 2
        assert mock_httpx_client.post.call_count == 1  # Single batch request
    
    @pytest.mark.asyncio
    async def test_request_deduplication(self, sentry_service, mock_httpx_client):
        """Test that concurrent identical requests are deduplicated"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "event-1", "message": "Test"}
        mock_httpx_client.get.return_value = mock_response
        
        # Make concurrent requests
        import asyncio
        tasks = [
            sentry_service.get_event("event-1"),
            sentry_service.get_event("event-1"),
            sentry_service.get_event("event-1")
        ]
        
        results = await asyncio.gather(*tasks)
        
        # All results should be the same
        assert all(r["id"] == "event-1" for r in results)
        # But only one actual API call should be made
        assert mock_httpx_client.get.call_count == 1
