"""
Unit tests for Confidence Scorer Service.

Tests confidence calculation, freshness scoring, and human-readable reasoning generation.

EPIC Q: AI Transparency & UX Polish
"""

from datetime import datetime, timedelta

import pytest

from app.models.analysis import SimilarIssueRef
from app.services.confidence_scorer import ConfidenceScorer, get_confidence_scorer


@pytest.fixture
def scorer():
    """Fixture providing a ConfidenceScorer instance."""
    return ConfidenceScorer()


@pytest.fixture
def mock_similar_issues():
    """Fixture providing mock similar issues."""
    return [
        SimilarIssueRef(
            id=1,
            title="High similarity issue",
            similarity=0.95,
            project="test",
            status="unresolved",
        ),
        SimilarIssueRef(
            id=2,
            title="Medium similarity issue",
            similarity=0.75,
            project="test",
            status="resolved",
        ),
        SimilarIssueRef(
            id=3,
            title="High similarity issue 2",
            similarity=0.88,
            project="test",
            status="unresolved",
        ),
    ]


class TestConfidenceFactorsComputation:
    """Test confidence factor computation."""

    def test_high_confidence_with_fresh_data(self, scorer, mock_similar_issues):
        """Test confidence is high with fresh enrichment and high similarity."""
        # All data fresh (< 24 hours)
        now = datetime.utcnow()
        enrichment_status = {
            "release_context": {"fetched_at": now.isoformat()},
            "performance_spans": {"fetched_at": (now - timedelta(hours=1)).isoformat()},
            "grouping_info": {"fetched_at": (now - timedelta(hours=12)).isoformat()},
        }

        factors = scorer.compute_confidence_factors(
            similar_issues=mock_similar_issues,
            enrichment_used=["release_context", "performance_spans", "grouping_info"],
            enrichment_status=enrichment_status,
            total_enrichment_sources=11,
        )

        # Should have 2 high similarity issues (>0.8)
        assert factors.high_similarity_count == 2

        # Coverage should be 3/11 ≈ 0.27
        assert 0.25 <= factors.enrichment_coverage <= 0.3

        # Freshness should be very high (all fresh)
        assert factors.freshness_score >= 0.95

        # Reasoning should mention similarity
        assert "similar" in factors.reasoning.lower()

    def test_low_confidence_with_stale_data(self, scorer):
        """Test confidence is low when enrichment data is stale."""
        # No similar issues, stale data
        now = datetime.utcnow()
        enrichment_status = {
            "release_context": {
                "fetched_at": (now - timedelta(days=45)).isoformat()
            },  # Very stale
        }

        factors = scorer.compute_confidence_factors(
            similar_issues=[],
            enrichment_used=["release_context"],
            enrichment_status=enrichment_status,
            total_enrichment_sources=11,
        )

        assert factors.high_similarity_count == 0
        assert factors.freshness_score < 0.3  # Very stale
        assert "no similar issues" in factors.reasoning.lower()
        assert "stale" in factors.reasoning.lower()

    def test_medium_confidence_moderate_data(self, scorer):
        """Test medium confidence with moderate data quality."""
        now = datetime.utcnow()

        # One medium similarity issue
        similar_issues = [
            SimilarIssueRef(
                id=1, title="Medium match", similarity=0.65, project="test", status="unresolved"
            )
        ]

        # Moderate staleness (10 days)
        enrichment_status = {
            "release_context": {"fetched_at": (now - timedelta(days=10)).isoformat()},
            "performance_spans": {"fetched_at": (now - timedelta(days=5)).isoformat()},
        }

        factors = scorer.compute_confidence_factors(
            similar_issues=similar_issues,
            enrichment_used=["release_context", "performance_spans"],
            enrichment_status=enrichment_status,
            total_enrichment_sources=11,
        )

        # No high similarity (>0.8)
        assert factors.high_similarity_count == 0

        # Moderate coverage
        assert 0.15 <= factors.enrichment_coverage <= 0.2

        # Moderate freshness
        assert 0.4 <= factors.freshness_score <= 0.7

        assert "lower similarity" in factors.reasoning.lower()


class TestOverallConfidence:
    """Test overall confidence score calculation."""

    def test_confidence_with_many_high_similarity_issues(self, scorer, mock_similar_issues):
        """Test confidence calculation with multiple high-similarity issues."""
        # Add more high similarity issues
        more_issues = mock_similar_issues + [
            SimilarIssueRef(id=4, title="Issue 4", similarity=0.92, project="test"),
            SimilarIssueRef(id=5, title="Issue 5", similarity=0.85, project="test"),
        ]

        factors = scorer.compute_confidence_factors(
            similar_issues=more_issues,
            enrichment_used=["release_context"] * 9,  # High coverage
            enrichment_status={
                f"source_{i}": {"fetched_at": datetime.utcnow().isoformat()} for i in range(9)
            },
            total_enrichment_sources=11,
        )

        confidence = scorer.compute_overall_confidence(factors, len(more_issues))

        # Should be moderate to high confidence (≥0.6 with good data)
        assert confidence >= 0.6

    def test_confidence_penalty_with_no_similar_issues(self, scorer):
        """Test confidence penalty when no similar issues found."""
        factors = scorer.compute_confidence_factors(
            similar_issues=[],
            enrichment_used=["release_context"],
            enrichment_status={"release_context": {"fetched_at": datetime.utcnow().isoformat()}},
            total_enrichment_sources=11,
        )

        confidence = scorer.compute_overall_confidence(factors, 0)

        # Should have 50% penalty applied
        assert confidence < 0.4


class TestFreshnessScoring:
    """Test freshness score computation."""

    def test_fresh_data(self, scorer):
        """Test fresh data (< 24 hours) gets high score."""
        now = datetime.utcnow()
        enrichment_status = {
            "source1": {"fetched_at": now.isoformat()},
            "source2": {"fetched_at": (now - timedelta(hours=12)).isoformat()},
        }

        freshness = scorer._compute_freshness_score(["source1", "source2"], enrichment_status)

        assert freshness >= 0.95

    def test_stale_data(self, scorer):
        """Test stale data (7-30 days) gets medium score."""
        now = datetime.utcnow()
        enrichment_status = {
            "source1": {"fetched_at": (now - timedelta(days=10)).isoformat()},
        }

        freshness = scorer._compute_freshness_score(["source1"], enrichment_status)

        assert 0.3 <= freshness <= 0.7

    def test_very_stale_data(self, scorer):
        """Test very stale data (> 30 days) gets low score."""
        now = datetime.utcnow()
        enrichment_status = {
            "source1": {"fetched_at": (now - timedelta(days=45)).isoformat()},
        }

        freshness = scorer._compute_freshness_score(["source1"], enrichment_status)

        assert freshness <= 0.3

    def test_missing_timestamp(self, scorer):
        """Test missing timestamp gets low score."""
        enrichment_status = {"source1": {}}  # No fetched_at

        freshness = scorer._compute_freshness_score(["source1"], enrichment_status)

        assert freshness <= 0.4


class TestStaleSourceIdentification:
    """Test identification of stale and very stale sources."""

    def test_identify_stale_sources(self, scorer):
        """Test correct identification of stale sources."""
        now = datetime.utcnow()
        enrichment_status = {
            "fresh": {"fetched_at": now.isoformat()},
            "stale": {"fetched_at": (now - timedelta(days=10)).isoformat()},
            "very_stale": {"fetched_at": (now - timedelta(days=45)).isoformat()},
            "missing": {},
        }

        stale, very_stale = scorer.identify_stale_sources(enrichment_status)

        assert "fresh" not in stale
        assert "fresh" not in very_stale

        assert "stale" in stale
        assert "stale" not in very_stale

        assert "very_stale" in very_stale
        assert "missing" in very_stale


class TestReasoningGeneration:
    """Test human-readable reasoning generation."""

    def test_confidence_factors_reasoning(self, scorer):
        """Test reasoning string generation."""
        reasoning = scorer._generate_confidence_reasoning(
            high_similarity_count=3, coverage=0.8, freshness=0.9, total_similar=5
        )

        assert "3 highly similar issues" in reasoning.lower()
        assert "excellent" in reasoning.lower()
        assert "fresh" in reasoning.lower()

    def test_low_quality_reasoning(self, scorer):
        """Test reasoning for low quality data."""
        reasoning = scorer._generate_confidence_reasoning(
            high_similarity_count=0, coverage=0.2, freshness=0.3, total_similar=1
        )

        assert "lower similarity" in reasoning.lower() or "similar" in reasoning.lower()
        assert "limited" in reasoning.lower()
        assert "stale" in reasoning.lower()


class TestSingletonPattern:
    """Test singleton pattern for confidence scorer."""

    def test_singleton_returns_same_instance(self):
        """Test get_confidence_scorer returns same instance."""
        scorer1 = get_confidence_scorer()
        scorer2 = get_confidence_scorer()

        assert scorer1 is scorer2
