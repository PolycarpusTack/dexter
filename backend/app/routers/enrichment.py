"""
Enrichment API endpoints.

Provides manual and batch enrichment endpoints for all 11 enrichment sources.
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.enrichment.performance_enrichment import (
    get_performance_enrichment_service,
    PerformanceEnrichmentService
)
from app.services.enrichment.signal_computation import (
    compute_performance_impact_score,
    compute_n_plus_one_severity_score,
    compute_composite_performance_score
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/enrichment", tags=["enrichment"])


class EnrichmentResponse(BaseModel):
    """Response model for enrichment operations."""
    status: str
    issue_id: int
    enrichment_type: str
    details: Dict[str, Any]


class PerformanceScoreResponse(BaseModel):
    """Response model for performance score computation."""
    issue_id: int
    performance_impact_score: float | None
    n_plus_one_severity_score: float | None
    composite_performance_score: float | None


@router.post(
    "/performance/{issue_id}",
    response_model=EnrichmentResponse,
    summary="Enrich issue with performance data",
    description="Fetch and analyze performance spans for an issue"
)
async def enrich_performance(
    issue_id: int = Path(..., description="Database ID of the issue to enrich"),
    db: AsyncSession = Depends(get_db),
    service: PerformanceEnrichmentService = Depends(get_performance_enrichment_service)
) -> EnrichmentResponse:
    """
    Enrich issue with performance span data.

    This endpoint:
    1. Fetches performance spans from Sentry
    2. Detects slow DB queries (>1s)
    3. Detects N+1 patterns (5+ similar queries)
    4. Detects slow HTTP requests (>3s)
    5. Computes performance impact scores
    6. Integrates with existing analyzers
    7. Scrubs PII before storage

    Args:
        issue_id: Database ID of the issue
        db: Database session
        service: Performance enrichment service

    Returns:
        EnrichmentResponse with status and details

    Raises:
        HTTPException: If enrichment fails
    """
    try:
        result = await service.enrich_issue(issue_id)

        if result["status"] == "error":
            raise HTTPException(
                status_code=500,
                detail=f"Performance enrichment failed: {result.get('reason', 'Unknown error')}"
            )

        return EnrichmentResponse(
            status=result["status"],
            issue_id=issue_id,
            enrichment_type="performance_spans",
            details=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Performance enrichment failed for issue {issue_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Performance enrichment failed: {str(e)}"
        )


@router.get(
    "/performance/{issue_id}/scores",
    response_model=PerformanceScoreResponse,
    summary="Get performance scores",
    description="Compute performance impact scores for an enriched issue"
)
async def get_performance_scores(
    issue_id: int = Path(..., description="Database ID of the issue"),
    db: AsyncSession = Depends(get_db)
) -> PerformanceScoreResponse:
    """
    Compute performance scores for an issue.

    Requires that the issue has been enriched with performance data first.

    Args:
        issue_id: Database ID of the issue
        db: Database session

    Returns:
        PerformanceScoreResponse with computed scores

    Raises:
        HTTPException: If score computation fails
    """
    try:
        impact_score = await compute_performance_impact_score(db, issue_id)
        n_plus_one_score = await compute_n_plus_one_severity_score(db, issue_id)
        composite_score = await compute_composite_performance_score(db, issue_id)

        return PerformanceScoreResponse(
            issue_id=issue_id,
            performance_impact_score=impact_score,
            n_plus_one_severity_score=n_plus_one_score,
            composite_performance_score=composite_score
        )

    except Exception as e:
        logger.error(f"Score computation failed for issue {issue_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Score computation failed: {str(e)}"
        )


@router.post(
    "/batch/performance",
    summary="Batch enrich performance data",
    description="Enrich multiple issues with performance data"
)
async def batch_enrich_performance(
    issue_ids: list[int],
    db: AsyncSession = Depends(get_db),
    service: PerformanceEnrichmentService = Depends(get_performance_enrichment_service)
) -> Dict[str, Any]:
    """
    Batch enrich multiple issues with performance data.

    Args:
        issue_ids: List of database IDs to enrich
        db: Database session
        service: Performance enrichment service

    Returns:
        Dict with batch results

    Raises:
        HTTPException: If batch enrichment fails
    """
    if len(issue_ids) > 100:
        raise HTTPException(
            status_code=400,
            detail="Maximum 100 issues per batch request"
        )

    results = {
        "total": len(issue_ids),
        "success": 0,
        "failed": 0,
        "skipped": 0,
        "details": []
    }

    for issue_id in issue_ids:
        try:
            result = await service.enrich_issue(issue_id)

            if result["status"] == "success":
                results["success"] += 1
            elif result["status"] == "skipped":
                results["skipped"] += 1
            else:
                results["failed"] += 1

            results["details"].append({
                "issue_id": issue_id,
                "status": result["status"],
                "reason": result.get("reason")
            })

        except Exception as e:
            logger.error(f"Batch enrichment failed for issue {issue_id}: {e}")
            results["failed"] += 1
            results["details"].append({
                "issue_id": issue_id,
                "status": "error",
                "reason": str(e)
            })

    return results


@router.get(
    "/status/{issue_id}",
    summary="Get enrichment status",
    description="Get the current enrichment status for all sources"
)
async def get_enrichment_status(
    issue_id: int = Path(..., description="Database ID of the issue"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get enrichment status for all sources.

    Args:
        issue_id: Database ID of the issue
        db: Database session

    Returns:
        Dict with enrichment status for each source

    Raises:
        HTTPException: If issue not found
    """
    from sqlalchemy import select
    from app.db.models import SentryIssue

    try:
        result = await db.execute(
            select(SentryIssue).where(SentryIssue.id == issue_id)
        )
        issue = result.scalar_one_or_none()

        if not issue:
            raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found")

        return {
            "issue_id": issue_id,
            "enrichment_status": issue.enrichment_status or {},
            "last_enriched_at": issue.last_enriched_at.isoformat() if issue.last_enriched_at else None,
            "has_performance_data": issue.performance_data is not None,
            "has_release_context": issue.release_context is not None,
            "has_breadcrumbs": issue.breadcrumbs is not None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get enrichment status for issue {issue_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get enrichment status: {str(e)}"
        )
