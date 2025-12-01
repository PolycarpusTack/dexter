"""
Unit tests for signal computation.

Tests coverage:
- Ownership match scoring
- Release recency scoring
- Alert frequency scoring
- Replay impact scoring
- Tag overlap scoring
- Composite score calculation
- Signal persistence
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.enrichment.signal_computation import (
    compute_ownership_match_score,
    compute_release_recency_score,
    compute_alert_frequency_score,
    compute_replay_impact_score,
    compute_tag_overlap_score,
    compute_composite_score,
    update_enrichment_signals,
)
from app.db.models import SentryIssue, EnrichmentSignal


@pytest.fixture
def mock_db():
    """Mock database session."""
    db = AsyncMock(spec=AsyncSession)
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.flush = AsyncMock()
    db.add = MagicMock()
    return db


class TestOwnershipMatchScore:
    """Tests for ownership match scoring."""

    @pytest.mark.asyncio
    async def test_primary_team_match(self, mock_db):
        """Test perfect match with primary team."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            ownership={
                "teams": ["team-backend", "team-frontend"],
                "primary_team": "team-backend",
                "suggested_owners": [],
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_ownership_match_score(
            mock_db, 1, user_teams={"team-backend", "team-infrastructure"}
        )

        assert score == 1.0

    @pytest.mark.asyncio
    async def test_team_match_not_primary(self, mock_db):
        """Test match with non-primary team."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            ownership={
                "teams": ["team-backend", "team-frontend"],
                "primary_team": "team-backend",
                "suggested_owners": [],
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_ownership_match_score(
            mock_db, 1, user_teams={"team-frontend"}
        )

        assert score == 0.7

    @pytest.mark.asyncio
    async def test_suggested_owner_match(self, mock_db):
        """Test match through suggested owners only."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            ownership={
                "teams": [],
                "primary_team": None,
                "suggested_owners": [
                    {"type": "team", "owner": "team-platform", "confidence": 0.8}
                ],
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_ownership_match_score(
            mock_db, 1, user_teams={"team-platform"}
        )

        assert score == 0.5

    @pytest.mark.asyncio
    async def test_no_team_match(self, mock_db):
        """Test when no teams match."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            ownership={
                "teams": ["team-backend"],
                "primary_team": "team-backend",
                "suggested_owners": [],
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_ownership_match_score(
            mock_db, 1, user_teams={"team-frontend"}
        )

        assert score == 0.0

    @pytest.mark.asyncio
    async def test_no_user_teams(self, mock_db):
        """Test when no user teams provided."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            ownership={"teams": ["team-backend"], "primary_team": "team-backend"},
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_ownership_match_score(mock_db, 1, user_teams=None)

        assert score == 0.0

    @pytest.mark.asyncio
    async def test_no_ownership_data(self, mock_db):
        """Test when issue has no ownership data."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            ownership=None,
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_ownership_match_score(
            mock_db, 1, user_teams={"team-backend"}
        )

        assert score is None


class TestReleaseRecencyScore:
    """Tests for release recency scoring."""

    @pytest.mark.asyncio
    async def test_recent_deployment(self, mock_db):
        """Test score for very recent deployment."""
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)

        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            release_context={
                "latest_deploy_time": one_hour_ago.isoformat() + "Z",
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_release_recency_score(mock_db, 1)

        assert score is not None
        assert score > 0.8  # Should be high for recent deployment

    @pytest.mark.asyncio
    async def test_old_deployment(self, mock_db):
        """Test score for old deployment."""
        two_weeks_ago = datetime.utcnow() - timedelta(days=14)

        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            release_context={
                "latest_deploy_time": two_weeks_ago.isoformat() + "Z",
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_release_recency_score(mock_db, 1, max_hours=168)

        assert score == 0.0  # Beyond max_hours

    @pytest.mark.asyncio
    async def test_no_release_data(self, mock_db):
        """Test when no release data available."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            release_context=None,
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_release_recency_score(mock_db, 1)

        assert score is None


class TestAlertFrequencyScore:
    """Tests for alert frequency scoring."""

    @pytest.mark.asyncio
    async def test_high_alert_frequency(self, mock_db):
        """Test score for high alert frequency."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            alert_context={
                "recent_alert_count": 15,
                "alert_history": [],
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_alert_frequency_score(mock_db, 1, max_alerts=10)

        assert score == 1.0  # Capped at 1.0

    @pytest.mark.asyncio
    async def test_medium_alert_frequency(self, mock_db):
        """Test score for medium alert frequency."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            alert_context={
                "recent_alert_count": 5,
                "alert_history": [],
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_alert_frequency_score(mock_db, 1, max_alerts=10)

        assert score == 0.5

    @pytest.mark.asyncio
    async def test_no_alerts(self, mock_db):
        """Test score when no alerts."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            alert_context=None,
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_alert_frequency_score(mock_db, 1)

        assert score is None


class TestReplayImpactScore:
    """Tests for replay impact scoring."""

    @pytest.mark.asyncio
    async def test_high_crash_rate(self, mock_db):
        """Test score for high crash rate."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            session_data={
                "crash_free_rate": 0.0,  # 100% crash rate
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_replay_impact_score(mock_db, 1)

        assert score == 1.0

    @pytest.mark.asyncio
    async def test_medium_crash_rate(self, mock_db):
        """Test score for medium crash rate."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            session_data={
                "crash_free_rate": 50.0,  # 50% crash free = 50% impact
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_replay_impact_score(mock_db, 1)

        assert score == 0.5

    @pytest.mark.asyncio
    async def test_impact_percentage_fallback(self, mock_db):
        """Test using impact_percentage when crash_free_rate unavailable."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            session_data={
                "impact_percentage": 75.0,
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_replay_impact_score(mock_db, 1)

        assert score == 0.75


class TestTagOverlapScore:
    """Tests for tag overlap scoring."""

    @pytest.mark.asyncio
    async def test_full_tag_match(self, mock_db):
        """Test score when all tags match."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            tag_distributions={
                "top_values": {
                    "environment": [{"value": "production"}],
                    "browser": [{"value": "chrome"}],
                }
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        query_tags = {"environment": "production", "browser": "chrome"}

        score = await compute_tag_overlap_score(mock_db, 1, query_tags)

        assert score == 1.0

    @pytest.mark.asyncio
    async def test_partial_tag_match(self, mock_db):
        """Test score when some tags match."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            tag_distributions={
                "top_values": {
                    "environment": [{"value": "production"}],
                    "browser": [{"value": "firefox"}],
                }
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        query_tags = {"environment": "production", "browser": "chrome"}

        score = await compute_tag_overlap_score(mock_db, 1, query_tags)

        assert score == 0.5

    @pytest.mark.asyncio
    async def test_no_tag_match(self, mock_db):
        """Test score when no tags match."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            tag_distributions={
                "top_values": {
                    "environment": [{"value": "staging"}],
                }
            },
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        query_tags = {"environment": "production"}

        score = await compute_tag_overlap_score(mock_db, 1, query_tags)

        assert score == 0.0


class TestCompositeScore:
    """Tests for composite score calculation."""

    @pytest.mark.asyncio
    async def test_composite_score_calculation(self, mock_db):
        """Test weighted composite score."""
        # Mock all signal computations
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
            ownership={"teams": ["team-backend"], "primary_team": "team-backend"},
            release_context={"latest_deploy_time": datetime.utcnow().isoformat() + "Z"},
            alert_context={"recent_alert_count": 5},
            session_data={"crash_free_rate": 50.0},
            tag_distributions={"top_values": {"environment": [{"value": "production"}]}},
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_composite_score(
            mock_db,
            1,
            vector_similarity=0.8,
            user_teams={"team-backend"},
            query_tags={"environment": "production"},
        )

        assert 0.0 <= score <= 1.0
        # With all positive signals, score should be high
        assert score > 0.5

    @pytest.mark.asyncio
    async def test_custom_weights(self, mock_db):
        """Test composite score with custom weights."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        custom_weights = {
            "vector_similarity": 1.0,  # Only use vector similarity
            "release_recency": 0.0,
            "ownership_match": 0.0,
            "alert_frequency": 0.0,
            "replay_impact": 0.0,
            "tag_overlap": 0.0,
        }

        score = await compute_composite_score(
            mock_db, 1, vector_similarity=0.75, weights=custom_weights
        )

        assert score == 0.75


class TestUpdateEnrichmentSignals:
    """Tests for updating enrichment signals."""

    @pytest.mark.asyncio
    async def test_create_new_signals(self, mock_db):
        """Test creating new enrichment signals record."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
        )

        # Mock no existing signals
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.side_effect = [issue, None]
        mock_db.execute.return_value = mock_result

        await update_enrichment_signals(mock_db, 1)

        # Should add new signal record
        mock_db.add.assert_called_once()
        mock_db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_existing_signals(self, mock_db):
        """Test updating existing enrichment signals record."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-1",
            sentry_event_id="EVENT-1",
            error_type="Test",
            error_message="Test",
        )

        existing_signal = EnrichmentSignal(
            id=1,
            issue_id=1,
            ownership_match_score=0.5,
            composite_score=0.6,
        )

        # Mock existing signals
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.side_effect = [issue, existing_signal]
        mock_db.execute.return_value = mock_result

        await update_enrichment_signals(mock_db, 1)

        # Should update, not add
        mock_db.add.assert_not_called()
        mock_db.flush.assert_called_once()
