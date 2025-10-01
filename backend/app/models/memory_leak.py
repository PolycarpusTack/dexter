"""
Memory Leak Analyzer Models

Defines data models for memory leak analysis including heap snapshots,
leak patterns, and analysis results with enterprise-grade error handling.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set

from pydantic import BaseModel, Field, validator

from app.models.analyzers import (
    AnalysisRecommendation,
    AnalysisResult,
    BusinessImpact,
    ConfidenceLevel,
    VisualizationData,
)


class HeapSnapshotFormat(str, Enum):
    """Supported heap snapshot formats."""

    V8 = "v8"
    JSC = "javascriptcore"
    SPIDERMONKEY = "spidermonkey"
    UNKNOWN = "unknown"


class LeakType(str, Enum):
    """Types of memory leaks detected."""

    DOM_DETACHED = "dom_detached"
    EVENT_LISTENER = "event_listener"
    CLOSURE_LEAK = "closure_leak"
    REACT_CONTEXT = "react_context"
    VUE_WATCHER = "vue_watcher"
    ANGULAR_OBSERVABLE = "angular_observable"
    GLOBAL_POLLUTION = "global_pollution"
    CIRCULAR_REFERENCE = "circular_reference"
    TIMER_LEAK = "timer_leak"
    PROMISE_LEAK = "promise_leak"
    WASM_INTEROP = "wasm_interop"
    UNKNOWN = "unknown"


class GrowthPattern(str, Enum):
    """Memory growth patterns."""

    LINEAR = "linear"
    EXPONENTIAL = "exponential"
    STEPPED = "stepped"
    OSCILLATING = "oscillating"
    STABLE = "stable"


class MemoryLeakError(Exception):
    """Base exception for memory leak analyzer errors."""

    def __init__(self, message: str, error_code: str, context: Dict[str, Any]):
        super().__init__(message)
        self.error_code = error_code
        self.context = context


class ParseError(MemoryLeakError):
    """Error during heap snapshot parsing."""


class AnalysisError(MemoryLeakError):
    """Error during leak analysis."""


class IntegrationError(MemoryLeakError):
    """Error during external service integration."""


class HeapObject(BaseModel):
    """Represents an object in the heap."""

    id: str
    type: str
    size: int
    retained_size: int
    distance_from_root: int
    properties: Dict[str, Any] = Field(default_factory=dict)
    references: List[str] = Field(default_factory=list)
    referenced_by: List[str] = Field(default_factory=list)

    class Config:
        schema_extra = {
            "example": {
                "id": "obj_12345",
                "type": "Object",
                "size": 1024,
                "retained_size": 4096,
                "distance_from_root": 3,
                "properties": {"name": "UserCache"},
                "references": ["obj_12346", "obj_12347"],
                "referenced_by": ["obj_12344"],
            }
        }


class RetentionPath(BaseModel):
    """Path showing why an object is retained in memory."""

    object_id: str
    path: List[Dict[str, Any]]
    retained_size: int
    leak_probability: float

    @validator("leak_probability")
    def validate_probability(cls, v):
        if not 0 <= v <= 1:
            raise ValueError("leak_probability must be between 0 and 1")
        return v


class LeakPattern(BaseModel):
    """Detected memory leak pattern."""

    type: LeakType
    confidence: float
    affected_objects: List[str]
    total_retained_size: int
    growth_rate: Optional[float] = None
    description: str
    evidence: Dict[str, Any] = Field(default_factory=dict)

    @validator("confidence")
    def validate_confidence(cls, v):
        if not 0 <= v <= 1:
            raise ValueError("confidence must be between 0 and 1")
        return v


class MemoryMetrics(BaseModel):
    """Memory usage metrics at a point in time."""

    timestamp: datetime
    heap_size: int
    heap_used: int
    external_memory: int
    array_buffers: int
    gc_count: int
    gc_duration_ms: float

    @property
    def heap_utilization(self) -> float:
        """Calculate heap utilization percentage."""
        return (self.heap_used / self.heap_size * 100) if self.heap_size > 0 else 0


class HeapSnapshot(BaseModel):
    """Represents a heap snapshot for analysis."""

    id: str
    format: HeapSnapshotFormat
    timestamp: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)
    metrics: MemoryMetrics
    object_count: int
    total_size: int

    # Processing metadata
    parsing_duration_ms: Optional[float] = None
    analysis_duration_ms: Optional[float] = None
    errors: List[Dict[str, Any]] = Field(default_factory=list)

    class Config:
        schema_extra = {
            "example": {
                "id": "snapshot_123",
                "format": "v8",
                "timestamp": "2024-01-01T00:00:00Z",
                "metadata": {"node_version": "18.0.0"},
                "metrics": {
                    "timestamp": "2024-01-01T00:00:00Z",
                    "heap_size": 104857600,
                    "heap_used": 52428800,
                    "external_memory": 1048576,
                    "array_buffers": 0,
                    "gc_count": 42,
                    "gc_duration_ms": 150.5,
                },
                "object_count": 10000,
                "total_size": 52428800,
            }
        }


class HeapComparison(BaseModel):
    """Comparison between two heap snapshots."""

    before_snapshot_id: str
    after_snapshot_id: str
    time_delta_seconds: float
    size_delta: int
    object_count_delta: int
    new_objects: List[HeapObject] = Field(default_factory=list)
    deleted_objects: List[HeapObject] = Field(default_factory=list)
    growing_objects: List[Dict[str, Any]] = Field(default_factory=list)


class MemoryLeakAnalysis(BaseModel):
    """Complete memory leak analysis result."""

    snapshot_id: str
    timestamp: datetime
    format: HeapSnapshotFormat

    # Detection results
    leaks_detected: List[LeakPattern]
    growth_pattern: GrowthPattern
    leak_score: float  # 0-1 overall leak probability

    # Analysis details
    retention_paths: List[RetentionPath]
    heap_comparison: Optional[HeapComparison] = None
    metrics_trend: List[MemoryMetrics] = Field(default_factory=list)

    # Recommendations
    recommendations: List[AnalysisRecommendation]

    # Visualization data
    visualization: Optional[VisualizationData] = None

    # Processing metadata
    analysis_duration_ms: float
    ml_confidence: Optional[float] = None
    errors: List[Dict[str, Any]] = Field(default_factory=list)

    @validator("leak_score")
    def validate_leak_score(cls, v):
        if not 0 <= v <= 1:
            raise ValueError("leak_score must be between 0 and 1")
        return v

    def to_analysis_result(self) -> AnalysisResult:
        """Convert to standard AnalysisResult format."""
        from app.models.analyzers import AnalysisFinding, AnalyzerType

        # Calculate confidence level
        if self.leak_score >= 0.8:
            confidence_level = ConfidenceLevel.HIGH
        elif self.leak_score >= 0.5:
            confidence_level = ConfidenceLevel.MEDIUM
        else:
            confidence_level = ConfidenceLevel.LOW

        # Convert leak patterns to findings
        findings = []
        for leak in self.leaks_detected:
            finding = AnalysisFinding(
                category=f"{leak.type.value.replace('_', ' ').title()} Memory Leak",
                description=leak.description,
                severity=BusinessImpact.HIGH if leak.confidence > 0.8 else BusinessImpact.MEDIUM,
                evidence={
                    "leak_type": leak.type.value,
                    "confidence": leak.confidence,
                    "retained_size": leak.total_retained_size,
                    "affected_objects": len(leak.affected_objects),
                },
            )
            findings.append(finding)

        return AnalysisResult(
            analyzer_type=AnalyzerType.MEMORY_LEAK,
            analyzer_version="1.0.0",
            analysis_id=f"ml_{self.snapshot_id}_{int(self.timestamp.timestamp())}",
            event_id=self.snapshot_id,
            timestamp=self.timestamp,
            execution_time_ms=self.analysis_duration_ms,
            is_detected=len(self.leaks_detected) > 0,
            confidence=self.leak_score,
            confidence_level=confidence_level,
            findings=findings,
            recommendations=self.recommendations,
            business_impact=BusinessImpact.HIGH if self.leak_score > 0.8 else BusinessImpact.MEDIUM,
            visualization_data=self.visualization,
            raw_analysis_data={
                "growth_pattern": self.growth_pattern.value,
                "total_leaks": len(self.leaks_detected),
                "analysis_duration_ms": self.analysis_duration_ms,
                "ml_confidence": self.ml_confidence,
                "retention_paths": len(self.retention_paths),
            },
        )


class AnalysisContext(BaseModel):
    """Context for memory leak analysis with error tracking."""

    snapshot_id: str
    tenant_id: Optional[str] = None
    session_id: str
    start_time: datetime

    # Configuration
    config: Dict[str, Any] = Field(default_factory=dict)

    # Stage tracking
    completed_stages: Set[str] = Field(default_factory=set)
    current_stage: Optional[str] = None
    options: Dict[str, Any] = Field(default_factory=dict)

    # Error tracking
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    is_complete: bool = False
    is_partial: bool = False

    # Performance metrics
    stage_durations: Dict[str, float] = Field(default_factory=dict)

    def add_error(self, stage: str, error: Exception):
        """Add an error to the context."""
        error_info = {
            "stage": stage,
            "timestamp": datetime.utcnow().isoformat(),
            "type": type(error).__name__,
            "message": str(error),
            "context": getattr(error, "context", {}),
        }
        self.errors.append(error_info)

    def add_warning(self, stage: str, message: str, details: Dict[str, Any] = None):
        """Add a warning to the context."""
        warning = {
            "stage": stage,
            "timestamp": datetime.utcnow().isoformat(),
            "message": message,
            "details": details or {},
        }
        self.warnings.append(warning)

    def mark_stage_complete(self, stage: str, duration_ms: float):
        """Mark a stage as complete with timing."""
        self.completed_stages.add(stage)
        self.stage_durations[stage] = duration_ms

    def mark_incomplete(self):
        """Mark the analysis as incomplete due to errors."""
        self.is_complete = False
        self.is_partial = True
