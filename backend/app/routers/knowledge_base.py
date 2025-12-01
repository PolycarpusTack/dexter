"""
Knowledge Base Router for Dexter.

Provides API endpoints for:
- Searching similar issues
- Submitting feedback
- Retrieving knowledge base statistics
- Managing issues
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings

# Phase 8: Rate limiting (optional import)
try:
    from app.middleware.rate_limit import (
        limiter,
        limit_search_requests,
        limit_embedding_requests,
        limit_clustering_requests,
    )
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    RATE_LIMITING_AVAILABLE = False
    limiter = None
    def limit_search_requests(func):
        return func
    def limit_embedding_requests(func):
        return func
    def limit_clustering_requests(func):
        return func
from app.db.database import get_db
from app.db.repositories.feedback import FeedbackRepository
from app.db.repositories.issues import IssueRepository
from app.dependencies import require_kb_initialized
from app.services.pii_scrubber import get_pii_scrubber
from app.services.retrieval_service import (
    ContextForLLM,
    RetrievalResult,
    get_retrieval_service,
)
from app.services.clustering_service import (
    get_clustering_service,
)
from app.services.enrichment.release_enrichment import get_release_enrichment_service
from app.services.enrichment.signal_computation import update_enrichment_signals

logger = logging.getLogger(__name__)

# Router with KB initialization check
router = APIRouter(
    prefix="/knowledge-base",
    tags=["knowledge-base"],
    dependencies=[Depends(require_kb_initialized)],
)


# Request/Response Models

class SearchRequest(BaseModel):
    """Request model for similarity search."""

    error_type: str = Field(..., description="Type of error (e.g., ValueError)")
    error_message: str = Field(..., description="Error message text")
    platform: Optional[str] = Field(None, description="Platform filter")
    stacktrace: Optional[List[Dict[str, Any]]] = Field(
        None, description="Optional stack frames"
    )
    limit: Optional[int] = Field(None, ge=1, le=20, description="Max results")


class FeedbackRequest(BaseModel):
    """Request model for submitting feedback."""

    issue_id: int = Field(..., description="Database ID of the issue")
    feedback_type: str = Field(
        ..., description="Type: 'positive', 'negative', or 'correction'"
    )
    correction_text: Optional[str] = Field(
        None, description="Correction text (required for correction type)"
    )


class FeedbackResponse(BaseModel):
    """Response model for feedback submission."""

    success: bool
    message: str
    feedback_id: Optional[int] = None


class IssueUpdateRequest(BaseModel):
    """Request model for updating issue solutions."""

    ai_explanation: Optional[str] = None
    ai_suggested_fix: Optional[str] = None
    human_solution: Optional[str] = None
    is_useful: Optional[bool] = None


class StatsResponse(BaseModel):
    """Response model for knowledge base statistics."""

    issues: Dict[str, Any]
    feedback: Dict[str, Any]


class ClusterSummaryResponse(BaseModel):
    """Response model for cluster summary."""

    cluster_id: int
    size: int
    cluster_type: str
    cohesion: float
    representative_error: str
    representative_message: str
    issue_ids: List[int]


class ClusteringResponse(BaseModel):
    """Response model for clustering endpoint."""

    total_items: int
    total_clusters: int
    recurring_clusters: int
    similar_clusters: int
    outliers: int
    clusters: List[ClusterSummaryResponse]
    statistics: Dict[str, Any]


class SimilarErrorsRequest(BaseModel):
    """Request model for finding similar errors."""

    error_type: str = Field(..., description="Type of error")
    error_message: str = Field(..., description="Error message text")
    top_k: int = Field(5, ge=1, le=20, description="Number of results")
    min_score: float = Field(0.5, ge=0.0, le=1.0, description="Minimum similarity")


class RouteIssueResponse(BaseModel):
    """Response model for issue routing."""

    routable: bool
    suggested_team: Optional[str] = None
    confidence: Optional[float] = None
    auto_assign: bool = False
    reason: Optional[str] = None
    all_teams: Optional[List[str]] = None


# Dependency

async def check_knowledge_base_enabled():
    """Check if knowledge base is enabled."""
    settings = get_settings()
    if not settings.ENABLE_KNOWLEDGE_BASE:
        raise HTTPException(
            status_code=503,
            detail="Knowledge base is disabled",
        )


# Endpoints

@router.post("/search", response_model=RetrievalResult)
@limit_search_requests
async def search_similar_issues(
    request: Request,
    search_request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Search for similar issues in the knowledge base.

    Uses vector similarity search to find related past issues.
    Results are ranked by similarity and validation status.
    """
    retrieval = get_retrieval_service()

    # Build error data from request
    error_data = {
        "type": search_request.error_type,
        "value": search_request.error_message,
        "platform": search_request.platform,
    }

    if search_request.stacktrace:
        error_data["cleaned_stack"] = search_request.stacktrace

    result = await retrieval.find_similar(
        error_data=error_data,
        error_type=search_request.error_type if search_request.platform else None,
        platform=search_request.platform,
        limit=search_request.limit,
    )

    return result


@router.post("/context", response_model=ContextForLLM)
@limit_search_requests
async def get_llm_context(
    request: Request,
    search_request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Get context for LLM prompt from similar issues.

    Returns formatted context including validated solutions
    and suggested fixes from similar past issues.
    """
    retrieval = get_retrieval_service()

    error_data = {
        "type": search_request.error_type,
        "value": search_request.error_message,
        "platform": search_request.platform,
    }

    if search_request.stacktrace:
        error_data["cleaned_stack"] = search_request.stacktrace

    context = await retrieval.build_llm_context(
        error_data=error_data,
        max_context_issues=min(search_request.limit or 3, 5),
    )

    return context


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    request: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Submit feedback on an AI-generated explanation.

    Feedback types:
    - 'positive': The explanation was helpful
    - 'negative': The explanation was not helpful
    - 'correction': Provide the correct explanation
    """
    # Validate feedback type
    if request.feedback_type not in ("positive", "negative", "correction"):
        raise HTTPException(
            status_code=400,
            detail="Invalid feedback type. Must be 'positive', 'negative', or 'correction'",
        )

    # Correction requires text
    if request.feedback_type == "correction" and not request.correction_text:
        raise HTTPException(
            status_code=400,
            detail="Correction text is required for correction feedback",
        )

    # Scrub correction text if provided
    correction_text = request.correction_text
    if correction_text:
        scrubber = get_pii_scrubber()
        correction_text = scrubber.scrub_string(correction_text)

    # Check issue exists
    issue_repo = IssueRepository(db)
    issue = await issue_repo.get_by_id(request.issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Create feedback
    feedback_repo = FeedbackRepository(db)
    feedback = await feedback_repo.create(
        issue_id=request.issue_id,
        feedback_type=request.feedback_type,
        correction_text=correction_text,
    )

    # Update issue feedback count
    await issue_repo.increment_feedback_count(request.issue_id)

    # Mark as useful if positive feedback
    if request.feedback_type == "positive":
        await issue_repo.update(request.issue_id, is_useful=True)

    await db.commit()

    return FeedbackResponse(
        success=True,
        message=f"Feedback submitted successfully",
        feedback_id=feedback.id,
    )


@router.get("/issues/{issue_id}")
async def get_issue(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """Get a specific issue with its feedback summary."""
    retrieval = get_retrieval_service()
    result = await retrieval.get_issue_with_feedback(issue_id)

    if not result:
        raise HTTPException(status_code=404, detail="Issue not found")

    return result


@router.patch("/issues/{issue_id}")
async def update_issue(
    issue_id: int,
    request: IssueUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Update an issue's solution fields.

    Used to add human solutions or update AI explanations.
    """
    repo = IssueRepository(db)
    issue = await repo.get_by_id(issue_id)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Scrub any text content
    updates = {}
    scrubber = get_pii_scrubber()

    if request.ai_explanation is not None:
        updates["ai_explanation"] = scrubber.scrub_string(request.ai_explanation)
    if request.ai_suggested_fix is not None:
        updates["ai_suggested_fix"] = scrubber.scrub_string(request.ai_suggested_fix)
    if request.human_solution is not None:
        updates["human_solution"] = scrubber.scrub_string(request.human_solution)
    if request.is_useful is not None:
        updates["is_useful"] = request.is_useful

    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    updated = await repo.update(issue_id, **updates)
    await db.commit()

    return {
        "success": True,
        "message": "Issue updated",
        "updated_fields": list(updates.keys()),
    }


@router.get("/issues")
async def list_issues(
    search: Optional[str] = Query(None, description="Search term"),
    validated: Optional[bool] = Query(None, description="Filter by validation status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """List issues in the knowledge base with pagination."""
    repo = IssueRepository(db)

    result = await repo.list_issues(
        search=search,
        filter_validated=validated,
        page=page,
        page_size=page_size,
    )

    return result


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """Get knowledge base statistics."""
    retrieval = get_retrieval_service()
    stats = await retrieval.get_knowledge_base_stats()
    return stats


@router.post("/retry-failed")
async def retry_failed_processing(
    limit: int = Query(100, ge=1, le=1000, description="Max issues to retry"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Retry processing for issues that failed embedding generation.

    This endpoint triggers reprocessing of issues with processing_status='failed'.
    """
    from app.services.ingestion_service import get_ingestion_service

    ingestion = get_ingestion_service()
    success_count = await ingestion.retry_failed(limit=limit)

    return {
        "success": True,
        "message": f"Retried processing for failed issues",
        "successful_retries": success_count,
    }


# ==================== Clustering Endpoints ====================


@router.get("/clusters", response_model=ClusteringResponse)
@limit_clustering_requests
async def get_error_clusters(
    request: Request,
    threshold: float = Query(
        0.75, ge=0.5, le=0.99,
        description="Similarity threshold for clustering (higher = tighter clusters)"
    ),
    min_size: int = Query(
        2, ge=1, le=100,
        description="Minimum errors needed to form a cluster"
    ),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Get clusters of similar errors in the knowledge base.

    Uses community detection algorithm to find natural groupings
    without specifying the number of clusters upfront.

    Cluster types:
    - RECURRING: 3+ similar errors (likely same root cause)
    - SIMILAR: 2 related errors
    - OUTLIER: Unique, unclustered errors

    The cohesion score (0-1) indicates how tightly grouped
    the cluster is (higher = more similar within cluster).
    """
    repo = IssueRepository(db)

    # Fetch all issues with embeddings
    issues = await repo.get_all_with_embeddings()

    if not issues:
        return ClusteringResponse(
            total_items=0,
            total_clusters=0,
            recurring_clusters=0,
            similar_clusters=0,
            outliers=0,
            clusters=[],
            statistics={}
        )

    # Extract embeddings and issue data
    embeddings = []
    issue_data = []

    for issue in issues:
        if issue.embedding:
            embeddings.append(issue.embedding)
            issue_data.append({
                "id": issue.id,
                "error_type": issue.error_type,
                "error_message": issue.error_message[:200] if issue.error_message else "",
            })

    if not embeddings:
        return ClusteringResponse(
            total_items=len(issues),
            total_clusters=0,
            recurring_clusters=0,
            similar_clusters=0,
            outliers=0,
            clusters=[],
            statistics={"error": "No embeddings available for clustering"}
        )

    # Perform clustering
    clustering_service = get_clustering_service(threshold=threshold, min_size=min_size)
    clusters = clustering_service.cluster_errors(embeddings)

    # Build response with issue details
    cluster_summaries = []
    for cluster in clusters:
        # Get representative issue
        rep_idx = cluster.representative_index
        rep_issue = issue_data[rep_idx] if rep_idx < len(issue_data) else issue_data[0]

        # Get all issue IDs in this cluster
        cluster_issue_ids = [
            issue_data[idx]["id"]
            for idx in cluster.error_indices
            if idx < len(issue_data)
        ]

        cluster_summaries.append(ClusterSummaryResponse(
            cluster_id=cluster.cluster_id,
            size=len(cluster.error_indices),
            cluster_type=cluster.cluster_type.value,
            cohesion=round(cluster.cohesion_score, 4),
            representative_error=rep_issue["error_type"],
            representative_message=rep_issue["error_message"],
            issue_ids=cluster_issue_ids
        ))

    # Get statistics
    stats = clustering_service.get_cluster_statistics(clusters)

    return ClusteringResponse(
        total_items=len(embeddings),
        total_clusters=len(clusters),
        recurring_clusters=stats.get("recurring_clusters", 0),
        similar_clusters=stats.get("similar_clusters", 0),
        outliers=stats.get("outliers", 0),
        clusters=cluster_summaries,
        statistics=stats
    )


@router.get("/clusters/{cluster_id}/issues")
@limit_clustering_requests
async def get_cluster_issues(
    request: Request,
    cluster_id: int,
    threshold: float = Query(0.75, ge=0.5, le=0.99),
    min_size: int = Query(2, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Get all issues in a specific cluster.

    Returns full issue details for all errors in the specified cluster.
    """
    repo = IssueRepository(db)

    # Fetch and cluster (in production, consider caching)
    issues = await repo.get_all_with_embeddings()

    if not issues:
        raise HTTPException(status_code=404, detail="No issues in knowledge base")

    embeddings = []
    issue_list = []

    for issue in issues:
        if issue.embedding:
            embeddings.append(issue.embedding)
            issue_list.append(issue)

    if not embeddings:
        raise HTTPException(status_code=404, detail="No embeddings available")

    clustering_service = get_clustering_service(threshold=threshold, min_size=min_size)
    clusters = clustering_service.cluster_errors(embeddings)

    # Find the requested cluster
    target_cluster = None
    for cluster in clusters:
        if cluster.cluster_id == cluster_id:
            target_cluster = cluster
            break

    if not target_cluster:
        raise HTTPException(
            status_code=404,
            detail=f"Cluster {cluster_id} not found"
        )

    # Get issues in this cluster
    cluster_issues = []
    for idx in target_cluster.error_indices:
        if idx < len(issue_list):
            issue = issue_list[idx]
            cluster_issues.append({
                "id": issue.id,
                "error_type": issue.error_type,
                "error_message": issue.error_message,
                "platform": issue.platform,
                "is_useful": issue.is_useful,
                "feedback_count": issue.feedback_count,
                "ai_explanation": issue.ai_explanation[:500] if issue.ai_explanation else None,
                "human_solution": issue.human_solution[:500] if issue.human_solution else None,
                "is_representative": idx == target_cluster.representative_index
            })

    return {
        "cluster_id": cluster_id,
        "cluster_type": target_cluster.cluster_type.value,
        "cohesion": round(target_cluster.cohesion_score, 4),
        "issue_count": len(cluster_issues),
        "issues": cluster_issues
    }


@router.post("/clusters/find-similar")
@limit_embedding_requests
async def find_similar_to_error(
    request: Request,
    similar_request: SimilarErrorsRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Find similar errors to a given error using semantic search.

    This uses optimized vector similarity search to find the most
    similar past errors in the knowledge base.
    """
    from app.services.embeddings_service import get_embeddings_service

    repo = IssueRepository(db)

    # Get all issues with embeddings
    issues = await repo.get_all_with_embeddings()

    if not issues:
        return {
            "query": {
                "error_type": similar_request.error_type,
                "error_message": similar_request.error_message[:100]
            },
            "similar_count": 0,
            "similar_issues": []
        }

    # Build corpus
    embeddings = []
    issue_list = []

    for issue in issues:
        if issue.embedding:
            embeddings.append(issue.embedding)
            issue_list.append(issue)

    if not embeddings:
        return {
            "query": {
                "error_type": similar_request.error_type,
                "error_message": similar_request.error_message[:100]
            },
            "similar_count": 0,
            "similar_issues": []
        }

    # Generate query embedding
    embedding_service = get_embeddings_service()
    query_text = f"{similar_request.error_type}: {similar_request.error_message}"
    query_embedding = embedding_service.encode(query_text)[0].tolist()

    # Find similar using clustering service
    clustering_service = get_clustering_service()
    similar = clustering_service.find_similar(
        query_embedding=query_embedding,
        corpus_embeddings=embeddings,
        top_k=similar_request.top_k,
        min_score=similar_request.min_score
    )

    # Build response with issue details
    similar_issues = []
    for corpus_idx, score in similar:
        if corpus_idx < len(issue_list):
            issue = issue_list[corpus_idx]
            similar_issues.append({
                "id": issue.id,
                "error_type": issue.error_type,
                "error_message": issue.error_message[:200] if issue.error_message else "",
                "similarity_score": round(score, 4),
                "is_validated": issue.is_useful,
                "feedback_count": issue.feedback_count,
                "has_solution": bool(issue.human_solution or issue.ai_explanation)
            })

    return {
        "query": {
            "error_type": similar_request.error_type,
            "error_message": similar_request.error_message[:100]
        },
        "similar_count": len(similar_issues),
        "similar_issues": similar_issues
    }


# ==================== Ownership & Routing Endpoints ====================


@router.post("/issues/{issue_id}/route", response_model=RouteIssueResponse)
async def route_issue_to_team(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Auto-route issue to appropriate team based on ownership.

    Returns suggested team assignment based on:
    - Sentry ownership rules
    - Code owners from CODEOWNERS file
    - Suspect commit authors
    - Stack trace analysis

    The confidence score indicates how certain the routing is:
    - 0.9: Based on suspect commits (highest confidence)
    - 0.8: Based on CODEOWNERS file
    - 0.7: Based on ownership rules
    - 0.5: Based on stack trace inference

    Auto-assignment is enabled when confidence > 0.8 and a team suggestion exists.
    """
    repo = IssueRepository(db)
    issue = await repo.get_by_id(issue_id)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if not issue.ownership:
        # Try to enrich the issue first
        from app.services.enrichment.ownership_enrichment import get_ownership_enrichment_service

        service = await get_ownership_enrichment_service(db)
        result = await service.enrich_issue(issue_id)

        if result.get("status") != "success":
            return RouteIssueResponse(
                routable=False,
                reason=f"No ownership data available: {result.get('reason', 'unknown')}",
            )

        # Refresh issue
        issue = await repo.get_by_id(issue_id)

    ownership = issue.ownership
    suggested = ownership.get("suggested_owners", [])

    if not suggested:
        teams = ownership.get("teams", [])
        if teams:
            return RouteIssueResponse(
                routable=True,
                suggested_team=teams[0],
                confidence=0.5,
                auto_assign=False,
                reason="Inferred from stack trace analysis",
                all_teams=teams,
            )
        else:
            return RouteIssueResponse(
                routable=False,
                reason="No ownership suggestions or teams available",
            )

    # Get highest confidence team suggestion
    team_suggestions = [s for s in suggested if s.get("type") == "team"]

    if not team_suggestions:
        # No team suggestions, only user suggestions
        return RouteIssueResponse(
            routable=False,
            reason="Only user-level suggestions available (no team assignments)",
            all_teams=ownership.get("teams", []),
        )

    # Sort by confidence
    team_suggestions.sort(key=lambda x: x.get("confidence", 0.0), reverse=True)
    best = team_suggestions[0]

    return RouteIssueResponse(
        routable=True,
        suggested_team=best.get("owner"),
        confidence=best.get("confidence"),
        auto_assign=ownership.get("auto_assignment_eligible", False),
        reason=f"Based on {best.get('source', 'ownership rules')}",
        all_teams=ownership.get("teams", []),
    )


@router.post("/issues/{issue_id}/enrich-ownership")
async def enrich_issue_ownership(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Manually trigger ownership enrichment for a specific issue.

    This is useful for:
    - Re-enriching after ownership rules change
    - Enriching issues that were ingested before ownership feature was enabled
    - Debugging ownership suggestions
    """
    from app.services.enrichment.ownership_enrichment import get_ownership_enrichment_service

    repo = IssueRepository(db)
    issue = await repo.get_by_id(issue_id)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    service = await get_ownership_enrichment_service(db)
    result = await service.enrich_issue(issue_id)

    if result.get("status") == "error":
        raise HTTPException(
            status_code=500,
            detail=f"Enrichment failed: {result.get('reason', 'unknown error')}",
        )

    return {
        "success": True,
        "message": "Ownership enrichment completed",
        "result": result,
    }


@router.get("/issues/{issue_id}/ownership")
async def get_issue_ownership(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Get ownership data for a specific issue.

    Returns:
    - Suggested owners (teams and users)
    - Primary team assignment
    - All teams associated with the issue
    - Auto-assignment eligibility
    - Ownership rule count
    """
    repo = IssueRepository(db)
    issue = await repo.get_by_id(issue_id)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if not issue.ownership:
        return {
            "has_ownership_data": False,
            "message": "No ownership data available for this issue",
        }

    return {
        "has_ownership_data": True,
        "ownership": issue.ownership,
        "enrichment_status": issue.enrichment_status.get("ownership", {}),
    }


# ==================== Enrichment Endpoints ====================


@router.post("/issues/{issue_id}/enrich/releases")
async def enrich_issue_releases(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Manually trigger release enrichment for an issue.

    Fetches release health metrics and suspect commits from Sentry,
    stores in the issue's release_context JSONB field.

    Also computes release recency signals for improved retrieval ranking.
    """
    service = await get_release_enrichment_service(db)
    result = await service.enrich_issue(issue_id)

    if result["status"] == "error":
        raise HTTPException(
            status_code=500,
            detail=f"Enrichment failed: {result.get('reason', 'Unknown error')}"
        )

    # Update enrichment signals after successful enrichment
    if result["status"] == "success":
        try:
            await update_enrichment_signals(db, issue_id)
        except Exception as e:
            logger.warning(f"Failed to update enrichment signals: {e}")
            # Don't fail the request if signals update fails

    return {
        "success": True,
        "message": "Issue enriched with release context",
        "details": result
    }
