"""
Test the bulk operations functionality
"""
import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from app.main import app
from app.services.sentry_client import SentryApiClient

client = TestClient(app)

class TestBulkOperations:
    
    @pytest.fixture
    def mock_sentry_client(self):
        """Mock the Sentry API client"""
        mock_client = Mock(spec=SentryApiClient)
        # Make the methods async
        mock_client.update_issue_status = AsyncMock()
        mock_client.assign_issue = AsyncMock()
        mock_client.add_issue_tags = AsyncMock()
        return mock_client
    
    def test_bulk_status_update_success(self, mock_sentry_client):
        """Test successful bulk status update"""
        # Mock responses
        mock_sentry_client.update_issue_status.side_effect = [
            {"id": "issue1", "status": "resolved"},
            {"id": "issue2", "status": "resolved"},
            {"id": "issue3", "status": "resolved"}
        ]
        
        # Create bulk operation request
        operations = [
            {
                "issue_id": "issue1",
                "operation_type": "status",
                "data": {"status": "resolved"}
            },
            {
                "issue_id": "issue2",
                "operation_type": "status",
                "data": {"status": "resolved"}
            },
            {
                "issue_id": "issue3",
                "operation_type": "status",
                "data": {"status": "resolved"}
            }
        ]
        
        # Patch the dependency
        with patch('app.routers.issues.get_sentry_client', return_value=mock_sentry_client):
            response = client.post("/api/v1/issues/bulk", json=operations)
        
        # Check response
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 3
        assert result["succeeded"] == 3
        assert result["failed"] == 0
        assert len(result["results"]) == 3
        assert len(result["errors"]) == 0
        
        # Verify the mock was called correctly
        assert mock_sentry_client.update_issue_status.call_count == 3
    
    def test_bulk_mixed_operations_success(self, mock_sentry_client):
        """Test mixed bulk operations (status, assign, tag)"""
        # Mock responses
        mock_sentry_client.update_issue_status.return_value = {"id": "issue1", "status": "resolved"}
        mock_sentry_client.assign_issue.return_value = {"id": "issue2", "assignee": {"email": "user@example.com"}}
        mock_sentry_client.add_issue_tags.return_value = {"id": "issue3", "tags": ["bug", "critical"]}
        
        # Create mixed bulk operation request
        operations = [
            {
                "issue_id": "issue1",
                "operation_type": "status",
                "data": {"status": "resolved"}
            },
            {
                "issue_id": "issue2",
                "operation_type": "assign",
                "data": {"assignee": "user@example.com"}
            },
            {
                "issue_id": "issue3",
                "operation_type": "tag",
                "data": {"tags": ["bug", "critical"]}
            }
        ]
        
        # Patch the dependency
        with patch('app.routers.issues.get_sentry_client', return_value=mock_sentry_client):
            response = client.post("/api/v1/issues/bulk", json=operations)
        
        # Check response
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 3
        assert result["succeeded"] == 3
        assert result["failed"] == 0
        
        # Verify each operation was called once
        mock_sentry_client.update_issue_status.assert_called_once()
        mock_sentry_client.assign_issue.assert_called_once()
        mock_sentry_client.add_issue_tags.assert_called_once()
    
    def test_bulk_operations_partial_failure(self, mock_sentry_client):
        """Test bulk operations with some failures"""
        # Mock responses with one failure
        mock_sentry_client.update_issue_status.side_effect = [
            {"id": "issue1", "status": "resolved"},
            Exception("API Error"),
            {"id": "issue3", "status": "resolved"}
        ]
        
        # Create bulk operation request
        operations = [
            {
                "issue_id": "issue1",
                "operation_type": "status",
                "data": {"status": "resolved"}
            },
            {
                "issue_id": "issue2",
                "operation_type": "status",
                "data": {"status": "resolved"}
            },
            {
                "issue_id": "issue3",
                "operation_type": "status",
                "data": {"status": "resolved"}
            }
        ]
        
        # Patch the dependency
        with patch('app.routers.issues.get_sentry_client', return_value=mock_sentry_client):
            response = client.post("/api/v1/issues/bulk", json=operations)
        
        # Check response
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 3
        assert result["succeeded"] == 2
        assert result["failed"] == 1
        assert len(result["results"]) == 2
        assert len(result["errors"]) == 1
        assert result["errors"][0]["issue_id"] == "issue2"
        assert "API Error" in result["errors"][0]["error"]
    
    def test_bulk_operations_invalid_type(self, mock_sentry_client):
        """Test bulk operations with invalid operation type"""
        # Create bulk operation request with invalid type
        operations = [
            {
                "issue_id": "issue1",
                "operation_type": "invalid_type",
                "data": {"something": "value"}
            }
        ]
        
        # Patch the dependency
        with patch('app.routers.issues.get_sentry_client', return_value=mock_sentry_client):
            response = client.post("/api/v1/issues/bulk", json=operations)
        
        # Check response
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 1
        assert result["succeeded"] == 0
        assert result["failed"] == 1
        assert len(result["errors"]) == 1
        assert "Unknown operation type" in result["errors"][0]["error"]
    
    def test_bulk_operations_missing_fields(self, mock_sentry_client):
        """Test bulk operations with missing required fields"""
        # Create bulk operation request with missing fields
        operations = [
            {
                "operation_type": "status",
                "data": {"status": "resolved"}
                # Missing issue_id
            },
            {
                "issue_id": "issue2",
                "data": {"status": "resolved"}
                # Missing operation_type
            }
        ]
        
        # Patch the dependency
        with patch('app.routers.issues.get_sentry_client', return_value=mock_sentry_client):
            response = client.post("/api/v1/issues/bulk", json=operations)
        
        # Check response
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 2
        assert result["succeeded"] == 0
        assert result["failed"] == 2
        assert len(result["errors"]) == 2
        assert all("Missing issue_id or operation_type" in error["error"] for error in result["errors"])
    
    def test_bulk_operations_empty_list(self, mock_sentry_client):
        """Test bulk operations with empty operations list"""
        # Create empty bulk operation request
        operations = []
        
        # Patch the dependency
        with patch('app.routers.issues.get_sentry_client', return_value=mock_sentry_client):
            response = client.post("/api/v1/issues/bulk", json=operations)
        
        # Check response
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 0
        assert result["succeeded"] == 0
        assert result["failed"] == 0
        assert len(result["results"]) == 0
        assert len(result["errors"]) == 0
