"""
Unit tests for multi-signal retrieval ranking.

EPIC P - Story P-1: Test multi-signal ranking functionality.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.retrieval_service import RetrievalService, SimilarIssue
from app.services.ranking_experiment import RankingVariant


@pytest.fixture
def retrieval_service():
    """Create a retrieval service instance for testing."""
    return RetrievalService()


@pytest.fixture
def mock_candidates():
    """Mock candidate issues from vector search."""
    return [
        {
            "id": 1,
            "sentry_issue_id": "ISSUE-001",
            "error_type": "TimeoutError",
            "error_message": "Request timeout after 30s",
            "similarity_score": 0.95,
            "is_useful": True,
            "feedback_count": 5,
            "ai_explanation": "Timeout due to slow database",
            "ai_suggested_fix": "Add query optimization",
            "human_solution": "Add index on user_id column",
            "platform": "python",
            "confidence_score": 0.85,
        },
        {
            "id": 2,
            "sentry_issue_id": "ISSUE-002",
            "error_type": "TimeoutError",
            "error_message": "Request timeout on external API",
            "similarity_score": 0.88,
            "is_useful": False,
            "feedback_count": 1,
            "ai_explanation": "External service slow",
            "ai_suggested_fix": None,
            "human_solution": None,
            "platform": "python",
            "confidence_score": 0.0,
        },
        {
            "id": 3,
            "sentry_issue_id": "ISSUE-003",
            "error_type": "DatabaseError",
            "error_message": "Deadlock detected",
            "similarity_score": 0.82,
            "is_useful": False,
            "feedback_count": 0,
            "ai_explanation": None,
            "ai_suggested_fix": None,
            "human_solution": None,
            "platform": "python",
            "confidence_score": 0.0,
        },
    ]


class TestMultiSignalRanking:
    """Test multi-signal ranking with enrichment data."""

    @pytest.mark.asyncio
    async def test_multi_signal_ranking_with_all_signals(
        self, retrieval_service, mock_candidates
    ):
        """Test composite ranking uses all enrichment signals."""
        mock_session = AsyncMock()
        user_teams = {"backend-team", "platform-team"}
        query_tags = {"environment": "production"}

        # Mock signal computation functions
        with patch("app.services.retrieval_service.compute_release_recency_score", return_value=0.9), \
             patch("app.services.retrieval_service.compute_ownership_match_score", return_value=1.0), \
             patch("app.services.retrieval_service.compute_alert_frequency_score", return_value=0.7), \
             patch("app.services.retrieval_service.compute_replay_impact_score", return_value=0.5), \
             patch("app.services.retrieval_service.compute_tag_overlap_score", return_value=0.8), \
             patch("app.services.retrieval_service.compute_profiling_hotspot_score", return_value=0.6), \
             patch("app.services.retrieval_service.compute_performance_impact_score", return_value=0.4), \
             patch.object(retrieval_service, "_compute_staleness_factor", return_value=1.0):

            result = await retrieval_service._apply_multi_signal_ranking(
                session=mock_session,
                candidates=mock_candidates[:1],
                user_teams=user_teams,
                query_tags=query_tags,
                ranking_variant="balanced"
            )

            assert len(result) == 1
            issue = result[0]

            # Check composite score was calculated
            assert issue.composite_score > 0
            assert issue.composite_score > issue.similarity_score  # Should be boosted by enrichment

            # Check individual signals were populated
            assert issue.release_recency_score == 0.9
            assert issue.ownership_match_score == 1.0
            assert issue.alert_frequency_score == 0.7
            assert issue.replay_impact_score == 0.5
            assert issue.tag_overlap_score == 0.8

    @pytest.mark.asyncio
    async def test_ranking_fallback_without_enrichment(
        self, retrieval_service, mock_candidates
    ):
        """Test fallback to pure vector similarity when no enrichment."""
        mock_session = AsyncMock()

        # Mock all signal functions to return None (no data)
        with patch("app.services.retrieval_service.compute_release_recency_score", return_value=None), \
             patch("app.services.retrieval_service.compute_ownership_match_score", return_value=None), \
             patch("app.services.retrieval_service.compute_alert_frequency_score", return_value=None), \
             patch("app.services.retrieval_service.compute_replay_impact_score", return_value=None), \
             patch("app.services.retrieval_service.compute_tag_overlap_score", return_value=None), \
             patch("app.services.retrieval_service.compute_profiling_hotspot_score", return_value=None), \
             patch("app.services.retrieval_service.compute_performance_impact_score", return_value=None), \
             patch.object(retrieval_service, "_compute_staleness_factor", return_value=1.0):

            result = await retrieval_service._apply_multi_signal_ranking(
                session=mock_session,
                candidates=mock_candidates[:1],
                user_teams=None,
                query_tags=None,
                ranking_variant="balanced"
            )

            assert len(result) == 1
            issue = result[0]

            # Composite score should be mostly from vector similarity
            # With balanced weights: 0.40 * 0.95 = 0.38
            assert 0.35 <= issue.composite_score <= 0.42

    @pytest.mark.asyncio
    async def test_staleness_discount(self, retrieval_service, mock_candidates):
        """Test stale enrichment data gets reduced weight."""
        mock_session = AsyncMock()

        # Mock fresh data
        with patch("app.services.retrieval_service.compute_release_recency_score", return_value=0.8), \
             patch("app.services.retrieval_service.compute_ownership_match_score", return_value=0.7), \
             patch("app.services.retrieval_service.compute_alert_frequency_score", return_value=0.6), \
             patch("app.services.retrieval_service.compute_replay_impact_score", return_value=0.5), \
             patch("app.services.retrieval_service.compute_tag_overlap_score", return_value=0.4), \
             patch("app.services.retrieval_service.compute_profiling_hotspot_score", return_value=0.3), \
             patch("app.services.retrieval_service.compute_performance_impact_score", return_value=0.2):

            # Test with fresh data (staleness_factor = 1.0)
            with patch.object(retrieval_service, "_compute_staleness_factor", return_value=1.0):
                result_fresh = await retrieval_service._apply_multi_signal_ranking(
                    session=mock_session,
                    candidates=mock_candidates[:1],
                    user_teams=None,
                    query_tags=None,
                    ranking_variant="balanced"
                )

            # Test with stale data (staleness_factor = 0.5)
            with patch.object(retrieval_service, "_compute_staleness_factor", return_value=0.5):
                result_stale = await retrieval_service._apply_multi_signal_ranking(
                    session=mock_session,
                    candidates=mock_candidates[:1],
                    user_teams=None,
                    query_tags=None,
                    ranking_variant="balanced"
                )

            # Stale composite score should be half of fresh
            assert result_stale[0].composite_score < result_fresh[0].composite_score
            assert result_stale[0].composite_score == pytest.approx(
                result_fresh[0].composite_score * 0.5,
                abs=0.01
            )

    def test_ranking_weights_control_variant(self, retrieval_service):
        """Test control variant uses 100% vector similarity."""
        weights = retrieval_service._get_ranking_weights("control")

        assert weights["vector_similarity"] == 1.0
        assert weights["release_recency"] == 0.0
        assert weights["ownership_match"] == 0.0
        assert weights["alert_frequency"] == 0.0
        assert weights["replay_impact"] == 0.0
        assert weights["tag_overlap"] == 0.0

    def test_ranking_weights_balanced_variant(self, retrieval_service):
        """Test balanced variant uses default weights."""
        weights = retrieval_service._get_ranking_weights("balanced")

        assert weights["vector_similarity"] == 0.40
        assert weights["release_recency"] == 0.15
        assert weights["ownership_match"] == 0.12
        assert weights["alert_frequency"] == 0.10
        assert weights["replay_impact"] == 0.10
        assert weights["tag_overlap"] == 0.08

        # Weights should sum to ~1.0
        total = sum(weights.values())
        assert 0.99 <= total <= 1.01

    def test_ranking_weights_enrichment_heavy_variant(self, retrieval_service):
        """Test enrichment_heavy variant prioritizes enrichment signals."""
        weights = retrieval_service._get_ranking_weights("enrichment_heavy")

        assert weights["vector_similarity"] == 0.20
        assert weights["release_recency"] == 0.20
        # Enrichment signals should have higher total weight
        enrichment_weight = sum(
            w for k, w in weights.items() if k != "vector_similarity"
        )
        assert enrichment_weight == 0.80

    @pytest.mark.asyncio
    async def test_simple_ranking_fallback(self, retrieval_service, mock_candidates):
        """Test simple ranking when enrichment is disabled."""
        result = retrieval_service._apply_simple_ranking(mock_candidates)

        assert len(result) == 3

        # Should have combined scores but no composite scores
        for issue in result:
            assert issue.combined_score > 0
            assert issue.composite_score == 0.0
            assert issue.release_recency_score is None
            assert issue.ownership_match_score is None

        # Validated issue should have higher combined score
        assert result[0].combined_score > result[1].combined_score


class TestStalenessCalculation:
    """Test staleness factor computation."""

    @pytest.mark.asyncio
    async def test_fresh_data_no_penalty(self, retrieval_service):
        """Test fresh data (< 7 days) gets no penalty."""
        mock_session = AsyncMock()
        fresh_timestamp = datetime.now(timezone.utc) - timedelta(days=3)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = fresh_timestamp
        mock_session.execute.return_value = mock_result

        staleness = await retrieval_service._compute_staleness_factor(mock_session, 1)

        assert staleness == 1.0

    @pytest.mark.asyncio
    async def test_stale_data_penalty(self, retrieval_service):
        """Test stale data (> 7 days) gets 50% penalty."""
        mock_session = AsyncMock()
        stale_timestamp = datetime.now(timezone.utc) - timedelta(days=15)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = stale_timestamp
        mock_session.execute.return_value = mock_result

        staleness = await retrieval_service._compute_staleness_factor(mock_session, 1)

        assert staleness == 0.5

    @pytest.mark.asyncio
    async def test_very_stale_data_heavy_penalty(self, retrieval_service):
        """Test very stale data (> 30 days) gets 75% penalty."""
        mock_session = AsyncMock()
        very_stale_timestamp = datetime.now(timezone.utc) - timedelta(days=45)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = very_stale_timestamp
        mock_session.execute.return_value = mock_result

        staleness = await retrieval_service._compute_staleness_factor(mock_session, 1)

        assert staleness == 0.25

    @pytest.mark.asyncio
    async def test_no_timestamp_no_penalty(self, retrieval_service):
        """Test missing timestamp gets no penalty."""
        mock_session = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        staleness = await retrieval_service._compute_staleness_factor(mock_session, 1)

        assert staleness == 1.0


class TestConfidenceCalculation:
    """Test confidence level calculation with composite scores."""

    def test_high_confidence_validated_high_score(self, retrieval_service):
        """Test HIGH confidence for validated issue with >0.85 score."""
        issues = [
            SimilarIssue(
                id=1,
                sentry_issue_id="ISSUE-001",
                error_type="Error",
                error_message="Test",
                similarity_score=0.9,
                combined_score=0.9,
                composite_score=0.88,
                is_validated=True,
            )
        ]

        confidence = retrieval_service._calculate_confidence(issues)
        assert confidence == "HIGH"

    def test_medium_confidence_high_score(self, retrieval_service):
        """Test MEDIUM confidence for >0.75 score."""
        issues = [
            SimilarIssue(
                id=1,
                sentry_issue_id="ISSUE-001",
                error_type="Error",
                error_message="Test",
                similarity_score=0.8,
                combined_score=0.8,
                composite_score=0.78,
                is_validated=False,
            )
        ]

        confidence = retrieval_service._calculate_confidence(issues)
        assert confidence == "MEDIUM"

    def test_low_confidence_low_score(self, retrieval_service):
        """Test LOW confidence for low scores."""
        issues = [
            SimilarIssue(
                id=1,
                sentry_issue_id="ISSUE-001",
                error_type="Error",
                error_message="Test",
                similarity_score=0.6,
                combined_score=0.6,
                composite_score=0.5,
                is_validated=False,
            )
        ]

        confidence = retrieval_service._calculate_confidence(issues)
        assert confidence == "LOW"

    def test_uses_composite_score_when_available(self, retrieval_service):
        """Test confidence uses composite score over combined score."""
        issues = [
            SimilarIssue(
                id=1,
                sentry_issue_id="ISSUE-001",
                error_type="Error",
                error_message="Test",
                similarity_score=0.9,
                combined_score=0.95,  # High combined score
                composite_score=0.6,   # Low composite score
                is_validated=False,
            )
        ]

        # Should use composite score (0.6) and return LOW
        confidence = retrieval_service._calculate_confidence(issues)
        assert confidence == "LOW"
