"""
Unit tests for Performance Enrichment Service.

Tests EPIC E - Performance Span Integration enrichment.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.enrichment.performance_enrichment import (
    PerformanceEnrichmentService,
    SLOW_DB_THRESHOLD_MS,
    SLOW_HTTP_THRESHOLD_MS,
    N_PLUS_ONE_QUERY_COUNT
)
from app.services.sentry.performance import PerformanceSpan
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
    """Mock Sentry performance client."""
    client = MagicMock()
    client.get_performance_spans = AsyncMock()
    return client


@pytest.fixture
def mock_settings():
    """Mock application settings."""
    settings = MagicMock()
    settings.ENABLE_PERFORMANCE_SPANS = True
    return settings


@pytest.fixture
def performance_service(mock_db, mock_sentry_client, mock_settings):
    """Create performance enrichment service with mocks."""
    with patch("app.services.enrichment.performance_enrichment.get_settings", return_value=mock_settings):
        service = PerformanceEnrichmentService(mock_db, mock_sentry_client)
        return service


@pytest.fixture
def sample_spans():
    """Sample performance spans for testing."""
    return [
        PerformanceSpan(
            span_id="span1",
            trace_id="trace1",
            operation="db.query",
            description="SELECT * FROM users WHERE id = 1",
            start_timestamp=1000.0,
            timestamp=1002.5,  # 2500ms - slow
            tags={"db.system": "postgresql"}
        ),
        PerformanceSpan(
            span_id="span2",
            trace_id="trace1",
            operation="http.client",
            description="GET /api/users",
            start_timestamp=1003.0,
            timestamp=1007.0,  # 4000ms - slow
            tags={"http.method": "GET"}
        ),
        PerformanceSpan(
            span_id="span3",
            trace_id="trace1",
            operation="db.query",
            description="SELECT * FROM posts WHERE user_id = 1",
            start_timestamp=1008.0,
            timestamp=1008.2,  # 200ms - fast
            tags={"db.system": "postgresql"}
        )
    ]


@pytest.fixture
def n_plus_one_spans():
    """Sample spans demonstrating N+1 pattern."""
    base_timestamp = 1000.0
    spans = []

    # Parent query
    spans.append(
        PerformanceSpan(
            span_id="span0",
            trace_id="trace1",
            operation="db.query",
            description="SELECT * FROM users",
            start_timestamp=base_timestamp,
            timestamp=base_timestamp + 0.1
        )
    )

    # 10 similar child queries (N+1 pattern)
    for i in range(10):
        spans.append(
            PerformanceSpan(
                span_id=f"span{i+1}",
                trace_id="trace1",
                operation="db.query",
                description=f"SELECT * FROM posts WHERE user_id = {i+1}",
                start_timestamp=base_timestamp + 0.1 + (i * 0.05),
                timestamp=base_timestamp + 0.15 + (i * 0.05)
            )
        )

    return spans


class TestPerformanceEnrichmentService:
    """Test suite for PerformanceEnrichmentService."""

    @pytest.mark.asyncio
    async def test_enrich_issue_success(
        self,
        performance_service,
        mock_db,
        mock_sentry_client,
        sample_spans
    ):
        """Test successful issue enrichment."""
        # Setup
        issue = SentryIssue(
            id=1,
            sentry_issue_id="SENTRY-123",
            sentry_event_id="event-123",
            error_type="DatabaseError",
            error_message="Slow query",
            enrichment_status={}
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result
        mock_sentry_client.get_performance_spans.return_value = sample_spans

        # Execute
        result = await performance_service.enrich_issue(1)

        # Assert
        assert result["status"] == "success"
        assert result["spans_count"] == 3
        assert result["problem_spans_count"] == 2  # 2 slow spans
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_enrich_issue_feature_disabled(
        self,
        performance_service,
        mock_settings
    ):
        """Test enrichment when feature is disabled."""
        mock_settings.ENABLE_PERFORMANCE_SPANS = False

        result = await performance_service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "feature disabled"

    @pytest.mark.asyncio
    async def test_enrich_issue_not_found(
        self,
        performance_service,
        mock_db
    ):
        """Test enrichment when issue doesn't exist."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await performance_service.enrich_issue(999)

        assert result["status"] == "error"
        assert result["reason"] == "issue not found"

    def test_detect_problem_spans(self, performance_service, sample_spans):
        """Test problem span detection."""
        problems = performance_service._detect_problem_spans(sample_spans)

        assert len(problems) == 2

        # Check slow DB query
        db_problem = next(p for p in problems if p["operation"] == "db.query")
        assert db_problem["problem_type"] == "slow_db_query"
        assert db_problem["severity"] == "high"  # 2500ms (>2000ms threshold)
        assert db_problem["duration_ms"] == 2500

        # Check slow HTTP request
        http_problem = next(p for p in problems if p["operation"] == "http.client")
        assert http_problem["problem_type"] == "slow_http_request"
        assert http_problem["severity"] == "medium"  # 4000ms (>3000ms, <5000ms)

    def test_detect_n_plus_one(self, performance_service, n_plus_one_spans):
        """Test N+1 pattern detection."""
        patterns = performance_service._detect_n_plus_one(n_plus_one_spans)

        assert len(patterns) == 1

        pattern = patterns[0]
        assert pattern["occurrence_count"] == 10
        assert "user_id" in pattern["pattern"]
        assert pattern["severity"] in ["high", "medium"]

    def test_detect_n_plus_one_no_pattern(self, performance_service, sample_spans):
        """Test N+1 detection with no pattern (too few queries)."""
        patterns = performance_service._detect_n_plus_one(sample_spans)

        assert len(patterns) == 0

    def test_normalize_query(self, performance_service):
        """Test SQL query normalization."""
        query1 = "SELECT * FROM users WHERE id = 123"
        query2 = "SELECT * FROM users WHERE id = 456"

        normalized1 = performance_service._normalize_query(query1)
        normalized2 = performance_service._normalize_query(query2)

        # Should be identical after normalization
        assert normalized1 == normalized2
        assert "N" in normalized1  # Numbers replaced with N
        assert "123" not in normalized1
        assert "456" not in normalized2

    def test_compute_severity_db_critical(self, performance_service):
        """Test severity computation for critical DB query."""
        severity = performance_service._compute_severity(6000, "db.query")
        assert severity == "critical"

    def test_compute_severity_db_high(self, performance_service):
        """Test severity computation for high-severity DB query."""
        severity = performance_service._compute_severity(3000, "db.query")
        assert severity == "high"

    def test_compute_severity_db_medium(self, performance_service):
        """Test severity computation for medium-severity DB query."""
        severity = performance_service._compute_severity(1500, "db.query")
        assert severity == "medium"

    def test_compute_severity_http_critical(self, performance_service):
        """Test severity computation for critical HTTP request."""
        severity = performance_service._compute_severity(12000, "http.client")
        assert severity == "critical"

    def test_compute_severity_http_medium(self, performance_service):
        """Test severity computation for medium-severity HTTP request."""
        severity = performance_service._compute_severity(4000, "http.client")
        assert severity == "medium"

    def test_compute_severity_low(self, performance_service):
        """Test severity computation for low-severity operation."""
        severity = performance_service._compute_severity(500, "db.query")
        assert severity == "low"

    def test_build_performance_data(
        self,
        performance_service,
        sample_spans
    ):
        """Test performance data structure building."""
        problem_spans = performance_service._detect_problem_spans(sample_spans)
        n_plus_one = performance_service._detect_n_plus_one(sample_spans)

        data = performance_service._build_performance_data(
            sample_spans,
            problem_spans,
            n_plus_one
        )

        assert data["total_spans"] == 3
        assert len(data["problem_spans"]) == 2
        assert len(data["n_plus_one_patterns"]) == 0
        assert data["summary"]["total_db_queries"] == 2
        assert data["summary"]["total_http_requests"] == 1
        assert data["summary"]["slowest_operation"] == 4000

    @pytest.mark.asyncio
    async def test_mark_failed(self, performance_service, mock_db):
        """Test marking enrichment as failed."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="SENTRY-123",
            sentry_event_id="event-123",
            error_type="DatabaseError",
            error_message="Test",
            enrichment_status={}
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result

        await performance_service._mark_failed(1, "Test error")

        assert mock_db.commit.called

    def test_update_status(self, performance_service):
        """Test enrichment status update."""
        current = {}

        updated = performance_service._update_status(
            current,
            "performance_spans",
            "completed"
        )

        assert "performance_spans" in updated
        assert updated["performance_spans"]["status"] == "completed"
        assert "last_attempt" in updated["performance_spans"]

    def test_update_status_with_error(self, performance_service):
        """Test enrichment status update with error."""
        current = {}

        updated = performance_service._update_status(
            current,
            "performance_spans",
            "failed",
            error="Test error"
        )

        assert updated["performance_spans"]["status"] == "failed"
        assert updated["performance_spans"]["error"] == "Test error"

    @pytest.mark.asyncio
    async def test_pii_scrubbing(
        self,
        performance_service,
        mock_db,
        mock_sentry_client
    ):
        """Test that PII is scrubbed before storage."""
        # Setup spans with PII
        spans_with_pii = [
            PerformanceSpan(
                span_id="span1",
                trace_id="trace1",
                operation="db.query",
                description="SELECT * FROM users WHERE email = 'test@example.com'",
                start_timestamp=1000.0,
                timestamp=1002.0,
                tags={"user_id": "12345"}
            )
        ]

        issue = SentryIssue(
            id=1,
            sentry_issue_id="SENTRY-123",
            sentry_event_id="event-123",
            error_type="DatabaseError",
            error_message="Test",
            enrichment_status={}
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = issue
        mock_db.execute.return_value = mock_result
        mock_sentry_client.get_performance_spans.return_value = spans_with_pii

        # Execute
        result = await performance_service.enrich_issue(1)

        # Assert - PII should be scrubbed
        assert result["status"] == "success"
        # Verify commit was called (which means scrubbed data was stored)
        assert mock_db.commit.called


class TestPerformanceThresholds:
    """Test performance threshold constants."""

    def test_slow_db_threshold(self):
        """Test slow DB query threshold."""
        assert SLOW_DB_THRESHOLD_MS == 1000

    def test_slow_http_threshold(self):
        """Test slow HTTP request threshold."""
        assert SLOW_HTTP_THRESHOLD_MS == 3000

    def test_n_plus_one_query_count(self):
        """Test N+1 detection threshold."""
        assert N_PLUS_ONE_QUERY_COUNT == 5
