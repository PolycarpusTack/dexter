"""
Unit tests for Profiling Enrichment Service.

Tests EPIC H - Profiling Hotspots enrichment.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.enrichment.profiling_enrichment import (
    ProfilingEnrichmentService,
    HOTSPOT_TIME_PERCENTAGE,
    HOTSPOT_MIN_TIME_MS,
    TOP_FUNCTIONS_COUNT,
)
from app.services.sentry.profiling import Profile, ProfileFrame
from app.db.models import SentryIssue


@pytest.fixture
def mock_db():
    """Mock database session."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db


@pytest.fixture
def mock_sentry_client():
    """Mock Sentry profiling client."""
    client = MagicMock()
    client.get_profiles_for_issue = AsyncMock()
    client.get_profile_functions = AsyncMock()
    client.extract_hotspots = MagicMock()
    client.build_flamegraph_data = MagicMock()
    return client


@pytest.fixture
def mock_settings():
    """Mock application settings."""
    settings = MagicMock()
    settings.ENABLE_PROFILING = True
    settings.SENTRY_ORGANIZATION_SLUG = "test-org"
    settings.SENTRY_PROJECT_SLUG = "test-project"
    return settings


@pytest.fixture
def profiling_service(mock_db, mock_sentry_client, mock_settings):
    """Create profiling enrichment service with mocks."""
    with patch("app.services.enrichment.profiling_enrichment.get_settings", return_value=mock_settings):
        service = ProfilingEnrichmentService(mock_db, mock_sentry_client)
        return service


@pytest.fixture
def sample_profiles():
    """Sample profiling profiles for testing."""
    return [
        Profile(
            profile_id="prof1",
            transaction_name="GET /api/users",
            trace_id="trace1",
            timestamp=datetime.utcnow(),
            platform="python",
            duration_ns=500_000_000  # 500ms
        ),
        Profile(
            profile_id="prof2",
            transaction_name="GET /api/users",
            trace_id="trace2",
            timestamp=datetime.utcnow(),
            platform="python",
            duration_ns=300_000_000  # 300ms
        )
    ]


@pytest.fixture
def sample_frames():
    """Sample profiling frames for testing."""
    return [
        ProfileFrame(
            function="slow_database_query",
            file="/app/models.py",
            line=123,
            package="app.models",
            in_app=True,
            self_time_ns=200_000_000,  # 200ms
            total_time_ns=250_000_000
        ),
        ProfileFrame(
            function="process_data",
            file="/app/utils.py",
            line=45,
            package="app.utils",
            in_app=True,
            self_time_ns=150_000_000,  # 150ms
            total_time_ns=180_000_000
        ),
        ProfileFrame(
            function="json.dumps",
            file="/usr/lib/json.py",
            line=999,
            package="json",
            in_app=False,
            self_time_ns=50_000_000,  # 50ms
            total_time_ns=50_000_000
        )
    ]


class TestProfilingEnrichmentService:
    """Test suite for ProfilingEnrichmentService."""

    @pytest.mark.asyncio
    async def test_enrich_issue_success(
        self,
        profiling_service,
        mock_db,
        mock_sentry_client,
        sample_profiles,
        sample_frames
    ):
        """Test successful issue enrichment with profiling data."""
        # Setup
        issue = SentryIssue(
            id=1,
            sentry_issue_id="SENTRY-123",
            sentry_event_id="event-123",
            error_type="PerformanceError",
            error_message="Slow function execution",
            enrichment_status={},
            context_tags={"organization": "test-org", "project": "test-project"}
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result
        mock_sentry_client.get_profiles_for_issue.return_value = sample_profiles
        mock_sentry_client.get_profile_functions.return_value = sample_frames

        # Mock hotspot extraction
        mock_sentry_client.extract_hotspots.return_value = [
            {
                "function": "slow_database_query",
                "file": "/app/models.py",
                "line": 123,
                "package": "app.models",
                "in_app": True,
                "self_time_ms": 200.0,
                "total_time_ms": 250.0,
            }
        ]

        # Mock flamegraph data
        mock_sentry_client.build_flamegraph_data.return_value = {
            "nodes": [],
            "total_time_ms": 400.0,
            "max_depth": 3
        }

        # Execute
        result = await profiling_service.enrich_issue(1)

        # Assert
        assert result["status"] == "success"
        assert result["profiles_count"] == 2
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_enrich_issue_feature_disabled(
        self,
        profiling_service,
        mock_settings
    ):
        """Test enrichment when feature is disabled."""
        mock_settings.ENABLE_PROFILING = False

        result = await profiling_service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "feature disabled"

    @pytest.mark.asyncio
    async def test_enrich_issue_not_found(
        self,
        profiling_service,
        mock_db
    ):
        """Test enrichment when issue doesn't exist."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await profiling_service.enrich_issue(999)

        assert result["status"] == "error"
        assert result["reason"] == "issue not found"

    @pytest.mark.asyncio
    async def test_enrich_issue_no_profiling_data(
        self,
        profiling_service,
        mock_db,
        mock_sentry_client
    ):
        """Test enrichment when no profiling data is available."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="SENTRY-123",
            sentry_event_id="event-123",
            error_type="Error",
            error_message="Test",
            enrichment_status={},
            context_tags={"organization": "test-org"}
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result
        mock_sentry_client.get_profiles_for_issue.return_value = []

        result = await profiling_service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "no profiling data"

    def test_detect_hotspots(self, profiling_service, sample_frames):
        """Test hotspot detection."""
        # Mock client's extract_hotspots to return top functions
        profiling_service.client.extract_hotspots = MagicMock(return_value=[
            {
                "function": "slow_database_query",
                "file": "/app/models.py",
                "line": 123,
                "package": "app.models",
                "in_app": True,
                "self_time_ms": 200.0,
                "total_time_ms": 250.0,
            },
            {
                "function": "process_data",
                "file": "/app/utils.py",
                "line": 45,
                "package": "app.utils",
                "in_app": True,
                "self_time_ms": 150.0,
                "total_time_ms": 180.0,
            }
        ])

        total_duration_ms = 800.0
        hotspots = profiling_service._detect_hotspots(sample_frames, total_duration_ms)

        assert len(hotspots) == 2

        # Check first hotspot (25% of total time)
        assert hotspots[0]["function"] == "slow_database_query"
        assert hotspots[0]["time_percentage"] == 25.0  # 200ms / 800ms
        assert hotspots[0]["severity"] == "medium"  # 25% = medium

        # Check second hotspot (18.75% of total time)
        assert hotspots[1]["function"] == "process_data"
        assert hotspots[1]["time_percentage"] == 18.75  # 150ms / 800ms
        assert hotspots[1]["severity"] == "medium"

    def test_detect_hotspots_no_significant_functions(self, profiling_service):
        """Test hotspot detection when no functions meet the 10% threshold."""
        # Mock client to return functions with low time consumption
        profiling_service.client.extract_hotspots = MagicMock(return_value=[
            {
                "function": "fast_function",
                "file": "/app/utils.py",
                "line": 10,
                "package": "app.utils",
                "in_app": True,
                "self_time_ms": 20.0,  # Only 2% of total time
                "total_time_ms": 20.0,
            }
        ])

        frames = [ProfileFrame(
            function="fast_function",
            file="/app/utils.py",
            line=10,
            package="app.utils",
            in_app=True,
            self_time_ns=20_000_000,
            total_time_ns=20_000_000
        )]

        total_duration_ms = 1000.0
        hotspots = profiling_service._detect_hotspots(frames, total_duration_ms)

        # Should include top 3 even if below threshold
        assert len(hotspots) == 1

    def test_compute_hotspot_severity_critical(self, profiling_service):
        """Test severity computation for critical hotspot."""
        severity = profiling_service._compute_hotspot_severity(60.0)
        assert severity == "critical"

    def test_compute_hotspot_severity_high(self, profiling_service):
        """Test severity computation for high-severity hotspot."""
        severity = profiling_service._compute_hotspot_severity(35.0)
        assert severity == "high"

    def test_compute_hotspot_severity_medium(self, profiling_service):
        """Test severity computation for medium-severity hotspot."""
        severity = profiling_service._compute_hotspot_severity(20.0)
        assert severity == "medium"

    def test_compute_hotspot_severity_low(self, profiling_service):
        """Test severity computation for low-severity hotspot."""
        severity = profiling_service._compute_hotspot_severity(12.0)
        assert severity == "low"

    def test_build_profiling_data(self, profiling_service):
        """Test profiling data structure building."""
        hotspots = [
            {
                "function": "slow_function",
                "file": "/app/models.py",
                "line": 123,
                "package": "app.models",
                "in_app": True,
                "self_time_ms": 300.0,
                "total_time_ms": 350.0,
                "time_percentage": 60.0,
                "severity": "critical"
            }
        ]

        flamegraph_data = {
            "nodes": [{"id": 0, "function": "slow_function"}],
            "total_time_ms": 500.0,
            "max_depth": 1
        }

        data = profiling_service._build_profiling_data(
            hotspots,
            flamegraph_data,
            500.0,
            3
        )

        assert data["hotspot_count"] == 1
        assert data["total_profile_duration_ms"] == 500.0
        assert data["profiles_analyzed"] == 3
        assert data["summary"]["has_critical_hotspots"] is True
        assert data["summary"]["top_function"] == "slow_function"
        assert data["summary"]["top_function_time_pct"] == 60.0

    @pytest.mark.asyncio
    async def test_mark_failed(self, profiling_service, mock_db):
        """Test marking enrichment as failed."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="SENTRY-123",
            sentry_event_id="event-123",
            error_type="Error",
            error_message="Test",
            enrichment_status={}
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        await profiling_service._mark_failed(1, "Test error")

        assert mock_db.commit.called

    def test_update_status(self, profiling_service):
        """Test enrichment status update."""
        current = {}

        updated = profiling_service._update_status(
            current,
            "profiling",
            "completed"
        )

        assert "profiling" in updated
        assert updated["profiling"]["status"] == "completed"
        assert "last_attempt" in updated["profiling"]

    def test_update_status_with_error(self, profiling_service):
        """Test enrichment status update with error."""
        current = {}

        updated = profiling_service._update_status(
            current,
            "profiling",
            "failed",
            error="Test error"
        )

        assert updated["profiling"]["status"] == "failed"
        assert updated["profiling"]["error"] == "Test error"

    @pytest.mark.asyncio
    async def test_pii_scrubbing(
        self,
        profiling_service,
        mock_db,
        mock_sentry_client,
        sample_profiles
    ):
        """Test that PII is scrubbed from function names and file paths."""
        # Setup frames with potential PII
        frames_with_pii = [
            ProfileFrame(
                function="process_user_data_john_doe@example.com",
                file="/home/user/app/models.py",
                line=123,
                package="app.models",
                in_app=True,
                self_time_ns=200_000_000,
                total_time_ns=250_000_000
            )
        ]

        issue = SentryIssue(
            id=1,
            sentry_issue_id="SENTRY-123",
            sentry_event_id="event-123",
            error_type="Error",
            error_message="Test",
            enrichment_status={},
            context_tags={"organization": "test-org"}
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result
        mock_sentry_client.get_profiles_for_issue.return_value = sample_profiles
        mock_sentry_client.get_profile_functions.return_value = frames_with_pii
        mock_sentry_client.extract_hotspots.return_value = []
        mock_sentry_client.build_flamegraph_data.return_value = {"nodes": [], "total_time_ms": 0}

        # Execute
        result = await profiling_service.enrich_issue(1)

        # Assert - PII should be scrubbed
        assert result["status"] == "success"
        assert mock_db.commit.called

    def test_extract_org(self, profiling_service):
        """Test organization extraction from issue."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="SENTRY-123",
            sentry_event_id="event-123",
            error_type="Error",
            error_message="Test",
            context_tags={"organization": "test-org"}
        )

        org = profiling_service._extract_org(issue)
        assert org == "test-org"

    def test_extract_project(self, profiling_service):
        """Test project extraction from issue."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="SENTRY-123",
            sentry_event_id="event-123",
            error_type="Error",
            error_message="Test",
            context_tags={"project": "test-project"}
        )

        project = profiling_service._extract_project(issue)
        assert project == "test-project"


class TestProfilingThresholds:
    """Test profiling threshold constants."""

    def test_hotspot_time_percentage(self):
        """Test hotspot time percentage threshold."""
        assert HOTSPOT_TIME_PERCENTAGE == 10.0

    def test_hotspot_min_time_ms(self):
        """Test minimum hotspot time threshold."""
        assert HOTSPOT_MIN_TIME_MS == 10.0

    def test_top_functions_count(self):
        """Test top functions count."""
        assert TOP_FUNCTIONS_COUNT == 10


class TestProfilingClientMethods:
    """Test ProfilingClient helper methods."""

    def test_extract_hotspots(self):
        """Test ProfilingClient.extract_hotspots method."""
        from app.services.sentry.profiling import ProfilingClient

        client = ProfilingClient(token="test-token")

        frames = [
            ProfileFrame(
                function="slow_func",
                file="/app/test.py",
                line=10,
                package="app.test",
                in_app=True,
                self_time_ns=500_000_000,  # 500ms
                total_time_ns=600_000_000
            ),
            ProfileFrame(
                function="fast_func",
                file="/app/test.py",
                line=20,
                package="app.test",
                in_app=True,
                self_time_ns=5_000_000,  # 5ms (below threshold)
                total_time_ns=5_000_000
            )
        ]

        hotspots = client.extract_hotspots(frames, top_n=10, min_time_ms=10.0)

        # Should only include slow_func (above 10ms threshold)
        assert len(hotspots) == 1
        assert hotspots[0]["function"] == "slow_func"
        assert hotspots[0]["self_time_ms"] == 500.0

    def test_build_flamegraph_data(self):
        """Test ProfilingClient.build_flamegraph_data method."""
        from app.services.sentry.profiling import ProfilingClient

        client = ProfilingClient(token="test-token")

        frames = [
            ProfileFrame(
                function="func1",
                file="/app/test.py",
                line=10,
                package="app.test",
                in_app=True,
                self_time_ns=300_000_000,  # 300ms
                total_time_ns=500_000_000
            ),
            ProfileFrame(
                function="func2",
                file="/app/test.py",
                line=20,
                package="app.test",
                in_app=False,
                self_time_ns=200_000_000,  # 200ms
                total_time_ns=200_000_000
            )
        ]

        flamegraph = client.build_flamegraph_data(frames, max_depth=20)

        assert flamegraph["total_time_ms"] == 500.0  # 300 + 200
        assert len(flamegraph["nodes"]) == 2
        assert flamegraph["nodes"][0]["function"] == "func1"
        assert flamegraph["nodes"][0]["percentage"] == 60.0  # 300/500
        assert flamegraph["nodes"][1]["percentage"] == 40.0  # 200/500
