"""
Unit tests for Validation Service.

Tests validation workflow and metrics.
"""

import pytest
from datetime import datetime
from unittest.mock import MagicMock

from app.services.validation_service import (
    QualityScore,
    ValidationMetrics,
    ValidationQueueItem,
    ValidationService,
)


class TestValidationQueueItem:
    """Tests for ValidationQueueItem model."""

    def test_basic_item(self):
        """Test basic queue item."""
        item = ValidationQueueItem(
            issue_id=1,
            sentry_issue_id="ISSUE-123",
            error_type="ValueError",
            error_message="test error",
            positive_count=5,
            negative_count=1,
            priority_score=0.75,
        )
        assert item.issue_id == 1
        assert item.priority_score == 0.75

    def test_with_solutions(self):
        """Test item with solutions."""
        item = ValidationQueueItem(
            issue_id=1,
            sentry_issue_id="X",
            error_type="E",
            error_message="M",
            ai_explanation="Check your input",
            human_solution="Validate before processing",
        )
        assert item.ai_explanation is not None
        assert item.human_solution is not None


class TestValidationMetrics:
    """Tests for ValidationMetrics model."""

    def test_basic_metrics(self):
        """Test basic metrics."""
        metrics = ValidationMetrics(
            total_issues=100,
            validated_issues=30,
            pending_issues=50,
            rejected_issues=5,
            validation_rate=0.30,
        )
        assert metrics.total_issues == 100
        assert metrics.validation_rate == 0.30

    def test_with_error_types(self):
        """Test metrics with error type breakdown."""
        metrics = ValidationMetrics(
            total_issues=100,
            validated_issues=30,
            pending_issues=50,
            rejected_issues=5,
            validation_rate=0.30,
            top_error_types=[
                {"error_type": "ValueError", "count": 40},
                {"error_type": "TypeError", "count": 30},
            ],
        )
        assert len(metrics.top_error_types) == 2


class TestQualityScore:
    """Tests for QualityScore model."""

    def test_high_quality(self):
        """Test high quality score."""
        score = QualityScore(
            issue_id=1,
            overall_score=0.9,
            completeness=1.0,
            feedback_score=0.8,
            has_code_example=True,
            has_steps=True,
        )
        assert score.overall_score == 0.9
        assert score.has_code_example
        assert score.has_steps

    def test_low_quality(self):
        """Test low quality score."""
        score = QualityScore(
            issue_id=2,
            overall_score=0.3,
            completeness=0.33,
            feedback_score=0.2,
            has_code_example=False,
            has_steps=False,
        )
        assert score.overall_score == 0.3
        assert not score.has_code_example

    def test_score_bounds(self):
        """Test score bounds."""
        # Valid boundary values
        score = QualityScore(
            issue_id=1,
            overall_score=0.0,
            completeness=0.0,
            feedback_score=0.0,
        )
        assert score.overall_score == 0.0

        score = QualityScore(
            issue_id=1,
            overall_score=1.0,
            completeness=1.0,
            feedback_score=1.0,
        )
        assert score.overall_score == 1.0


class TestValidationServicePriority:
    """Tests for priority calculation."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return ValidationService()

    def test_priority_with_high_feedback(self, service):
        """Test priority increases with feedback count."""
        # Create mock issue
        issue = MagicMock()
        issue.feedback_count = 10
        issue.created_at = datetime.utcnow()

        stats = MagicMock()
        stats.positive_count = 5
        stats.negative_count = 1
        stats.correction_count = 2

        priority = service._calculate_priority(issue, stats)
        assert priority > 0

    def test_priority_with_low_feedback(self, service):
        """Test lower priority with less feedback."""
        issue = MagicMock()
        issue.feedback_count = 1
        issue.created_at = datetime.utcnow()

        stats = MagicMock()
        stats.positive_count = 1
        stats.negative_count = 0
        stats.correction_count = 0

        priority = service._calculate_priority(issue, stats)

        # Create high feedback issue
        high_issue = MagicMock()
        high_issue.feedback_count = 10
        high_issue.created_at = datetime.utcnow()

        high_stats = MagicMock()
        high_stats.positive_count = 8
        high_stats.negative_count = 0
        high_stats.correction_count = 2

        high_priority = service._calculate_priority(high_issue, high_stats)

        assert high_priority > priority

    def test_priority_negative_net_handled(self, service):
        """Test priority handles negative net score."""
        issue = MagicMock()
        issue.feedback_count = 5
        issue.created_at = datetime.utcnow()

        stats = MagicMock()
        stats.positive_count = 1
        stats.negative_count = 4
        stats.correction_count = 0

        priority = service._calculate_priority(issue, stats)
        assert priority >= 0  # Should not be negative
