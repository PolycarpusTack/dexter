"""
Retrieval Service for Dexter Knowledge Base.

Provides RAG (Retrieval-Augmented Generation) capabilities:
- Find similar past issues using vector similarity
- Multi-signal ranking with enrichment data
- Retrieve validated solutions
- Build context for LLM prompts

EPIC P: Multi-Signal RAG Integration
Story P-1: Enhanced retrieval with composite scoring from 11 enrichment signals
"""

import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set

from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.config import get_settings
from app.db.database import AsyncSessionLocal
from app.db.models import SentryIssue, EnrichmentSignal
from app.db.repositories.feedback import FeedbackRepository
from app.db.repositories.issues import IssueRepository
from app.services.embeddings_service import get_embeddings_service
from app.services.enrichment.signal_computation import (
    compute_composite_score,
    compute_ownership_match_score,
    compute_release_recency_score,
    compute_alert_frequency_score,
    compute_replay_impact_score,
    compute_tag_overlap_score,
    compute_profiling_hotspot_score,
    compute_performance_impact_score,
)
from app.services.parser_adapter import get_unified_parser
from app.services.pii_scrubber import get_pii_scrubber

# Phase 8: Custom metrics (optional import)
try:
    from app.metrics.custom_metrics import (
        KB_QUERIES_TOTAL,
        KB_QUERY_DURATION,
        RAG_RETRIEVAL_RESULTS,
    )
    METRICS_AVAILABLE = True
except ImportError:
    METRICS_AVAILABLE = False

logger = logging.getLogger(__name__)


class SimilarIssue(BaseModel):
    """A similar issue from the knowledge base."""

    id: int
    sentry_issue_id: str
    error_type: str
    error_message: str
    similarity_score: float = Field(..., ge=0, le=1)
    combined_score: float = Field(default=0.0, ge=0, le=1)  # Similarity + feedback
    composite_score: float = Field(default=0.0, ge=0, le=1)  # EPIC P: Multi-signal ranking
    ai_explanation: Optional[str] = None
    ai_suggested_fix: Optional[str] = None
    human_solution: Optional[str] = None
    is_validated: bool = False
    feedback_count: int = 0
    confidence_score: float = 0.0
    platform: Optional[str] = None

    # EPIC P: Individual enrichment signal scores (for debugging/transparency)
    release_recency_score: Optional[float] = None
    ownership_match_score: Optional[float] = None
    alert_frequency_score: Optional[float] = None
    replay_impact_score: Optional[float] = None
    tag_overlap_score: Optional[float] = None
    profiling_hotspot_score: Optional[float] = None
    performance_impact_score: Optional[float] = None


class RetrievalResult(BaseModel):
    """Result of a similarity search."""

    query_error_type: str
    query_error_message: str
    similar_issues: List[SimilarIssue]
    has_validated_solution: bool = False
    confidence: str = "LOW"  # LOW, MEDIUM, HIGH


class ContextForLLM(BaseModel):
    """Context prepared for LLM prompt."""

    current_error: Dict[str, Any]
    similar_issues: List[Dict[str, Any]]
    validated_solutions: List[str]
    suggested_fixes: List[str]
    confidence_level: str


class RetrievalService:
    """
    Service for retrieving similar issues from the knowledge base.

    Uses pgvector cosine similarity for semantic search.
    Prioritizes validated (is_useful=True) issues.
    """

    def __init__(self):
        self.parser = get_unified_parser()
        self.pii_scrubber = get_pii_scrubber()
        self._embeddings = None
        self._settings = None

    @property
    def embeddings(self):
        """Lazy load embeddings service."""
        if self._embeddings is None:
            self._embeddings = get_embeddings_service()
        return self._embeddings

    @property
    def settings(self):
        """Lazy load settings."""
        if self._settings is None:
            self._settings = get_settings()
        return self._settings

    async def find_similar(
        self,
        error_data: Dict[str, Any],
        error_type: Optional[str] = None,
        platform: Optional[str] = None,
        limit: Optional[int] = None,
        threshold: Optional[float] = None,
        use_enrichment: bool = True,
        user_teams: Optional[Set[str]] = None,
        query_tags: Optional[Dict[str, str]] = None,
        ranking_variant: str = "balanced",
    ) -> RetrievalResult:
        """
        Find similar issues in the knowledge base with multi-signal ranking.

        EPIC P - Story P-1: Enhanced retrieval with composite scoring.

        Args:
            error_data: Error data (will be PII-scrubbed)
            error_type: Optional filter by error type
            platform: Optional filter by platform
            limit: Max results (default from settings)
            threshold: Similarity threshold (default from settings)
            use_enrichment: Enable multi-signal ranking (default: True)
            user_teams: User's team memberships for ownership scoring
            query_tags: Query context tags for tag overlap scoring
            ranking_variant: A/B test variant ("control", "balanced", "enrichment_heavy")

        Returns:
            RetrievalResult with similar issues and confidence
        """
        start_time = time.time()
        status = "success"

        limit = limit or self.settings.MAX_SIMILAR_ISSUES
        threshold = threshold or self.settings.SIMILARITY_THRESHOLD

        # Scrub PII from input
        scrubbed_data = self.pii_scrubber.scrub_dict(error_data)

        # Extract error info
        query_error_type = scrubbed_data.get("type", "Error")
        query_error_message = scrubbed_data.get(
            "value", scrubbed_data.get("message", "")
        )

        # Generate embedding for query
        embedding_text = self.parser.parse_and_format(scrubbed_data, scrub_pii=False)

        try:
            query_embedding = self.embeddings.encode_single(embedding_text)
        except Exception as e:
            logger.error(f"Failed to generate query embedding: {e}")
            # Phase 8: Track failed query
            if METRICS_AVAILABLE:
                KB_QUERIES_TOTAL.labels(query_type="search", status="error").inc()
                KB_QUERY_DURATION.labels(query_type="search").observe(time.time() - start_time)
            return RetrievalResult(
                query_error_type=query_error_type,
                query_error_message=query_error_message,
                similar_issues=[],
                confidence="LOW",
            )

        try:
            # Search database - get more candidates for enrichment re-ranking
            candidate_limit = limit * 5 if use_enrichment else limit

            async with AsyncSessionLocal() as session:
                repo = IssueRepository(session)

                results = await repo.find_similar(
                    query_embedding=query_embedding,
                    error_type=error_type,
                    platform=platform,
                    limit=candidate_limit,
                    similarity_threshold=threshold,
                    prefer_validated=True,
                )

                # EPIC P - Story P-1: Multi-signal ranking
                if use_enrichment and results:
                    similar_issues = await self._apply_multi_signal_ranking(
                        session=session,
                        candidates=results,
                        user_teams=user_teams,
                        query_tags=query_tags,
                        ranking_variant=ranking_variant,
                    )
                    # Trim to requested limit
                    similar_issues = similar_issues[:limit]
                else:
                    # Fallback: Use simple combined scoring (similarity + feedback)
                    similar_issues = self._apply_simple_ranking(results)

            # Re-rank by composite/combined score
            if use_enrichment:
                similar_issues.sort(key=lambda x: x.composite_score, reverse=True)
            else:
                similar_issues.sort(key=lambda x: x.combined_score, reverse=True)

            # Determine confidence level
            confidence = self._calculate_confidence(similar_issues)
            has_validated = any(issue.is_validated for issue in similar_issues)

            # Phase 8: Track retrieval results
            if METRICS_AVAILABLE:
                RAG_RETRIEVAL_RESULTS.observe(len(similar_issues))

            return RetrievalResult(
                query_error_type=query_error_type,
                query_error_message=query_error_message,
                similar_issues=similar_issues,
                has_validated_solution=has_validated,
                confidence=confidence,
            )

        except Exception as e:
            status = "error"
            logger.error(f"Retrieval search failed: {e}")
            raise

        finally:
            # Phase 8: Record metrics
            if METRICS_AVAILABLE:
                duration = time.time() - start_time
                KB_QUERIES_TOTAL.labels(query_type="search", status=status).inc()
                KB_QUERY_DURATION.labels(query_type="search").observe(duration)

    async def build_llm_context(
        self,
        error_data: Dict[str, Any],
        max_context_issues: int = 3,
    ) -> ContextForLLM:
        """
        Build context for LLM prompt from similar issues.

        Args:
            error_data: Current error data
            max_context_issues: Max issues to include in context

        Returns:
            ContextForLLM ready for prompt engineering
        """
        # Find similar issues
        retrieval_result = await self.find_similar(
            error_data,
            limit=max_context_issues,
        )

        # Collect validated solutions
        validated_solutions = []
        suggested_fixes = []

        for issue in retrieval_result.similar_issues:
            if issue.is_validated and issue.human_solution:
                validated_solutions.append(issue.human_solution)
            if issue.ai_suggested_fix:
                suggested_fixes.append(issue.ai_suggested_fix)

        # Format issues for context
        similar_for_context = [
            {
                "error_type": issue.error_type,
                "error_message": issue.error_message[:200],  # Truncate
                "similarity": round(issue.similarity_score, 2),
                "has_solution": bool(issue.human_solution or issue.ai_explanation),
                "is_validated": issue.is_validated,
            }
            for issue in retrieval_result.similar_issues
        ]

        return ContextForLLM(
            current_error={
                "type": retrieval_result.query_error_type,
                "message": retrieval_result.query_error_message[:500],
            },
            similar_issues=similar_for_context,
            validated_solutions=validated_solutions[:2],  # Top 2
            suggested_fixes=suggested_fixes[:2],
            confidence_level=retrieval_result.confidence,
        )

    async def get_issue_with_feedback(
        self,
        issue_id: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Get an issue with its feedback summary.

        Args:
            issue_id: Database ID of the issue

        Returns:
            Issue dict with feedback counts or None
        """
        async with AsyncSessionLocal() as session:
            issue_repo = IssueRepository(session)
            feedback_repo = FeedbackRepository(session)

            issue = await issue_repo.get_by_id(issue_id)
            if not issue:
                return None

            feedback_counts = await feedback_repo.count_by_type(issue_id)

            return {
                "id": issue.id,
                "sentry_issue_id": issue.sentry_issue_id,
                "error_type": issue.error_type,
                "error_message": issue.error_message,
                "ai_explanation": issue.ai_explanation,
                "ai_suggested_fix": issue.ai_suggested_fix,
                "human_solution": issue.human_solution,
                "is_useful": issue.is_useful,
                "feedback": {
                    "positive": feedback_counts["positive"],
                    "negative": feedback_counts["negative"],
                    "corrections": feedback_counts["correction"],
                },
                "created_at": issue.created_at.isoformat() if issue.created_at else None,
            }

    async def get_knowledge_base_stats(self) -> Dict[str, Any]:
        """Get overall knowledge base statistics."""
        async with AsyncSessionLocal() as session:
            issue_repo = IssueRepository(session)
            feedback_repo = FeedbackRepository(session)

            issue_stats = await issue_repo.get_stats()
            feedback_stats = await feedback_repo.get_stats()

            return {
                "issues": issue_stats,
                "feedback": feedback_stats,
            }

    def _calculate_combined_score(
        self,
        similarity: float,
        is_validated: bool,
        feedback_count: int,
    ) -> float:
        """
        Calculate combined score from similarity and feedback.

        Formula:
        - Base: similarity score (0-1)
        - Validation bonus: +0.1 if validated
        - Feedback bonus: +0.02 per feedback (max +0.1)

        This allows feedback to boost ranking of similar issues.
        """
        score = similarity

        # Validation bonus
        if is_validated:
            score += 0.1

        # Feedback bonus (capped)
        feedback_bonus = min(feedback_count * 0.02, 0.1)
        score += feedback_bonus

        # Clamp to 0-1
        return min(max(score, 0.0), 1.0)

    def _calculate_confidence(self, similar_issues: List[SimilarIssue]) -> str:
        """
        Calculate confidence level based on similar issues.

        HIGH: Validated issue with >0.85 combined/composite score
        MEDIUM: Any issue with >0.75 combined/composite score OR validated with >0.7
        LOW: Otherwise
        """
        if not similar_issues:
            return "LOW"

        top_issue = similar_issues[0]

        # Use composite score if available, otherwise combined score
        score = top_issue.composite_score if top_issue.composite_score > 0 else top_issue.combined_score

        # HIGH: Validated with high score
        if top_issue.is_validated and score > 0.85:
            return "HIGH"

        # MEDIUM: Good score or validated
        if score > 0.75:
            return "MEDIUM"
        if top_issue.is_validated and score > 0.7:
            return "MEDIUM"

        return "LOW"

    async def _apply_multi_signal_ranking(
        self,
        session: Any,
        candidates: List[Dict[str, Any]],
        user_teams: Optional[Set[str]],
        query_tags: Optional[Dict[str, str]],
        ranking_variant: str,
    ) -> List[SimilarIssue]:
        """
        Apply multi-signal ranking to candidate issues.

        EPIC P - Story P-1: Combines vector similarity with enrichment signals.

        Args:
            session: Database session
            candidates: Candidate issues from vector search
            user_teams: User's team memberships
            query_tags: Query context tags
            ranking_variant: A/B test variant for weight adjustment

        Returns:
            Ranked list of SimilarIssue objects with composite scores
        """
        similar_issues = []

        # Get ranking weights based on variant
        weights = self._get_ranking_weights(ranking_variant)

        for candidate in candidates:
            issue_id = candidate["id"]
            similarity = candidate["similarity_score"]
            is_validated = candidate.get("is_useful", False)
            feedback_count = candidate.get("feedback_count", 0)

            # Calculate combined score (similarity + feedback bonus)
            combined = self._calculate_combined_score(
                similarity=similarity,
                is_validated=is_validated,
                feedback_count=feedback_count,
            )

            # Compute enrichment signal scores
            release_recency = await compute_release_recency_score(session, issue_id) or 0.0
            ownership_match = await compute_ownership_match_score(session, issue_id, user_teams) or 0.0
            alert_frequency = await compute_alert_frequency_score(session, issue_id) or 0.0
            replay_impact = await compute_replay_impact_score(session, issue_id) or 0.0
            tag_overlap = await compute_tag_overlap_score(session, issue_id, query_tags) or 0.0
            profiling_hotspot = await compute_profiling_hotspot_score(session, issue_id) or 0.0
            performance_impact = await compute_performance_impact_score(session, issue_id) or 0.0

            # Check if enrichment data is stale (> 7 days old)
            staleness_factor = await self._compute_staleness_factor(session, issue_id)

            # Calculate composite score with weights
            composite = (
                similarity * weights["vector_similarity"] +
                release_recency * weights["release_recency"] +
                ownership_match * weights["ownership_match"] +
                alert_frequency * weights["alert_frequency"] +
                replay_impact * weights["replay_impact"] +
                tag_overlap * weights["tag_overlap"] +
                profiling_hotspot * weights["profiling_hotspot"] +
                performance_impact * weights["performance_impact"]
            )

            # Apply staleness discount
            composite *= staleness_factor

            similar_issues.append(SimilarIssue(
                id=issue_id,
                sentry_issue_id=candidate["sentry_issue_id"],
                error_type=candidate["error_type"],
                error_message=candidate["error_message"],
                similarity_score=similarity,
                combined_score=combined,
                composite_score=composite,
                ai_explanation=candidate.get("ai_explanation"),
                ai_suggested_fix=candidate.get("ai_suggested_fix"),
                human_solution=candidate.get("human_solution"),
                is_validated=is_validated,
                feedback_count=feedback_count,
                confidence_score=candidate.get("confidence_score", 0.0) if is_validated else 0.0,
                platform=candidate.get("platform"),
                # Individual signal scores for transparency
                release_recency_score=release_recency,
                ownership_match_score=ownership_match,
                alert_frequency_score=alert_frequency,
                replay_impact_score=replay_impact,
                tag_overlap_score=tag_overlap,
                profiling_hotspot_score=profiling_hotspot,
                performance_impact_score=performance_impact,
            ))

            logger.debug(
                f"Multi-signal ranking for issue {issue_id}",
                extra={
                    "issue_id": issue_id,
                    "similarity": round(similarity, 3),
                    "composite": round(composite, 3),
                    "staleness_factor": round(staleness_factor, 3),
                    "signals": {
                        "release_recency": round(release_recency, 3),
                        "ownership_match": round(ownership_match, 3),
                        "alert_frequency": round(alert_frequency, 3),
                        "replay_impact": round(replay_impact, 3),
                        "tag_overlap": round(tag_overlap, 3),
                    }
                }
            )

        return similar_issues

    def _apply_simple_ranking(self, candidates: List[Dict[str, Any]]) -> List[SimilarIssue]:
        """
        Apply simple ranking (similarity + feedback) without enrichment.

        Fallback when use_enrichment=False or no enrichment data available.
        """
        similar_issues = []

        for candidate in candidates:
            similarity = candidate["similarity_score"]
            is_validated = candidate.get("is_useful", False)
            feedback_count = candidate.get("feedback_count", 0)

            combined = self._calculate_combined_score(
                similarity=similarity,
                is_validated=is_validated,
                feedback_count=feedback_count,
            )

            similar_issues.append(SimilarIssue(
                id=candidate["id"],
                sentry_issue_id=candidate["sentry_issue_id"],
                error_type=candidate["error_type"],
                error_message=candidate["error_message"],
                similarity_score=similarity,
                combined_score=combined,
                composite_score=0.0,  # No enrichment
                ai_explanation=candidate.get("ai_explanation"),
                ai_suggested_fix=candidate.get("ai_suggested_fix"),
                human_solution=candidate.get("human_solution"),
                is_validated=is_validated,
                feedback_count=feedback_count,
                confidence_score=candidate.get("confidence_score", 0.0) if is_validated else 0.0,
                platform=candidate.get("platform"),
            ))

        return similar_issues

    def _get_ranking_weights(self, variant: str) -> Dict[str, float]:
        """
        Get ranking weights for A/B testing variants.

        Variants:
        - control: Pure vector similarity (100%)
        - balanced: Default weights (40% vector, 60% enrichment)
        - enrichment_heavy: Heavy enrichment (20% vector, 80% enrichment)
        """
        if variant == "control":
            return {
                "vector_similarity": 1.0,
                "release_recency": 0.0,
                "ownership_match": 0.0,
                "alert_frequency": 0.0,
                "replay_impact": 0.0,
                "tag_overlap": 0.0,
                "profiling_hotspot": 0.0,
                "performance_impact": 0.0,
            }
        elif variant == "enrichment_heavy":
            return {
                "vector_similarity": 0.20,
                "release_recency": 0.20,
                "ownership_match": 0.15,
                "alert_frequency": 0.15,
                "replay_impact": 0.10,
                "tag_overlap": 0.08,
                "profiling_hotspot": 0.07,
                "performance_impact": 0.05,
            }
        else:  # balanced (default)
            return {
                "vector_similarity": 0.40,
                "release_recency": 0.15,
                "ownership_match": 0.12,
                "alert_frequency": 0.10,
                "replay_impact": 0.10,
                "tag_overlap": 0.08,
                "profiling_hotspot": 0.03,
                "performance_impact": 0.02,
            }

    async def _compute_staleness_factor(self, session: Any, issue_id: int) -> float:
        """
        Compute staleness discount factor for enrichment data.

        Returns:
            1.0 if fresh (< 7 days), 0.5 if stale (> 7 days), 0.0 if very stale (> 30 days)
        """
        try:
            result = await session.execute(
                select(SentryIssue.last_enriched_at).where(SentryIssue.id == issue_id)
            )
            last_enriched = result.scalar_one_or_none()

            if not last_enriched:
                return 1.0  # No penalty if no timestamp

            age = datetime.now(timezone.utc) - last_enriched

            if age < timedelta(days=7):
                return 1.0  # Fresh
            elif age < timedelta(days=30):
                return 0.5  # Stale
            else:
                return 0.25  # Very stale

        except Exception as e:
            logger.warning(f"Failed to compute staleness for issue {issue_id}: {e}")
            return 1.0  # No penalty on error


# Singleton instance
_retrieval_service: Optional[RetrievalService] = None


def get_retrieval_service() -> RetrievalService:
    """Get singleton retrieval service."""
    global _retrieval_service
    if _retrieval_service is None:
        _retrieval_service = RetrievalService()
    return _retrieval_service
