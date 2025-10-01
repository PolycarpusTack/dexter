"""Integration tests for Alert Health Monitor system."""

import pytest
import httpx
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, Mock

from app.main import app
from app.dependencies import get_sentry_client, get_cache_service


# Test fixtures
@pytest.fixture
def mock_sentry_client():
    """Mock Sentry client for integration tests."""
    client = Mock()
    client.request = AsyncMock()
    return client


@pytest.fixture
def mock_cache_service():
    """Mock cache service for integration tests."""
    cache = Mock()
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock()
    return cache


@pytest.fixture
def test_client(mock_sentry_client, mock_cache_service):
    """Create test client with mocked dependencies."""
    app.dependency_overrides[get_sentry_client] = lambda: mock_sentry_client
    app.dependency_overrides[get_cache_service] = lambda: mock_cache_service
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()


class TestAlertHealthIntegration:
    """Integration tests for Alert Health endpoints."""
    
    def test_health_metrics_endpoint(self, test_client, mock_sentry_client):
        """Test the health metrics endpoint."""
        # Mock Sentry response
        mock_sentry_client.request.side_effect = [
            # Alert rules
            [
                {"id": "rule_1", "name": "Test Rule", "status": "active", "conditions": [{"threshold": 10}]}
            ],
            # Alert history
            [
                {"rule": "rule_1", "createdAt": "2024-01-15T12:00:00Z"}
            ]
        ]
        
        # Make request
        response = test_client.post(
            "/api/v1/alert-health/metrics",
            json={
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-01-31T23:59:59Z",
                "rule_ids": ["rule_1"],
                "include_patterns": True
            },
            headers={"X-Sentry-Auth": "test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["metrics"]) == 1
        assert data["metrics"][0]["rule_id"] == "rule_1"
    
    def test_storm_detection_endpoint(self, test_client, mock_sentry_client):
        """Test the storm detection endpoint."""
        # Create storm pattern
        base_time = datetime(2024, 1, 15, 12, 0, 0)
        alerts = []
        for i in range(100):
            alerts.append({
                "rule": "rule_1",
                "createdAt": (base_time + timedelta(minutes=i/10)).isoformat() + "Z"
            })
        
        mock_sentry_client.request.return_value = alerts
        
        # Make request
        response = test_client.post(
            "/api/v1/alert-health/storms",
            json={
                "start_date": "2024-01-15T00:00:00Z",
                "end_date": "2024-01-15T23:59:59Z",
                "min_alerts_threshold": 50
            },
            headers={"X-Sentry-Auth": "test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["storms"]) >= 1
    
    def test_recommendations_endpoint(self, test_client, mock_sentry_client):
        """Test the recommendations endpoint."""
        # Mock responses for noisy rule
        mock_sentry_client.request.side_effect = [
            # Alert rules
            [
                {"id": "rule_1", "name": "Noisy Rule", "status": "active", "conditions": [{"threshold": 10}]}
            ],
            # Alert history with high frequency
            [{"rule": "rule_1", "createdAt": f"2024-01-15T{i:02d}:00:00Z"} for i in range(24)]
        ]
        
        # Make request
        response = test_client.post(
            "/api/v1/alert-health/recommendations",
            json={
                "rule_ids": ["rule_1"],
                "optimization_goal": "noise_reduction",
                "min_confidence": 0.5
            },
            headers={"X-Sentry-Auth": "test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["recommendations"]) >= 0
    
    def test_dashboard_endpoint(self, test_client, mock_sentry_client):
        """Test the dashboard endpoint."""
        # Mock comprehensive data
        mock_sentry_client.request.side_effect = [
            # Alert rules
            [
                {"id": "rule_1", "name": "Rule 1", "status": "active"},
                {"id": "rule_2", "name": "Rule 2", "status": "active"}
            ],
            # Alert history
            [
                {"rule": "rule_1", "createdAt": "2024-01-15T12:00:00Z"},
                {"rule": "rule_2", "createdAt": "2024-01-15T13:00:00Z"}
            ]
        ]
        
        # Make request
        response = test_client.get(
            "/api/v1/alert-health/dashboard",
            params={
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-01-31T23:59:59Z"
            },
            headers={"X-Sentry-Auth": "test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "overall_health_score" in data
        assert "total_rules" in data
        assert "noisy_rules" in data
        assert "recent_storms" in data
    
    def test_scheduled_tasks_endpoints(self, test_client):
        """Test scheduled task management endpoints."""
        # List tasks
        response = test_client.get(
            "/api/v1/alert-health/scheduled-tasks",
            headers={"X-Sentry-Auth": "test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["tasks"]) > 0
        
        # Enable a task
        task_id = data["tasks"][0]["task_id"]
        response = test_client.put(
            f"/api/v1/alert-health/scheduled-tasks/{task_id}",
            headers={"X-Sentry-Auth": "test-token"}
        )
        
        assert response.status_code == 200
        
        # Execute a task
        response = test_client.post(
            f"/api/v1/alert-health/scheduled-tasks/{task_id}/execute",
            headers={"X-Sentry-Auth": "test-token"}
        )
        
        assert response.status_code == 200
    
    def test_error_handling(self, test_client, mock_sentry_client):
        """Test error handling in endpoints."""
        # Mock API error
        mock_sentry_client.request.side_effect = Exception("API Error")
        
        # Test metrics endpoint
        response = test_client.post(
            "/api/v1/alert-health/metrics",
            json={
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-01-31T23:59:59Z"
            },
            headers={"X-Sentry-Auth": "test-token"}
        )
        
        assert response.status_code == 500
        assert "error" in response.json()
    
    def test_authentication_required(self, test_client):
        """Test that endpoints require authentication."""
        # Test without auth header
        response = test_client.post(
            "/api/v1/alert-health/metrics",
            json={
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-01-31T23:59:59Z"
            }
        )
        
        assert response.status_code == 401
    
    def test_validation_errors(self, test_client):
        """Test validation errors for invalid requests."""
        # Invalid date format
        response = test_client.post(
            "/api/v1/alert-health/metrics",
            json={
                "start_date": "invalid-date",
                "end_date": "2024-01-31T23:59:59Z"
            },
            headers={"X-Sentry-Auth": "test-token"}
        )
        
        assert response.status_code == 422
        
        # Missing required fields
        response = test_client.post(
            "/api/v1/alert-health/storms",
            json={},
            headers={"X-Sentry-Auth": "test-token"}
        )
        
        assert response.status_code == 422


@pytest.mark.asyncio
class TestAlertHealthWebSocket:
    """Test WebSocket functionality for real-time updates."""
    
    async def test_websocket_connection(self, test_client):
        """Test WebSocket connection for alert health updates."""
        with test_client.websocket_connect("/ws/alert-health") as websocket:
            # Send authentication
            websocket.send_json({"type": "auth", "token": "test-token"})
            
            # Subscribe to updates
            websocket.send_json({"type": "subscribe", "channel": "alert_health"})
            
            # Should receive confirmation
            data = websocket.receive_json()
            assert data["type"] == "subscribed"
            assert data["channel"] == "alert_health"