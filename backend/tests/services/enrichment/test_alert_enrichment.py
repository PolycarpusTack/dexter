"""
Unit tests for AlertEnrichmentService.

Tests alert history, incident correlation, and alert storm detection.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.enrichment.alert_enrichment import (
    AlertEnrichmentService,
    get_alert_enrichment_service,
)
from app.services.sentry.alerts import AlertRule, Incident
from app.db.models import SentryIssue


class TestAlertEnrichmentService:
    """Test suite for AlertEnrichmentService."""

    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        db = AsyncMock(spec=AsyncSession)
        db.execute = AsyncMock()
        db.commit = AsyncMock()
        return db

    @pytest.fixture
    def mock_sentry_client(self):
        """Mock Sentry alert client."""
        client = MagicMock()
        client.get_metric_alert_rules = AsyncMock()
        client.get_issue_alert_rules = AsyncMock()
        client.get_incidents = AsyncMock()
        return client

    @pytest.fixture
    def mock_settings(self):
        """Mock settings."""
        settings = MagicMock()
        settings.ENABLE_ALERTS = True
        settings.SENTRY_ORGANIZATION_SLUG = "test-org"
        settings.SENTRY_PROJECT_SLUG = "test-project"
        settings.SENTRY_ORG = None
        settings.ORGANIZATION_SLUG = None
        settings.PROJECT_SLUG = None
        return settings

    @pytest.fixture
    def service(self, mock_db, mock_sentry_client):
        """Create service instance."""
        with patch("app.services.enrichment.alert_enrichment.get_settings") as mock_get_settings:
            settings = MagicMock()
            settings.ENABLE_ALERTS = True
            settings.SENTRY_ORGANIZATION_SLUG = "test-org"
            settings.SENTRY_PROJECT_SLUG = "test-project"
            settings.SENTRY_ORG = None
            settings.ORGANIZATION_SLUG = None
            settings.PROJECT_SLUG = None
            mock_get_settings.return_value = settings

            service = AlertEnrichmentService(mock_db, mock_sentry_client)
            return service

    @pytest.mark.asyncio
    async def test_enrich_issue_feature_disabled(self, service):
        """Test enrichment skips when feature is disabled."""
        service.settings.ENABLE_ALERTS = False

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
    async def test_enrich_issue_missing_org(self, service, mock_db):
        """Test enrichment skips when organization is missing."""
        # Create mock issue without org
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            context_tags={},
            enrichment_status={},
        )

        # Override settings to have no org
        service.settings.SENTRY_ORGANIZATION_SLUG = None
        service.settings.SENTRY_ORG = None
        service.settings.ORGANIZATION_SLUG = None

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        result = await service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "missing organization"

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
        alert_rule = AlertRule(
            id="rule-1",
            name="High Error Rate",
            status="active",
            conditions=[],
            actions=[],
            dateCreated=datetime.now(timezone.utc),
        )
        mock_sentry_client.get_metric_alert_rules.return_value = [alert_rule]
        mock_sentry_client.get_issue_alert_rules.return_value = []

        incident = Incident(
            id="inc-1",
            identifier="123",
            organizationId="test-org",
            status="open",
            statusMethod="automatic",
            type="alert",
            title="High Error Rate Alert",
            dateStarted=datetime.now(timezone.utc) - timedelta(hours=1),
            dateDetected=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        mock_sentry_client.get_incidents.return_value = [incident]

        # Run enrichment
        result = await service.enrich_issue(1)

        # Verify result
        assert result["status"] == "success"
        assert result["alert_rules_count"] == 1
        assert result["incidents_count"] == 1

        # Verify database update was called
        assert mock_db.execute.call_count == 2  # select + update
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_enrich_issue_with_alert_storm(self, service, mock_db, mock_sentry_client):
        """Test enrichment detects alert storm."""
        # Create mock issue
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="DatabaseError",
            error_message="Connection timeout",
            context_tags={"organization": "test-org", "project": "test-project"},
            enrichment_status={},
        )

        # Mock database
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        # Mock Sentry with 5 incidents in last hour (alert storm)
        now = datetime.now(timezone.utc)
        incidents = []
        for i in range(5):
            incidents.append(
                Incident(
                    id=f"inc-{i}",
                    identifier=f"{i}",
                    organizationId="test-org",
                    status="critical",
                    statusMethod="automatic",
                    type="alert",
                    title="DatabaseError Connection timeout",
                    dateStarted=now - timedelta(minutes=50 - i * 10),
                    dateDetected=now - timedelta(minutes=50 - i * 10),
                )
            )

        mock_sentry_client.get_metric_alert_rules.return_value = []
        mock_sentry_client.get_issue_alert_rules.return_value = []
        mock_sentry_client.get_incidents.return_value = incidents

        # Run enrichment
        result = await service.enrich_issue(1)

        # Verify storm was detected
        assert result["status"] == "success"
        assert result["is_alert_storm"] is True
        assert result["incidents_count"] == 5

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

        # Mock Sentry to raise error
        mock_sentry_client.get_metric_alert_rules.side_effect = Exception("API Error")
        mock_sentry_client.get_incidents.return_value = []

        result = await service.enrich_issue(1)

        # Service should handle error gracefully
        assert result["status"] == "success"
        assert result["alert_rules_count"] == 0

    def test_detect_alert_storm_positive(self, service):
        """Test alert storm detection with positive case."""
        now = datetime.now(timezone.utc)

        # Create 5 alerts in 45 minutes
        alert_history = []
        for i in range(5):
            alert_history.append({
                "timestamp": (now - timedelta(minutes=45 - i * 10)).isoformat(),
                "severity": "critical",
                "title": "Test Alert"
            })

        is_storm, details = service._detect_alert_storm(alert_history)

        assert is_storm is True
        assert details is not None
        assert details["alert_count"] == 5
        assert details["duration_minutes"] <= 45

    def test_detect_alert_storm_negative(self, service):
        """Test alert storm detection with negative case."""
        now = datetime.now(timezone.utc)

        # Create only 2 alerts (below threshold)
        alert_history = [
            {
                "timestamp": (now - timedelta(minutes=30)).isoformat(),
                "severity": "warning",
                "title": "Test Alert 1"
            },
            {
                "timestamp": (now - timedelta(minutes=10)).isoformat(),
                "severity": "warning",
                "title": "Test Alert 2"
            }
        ]

        is_storm, details = service._detect_alert_storm(alert_history)

        assert is_storm is False
        assert details is None

    def test_detect_alert_storm_spread_out(self, service):
        """Test alert storm detection when alerts are spread out."""
        now = datetime.now(timezone.utc)

        # Create 5 alerts over 3 hours (not a storm)
        alert_history = []
        for i in range(5):
            alert_history.append({
                "timestamp": (now - timedelta(hours=3 - i * 0.6)).isoformat(),
                "severity": "warning",
                "title": "Test Alert"
            })

        is_storm, details = service._detect_alert_storm(alert_history)

        assert is_storm is False
        assert details is None

    def test_correlate_incidents_with_match(self, service):
        """Test incident correlation with matching incident."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="DatabaseError",
            error_message="Connection timeout to database",
            context_tags={},
            enrichment_status={},
        )

        # Incident that matches the error type
        incident = Incident(
            id="inc-1",
            identifier="INC-123",
            organizationId="test-org",
            status="critical",
            statusMethod="automatic",
            type="alert",
            title="DatabaseError Connection timeout",
            dateStarted=datetime.now(timezone.utc) - timedelta(hours=1),
            dateDetected=datetime.now(timezone.utc) - timedelta(hours=1),
        )

        correlated_ids, active = service._correlate_incidents(issue, [incident])

        assert len(correlated_ids) == 1
        assert "INC-123" in correlated_ids
        assert active is not None
        assert active["identifier"] == "INC-123"
        assert active["status"] == "critical"
        assert active["priority"] == "high"

    def test_correlate_incidents_no_match(self, service):
        """Test incident correlation with no matching incident."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Invalid input",
            context_tags={},
            enrichment_status={},
        )

        # Incident that doesn't match
        incident = Incident(
            id="inc-1",
            identifier="INC-123",
            organizationId="test-org",
            status="open",
            statusMethod="automatic",
            type="alert",
            title="Unrelated performance issue",
            dateStarted=datetime.now(timezone.utc) - timedelta(hours=1),
            dateDetected=datetime.now(timezone.utc) - timedelta(hours=1),
        )

        correlated_ids, active = service._correlate_incidents(issue, [incident])

        assert len(correlated_ids) == 0
        assert active is None

    def test_correlate_incidents_closed(self, service):
        """Test incident correlation with closed incident."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="DatabaseError",
            error_message="Connection timeout",
            context_tags={},
            enrichment_status={},
        )

        # Incident that matches but is closed
        incident = Incident(
            id="inc-1",
            identifier="INC-123",
            organizationId="test-org",
            status="closed",
            statusMethod="automatic",
            type="alert",
            title="DatabaseError Connection timeout",
            dateStarted=datetime.now(timezone.utc) - timedelta(hours=2),
            dateDetected=datetime.now(timezone.utc) - timedelta(hours=2),
            dateClosed=datetime.now(timezone.utc) - timedelta(hours=1),
        )

        correlated_ids, active = service._correlate_incidents(issue, [incident])

        # Should correlate but not be active
        assert len(correlated_ids) == 1
        assert active is None

    def test_compute_alert_frequency(self, service):
        """Test alert frequency computation."""
        now = datetime.now(timezone.utc)

        # Create 7 alerts in last 24 hours
        alert_history = []
        for i in range(7):
            alert_history.append({
                "timestamp": (now - timedelta(hours=i * 3)).isoformat(),
                "severity": "warning",
                "title": "Test Alert"
            })

        # Add 2 old alerts (>24 hours ago)
        alert_history.append({
            "timestamp": (now - timedelta(hours=30)).isoformat(),
            "severity": "warning",
            "title": "Old Alert"
        })

        count = service._compute_alert_frequency(alert_history, window_hours=24.0)

        assert count == 7

    def test_compute_alert_frequency_empty(self, service):
        """Test alert frequency with no alerts."""
        count = service._compute_alert_frequency([], window_hours=24.0)
        assert count == 0

    def test_map_incident_status_to_severity(self, service):
        """Test incident status to severity mapping."""
        assert service._map_incident_status_to_severity("critical") == "critical"
        assert service._map_incident_status_to_severity("warning") == "warning"
        assert service._map_incident_status_to_severity("open") == "medium"
        assert service._map_incident_status_to_severity("closed") == "low"
        assert service._map_incident_status_to_severity("unknown") == "medium"

    def test_map_status_to_priority(self, service):
        """Test incident status to priority mapping."""
        assert service._map_status_to_priority("critical") == "high"
        assert service._map_status_to_priority("warning") == "medium"
        assert service._map_status_to_priority("open") == "medium"
        assert service._map_status_to_priority("closed") == "low"

    def test_build_alert_context(self, service):
        """Test building alert context structure."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            context_tags={},
            enrichment_status={},
        )

        alert_rule = AlertRule(
            id="rule-1",
            name="Error Rate Alert",
            status="active",
            conditions=[],
            actions=[],
            dateCreated=datetime.now(timezone.utc),
        )

        now = datetime.now(timezone.utc)
        incident = Incident(
            id="inc-1",
            identifier="INC-123",
            organizationId="test-org",
            status="open",
            statusMethod="automatic",
            type="alert",
            title="ValueError Test error",
            dateStarted=now - timedelta(hours=1),
            dateDetected=now - timedelta(hours=1),
        )

        context = service._build_alert_context(issue, [alert_rule], [incident])

        assert "alert_history" in context
        assert "recent_alert_count" in context
        assert "is_alert_storm" in context
        assert "correlated_incidents" in context
        assert "active_incident" in context
        assert "alert_rules" in context
        assert "last_fetched" in context

        assert len(context["alert_rules"]) == 1
        assert context["alert_rules"][0]["id"] == "rule-1"
        assert context["alert_rules"][0]["name"] == "Error Rate Alert"

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
            "alerts",
            "completed",
        )

        assert "alerts" in updated
        assert updated["alerts"]["status"] == "completed"
        assert "last_attempt" in updated["alerts"]
        assert updated["alerts"]["error"] is None

        # Original source should still be there
        assert "other_source" in updated

    def test_update_enrichment_status_with_error(self, service):
        """Test enrichment status update with error."""
        updated = service._update_enrichment_status(
            {},
            "alerts",
            "failed",
            error="API timeout",
        )

        assert updated["alerts"]["status"] == "failed"
        assert updated["alerts"]["error"] == "API timeout"


class TestGetAlertEnrichmentService:
    """Test factory function."""

    @pytest.mark.asyncio
    async def test_factory_creates_service(self):
        """Test factory function creates service instance."""
        mock_db = AsyncMock(spec=AsyncSession)

        with patch("app.services.enrichment.alert_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.get_sentry_token.return_value = "test-token"

            service = await get_alert_enrichment_service(mock_db)

            assert isinstance(service, AlertEnrichmentService)
            assert service.db == mock_db
