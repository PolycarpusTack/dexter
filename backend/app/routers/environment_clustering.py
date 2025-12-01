"""
Environment Clustering Endpoints (EPIC G).

Provides API endpoints for tag-based environment clustering and
environment-specific breakage detection.
"""

import logging
from collections import defaultdict
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import SentryIssue
from app.db.repositories.issues import IssueRepository

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/environment",
    tags=["environment-clustering"],
)


class EnvironmentClusterSummary(BaseModel):
    """Summary of issues in an environment cluster."""

    total_issues: int
    env_specific_issues: int
    env_specific_percentage: float
    severity_breakdown: Dict[str, int]
    sample_issues: List[Dict[str, Any]]


class EnvironmentClustersResponse(BaseModel):
    """Response for environment clusters endpoint."""

    clusters: Dict[str, EnvironmentClusterSummary]
    total_issues: int
    environment_count: int
    environment_filter: Optional[str]


class TagAnalysisResponse(BaseModel):
    """Detailed tag analysis for an issue."""

    issue_id: int
    has_tag_data: bool
    environment_analysis: Optional[Dict[str, Any]]
    breakage_flags: Optional[Dict[str, Any]]
    top_tags: Optional[List[Dict[str, Any]]]
    last_fetched: Optional[str]
    message: Optional[str]


@router.get("/clusters", response_model=EnvironmentClustersResponse)
async def get_environment_clusters(
    environment: Optional[str] = Query(None, description="Filter by environment"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get issues clustered by environment.

    Returns environment-specific breakage statistics and clustering analysis.

    Args:
        environment: Optional filter for specific environment (e.g., "production", "staging")

    Returns:
        Environment clusters with breakage flags and statistics
    """
    settings = get_settings()
    if not settings.ENABLE_TAG_DISTRIBUTIONS:
        raise HTTPException(
            status_code=503,
            detail="Tag distributions feature is disabled"
        )

    # Build query for issues with tag_distributions
    query = select(SentryIssue).where(
        SentryIssue.tag_distributions.isnot(None)
    )

    # Filter by environment if specified
    if environment:
        # JSONB query to filter by dominant environment
        query = query.where(
            func.jsonb_extract_path_text(
                SentryIssue.tag_distributions,
                "environment_analysis",
                "dominant_environment"
            ) == environment
        )

    result = await db.execute(query.limit(100))
    issues = result.scalars().all()

    if not issues:
        return EnvironmentClustersResponse(
            clusters={},
            total_issues=0,
            environment_count=0,
            environment_filter=environment
        )

    # Group by environment
    clusters = defaultdict(lambda: {
        "issues": [],
        "env_specific_count": 0,
        "total_count": 0,
        "severity_breakdown": {"high": 0, "medium": 0, "low": 0}
    })

    for issue in issues:
        tag_dist = issue.tag_distributions or {}
        env_analysis = tag_dist.get("environment_analysis", {})
        breakage_flags = tag_dist.get("breakage_flags", {})

        dominant_env = env_analysis.get("dominant_environment", "unknown")

        # Add issue to cluster
        clusters[dominant_env]["issues"].append({
            "id": issue.id,
            "error_type": issue.error_type,
            "error_message": issue.error_message[:200] if issue.error_message else "",
            "is_env_specific": breakage_flags.get("is_env_specific", False),
            "specific_environment": breakage_flags.get("specific_environment"),
            "concentration_percentage": breakage_flags.get("concentration_percentage"),
        })

        clusters[dominant_env]["total_count"] += 1

        # Count environment-specific issues
        if breakage_flags.get("is_env_specific"):
            clusters[dominant_env]["env_specific_count"] += 1

            # Track severity
            severity = breakage_flags.get("severity", "low")
            if severity in clusters[dominant_env]["severity_breakdown"]:
                clusters[dominant_env]["severity_breakdown"][severity] += 1

    # Build response
    cluster_summary = {}
    for env, data in clusters.items():
        cluster_summary[env] = EnvironmentClusterSummary(
            total_issues=data["total_count"],
            env_specific_issues=data["env_specific_count"],
            env_specific_percentage=round(
                (data["env_specific_count"] / data["total_count"] * 100)
                if data["total_count"] > 0 else 0,
                2
            ),
            severity_breakdown=data["severity_breakdown"],
            sample_issues=data["issues"][:10]  # First 10 for preview
        )

    return EnvironmentClustersResponse(
        clusters=cluster_summary,
        total_issues=len(issues),
        environment_count=len(clusters),
        environment_filter=environment
    )


@router.get("/issues/{issue_id}/tag-analysis", response_model=TagAnalysisResponse)
async def get_issue_tag_analysis(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed tag analysis for a specific issue.

    Returns tag distributions, environment clustering, and breakage flags.

    Args:
        issue_id: Database ID of the issue

    Returns:
        Detailed tag analysis including environment-specific breakage detection
    """
    settings = get_settings()
    if not settings.ENABLE_TAG_DISTRIBUTIONS:
        raise HTTPException(
            status_code=503,
            detail="Tag distributions feature is disabled"
        )

    repo = IssueRepository(db)
    issue = await repo.get_by_id(issue_id)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if not issue.tag_distributions:
        return TagAnalysisResponse(
            issue_id=issue_id,
            has_tag_data=False,
            environment_analysis=None,
            breakage_flags=None,
            top_tags=None,
            last_fetched=None,
            message="No tag distribution data available for this issue"
        )

    tag_dist = issue.tag_distributions
    env_analysis = tag_dist.get("environment_analysis", {})
    breakage_flags = tag_dist.get("breakage_flags", {})
    top_tags = tag_dist.get("top_tags", [])

    return TagAnalysisResponse(
        issue_id=issue_id,
        has_tag_data=True,
        environment_analysis={
            "dominant_environment": env_analysis.get("dominant_environment"),
            "dominant_device": env_analysis.get("dominant_device"),
            "dominant_browser": env_analysis.get("dominant_browser"),
            "environment_distribution": env_analysis.get("environments", {}),
            "device_distribution": env_analysis.get("devices", {}),
            "browser_distribution": env_analysis.get("browsers", {}),
        },
        breakage_flags={
            "is_env_specific": breakage_flags.get("is_env_specific", False),
            "specific_environment": breakage_flags.get("specific_environment"),
            "concentration_percentage": breakage_flags.get("concentration_percentage"),
            "severity": breakage_flags.get("severity"),
        },
        top_tags=top_tags[:10],  # Top 10 tags
        last_fetched=tag_dist.get("last_fetched"),
        message=None
    )


@router.post("/enrich/{issue_id}")
async def enrich_issue_tags(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger tag enrichment for a specific issue.

    Fetches tag distributions from Sentry and updates the issue.

    Args:
        issue_id: Database ID of the issue

    Returns:
        Enrichment status
    """
    settings = get_settings()
    if not settings.ENABLE_TAG_DISTRIBUTIONS:
        raise HTTPException(
            status_code=503,
            detail="Tag distributions feature is disabled"
        )

    from app.services.enrichment.tag_enrichment import get_tag_enrichment_service

    service = await get_tag_enrichment_service(db)
    result = await service.enrich_issue(issue_id)

    if result["status"] == "error":
        raise HTTPException(
            status_code=500,
            detail=f"Enrichment failed: {result.get('reason')}"
        )

    return result
