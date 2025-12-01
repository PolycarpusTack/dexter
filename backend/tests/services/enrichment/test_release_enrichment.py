"""
Unit tests for ReleaseEnrichmentService.

Tests release and commit enrichment functionality.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.enrichment.release_enrichment import (
    ReleaseEnrichmentService,
    get_release_enrichment_service,
)
from app.services.sentry.releases import SentryRelease, SuspectCommit
from app.db.models import SentryIssue


class TestReleaseEnrichmentService:
    """Test suite for ReleaseEnrichmentService."""

    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        db = AsyncMock(spec=AsyncSession)
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        return db

    @pytest.fixture
    def mock_sentry_client(self):
        """Mock Sentry release client."""
        client = MagicMock()
        client.get_releases = AsyncMock()
        client.get_suspect_commits = AsyncMock()
        return client

    @pytest.fixture
    def mock_settings(self):
        """Mock settings."""
        settings = MagicMock()
        settings.ENABLE_RELEASES = True
        settings.SENTRY_ORGANIZATION_SLUG = "test-org"
        settings.SENTRY_PROJECT_SLUG = "test-project"
        settings.SENTRY_ORG = None
        settings.ORGANIZATION_SLUG = None
        settings.PROJECT_SLUG = None
        return settings

    @pytest.fixture
    def service(self, mock_db, mock_sentry_client):
        """Create service instance."""
        with patch("app.services.enrichment.release_enrichment.get_settings") as mock_get_settings:
            settings = MagicMock()
            settings.ENABLE_RELEASES = True
            settings.SENTRY_ORGANIZATION_SLUG = "test-org"
            settings.SENTRY_PROJECT_SLUG = "test-project"
            settings.SENTRY_ORG = None
            settings.ORGANIZATION_SLUG = None
            settings.PROJECT_SLUG = None
            mock_get_settings.return_value = settings

            service = ReleaseEnrichmentService(mock_db, mock_sentry_client)
            return service

    @pytest.mark.asyncio
    async def test_enrich_issue_feature_disabled(self, service):
        """Test enrichment skips when feature is disabled."""
        service.settings.ENABLE_RELEASES = False

        result = await service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "feature disabled"

    @pytest.mark.asyncio
    async def test_enrich_issue_not_found(self, service, mock_db):
        """Test enrichment fails when issue not found."""
        # Mock database to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await service.enrich_issue(999)

        assert result["status"] == "error"
        assert result["reason"] == "issue not found"

    @pytest.mark.asyncio
    async def test_enrich_issue_success(self, service, mock_db, mock_sentry_client):
        """Test successful issue enrichment."""
        # Create mock issue
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            context_tags={"organization": "test-org", "project": "test-project"},
            enrichment_status={},
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        # Mock Sentry responses
        release = SentryRelease(
            version="1.0.0",
            dateCreated=datetime.utcnow(),
            crash_free_users=95.5,
            crash_free_sessions=98.0,
            total_sessions=1000,
        )
        mock_sentry_client.get_releases.return_value = [release]

        commit = SuspectCommit(
            id="abc123",
            repository={"name": "test-repo"},
            author={"name": "John Doe", "email": "john@example.com"},
            message="Fix bug",
            dateCreated=datetime.utcnow(),
            score=0.8,
        )
        mock_sentry_client.get_suspect_commits.return_value = [commit]

        # Run enrichment
        result = await service.enrich_issue(1)

        # Verify result
        assert result["status"] == "success"
        assert result["releases_count"] == 1
        assert result["suspects_count"] == 1

        # Verify database update was called
        assert mock_db.execute.call_count == 2  # select + update
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_enrich_issue_missing_org_project(self, service, mock_db):
        """Test enrichment skips when org/project missing."""
        # Create mock issue without org/project
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            context_tags={},
            enrichment_status={},
        )

        # Override settings to have no defaults
        service.settings.SENTRY_ORGANIZATION_SLUG = None
        service.settings.SENTRY_PROJECT_SLUG = None
        service.settings.SENTRY_ORG = None
        service.settings.ORGANIZATION_SLUG = None
        service.settings.PROJECT_SLUG = None

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        result = await service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "missing org/project"

    @pytest.mark.asyncio
    async def test_enrich_issue_sentry_error(self, service, mock_db, mock_sentry_client):
        """Test enrichment handles Sentry API errors gracefully."""
        # Create mock issue
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            context_tags={"organization": "test-org", "project": "test-project"},
            enrichment_status={},
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        # Mock Sentry to raise error on releases but succeed on commits
        mock_sentry_client.get_releases.side_effect = Exception("API Error")
        mock_sentry_client.get_suspect_commits.return_value = []

        result = await service.enrich_issue(1)

        # Service should handle error gracefully and continue with empty releases
        assert result["status"] == "success"
        assert result["releases_count"] == 0

    def test_compute_health_score_both_metrics(self, service):
        """Test health score computation with both metrics."""
        release = SentryRelease(
            version="1.0.0",
            dateCreated=datetime.utcnow(),
            crash_free_users=95.0,
            crash_free_sessions=98.0,
        )

        score = service._compute_health_score(release)

        # Expected: (95 * 0.6 + 98 * 0.4) / 100 = (57 + 39.2) / 100 = 0.962
        assert score == pytest.approx(0.962, abs=0.01)

    def test_compute_health_score_missing_metrics(self, service):
        """Test health score defaults to 0.5 when metrics missing."""
        release = SentryRelease(
            version="1.0.0",
            dateCreated=datetime.utcnow(),
        )

        score = service._compute_health_score(release)

        assert score == 0.5

    def test_build_release_context(self, service):
        """Test building release context structure."""
        releases = [
            SentryRelease(
                version="1.0.0",
                dateCreated=datetime(2024, 1, 1, 12, 0, 0),
                crash_free_users=95.0,
                crash_free_sessions=98.0,
                total_sessions=1000,
            ),
            SentryRelease(
                version="0.9.0",
                dateCreated=datetime(2024, 1, 1, 10, 0, 0),
                crash_free_users=90.0,
                crash_free_sessions=92.0,
                total_sessions=800,
            ),
        ]

        commits = [
            SuspectCommit(
                id="abc123",
                repository={"name": "test-repo"},
                author={"name": "John Doe"},
                message="Fix critical bug",
                dateCreated=datetime(2024, 1, 1, 11, 0, 0),
                score=0.8,
            ),
            SuspectCommit(
                id="def456",
                repository={"name": "test-repo"},
                author={"name": "Jane Smith"},
                message="Low confidence commit",
                dateCreated=datetime(2024, 1, 1, 9, 0, 0),
                score=0.3,  # Below threshold
            ),
        ]

        context = service._build_release_context(releases, commits)

        assert len(context["releases"]) == 2
        assert context["releases"][0]["version"] == "1.0.0"
        assert context["releases"][0]["health_score"] == pytest.approx(0.962, abs=0.01)

        # Only high-confidence commits should be included
        assert len(context["suspect_commits"]) == 1
        assert context["suspect_commits"][0]["id"] == "abc123"
        assert context["suspect_commits"][0]["confidence_score"] == 0.8

    def test_update_enrichment_status(self, service):
        """Test enrichment status update."""
        current_status = {
            "other_source": {
                "status": "completed",
                "last_attempt": "2024-01-01T00:00:00",
            }
        }

        updated = service._update_enrichment_status(
            current_status,
            "releases",
            "completed",
        )

        assert "releases" in updated
        assert updated["releases"]["status"] == "completed"
        assert "last_attempt" in updated["releases"]
        assert updated["releases"]["error"] is None

        # Original source should still be there
        assert "other_source" in updated

    def test_update_enrichment_status_with_error(self, service):
        """Test enrichment status update with error."""
        updated = service._update_enrichment_status(
            {},
            "releases",
            "failed",
            error="API timeout",
        )

        assert updated["releases"]["status"] == "failed"
        assert updated["releases"]["error"] == "API timeout"


class TestGetReleaseEnrichmentService:
    """Test factory function."""

    @pytest.mark.asyncio
    async def test_factory_creates_service(self):
        """Test factory function creates service instance."""
        mock_db = AsyncMock(spec=AsyncSession)

        with patch("app.services.enrichment.release_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.get_sentry_token.return_value = "test-token"

            service = await get_release_enrichment_service(mock_db)

            assert isinstance(service, ReleaseEnrichmentService)
            assert service.db == mock_db
