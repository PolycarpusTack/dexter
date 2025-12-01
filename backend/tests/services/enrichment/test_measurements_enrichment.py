"""
Unit tests for Measurements Enrichment Service.

Tests EPIC M - Measurements & Web Vitals enrichment.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.enrichment.measurements_enrichment import (
    MeasurementsEnrichmentService,
    THRESHOLDS,
    MIN_BASELINE_SAMPLES,
    REGRESSION_THRESHOLDS,
)
from app.services.sentry.measurements import Measurement
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
    """Mock Sentry measurements client."""
    client = MagicMock()
    client.get_issue_measurements = AsyncMock()
    return client


@pytest.fixture
def mock_settings():
    """Mock application settings."""
    settings = MagicMock()
    settings.ENABLE_MEASUREMENTS = True
    settings.SENTRY_ORGANIZATION_SLUG = "test-org"
    settings.SENTRY_PROJECT_SLUG = "test-project"
    return settings


@pytest.fixture
def measurements_service(mock_db, mock_sentry_client, mock_settings):
    """Create measurements enrichment service with mocks."""
    with patch(
        "app.services.enrichment.measurements_enrichment.get_settings",
        return_value=mock_settings,
    ):
        service = MeasurementsEnrichmentService(mock_db, mock_sentry_client)
        return service


@pytest.fixture
def good_web_vitals_measurements():
    """Sample measurements with good web vitals."""
    return [
        Measurement(name="lcp", value=2000, unit="millisecond"),  # 2s - good
        Measurement(name="fid", value=80, unit="millisecond"),  # 80ms - good
        Measurement(name="cls", value=0.05, unit="none"),  # 0.05 - good
        Measurement(name="ttfb", value=600, unit="millisecond"),  # 600ms - good
        Measurement(name="fcp", value=1500, unit="millisecond"),  # 1.5s - good
    ]


@pytest.fixture
def poor_web_vitals_measurements():
    """Sample measurements with poor web vitals."""
    return [
        Measurement(name="lcp", value=5000, unit="millisecond"),  # 5s - poor
        Measurement(name="fid", value=350, unit="millisecond"),  # 350ms - poor
        Measurement(name="cls", value=0.3, unit="none"),  # 0.3 - poor
        Measurement(name="ttfb", value=2000, unit="millisecond"),  # 2s - poor
        Measurement(name="fcp", value=3500, unit="millisecond"),  # 3.5s - poor
    ]


@pytest.fixture
def mixed_web_vitals_measurements():
    """Sample measurements with mixed web vitals."""
    return [
        Measurement(name="lcp", value=3000, unit="millisecond"),  # 3s - needs-improvement
        Measurement(name="fid", value=150, unit="millisecond"),  # 150ms - needs-improvement
        Measurement(name="cls", value=0.15, unit="none"),  # 0.15 - needs-improvement
    ]


@pytest.fixture
def custom_measurements():
    """Sample custom measurements."""
    return [
        Measurement(name="api_response_time", value=150, unit="millisecond"),
        Measurement(name="db_query_count", value=8, unit="none"),
        Measurement(name="memory_usage_mb", value=256, unit="megabyte"),
    ]


@pytest.fixture
def sample_issue():
    """Sample issue for testing."""
    issue = MagicMock(spec=SentryIssue)
    issue.id = 1
    issue.sentry_issue_id = "12345"
    issue.enrichment_status = {}
    issue.context_tags = {"organization": "test-org", "project": "test-project"}
    return issue


class TestWebVitalsExtraction:
    """Test web vitals extraction and scoring."""

    def test_extract_good_web_vitals(
        self, measurements_service, good_web_vitals_measurements
    ):
        """Test extraction of good web vitals."""
        web_vitals = measurements_service._extract_web_vitals(
            good_web_vitals_measurements
        )

        # Check LCP
        assert web_vitals["lcp"] is not None
        assert web_vitals["lcp"]["value"] == 2.0  # Converted to seconds
        assert web_vitals["lcp"]["score"] == "good"
        assert web_vitals["lcp"]["unit"] == "s"

        # Check FID
        assert web_vitals["fid"] is not None
        assert web_vitals["fid"]["value"] == 80
        assert web_vitals["fid"]["score"] == "good"
        assert web_vitals["fid"]["unit"] == "ms"

        # Check CLS
        assert web_vitals["cls"] is not None
        assert web_vitals["cls"]["value"] == 0.05
        assert web_vitals["cls"]["score"] == "good"
        assert web_vitals["cls"]["unit"] == ""

    def test_extract_poor_web_vitals(
        self, measurements_service, poor_web_vitals_measurements
    ):
        """Test extraction of poor web vitals."""
        web_vitals = measurements_service._extract_web_vitals(
            poor_web_vitals_measurements
        )

        assert web_vitals["lcp"]["score"] == "poor"
        assert web_vitals["fid"]["score"] == "poor"
        assert web_vitals["cls"]["score"] == "poor"
        assert web_vitals["ttfb"]["score"] == "poor"
        assert web_vitals["fcp"]["score"] == "poor"

    def test_extract_mixed_web_vitals(
        self, measurements_service, mixed_web_vitals_measurements
    ):
        """Test extraction of mixed web vitals."""
        web_vitals = measurements_service._extract_web_vitals(
            mixed_web_vitals_measurements
        )

        assert web_vitals["lcp"]["score"] == "needs-improvement"
        assert web_vitals["fid"]["score"] == "needs-improvement"
        assert web_vitals["cls"]["score"] == "needs-improvement"

    def test_extract_missing_web_vitals(self, measurements_service):
        """Test handling of missing web vitals."""
        measurements = [
            Measurement(name="lcp", value=2000, unit="millisecond"),
            # FID, CLS, TTFB, FCP missing
        ]

        web_vitals = measurements_service._extract_web_vitals(measurements)

        assert web_vitals["lcp"] is not None
        assert web_vitals["fid"] is None
        assert web_vitals["cls"] is None
        assert web_vitals["ttfb"] is None
        assert web_vitals["fcp"] is None


class TestWebVitalsScoring:
    """Test web vitals scoring logic."""

    def test_score_good_lcp(self, measurements_service):
        """Test scoring of good LCP (< 2.5s)."""
        score = measurements_service._score_web_vital("lcp", 2.0)
        assert score == "good"

    def test_score_needs_improvement_lcp(self, measurements_service):
        """Test scoring of LCP needing improvement (2.5-4s)."""
        score = measurements_service._score_web_vital("lcp", 3.0)
        assert score == "needs-improvement"

    def test_score_poor_lcp(self, measurements_service):
        """Test scoring of poor LCP (> 4s)."""
        score = measurements_service._score_web_vital("lcp", 5.0)
        assert score == "poor"

    def test_score_good_fid(self, measurements_service):
        """Test scoring of good FID (< 100ms)."""
        score = measurements_service._score_web_vital("fid", 80)
        assert score == "good"

    def test_score_needs_improvement_fid(self, measurements_service):
        """Test scoring of FID needing improvement (100-300ms)."""
        score = measurements_service._score_web_vital("fid", 150)
        assert score == "needs-improvement"

    def test_score_poor_fid(self, measurements_service):
        """Test scoring of poor FID (> 300ms)."""
        score = measurements_service._score_web_vital("fid", 350)
        assert score == "poor"

    def test_score_good_cls(self, measurements_service):
        """Test scoring of good CLS (< 0.1)."""
        score = measurements_service._score_web_vital("cls", 0.05)
        assert score == "good"

    def test_score_needs_improvement_cls(self, measurements_service):
        """Test scoring of CLS needing improvement (0.1-0.25)."""
        score = measurements_service._score_web_vital("cls", 0.15)
        assert score == "needs-improvement"

    def test_score_poor_cls(self, measurements_service):
        """Test scoring of poor CLS (> 0.25)."""
        score = measurements_service._score_web_vital("cls", 0.3)
        assert score == "poor"

    def test_compute_overall_good_score(self, measurements_service):
        """Test computing overall 'good' score when all vitals are good."""
        web_vitals = {
            "lcp": {"value": 2.0, "score": "good", "unit": "s"},
            "fid": {"value": 80, "score": "good", "unit": "ms"},
            "cls": {"value": 0.05, "score": "good", "unit": ""},
        }

        overall = measurements_service._compute_web_vitals_score(web_vitals)
        assert overall == "good"

    def test_compute_overall_poor_score(self, measurements_service):
        """Test computing overall 'poor' score when any vital is poor."""
        web_vitals = {
            "lcp": {"value": 2.0, "score": "good", "unit": "s"},
            "fid": {"value": 350, "score": "poor", "unit": "ms"},  # Poor
            "cls": {"value": 0.05, "score": "good", "unit": ""},
        }

        overall = measurements_service._compute_web_vitals_score(web_vitals)
        assert overall == "poor"

    def test_compute_overall_needs_improvement_score(self, measurements_service):
        """Test computing overall 'needs-improvement' score."""
        web_vitals = {
            "lcp": {"value": 2.0, "score": "good", "unit": "s"},
            "fid": {"value": 150, "score": "needs-improvement", "unit": "ms"},
            "cls": {"value": 0.05, "score": "good", "unit": ""},
        }

        overall = measurements_service._compute_web_vitals_score(web_vitals)
        assert overall == "needs-improvement"

    def test_compute_overall_no_data(self, measurements_service):
        """Test computing overall score with no vitals data."""
        web_vitals = {
            "lcp": None,
            "fid": None,
            "cls": None,
            "ttfb": None,
            "fcp": None,
        }

        overall = measurements_service._compute_web_vitals_score(web_vitals)
        assert overall == "no-data"


class TestCustomMetrics:
    """Test custom metrics extraction."""

    def test_extract_custom_metrics(
        self, measurements_service, good_web_vitals_measurements, custom_measurements
    ):
        """Test extraction of custom metrics."""
        all_measurements = good_web_vitals_measurements + custom_measurements

        custom = measurements_service._extract_custom_metrics(all_measurements)

        assert len(custom) == 3
        assert custom["api_response_time"] == 150
        assert custom["db_query_count"] == 8
        assert custom["memory_usage_mb"] == 256

    def test_extract_no_custom_metrics(
        self, measurements_service, good_web_vitals_measurements
    ):
        """Test extraction when no custom metrics present."""
        custom = measurements_service._extract_custom_metrics(
            good_web_vitals_measurements
        )

        assert len(custom) == 0


class TestRegressionDetection:
    """Test baseline comparison and regression detection."""

    def test_detect_regression_high_severity(self, measurements_service):
        """Test detecting high severity regression (50-100% increase)."""
        web_vitals = {
            "lcp": {"value": 3.0, "score": "needs-improvement", "unit": "s"},
            "fid": None,
            "cls": None,
            "ttfb": None,
            "fcp": None,
        }
        baseline = {"lcp_p75": 2.0}

        regressions = measurements_service._compare_to_baseline(web_vitals, baseline)

        assert len(regressions) == 1
        assert regressions[0]["metric"] == "lcp"
        assert regressions[0]["current"] == 3.0
        assert regressions[0]["baseline"] == 2.0
        assert regressions[0]["regression_pct"] == 50.0
        assert regressions[0]["severity"] == "high"

    def test_detect_regression_critical_severity(self, measurements_service):
        """Test detecting critical severity regression (100%+ increase)."""
        web_vitals = {
            "lcp": {"value": 4.5, "score": "poor", "unit": "s"},
            "fid": None,
            "cls": None,
            "ttfb": None,
            "fcp": None,
        }
        baseline = {"lcp_p75": 2.0}

        regressions = measurements_service._compare_to_baseline(web_vitals, baseline)

        assert len(regressions) == 1
        assert regressions[0]["regression_pct"] == 125.0
        assert regressions[0]["severity"] == "critical"

    def test_detect_regression_medium_severity(self, measurements_service):
        """Test detecting medium severity regression (25-50% increase)."""
        web_vitals = {
            "fid": {"value": 125, "score": "needs-improvement", "unit": "ms"},
            "lcp": None,
            "cls": None,
            "ttfb": None,
            "fcp": None,
        }
        baseline = {"fid_p75": 100}

        regressions = measurements_service._compare_to_baseline(web_vitals, baseline)

        assert len(regressions) == 1
        assert regressions[0]["regression_pct"] == 25.0
        assert regressions[0]["severity"] == "medium"

    def test_no_regression_below_threshold(self, measurements_service):
        """Test that small changes below 10% are not flagged."""
        web_vitals = {
            "lcp": {"value": 2.05, "score": "good", "unit": "s"},
            "fid": None,
            "cls": None,
            "ttfb": None,
            "fcp": None,
        }
        baseline = {"lcp_p75": 2.0}  # 2.5% increase

        regressions = measurements_service._compare_to_baseline(web_vitals, baseline)

        assert len(regressions) == 0

    def test_no_regression_without_baseline(self, measurements_service):
        """Test handling when no baseline data is available."""
        web_vitals = {
            "lcp": {"value": 3.0, "score": "needs-improvement", "unit": "s"},
            "fid": None,
            "cls": None,
            "ttfb": None,
            "fcp": None,
        }
        baseline = {}

        regressions = measurements_service._compare_to_baseline(web_vitals, baseline)

        assert len(regressions) == 0


class TestUnitConversion:
    """Test unit conversion logic."""

    def test_convert_milliseconds_to_seconds(self, measurements_service):
        """Test converting milliseconds to seconds for LCP."""
        value = measurements_service._convert_to_threshold_unit(2500, "millisecond", "lcp")
        assert value == 2.5

    def test_convert_seconds_to_milliseconds(self, measurements_service):
        """Test converting seconds to milliseconds for FID."""
        value = measurements_service._convert_to_threshold_unit(0.1, "second", "fid")
        assert value == 100

    def test_unitless_conversion(self, measurements_service):
        """Test handling unitless metrics like CLS."""
        value = measurements_service._convert_to_threshold_unit(0.15, "none", "cls")
        assert value == 0.15

    def test_no_conversion_needed(self, measurements_service):
        """Test when value is already in correct unit."""
        value = measurements_service._convert_to_threshold_unit(100, "millisecond", "fid")
        assert value == 100


class TestEnrichIssue:
    """Test the main enrich_issue method."""

    @pytest.mark.asyncio
    async def test_enrich_issue_success(
        self,
        measurements_service,
        mock_db,
        mock_sentry_client,
        sample_issue,
        good_web_vitals_measurements,
        custom_measurements,
    ):
        """Test successful issue enrichment."""
        # Setup mock returns
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = sample_issue
        mock_db.execute.return_value = result_mock

        mock_sentry_client.get_issue_measurements.return_value = (
            good_web_vitals_measurements + custom_measurements
        )

        # Execute
        result = await measurements_service.enrich_issue(1)

        # Verify
        assert result["status"] == "success"
        assert result["overall_score"] == "good"
        assert result["vitals_count"] == 5
        assert result["custom_count"] == 3
        assert result["regressions_count"] == 0

        # Verify database update was called
        assert mock_db.execute.call_count >= 2  # Select + Update
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_enrich_issue_feature_disabled(
        self, measurements_service, mock_db, mock_settings
    ):
        """Test enrichment when feature is disabled."""
        mock_settings.ENABLE_MEASUREMENTS = False

        result = await measurements_service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "feature disabled"
        mock_db.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_enrich_issue_not_found(self, measurements_service, mock_db):
        """Test enrichment when issue is not found."""
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result_mock

        result = await measurements_service.enrich_issue(999)

        assert result["status"] == "error"
        assert result["reason"] == "issue not found"

    @pytest.mark.asyncio
    async def test_enrich_issue_no_measurements(
        self, measurements_service, mock_db, mock_sentry_client, sample_issue
    ):
        """Test enrichment when no measurements are available."""
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = sample_issue
        mock_db.execute.return_value = result_mock

        mock_sentry_client.get_issue_measurements.return_value = []

        result = await measurements_service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "no measurements data"

    @pytest.mark.asyncio
    async def test_enrich_issue_with_poor_vitals(
        self,
        measurements_service,
        mock_db,
        mock_sentry_client,
        sample_issue,
        poor_web_vitals_measurements,
    ):
        """Test enrichment with poor web vitals."""
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = sample_issue
        mock_db.execute.return_value = result_mock

        mock_sentry_client.get_issue_measurements.return_value = (
            poor_web_vitals_measurements
        )

        result = await measurements_service.enrich_issue(1)

        assert result["status"] == "success"
        assert result["overall_score"] == "poor"
        assert result["vitals_count"] == 5


class TestDataStructure:
    """Test the measurements data structure."""

    def test_build_measurements_data_structure(self, measurements_service):
        """Test building complete measurements data structure."""
        web_vitals = {
            "lcp": {"value": 2.0, "score": "good", "unit": "s"},
            "fid": {"value": 80, "score": "good", "unit": "ms"},
            "cls": {"value": 0.05, "score": "good", "unit": ""},
            "ttfb": None,
            "fcp": None,
        }
        overall_score = "good"
        custom_metrics = {"api_response_time": 150}
        baseline = {"lcp_p75": 2.5}
        regressions = []

        data = measurements_service._build_measurements_data(
            web_vitals, overall_score, custom_metrics, baseline, regressions
        )

        # Verify structure
        assert "web_vitals" in data
        assert "overall_score" in data
        assert "custom_metrics" in data
        assert "baselines" in data
        assert "regressions" in data
        assert "summary" in data
        assert "last_fetched" in data

        # Verify summary
        assert data["summary"]["has_web_vitals"] is True
        assert data["summary"]["has_custom_metrics"] is True
        assert data["summary"]["vitals_count"] == 3
        assert data["summary"]["custom_count"] == 1
        assert data["summary"]["has_regressions"] is False
        assert data["summary"]["worst_regression_severity"] is None

    def test_build_measurements_data_with_regressions(self, measurements_service):
        """Test building data structure with regressions."""
        web_vitals = {
            "lcp": {"value": 4.0, "score": "poor", "unit": "s"},
            "fid": None,
            "cls": None,
            "ttfb": None,
            "fcp": None,
        }
        overall_score = "poor"
        custom_metrics = {}
        baseline = {"lcp_p75": 2.0}
        regressions = [
            {
                "metric": "lcp",
                "current": 4.0,
                "baseline": 2.0,
                "regression_pct": 100.0,
                "severity": "critical",
            }
        ]

        data = measurements_service._build_measurements_data(
            web_vitals, overall_score, custom_metrics, baseline, regressions
        )

        assert data["summary"]["has_regressions"] is True
        assert data["summary"]["worst_regression_severity"] == "critical"
        assert len(data["regressions"]) == 1
