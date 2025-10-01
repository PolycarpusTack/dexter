"""
API endpoints for memory leak analysis.

This module provides endpoints for analyzing Sentry events for memory leaks
using the unified analyzer framework and generating optimization recommendations.
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from app.models.analyzers import AnalyzerType
from app.services.analyzer_orchestrator import AnalyzerOrchestrator, get_analyzer_orchestrator
from app.services.memory_leak_analyzer import MemoryLeakAnalyzer
from app.services.sentry_client import SentryApiClient, get_sentry_client

router = APIRouter(prefix="/memory-leak", tags=["Memory Leak Analysis"])


@router.get(
    "/analysis/{event_id}",
    response_model=Dict[str, Any],
    response_model_exclude_none=True,
)
async def get_memory_leak_analysis(
    event_id: str,
    orchestrator: AnalyzerOrchestrator = Depends(get_analyzer_orchestrator),
):
    """
    Get existing memory leak analysis results for an event.

    Args:
        event_id: Sentry event ID

    Returns:
        Existing analysis results or 404 if not found
    """
    try:
        # Try to get existing analysis from cache/storage
        MemoryLeakAnalyzer()
        # This would typically check a database or cache for existing results
        # For now, return 404 to indicate no existing analysis
        raise HTTPException(status_code=404, detail="No existing analysis found")
    except Exception:
        raise HTTPException(status_code=404, detail="Analysis not found")


@router.post(
    "/reanalyze/{event_id}",
    response_model=Dict[str, Any],
    response_model_exclude_none=True,
)
async def reanalyze_memory_leak(
    event_id: str,
    enable_ai_recommendations: bool = Query(True, description="Enable AI-powered recommendations"),
    enable_ml_detection: bool = Query(True, description="Enable ML-based pattern detection"),
    force_refresh: bool = Query(True, description="Force refresh of analysis"),
    orchestrator: AnalyzerOrchestrator = Depends(get_analyzer_orchestrator),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
):
    """
    Re-analyze a Sentry event for memory leaks with updated parameters.

    Args:
        event_id: Sentry event ID to re-analyze
        enable_ai_recommendations: Enable AI-powered recommendations
        enable_ml_detection: Enable ML-based pattern detection
        force_refresh: Force refresh of analysis

    Returns:
        Updated analysis results with visualization data and recommendations
    """
    try:
        # Fetch event data from Sentry
        event_data = await sentry_client.get_event(event_id)
        if not event_data:
            raise HTTPException(status_code=404, detail="Event not found")

        # Analyze using the unified framework
        results = await orchestrator.analyze_event(
            event_data=event_data,
            analyzer_types=[AnalyzerType.MEMORY_LEAK],
            force_refresh=force_refresh,
            options={
                "enable_ai_recommendations": enable_ai_recommendations,
                "enable_ml_detection": enable_ml_detection,
                "max_analysis_duration_seconds": 120,
            },
        )

        if not results or AnalyzerType.MEMORY_LEAK not in results:
            raise HTTPException(status_code=404, detail="No memory leak analysis available")

        return results[AnalyzerType.MEMORY_LEAK]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze", response_model=Dict[str, Any], response_model_exclude_none=True)
async def analyze_memory_leak_data(
    event_data: Dict[str, Any],
    use_enhanced: bool = Query(False, description="Use enhanced analysis techniques"),
    enable_ai_recommendations: bool = Query(True, description="Enable AI-powered recommendations"),
    enable_ml_detection: bool = Query(True, description="Enable ML-based pattern detection"),
    orchestrator: AnalyzerOrchestrator = Depends(get_analyzer_orchestrator),
):
    """
    Analyze event data directly for memory leaks using the unified framework.

    This endpoint accepts event data directly in the request body and analyzes it
    for memory leaks without fetching from Sentry.

    Args:
        event_data: Sentry event data to analyze
        use_enhanced: Use enhanced analysis techniques (legacy parameter)
        enable_ai_recommendations: Enable AI-powered recommendations
        enable_ml_detection: Enable ML-based pattern detection

    Returns:
        Analysis results with visualization data and recommendations
    """
    try:
        # Analyze using the unified framework
        results = await orchestrator.analyze_event(
            event_data=event_data,
            analyzer_types=[AnalyzerType.MEMORY_LEAK],
            force_refresh=True,
            options={
                "enable_ai_recommendations": enable_ai_recommendations,
                "enable_ml_detection": enable_ml_detection,
                "use_enhanced": use_enhanced,  # Legacy support
                "max_analysis_duration_seconds": 120,
            },
        )

        if not results or AnalyzerType.MEMORY_LEAK not in results:
            raise HTTPException(status_code=404, detail="No memory leak analysis available")

        return results[AnalyzerType.MEMORY_LEAK]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post(
    "/upload-snapshot",
    response_model=Dict[str, Any],
    response_model_exclude_none=True,
)
async def upload_heap_snapshot(
    event_id: str = Form(...),
    heap_snapshot: UploadFile = File(...),
    format: Optional[str] = Form(None),
):
    """
    Upload a heap snapshot file for analysis.

    Args:
        event_id: Sentry event ID to associate with the snapshot
        heap_snapshot: Heap snapshot file (V8, JavaScriptCore, or SpiderMonkey format)
        format: Optional format specification ('v8', 'javascriptcore', 'spidermonkey')

    Returns:
        Upload result with snapshot ID and status
    """
    try:
        # Validate format if provided
        if format and format not in ["v8", "javascriptcore", "spidermonkey"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid format. Must be 'v8', 'javascriptcore', or 'spidermonkey'",
            )

        # Read file content
        content = await heap_snapshot.read()

        # Auto-detect format if not provided
        detected_format = _detect_heap_format(content) if not format else format

        # Generate snapshot ID
        import uuid

        snapshot_id = str(uuid.uuid4())

        # In a real implementation, you would store the snapshot
        # For now, return success with metadata
        return {
            "snapshot_id": snapshot_id,
            "status": "uploaded",
            "format": detected_format,
            "size": len(content),
            "filename": heap_snapshot.filename,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post(
    "/export/{event_id}",
    response_model=Dict[str, Any],
)
async def export_memory_leak_visualization(
    event_id: str,
    file: UploadFile = File(...),
):
    """
    Export memory leak visualization as SVG.

    Args:
        event_id: Sentry event ID
        file: SVG file to export

    Returns:
        Export result
    """
    try:
        # In a real implementation, you would save the SVG file
        # For now, return success
        return {
            "success": True,
            "event_id": event_id,
            "filename": file.filename,
            "size": len(await file.read()),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


def _detect_heap_format(content: bytes) -> str:
    """
    Auto-detect heap snapshot format based on content.

    Args:
        content: Raw file content

    Returns:
        Detected format string
    """
    try:
        # Try to parse as JSON (V8 format)
        import json

        text = content.decode("utf-8")
        data = json.loads(text)

        if "snapshot" in data and "nodes" in data:
            return "v8"
        elif "typeMap" in data:
            return "javascriptcore"
        else:
            return "spidermonkey"

    except:
        # If JSON parsing fails, default to V8
        return "v8"
