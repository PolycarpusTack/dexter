"""
Unit tests for signal computation.

Tests release recency scoring and composite score calculation.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.enrichment.signal_computation import (
    compute_release_recency_score,
    update_enrichment_signals,
    compute_composite_score,
)
from app.db.models import SentryIssue, EnrichmentSignal


class TestReleaseRecencyScore:
    """Test suite for release recency score computation."""

    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        db = AsyncMock(spec=AsyncSession)
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        return db

    @pytest.mark.asyncio
    async def test_score_very_recent_release(self, mock_db):
        """Test score is ~1.0 for releases < 1 hour old (exponential decay)."""
        now = datetime.now(timezone.utc)
        recent_release = now - timedelta(minutes=30)

        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test",
            release_context={
                "releases": [
                    {
                        "version": "1.0.0",
                        "date_created": recent_release.isoformat(),
                    }
                ]
            },
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_release_recency_score(mock_db, 1)

        # Exponential decay: very recent releases should be close to 1.0
        assert score == pytest.approx(1.0, abs=0.02)

    @pytest.mark.asyncio
    async def test_score_very_old_release(self, mock_db):
        """Test score is 0.0 for releases > 7 days old."""
        now = datetime.now(timezone.utc)
        old_release = now - timedelta(days=10)

        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test",
            release_context={
                "releases": [
                    {
                        "version": "1.0.0",
                        "date_created": old_release.isoformat(),
                    }
                ]
            },
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_release_recency_score(mock_db, 1)

        assert score == 0.0

    @pytest.mark.asyncio
    async def test_score_exponential_decay(self, mock_db):
        """Test exponential decay for mid-age releases."""
        now = datetime.now(timezone.utc)
        # 84 hours = 3.5 days
        mid_release = now - timedelta(hours=84)

        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test",
            release_context={
                "releases": [
                    {
                        "version": "1.0.0",
                        "date_created": mid_release.isoformat(),
                    }
                ]
            },
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_release_recency_score(mock_db, 1)

        # Exponential decay: at 84 hours with decay_constant = 168/5 = 33.6
        # score = exp(-84/33.6) ≈ 0.082
        assert score == pytest.approx(0.082, abs=0.01)

    @pytest.mark.asyncio
    async def test_score_no_release_context(self, mock_db):
        """Test returns None when no release context."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test",
            release_context=None,
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_release_recency_score(mock_db, 1)

        assert score is None

    @pytest.mark.asyncio
    async def test_score_empty_releases(self, mock_db):
        """Test returns None when releases array is empty."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test",
            release_context={"releases": []},
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_release_recency_score(mock_db, 1)

        assert score is None

    @pytest.mark.asyncio
    async def test_score_invalid_date(self, mock_db):
        """Test returns None when date parsing fails."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test",
            release_context={
                "releases": [
                    {
                        "version": "1.0.0",
                        "date_created": "invalid-date",
                    }
                ]
            },
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_release_recency_score(mock_db, 1)

        assert score is None


class TestUpdateEnrichmentSignals:
    """Test suite for updating enrichment signals."""

    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        db = AsyncMock(spec=AsyncSession)
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        return db

    @pytest.mark.asyncio
    async def test_updates_signals(self, mock_db):
        """Test signals are updated correctly."""
        now = datetime.now(timezone.utc)
        recent_release = now - timedelta(hours=50)

        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test",
            release_context={
                "releases": [
                    {
                        "version": "1.0.0",
                        "date_created": recent_release.isoformat(),
                    }
                ]
            },
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        await update_enrichment_signals(mock_db, 1)

        # Verify database operations
        assert mock_db.execute.call_count == 2  # select + upsert
        assert mock_db.commit.called


class TestCompositeScore:
    """Test suite for composite score computation."""

    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        db = AsyncMock(spec=AsyncSession)
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        return db

    @pytest.mark.asyncio
    async def test_composite_with_all_signals(self, mock_db):
        """Test composite score with all signal types."""
        signals = EnrichmentSignal(
            issue_id=1,
            release_recency_score=0.8,
            ownership_match_score=0.9,
            alert_frequency_score=0.7,
            replay_impact_score=0.6,
            tag_overlap_score=0.5,
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = signals
        mock_db.execute.return_value = mock_result

        vector_similarity = 0.85
        composite = await compute_composite_score(mock_db, 1, vector_similarity)

        # Expected:
        # 0.85 * 0.4 + 0.8 * 0.15 + 0.9 * 0.15 + 0.7 * 0.1 + 0.6 * 0.1 + 0.5 * 0.1
        # = 0.34 + 0.12 + 0.135 + 0.07 + 0.06 + 0.05
        # = 0.775
        expected = 0.775
        assert composite == pytest.approx(expected, abs=0.01)

        # Verify database update
        assert mock_db.execute.call_count == 2  # select + update
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_composite_no_signals(self, mock_db):
        """Test composite score when no signals exist."""
        # Mock database to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        vector_similarity = 0.85
        composite = await compute_composite_score(mock_db, 1, vector_similarity)

        # Should only use vector similarity * 0.4
        expected = 0.85 * 0.4
        assert composite == expected

    @pytest.mark.asyncio
    async def test_composite_zero_vector_similarity(self, mock_db):
        """Test composite score with zero vector similarity."""
        signals = EnrichmentSignal(
            issue_id=1,
            release_recency_score=1.0,
            ownership_match_score=1.0,
            alert_frequency_score=0.0,
            replay_impact_score=0.0,
            tag_overlap_score=0.0,
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = signals
        mock_db.execute.return_value = mock_result

        composite = await compute_composite_score(mock_db, 1, 0.0)

        # Expected: 0.0 * 0.4 + 1.0 * 0.15 + 1.0 * 0.15 = 0.3
        expected = 0.3
        assert composite == expected
