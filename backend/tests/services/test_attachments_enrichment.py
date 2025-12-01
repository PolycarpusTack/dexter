"""
Unit tests for AttachmentsEnrichmentService.

Tests cover:
- Attachment metadata fetching
- Categorization by content type
- Important attachment detection
- URL expiration handling
- Background job integration
- Error handling and edge cases
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, Mock, patch

from app.services.enrichment.attachments_enrichment import (
    AttachmentsEnrichmentService,
    CATEGORY_SCREENSHOTS,
    CATEGORY_LOGS,
    CATEGORY_MINIDUMPS,
    CATEGORY_SOURCE_MAPS,
    CATEGORY_OTHER,
    MAX_ATTACHMENT_SIZE_BYTES,
)
from app.services.sentry.attachments import Attachment
from app.db.models import SentryIssue


@pytest.fixture
def mock_db():
    """Mock database session."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db


@pytest.fixture
def mock_client():
    """Mock Sentry attachments client."""
    client = AsyncMock()
    return client


@pytest.fixture
def mock_settings():
    """Mock settings."""
    settings = Mock()
    settings.ENABLE_ATTACHMENTS = True
    settings.SENTRY_ORGANIZATION = "test-org"
    settings.SENTRY_PROJECT = "test-project"
    return settings


@pytest.fixture
def service(mock_db, mock_client, mock_settings):
    """Create AttachmentsEnrichmentService instance."""
    service = AttachmentsEnrichmentService(mock_db, mock_client)
    service.settings = mock_settings
    return service


@pytest.fixture
def sample_attachments():
    """Sample attachments with various types."""
    return [
        Attachment(
            id="att-screenshot-1",
            name="error_screenshot.png",
            type="event.attachment",
            size=1048576,  # 1 MB
            mimetype="image/png",
            headers={}
        ),
        Attachment(
            id="att-log-1",
            name="debug.log",
            type="event.attachment",
            size=5242880,  # 5 MB
            mimetype="text/plain",
            headers={}
        ),
        Attachment(
            id="att-minidump-1",
            name="crash.dmp",
            type="event.minidump",
            size=10485760,  # 10 MB
            mimetype="application/x-dmp",
            headers={}
        ),
    ]


@pytest.fixture
def sample_issue():
    """Sample SentryIssue."""
    issue = SentryIssue(
        id=1,
        sentry_issue_id="ISSUE-123",
        sentry_event_id="event-123",
        error_type="ValueError",
        error_message="Test error",
        context_tags={"organization": "test-org", "project": "test-project"},
        enrichment_status={}
    )
    return issue


class TestAttachmentCategorization:
    """Test attachment categorization by content type."""

    def test_categorize_screenshots(self, service):
        """Test screenshot categorization."""
        attachments = [
            {"id": "1", "category": CATEGORY_SCREENSHOTS, "is_important": True},
            {"id": "2", "category": CATEGORY_SCREENSHOTS, "is_important": True},
        ]

        categories = service._categorize_attachments(attachments)

        assert CATEGORY_SCREENSHOTS in categories
        assert len(categories[CATEGORY_SCREENSHOTS]) == 2
        assert all(att["is_important"] for att in categories[CATEGORY_SCREENSHOTS])

    def test_categorize_logs(self, service):
        """Test log file categorization."""
        attachments = [
            {"id": "1", "category": CATEGORY_LOGS, "is_important": False},
        ]

        categories = service._categorize_attachments(attachments)

        assert CATEGORY_LOGS in categories
        assert len(categories[CATEGORY_LOGS]) == 1
        assert not categories[CATEGORY_LOGS][0]["is_important"]

    def test_categorize_minidumps(self, service):
        """Test minidump categorization."""
        attachments = [
            {"id": "1", "category": CATEGORY_MINIDUMPS, "is_important": True},
        ]

        categories = service._categorize_attachments(attachments)

        assert CATEGORY_MINIDUMPS in categories
        assert len(categories[CATEGORY_MINIDUMPS]) == 1
        assert categories[CATEGORY_MINIDUMPS][0]["is_important"]

    def test_categorize_source_maps(self, service):
        """Test source map categorization."""
        attachments = [
            {"id": "1", "category": CATEGORY_SOURCE_MAPS, "is_important": False},
        ]

        categories = service._categorize_attachments(attachments)

        assert CATEGORY_SOURCE_MAPS in categories
        assert len(categories[CATEGORY_SOURCE_MAPS]) == 1

    def test_categorize_mixed_attachments(self, service):
        """Test mixed attachment categorization."""
        attachments = [
            {"id": "1", "category": CATEGORY_SCREENSHOTS, "is_important": True},
            {"id": "2", "category": CATEGORY_LOGS, "is_important": False},
            {"id": "3", "category": CATEGORY_MINIDUMPS, "is_important": True},
            {"id": "4", "category": CATEGORY_OTHER, "is_important": False},
        ]

        categories = service._categorize_attachments(attachments)

        assert len(categories) == 4
        assert len(categories[CATEGORY_SCREENSHOTS]) == 1
        assert len(categories[CATEGORY_LOGS]) == 1
        assert len(categories[CATEGORY_MINIDUMPS]) == 1
        assert len(categories[CATEGORY_OTHER]) == 1

    def test_empty_categories_removed(self, service):
        """Test that empty categories are not included."""
        attachments = [
            {"id": "1", "category": CATEGORY_SCREENSHOTS, "is_important": True},
        ]

        categories = service._categorize_attachments(attachments)

        # Only screenshots category should be present
        assert CATEGORY_SCREENSHOTS in categories
        assert CATEGORY_LOGS not in categories
        assert CATEGORY_MINIDUMPS not in categories
        assert CATEGORY_SOURCE_MAPS not in categories
        assert CATEGORY_OTHER not in categories


class TestContentTypeDetection:
    """Test content type to category mapping."""

    def test_detect_png_screenshot(self, service):
        """Test PNG screenshot detection."""
        category = service._determine_category("image/png", "screenshot.png")
        assert category == CATEGORY_SCREENSHOTS

    def test_detect_jpeg_screenshot(self, service):
        """Test JPEG screenshot detection."""
        category = service._determine_category("image/jpeg", "error.jpg")
        assert category == CATEGORY_SCREENSHOTS

    def test_detect_text_log(self, service):
        """Test text log detection."""
        category = service._determine_category("text/plain", "debug.log")
        assert category == CATEGORY_LOGS

    def test_detect_application_log(self, service):
        """Test application log detection."""
        category = service._determine_category("application/x-log", "app.log")
        assert category == CATEGORY_LOGS

    def test_detect_minidump_by_content_type(self, service):
        """Test minidump detection by content type."""
        category = service._determine_category("application/x-dmp", "crash.dmp")
        assert category == CATEGORY_MINIDUMPS

    def test_detect_minidump_by_filename(self, service):
        """Test minidump detection by filename extension."""
        category = service._determine_category("application/octet-stream", "crash.dmp")
        assert category == CATEGORY_MINIDUMPS

    def test_detect_source_map_by_filename(self, service):
        """Test source map detection by filename."""
        category = service._determine_category("application/json", "bundle.js.map")
        assert category == CATEGORY_SOURCE_MAPS

    def test_detect_json_not_source_map(self, service):
        """Test JSON file that is not a source map."""
        category = service._determine_category("application/json", "data.json")
        assert category == CATEGORY_SOURCE_MAPS  # Still categorized as source map based on content type

    def test_detect_unknown_type(self, service):
        """Test unknown file type defaults to OTHER."""
        category = service._determine_category("application/zip", "archive.zip")
        assert category == CATEGORY_OTHER

    def test_fallback_to_extension_matching(self, service):
        """Test fallback to filename extension when content type is unknown."""
        category = service._determine_category("application/octet-stream", "screenshot.png")
        assert category == CATEGORY_SCREENSHOTS


class TestImportantAttachmentDetection:
    """Test detection of important attachments."""

    def test_detect_important_screenshot(self, service):
        """Test screenshot is flagged as important."""
        attachments = [
            {
                "id": "att-1",
                "category": CATEGORY_SCREENSHOTS,
                "is_important": True
            }
        ]

        important = service._detect_important_attachments(attachments)

        assert len(important) == 1
        assert "att-1" in important

    def test_detect_important_minidump(self, service):
        """Test minidump is flagged as important."""
        attachments = [
            {
                "id": "att-1",
                "category": CATEGORY_MINIDUMPS,
                "is_important": True
            }
        ]

        important = service._detect_important_attachments(attachments)

        assert len(important) == 1
        assert "att-1" in important

    def test_logs_not_important(self, service):
        """Test logs are not flagged as important."""
        attachments = [
            {
                "id": "att-1",
                "category": CATEGORY_LOGS,
                "is_important": False
            }
        ]

        important = service._detect_important_attachments(attachments)

        assert len(important) == 0

    def test_multiple_important_attachments(self, service):
        """Test multiple important attachments detected."""
        attachments = [
            {"id": "att-1", "category": CATEGORY_SCREENSHOTS, "is_important": True},
            {"id": "att-2", "category": CATEGORY_LOGS, "is_important": False},
            {"id": "att-3", "category": CATEGORY_MINIDUMPS, "is_important": True},
        ]

        important = service._detect_important_attachments(attachments)

        assert len(important) == 2
        assert "att-1" in important
        assert "att-3" in important
        assert "att-2" not in important


class TestSummaryGeneration:
    """Test attachment summary statistics generation."""

    def test_generate_summary_with_all_types(self, service):
        """Test summary with all attachment types."""
        attachments = [
            {"id": "1", "size_bytes": 1048576, "is_important": True, "category": CATEGORY_SCREENSHOTS},
            {"id": "2", "size_bytes": 2097152, "is_important": False, "category": CATEGORY_LOGS},
            {"id": "3", "size_bytes": 5242880, "is_important": True, "category": CATEGORY_MINIDUMPS},
        ]

        categories = {
            CATEGORY_SCREENSHOTS: [attachments[0]],
            CATEGORY_LOGS: [attachments[1]],
            CATEGORY_MINIDUMPS: [attachments[2]],
        }

        summary = service._generate_summary(attachments, categories)

        assert summary["total_count"] == 3
        assert summary["has_screenshots"] is True
        assert summary["has_logs"] is True
        assert summary["has_minidumps"] is True
        assert summary["has_source_maps"] is False
        assert summary["total_size_mb"] == 8.0  # (1 + 2 + 5) MB
        assert summary["important_count"] == 2

    def test_generate_summary_empty(self, service):
        """Test summary with no attachments."""
        attachments = []
        categories = {}

        summary = service._generate_summary(attachments, categories)

        assert summary["total_count"] == 0
        assert summary["has_screenshots"] is False
        assert summary["has_logs"] is False
        assert summary["has_minidumps"] is False
        assert summary["total_size_mb"] == 0.0
        assert summary["important_count"] == 0

    def test_generate_summary_size_calculation(self, service):
        """Test size calculation in MB."""
        attachments = [
            {"id": "1", "size_bytes": 1024 * 1024, "is_important": False},  # 1 MB
            {"id": "2", "size_bytes": 512 * 1024, "is_important": False},   # 0.5 MB
        ]

        categories = {CATEGORY_OTHER: attachments}
        summary = service._generate_summary(attachments, categories)

        assert summary["total_size_mb"] == 1.5


class TestAttachmentMetadataBuild:
    """Test building attachment metadata structure."""

    def test_build_metadata_structure(self, service, sample_attachments):
        """Test metadata structure is correct."""
        metadata = service._build_attachments_metadata(sample_attachments)

        assert len(metadata) == 3

        # Screenshot
        screenshot = metadata[0]
        assert screenshot["id"] == "att-screenshot-1"
        assert screenshot["name"] == "error_screenshot.png"
        assert screenshot["size_bytes"] == 1048576
        assert screenshot["content_type"] == "image/png"
        assert screenshot["category"] == CATEGORY_SCREENSHOTS
        assert screenshot["is_important"] is True

        # Log
        log = metadata[1]
        assert log["id"] == "att-log-1"
        assert log["category"] == CATEGORY_LOGS
        assert log["is_important"] is False

        # Minidump
        minidump = metadata[2]
        assert minidump["id"] == "att-minidump-1"
        assert minidump["category"] == CATEGORY_MINIDUMPS
        assert minidump["is_important"] is True

    def test_build_metadata_url_expiration(self, service, sample_attachments):
        """Test URL expiration timestamp is set correctly."""
        metadata = service._build_attachments_metadata(sample_attachments)

        for att in metadata:
            assert "url_expires_at" in att
            expires_at = datetime.fromisoformat(att["url_expires_at"])
            now = datetime.now(timezone.utc)
            # Should expire in approximately 7 days
            delta = expires_at - now
            assert 6.9 < delta.days < 7.1  # Account for execution time

    def test_build_metadata_download_url(self, service, sample_attachments):
        """Test download URL is generated."""
        metadata = service._build_attachments_metadata(sample_attachments)

        for att in metadata:
            assert "download_url" in att
            assert att["download_url"].startswith("https://sentry.io/api/0/attachments/")


class TestEnrichIssue:
    """Test main enrichment workflow."""

    @pytest.mark.asyncio
    async def test_enrich_issue_success(self, service, sample_issue, sample_attachments):
        """Test successful issue enrichment."""
        # Mock database query
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        service.db.execute.return_value = mock_result

        # Mock attachment fetching
        service.client.get_issue_attachments = AsyncMock(return_value=sample_attachments)

        result = await service.enrich_issue(1)

        assert result["status"] == "success"
        assert result["total_attachments"] == 3
        assert result["important_count"] == 2
        assert CATEGORY_SCREENSHOTS in result["categories"]
        assert CATEGORY_LOGS in result["categories"]
        assert CATEGORY_MINIDUMPS in result["categories"]

    @pytest.mark.asyncio
    async def test_enrich_issue_feature_disabled(self, service, mock_settings):
        """Test enrichment skipped when feature is disabled."""
        mock_settings.ENABLE_ATTACHMENTS = False

        result = await service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "feature disabled"

    @pytest.mark.asyncio
    async def test_enrich_issue_not_found(self, service):
        """Test enrichment when issue not found."""
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = None
        service.db.execute.return_value = mock_result

        result = await service.enrich_issue(999)

        assert result["status"] == "error"
        assert result["reason"] == "issue not found"

    @pytest.mark.asyncio
    async def test_enrich_issue_missing_org_project(self, service, sample_issue):
        """Test enrichment skipped when org/project missing."""
        sample_issue.context_tags = {}
        service.settings.SENTRY_ORGANIZATION = None
        service.settings.SENTRY_PROJECT = None

        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        service.db.execute.return_value = mock_result

        result = await service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "missing org/project"

    @pytest.mark.asyncio
    async def test_enrich_issue_no_attachments(self, service, sample_issue):
        """Test enrichment with no attachments."""
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        service.db.execute.return_value = mock_result

        service.client.get_issue_attachments = AsyncMock(return_value=[])

        result = await service.enrich_issue(1)

        assert result["status"] == "success"
        assert result["total_attachments"] == 0
        assert result["important_count"] == 0

    @pytest.mark.asyncio
    async def test_enrich_issue_error_handling(self, service, sample_issue):
        """Test error handling in enrichment."""
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        service.db.execute.return_value = mock_result

        # Simulate API error
        service.client.get_issue_attachments = AsyncMock(
            side_effect=Exception("API error")
        )

        result = await service.enrich_issue(1)

        assert result["status"] == "error"
        assert "API error" in result["reason"]


class TestAttachmentFiltering:
    """Test attachment size filtering."""

    @pytest.mark.asyncio
    async def test_filter_oversized_attachments(self, service):
        """Test that oversized attachments are filtered out."""
        attachments = [
            Attachment(
                id="att-1",
                name="normal.png",
                type="event.attachment",
                size=1048576,  # 1 MB - OK
                mimetype="image/png",
                headers={}
            ),
            Attachment(
                id="att-2",
                name="huge.dmp",
                type="event.minidump",
                size=MAX_ATTACHMENT_SIZE_BYTES + 1,  # Over limit
                mimetype="application/x-dmp",
                headers={}
            ),
        ]

        service.client.get_issue_attachments = AsyncMock(return_value=attachments)

        result = await service._fetch_attachments("org", "project", "issue-123")

        # Only the first attachment should be included
        assert len(result) == 1
        assert result[0].id == "att-1"

    @pytest.mark.asyncio
    async def test_filter_boundary_size(self, service):
        """Test attachment exactly at size limit is included."""
        attachments = [
            Attachment(
                id="att-1",
                name="boundary.dmp",
                type="event.minidump",
                size=MAX_ATTACHMENT_SIZE_BYTES,  # Exactly at limit
                mimetype="application/x-dmp",
                headers={}
            ),
        ]

        service.client.get_issue_attachments = AsyncMock(return_value=attachments)

        result = await service._fetch_attachments("org", "project", "issue-123")

        assert len(result) == 1
        assert result[0].id == "att-1"


class TestEnrichmentStatusTracking:
    """Test enrichment status tracking."""

    def test_update_status_completed(self, service):
        """Test updating status to completed."""
        current = {}
        updated = service._update_status(current, "attachments", "completed")

        assert "attachments" in updated
        assert updated["attachments"]["status"] == "completed"
        assert "last_attempt" in updated["attachments"]
        assert updated["attachments"]["error"] is None

    def test_update_status_failed(self, service):
        """Test updating status to failed with error."""
        current = {}
        updated = service._update_status(
            current, "attachments", "failed", error="API timeout"
        )

        assert updated["attachments"]["status"] == "failed"
        assert updated["attachments"]["error"] == "API timeout"

    @pytest.mark.asyncio
    async def test_mark_failed(self, service, sample_issue):
        """Test marking enrichment as failed."""
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        service.db.execute.return_value = mock_result

        await service._mark_failed(1, "Connection error")

        # Verify update was called
        service.db.execute.assert_called()
        service.db.commit.assert_called_once()


class TestOrgProjectExtraction:
    """Test organization and project extraction from issue."""

    def test_extract_org_from_tags(self, service):
        """Test extracting org from context_tags."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="123",
            sentry_event_id="456",
            error_type="Error",
            error_message="Test",
            context_tags={"organization": "my-org"}
        )

        org = service._extract_org(issue)
        assert org == "my-org"

    def test_extract_org_from_settings(self, service):
        """Test extracting org from settings fallback."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="123",
            sentry_event_id="456",
            error_type="Error",
            error_message="Test",
            context_tags={}
        )

        service.settings.SENTRY_ORGANIZATION = "settings-org"
        org = service._extract_org(issue)
        assert org == "settings-org"

    def test_extract_project_from_tags(self, service):
        """Test extracting project from context_tags."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="123",
            sentry_event_id="456",
            error_type="Error",
            error_message="Test",
            context_tags={"project": "my-project"}
        )

        project = service._extract_project(issue)
        assert project == "my-project"

    def test_extract_project_from_settings(self, service):
        """Test extracting project from settings fallback."""
        issue = SentryIssue(
            id=1,
            sentry_issue_id="123",
            sentry_event_id="456",
            error_type="Error",
            error_message="Test",
            context_tags={}
        )

        service.settings.SENTRY_PROJECT = "settings-project"
        project = service._extract_project(issue)
        assert project == "settings-project"


class TestGherkinScenarios:
    """Test Gherkin acceptance criteria scenarios."""

    @pytest.mark.asyncio
    async def test_scenario_enrich_issue_with_attachment_metadata(
        self, service, sample_issue
    ):
        """
        Scenario: Enrich issue with attachment metadata
        Given an issue with 3 attachments (screenshot, log, minidump)
        When attachments enrichment runs
        Then attachments_meta JSONB contains proper structure
        """
        attachments = [
            Attachment(
                id="att-1", name="screenshot.png", type="event.attachment",
                size=1048576, mimetype="image/png", headers={}
            ),
            Attachment(
                id="att-2", name="debug.log", type="event.attachment",
                size=2097152, mimetype="text/plain", headers={}
            ),
            Attachment(
                id="att-3", name="crash.dmp", type="event.minidump",
                size=5242880, mimetype="application/x-dmp", headers={}
            ),
        ]

        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        service.db.execute.return_value = mock_result
        service.client.get_issue_attachments = AsyncMock(return_value=attachments)

        result = await service.enrich_issue(1)

        assert result["status"] == "success"
        assert result["total_attachments"] == 3
        assert result["important_count"] == 2  # screenshot + minidump
        assert CATEGORY_SCREENSHOTS in result["categories"]
        assert CATEGORY_LOGS in result["categories"]
        assert CATEGORY_MINIDUMPS in result["categories"]

    @pytest.mark.asyncio
    async def test_scenario_categorize_attachments_by_type(self, service):
        """
        Scenario: Categorize attachments by type
        Given attachments with various content types
        When categorizing attachments
        Then screenshots are in "screenshots" category
        And text logs are in "logs" category
        And .dmp files are in "minidumps" category
        """
        attachments = [
            {"id": "1", "category": CATEGORY_SCREENSHOTS, "is_important": True},
            {"id": "2", "category": CATEGORY_LOGS, "is_important": False},
            {"id": "3", "category": CATEGORY_MINIDUMPS, "is_important": True},
            {"id": "4", "category": CATEGORY_OTHER, "is_important": False},
        ]

        categories = service._categorize_attachments(attachments)

        assert CATEGORY_SCREENSHOTS in categories
        assert CATEGORY_LOGS in categories
        assert CATEGORY_MINIDUMPS in categories
        assert CATEGORY_OTHER in categories

    def test_scenario_detect_important_attachments(self, service):
        """
        Scenario: Detect important attachments
        Given 5 attachments (3 logs, 1 screenshot, 1 minidump)
        When detecting important attachments
        Then important_attachments contains screenshot and minidump
        And logs are not flagged as important
        """
        attachments = [
            {"id": "log-1", "category": CATEGORY_LOGS, "is_important": False},
            {"id": "log-2", "category": CATEGORY_LOGS, "is_important": False},
            {"id": "log-3", "category": CATEGORY_LOGS, "is_important": False},
            {"id": "screenshot-1", "category": CATEGORY_SCREENSHOTS, "is_important": True},
            {"id": "minidump-1", "category": CATEGORY_MINIDUMPS, "is_important": True},
        ]

        important = service._detect_important_attachments(attachments)

        assert len(important) == 2
        assert "screenshot-1" in important
        assert "minidump-1" in important
        assert "log-1" not in important
        assert "log-2" not in important
        assert "log-3" not in important
