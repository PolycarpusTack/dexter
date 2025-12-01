"""
Unit tests for PII Scrubber tracking functionality.

Tests the new scrub_with_tracking method that provides detailed information
about what PII was removed.

EPIC Q: AI Transparency & UX Polish
"""

import pytest

from app.services.pii_scrubber import PIIScrubber, get_pii_scrubber


@pytest.fixture
def scrubber():
    """Fixture providing a PIIScrubber instance."""
    return PIIScrubber(salt="test-salt")


class TestPIITracking:
    """Test PII scrubbing with tracking."""

    def test_tracks_scrubbed_fields(self, scrubber):
        """Test scrubber tracks which fields were modified."""
        data = {
            "user_id": "user123",
            "email": "test@example.com",
            "message": "Error occurred",
            "ip_address": "192.168.1.1",
        }

        result = scrubber.scrub_with_tracking(data)

        assert result.pii_detected is True
        assert result.scrub_count > 0
        assert len(result.fields_scrubbed) >= 3

        # Check specific fields were identified
        assert "user_id" in result.fields_scrubbed
        assert "email" in result.fields_scrubbed
        assert "ip_address" in result.fields_scrubbed

        # Message should not be in scrubbed fields
        assert "message" not in result.fields_scrubbed

        # Check data was actually scrubbed
        assert result.scrubbed_data["email"] != "test@example.com"
        assert result.scrubbed_data["ip_address"] != "192.168.1.1"

    def test_no_pii_detected(self, scrubber):
        """Test clean data returns pii_detected=False."""
        data = {
            "error_type": "ValueError",
            "message": "Invalid input",
            "count": 42,
        }

        result = scrubber.scrub_with_tracking(data)

        assert result.pii_detected is False
        assert result.scrub_count == 0
        assert len(result.fields_scrubbed) == 0

        # Data should be unchanged
        assert result.scrubbed_data == data

    def test_nested_pii_tracking(self, scrubber):
        """Test tracking works for nested dictionaries."""
        data = {
            "request": {
                "headers": {"authorization": "Bearer token123", "user-agent": "Mozilla"},
                "body": {"username": "john_doe"},
            },
            "response": {"status": 200},
        }

        result = scrubber.scrub_with_tracking(data)

        assert result.pii_detected is True
        assert "request.headers.authorization" in result.fields_scrubbed
        assert "request.body.username" in result.fields_scrubbed

        # Response should not be touched
        assert "response" not in result.fields_scrubbed

    def test_list_pii_tracking(self, scrubber):
        """Test tracking works for lists."""
        data = {
            "users": [
                {"id": 1, "email": "user1@example.com"},
                {"id": 2, "email": "user2@example.com"},
            ]
        }

        result = scrubber.scrub_with_tracking(data)

        assert result.pii_detected is True

        # Should track both emails in the list
        assert "users[0].email" in result.fields_scrubbed
        assert "users[1].email" in result.fields_scrubbed

    def test_string_pattern_tracking(self, scrubber):
        """Test tracking when PII is found in string patterns."""
        data = {
            "error_message": "User test@example.com encountered error at IP 192.168.1.1",
            "description": "Contact support@example.com for help",
        }

        result = scrubber.scrub_with_tracking(data)

        assert result.pii_detected is True

        # Both fields should be tracked as modified
        assert "error_message" in result.fields_scrubbed
        assert "description" in result.fields_scrubbed

        # Verify actual scrubbing occurred
        assert "test@example.com" not in result.scrubbed_data["error_message"]
        assert "192.168.1.1" not in result.scrubbed_data["error_message"]
        assert "support@example.com" not in result.scrubbed_data["description"]

    def test_field_scrubbing_by_name(self, scrubber):
        """Test fields are scrubbed by name even with clean values."""
        data = {"password": "clean_value", "api_key": "another_value", "normal_field": "value"}

        result = scrubber.scrub_with_tracking(data)

        assert result.pii_detected is True

        # Password and api_key should be scrubbed by field name
        assert "password" in result.fields_scrubbed
        assert "api_key" in result.fields_scrubbed
        assert "normal_field" not in result.fields_scrubbed

    def test_complex_nested_structure(self, scrubber):
        """Test tracking with complex nested structures."""
        data = {
            "event": {
                "user": {"user_id": "user123", "name": "John Doe"},
                "request": {
                    "url": "https://example.com/api",
                    "headers": {"cookie": "session=abc123"},
                },
                "contexts": {
                    "browser": {"name": "Chrome"},
                    "device": {"ip_address": "10.0.0.1"},
                },
            },
            "metadata": {"timestamp": "2025-11-30T12:00:00Z"},
        }

        result = scrubber.scrub_with_tracking(data)

        assert result.pii_detected is True

        # Check specific paths were tracked
        assert "event.user.user_id" in result.fields_scrubbed
        assert "event.request.headers.cookie" in result.fields_scrubbed
        assert "event.contexts.device.ip_address" in result.fields_scrubbed

        # Clean fields should not be tracked
        # name is not in SCRUB_FIELDS (only username is)
        assert "metadata.timestamp" not in result.fields_scrubbed

    def test_scrub_count_accuracy(self, scrubber):
        """Test scrub count reflects actual operations."""
        data = {
            "email": "user@example.com",
            "text": "Contact admin@example.com or support@example.com",
            "ip": "192.168.1.1",
        }

        result = scrubber.scrub_with_tracking(data)

        # Should have multiple scrub operations
        # - email field (1)
        # - 2 emails in text (1 operation for the field)
        # - ip field (1)
        assert result.scrub_count >= 3

    def test_null_and_none_values(self, scrubber):
        """Test handling of null and None values."""
        data = {
            "email": None,
            "user_id": None,
            "valid_field": "value",
        }

        result = scrubber.scrub_with_tracking(data)

        # None values in PII fields should not cause errors
        assert result.scrubbed_data["email"] is None
        assert result.scrubbed_data["user_id"] is None

        # Should still be considered "scrubbed" (hashed to None)
        # but not counted in scrub_count since no actual scrubbing occurred
        assert result.pii_detected is False or result.scrub_count == 0


class TestTrackingReset:
    """Test tracking state is reset between calls."""

    def test_tracking_resets_between_calls(self, scrubber):
        """Test tracking state resets between scrub_with_tracking calls."""
        data1 = {"email": "test1@example.com"}
        data2 = {"user_id": "user123"}

        result1 = scrubber.scrub_with_tracking(data1)
        result2 = scrubber.scrub_with_tracking(data2)

        # Each result should only contain its own scrubbed fields
        assert "email" in result1.fields_scrubbed
        assert "user_id" not in result1.fields_scrubbed

        assert "user_id" in result2.fields_scrubbed
        assert "email" not in result2.fields_scrubbed


class TestSingletonBehavior:
    """Test singleton scrubber behavior."""

    def test_singleton_returns_same_instance(self):
        """Test get_pii_scrubber returns same instance."""
        scrubber1 = get_pii_scrubber()
        scrubber2 = get_pii_scrubber()

        assert scrubber1 is scrubber2

    def test_singleton_preserves_salt(self):
        """Test singleton preserves salt configuration."""
        # Note: In production, salt is set once on first call
        scrubber = get_pii_scrubber()
        assert scrubber.salt is not None


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_dict(self, scrubber):
        """Test empty dictionary."""
        result = scrubber.scrub_with_tracking({})

        assert result.pii_detected is False
        assert result.scrub_count == 0
        assert len(result.fields_scrubbed) == 0
        assert result.scrubbed_data == {}

    def test_deeply_nested_structure(self, scrubber):
        """Test very deep nesting doesn't cause issues."""
        data = {"level1": {"level2": {"level3": {"level4": {"email": "test@example.com"}}}}}

        result = scrubber.scrub_with_tracking(data)

        assert result.pii_detected is True
        assert "level1.level2.level3.level4.email" in result.fields_scrubbed

    def test_mixed_types_in_list(self, scrubber):
        """Test list with mixed types."""
        data = {
            "mixed": [
                "plain string",
                {"email": "test@example.com"},
                42,
                None,
                ["nested", "list"],
            ]
        }

        result = scrubber.scrub_with_tracking(data)

        assert result.pii_detected is True
        assert "mixed[1].email" in result.fields_scrubbed
