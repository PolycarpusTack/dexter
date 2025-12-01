"""
Unit tests for Parser Adapter service.

Tests unified stack parsing and PII scrubbing integration.
"""

import pytest

from app.services.parser_adapter import (
    SentryErrorPayload,
    UnifiedStackParser,
    get_unified_parser,
)


class TestSentryErrorPayload:
    """Tests for the SentryErrorPayload Pydantic model."""

    def test_minimal_payload(self):
        """Test minimal valid payload."""
        payload = SentryErrorPayload()
        assert payload.type == "Error"
        assert payload.value == ""

    def test_full_payload(self):
        """Test payload with all fields."""
        payload = SentryErrorPayload(
            type="ValueError",
            value="invalid input",
            platform="python",
            level="error",
        )
        assert payload.type == "ValueError"
        assert payload.value == "invalid input"
        assert payload.platform == "python"

    def test_extra_fields_allowed(self):
        """Test that extra fields are allowed."""
        payload = SentryErrorPayload(
            type="Error",
            value="test",
            custom_field="custom_value",
        )
        assert payload.type == "Error"


class TestUnifiedStackParser:
    """Tests for the UnifiedStackParser class."""

    @pytest.fixture
    def parser(self):
        """Create parser instance."""
        return UnifiedStackParser()

    def test_parse_and_format_basic(self, parser):
        """Test basic parsing and formatting."""
        error_data = {
            "type": "TypeError",
            "value": "Cannot read property of null",
            "platform": "javascript",
        }
        result = parser.parse_and_format(error_data)

        assert "TypeError" in result
        assert "Cannot read property of null" in result

    def test_parse_and_format_with_frames(self, parser):
        """Test parsing with stack frames."""
        error_data = {
            "type": "ValueError",
            "value": "test error",
            "stacktrace": {
                "frames": [
                    {
                        "filename": "app.py",
                        "function": "process",
                        "lineno": 42,
                        "in_app": True,
                    }
                ]
            },
        }
        result = parser.parse_and_format(error_data)

        assert "ValueError" in result
        assert "app.py" in result
        assert "process" in result

    def test_pii_scrubbing_in_parse(self, parser):
        """Test that PII is scrubbed during parsing."""
        error_data = {
            "type": "Error",
            "value": "Failed for user test@example.com",
            "user_id": "12345",
            "stacktrace": {
                "frames": [
                    {
                        "filename": "app.py",
                        "context_line": "email = 'secret@email.com'",
                    }
                ]
            },
        }
        result = parser.parse_and_format(error_data, scrub_pii=True)

        assert "test@example.com" not in result
        assert "secret@email.com" not in result
        assert "[EMAIL_REDACTED]" in result

    def test_extract_cleaned_frames(self, parser):
        """Test frame extraction."""
        error_data = {
            "stacktrace": {
                "frames": [
                    {
                        "filename": "app.py",
                        "function": "main",
                        "lineno": 10,
                        "in_app": True,
                    },
                    {
                        "filename": "site-packages/flask/app.py",
                        "function": "dispatch",
                        "lineno": 100,
                        "in_app": False,
                    },
                ]
            }
        }
        frames = parser.extract_cleaned_frames(error_data)

        # Should filter out vendor frames
        assert len(frames) == 1
        assert frames[0].filename == "app.py"

    def test_vendor_frame_filtering(self, parser):
        """Test vendor frame filtering."""
        error_data = {
            "stacktrace": {
                "frames": [
                    {"filename": "node_modules/react/index.js", "in_app": False},
                    {"filename": "src/app.js", "in_app": True},
                    {"filename": "site-packages/django/core.py", "in_app": False},
                ]
            }
        }
        frames = parser.extract_cleaned_frames(error_data)

        # Only app frame should remain
        filenames = [f.filename for f in frames]
        assert "app.js" in filenames
        assert not any("node_modules" in f for f in filenames)
        assert not any("site-packages" in f for f in filenames)

    def test_fallback_to_last_frames(self, parser):
        """Test fallback when no in_app frames."""
        error_data = {
            "stacktrace": {
                "frames": [
                    {"filename": "lib/internal.py", "in_app": False},
                    {"filename": "lib/util.py", "in_app": False},
                    {"filename": "lib/main.py", "in_app": False},
                ]
            }
        }
        frames = parser.extract_cleaned_frames(error_data)

        # Should fall back to last 3 frames
        assert len(frames) <= 3

    def test_deadlock_detection(self, parser):
        """Test deadlock error detection."""
        deadlock_errors = [
            {"type": "Error", "value": "Database deadlock detected"},
            {"type": "Error", "value": "Lock wait timeout exceeded"},
            {"type": "DeadlockError", "value": "Circular wait detected"},
        ]

        for error in deadlock_errors:
            assert parser._is_deadlock(error)

    def test_promise_rejection_detection(self, parser):
        """Test promise rejection detection."""
        promise_errors = [
            {"type": "UnhandledRejection", "value": "Promise failed"},
            {"type": "PromiseRejectionError", "value": "Async error"},
        ]

        for error in promise_errors:
            assert parser._is_promise_rejection(error)

    def test_exception_values_structure(self, parser):
        """Test exception.values structure parsing."""
        error_data = {
            "type": "Error",
            "value": "test",
            "exception": {
                "values": [
                    {
                        "type": "ValueError",
                        "value": "nested error",
                        "stacktrace": {
                            "frames": [
                                {"filename": "nested.py", "function": "nested_func"}
                            ]
                        },
                    }
                ]
            },
        }
        frames = parser.extract_cleaned_frames(error_data)

        assert len(frames) > 0
        assert frames[0].filename == "nested.py"

    def test_max_frames_limit(self, parser):
        """Test that frames are limited to 10."""
        error_data = {
            "stacktrace": {
                "frames": [
                    {"filename": f"file{i}.py", "function": f"func{i}", "in_app": True}
                    for i in range(20)
                ]
            }
        }
        frames = parser.extract_cleaned_frames(error_data)

        assert len(frames) <= 10


class TestSingletonParser:
    """Test singleton pattern."""

    def test_get_unified_parser_singleton(self):
        """Test that singleton returns same instance."""
        parser1 = get_unified_parser()
        parser2 = get_unified_parser()
        assert parser1 is parser2
