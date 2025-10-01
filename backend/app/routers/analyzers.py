# File: backend/app/routers/analyzers.py

"""
API endpoints for analyzer framework operations.

This router provides RESTful endpoints for:
- Discovering available analyzers
- Running analysis on events
- Retrieving analysis results
- Managing analyzer configurations
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Body, HTTPException, Query
from pydantic import BaseModel, Field

from ..models.analyzers import AnalysisResult, AnalyzerCapabilities, AnalyzerType

logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(prefix="/analyzers", tags=["analyzers"])


# Request/Response Models
class AnalyzeEventRequest(BaseModel):
    """Request model for event analysis."""

    event_data: Dict[str, Any] = Field(..., description="Raw event data from Sentry")
    requested_analyzers: Optional[List[AnalyzerType]] = Field(
        None, description="Specific analyzers to run (None for auto-discovery)"
    )
    force_refresh: bool = Field(False, description="Skip cache and force fresh analysis")

    class Config:
        schema_extra = {
            "example": {
                "event_data": {
                    "id": "abc123",
                    "title": "deadlock detected",
                    "message": "ERROR: deadlock detected...",
                    "platform": "python",
                },
                "requested_analyzers": ["deadlock"],
                "force_refresh": False,
            }
        }


class AnalyzeEventResponse(BaseModel):
    """Response model for event analysis."""

    success: bool = Field(..., description="Whether analysis completed successfully")
    event_id: str = Field(..., description="ID of the analyzed event")
    results: List[AnalysisResult] = Field(..., description="Analysis results")
    metrics: Dict[str, Any] = Field(..., description="Orchestration metrics")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class AnalyzerListResponse(BaseModel):
    """Response model for listing analyzers."""

    analyzers: List[AnalyzerCapabilities] = Field(..., description="Available analyzers")
    total_count: int = Field(..., description="Total number of analyzers")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AnalyzerHealthResponse(BaseModel):
    """Response model for analyzer health check."""

    healthy: bool = Field(..., description="Overall health status")
    registry_status: Dict[str, Any] = Field(..., description="Registry health status")
    orchestrator_status: Dict[str, Any] = Field(..., description="Orchestrator health status")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# API Endpoints


@router.get("/", response_model=AnalyzerListResponse)
async def list_analyzers():
    """
    List all available analyzers and their capabilities.

    Returns:
        List of analyzer capabilities and metadata
    """
    try:
        # Import here to avoid circular imports
        from ..services.analyzer_registry import analyzer_registry

        capabilities = analyzer_registry.list_capabilities()

        return AnalyzerListResponse(analyzers=capabilities, total_count=len(capabilities))

    except Exception as e:
        logger.error(f"Failed to list analyzers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list analyzers: {str(e)}")


@router.get("/{analyzer_type}", response_model=AnalyzerCapabilities)
async def get_analyzer_capabilities(analyzer_type: AnalyzerType):
    """
    Get capabilities for a specific analyzer.

    Args:
        analyzer_type: Type of analyzer to get capabilities for

    Returns:
        Analyzer capabilities and metadata
    """
    try:
        from ..services.analyzer_registry import AnalyzerNotFoundError, analyzer_registry

        capabilities = analyzer_registry.get_capabilities(analyzer_type)
        return capabilities

    except AnalyzerNotFoundError:
        raise HTTPException(status_code=404, detail=f"Analyzer {analyzer_type} not found")
    except Exception as e:
        logger.error(f"Failed to get analyzer capabilities: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get analyzer capabilities: {str(e)}"
        )


@router.post("/analyze", response_model=AnalyzeEventResponse)
async def analyze_event(request: AnalyzeEventRequest, background_tasks: BackgroundTasks):
    """
    Analyze an event using the analyzer framework.

    Args:
        request: Analysis request with event data and options
        background_tasks: FastAPI background tasks for async operations

    Returns:
        Analysis results and metrics
    """
    try:
        from ..services.analyzer_orchestrator import analyzer_orchestrator

        event_id = request.event_data.get("id", "unknown")
        logger.info(f"Starting analysis for event {event_id}")

        # Run analysis
        results, metrics = await analyzer_orchestrator.analyze_event(
            event_data=request.event_data,
            requested_analyzers=request.requested_analyzers,
            force_refresh=request.force_refresh,
        )

        # Convert metrics to dict for JSON serialization
        metrics_dict = {
            "total_execution_time_ms": metrics.total_execution_time_ms,
            "analyzers_attempted": metrics.analyzers_attempted,
            "analyzers_succeeded": metrics.analyzers_succeeded,
            "analyzers_failed": metrics.analyzers_failed,
            "analyzers_timed_out": metrics.analyzers_timed_out,
            "highest_confidence": metrics.highest_confidence,
            "highest_business_impact": metrics.highest_business_impact,
            "cache_hits": metrics.cache_hits,
            "cache_misses": metrics.cache_misses,
        }

        logger.info(
            f"Analysis completed for event {event_id}: "
            f"{len(results)} results, {metrics.total_execution_time_ms:.1f}ms"
        )

        return AnalyzeEventResponse(
            success=True, event_id=event_id, results=results, metrics=metrics_dict
        )

    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze/{analyzer_type}", response_model=AnalysisResult)
async def analyze_event_with_specific_analyzer(
    analyzer_type: AnalyzerType,
    event_data: Dict[str, Any] = Body(..., description="Raw event data from Sentry"),
):
    """
    Analyze an event with a specific analyzer.

    Args:
        analyzer_type: Type of analyzer to use
        event_data: Raw event data from Sentry

    Returns:
        Analysis result from the specified analyzer
    """
    try:
        from ..services.analyzer_registry import AnalyzerNotFoundError, analyzer_registry

        event_id = event_data.get("id", "unknown")
        logger.info(f"Running {analyzer_type} analyzer on event {event_id}")

        # Run specific analyzer
        result = await analyzer_registry.run_analyzer(analyzer_type, event_data)

        logger.info(
            f"Analyzer {analyzer_type} completed for event {event_id}: "
            f"confidence {result.confidence:.2f}"
        )

        return result

    except AnalyzerNotFoundError:
        raise HTTPException(status_code=404, detail=f"Analyzer {analyzer_type} not found")
    except Exception as e:
        logger.error(f"Analysis failed for {analyzer_type}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Analysis failed for {analyzer_type}: {str(e)}"
        )


@router.get("/discover/{event_id}")
async def discover_applicable_analyzers(
    event_id: str, event_data: Dict[str, Any] = Body(..., description="Raw event data from Sentry")
):
    """
    Discover which analyzers should be applied to an event.

    Args:
        event_id: ID of the event
        event_data: Raw event data from Sentry

    Returns:
        List of applicable analyzer types
    """
    try:
        from ..services.analyzer_registry import analyzer_registry

        logger.info(f"Discovering applicable analyzers for event {event_id}")

        applicable_analyzers = await analyzer_registry.discover_applicable_analyzers(event_data)

        logger.info(f"Found {len(applicable_analyzers)} applicable analyzers for event {event_id}")

        return {
            "event_id": event_id,
            "applicable_analyzers": applicable_analyzers,
            "total_count": len(applicable_analyzers),
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Discovery failed for event {event_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")


@router.get("/health", response_model=AnalyzerHealthResponse)
async def health_check():
    """
    Perform health check on the analyzer system.

    Returns:
        Health status of registry and orchestrator
    """
    try:
        from ..services.analyzer_orchestrator import analyzer_orchestrator
        from ..services.analyzer_registry import analyzer_registry

        registry_health = analyzer_registry.health_check()
        orchestrator_health = analyzer_orchestrator.health_check()

        overall_healthy = (
            registry_health.get("healthy", False) and orchestrator_health.get("status") == "healthy"
        )

        return AnalyzerHealthResponse(
            healthy=overall_healthy,
            registry_status=registry_health,
            orchestrator_status=orchestrator_health,
        )

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/metrics")
async def get_metrics():
    """
    Get performance metrics for analyzers.

    Returns:
        Performance and orchestration metrics
    """
    try:
        from ..services.analyzer_orchestrator import analyzer_orchestrator
        from ..services.analyzer_registry import analyzer_registry

        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "analyzer_performance": analyzer_registry.get_performance_stats(),
            "orchestration": analyzer_orchestrator.get_orchestration_metrics(),
        }

        return metrics

    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.delete("/cache")
async def clear_cache(
    event_id: Optional[str] = Query(None, description="Specific event ID to clear")
):
    """
    Clear analysis result cache.

    Args:
        event_id: Clear cache for specific event (None for all)

    Returns:
        Cache clearing confirmation
    """
    try:
        from ..services.analyzer_orchestrator import analyzer_orchestrator

        analyzer_orchestrator.clear_cache(event_id)

        return {
            "success": True,
            "message": f"Cache cleared for {event_id if event_id else 'all events'}",
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


# Legacy endpoint for backward compatibility
@router.get("/analyze-deadlock/{event_id}")
async def analyze_deadlock_legacy(event_id: str):
    """
    Legacy deadlock analysis endpoint for backward compatibility.

    This endpoint provides backward compatibility with the old deadlock analyzer.
    New code should use the /analyze endpoint with analyzer_type=deadlock.
    """
    try:
        from ..services.analyzer_registry import analyzer_registry

        logger.info(f"Legacy deadlock analysis for event {event_id}")

        # This is a simplified implementation for backward compatibility
        # In a real implementation, you'd fetch the event data from Sentry first
        event_data = {"id": event_id, "title": "deadlock detected"}

        # Try to run the deadlock analyzer
        try:
            result = await analyzer_registry.run_analyzer(AnalyzerType.DEADLOCK, event_data)

            return {
                "analysis": {
                    "event_id": event_id,
                    "confidence": result.confidence,
                    "findings": result.findings,
                    "recommendations": result.recommendations,
                    "visualization_data": result.visualization_data,
                },
                "error": None,
            }

        except Exception:
            # If the new analyzer fails, return a compatible response
            return {
                "analysis": None,
                "error": "Deadlock analyzer not available. Please use the new /analyze endpoint.",
            }

    except Exception as e:
        logger.error(f"Legacy deadlock analysis failed for event {event_id}: {e}")
        return {"analysis": None, "error": f"Analysis failed: {str(e)}"}
