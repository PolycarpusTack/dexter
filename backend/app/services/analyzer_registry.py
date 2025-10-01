# File: backend/app/services/analyzer_registry.py

"""
Analyzer registry service for managing analyzer instances and capabilities.

This service maintains a registry of all available analyzers and provides
methods to discover, instantiate, and manage analyzer lifecycle.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Type

from ..models.analyzers import AnalysisResult, AnalyzerCapabilities, AnalyzerType, BaseAnalyzer

logger = logging.getLogger(__name__)


class AnalyzerRegistryError(Exception):
    """Base exception for analyzer registry operations."""


class AnalyzerNotFoundError(AnalyzerRegistryError):
    """Raised when a requested analyzer is not found."""


class AnalyzerRegistry:
    """
    Central registry for all analyzer implementations.

    This class manages the lifecycle of analyzers, including registration,
    discovery, and execution coordination.
    """

    def __init__(self):
        self._analyzers: Dict[AnalyzerType, Type[BaseAnalyzer]] = {}
        self._instances: Dict[AnalyzerType, BaseAnalyzer] = {}
        self._capabilities: Dict[AnalyzerType, AnalyzerCapabilities] = {}
        self._performance_stats: Dict[AnalyzerType, Dict[str, Any]] = {}
        self._llm_service = None  # Will be set during initialization

    def set_llm_service(self, llm_service) -> None:
        """
        Set the LLM service for analyzers that support AI recommendations.

        Args:
            llm_service: LLM service instance
        """
        self._llm_service = llm_service
        logger.info("LLM service set for analyzer registry")

    def register_analyzer(
        self, analyzer_type: AnalyzerType, analyzer_class: Type[BaseAnalyzer]
    ) -> None:
        """
        Register a new analyzer type.

        Args:
            analyzer_type: The type identifier for the analyzer
            analyzer_class: The analyzer class implementation

        Raises:
            AnalyzerRegistryError: If analyzer is already registered
        """
        if analyzer_type in self._analyzers:
            raise AnalyzerRegistryError(f"Analyzer {analyzer_type} is already registered")

        try:
            # Create a temporary instance to validate the implementation
            temp_instance = analyzer_class()
            capabilities = temp_instance.capabilities

            # Store the registration
            self._analyzers[analyzer_type] = analyzer_class
            self._capabilities[analyzer_type] = capabilities
            self._performance_stats[analyzer_type] = {
                "total_executions": 0,
                "total_time_ms": 0.0,
                "average_time_ms": 0.0,
                "error_count": 0,
                "last_execution": None,
            }

            logger.info(f"Registered analyzer: {analyzer_type} ({capabilities.name})")

        except Exception as e:
            raise AnalyzerRegistryError(
                f"Failed to register analyzer {analyzer_type}: {str(e)}"
            ) from e

    def unregister_analyzer(self, analyzer_type: AnalyzerType) -> None:
        """
        Unregister an analyzer type.

        Args:
            analyzer_type: The type identifier to unregister
        """
        if analyzer_type in self._analyzers:
            del self._analyzers[analyzer_type]

        if analyzer_type in self._instances:
            del self._instances[analyzer_type]

        if analyzer_type in self._capabilities:
            del self._capabilities[analyzer_type]

        if analyzer_type in self._performance_stats:
            del self._performance_stats[analyzer_type]

        logger.info(f"Unregistered analyzer: {analyzer_type}")

    def get_analyzer(self, analyzer_type: AnalyzerType) -> BaseAnalyzer:
        """
        Get an analyzer instance (lazy instantiation).

        Args:
            analyzer_type: The type of analyzer to get

        Returns:
            Analyzer instance

        Raises:
            AnalyzerNotFoundError: If analyzer type is not registered
        """
        if analyzer_type not in self._analyzers:
            raise AnalyzerNotFoundError(f"Analyzer {analyzer_type} not found")

        # Lazy instantiation
        if analyzer_type not in self._instances:
            analyzer_class = self._analyzers[analyzer_type]
            try:
                # Pass LLM service to analyzers that support it
                if (
                    analyzer_type in [AnalyzerType.DEADLOCK, AnalyzerType.MEMORY_LEAK]
                    and self._llm_service
                ):
                    self._instances[analyzer_type] = analyzer_class(llm_service=self._llm_service)
                else:
                    self._instances[analyzer_type] = analyzer_class()
                logger.debug(f"Instantiated analyzer: {analyzer_type}")
            except Exception as e:
                raise AnalyzerRegistryError(
                    f"Failed to instantiate analyzer {analyzer_type}: {str(e)}"
                ) from e

        return self._instances[analyzer_type]

    def get_capabilities(self, analyzer_type: AnalyzerType) -> AnalyzerCapabilities:
        """
        Get capabilities for a specific analyzer.

        Args:
            analyzer_type: The type of analyzer

        Returns:
            Analyzer capabilities

        Raises:
            AnalyzerNotFoundError: If analyzer type is not registered
        """
        if analyzer_type not in self._capabilities:
            raise AnalyzerNotFoundError(f"Analyzer {analyzer_type} not found")

        return self._capabilities[analyzer_type]

    def list_analyzers(self) -> List[AnalyzerType]:
        """
        List all registered analyzer types.

        Returns:
            List of registered analyzer types
        """
        return list(self._analyzers.keys())

    def list_capabilities(self) -> List[AnalyzerCapabilities]:
        """
        List capabilities for all registered analyzers.

        Returns:
            List of analyzer capabilities
        """
        return list(self._capabilities.values())

    async def discover_applicable_analyzers(self, event_data: Dict[str, Any]) -> List[AnalyzerType]:
        """
        Discover which analyzers should be applied to an event.

        Args:
            event_data: Raw event data from Sentry

        Returns:
            List of analyzer types that should process this event
        """
        applicable_analyzers = []

        # Run detection in parallel for performance
        detection_tasks = []
        for analyzer_type in self._analyzers.keys():
            try:
                analyzer = self.get_analyzer(analyzer_type)
                task = asyncio.create_task(
                    analyzer.detect(event_data), name=f"detect_{analyzer_type}"
                )
                detection_tasks.append((analyzer_type, task))
            except Exception as e:
                logger.error(f"Failed to create detection task for {analyzer_type}: {e}")

        # Wait for all detection tasks to complete
        for analyzer_type, task in detection_tasks:
            try:
                should_apply = await task
                if should_apply:
                    applicable_analyzers.append(analyzer_type)
                    logger.debug(f"Analyzer {analyzer_type} applicable to event")
            except Exception as e:
                logger.error(f"Detection failed for {analyzer_type}: {e}")

        return applicable_analyzers

    async def run_analyzer(
        self, analyzer_type: AnalyzerType, event_data: Dict[str, Any]
    ) -> AnalysisResult:
        """
        Run a specific analyzer on event data.

        Args:
            analyzer_type: Type of analyzer to run
            event_data: Raw event data from Sentry

        Returns:
            Analysis result

        Raises:
            AnalyzerNotFoundError: If analyzer type is not registered
            AnalyzerRegistryError: If analysis fails
        """
        start_time = datetime.utcnow()

        try:
            analyzer = self.get_analyzer(analyzer_type)

            # Run the analysis pipeline
            parsed_data = await analyzer.parse(event_data)
            result = await analyzer.analyze(parsed_data)

            # Update performance statistics
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_performance_stats(analyzer_type, execution_time, success=True)

            logger.info(
                f"Analysis completed: {analyzer_type} "
                f"(confidence: {result.confidence:.2f}, "
                f"time: {execution_time:.1f}ms)"
            )

            return result

        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_performance_stats(analyzer_type, execution_time, success=False)

            logger.error(f"Analysis failed for {analyzer_type}: {e}")
            raise AnalyzerRegistryError(f"Analysis failed for {analyzer_type}: {str(e)}") from e

    def _update_performance_stats(
        self, analyzer_type: AnalyzerType, execution_time_ms: float, success: bool
    ) -> None:
        """Update performance statistics for an analyzer."""
        if analyzer_type not in self._performance_stats:
            return

        stats = self._performance_stats[analyzer_type]
        stats["total_executions"] += 1
        stats["total_time_ms"] += execution_time_ms
        stats["average_time_ms"] = stats["total_time_ms"] / stats["total_executions"]
        stats["last_execution"] = datetime.utcnow().isoformat()

        if not success:
            stats["error_count"] += 1

    def get_performance_stats(self, analyzer_type: Optional[AnalyzerType] = None) -> Dict[str, Any]:
        """
        Get performance statistics for analyzers.

        Args:
            analyzer_type: Specific analyzer to get stats for, or None for all

        Returns:
            Performance statistics
        """
        if analyzer_type:
            return self._performance_stats.get(analyzer_type, {})
        else:
            return dict(self._performance_stats)

    def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on all registered analyzers.

        Returns:
            Health check results
        """
        health_status = {
            "healthy": True,
            "total_analyzers": len(self._analyzers),
            "analyzer_status": {},
            "timestamp": datetime.utcnow().isoformat(),
        }

        for analyzer_type in self._analyzers.keys():
            try:
                # Try to get the analyzer (tests instantiation)
                self.get_analyzer(analyzer_type)
                capabilities = self.get_capabilities(analyzer_type)
                stats = self.get_performance_stats(analyzer_type)

                analyzer_health = {
                    "status": "healthy",
                    "capabilities": capabilities.dict(),
                    "performance": stats,
                }

                # Check error rate
                if stats.get("total_executions", 0) > 0:
                    error_rate = stats.get("error_count", 0) / stats["total_executions"]
                    if error_rate > 0.1:  # 10% error rate threshold
                        analyzer_health["status"] = "degraded"
                        analyzer_health["warning"] = f"High error rate: {error_rate:.1%}"

                health_status["analyzer_status"][analyzer_type] = analyzer_health

            except Exception as e:
                health_status["healthy"] = False
                health_status["analyzer_status"][analyzer_type] = {
                    "status": "unhealthy",
                    "error": str(e),
                }

        return health_status


# Global registry instance
analyzer_registry = AnalyzerRegistry()
