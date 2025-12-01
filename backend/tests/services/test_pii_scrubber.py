"""
Unit tests for PII Scrubber service.

Tests all PII detection patterns and scrubbing functionality.
"""

import pytest

from app.services.pii_scrubber import PIIScrubber, get_pii_scrubber, scrub_for_logging


class TestPIIScrubber:
    """Tests for the PIIScrubber class."""

    @pytest.fixture
    def scrubber(self):
        """Create a fresh scrubber instance for each test."""
        return PIIScrubber(salt="test-salt")

    # Email pattern tests
    def test_scrub_email_in_string(self, scrubber):
        """Test email detection and scrubbing in strings."""
        text = "Contact user at john.doe@example.com for details"
        result = scrubber.scrub_string(text)
        assert "[EMAIL_REDACTED]" in result
        assert "john.doe@example.com" not in result

    def test_scrub_multiple_emails(self, scrubber):
        """Test multiple emails in same string."""
        text = "From: alice@test.com To: bob@example.org"
        result = scrubber.scrub_string(text)
        assert result.count("[EMAIL_REDACTED]") == 2

    # IP address tests
    def test_scrub_ipv4_address(self, scrubber):
        """Test IPv4 address detection."""
        text = "Request from 192.168.1.100"
        result = scrubber.scrub_string(text)
        assert "[IP_REDACTED]" in result
        assert "192.168.1.100" not in result

    def test_scrub_multiple_ips(self, scrubber):
        """Test multiple IPs."""
        text = "Forwarded: 10.0.0.1 -> 172.16.0.1"
        result = scrubber.scrub_string(text)
        assert result.count("[IP_REDACTED]") == 2

    # JWT token tests
    def test_scrub_jwt_token(self, scrubber):
        """Test JWT token detection."""
        jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
        text = f"Authorization: Bearer {jwt}"
        result = scrubber.scrub_string(text)
        assert "[TOKEN_REDACTED]" in result
        assert "eyJ" not in result

    # Authorization header tests
    def test_scrub_bearer_auth(self, scrubber):
        """Test Bearer token detection."""
        text = "Bearer abc123def456"
        result = scrubber.scrub_string(text)
        assert "[AUTH_REDACTED]" in result

    def test_scrub_basic_auth(self, scrubber):
        """Test Basic auth detection."""
        text = "Basic dXNlcm5hbWU6cGFzc3dvcmQ="
        result = scrubber.scrub_string(text)
        assert "[AUTH_REDACTED]" in result

    # Credit card tests
    def test_scrub_credit_card_with_dashes(self, scrubber):
        """Test credit card number with dashes."""
        text = "Card: 4111-1111-1111-1111"
        result = scrubber.scrub_string(text)
        assert "[CARD_REDACTED]" in result
        assert "4111" not in result

    def test_scrub_credit_card_with_spaces(self, scrubber):
        """Test credit card number with spaces."""
        text = "Card: 4111 1111 1111 1111"
        result = scrubber.scrub_string(text)
        assert "[CARD_REDACTED]" in result

    # SSN tests
    def test_scrub_ssn_with_dashes(self, scrubber):
        """Test SSN with dashes."""
        text = "SSN: 123-45-6789"
        result = scrubber.scrub_string(text)
        assert "[SSN_REDACTED]" in result
        assert "123" not in result

    # Phone number tests
    def test_scrub_phone_us_format(self, scrubber):
        """Test US phone number format."""
        text = "Call: (555) 123-4567"
        result = scrubber.scrub_string(text)
        assert "[PHONE_REDACTED]" in result

    # Dictionary scrubbing tests
    def test_scrub_dict_sensitive_fields(self, scrubber):
        """Test that sensitive field names are scrubbed entirely."""
        data = {
            "user_id": "12345",
            "email": "test@example.com",
            "password": "secret123",
            "name": "John Doe",
        }
        result = scrubber.scrub_dict(data)

        # Sensitive fields should be hashed
        assert result["user_id"] != "12345"
        assert len(result["user_id"]) == 16  # Hash length
        assert result["email"] != "test@example.com"
        assert result["password"] != "secret123"

        # Non-sensitive fields should remain
        assert result["name"] == "John Doe"

    def test_scrub_dict_nested(self, scrubber):
        """Test nested dictionary scrubbing."""
        data = {
            "user": {
                "email": "test@example.com",
                "profile": {
                    "api_key": "secret-key-123",
                },
            },
        }
        result = scrubber.scrub_dict(data)

        assert result["user"]["email"] != "test@example.com"
        assert result["user"]["profile"]["api_key"] != "secret-key-123"

    def test_scrub_dict_list_values(self, scrubber):
        """Test list values in dictionaries."""
        data = {
            "emails": ["alice@test.com", "bob@test.com"],
            "ips": ["192.168.1.1", "10.0.0.1"],
        }
        result = scrubber.scrub_dict(data)

        assert "[EMAIL_REDACTED]" in result["emails"][0]
        assert "[IP_REDACTED]" in result["ips"][0]

    # Stack frame scrubbing tests
    def test_scrub_stack_frames_context_line(self, scrubber):
        """Test context line scrubbing in stack frames."""
        frames = [
            {
                "filename": "app.py",
                "function": "process",
                "lineno": 42,
                "context_line": "user_email = 'test@example.com'",
            }
        ]
        result = scrubber.scrub_stack_frames(frames)

        assert "[EMAIL_REDACTED]" in result[0]["context_line"]

    def test_scrub_stack_frames_pre_post_context(self, scrubber):
        """Test pre/post context scrubbing."""
        frames = [
            {
                "filename": "app.py",
                "pre_context": ["ip = '192.168.1.1'"],
                "context_line": "process()",
                "post_context": ["token = 'Bearer abc123'"],
            }
        ]
        result = scrubber.scrub_stack_frames(frames)

        assert "[IP_REDACTED]" in result[0]["pre_context"][0]
        assert "[AUTH_REDACTED]" in result[0]["post_context"][0]

    # Hash value tests
    def test_hash_value_deterministic(self, scrubber):
        """Test that hashing is deterministic with same salt."""
        value = "test-value"
        hash1 = scrubber.hash_value(value)
        hash2 = scrubber.hash_value(value)
        assert hash1 == hash2

    def test_hash_value_different_with_different_salt(self):
        """Test that different salts produce different hashes."""
        scrubber1 = PIIScrubber(salt="salt1")
        scrubber2 = PIIScrubber(salt="salt2")
        value = "test-value"
        assert scrubber1.hash_value(value) != scrubber2.hash_value(value)

    # Edge cases
    def test_scrub_empty_string(self, scrubber):
        """Test empty string handling."""
        assert scrubber.scrub_string("") == ""

    def test_scrub_none_in_dict(self, scrubber):
        """Test None values in dictionaries."""
        data = {"email": None, "user_id": None}
        result = scrubber.scrub_dict(data)
        assert result["email"] is None
        assert result["user_id"] is None

    def test_scrub_count_tracking(self, scrubber):
        """Test that scrub count is tracked."""
        scrubber.reset_scrub_count()
        assert scrubber.get_scrub_count() == 0

        scrubber.scrub_string("test@example.com")
        assert scrubber.get_scrub_count() > 0

    def test_max_depth_protection(self, scrubber):
        """Test max depth protection against deeply nested data."""
        # Create deeply nested structure
        data = {"level": 0}
        current = data
        for i in range(15):
            current["nested"] = {"level": i + 1}
            current = current["nested"]

        # Should not raise, should handle gracefully
        result = scrubber.scrub_dict(data, max_depth=10)
        assert result is not None


class TestSingletonAndHelpers:
    """Test singleton pattern and helper functions."""

    def test_get_pii_scrubber_singleton(self):
        """Test singleton pattern."""
        scrubber1 = get_pii_scrubber()
        scrubber2 = get_pii_scrubber()
        assert scrubber1 is scrubber2

    def test_scrub_for_logging_helper(self):
        """Test the convenience function."""
        data = {"email": "test@example.com"}
        result = scrub_for_logging(data)
        assert result["email"] != "test@example.com"
