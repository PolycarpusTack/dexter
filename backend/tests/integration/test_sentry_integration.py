# File: backend/tests/integration/test_sentry_integration.py

import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta

from app.services.sentry_service import SentryService
from app.core.cache import cache_service
from app.models.sentry_models import SentryEvent, SentryIssue

@pytest.fixture
async def setup_test_data():
    """Setup test data and clean up after tests"""
    # Clear cache before tests
    await cache_service.flush()
    
    yield
    
    # Clear cache after tests
    await cache_service.flush()

@pytest.fixture
def mock_sentry_api():
    """Mock the Sentry API responses"""
    with patch('httpx.AsyncClient') as mock:
        client = AsyncMock()
        mock.return_value.__aenter__.return_value = client
        
        # Setup default responses
        events_response = AsyncMock()
        events_response.status_code = 200
        events_response.json.return_value = [
            {"id": f"event-{i}", "message": f"Error {i}", "timestamp": datetime.utcnow().isoformat()}
            for i in range(10)
        ]
        
        issue_response = AsyncMock()
        issue_response.status_code = 200
        issue_response.json.return_value = {
            "id": "issue-1",
            "title": "Test Issue",
            "status": "unresolved",
            "count": "100",
            "userCount": 50
        }
        
        client.get.side_effect = lambda url, **kwargs: (
            events_response if "events" in url else issue_response
        )
        
        yield client

class TestSentryIntegration:
    @pytest.mark.asyncio
    async def test_end_to_end_event_flow(self, setup_test_data, mock_sentry_api):
        """Test complete event retrieval and processing flow"""
        service = SentryService(
            base_url="https://sentry.io/api/0",
            auth_token="test-token",
            organization="test-org",
            project="test-project"
        )
        
        # Fetch events
        events = await service.list_events(limit=10)
        assert len(events) == 10
        
        # Get specific event with caching
        event_id = events[0]["id"]
        event1 = await service.get_event(event_id)
        
        # Verify it's cached
        cache_key = f"sentry:event:{event_id}"
        cached_event = await cache_service.get(cache_key)
        assert cached_event is not None
        assert cached_event["id"] == event_id
        
        # Second retrieval should use cache
        with patch.object(mock_sentry_api, 'get') as mock_get:
            event2 = await service.get_event(event_id)
            mock_get.assert_not_called()
        
        assert event1 == event2
    
    @pytest.mark.asyncio
    async def test_concurrent_request_handling(self, setup_test_data, mock_sentry_api):
        """Test handling of concurrent requests"""
        service = SentryService(
            base_url="https://sentry.io/api/0",
            auth_token="test-token",
            organization="test-org",
            project="test-project"
        )
        
        # Create multiple concurrent requests
        tasks = []
        for i in range(20):
            # Mix of different operations
            if i % 3 == 0:
                tasks.append(service.list_events())
            elif i % 3 == 1:
                tasks.append(service.get_event(f"event-{i}"))
            else:
                tasks.append(service.get_issue(f"issue-{i}"))
        
        # Execute all requests concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify no failures
        errors = [r for r in results if isinstance(r, Exception)]
        assert len(errors) == 0
    
    @pytest.mark.asyncio
    async def test_cache_consistency(self, setup_test_data, mock_sentry_api):
        """Test cache consistency during updates"""
        service = SentryService(
            base_url="https://sentry.io/api/0",
            auth_token="test-token",
            organization="test-org",
            project="test-project"
        )
        
        # Get and cache an issue
        issue = await service.get_issue("issue-1")
        assert issue["status"] == "unresolved"
        
        # Update the issue
        update_response = AsyncMock()
        update_response.status_code = 200
        update_response.json.return_value = {**issue, "status": "resolved"}
        mock_sentry_api.put.return_value = update_response
        
        updated_issue = await service.update_issue("issue-1", {"status": "resolved"})
        assert updated_issue["status"] == "resolved"
        
        # Verify cache was invalidated and updated
        cached_issue = await cache_service.get("sentry:issue:issue-1")
        assert cached_issue is None  # Should be invalidated
        
        # Next get should fetch fresh data
        fresh_issue = await service.get_issue("issue-1")
        assert fresh_issue["status"] == "resolved"
    
    @pytest.mark.asyncio
    async def test_batch_operations_performance(self, setup_test_data, mock_sentry_api):
        """Test performance of batch operations"""
        service = SentryService(
            base_url="https://sentry.io/api/0",
            auth_token="test-token",
            organization="test-org",
            project="test-project"
        )
        
        # Prepare batch responses
        batch_response = AsyncMock()
        batch_response.status_code = 200
        batch_response.json.return_value = [
            {"id": f"issue-{i}", "title": f"Issue {i}"} for i in range(50)
        ]
        mock_sentry_api.post.return_value = batch_response
        
        # Time batch operation
        start_time = asyncio.get_event_loop().time()
        
        issue_ids = [f"issue-{i}" for i in range(50)]
        results = await service.batch_get_issues(issue_ids)
        
        end_time = asyncio.get_event_loop().time()
        duration = end_time - start_time
        
        assert len(results) == 50
        assert duration < 1.0  # Should complete within 1 second
        
        # Verify it used batch endpoint (one call instead of 50)
        assert mock_sentry_api.post.call_count == 1
    
    @pytest.mark.asyncio
    async def test_rate_limit_handling(self, setup_test_data):
        """Test rate limit handling and backoff"""
        with patch('httpx.AsyncClient') as mock:
            client = AsyncMock()
            mock.return_value.__aenter__.return_value = client
            
            # Simulate rate limit
            rate_limit_response = AsyncMock()
            rate_limit_response.status_code = 429
            rate_limit_response.headers = {"Retry-After": "2"}
            rate_limit_response.json.return_value = {"detail": "Rate limit exceeded"}
            
            success_response = AsyncMock()
            success_response.status_code = 200
            success_response.json.return_value = {"id": "event-1"}
            
            client.get.side_effect = [rate_limit_response, success_response]
            
            service = SentryService(
                base_url="https://sentry.io/api/0",
                auth_token="test-token",
                organization="test-org",
                project="test-project"
            )
            
            # Should retry after rate limit
            result = await service.get_event("event-1", retry=True)
            assert result["id"] == "event-1"
            assert client.get.call_count == 2
    
    @pytest.mark.asyncio
    async def test_error_recovery(self, setup_test_data):
        """Test error recovery and partial success handling"""
        with patch('httpx.AsyncClient') as mock:
            client = AsyncMock()
            mock.return_value.__aenter__.return_value = client
            
            # Simulate mixed success/failure responses
            responses = []
            for i in range(5):
                response = AsyncMock()
                if i % 2 == 0:
                    response.status_code = 200
                    response.json.return_value = {"id": f"issue-{i}", "title": f"Issue {i}"}
                else:
                    response.status_code = 500
                    response.json.return_value = {"detail": "Server error"}
                responses.append(response)
            
            client.get.side_effect = responses
            
            service = SentryService(
                base_url="https://sentry.io/api/0",
                auth_token="test-token",
                organization="test-org",
                project="test-project"
            )
            
            # Batch operation with partial failures
            issue_ids = [f"issue-{i}" for i in range(5)]
            results = await service.batch_get_issues(issue_ids)
            
            # Should handle partial failures gracefully
            assert len(results) == 5
            successful = [r for r in results if "error" not in r]
            failed = [r for r in results if "error" in r]
            
            assert len(successful) == 3
            assert len(failed) == 2
    
    @pytest.mark.asyncio
    async def test_pagination_handling(self, setup_test_data):
        """Test pagination handling for large result sets"""
        with patch('httpx.AsyncClient') as mock:
            client = AsyncMock()
            mock.return_value.__aenter__.return_value = client
            
            # Simulate paginated responses
            page1_response = AsyncMock()
            page1_response.status_code = 200
            page1_response.json.return_value = [
                {"id": f"event-{i}", "message": f"Error {i}"} for i in range(10)
            ]
            page1_response.headers = {
                "Link": '<https://sentry.io/api/0/events?cursor=page2>; rel="next"'
            }
            
            page2_response = AsyncMock()
            page2_response.status_code = 200
            page2_response.json.return_value = [
                {"id": f"event-{i}", "message": f"Error {i}"} for i in range(10, 20)
            ]
            page2_response.headers = {}
            
            client.get.side_effect = [page1_response, page2_response]
            
            service = SentryService(
                base_url="https://sentry.io/api/0",
                auth_token="test-token",
                organization="test-org",
                project="test-project"
            )
            
            # Get all pages
            all_events = []
            cursor = None
            
            while True:
                result = await service.list_events(cursor=cursor, paginate=True)
                all_events.extend(result["results"])
                
                if not result.get("next"):
                    break
                    
                cursor = result["next"]
            
            assert len(all_events) == 20
            assert client.get.call_count == 2

class TestPerformanceBenchmarks:
    @pytest.mark.asyncio
    async def test_api_response_times(self, setup_test_data, mock_sentry_api):
        """Benchmark API response times"""
        service = SentryService(
            base_url="https://sentry.io/api/0",
            auth_token="test-token",
            organization="test-org",
            project="test-project"
        )
        
        # Measure single request time
        start = asyncio.get_event_loop().time()
        await service.get_event("event-1")
        single_duration = asyncio.get_event_loop().time() - start
        
        # Measure cached request time
        start = asyncio.get_event_loop().time()
        await service.get_event("event-1")  # Should hit cache
        cached_duration = asyncio.get_event_loop().time() - start
        
        # Cached should be significantly faster
        assert cached_duration < single_duration * 0.5
        
        # Measure batch request time
        start = asyncio.get_event_loop().time()
        await service.batch_get_issues([f"issue-{i}" for i in range(10)])
        batch_duration = asyncio.get_event_loop().time() - start
        
        # Batch should be faster than 10 individual requests
        assert batch_duration < single_duration * 5
    
    @pytest.mark.asyncio
    async def test_memory_usage(self, setup_test_data, mock_sentry_api):
        """Test memory usage with large datasets"""
        import tracemalloc
        tracemalloc.start()
        
        service = SentryService(
            base_url="https://sentry.io/api/0",
            auth_token="test-token",
            organization="test-org",
            project="test-project"
        )
        
        # Get baseline memory
        baseline = tracemalloc.get_traced_memory()[0]
        
        # Process large dataset
        large_response = AsyncMock()
        large_response.status_code = 200
        large_response.json.return_value = [
            {"id": f"event-{i}", "data": "x" * 1000} for i in range(1000)
        ]
        mock_sentry_api.get.return_value = large_response
        
        events = await service.list_events(limit=1000)
        
        # Check memory usage
        current = tracemalloc.get_traced_memory()[0]
        memory_increase = current - baseline
        
        # Should not use excessive memory (less than 10MB for 1000 events)
        assert memory_increase < 10 * 1024 * 1024
        
        tracemalloc.stop()
