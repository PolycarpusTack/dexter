"""
Unit tests for Feedback Service.

Tests feedback processing and validation logic.
"""

import pytest

from app.services.feedback_service import (
    CorrectionSummary,
    FeedbackService,
    FeedbackStats,
    ValidationResult,
    VALIDATION_THRESHOLDS,
)


class TestFeedbackStats:
    """Tests for FeedbackStats model."""

    def test_basic_stats(self):
        """Test basic stats creation."""
        stats = FeedbackStats(
            issue_id=1,
            positive_count=5,
            negative_count=2,
            correction_count=1,
            net_score=5,
            validation_status="validated",
            confidence_score=0.75,
        )
        assert stats.issue_id == 1
        assert stats.positive_count == 5
        assert stats.validation_status == "validated"

    def test_default_values(self):
        """Test default values."""
        stats = FeedbackStats(issue_id=1)
        assert stats.positive_count == 0
        assert stats.negative_count == 0
        assert stats.validation_status == "pending"
        assert stats.confidence_score == 0.0


class TestValidationResult:
    """Tests for ValidationResult model."""

    def test_validated_result(self):
        """Test validated result."""
        result = ValidationResult(
            issue_id=1,
            is_validated=True,
            reason="Met threshold",
            confidence_score=0.85,
            feedback_summary={"positive": 5, "negative": 1},
        )
        assert result.is_validated
        assert result.confidence_score == 0.85

    def test_rejected_result(self):
        """Test rejected result."""
        result = ValidationResult(
            issue_id=2,
            is_validated=False,
            reason="Too many negative votes",
            confidence_score=0.2,
            feedback_summary={"positive": 1, "negative": 6},
        )
        assert not result.is_validated


class TestCorrectionSummary:
    """Tests for CorrectionSummary model."""

    def test_with_corrections(self):
        """Test with corrections."""
        summary = CorrectionSummary(
            issue_id=1,
            correction_count=3,
            latest_correction="The fix is to add null check",
            suggested_solution="The fix is to add null check",
        )
        assert summary.correction_count == 3
        assert summary.suggested_solution is not None

    def test_no_corrections(self):
        """Test without corrections."""
        summary = CorrectionSummary(issue_id=1, correction_count=0)
        assert summary.correction_count == 0
        assert summary.latest_correction is None


class TestFeedbackServiceConfidence:
    """Tests for confidence calculation."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return FeedbackService()

    def test_base_confidence(self, service):
        """Test base confidence with no feedback."""
        confidence = service._calculate_confidence(0, 0, 0)
        assert confidence == VALIDATION_THRESHOLDS["confidence_base"]

    def test_positive_increases_confidence(self, service):
        """Test positive feedback increases confidence."""
        base = service._calculate_confidence(0, 0, 0)
        with_positive = service._calculate_confidence(3, 0, 0)
        assert with_positive > base

    def test_negative_decreases_confidence(self, service):
        """Test negative feedback decreases confidence."""
        base = service._calculate_confidence(0, 0, 0)
        with_negative = service._calculate_confidence(0, 3, 0)
        assert with_negative < base

    def test_corrections_boost_confidence(self, service):
        """Test corrections boost confidence more than simple positive."""
        with_positive = service._calculate_confidence(1, 0, 0)
        with_correction = service._calculate_confidence(0, 0, 1)
        # Corrections should have higher weight
        assert with_correction >= with_positive

    def test_confidence_max_cap(self, service):
        """Test confidence is capped at max."""
        confidence = service._calculate_confidence(100, 0, 50)
        assert confidence <= VALIDATION_THRESHOLDS["confidence_max"]

    def test_confidence_min_floor(self, service):
        """Test confidence doesn't go below 0."""
        confidence = service._calculate_confidence(0, 100, 0)
        assert confidence >= 0.0


class TestValidationThresholds:
    """Tests for validation thresholds."""

    def test_thresholds_exist(self):
        """Test required thresholds exist."""
        required = [
            "min_positive_for_validation",
            "min_net_score_for_validation",
            "max_negative_for_rejection",
            "correction_weight",
            "confidence_base",
            "confidence_per_positive",
            "confidence_max",
        ]
        for key in required:
            assert key in VALIDATION_THRESHOLDS

    def test_threshold_values_reasonable(self):
        """Test threshold values are reasonable."""
        assert VALIDATION_THRESHOLDS["min_positive_for_validation"] >= 1
        assert VALIDATION_THRESHOLDS["confidence_base"] > 0
        assert VALIDATION_THRESHOLDS["confidence_base"] < 1
        assert VALIDATION_THRESHOLDS["confidence_max"] <= 1
        assert VALIDATION_THRESHOLDS["confidence_per_positive"] > 0
