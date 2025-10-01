# File: backend/app/models/analyzers.py

"""
Base analyzer framework models and protocols.

This module defines the core analyzer protocol and data models that all 
specialized analyzers must implement.
"""

from abc import abstractmethod
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol

from pydantic import BaseModel, Field, validator


class AnalyzerType(str, Enum):
    """Types of analyzers available in the system."""

    DEADLOCK = "deadlock"
    MEMORY_LEAK = "memory_leak"
    N_PLUS_ONE = "n_plus_one"
    PROMISE_REJECTION = "promise_rejection"
    CUSTOM = "custom"


class ConfidenceLevel(str, Enum):
    """Confidence levels for analysis results."""

    LOW = "low"  # 0.0 - 0.4
    MEDIUM = "medium"  # 0.4 - 0.7
    HIGH = "high"  # 0.7 - 1.0


class BusinessImpact(str, Enum):
    """Business impact severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AnalysisFinding(BaseModel):
    """Individual finding from an analyzer."""

    category: str = Field(..., description="Category of the finding")
    description: str = Field(..., description="Human-readable description")
    severity: BusinessImpact = Field(..., description="Severity level")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Supporting evidence")
    location: Optional[str] = Field(None, description="Code location or stack frame")
    related_findings: List[str] = Field(default_factory=list, description="Related finding IDs")


class AnalysisRecommendation(BaseModel):
    """Actionable recommendation from analysis."""

    title: str = Field(..., description="Short recommendation title")
    description: str = Field(..., description="Detailed recommendation")
    priority: BusinessImpact = Field(..., description="Implementation priority")
    effort_estimate: Optional[str] = Field(
        None, description="Estimated effort (e.g., '2 hours', '1 day')"
    )
    code_example: Optional[str] = Field(None, description="Example code fix")
    documentation_links: List[str] = Field(
        default_factory=list, description="Helpful documentation"
    )


class VisualizationData(BaseModel):
    """Visualization data for frontend rendering."""

    chart_type: str = Field(..., description="Type of chart (timeline, network, flow, etc.)")
    data: Dict[str, Any] = Field(..., description="Chart-specific data structure")
    options: Dict[str, Any] = Field(default_factory=dict, description="Chart configuration options")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class AnalysisResult(BaseModel):
    """Complete result from an analyzer."""

    # Core identification
    analyzer_type: AnalyzerType = Field(
        ..., description="Type of analyzer that produced this result"
    )
    analyzer_version: str = Field(..., description="Version of the analyzer")
    analysis_id: str = Field(..., description="Unique ID for this analysis")

    # Analysis metadata
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="When analysis was performed"
    )
    event_id: str = Field(..., description="ID of the event that was analyzed")
    execution_time_ms: float = Field(..., description="Time taken to complete analysis")

    # Analysis results
    is_detected: bool = Field(..., description="Whether the analyzer detected its pattern")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0.0-1.0)")
    confidence_level: ConfidenceLevel = Field(..., description="Human-readable confidence level")

    # Detailed findings
    findings: List[AnalysisFinding] = Field(default_factory=list, description="Specific findings")
    recommendations: List[AnalysisRecommendation] = Field(
        default_factory=list, description="Actionable recommendations"
    )

    # Business context
    business_impact: BusinessImpact = Field(..., description="Overall business impact")
    affected_users_estimate: Optional[int] = Field(
        None, description="Estimated number of affected users"
    )
    financial_impact_estimate: Optional[str] = Field(None, description="Estimated financial impact")

    # Visualization
    visualization_data: Optional[VisualizationData] = Field(
        None, description="Data for frontend visualization"
    )

    # Raw data (for debugging and detailed analysis)
    raw_analysis_data: Dict[str, Any] = Field(
        default_factory=dict, description="Raw analyzer-specific data"
    )
    debug_info: Dict[str, Any] = Field(default_factory=dict, description="Debug information")

    @validator("confidence_level", pre=True, always=True)
    def set_confidence_level(cls, v, values):
        """Auto-set confidence level based on confidence score."""
        if "confidence" in values:
            confidence = values["confidence"]
            if confidence < 0.4:
                return ConfidenceLevel.LOW
            elif confidence < 0.7:
                return ConfidenceLevel.MEDIUM
            else:
                return ConfidenceLevel.HIGH
        return v

    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class AnalyzerCapabilities(BaseModel):
    """Capabilities and metadata for an analyzer."""

    analyzer_type: AnalyzerType = Field(..., description="Type of analyzer")
    name: str = Field(..., description="Human-readable name")
    description: str = Field(..., description="Description of what this analyzer does")
    version: str = Field(..., description="Analyzer version")

    # Detection capabilities
    supported_platforms: List[str] = Field(
        ..., description="Supported platforms (python, javascript, etc.)"
    )
    supported_error_types: List[str] = Field(
        ..., description="Error types this analyzer can detect"
    )

    # Performance characteristics
    typical_execution_time_ms: float = Field(..., description="Typical execution time")
    max_execution_time_ms: float = Field(..., description="Maximum allowed execution time")
    memory_usage_mb: float = Field(..., description="Typical memory usage")

    # Configuration
    requires_llm: bool = Field(False, description="Whether this analyzer requires LLM integration")
    configurable_parameters: List[str] = Field(
        default_factory=list, description="Parameters that can be configured"
    )

    # Dependencies
    external_dependencies: List[str] = Field(
        default_factory=list, description="External services required"
    )

    class Config:
        """Pydantic configuration."""

        use_enum_values = True


class BaseAnalyzer(Protocol):
    """
    Protocol that all analyzers must implement.

    This defines the contract for analyzer implementations, ensuring consistent
    behavior across all analyzer types.
    """

    @property
    @abstractmethod
    def capabilities(self) -> AnalyzerCapabilities:
        """Return the capabilities of this analyzer."""
        ...

    @abstractmethod
    async def detect(self, event_data: Dict[str, Any]) -> bool:
        """
        Detect if this analyzer should be applied to the given event.

        Args:
            event_data: Raw event data from Sentry

        Returns:
            True if this analyzer should process the event
        """
        ...

    @abstractmethod
    async def parse(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse the event data to extract relevant information.

        Args:
            event_data: Raw event data from Sentry

        Returns:
            Parsed data structure suitable for analysis
        """
        ...

    @abstractmethod
    async def analyze(self, parsed_data: Dict[str, Any]) -> AnalysisResult:
        """
        Perform the main analysis on parsed data.

        Args:
            parsed_data: Data returned from parse() method

        Returns:
            Complete analysis result
        """
        ...

    @abstractmethod
    async def visualize(self, analysis: AnalysisResult) -> VisualizationData:
        """
        Generate visualization data for the frontend.

        Args:
            analysis: Result from analyze() method

        Returns:
            Visualization data for frontend rendering
        """
        ...

    @abstractmethod
    async def recommend(self, analysis: AnalysisResult) -> List[AnalysisRecommendation]:
        """
        Generate actionable recommendations based on analysis.

        Args:
            analysis: Result from analyze() method

        Returns:
            List of actionable recommendations
        """
        ...


# Export all public classes and types
__all__ = [
    "AnalyzerType",
    "ConfidenceLevel",
    "BusinessImpact",
    "AnalysisFinding",
    "AnalysisRecommendation",
    "VisualizationData",
    "AnalysisResult",
    "AnalyzerCapabilities",
    "BaseAnalyzer",
]
