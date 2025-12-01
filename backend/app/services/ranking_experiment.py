"""
Ranking Experiment Service for A/B Testing Multi-Signal Ranking.

EPIC P - Story P-1: A/B testing infrastructure for ranking algorithm variants.

Supports:
- Multiple ranking variants (control, balanced, enrichment_heavy)
- User assignment based on stable hash
- Metrics collection for variant performance
- Statistical analysis of variant effectiveness
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from enum import Enum

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class RankingVariant(str, Enum):
    """Supported ranking variants for A/B testing."""
    CONTROL = "control"  # Pure vector similarity (100%)
    BALANCED = "balanced"  # Default: 40% vector, 60% enrichment
    ENRICHMENT_HEAVY = "enrichment_heavy"  # 20% vector, 80% enrichment


class VariantMetrics(BaseModel):
    """Metrics for a single ranking variant."""
    variant: RankingVariant
    sample_size: int = 0
    avg_relevance: float = 0.0
    avg_latency_ms: float = 0.0
    avg_similarity_score: float = 0.0
    avg_composite_score: float = 0.0
    thumbs_up_count: int = 0
    thumbs_down_count: int = 0
    click_through_rate: float = 0.0  # % of users who clicked a similar issue
    avg_rank_of_clicked: Optional[float] = None  # Average rank position of clicked issues


class ExperimentStats(BaseModel):
    """Overall experiment statistics across all variants."""
    experiment_start: datetime
    total_queries: int
    variants: Dict[str, VariantMetrics]
    winning_variant: Optional[RankingVariant] = None
    confidence_level: float = 0.0  # Statistical confidence (0-1)


class RankingExperiment:
    """
    A/B testing infrastructure for ranking algorithms.

    Manages:
    - Stable user assignment to variants
    - Metrics collection per variant
    - Statistical analysis of results
    """

    def __init__(self):
        """Initialize the ranking experiment."""
        self.experiment_start = datetime.now(timezone.utc)
        self.metrics: Dict[RankingVariant, VariantMetrics] = {
            variant: VariantMetrics(variant=variant)
            for variant in RankingVariant
        }

    def get_variant_for_user(self, user_id: str) -> RankingVariant:
        """
        Get the assigned variant for a user based on stable hash.

        Uses consistent hashing to ensure the same user always gets
        the same variant across sessions.

        Args:
            user_id: Unique user identifier (email, user_id, session_id)

        Returns:
            Assigned RankingVariant
        """
        # Hash the user_id to get a stable assignment
        hash_val = int(hashlib.md5(user_id.encode()).hexdigest(), 16)

        # Distribute evenly across 3 variants
        variant_index = hash_val % 3

        variants = [
            RankingVariant.CONTROL,
            RankingVariant.BALANCED,
            RankingVariant.ENRICHMENT_HEAVY
        ]

        assigned = variants[variant_index]

        logger.debug(
            f"Assigned user to ranking variant",
            extra={
                "user_id_hash": hash_val % 1000,  # Don't log raw user_id
                "variant": assigned.value
            }
        )

        return assigned

    def record_query(
        self,
        variant: RankingVariant,
        latency_ms: float,
        similarity_score: float,
        composite_score: float,
    ) -> None:
        """
        Record a query execution for metrics.

        Args:
            variant: Which variant was used
            latency_ms: Query latency in milliseconds
            similarity_score: Top result's similarity score
            composite_score: Top result's composite score
        """
        metrics = self.metrics[variant]
        n = metrics.sample_size

        # Update running averages
        metrics.avg_latency_ms = (
            (metrics.avg_latency_ms * n + latency_ms) / (n + 1)
        )
        metrics.avg_similarity_score = (
            (metrics.avg_similarity_score * n + similarity_score) / (n + 1)
        )
        metrics.avg_composite_score = (
            (metrics.avg_composite_score * n + composite_score) / (n + 1)
        )
        metrics.sample_size += 1

        logger.debug(
            f"Recorded query for variant {variant.value}",
            extra={
                "variant": variant.value,
                "latency_ms": latency_ms,
                "sample_size": metrics.sample_size
            }
        )

    def record_feedback(
        self,
        variant: RankingVariant,
        feedback_type: str,
        relevance_score: Optional[float] = None,
    ) -> None:
        """
        Record user feedback for a variant.

        Args:
            variant: Which variant received feedback
            feedback_type: "positive", "negative", or "correction"
            relevance_score: Optional manual relevance rating (1-5)
        """
        metrics = self.metrics[variant]

        if feedback_type == "positive":
            metrics.thumbs_up_count += 1
        elif feedback_type == "negative":
            metrics.thumbs_down_count += 1

        if relevance_score is not None:
            n = metrics.sample_size
            # Normalize relevance to 0-1 scale (assuming 1-5 input)
            normalized_relevance = (relevance_score - 1) / 4.0
            metrics.avg_relevance = (
                (metrics.avg_relevance * n + normalized_relevance) / (n + 1)
            )

        logger.debug(
            f"Recorded feedback for variant {variant.value}",
            extra={
                "variant": variant.value,
                "feedback_type": feedback_type,
                "thumbs_up": metrics.thumbs_up_count,
                "thumbs_down": metrics.thumbs_down_count
            }
        )

    def record_click(
        self,
        variant: RankingVariant,
        clicked_rank: int,
    ) -> None:
        """
        Record that a user clicked on a similar issue.

        Args:
            variant: Which variant was used
            clicked_rank: Rank position of the clicked issue (1-indexed)
        """
        metrics = self.metrics[variant]

        # Update click-through rate
        clicks = int(metrics.click_through_rate * metrics.sample_size)
        clicks += 1
        if metrics.sample_size > 0:
            metrics.click_through_rate = clicks / metrics.sample_size

        # Update average rank of clicked issues
        if metrics.avg_rank_of_clicked is None:
            metrics.avg_rank_of_clicked = float(clicked_rank)
        else:
            current_avg = metrics.avg_rank_of_clicked
            current_count = clicks - 1
            metrics.avg_rank_of_clicked = (
                (current_avg * current_count + clicked_rank) / clicks
            )

        logger.debug(
            f"Recorded click for variant {variant.value}",
            extra={
                "variant": variant.value,
                "clicked_rank": clicked_rank,
                "ctr": metrics.click_through_rate,
                "avg_rank": metrics.avg_rank_of_clicked
            }
        )

    def get_stats(self) -> ExperimentStats:
        """
        Get current experiment statistics.

        Returns:
            ExperimentStats with all variant metrics
        """
        total_queries = sum(m.sample_size for m in self.metrics.values())

        # Determine winning variant (highest avg_relevance + CTR)
        winning_variant = None
        best_score = 0.0

        for variant, metrics in self.metrics.items():
            if metrics.sample_size < 10:
                continue  # Need minimum sample size

            # Combined score: relevance + CTR
            score = metrics.avg_relevance * 0.6 + metrics.click_through_rate * 0.4

            if score > best_score:
                best_score = score
                winning_variant = variant

        # Calculate confidence level (simplified)
        confidence = 0.0
        if winning_variant and total_queries > 100:
            # Simple confidence based on sample size
            confidence = min(1.0, total_queries / 1000)

        return ExperimentStats(
            experiment_start=self.experiment_start,
            total_queries=total_queries,
            variants={
                variant.value: metrics
                for variant, metrics in self.metrics.items()
            },
            winning_variant=winning_variant,
            confidence_level=confidence,
        )

    def compare_variants(
        self,
        metric: str = "avg_relevance"
    ) -> List[Dict[str, Any]]:
        """
        Compare variants by a specific metric.

        Args:
            metric: Metric to compare ("avg_relevance", "avg_latency_ms", "click_through_rate")

        Returns:
            List of variants sorted by metric (best first)
        """
        comparisons = []

        for variant, metrics in self.metrics.items():
            if metrics.sample_size == 0:
                continue

            value = getattr(metrics, metric, 0.0)

            comparisons.append({
                "variant": variant.value,
                "metric": metric,
                "value": value,
                "sample_size": metrics.sample_size,
                "thumbs_up_rate": (
                    metrics.thumbs_up_count / metrics.sample_size
                    if metrics.sample_size > 0 else 0.0
                ),
            })

        # Sort by metric value (descending for most metrics, ascending for latency)
        reverse = metric != "avg_latency_ms"
        comparisons.sort(key=lambda x: x["value"], reverse=reverse)

        return comparisons

    def reset_experiment(self) -> None:
        """Reset all experiment metrics (for testing or new experiments)."""
        self.experiment_start = datetime.now(timezone.utc)
        self.metrics = {
            variant: VariantMetrics(variant=variant)
            for variant in RankingVariant
        }
        logger.info("Reset ranking experiment metrics")


# Singleton instance
_ranking_experiment: Optional[RankingExperiment] = None


def get_ranking_experiment() -> RankingExperiment:
    """Get singleton ranking experiment instance."""
    global _ranking_experiment
    if _ranking_experiment is None:
        _ranking_experiment = RankingExperiment()
    return _ranking_experiment
