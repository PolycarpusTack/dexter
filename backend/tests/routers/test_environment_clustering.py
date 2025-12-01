"""
Tests for Environment Clustering Router (EPIC G).

Tests:
- GET /environment/clusters
- GET /environment/issues/{issue_id}/tag-analysis
- POST /environment/enrich/{issue_id}
"""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import status

from app.db.models import SentryIssue


@pytest.fixture
async def issues_with_env_data(db_session):
    """Create issues with environment tag distributions."""
    issues = [
        SentryIssue(
            sentry_issue_id="ISSUE-PROD-1",
            sentry_event_id="event-prod-1",
            error_type="ValueError",
            error_message="Production error",
            platform="python",
            tag_distributions={
                "environment_analysis": {
                    "dominant_environment": "production",
                    "environments": {"production": 95, "staging": 5}
                },
                "breakage_flags": {
                    "is_env_specific": True,
                    "specific_environment": "production",
                    "concentration_percentage": 95.0,
                    "severity": "high"
                },
                "top_tags": [
                    {"tag": "environment", "unique_values": 2}
                ]
            }
        ),
        SentryIssue(
            sentry_issue_id="ISSUE-PROD-2",
            sentry_event_id="event-prod-2",
            error_type="TypeError",
            error_message="Another production error",
            platform="python",
            tag_distributions={
                "environment_analysis": {
                    "dominant_environment": "production",
                    "environments": {"production": 60, "staging": 40}
                },
                "breakage_flags": {
                    "is_env_specific": False
                },
                "top_tags": []
            }
        ),
        SentryIssue(
            sentry_issue_id="ISSUE-STAGING-1",
            sentry_event_id="event-staging-1",
            error_type="RuntimeError",
            error_message="Staging error",
            platform="javascript",
            tag_distributions={
                "environment_analysis": {
                    "dominant_environment": "staging",
                    "environments": {"staging": 88, "dev": 12}
                },
                "breakage_flags": {
                    "is_env_specific": True,
                    "specific_environment": "staging",
                    "concentration_percentage": 88.0,
                    "severity": "medium"
                },
                "top_tags": []
            }
        ),
    ]

    for issue in issues:
        db_session.add(issue)
    await db_session.commit()

    for issue in issues:
        await db_session.refresh(issue)

    return issues


@pytest.mark.asyncio
async def test_get_environment_clusters_all(
    client,
    db_session,
    issues_with_env_data
):
    """Test getting all environment clusters."""
    with patch("app.routers.environment_clustering.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

        response = await client.get("/api/v1/environment/clusters")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["total_issues"] == 3
        assert data["environment_count"] == 2
        assert "production" in data["clusters"]
        assert "staging" in data["clusters"]

        # Check production cluster
        prod_cluster = data["clusters"]["production"]
        assert prod_cluster["total_issues"] == 2
        assert prod_cluster["env_specific_issues"] == 1  # Only ISSUE-PROD-1
        assert prod_cluster["severity_breakdown"]["high"] == 1

        # Check staging cluster
        staging_cluster = data["clusters"]["staging"]
        assert staging_cluster["total_issues"] == 1
        assert staging_cluster["env_specific_issues"] == 1
        assert staging_cluster["severity_breakdown"]["medium"] == 1


@pytest.mark.asyncio
async def test_get_environment_clusters_filtered(
    client,
    db_session,
    issues_with_env_data
):
    """Test getting environment clusters filtered by environment."""
    with patch("app.routers.environment_clustering.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

        response = await client.get("/api/v1/environment/clusters?environment=production")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["total_issues"] == 2  # Only production issues
        assert data["environment_count"] == 1
        assert "production" in data["clusters"]
        assert "staging" not in data["clusters"]
        assert data["environment_filter"] == "production"


@pytest.mark.asyncio
async def test_get_environment_clusters_empty(
    client,
    db_session
):
    """Test getting environment clusters when no issues have tag data."""
    with patch("app.routers.environment_clustering.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

        response = await client.get("/api/v1/environment/clusters")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["total_issues"] == 0
        assert data["environment_count"] == 0
        assert data["clusters"] == {}


@pytest.mark.asyncio
async def test_get_environment_clusters_feature_disabled(
    client,
    db_session,
    issues_with_env_data
):
    """Test endpoint returns 503 when feature is disabled."""
    with patch("app.routers.environment_clustering.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = False

        response = await client.get("/api/v1/environment/clusters")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert "disabled" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_issue_tag_analysis_success(
    client,
    db_session,
    issues_with_env_data
):
    """Test getting detailed tag analysis for an issue."""
    issue = issues_with_env_data[0]  # Production issue with env-specific breakage

    with patch("app.routers.environment_clustering.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

        response = await client.get(f"/api/v1/environment/issues/{issue.id}/tag-analysis")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["issue_id"] == issue.id
        assert data["has_tag_data"] is True

        # Check environment analysis
        env_analysis = data["environment_analysis"]
        assert env_analysis["dominant_environment"] == "production"
        assert env_analysis["environment_distribution"]["production"] == 95

        # Check breakage flags
        breakage = data["breakage_flags"]
        assert breakage["is_env_specific"] is True
        assert breakage["specific_environment"] == "production"
        assert breakage["concentration_percentage"] == 95.0
        assert breakage["severity"] == "high"


@pytest.mark.asyncio
async def test_get_issue_tag_analysis_no_data(
    client,
    db_session
):
    """Test tag analysis for issue without tag data."""
    # Create issue without tag_distributions
    issue = SentryIssue(
        sentry_issue_id="ISSUE-NO-TAGS",
        sentry_event_id="event-no-tags",
        error_type="ValueError",
        error_message="Error without tags",
        platform="python"
    )
    db_session.add(issue)
    await db_session.commit()
    await db_session.refresh(issue)

    with patch("app.routers.environment_clustering.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

        response = await client.get(f"/api/v1/environment/issues/{issue.id}/tag-analysis")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["issue_id"] == issue.id
        assert data["has_tag_data"] is False
        assert data["message"] == "No tag distribution data available for this issue"


@pytest.mark.asyncio
async def test_get_issue_tag_analysis_not_found(
    client,
    db_session
):
    """Test tag analysis for non-existent issue."""
    with patch("app.routers.environment_clustering.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

        response = await client.get("/api/v1/environment/issues/99999/tag-analysis")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
async def test_enrich_issue_tags_success(
    client,
    db_session,
    issues_with_env_data
):
    """Test triggering tag enrichment for an issue."""
    issue = issues_with_env_data[0]

    mock_service = AsyncMock()
    mock_service.enrich_issue = AsyncMock(return_value={
        "status": "success",
        "tags_count": 5,
        "env_specific": True
    })

    with patch("app.routers.environment_clustering.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

        with patch(
            "app.routers.environment_clustering.get_tag_enrichment_service",
            return_value=mock_service
        ):
            response = await client.post(f"/api/v1/environment/enrich/{issue.id}")

            assert response.status_code == status.HTTP_200_OK
            data = response.json()

            assert data["status"] == "success"
            assert data["tags_count"] == 5
            assert data["env_specific"] is True


@pytest.mark.asyncio
async def test_enrich_issue_tags_error(
    client,
    db_session,
    issues_with_env_data
):
    """Test enrichment endpoint handles errors."""
    issue = issues_with_env_data[0]

    mock_service = AsyncMock()
    mock_service.enrich_issue = AsyncMock(return_value={
        "status": "error",
        "reason": "API connection failed"
    })

    with patch("app.routers.environment_clustering.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = True

        with patch(
            "app.routers.environment_clustering.get_tag_enrichment_service",
            return_value=mock_service
        ):
            response = await client.post(f"/api/v1/environment/enrich/{issue.id}")

            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert "API connection failed" in response.json()["detail"]


@pytest.mark.asyncio
async def test_enrich_issue_tags_feature_disabled(
    client,
    db_session,
    issues_with_env_data
):
    """Test enrichment endpoint when feature is disabled."""
    issue = issues_with_env_data[0]

    with patch("app.routers.environment_clustering.get_settings") as mock_settings:
        mock_settings.return_value.ENABLE_TAG_DISTRIBUTIONS = False

        response = await client.post(f"/api/v1/environment/enrich/{issue.id}")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
