"""
Unit tests for database models.

Tests SQLAlchemy models without requiring a database connection.
"""

import pytest
from datetime import datetime

from app.db.models import (
    EMBEDDING_DIMENSION,
    FeedbackLog,
    ProcessingQueue,
    SentryIssue,
)


class TestSentryIssueModel:
    """Tests for the SentryIssue model."""

    def test_embedding_dimension_constant(self):
        """Test that embedding dimension is set correctly."""
        assert EMBEDDING_DIMENSION == 768

    def test_model_repr(self):
        """Test model string representation."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-123",
            sentry_event_id="EVENT-456",
            error_type="ValueError",
            error_message="test error",
            is_useful=True,
        )
        repr_str = repr(issue)

        assert "SentryIssue" in repr_str
        assert "id=1" in repr_str
        assert "ValueError" in repr_str
        assert "useful=True" in repr_str

    def test_model_default_values(self):
        """Test default values for optional fields."""
        issue = SentryIssue(
            sentry_issue_id="TEST-1",
            sentry_event_id="EVENT-1",
            error_type="Error",
            error_message="test",
        )

        assert issue.is_useful is False
        assert issue.feedback_count == 0
        assert issue.level == "error"
        assert issue.processing_status == "completed"


class TestFeedbackLogModel:
    """Tests for the FeedbackLog model."""

    def test_model_repr(self):
        """Test model string representation."""
        feedback = FeedbackLog(
            id=1,
            issue_id=100,
            feedback_type="positive",
        )
        repr_str = repr(feedback)

        assert "FeedbackLog" in repr_str
        assert "id=1" in repr_str
        assert "positive" in repr_str
        assert "issue_id=100" in repr_str

    def test_feedback_types(self):
        """Test valid feedback types."""
        valid_types = ["positive", "negative", "correction"]

        for feedback_type in valid_types:
            feedback = FeedbackLog(
                issue_id=1,
                feedback_type=feedback_type,
            )
            assert feedback.feedback_type == feedback_type


class TestProcessingQueueModel:
    """Tests for the ProcessingQueue model."""

    def test_model_repr(self):
        """Test model string representation."""
        queue_item = ProcessingQueue(
            id=1,
            sentry_event_id="EVENT-123",
            payload={"test": "data"},
            status="pending",
        )
        repr_str = repr(queue_item)

        assert "ProcessingQueue" in repr_str
        assert "EVENT-123" in repr_str
        assert "pending" in repr_str

    def test_default_values(self):
        """Test default values."""
        queue_item = ProcessingQueue(
            sentry_event_id="EVENT-1",
            payload={},
        )

        assert queue_item.status == "pending"
        assert queue_item.attempts == 0
        assert queue_item.max_attempts == 3
