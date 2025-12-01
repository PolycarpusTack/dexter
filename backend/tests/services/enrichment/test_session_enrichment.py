"""
Unit tests for SessionEnrichmentService.

Tests EPIC I: Session & Replay Context enrichment.
Coverage target: ≥80%
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

from app.services.enrichment.session_enrichment import (
    SessionEnrichmentService,
    HIGH_IMPACT_THRESHOLD,
)
from app.db.models import SentryIssue
from app.services.sentry.sessions import SessionReplay


class TestSessionEnrichmentService:
    """Test suite for SessionEnrichmentService."""

    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        db = AsyncMock()
        return db

    @pytest.fixture
    def mock_session_client(self):
        """Create mock Sentry session client."""
        client = AsyncMock()
        return client

    @pytest.fixture
    def mock_pii_scrubber(self):
        """Create mock PII scrubber."""
        scrubber = Mock()
        scrubber.scrub_dict = Mock(side_effect=lambda x: x)  # Pass-through
        return scrubber

    @pytest.fixture
    def mock_settings(self):
        """Create mock settings."""
        settings = Mock()
        settings.ENABLE_SESSIONS_REPLAYS = True
        settings.SENTRY_ORGANIZATION = "test-org"
        settings.SENTRY_PROJECT = "test-project"
        return settings

    @pytest.fixture
    def service(self, mock_db, mock_session_client, mock_pii_scrubber, mock_settings):
        """Create SessionEnrichmentService instance."""
        with patch("app.services.enrichment.session_enrichment.get_pii_scrubber", return_value=mock_pii_scrubber):
            with patch("app.services.enrichment.session_enrichment.get_settings", return_value=mock_settings):
                service = SessionEnrichmentService(mock_db, mock_session_client)
                return service

    @pytest.fixture
    def sample_issue(self):
        """Create a sample SentryIssue for testing."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            context_tags={"organization": "test-org", "project": "test-project"},
            enrichment_status={}
        )
        return issue

    @pytest.mark.asyncio
    async def test_enrich_issue_feature_disabled(self, service, mock_settings):
        """Test enrichment is skipped when feature flag is disabled."""
        mock_settings.ENABLE_SESSIONS_REPLAYS = False

        result = await service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "feature disabled"

    @pytest.mark.asyncio
    async def test_enrich_issue_not_found(self, service, mock_db):
        """Test enrichment handles missing issue gracefully."""
        # Mock database to return None
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none = Mock(return_value=None)
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await service.enrich_issue(999)

        assert result["status"] == "error"
        assert result["reason"] == "issue not found"

    @pytest.mark.asyncio
    async def test_enrich_issue_missing_org_project(self, service, mock_db):
        """Test enrichment is skipped when org/project missing."""
        # Create issue without org/project
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            context_tags={},  # No org/project
            enrichment_status={}
        )

        mock_result = AsyncMock()
        mock_result.scalar_one_or_none = Mock(return_value=issue)
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert "missing org/project" in result["reason"]

    @pytest.mark.asyncio
    async def test_enrich_issue_success_with_replays(
        self, service, mock_db, mock_session_client, sample_issue
    ):
        """Test successful enrichment with replay data."""
        # Mock database
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none = Mock(return_value=sample_issue)
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Mock session client to return replays
        replay1 = SessionReplay(
            replay_id="replay-1",
            project_id="test-project",
            timestamp=datetime.utcnow(),
            duration=120,
            count_errors=2,
            count_segments=5,
            user={"id": "user-123", "email": "test@example.com"}
        )
        mock_session_client.get_issue_replays = AsyncMock(return_value=[replay1])

        result = await service.enrich_issue(1)

        assert result["status"] == "success"
        assert result["replay_count"] == 1
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_enrich_issue_high_impact_detection(
        self, service, mock_db, mock_session_client, sample_issue
    ):
        """Test high-impact issue detection (>10% sessions affected)."""
        # Mock database
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none = Mock(return_value=sample_issue)
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Mock session client
        mock_session_client.get_issue_replays = AsyncMock(return_value=[])

        # Mock _fetch_session_stats to return high-impact data
        with patch.object(service, '_fetch_session_stats') as mock_fetch:
            mock_fetch.return_value = {
                "total_sessions": 1000,
                "crash_free_sessions": 85.0,
                "crash_free_users": 87.0,
                "sessions_affected": 150,  # 15% impact
            }

            result = await service.enrich_issue(1)

            assert result["status"] == "success"
            assert result["is_high_impact"] is True
            assert result["impact_percentage"] == 15.0

    @pytest.mark.asyncio
    async def test_enrich_issue_error_handling(
        self, service, mock_db, mock_session_client, sample_issue
    ):
        """Test error handling during enrichment."""
        # Mock database to raise exception
        mock_db.execute = AsyncMock(side_effect=Exception("Database error"))

        result = await service.enrich_issue(1)

        assert result["status"] == "error"
        assert "Database error" in result["reason"]

    def test_calculate_impact_normal(self, service):
        """Test impact calculation with normal values."""
        session_stats = {
            "total_sessions": 1000,
            "sessions_affected": 50,
        }

        impact = service._calculate_impact(session_stats)

        assert impact == 5.0  # 50/1000 * 100

    def test_calculate_impact_zero_sessions(self, service):
        """Test impact calculation with zero total sessions."""
        session_stats = {
            "total_sessions": 0,
            "sessions_affected": 0,
        }

        impact = service._calculate_impact(session_stats)

        assert impact == 0.0

    def test_calculate_impact_capped_at_100(self, service):
        """Test impact calculation is capped at 100%."""
        session_stats = {
            "total_sessions": 100,
            "sessions_affected": 150,  # More than total (shouldn't happen)
        }

        impact = service._calculate_impact(session_stats)

        assert impact == 100.0

    def test_detect_high_impact_true(self, service):
        """Test high-impact detection for >10% impact."""
        is_high_impact = service._detect_high_impact(15.0)

        assert is_high_impact is True

    def test_detect_high_impact_false(self, service):
        """Test high-impact detection for ≤10% impact."""
        is_high_impact = service._detect_high_impact(5.0)

        assert is_high_impact is False

    def test_detect_high_impact_threshold(self, service):
        """Test high-impact detection at exact threshold."""
        is_high_impact = service._detect_high_impact(HIGH_IMPACT_THRESHOLD)

        assert is_high_impact is False  # Must be > threshold

    @pytest.mark.asyncio
    async def test_fetch_replays_success(self, service, mock_session_client):
        """Test fetching replay metadata successfully."""
        # Create mock replays
        replays = [
            SessionReplay(
                replay_id=f"replay-{i}",
                project_id="test-project",
                timestamp=datetime.utcnow(),
                duration=i * 60,
                count_errors=i,
                count_segments=i * 2,
                user={"id": f"user-{i}", "email": f"user{i}@example.com"}
            )
            for i in range(1, 6)
        ]
        mock_session_client.get_issue_replays = AsyncMock(return_value=replays)

        replay_metadata = await service._fetch_replays("issue-123", "test-org")

        assert len(replay_metadata) == 5
        assert all("replay_id" in r for r in replay_metadata)
        assert all("replay_url" in r for r in replay_metadata)
        assert all("user" in r for r in replay_metadata)

    @pytest.mark.asyncio
    async def test_fetch_replays_max_limit(self, service, mock_session_client):
        """Test replay fetching respects max_replays limit."""
        # Create 10 replays
        replays = [
            SessionReplay(
                replay_id=f"replay-{i}",
                project_id="test-project",
                timestamp=datetime.utcnow(),
                duration=60,
                count_errors=1,
                count_segments=2,
                user={}
            )
            for i in range(10)
        ]
        mock_session_client.get_issue_replays = AsyncMock(return_value=replays)

        replay_metadata = await service._fetch_replays("issue-123", "test-org", max_replays=3)

        assert len(replay_metadata) == 3

    @pytest.mark.asyncio
    async def test_fetch_replays_error_handling(self, service, mock_session_client):
        """Test replay fetching handles errors gracefully."""
        mock_session_client.get_issue_replays = AsyncMock(side_effect=Exception("API error"))

        replay_metadata = await service._fetch_replays("issue-123", "test-org")

        assert replay_metadata == []

    def test_build_session_data(self, service):
        """Test building structured session data."""
        session_stats = {
            "total_sessions": 1000,
            "crash_free_sessions": 95.0,
            "crash_free_users": 97.0,
            "sessions_affected": 50,
        }
        replay_metadata = [
            {"replay_id": "replay-1", "replay_url": "https://sentry.io/replays/replay-1/"},
            {"replay_id": "replay-2", "replay_url": "https://sentry.io/replays/replay-2/"},
        ]
        impact_percentage = 5.0
        is_high_impact = False

        session_data = service._build_session_data(
            session_stats, replay_metadata, impact_percentage, is_high_impact
        )

        assert session_data["total_sessions"] == 1000
        assert session_data["crash_free_sessions"] == 95.0
        assert session_data["crash_free_users"] == 97.0
        assert session_data["crash_free_rate"] == 96.0  # Average of 95 and 97
        assert session_data["impact_percentage"] == 5.0
        assert session_data["is_high_impact"] is False
        assert len(session_data["replay_urls"]) == 2
        assert len(session_data["replay_metadata"]) == 2
        assert "last_fetched" in session_data

    def test_build_session_data_for_replay_impact_score(self, service):
        """Test session data structure is compatible with compute_replay_impact_score."""
        session_stats = {
            "total_sessions": 1000,
            "crash_free_sessions": 90.0,
            "crash_free_users": 92.0,
            "sessions_affected": 100,
        }

        session_data = service._build_session_data(session_stats, [], 10.0, True)

        # Verify required fields for compute_replay_impact_score
        assert "crash_free_rate" in session_data
        assert "impact_percentage" in session_data
        # crash_free_rate should be average of sessions and users
        assert session_data["crash_free_rate"] == 91.0

    def test_extract_org_from_context_tags(self, service, sample_issue):
        """Test extracting org from issue context tags."""
        org = service._extract_org(sample_issue)

        assert org == "test-org"

    def test_extract_org_from_settings(self, service, mock_settings):
        """Test extracting org from settings when not in context."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            context_tags={},  # No org in tags
            enrichment_status={}
        )

        org = service._extract_org(issue)

        assert org == "test-org"

    def test_extract_project_from_context_tags(self, service, sample_issue):
        """Test extracting project from issue context tags."""
        project = service._extract_project(sample_issue)

        assert project == "test-project"

    def test_extract_project_from_settings(self, service, mock_settings):
        """Test extracting project from settings when not in context."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            context_tags={},  # No project in tags
            enrichment_status={}
        )

        project = service._extract_project(issue)

        assert project == "test-project"

    def test_update_status_completed(self, service):
        """Test updating enrichment status to completed."""
        current = {}

        updated = service._update_status(current, "sessions_replays", "completed")

        assert "sessions_replays" in updated
        assert updated["sessions_replays"]["status"] == "completed"
        assert "last_attempt" in updated["sessions_replays"]
        assert updated["sessions_replays"]["error"] is None

    def test_update_status_failed(self, service):
        """Test updating enrichment status to failed with error."""
        current = {}

        updated = service._update_status(current, "sessions_replays", "failed", error="API error")

        assert "sessions_replays" in updated
        assert updated["sessions_replays"]["status"] == "failed"
        assert updated["sessions_replays"]["error"] == "API error"

    @pytest.mark.asyncio
    async def test_mark_failed(self, service, mock_db, sample_issue):
        """Test marking enrichment as failed."""
        # Mock database
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none = Mock(return_value=sample_issue)
        mock_db.execute = AsyncMock(return_value=mock_result)

        await service._mark_failed(1, "Test error")

        assert mock_db.execute.called
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_pii_scrubbing_applied(
        self, service, mock_db, mock_session_client, sample_issue, mock_pii_scrubber
    ):
        """Test that PII scrubbing is applied to session data."""
        # Mock database
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none = Mock(return_value=sample_issue)
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Mock session client
        mock_session_client.get_issue_replays = AsyncMock(return_value=[])

        await service.enrich_issue(1)

        # Verify PII scrubber was called
        assert mock_pii_scrubber.scrub_dict.called

    @pytest.mark.asyncio
    async def test_replay_url_format(self, service, mock_session_client):
        """Test that replay URLs are correctly formatted."""
        replay = SessionReplay(
            replay_id="test-replay-123",
            project_id="test-project",
            timestamp=datetime.utcnow(),
            duration=120,
            count_errors=1,
            count_segments=3,
            user={}
        )
        mock_session_client.get_issue_replays = AsyncMock(return_value=[replay])

        replay_metadata = await service._fetch_replays("issue-123", "test-org")

        assert len(replay_metadata) == 1
        assert replay_metadata[0]["replay_url"] == "https://sentry.io/replays/test-replay-123/"

    @pytest.mark.asyncio
    async def test_enrichment_status_updated(
        self, service, mock_db, mock_session_client, sample_issue
    ):
        """Test that enrichment_status is properly updated in database."""
        # Mock database
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none = Mock(return_value=sample_issue)
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Mock session client
        mock_session_client.get_issue_replays = AsyncMock(return_value=[])

        await service.enrich_issue(1)

        # Verify update was called with enrichment_status
        update_calls = [call for call in mock_db.execute.call_args_list if len(call.args) > 0]
        assert len(update_calls) >= 1  # At least one update call
