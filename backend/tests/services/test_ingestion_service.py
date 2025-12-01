"""
Unit tests for Ingestion Service.

Tests the event processing pipeline.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.ingestion_service import (
    EventPayload,
    IngestionService,
    ProcessedEvent,
)


class TestEventPayload:
    """Tests for EventPayload model."""

    def test_minimal_payload(self):
        """Test minimal valid payload."""
        payload = EventPayload()
        assert payload.action == "created"
        assert payload.data == {}

    def test_full_payload(self):
        """Test payload with all fields."""
        payload = EventPayload(
            action="resolved",
            data={"issue": {"id": "123"}},
        )
        assert payload.action == "resolved"
        assert payload.data["issue"]["id"] == "123"


class TestIngestionService:
    """Tests for IngestionService class."""

    @pytest.fixture
    def service(self):
        """Create service instance with mocked dependencies."""
        service = IngestionService()
        return service

    def test_extract_error_data_from_event(self, service):
        """Test error extraction from event structure."""
        data = {
            "event": {
                "exception": {
                    "values": [
                        {
                            "type": "ValueError",
                            "value": "test error",
                        }
                    ]
                },
                "platform": "python",
                "event_id": "abc123",
            }
        }
        result = service._extract_error_data(data)

        assert result["type"] == "ValueError"
        assert result["value"] == "test error"
        assert result["platform"] == "python"

    def test_extract_error_data_from_issue(self, service):
        """Test error extraction from issue structure."""
        data = {
            "issue": {
                "type": "TypeError",
                "culprit": "app.main.process",
                "platform": "python",
            }
        }
        result = service._extract_error_data(data)

        assert result["type"] == "TypeError"
        assert result["platform"] == "python"

    def test_extract_error_data_direct(self, service):
        """Test error extraction from direct error data."""
        data = {
            "type": "Error",
            "value": "Something went wrong",
        }
        result = service._extract_error_data(data)

        assert result["type"] == "Error"
        assert result["value"] == "Something went wrong"

    def test_extract_error_data_empty(self, service):
        """Test error extraction from empty data."""
        result = service._extract_error_data({})
        assert result is None

    def test_extract_issue_id_from_issue(self, service):
        """Test issue ID extraction from issue structure."""
        data = {"issue": {"id": "12345"}}
        result = service._extract_issue_id(data)
        assert result == "12345"

    def test_extract_issue_id_from_event(self, service):
        """Test issue ID extraction from event structure."""
        data = {"event": {"groupID": "67890"}}
        result = service._extract_issue_id(data)
        assert result == "67890"

    def test_extract_issue_id_missing(self, service):
        """Test issue ID extraction when missing."""
        data = {"event": {"message": "test"}}
        result = service._extract_issue_id(data)
        assert result is None

    def test_extract_tags_from_event(self, service):
        """Test tag extraction from event."""
        data = {
            "event": {
                "tags": {
                    "level": "error",
                    "browser": "Chrome",
                    "email": "test@example.com",  # Should be filtered
                }
            }
        }
        result = service._extract_tags(data)

        assert "level" in result
        assert "browser" in result
        assert "email" not in result  # Filtered out

    def test_extract_tags_list_format(self, service):
        """Test tag extraction from list format."""
        data = {
            "event": {
                "tags": [
                    ["level", "error"],
                    ["platform", "python"],
                ]
            }
        }
        result = service._extract_tags(data)

        assert result["level"] == "error"
        assert result["platform"] == "python"

    def test_parse_timestamp_datetime(self, service):
        """Test timestamp parsing from datetime."""
        dt = datetime(2025, 1, 15, 12, 0, 0)
        result = service._parse_timestamp(dt)
        assert result == dt

    def test_parse_timestamp_unix(self, service):
        """Test timestamp parsing from Unix timestamp."""
        timestamp = 1736942400  # 2025-01-15 12:00:00 UTC
        result = service._parse_timestamp(timestamp)
        assert isinstance(result, datetime)

    def test_parse_timestamp_iso(self, service):
        """Test timestamp parsing from ISO string."""
        iso = "2025-01-15T12:00:00Z"
        result = service._parse_timestamp(iso)
        assert isinstance(result, datetime)

    def test_parse_timestamp_none(self, service):
        """Test timestamp parsing with None."""
        result = service._parse_timestamp(None)
        assert result is None


class TestProcessedEvent:
    """Tests for ProcessedEvent model."""

    def test_success_result(self):
        """Test successful processing result."""
        result = ProcessedEvent(
            success=True,
            issue_id=123,
            sentry_issue_id="ISSUE-456",
        )
        assert result.success
        assert result.issue_id == 123
        assert not result.is_duplicate

    def test_failure_result(self):
        """Test failed processing result."""
        result = ProcessedEvent(
            success=False,
            error="Embedding generation failed",
        )
        assert not result.success
        assert result.error == "Embedding generation failed"

    def test_duplicate_result(self):
        """Test duplicate event result."""
        result = ProcessedEvent(
            success=True,
            is_duplicate=True,
            sentry_issue_id="ISSUE-123",
        )
        assert result.success
        assert result.is_duplicate
