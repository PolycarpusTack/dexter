"""
Integration tests for alert enrichment and signal computation.

Verifies that compute_alert_frequency_score works correctly with alert_context.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.enrichment.signal_computation import compute_alert_frequency_score
from app.db.models import SentryIssue


class TestAlertSignalIntegration:
    """Test integration between alert enrichment and signal computation."""

    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        db = AsyncMock(spec=AsyncSession)
        db.execute = AsyncMock()
        return db

    @pytest.mark.asyncio
    async def test_compute_alert_frequency_score_with_alert_context(self, mock_db):
        """Test that compute_alert_frequency_score works with alert_context."""
        now = datetime.now(timezone.utc)

        # Create issue with alert_context (as populated by AlertEnrichmentService)
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            alert_context={
                "recent_alert_count": 7,
                "alert_history": [
                    {
                        "incident_id": "inc-1",
                        "timestamp": (now - timedelta(hours=2)).isoformat(),
                        "severity": "critical",
                        "title": "Alert 1"
                    },
                    {
                        "incident_id": "inc-2",
                        "timestamp": (now - timedelta(hours=5)).isoformat(),
                        "severity": "warning",
                        "title": "Alert 2"
                    },
                    {
                        "incident_id": "inc-3",
                        "timestamp": (now - timedelta(hours=10)).isoformat(),
                        "severity": "medium",
                        "title": "Alert 3"
                    },
                    {
                        "incident_id": "inc-4",
                        "timestamp": (now - timedelta(hours=20)).isoformat(),
                        "severity": "warning",
                        "title": "Alert 4"
                    },
                    {
                        "incident_id": "inc-5",
                        "timestamp": (now - timedelta(hours=23)).isoformat(),
                        "severity": "critical",
                        "title": "Alert 5"
                    },
                    {
                        "incident_id": "inc-6",
                        "timestamp": (now - timedelta(hours=30)).isoformat(),
                        "severity": "low",
                        "title": "Old Alert (>24h)"
                    }
                ],
                "is_alert_storm": False,
                "correlated_incidents": [],
                "active_incident": None
            }
        )

        # Mock database to return the issue
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        # Compute score
        score = await compute_alert_frequency_score(
            mock_db,
            issue_id=1,
            window_hours=24.0,
            max_alerts=10
        )

        # Should count 5 alerts in last 24 hours (incidents 1-5)
        # Score = 5 / 10 = 0.5
        # But recent_alert_count is 7, so max(7, 5) = 7
        # Score = 7 / 10 = 0.7
        assert score == pytest.approx(0.7, abs=0.01)

    @pytest.mark.asyncio
    async def test_compute_alert_frequency_score_no_alert_context(self, mock_db):
        """Test score computation with no alert context."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            alert_context=None
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_alert_frequency_score(mock_db, issue_id=1)

        assert score is None

    @pytest.mark.asyncio
    async def test_compute_alert_frequency_score_with_storm(self, mock_db):
        """Test score computation during alert storm."""
        now = datetime.now(timezone.utc)

        # Create issue with alert storm
        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="DatabaseError",
            error_message="Connection timeout",
            alert_context={
                "recent_alert_count": 15,
                "alert_history": [
                    {
                        "incident_id": f"inc-{i}",
                        "timestamp": (now - timedelta(minutes=i * 10)).isoformat(),
                        "severity": "critical",
                        "title": f"Alert {i}"
                    }
                    for i in range(15)
                ],
                "is_alert_storm": True,
                "alert_storm_details": {
                    "alert_count": 15,
                    "start_time": (now - timedelta(hours=2)).isoformat(),
                    "duration_minutes": 120
                }
            }
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        # Compute score
        score = await compute_alert_frequency_score(
            mock_db,
            issue_id=1,
            window_hours=24.0,
            max_alerts=10
        )

        # 15 alerts / 10 max = 1.5, capped at 1.0
        assert score == pytest.approx(1.0, abs=0.01)

    @pytest.mark.asyncio
    async def test_compute_alert_frequency_score_recent_only(self, mock_db):
        """Test score only counts recent alerts."""
        now = datetime.now(timezone.utc)

        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            alert_context={
                "recent_alert_count": 3,
                "alert_history": [
                    {
                        "incident_id": "inc-1",
                        "timestamp": (now - timedelta(hours=1)).isoformat(),
                        "severity": "critical",
                        "title": "Recent Alert 1"
                    },
                    {
                        "incident_id": "inc-2",
                        "timestamp": (now - timedelta(hours=2)).isoformat(),
                        "severity": "warning",
                        "title": "Recent Alert 2"
                    },
                    {
                        "incident_id": "inc-3",
                        "timestamp": (now - timedelta(hours=3)).isoformat(),
                        "severity": "medium",
                        "title": "Recent Alert 3"
                    },
                    {
                        "incident_id": "inc-old-1",
                        "timestamp": (now - timedelta(hours=30)).isoformat(),
                        "severity": "low",
                        "title": "Old Alert 1"
                    },
                    {
                        "incident_id": "inc-old-2",
                        "timestamp": (now - timedelta(hours=48)).isoformat(),
                        "severity": "low",
                        "title": "Old Alert 2"
                    }
                ]
            }
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        score = await compute_alert_frequency_score(
            mock_db,
            issue_id=1,
            window_hours=24.0,
            max_alerts=10
        )

        # Only 3 alerts in last 24 hours
        # max(recent_alert_count=3, counted=3) = 3
        # Score = 3 / 10 = 0.3
        assert score == pytest.approx(0.3, abs=0.01)

    @pytest.mark.asyncio
    async def test_compute_alert_frequency_score_custom_window(self, mock_db):
        """Test score with custom time window."""
        now = datetime.now(timezone.utc)

        issue = SentryIssue(
            id=1,
            sentry_issue_id="12345",
            sentry_event_id="event-123",
            error_type="ValueError",
            error_message="Test error",
            alert_context={
                "recent_alert_count": 5,
                "alert_history": [
                    {
                        "incident_id": "inc-1",
                        "timestamp": (now - timedelta(hours=0.5)).isoformat(),
                        "severity": "critical"
                    },
                    {
                        "incident_id": "inc-2",
                        "timestamp": (now - timedelta(hours=1.5)).isoformat(),
                        "severity": "warning"
                    },
                    {
                        "incident_id": "inc-3",
                        "timestamp": (now - timedelta(hours=2.5)).isoformat(),
                        "severity": "medium"
                    },
                    {
                        "incident_id": "inc-4",
                        "timestamp": (now - timedelta(hours=5)).isoformat(),
                        "severity": "low"
                    }
                ]
            }
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        # Use 3-hour window instead of 24
        score = await compute_alert_frequency_score(
            mock_db,
            issue_id=1,
            window_hours=3.0,
            max_alerts=5
        )

        # Only 3 alerts in last 3 hours (inc-1, inc-2, inc-3)
        # max(recent_alert_count=5, counted=3) = 5
        # Score = 5 / 5 = 1.0
        assert score == pytest.approx(1.0, abs=0.01)
