"""
Unit tests for Embedding Formatter service.

Tests stack frame formatting for code embedding models.
"""

import pytest

from app.services.embedding_formatter import (
    CleanedFrame,
    error_to_embedding_text,
    frames_to_embedding_text,
)


class TestCleanedFrame:
    """Tests for the CleanedFrame model."""

    def test_cleaned_frame_to_text_full(self):
        """Test full frame conversion to text."""
        frame = CleanedFrame(
            filename="app/services/user.py",
            function="get_user",
            lineno=42,
            context_line="return db.query(User).filter_by(id=user_id).first()",
            module="app.services.user",
        )
        text = frame.to_text()

        assert "Module: app.services.user" in text
        assert "File: app/services/user.py" in text
        assert "Function: get_user" in text
        assert "Line: 42" in text
        assert "Code: return db.query" in text

    def test_cleaned_frame_to_text_minimal(self):
        """Test minimal frame (filename only)."""
        frame = CleanedFrame(filename="unknown.py")
        text = frame.to_text()

        assert "File: unknown.py" in text
        assert "Function:" not in text
        assert "Line:" not in text

    def test_cleaned_frame_to_text_no_context(self):
        """Test frame without context line."""
        frame = CleanedFrame(
            filename="test.py",
            function="test_func",
            lineno=10,
        )
        text = frame.to_text()

        assert "File: test.py" in text
        assert "Function: test_func" in text
        assert "Code:" not in text


class TestFramesToEmbeddingText:
    """Tests for frames_to_embedding_text function."""

    def test_basic_formatting(self):
        """Test basic error formatting."""
        frames = [
            CleanedFrame(
                filename="app.py",
                function="main",
                lineno=10,
                context_line="raise ValueError('test')",
            )
        ]
        result = frames_to_embedding_text(
            error_type="ValueError",
            error_message="test error message",
            frames=frames,
        )

        assert "Error: ValueError: test error message" in result
        assert "Stack trace:" in result
        assert "File: app.py" in result

    def test_with_platform(self):
        """Test platform inclusion."""
        result = frames_to_embedding_text(
            error_type="TypeError",
            error_message="null is not an object",
            frames=[],
            platform="javascript",
        )

        assert "Platform: javascript" in result

    def test_empty_frames(self):
        """Test with no frames."""
        result = frames_to_embedding_text(
            error_type="Error",
            error_message="Something went wrong",
            frames=[],
        )

        assert "Error: Error: Something went wrong" in result
        assert "Stack trace:" not in result

    def test_truncate_long_message(self):
        """Test long message truncation."""
        long_message = "x" * 1000
        result = frames_to_embedding_text(
            error_type="Error",
            error_message=long_message,
            frames=[],
        )

        # Message should be truncated to 500 chars
        assert len(result) < 1000

    def test_max_frames_limit(self):
        """Test max frames limiting."""
        frames = [
            CleanedFrame(filename=f"file{i}.py", function=f"func{i}")
            for i in range(20)
        ]
        result = frames_to_embedding_text(
            error_type="Error",
            error_message="test",
            frames=frames,
            max_frames=5,
        )

        # Should only include first 5 frames
        assert "file0.py" in result
        assert "file4.py" in result
        assert "file5.py" not in result


class TestErrorToEmbeddingText:
    """Tests for error_to_embedding_text function."""

    def test_with_direct_stacktrace(self):
        """Test with direct stacktrace structure."""
        error_data = {
            "type": "ValueError",
            "value": "invalid value",
            "platform": "python",
            "stacktrace": {
                "frames": [
                    {
                        "filename": "app.py",
                        "function": "process",
                        "lineno": 42,
                        "context_line": "validate(data)",
                    }
                ]
            },
        }
        result = error_to_embedding_text(error_data)

        assert "ValueError" in result
        assert "invalid value" in result
        assert "app.py" in result

    def test_with_exception_values(self):
        """Test with exception.values structure."""
        error_data = {
            "type": "TypeError",
            "value": "null reference",
            "exception": {
                "values": [
                    {
                        "stacktrace": {
                            "frames": [
                                {
                                    "filename": "handler.js",
                                    "function": "onClick",
                                }
                            ]
                        }
                    }
                ]
            },
        }
        result = error_to_embedding_text(error_data)

        assert "TypeError" in result
        assert "handler.js" in result

    def test_with_cleaned_stack(self):
        """Test with pre-cleaned stack frames."""
        error_data = {
            "type": "Error",
            "value": "test",
            "cleaned_stack": [
                {"filename": "cleaned.py", "function": "clean_func"},
            ],
        }
        result = error_to_embedding_text(error_data)

        assert "cleaned.py" in result

    def test_missing_fields(self):
        """Test with missing optional fields."""
        error_data = {
            "type": "Error",
        }
        result = error_to_embedding_text(error_data)

        assert "Error: Error" in result

    def test_empty_dict(self):
        """Test with empty error data."""
        result = error_to_embedding_text({})

        assert "Error" in result
