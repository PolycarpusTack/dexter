"""
N+1 Query Analysis Service - Provides analysis of N+1 query patterns.

This service uses the n_plus_one_parser to analyze Sentry events for N+1 query patterns
and provide optimization recommendations.
"""

import time
import logging
from typing import Dict, Any, Optional
from app.utils.n_plus_one_parser import parse_n_plus_one_query, N1QueryInfo
from app.services.sentry_client import SentryApiClient

logger = logging.getLogger(__name__)


class N1QueryService:
    """Service for analyzing N+1 query patterns."""

    def __init__(self, sentry_client: Optional[SentryApiClient] = None):
        """Initialize the service with an optional Sentry client."""
        self.sentry_client = sentry_client

    async def analyze_event(
        self, event_data: Dict[str, Any], use_enhanced_analysis: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze a Sentry event for N+1 query patterns.

        Args:
            event_data: Sentry event data containing performance information
            use_enhanced_analysis: Whether to use enhanced analysis (more CPU intensive)

        Returns:
            Dictionary with analysis results or None if no N+1 patterns detected
        """
        start_time = time.time()

        try:
            # Parse the event data
            n1_info = parse_n_plus_one_query(event_data)

            if not n1_info:
                return None

            execution_time = (time.time() - start_time) * 1000  # ms

            # Convert to response format
            return {
                "success": True,
                "analysis": {
                    "timestamp": self._get_current_timestamp(),
                    "metadata": {
                        "execution_time_ms": execution_time,
                        "parser_version": "enhanced" if use_enhanced_analysis else "standard",
                        "patterns_found": len(n1_info.patterns),
                        "confidence_score": self._calculate_confidence_score(n1_info),
                    },
                    "visualization_data": n1_info.visualization_data,
                    "recommended_fix": n1_info.recommended_fix,
                },
            }
        except Exception as e:
            logger.exception(f"Error analyzing N+1 query: {str(e)}")
            return {"success": False, "error": str(e)}

    async def analyze_event_by_id(
        self, event_id: str, use_enhanced_analysis: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze a Sentry event for N+1 query patterns by its ID.

        Args:
            event_id: Sentry event ID
            use_enhanced_analysis: Whether to use enhanced analysis

        Returns:
            Dictionary with analysis results or None if no N+1 patterns detected
        """
        if not self.sentry_client:
            logger.error("Sentry client not provided to N1QueryService")
            return {"success": False, "error": "Sentry client not available"}

        try:
            # Fetch the event from Sentry
            event_data = await self.sentry_client.get_event_details(event_id)

            if not event_data:
                return {"success": False, "error": f"Event {event_id} not found"}

            # Analyze the event
            return await self.analyze_event(event_data, use_enhanced_analysis)
        except Exception as e:
            logger.exception(f"Error analyzing event {event_id}: {str(e)}")
            return {"success": False, "error": str(e)}

    def _get_current_timestamp(self) -> str:
        """Get current ISO timestamp."""
        import datetime

        return datetime.datetime.utcnow().isoformat() + "Z"

    def _calculate_confidence_score(self, n1_info: N1QueryInfo) -> float:
        """
        Calculate a confidence score for the N+1 query detection.

        A higher score (0.0-1.0) indicates higher confidence in the pattern detection.
        """
        if not n1_info.patterns:
            return 0.0

        # Factors that increase confidence
        factors = []

        # More patterns increases confidence
        pattern_count = min(len(n1_info.patterns), 5) / 5
        factors.append(pattern_count)

        # More child queries increases confidence
        child_ratio = min(len(n1_info.patterns[0].child_queries), 10) / 10
        factors.append(child_ratio)

        # Higher potential savings increases confidence
        savings = min(n1_info.patterns[0].savings_percentage, 90) / 90
        factors.append(savings)

        # Clear timing patterns increase confidence
        time_consistency = self._evaluate_timing_consistency(n1_info.patterns[0])
        factors.append(time_consistency)

        # Average the factors
        return sum(factors) / len(factors)

    def _evaluate_timing_consistency(self, pattern: Any) -> float:
        """
        Evaluate the consistency of timing between child queries.

        Consistent timing patterns suggest a stronger N+1 relationship.
        """
        if not pattern.child_queries or len(pattern.child_queries) < 2:
            return 0.5

        # Calculate execution time variance
        times = [q.execution_time for q in pattern.child_queries]
        mean_time = sum(times) / len(times)

        # Avoid division by zero
        if mean_time == 0:
            return 0.5

        # Calculate coefficient of variation (lower is more consistent)
        variance = sum((t - mean_time) ** 2 for t in times) / len(times)
        std_dev = variance**0.5
        cv = std_dev / mean_time

        # Convert to a 0-1 score (lower CV means higher consistency)
        consistency = max(0, min(1, 1 - (cv / 2)))

        return consistency


def get_n1_query_service(sentry_client: Optional[SentryApiClient] = None) -> N1QueryService:
    """Factory function to create a N1QueryService instance."""
    return N1QueryService(sentry_client)
