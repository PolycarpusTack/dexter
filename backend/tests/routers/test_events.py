# File: backend/tests/routers/test_events.py

import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone

from app.main import app
from app.models.sentry_models import SentryEvent, SentryIssue
from app.services.sentry_service import SentryService
from app.core.errors import SentryAPIError, ExternalAPIError

client = TestClient(app)

# Mock data
MOCK_EVENT = {
    "id": "test-event-123",
    "eventID": "test-event-123",
    "groupID": "group-123",
    "message": "Test error message",
    "title": "Test Error",
    "type": "error",
    "datetime": "2024-01-01T00:00:00Z",
    "platform": "python",
    "tags": {"environment": "production"}
}

MOCK_ISSUE = {
    "id": "issue-123",
    "shortId": "PROJ-123",
    "title": "Test Issue",
    "status": "unresolved",
    "metadata": {"type": "error", "value": "Test error"},
    "count": "10",
    "userCount": 5,
    "firstSeen": "2024-01-01T00:00:00Z",
    "lastSeen": "2024-01-02T00:00:00Z"
}

@pytest.fixture
def mock_sentry_service():
    with patch('app.routers.events.get_sentry_service') as mock:
        service = Mock(spec=SentryService)
        mock.return_value = service
        yield service

class TestEventRoutes:
    def test_list_events_success(self, mock_sentry_service):
        """Test successful event listing"""
        mock_sentry_service.list_events.return_value = [MOCK_EVENT]
        
        response = client.get("/events")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "test-event-123"
    
    def test_list_events_with_filters(self, mock_sentry_service):
        """Test event listing with query parameters"""
        mock_sentry_service.list_events.return_value = [MOCK_EVENT]
        
        response = client.get("/events?query=error&limit=10")
        
        assert response.status_code == 200
        mock_sentry_service.list_events.assert_called_once_with(
            organization_slug=None,
            project_slug=None,
            query="error",
            limit=10
        )
    
    def test_list_events_sentry_error(self, mock_sentry_service):
        """Test handling of Sentry API errors"""
        mock_sentry_service.list_events.side_effect = SentryAPIError(
            "Sentry API error",
            status_code=500,
            response_data={"detail": "Server error"}
        )
        
        response = client.get("/events")
        
        assert response.status_code == 502
        assert "Sentry API error" in response.json()["detail"]
    
    def test_get_event_success(self, mock_sentry_service):
        """Test successful event retrieval"""
        mock_sentry_service.get_event.return_value = MOCK_EVENT
        
        response = client.get("/events/test-event-123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test-event-123"
    
    def test_get_event_not_found(self, mock_sentry_service):
        """Test event not found error"""
        mock_sentry_service.get_event.side_effect = SentryAPIError(
            "Event not found",
            status_code=404,
            response_data={"detail": "Not found"}
        )
        
        response = client.get("/events/non-existent")
        
        assert response.status_code == 404
    
    def test_get_event_context_success(self, mock_sentry_service):
        """Test successful event context retrieval"""
        mock_context = {
            "user": {"id": "user-123", "email": "test@example.com"},
            "browser": {"name": "Chrome", "version": "120"},
            "os": {"name": "Windows", "version": "11"}
        }
        mock_sentry_service.get_event_context.return_value = mock_context
        
        response = client.get("/events/test-event-123/context")
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["id"] == "user-123"
    
    def test_batch_get_issues_success(self, mock_sentry_service):
        """Test successful batch issue retrieval"""
        mock_issues = [MOCK_ISSUE, {**MOCK_ISSUE, "id": "issue-456"}]
        mock_sentry_service.batch_get_issues.return_value = mock_issues
        
        response = client.post("/issues/batch", json={"ids": ["issue-123", "issue-456"]})
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "issue-123"
    
    def test_batch_get_issues_partial_failure(self, mock_sentry_service):
        """Test handling of partial failures in batch operations"""
        mock_sentry_service.batch_get_issues.return_value = [
            MOCK_ISSUE,
            {"error": "Not found", "id": "issue-456"}
        ]
        
        response = client.post("/issues/batch", json={"ids": ["issue-123", "issue-456"]})
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "issue-123"
        assert data[1]["error"] == "Not found"
    
    def test_list_issues_paginated(self, mock_sentry_service):
        """Test paginated issue listing"""
        mock_sentry_service.list_issues.return_value = {
            "results": [MOCK_ISSUE],
            "next": "cursor-123",
            "previous": None
        }
        
        response = client.get("/issues?cursor=start&limit=10")
        
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert data["next"] == "cursor-123"
        assert len(data["results"]) == 1

class TestIssueOperations:
    def test_update_issue_status(self, mock_sentry_service):
        """Test updating issue status"""
        mock_sentry_service.update_issue.return_value = {**MOCK_ISSUE, "status": "resolved"}
        
        response = client.put("/issues/issue-123", json={"status": "resolved"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resolved"
    
    def test_update_issue_invalid_status(self, mock_sentry_service):
        """Test invalid status update"""
        response = client.put("/issues/issue-123", json={"status": "invalid-status"})
        
        assert response.status_code == 422
    
    def test_bulk_update_issues(self, mock_sentry_service):
        """Test bulk issue update"""
        mock_sentry_service.bulk_update_issues.return_value = [
            {**MOCK_ISSUE, "status": "resolved"},
            {**MOCK_ISSUE, "id": "issue-456", "status": "resolved"}
        ]
        
        updates = [
            {"id": "issue-123", "status": "resolved"},
            {"id": "issue-456", "status": "resolved"}
        ]
        
        response = client.post("/issues/bulk", json={"updates": updates})
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(issue["status"] == "resolved" for issue in data)
    
    def test_assign_issue(self, mock_sentry_service):
        """Test issue assignment"""
        mock_sentry_service.update_issue.return_value = {
            **MOCK_ISSUE,
            "assignedTo": {"id": "user-123", "email": "assignee@example.com"}
        }
        
        response = client.post("/issues/issue-123/assign", json={"assignee": "assignee@example.com"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["assignedTo"]["email"] == "assignee@example.com"
    
    def test_add_issue_comment(self, mock_sentry_service):
        """Test adding comment to issue"""
        mock_comment = {
            "id": "comment-123",
            "issue": "issue-123",
            "data": {"text": "Test comment"},
            "dateCreated": "2024-01-01T00:00:00Z"
        }
        mock_sentry_service.add_issue_comment.return_value = mock_comment
        
        response = client.post("/issues/issue-123/comments", json={"text": "Test comment"})
        
        assert response.status_code == 201
        data = response.json()
        assert data["data"]["text"] == "Test comment"

class TestEventFiltering:
    def test_search_events_by_text(self, mock_sentry_service):
        """Test searching events by text query"""
        mock_sentry_service.list_events.return_value = [MOCK_EVENT]
        
        response = client.get("/events/search?q=error&type=message")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
    
    def test_filter_events_by_date_range(self, mock_sentry_service):
        """Test filtering events by date range"""
        mock_sentry_service.list_events.return_value = [MOCK_EVENT]
        
        response = client.get("/events?start=2024-01-01&end=2024-01-31")
        
        assert response.status_code == 200
        mock_sentry_service.list_events.assert_called_once()
        call_args = mock_sentry_service.list_events.call_args[1]
        assert "start" in call_args
        assert "end" in call_args
    
    def test_filter_events_by_tags(self, mock_sentry_service):
        """Test filtering events by tags"""
        mock_sentry_service.list_events.return_value = [MOCK_EVENT]
        
        response = client.get("/events?tags=environment:production,level:error")
        
        assert response.status_code == 200
        mock_sentry_service.list_events.assert_called_once()
        call_args = mock_sentry_service.list_events.call_args[1]
        assert "tags" in call_args

class TestPerformanceMetrics:
    def test_event_performance_metrics(self, mock_sentry_service):
        """Test event performance metrics endpoint"""
        mock_metrics = {
            "totalEvents": 1000,
            "avgResponseTime": 250,
            "errorRate": 0.05,
            "throughput": 100
        }
        mock_sentry_service.get_performance_metrics.return_value = mock_metrics
        
        response = client.get("/events/metrics/performance")
        
        assert response.status_code == 200
        data = response.json()
        assert data["totalEvents"] == 1000
        assert data["errorRate"] == 0.05

    def test_issue_impact_metrics(self, mock_sentry_service):
        """Test issue impact metrics"""
        mock_impact = {
            "affectedUsers": 500,
            "errorRate": 0.1,
            "frequency": 50,
            "lastSeen": "2024-01-02T00:00:00Z"
        }
        mock_sentry_service.get_issue_impact.return_value = mock_impact
        
        response = client.get("/issues/issue-123/impact")
        
        assert response.status_code == 200
        data = response.json()
        assert data["affectedUsers"] == 500

class TestErrorHandling:
    def test_network_error_handling(self, mock_sentry_service):
        """Test handling of network errors"""
        mock_sentry_service.list_events.side_effect = ExternalAPIError(
            service_name="Sentry",
            message="Connection timeout",
            original_error=TimeoutError("Request timed out")
        )
        
        response = client.get("/events")
        
        assert response.status_code == 502
        assert "Connection timeout" in response.json()["detail"]
    
    def test_rate_limit_handling(self, mock_sentry_service):
        """Test rate limit error handling"""
        mock_sentry_service.list_events.side_effect = SentryAPIError(
            "Rate limit exceeded",
            status_code=429,
            response_data={"detail": "Too many requests"}
        )
        
        response = client.get("/events")
        
        assert response.status_code == 429
        assert "Rate limit exceeded" in response.json()["detail"]
    
    def test_validation_error_handling(self):
        """Test request validation error handling"""
        response = client.get("/events?limit=invalid")
        
        assert response.status_code == 422
        assert "validation error" in response.json()["detail"].lower()
