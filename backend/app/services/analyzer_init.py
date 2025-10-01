# File: backend/app/services/analyzer_init.py

"""
Initialization module for the analyzer framework.

This module registers all available analyzers with the analyzer registry
when the application starts.
"""

import logging

from ..models.analyzers import AnalyzerType
from .analyzer_registry import analyzer_registry
from .deadlock_analyzer import PostgreSQLDeadlockAnalyzer
from .memory_leak_analyzer import MemoryLeakAnalyzer
from .n_plus_one_analyzer import N1QueryAnalyzer
from .promise_rejection_analyzer import PromiseRejectionAnalyzer

logger = logging.getLogger(__name__)


def initialize_analyzers(llm_service=None):
    """
    Initialize and register all available analyzers.

    This function should be called during application startup to register
    all analyzer implementations with the registry.

    Args:
        llm_service: Optional LLM service instance for AI-powered features
    """
    try:
        # Set LLM service if provided
        if llm_service:
            analyzer_registry.set_llm_service(llm_service)
            logger.info("LLM service configured for analyzer framework")

        # Register PostgreSQL Deadlock Analyzer
        analyzer_registry.register_analyzer(AnalyzerType.DEADLOCK, PostgreSQLDeadlockAnalyzer)
        logger.info("Registered PostgreSQL Deadlock Analyzer")

        # Register Memory Leak Analyzer
        analyzer_registry.register_analyzer(AnalyzerType.MEMORY_LEAK, MemoryLeakAnalyzer)
        logger.info("Registered Memory Leak Analyzer")

        # Register Promise Rejection Analyzer
        analyzer_registry.register_analyzer(
            AnalyzerType.PROMISE_REJECTION, PromiseRejectionAnalyzer
        )
        logger.info("Registered Promise Rejection Analyzer")

        # Register N+1 Query Analyzer
        analyzer_registry.register_analyzer(AnalyzerType.N_PLUS_ONE, N1QueryAnalyzer)
        logger.info("Registered N+1 Query Analyzer")

        # Log summary
        registered = analyzer_registry.list_analyzers()
        logger.info(
            f"Analyzer framework initialized with {len(registered)} analyzers: {registered}"
        )

    except Exception as e:
        logger.error(f"Failed to initialize analyzers: {e}")
        raise
