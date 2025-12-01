"""
Confidence Scorer Service for AI Analysis.

Computes confidence scores and generates human-readable reasoning
for AI analysis results based on multiple factors.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from app.models.analysis import ConfidenceFactors, SimilarIssueRef

logger = logging.getLogger(__name__)


class ConfidenceScorer:
    """
    Computes confidence scores for AI analysis.

    Confidence is based on:
    1. High similarity count (>0.8) - More high-confidence similar issues
    2. Enrichment coverage - Percentage of enrichment sources available
    3. Freshness score - How recent the data is
    """

    # Thresholds for freshness scoring
    FRESH_THRESHOLD_HOURS = 24  # Data fresher than this is considered excellent
    STALE_THRESHOLD_HOURS = 168  # 1 week - data older than this is stale
    VERY_STALE_THRESHOLD_HOURS = 720  # 30 days - data older than this is very stale

    # Weights for confidence calculation
    SIMILARITY_WEIGHT = 0.4
    COVERAGE_WEIGHT = 0.3
    FRESHNESS_WEIGHT = 0.3

    def __init__(self):
        """Initialize confidence scorer."""
        pass

    def compute_confidence_factors(
        self,
        similar_issues: List[SimilarIssueRef],
        enrichment_used: List[str],
        enrichment_status: Dict[str, dict],
        total_enrichment_sources: int = 11,
    ) -> ConfidenceFactors:
        """
        Compute confidence factors for an analysis.

        Args:
            similar_issues: List of similar issues used
            enrichment_used: List of enrichment source names that were used
            enrichment_status: Dict mapping source name to status info (fetched_at, etc)
            total_enrichment_sources: Total possible enrichment sources

        Returns:
            ConfidenceFactors with detailed breakdown
        """
        # Compute high similarity count
        high_similarity_count = sum(
            1 for issue in similar_issues if issue.similarity > 0.8
        )

        # Compute enrichment coverage
        coverage = (
            len(enrichment_used) / total_enrichment_sources
            if total_enrichment_sources > 0
            else 0.0
        )

        # Compute freshness score
        freshness_score = self._compute_freshness_score(
            enrichment_used, enrichment_status
        )

        # Generate reasoning
        reasoning = self._generate_confidence_reasoning(
            high_similarity_count, coverage, freshness_score, len(similar_issues)
        )

        return ConfidenceFactors(
            high_similarity_count=high_similarity_count,
            enrichment_coverage=coverage,
            freshness_score=freshness_score,
            reasoning=reasoning,
        )

    def compute_overall_confidence(
        self, confidence_factors: ConfidenceFactors, similar_issues_count: int
    ) -> float:
        """
        Compute overall confidence score from factors.

        Args:
            confidence_factors: Pre-computed confidence factors
            similar_issues_count: Total number of similar issues

        Returns:
            Confidence score between 0.0 and 1.0
        """
        # Normalize similarity score (diminishing returns after 5 high-similarity issues)
        similarity_score = min(
            confidence_factors.high_similarity_count / 5.0, 1.0
        )

        # Combine factors with weights
        confidence = (
            self.SIMILARITY_WEIGHT * similarity_score
            + self.COVERAGE_WEIGHT * confidence_factors.enrichment_coverage
            + self.FRESHNESS_WEIGHT * confidence_factors.freshness_score
        )

        # Penalty if no similar issues at all
        if similar_issues_count == 0:
            confidence *= 0.5

        return min(max(confidence, 0.0), 1.0)

    def _compute_freshness_score(
        self, enrichment_used: List[str], enrichment_status: Dict[str, dict]
    ) -> float:
        """
        Compute weighted freshness score for enrichment data.

        Args:
            enrichment_used: List of enrichment source names used
            enrichment_status: Status info for each source

        Returns:
            Freshness score between 0.0 and 1.0
        """
        if not enrichment_used:
            return 0.0

        freshness_scores = []
        now = datetime.utcnow()

        for source in enrichment_used:
            status = enrichment_status.get(source, {})
            fetched_at = status.get("fetched_at")

            if not fetched_at:
                # No timestamp - assume stale
                freshness_scores.append(0.3)
                continue

            # Convert to datetime if string
            if isinstance(fetched_at, str):
                try:
                    fetched_at = datetime.fromisoformat(
                        fetched_at.replace("Z", "+00:00")
                    )
                except Exception:
                    freshness_scores.append(0.3)
                    continue

            # Compute age in hours
            age_hours = (now - fetched_at).total_seconds() / 3600

            # Score based on age
            if age_hours < self.FRESH_THRESHOLD_HOURS:
                score = 1.0
            elif age_hours < self.STALE_THRESHOLD_HOURS:
                # Linear decay from 1.0 to 0.5
                score = 1.0 - (
                    0.5
                    * (age_hours - self.FRESH_THRESHOLD_HOURS)
                    / (self.STALE_THRESHOLD_HOURS - self.FRESH_THRESHOLD_HOURS)
                )
            elif age_hours < self.VERY_STALE_THRESHOLD_HOURS:
                # Linear decay from 0.5 to 0.2
                score = 0.5 - (
                    0.3
                    * (age_hours - self.STALE_THRESHOLD_HOURS)
                    / (self.VERY_STALE_THRESHOLD_HOURS - self.STALE_THRESHOLD_HOURS)
                )
            else:
                # Very stale
                score = 0.2

            freshness_scores.append(score)

        return sum(freshness_scores) / len(freshness_scores)

    def _generate_confidence_reasoning(
        self,
        high_similarity_count: int,
        coverage: float,
        freshness: float,
        total_similar: int,
    ) -> str:
        """
        Generate human-readable confidence reasoning.

        Args:
            high_similarity_count: Number of high-similarity issues
            coverage: Enrichment coverage ratio
            freshness: Freshness score
            total_similar: Total similar issues

        Returns:
            Human-readable reasoning string
        """
        reasons = []

        # Similarity reasoning
        if high_similarity_count >= 3:
            reasons.append(f"Found {high_similarity_count} highly similar issues")
        elif high_similarity_count > 0:
            reasons.append(
                f"Found {high_similarity_count} similar issue{'s' if high_similarity_count > 1 else ''}"
            )
        elif total_similar > 0:
            reasons.append(f"Found {total_similar} similar issues but with lower similarity")
        else:
            reasons.append("No similar issues found in knowledge base")

        # Coverage reasoning
        coverage_pct = int(coverage * 100)
        if coverage >= 0.8:
            reasons.append(f"Excellent enrichment coverage ({coverage_pct}%)")
        elif coverage >= 0.5:
            reasons.append(f"Good enrichment coverage ({coverage_pct}%)")
        elif coverage >= 0.3:
            reasons.append(f"Moderate enrichment coverage ({coverage_pct}%)")
        else:
            reasons.append(f"Limited enrichment data ({coverage_pct}%)")

        # Freshness reasoning
        if freshness >= 0.8:
            reasons.append("Data is fresh")
        elif freshness >= 0.5:
            reasons.append("Some data may be outdated")
        else:
            reasons.append("Data is stale and may not reflect recent changes")

        return ". ".join(reasons) + "."

    def identify_stale_sources(
        self, enrichment_status: Dict[str, dict]
    ) -> tuple[List[str], List[str]]:
        """
        Identify stale and very stale enrichment sources.

        Args:
            enrichment_status: Status info for each source

        Returns:
            Tuple of (stale_sources, very_stale_sources)
        """
        stale = []
        very_stale = []
        now = datetime.utcnow()

        for source, status in enrichment_status.items():
            fetched_at = status.get("fetched_at")
            if not fetched_at:
                very_stale.append(source)
                continue

            if isinstance(fetched_at, str):
                try:
                    fetched_at = datetime.fromisoformat(
                        fetched_at.replace("Z", "+00:00")
                    )
                except Exception:
                    very_stale.append(source)
                    continue

            age_hours = (now - fetched_at).total_seconds() / 3600

            if age_hours >= self.VERY_STALE_THRESHOLD_HOURS:
                very_stale.append(source)
            elif age_hours >= self.STALE_THRESHOLD_HOURS:
                stale.append(source)

        return stale, very_stale


# Singleton instance
_confidence_scorer: Optional[ConfidenceScorer] = None


def get_confidence_scorer() -> ConfidenceScorer:
    """
    Get singleton confidence scorer instance.

    Returns:
        ConfidenceScorer instance
    """
    global _confidence_scorer
    if _confidence_scorer is None:
        _confidence_scorer = ConfidenceScorer()
    return _confidence_scorer
