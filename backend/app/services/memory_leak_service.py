"""
Memory Leak Analysis Service - Provides analysis of memory consumption patterns.

This service uses the memory_leak_parser to analyze Sentry events for memory leaks
and provide optimization recommendations.
"""

import logging
import time
from typing import Any, Dict, Optional

from app.services.sentry_client import SentryApiClient
from app.utils.memory_leak_parser import MemoryLeakInfo, parse_memory_leak

logger = logging.getLogger(__name__)


class MemoryLeakService:
    """Service for analyzing memory leaks."""

    def __init__(self, sentry_client: Optional[SentryApiClient] = None):
        """Initialize the service with an optional Sentry client."""
        self.sentry_service = sentry_client

    async def analyze_event(
        self, event_data: Dict[str, Any], use_enhanced_analysis: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze a Sentry event for memory leaks.

        Args:
            event_data: Sentry event data containing memory information
            use_enhanced_analysis: Whether to use enhanced analysis (more CPU intensive)

        Returns:
            Dictionary with analysis results or None if no memory leaks detected
        """
        start_time = time.time()

        try:
            # Parse the event data
            memory_info = parse_memory_leak(event_data)

            if not memory_info:
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
                        "objects_analyzed": len(memory_info.snapshots[-1].objects)
                        if memory_info.snapshots
                        else 0,
                        "leaks_found": len(memory_info.leaking_objects),
                        "confidence_score": self._calculate_confidence_score(memory_info),
                    },
                    "visualization_data": memory_info.visualization_data,
                    "recommended_fix": memory_info.recommended_fix,
                },
            }
        except Exception as e:
            logger.exception(f"Error analyzing memory leak: {str(e)}")
            return {"success": False, "error": str(e)}

    async def analyze_event_by_id(
        self, event_id: str, use_enhanced_analysis: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze a Sentry event for memory leaks by its ID.

        Args:
            event_id: Sentry event ID
            use_enhanced_analysis: Whether to use enhanced analysis

        Returns:
            Dictionary with analysis results or None if no memory leaks detected
        """
        if not self.sentry_service:
            logger.error("Sentry service not provided to MemoryLeakService")
            return {"success": False, "error": "Sentry service not available"}

        try:
            # Fetch the event from Sentry
            event_data = await self.sentry_service.get_event(event_id)

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

    def _calculate_confidence_score(self, memory_info: MemoryLeakInfo) -> float:
        """
        Calculate a confidence score for the memory leak detection.

        A higher score (0.0-1.0) indicates higher confidence in the leak detection.
        """
        if not memory_info.leaking_objects:
            return 0.0

        # Factors that increase confidence
        factors = []

        # More snapshots increases confidence
        snapshot_count = min(len(memory_info.snapshots), 10) / 10
        factors.append(snapshot_count)

        # More leaking objects increases confidence
        leak_count = min(len(memory_info.leaking_objects), 5) / 5
        factors.append(leak_count)

        # Higher growth rates increase confidence
        if memory_info.leaking_objects:
            # Normalize growth rate to 0-1 scale
            # Consider growth of 100+ objects per minute as high confidence
            max_growth = max(obj.growth_rate for obj in memory_info.leaking_objects)
            growth_factor = min(max_growth / 100, 1.0)
            factors.append(growth_factor)

        # Time span of snapshots increases confidence
        if len(memory_info.snapshots) >= 2:
            # Time span in minutes
            time_span = (
                memory_info.snapshots[-1].timestamp - memory_info.snapshots[0].timestamp
            ) / 60
            # Normalize: 30+ minutes is high confidence
            time_factor = min(time_span / 30, 1.0)
            factors.append(time_factor)

        # Average the factors
        return sum(factors) / len(factors)


def get_memory_leak_service(
    sentry_client: Optional[SentryApiClient] = None,
) -> MemoryLeakService:
    """Factory function to create a MemoryLeakService instance."""
    return MemoryLeakService(sentry_client)
