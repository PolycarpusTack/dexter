"""
Unit tests for grouping enrichment service.

Tests EPIC N: Grouping Insights implementation including:
- Fingerprint variant extraction
- Similar issue detection
- Similarity scoring algorithms
- Grouping problem detection (over/under-grouping)
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.enrichment.grouping_enrichment import (
    GroupingEnrichmentService,
    SIMILARITY_MATCH_THRESHOLD,
    OVERGROUPING_ERROR_COUNT_THRESHOLD,
    UNDERGROUPING_SIMILARITY_THRESHOLD,
)


@pytest.fixture
def mock_db():
    """Mock database session."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db


@pytest.fixture
def mock_grouping_client():
    """Mock GroupingClient."""
    client = MagicMock()
    client.get_issue_details = AsyncMock()
    client.get_similar_issues = AsyncMock()
    client.get_issue_hashes_details = AsyncMock()
    return client


@pytest.fixture
def mock_settings():
    """Mock settings."""
    settings = MagicMock()
    settings.ENABLE_GROUPING_INSIGHTS = True
    settings.SENTRY_ORG_SLUG = "test-org"
    return settings


@pytest.fixture
def grouping_service(mock_db, mock_grouping_client, mock_settings):
    """Create GroupingEnrichmentService with mocks."""
    with patch("app.services.enrichment.grouping_enrichment.get_settings", return_value=mock_settings):
        service = GroupingEnrichmentService(mock_db, mock_grouping_client)
        return service


@pytest.fixture
def sample_issue():
    """Sample SentryIssue model."""
    issue = MagicMock()
    issue.id = 1
    issue.sentry_issue_id = "12345"
    issue.context_tags = {"organization": "test-org"}
    issue.enrichment_status = {}
    return issue


@pytest.fixture
def sample_issue_details():
    """Sample issue details from Sentry API."""
    return {
        "id": "12345",
        "title": "ValueError: Invalid payment amount",
        "fingerprint": ["ValueError", "process_payment", "line 42"],
        "metadata": {
            "type": "ValueError",
            "value": "Invalid payment amount",
        },
        "count": 50,
        "lastSeen": "2025-11-30T12:00:00Z",
        "entries": [
            {
                "type": "exception",
                "data": {
                    "values": [
                        {
                            "stacktrace": {
                                "frames": [
                                    {
                                        "function": "process_payment",
                                        "filename": "payment.py",
                                        "lineNo": 42,
                                    },
                                    {
                                        "function": "validate_amount",
                                        "filename": "validation.py",
                                        "lineNo": 15,
                                    },
                                ]
                            }
                        }
                    ]
                },
            }
        ],
    }


@pytest.fixture
def sample_similar_issues():
    """Sample similar issues from Sentry API."""
    return [
        {
            "id": "12346",
            "title": "ValueError: Invalid payment",
            "shortId": "PROJ-123",
            "fingerprint": ["ValueError", "process_payment"],
            "count": 30,
            "lastSeen": "2025-11-30T11:00:00Z",
            "score": 0.85,
        },
        {
            "id": "12347",
            "title": "ValueError: Payment validation failed",
            "shortId": "PROJ-124",
            "fingerprint": ["ValueError", "validate_payment"],
            "count": 20,
            "lastSeen": "2025-11-30T10:00:00Z",
            "score": 0.72,
        },
    ]


class TestGroupingEnrichmentService:
    """Test GroupingEnrichmentService."""

    @pytest.mark.asyncio
    async def test_enrich_issue_feature_disabled(
        self, grouping_service, mock_db, mock_settings
    ):
        """Test enrichment when feature is disabled."""
        with patch("app.services.enrichment.grouping_enrichment.get_settings") as mock_get_settings:
            mock_settings.ENABLE_GROUPING_INSIGHTS = False
            mock_get_settings.return_value = mock_settings

            result = await grouping_service.enrich_issue(1)

            assert result["status"] == "skipped"
            assert result["reason"] == "feature disabled"

    @pytest.mark.asyncio
    async def test_enrich_issue_not_found(self, grouping_service, mock_db):
        """Test enrichment when issue is not found."""
        # Mock database query returning None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await grouping_service.enrich_issue(999)

        assert result["status"] == "error"
        assert result["reason"] == "issue not found"

    @pytest.mark.asyncio
    async def test_enrich_issue_success(
        self,
        grouping_service,
        mock_db,
        mock_grouping_client,
        sample_issue,
        sample_issue_details,
        sample_similar_issues,
    ):
        """Test successful enrichment."""
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        mock_db.execute.return_value = mock_result

        # Mock Sentry API calls
        mock_grouping_client.get_issue_details.return_value = sample_issue_details
        mock_grouping_client.get_similar_issues.return_value = sample_similar_issues

        result = await grouping_service.enrich_issue(1)

        assert result["status"] == "success"
        assert result["similar_issues_count"] >= 0
        assert "has_variants" in result
        assert "grouping_health_score" in result

        # Verify database was updated
        assert mock_db.execute.call_count >= 2  # SELECT + UPDATE
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_extract_org_slug_from_context_tags(self, grouping_service, sample_issue):
        """Test extracting org_slug from context_tags."""
        sample_issue.context_tags = {"organization": "test-org"}

        org_slug = grouping_service._extract_org_slug(sample_issue)

        assert org_slug == "test-org"

    @pytest.mark.asyncio
    async def test_extract_org_slug_from_release_context(self, grouping_service, sample_issue):
        """Test extracting org_slug from release_context."""
        sample_issue.context_tags = None
        sample_issue.release_context = {"organization": "release-org"}

        org_slug = grouping_service._extract_org_slug(sample_issue)

        assert org_slug == "release-org"

    @pytest.mark.asyncio
    async def test_extract_org_slug_fallback(self, grouping_service, sample_issue, mock_settings):
        """Test extracting org_slug from settings fallback."""
        sample_issue.context_tags = None
        sample_issue.release_context = None

        with patch("app.services.enrichment.grouping_enrichment.get_settings") as mock_get_settings:
            mock_settings.SENTRY_ORG_SLUG = "fallback-org"
            mock_get_settings.return_value = mock_settings

            org_slug = grouping_service._extract_org_slug(sample_issue)

            assert org_slug == "fallback-org"

    def test_extract_fingerprint_variants(self, grouping_service, sample_issue_details):
        """Test fingerprint variant extraction."""
        fingerprint_data = grouping_service._extract_fingerprint_variants(sample_issue_details)

        assert fingerprint_data["primary_fingerprint"] == [
            "ValueError",
            "process_payment",
            "line 42",
        ]
        assert fingerprint_data["grouping_algorithm"] == "ValueError"
        assert "has_variants" in fingerprint_data
        assert "variant_count" in fingerprint_data

    def test_extract_stack_trace(self, grouping_service, sample_issue_details):
        """Test stack trace extraction from issue details."""
        stack = grouping_service._extract_stack_trace(sample_issue_details)

        assert len(stack) == 2
        assert "process_payment:payment.py:42" in stack
        assert "validate_amount:validation.py:15" in stack

    def test_compute_stack_similarity_identical(self, grouping_service):
        """Test stack similarity with identical stacks."""
        stack1 = ["func1:file1.py:10", "func2:file2.py:20"]
        stack2 = ["func1:file1.py:10", "func2:file2.py:20"]

        similarity = grouping_service._compute_stack_similarity(stack1, stack2)

        assert similarity == 1.0

    def test_compute_stack_similarity_partial(self, grouping_service):
        """Test stack similarity with partial overlap."""
        stack1 = ["func1:file1.py:10", "func2:file2.py:20", "func3:file3.py:30"]
        stack2 = ["func1:file1.py:10", "func2:file2.py:20"]

        similarity = grouping_service._compute_stack_similarity(stack1, stack2)

        # Jaccard similarity: 2 / 3 = 0.666...
        assert 0.6 < similarity < 0.7

    def test_compute_stack_similarity_no_overlap(self, grouping_service):
        """Test stack similarity with no overlap."""
        stack1 = ["func1:file1.py:10"]
        stack2 = ["func2:file2.py:20"]

        similarity = grouping_service._compute_stack_similarity(stack1, stack2)

        assert similarity == 0.0

    def test_compute_stack_similarity_empty(self, grouping_service):
        """Test stack similarity with empty stacks."""
        similarity = grouping_service._compute_stack_similarity([], [])

        assert similarity == 0.0

    def test_compute_message_similarity_identical(self, grouping_service):
        """Test message similarity with identical messages."""
        msg1 = "ValueError: Invalid payment amount"
        msg2 = "ValueError: Invalid payment amount"

        similarity = grouping_service._compute_message_similarity(msg1, msg2)

        assert similarity == 1.0

    def test_compute_message_similarity_similar(self, grouping_service):
        """Test message similarity with similar messages."""
        msg1 = "ValueError: Invalid payment amount"
        msg2 = "ValueError: Invalid payment"

        similarity = grouping_service._compute_message_similarity(msg1, msg2)

        # Should be high but not 1.0
        assert 0.6 < similarity < 1.0

    def test_compute_message_similarity_different(self, grouping_service):
        """Test message similarity with different messages."""
        msg1 = "ValueError: Invalid payment"
        msg2 = "TypeError: Cannot convert string"

        similarity = grouping_service._compute_message_similarity(msg1, msg2)

        # Should be low
        assert similarity < 0.3

    def test_compute_fingerprint_similarity_identical(self, grouping_service):
        """Test fingerprint similarity with identical fingerprints."""
        fp1 = ["ValueError", "process_payment", "line 42"]
        fp2 = ["ValueError", "process_payment", "line 42"]

        similarity = grouping_service._compute_fingerprint_similarity(fp1, fp2)

        assert similarity == 1.0

    def test_compute_fingerprint_similarity_partial(self, grouping_service):
        """Test fingerprint similarity with partial overlap."""
        fp1 = ["ValueError", "process_payment", "line 42"]
        fp2 = ["ValueError", "process_payment"]

        similarity = grouping_service._compute_fingerprint_similarity(fp1, fp2)

        # Jaccard: 2 / 3 = 0.666...
        assert 0.6 < similarity < 0.7

    def test_compute_fingerprint_similarity_no_overlap(self, grouping_service):
        """Test fingerprint similarity with no overlap."""
        fp1 = ["ValueError", "func1"]
        fp2 = ["TypeError", "func2"]

        similarity = grouping_service._compute_fingerprint_similarity(fp1, fp2)

        assert similarity == 0.0

    def test_compute_similarity_scores(
        self, grouping_service, sample_issue_details, sample_similar_issues
    ):
        """Test computing and ranking similarity scores."""
        scored = grouping_service._compute_similarity_scores(
            sample_issue_details, sample_similar_issues
        )

        # Should return ranked list
        assert isinstance(scored, list)
        assert len(scored) <= 10  # Max 10 similar issues

        # Should be sorted by similarity score descending
        if len(scored) > 1:
            assert scored[0]["similarity_score"] >= scored[1]["similarity_score"]

        # Each item should have required fields
        for item in scored:
            assert "issue_id" in item
            assert "similarity_score" in item
            assert "error_message" in item
            assert "event_count" in item
            assert "last_seen" in item

    def test_compute_similarity_scores_filters_below_threshold(
        self, grouping_service, sample_issue_details
    ):
        """Test that low-similarity issues are filtered out."""
        # Create issues with very low similarity
        low_similarity_issues = [
            {
                "id": "99999",
                "title": "Completely different error",
                "fingerprint": ["DifferentError", "different_func"],
                "count": 10,
                "lastSeen": "2025-11-30T12:00:00Z",
                "score": 0.1,  # Very low score
            }
        ]

        scored = grouping_service._compute_similarity_scores(
            sample_issue_details, low_similarity_issues
        )

        # Should filter out issues below threshold
        assert all(
            item["similarity_score"] >= SIMILARITY_MATCH_THRESHOLD for item in scored
        )

    @pytest.mark.asyncio
    async def test_check_undergrouping_detected(self, grouping_service):
        """Test under-grouping detection with high similarity."""
        similar_issues = [
            {
                "issue_id": "12346",
                "similarity_score": 0.85,  # Above threshold
                "error_message": "Similar error",
                "event_count": 30,
            },
            {
                "issue_id": "12347",
                "similarity_score": 0.90,  # Above threshold
                "error_message": "Very similar error",
                "event_count": 20,
            },
        ]

        is_undergrouped, candidates = grouping_service._check_undergrouping(similar_issues)

        assert is_undergrouped is True
        assert len(candidates) == 2
        assert candidates[0]["issue_id"] == "12346"
        assert candidates[0]["similarity"] == 0.85

    @pytest.mark.asyncio
    async def test_check_undergrouping_not_detected(self, grouping_service):
        """Test under-grouping not detected with low similarity."""
        similar_issues = [
            {
                "issue_id": "12346",
                "similarity_score": 0.75,  # Below under-grouping threshold (0.80)
                "error_message": "Similar error",
                "event_count": 30,
            },
        ]

        is_undergrouped, candidates = grouping_service._check_undergrouping(similar_issues)

        assert is_undergrouped is False
        assert len(candidates) == 0

    def test_assess_fingerprint_stability_stable(self, grouping_service):
        """Test fingerprint stability assessment - stable."""
        issue_details = {
            "fingerprint": ["ValueError", "process_payment", "line 42"],
        }

        stability = grouping_service._assess_fingerprint_stability(issue_details)

        assert stability == "stable"

    def test_assess_fingerprint_stability_unstable(self, grouping_service):
        """Test fingerprint stability assessment - unstable with wildcards."""
        issue_details = {
            "fingerprint": ["ValueError", "*"],
        }

        stability = grouping_service._assess_fingerprint_stability(issue_details)

        assert stability == "unstable"

    def test_assess_fingerprint_stability_moderate(self, grouping_service):
        """Test fingerprint stability assessment - moderate."""
        issue_details = {
            "fingerprint": ["ValueError", "func"],
        }

        stability = grouping_service._assess_fingerprint_stability(issue_details)

        assert stability == "moderate"

    def test_assess_fingerprint_stability_unknown(self, grouping_service):
        """Test fingerprint stability assessment - unknown."""
        issue_details = {
            "fingerprint": [],
        }

        stability = grouping_service._assess_fingerprint_stability(issue_details)

        assert stability == "unknown"

    @pytest.mark.asyncio
    async def test_detect_grouping_problems(
        self,
        grouping_service,
        sample_issue,
        sample_issue_details,
    ):
        """Test grouping problem detection."""
        similar_issues = [
            {
                "issue_id": "12346",
                "similarity_score": 0.85,
                "error_message": "Similar error",
                "event_count": 30,
            }
        ]

        health = await grouping_service._detect_grouping_problems(
            sample_issue, sample_issue_details, similar_issues
        )

        assert "is_overgrouped" in health
        assert "is_undergrouped" in health
        assert "confidence" in health
        assert "fingerprint_stability" in health

        # Confidence should be between 0 and 1
        assert 0.0 <= health["confidence"] <= 1.0

    def test_build_grouping_insights(
        self, grouping_service, sample_issue_details
    ):
        """Test building structured grouping insights data."""
        fingerprint_data = {
            "primary_fingerprint": ["ValueError", "process_payment"],
            "grouping_algorithm": "default",
            "has_variants": True,
            "variant_count": 2,
        }

        similar_issues = [
            {
                "issue_id": "12346",
                "similarity_score": 0.85,
                "error_message": "Similar error",
                "event_count": 30,
            }
        ]

        grouping_health = {
            "is_overgrouped": False,
            "is_undergrouped": True,
            "confidence": 0.7,
            "fingerprint_stability": "stable",
        }

        insights = grouping_service._build_grouping_insights(
            fingerprint_data, similar_issues, grouping_health, sample_issue_details
        )

        assert insights["primary_fingerprint"] == ["ValueError", "process_payment"]
        assert insights["grouping_algorithm"] == "default"
        assert len(insights["similar_issues"]) == 1
        assert insights["grouping_health"]["is_undergrouped"] is True
        assert insights["summary"]["similar_issues_count"] == 1
        assert insights["summary"]["has_variants"] is True
        assert "last_fetched" in insights

    @pytest.mark.asyncio
    async def test_enrich_issue_handles_exception(
        self, grouping_service, mock_db, mock_grouping_client, sample_issue
    ):
        """Test that exceptions are handled gracefully."""
        # Mock database query - first call returns issue, second call for _mark_failed
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = sample_issue
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = sample_issue
        mock_db.execute.side_effect = [mock_result1, mock_result2, MagicMock()]

        # Mock Sentry API to raise exception
        mock_grouping_client.get_issue_details.side_effect = Exception("API Error")

        result = await grouping_service.enrich_issue(1)

        assert result["status"] == "error"
        assert "API Error" in result["reason"]

        # Verify failure was marked in database
        # Should have 3 calls: SELECT, SELECT (for _mark_failed), UPDATE
        assert mock_db.execute.call_count >= 2

    def test_update_status(self, grouping_service):
        """Test enrichment status update."""
        current_status = {"other_source": {"status": "completed"}}

        updated = grouping_service._update_status(
            current_status, "grouping_insights", "completed"
        )

        assert "grouping_insights" in updated
        assert updated["grouping_insights"]["status"] == "completed"
        assert "last_attempt" in updated["grouping_insights"]

    def test_update_status_with_error(self, grouping_service):
        """Test enrichment status update with error."""
        current_status = {}

        updated = grouping_service._update_status(
            current_status, "grouping_insights", "failed", error="Test error"
        )

        assert updated["grouping_insights"]["status"] == "failed"
        assert updated["grouping_insights"]["error"] == "Test error"


class TestSimilarityAlgorithms:
    """Test similarity algorithm edge cases."""

    def test_stack_similarity_with_none(self):
        """Test stack similarity handles None values."""
        service = GroupingEnrichmentService(AsyncMock(), AsyncMock())

        similarity = service._compute_stack_similarity(None, ["func:file:1"])
        assert similarity == 0.0

        similarity = service._compute_stack_similarity(["func:file:1"], None)
        assert similarity == 0.0

    def test_message_similarity_with_empty_strings(self):
        """Test message similarity handles empty strings."""
        service = GroupingEnrichmentService(AsyncMock(), AsyncMock())

        similarity = service._compute_message_similarity("", "test")
        assert similarity == 0.0

        similarity = service._compute_message_similarity("test", "")
        assert similarity == 0.0

    def test_fingerprint_similarity_with_non_list(self):
        """Test fingerprint similarity handles non-list fingerprints."""
        service = GroupingEnrichmentService(AsyncMock(), AsyncMock())

        # Should handle string fingerprints
        similarity = service._compute_fingerprint_similarity("error", "error")
        assert similarity == 1.0

        similarity = service._compute_fingerprint_similarity("error1", "error2")
        assert similarity == 0.0


class TestBackgroundJobIntegration:
    """Integration tests for background job patterns."""

    @pytest.mark.asyncio
    async def test_find_similar_issues_api_failure(
        self, grouping_service, mock_grouping_client
    ):
        """Test that API failures return empty list."""
        mock_grouping_client.get_similar_issues.side_effect = Exception("API Error")

        similar = await grouping_service._find_similar_issues("test-org", "12345")

        assert similar == []

    @pytest.mark.asyncio
    async def test_enrich_issue_no_org_slug(self, mock_db, mock_grouping_client):
        """Test enrichment fails gracefully without org_slug."""
        # Create a sample issue without org_slug
        sample_issue = MagicMock()
        sample_issue.id = 1
        sample_issue.sentry_issue_id = "12345"
        sample_issue.context_tags = None  # No org_slug here
        sample_issue.release_context = None  # No org_slug here
        sample_issue.enrichment_status = {}

        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        mock_db.execute.return_value = mock_result

        # Create service with settings that don't have fallback org_slug
        with patch("app.services.enrichment.grouping_enrichment.get_settings") as mock_get_settings:
            mock_settings = MagicMock()
            mock_settings.ENABLE_GROUPING_INSIGHTS = True
            mock_settings.SENTRY_ORG_SLUG = None  # No fallback
            mock_get_settings.return_value = mock_settings

            service = GroupingEnrichmentService(mock_db, mock_grouping_client)
            result = await service.enrich_issue(1)

            assert result["status"] == "error"
            assert "org_slug not found" in result["reason"]
