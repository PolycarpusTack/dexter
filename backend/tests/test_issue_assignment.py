"""
Test the issue assignment functionality
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from app.main import app
from app.services.sentry_client import SentryApiClient
from app.models.issues import IssueAssignment

client = TestClient(app)

class TestIssueAssignment:
    
    @pytest.fixture
    def mock_sentry_client(self):
        """Mock the Sentry API client"""
        mock_client = Mock(spec=SentryApiClient)
        return mock_client
    
    def test_assign_issue_success(self, mock_sentry_client):
        """Test successful issue assignment"""
        # Mock the response from Sentry API
        mock_response = {
            "id": "1234567",
            "assignee": {
                "id": "user123",
                "email": "user@example.com",
                "name": "John Doe"
            },
            "assignedBy": "current_user",
            "dateAssigned": "2023-07-05T14:32:00Z"
        }
        mock_sentry_client.assign_issue.return_value = mock_response
        
        # Create assignment request
        assignment = {
            "assignee": "user@example.com"
        }
        
        # Patch the dependency
        with patch('app.routers.issues.get_sentry_client', return_value=mock_sentry_client):
            response = client.put("/api/v1/issues/1234567/assign", json=assignment)
        
        # Check response
        assert response.status_code == 200
        result = response.json()
        assert result["id"] == "1234567"
        assert result["assignee"]["email"] == "user@example.com"
        
        # Verify the mock was called correctly
        mock_sentry_client.assign_issue.assert_called_once_with(
            issue_id="1234567",
            assignee="user@example.com"
        )
    
    def test_assign_issue_not_found(self, mock_sentry_client):
        """Test issue assignment with non-existent issue"""
        # Mock the Sentry API to raise a 404 error
        from httpx import HTTPStatusError, Response
        mock_response = Response(404, json={"detail": "Issue not found"})
        mock_sentry_client.assign_issue.side_effect = HTTPStatusError(
            "Not Found", 
            request=Mock(), 
            response=mock_response
        )
        
        # Create assignment request
        assignment = {
            "assignee": "user@example.com"
        }
        
        # Patch the dependency
        with patch('app.routers.issues.get_sentry_client', return_value=mock_sentry_client):
            response = client.put("/api/v1/issues/nonexistent/assign", json=assignment)
        
        # Check response
        assert response.status_code == 404
    
    def test_assign_issue_invalid_assignee(self, mock_sentry_client):
        """Test issue assignment with invalid assignee"""
        # Mock the Sentry API to raise a 400 error
        from httpx import HTTPStatusError, Response
        mock_response = Response(400, json={"detail": "Invalid assignee"})
        mock_sentry_client.assign_issue.side_effect = HTTPStatusError(
            "Bad Request", 
            request=Mock(), 
            response=mock_response
        )
        
        # Create assignment request with invalid assignee
        assignment = {
            "assignee": "invalid_user"
        }
        
        # Patch the dependency
        with patch('app.routers.issues.get_sentry_client', return_value=mock_sentry_client):
            response = client.put("/api/v1/issues/1234567/assign", json=assignment)
        
        # Check response
        assert response.status_code == 400
    
    def test_assign_issue_validation_error(self):
        """Test issue assignment with missing assignee field"""
        # Send request without assignee field
        response = client.put("/api/v1/issues/1234567/assign", json={})
        
        # Check response
        assert response.status_code == 422  # Validation error
    
    def test_assign_issue_empty_assignee(self, mock_sentry_client):
        """Test issue assignment with empty assignee (unassign)"""
        # Mock the response from Sentry API for unassignment
        mock_response = {
            "id": "1234567",
            "assignee": None,
            "assignedBy": "current_user",
            "dateAssigned": "2023-07-05T14:32:00Z"
        }
        mock_sentry_client.assign_issue.return_value = mock_response
        
        # Create assignment request with empty assignee
        assignment = {
            "assignee": ""
        }
        
        # Patch the dependency
        with patch('app.routers.issues.get_sentry_client', return_value=mock_sentry_client):
            response = client.put("/api/v1/issues/1234567/assign", json=assignment)
        
        # Check response
        assert response.status_code == 200
        result = response.json()
        assert result["id"] == "1234567"
        assert result["assignee"] is None
        
        # Verify the mock was called correctly
        mock_sentry_client.assign_issue.assert_called_once_with(
            issue_id="1234567",
            assignee=""
        )
