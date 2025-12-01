"""
Tests for Tag Enrichment Service (EPIC G).

Tests:
- Tag distribution fetching from Sentry
- Environment clustering analysis
- Environment-specific breakage detection
- PII scrubbing of tag values
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.enrichment.tag_enrichment import TagEnrichmentService
from app.services.sentry.tags import TagClient, TagDistribution, TagValue
from app.db.models import SentryIssue


@pytest.fixture
def mock_tag_client():
    """Mock TagClient for testing."""
    client = MagicMock(spec=TagClient)
    client.get_tag_distributions = AsyncMock()
    return client


@pytest.fixture
def mock_pii_scrubber():
    """Mock PII scrubber."""
    scrubber = MagicMock()
    scrubber.scrub_dict = lambda x: x  # Pass-through for simplicity
    return scrubber


@pytest.fixture
def sample_tag_distributions():
    """Sample tag distributions for testing."""
    return [
        TagDistribution(
            tag_key="environment",
            unique_count=2,
            top_values=[
                TagValue(key="environment", value="production", count=85),
                TagValue(key="environment", value="staging", count=15),
            ]
        ),
        TagDistribution(
            tag_key="browser",
            unique_count=3,
            top_values=[
                TagValue(key="browser", value="Chrome", count=50),
                TagValue(key="browser", value="Firefox", count=30),
                TagValue(key="browser", value="Safari", count=20),
            ]
        ),
        TagDistribution(
            tag_key="device",
            unique_count=2,
            top_values=[
                TagValue(key="device", value="Desktop", count=70),
                TagValue(key="device", value="Mobile", count=30),
            ]
        ),
    ]


@pytest.fixture
async def sample_issue(db_session: AsyncSession):
    """Create a sample issue for testing."""
    issue = SentryIssue(
        sentry_issue_id="SENTRY-123",
        sentry_event_id="event-123",
        error_type="ValueError",
        error_message="Test error",
        platform="python",
        level="error"
    )
    db_session.add(issue)
    await db_session.commit()
    await db_session.refresh(issue)
    return issue


@pytest.mark.asyncio
async def test_enrich_issue_success(
    db_session: AsyncSession,
    mock_tag_client,
    mock_pii_scrubber,
    sample_issue,
    sample_tag_distributions
):
    """Test successful issue enrichment with tag distributions."""
    # Setup
    mock_tag_client.get_tag_distributions.return_value = sample_tag_distributions

    with patch("app.services.enrichment.tag_enrichment.get_pii_scrubber", return_value=mock_pii_scrubber):
        with patch("app.services.enrichment.tag_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

            service = TagEnrichmentService(db_session, mock_tag_client)

            # Execute
            result = await service.enrich_issue(sample_issue.id)

            # Assert
            assert result["status"] == "success"
            assert result["tags_count"] == 3
            assert result["env_specific"] is True  # 85% in production

            # Verify database update
            await db_session.refresh(sample_issue)
            assert sample_issue.tag_distributions is not None
            assert "environment_analysis" in sample_issue.tag_distributions
            assert "breakage_flags" in sample_issue.tag_distributions


@pytest.mark.asyncio
async def test_environment_clustering_analysis(
    db_session: AsyncSession,
    mock_tag_client,
    mock_pii_scrubber,
    sample_tag_distributions
):
    """Test environment clustering analysis."""
    with patch("app.services.enrichment.tag_enrichment.get_pii_scrubber", return_value=mock_pii_scrubber):
        with patch("app.services.enrichment.tag_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

            service = TagEnrichmentService(db_session, mock_tag_client)

            # Execute
            env_analysis = service._analyze_environment_clustering(sample_tag_distributions)

            # Assert
            assert env_analysis["dominant_environment"] == "production"
            assert env_analysis["dominant_device"] == "Desktop"
            assert env_analysis["dominant_browser"] == "Chrome"
            assert env_analysis["environments"]["production"] == 85
            assert env_analysis["environments"]["staging"] == 15


@pytest.mark.asyncio
async def test_detect_env_specific_breakage_high_severity(
    db_session: AsyncSession,
    mock_tag_client,
    mock_pii_scrubber
):
    """Test detection of high severity environment-specific breakage (>95%)."""
    # Create tag distribution with 98% in production
    tag_data = [
        TagDistribution(
            tag_key="environment",
            unique_count=2,
            top_values=[
                TagValue(key="environment", value="production", count=98),
                TagValue(key="environment", value="staging", count=2),
            ]
        )
    ]

    with patch("app.services.enrichment.tag_enrichment.get_pii_scrubber", return_value=mock_pii_scrubber):
        with patch("app.services.enrichment.tag_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

            service = TagEnrichmentService(db_session, mock_tag_client)

            # Execute
            breakage = service._detect_env_specific_breakage(tag_data)

            # Assert
            assert breakage["is_env_specific"] is True
            assert breakage["specific_environment"] == "production"
            assert breakage["concentration_percentage"] == 98.0
            assert breakage["severity"] == "high"


@pytest.mark.asyncio
async def test_detect_env_specific_breakage_medium_severity(
    db_session: AsyncSession,
    mock_tag_client,
    mock_pii_scrubber
):
    """Test detection of medium severity environment-specific breakage (80-95%)."""
    # Create tag distribution with 85% in production
    tag_data = [
        TagDistribution(
            tag_key="environment",
            unique_count=2,
            top_values=[
                TagValue(key="environment", value="production", count=85),
                TagValue(key="environment", value="staging", count=15),
            ]
        )
    ]

    with patch("app.services.enrichment.tag_enrichment.get_pii_scrubber", return_value=mock_pii_scrubber):
        with patch("app.services.enrichment.tag_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

            service = TagEnrichmentService(db_session, mock_tag_client)

            # Execute
            breakage = service._detect_env_specific_breakage(tag_data)

            # Assert
            assert breakage["is_env_specific"] is True
            assert breakage["specific_environment"] == "production"
            assert breakage["concentration_percentage"] == 85.0
            assert breakage["severity"] == "medium"


@pytest.mark.asyncio
async def test_no_env_specific_breakage(
    db_session: AsyncSession,
    mock_tag_client,
    mock_pii_scrubber
):
    """Test when there's no environment-specific breakage (evenly distributed)."""
    # Create evenly distributed tag data
    tag_data = [
        TagDistribution(
            tag_key="environment",
            unique_count=3,
            top_values=[
                TagValue(key="environment", value="production", count=40),
                TagValue(key="environment", value="staging", count=35),
                TagValue(key="environment", value="dev", count=25),
            ]
        )
    ]

    with patch("app.services.enrichment.tag_enrichment.get_pii_scrubber", return_value=mock_pii_scrubber):
        with patch("app.services.enrichment.tag_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

            service = TagEnrichmentService(db_session, mock_tag_client)

            # Execute
            breakage = service._detect_env_specific_breakage(tag_data)

            # Assert
            assert breakage["is_env_specific"] is False


@pytest.mark.asyncio
async def test_build_tag_distributions(
    db_session: AsyncSession,
    mock_tag_client,
    mock_pii_scrubber,
    sample_tag_distributions
):
    """Test building structured tag distributions."""
    env_analysis = {
        "dominant_environment": "production",
        "environments": {"production": 85, "staging": 15}
    }
    breakage = {
        "is_env_specific": True,
        "severity": "medium"
    }

    with patch("app.services.enrichment.tag_enrichment.get_pii_scrubber", return_value=mock_pii_scrubber):
        with patch("app.services.enrichment.tag_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

            service = TagEnrichmentService(db_session, mock_tag_client)

            # Execute
            result = service._build_tag_distributions(
                sample_tag_distributions,
                env_analysis,
                breakage
            )

            # Assert
            assert "top_tags" in result
            assert len(result["top_tags"]) == 3
            assert result["environment_analysis"] == env_analysis
            assert result["breakage_flags"] == breakage
            assert "last_fetched" in result


@pytest.mark.asyncio
async def test_enrich_issue_feature_disabled(
    db_session: AsyncSession,
    mock_tag_client,
    mock_pii_scrubber,
    sample_issue
):
    """Test enrichment skips when feature is disabled."""
    with patch("app.services.enrichment.tag_enrichment.get_pii_scrubber", return_value=mock_pii_scrubber):
        with patch("app.services.enrichment.tag_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = False

            service = TagEnrichmentService(db_session, mock_tag_client)

            # Execute
            result = await service.enrich_issue(sample_issue.id)

            # Assert
            assert result["status"] == "skipped"
            assert result["reason"] == "feature disabled"


@pytest.mark.asyncio
async def test_enrich_issue_not_found(
    db_session: AsyncSession,
    mock_tag_client,
    mock_pii_scrubber
):
    """Test enrichment with non-existent issue."""
    with patch("app.services.enrichment.tag_enrichment.get_pii_scrubber", return_value=mock_pii_scrubber):
        with patch("app.services.enrichment.tag_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

            service = TagEnrichmentService(db_session, mock_tag_client)

            # Execute
            result = await service.enrich_issue(99999)

            # Assert
            assert result["status"] == "error"
            assert result["reason"] == "issue not found"


@pytest.mark.asyncio
async def test_enrich_issue_api_error(
    db_session: AsyncSession,
    mock_tag_client,
    mock_pii_scrubber,
    sample_issue
):
    """Test enrichment handles API errors gracefully."""
    # Setup API to raise error
    mock_tag_client.get_tag_distributions.side_effect = Exception("API Error")

    with patch("app.services.enrichment.tag_enrichment.get_pii_scrubber", return_value=mock_pii_scrubber):
        with patch("app.services.enrichment.tag_enrichment.get_settings") as mock_settings:
            mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

            service = TagEnrichmentService(db_session, mock_tag_client)

            # Execute
            result = await service.enrich_issue(sample_issue.id)

            # Assert
            assert result["status"] == "error"
            assert "API Error" in result["reason"]

            # Verify enrichment_status was updated
            await db_session.refresh(sample_issue)
            assert sample_issue.enrichment_status.get("tag_distributions", {}).get("status") == "failed"
