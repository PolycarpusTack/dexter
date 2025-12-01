"""
Analysis models for AI transparency and confidence scoring.

These models support EPIC Q: AI Transparency & UX Polish by providing
comprehensive transparency information about AI analysis decisions.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SimilarIssueRef(BaseModel):
    """Reference to a similar issue used in analysis."""

    id: int = Field(..., description="Issue ID in Sentry")
    title: str = Field(..., description="Issue title")
    similarity: float = Field(..., ge=0.0, le=1.0, description="Similarity score (0-1)")
    project: Optional[str] = Field(None, description="Project name")
    status: Optional[str] = Field(None, description="Issue status")
    first_seen: Optional[datetime] = Field(None, description="First occurrence")
    last_seen: Optional[datetime] = Field(None, description="Last occurrence")


class ModelInfo(BaseModel):
    """Information about the AI model used."""

    name: str = Field(..., description="Model name")
    provider: str = Field(..., description="Provider (ollama, openai, anthropic)")
    version: Optional[str] = Field(None, description="Model version")
    context_window: Optional[int] = Field(None, description="Context window size")


class ConfidenceFactors(BaseModel):
    """Factors contributing to confidence score."""

    high_similarity_count: int = Field(
        ..., description="Number of similar issues with >0.8 similarity"
    )
    enrichment_coverage: float = Field(
        ..., ge=0.0, le=1.0, description="Percentage of enrichment sources available (0-1)"
    )
    freshness_score: float = Field(
        ..., ge=0.0, le=1.0, description="Weighted freshness of data used (0-1)"
    )
    reasoning: str = Field(..., description="Human-readable confidence reasoning")


class TransparencyInfo(BaseModel):
    """Transparency information about AI analysis."""

    similar_issues_count: int = Field(..., description="Total similar issues analyzed")
    similar_issues: List[SimilarIssueRef] = Field(
        default_factory=list, description="Similar issues used in analysis"
    )
    enrichment_sources_used: List[str] = Field(
        default_factory=list, description="Enrichment data sources included"
    )
    enrichment_sources_stale: List[str] = Field(
        default_factory=list, description="Enrichment sources with stale data"
    )
    ranking_variant: str = Field(
        default="multi-signal", description="Ranking algorithm variant used"
    )
    model_info: ModelInfo = Field(..., description="AI model information")
    confidence_factors: ConfidenceFactors = Field(..., description="Confidence breakdown")


class AnalysisSources(BaseModel):
    """Sources used in analysis."""

    similar_issues: List[SimilarIssueRef] = Field(default_factory=list)
    enrichment_data: dict = Field(default_factory=dict)
    citations: List[str] = Field(default_factory=list)


class PIIScrubResult(BaseModel):
    """Result of PII scrubbing operation with tracking."""

    scrubbed_data: dict = Field(..., description="Data after PII scrubbing")
    pii_detected: bool = Field(..., description="Whether PII was found and scrubbed")
    fields_scrubbed: List[str] = Field(
        default_factory=list, description="Field paths that were scrubbed"
    )
    scrub_count: int = Field(default=0, description="Total number of scrub operations")


class AnalysisResponse(BaseModel):
    """Complete AI analysis response with transparency."""

    analysis: str = Field(..., description="AI-generated analysis text")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    sources: AnalysisSources = Field(..., description="Sources used in analysis")
    transparency: TransparencyInfo = Field(..., description="Transparency information")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    pii_scrub_info: Optional[PIIScrubResult] = Field(
        None, description="PII scrubbing information if applicable"
    )


class QuickPromptType(BaseModel):
    """Quick prompt template definition."""

    prompt_type: str = Field(..., description="Prompt type identifier")
    label: str = Field(..., description="Display label")
    icon: str = Field(..., description="Icon name")
    system_prompt: str = Field(..., description="System prompt template")
    enrichment_priority: List[str] = Field(
        default_factory=list, description="Enrichment sources to prioritize"
    )


class QuickPromptRequest(BaseModel):
    """Request for quick prompt analysis."""

    issue_id: int = Field(..., description="Issue ID to analyze")
    prompt_type: str = Field(..., description="Quick prompt type to use")
    user_query: Optional[str] = Field(None, description="Optional user query override")


class DataQualityIndicators(BaseModel):
    """Data quality indicators for UI display."""

    stale_sources: List[str] = Field(default_factory=list, description="Stale data sources")
    very_stale_sources: List[str] = Field(
        default_factory=list, description="Very stale data sources (critical)"
    )
    missing_sources: List[str] = Field(
        default_factory=list, description="Expected but missing sources"
    )
    pii_scrubbed: Optional[PIIScrubResult] = Field(None, description="PII scrubbing info")
    overall_quality_score: float = Field(
        ..., ge=0.0, le=1.0, description="Overall data quality (0-1)"
    )
