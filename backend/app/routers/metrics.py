"""
API router for AI metrics endpoints.

This module provides endpoints for retrieving metrics data about AI model performance,
including response times, success rates, token usage, and cost tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from typing import Dict, List, Optional, Any, Union
import logging

from app.models.ai_models import ModelProvider
from app.services.metrics_service import (
    MetricsService, 
    get_metrics_service,
    TimePeriod
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/metrics",
    tags=["metrics"]
)

@router.get(
    "/models/{model_id}",
    summary="Get model metrics",
    description="Returns performance metrics for a specific model"
)
async def get_model_metrics(
    model_id: str = Path(..., description="Model ID"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get metrics for a specific model."""
    try:
        return metrics_service.get_model_metrics(model_id)
    except Exception as e:
        logger.exception(f"Error retrieving model metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve metrics: {str(e)}"
        )

@router.get(
    "/models/{model_id}/period/{period}",
    summary="Get model metrics for a time period",
    description="Returns performance metrics for a specific model over a time period"
)
async def get_model_metrics_by_period(
    model_id: str = Path(..., description="Model ID"),
    period: str = Path(..., description="Time period (hour, day, week, month, all)"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get metrics for a specific model over a time period."""
    # Validate period
    valid_periods = [TimePeriod.HOUR, TimePeriod.DAY, TimePeriod.WEEK, TimePeriod.MONTH, TimePeriod.ALL]
    if period not in valid_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid time period. Valid values are: {', '.join(valid_periods)}"
        )
    
    try:
        return metrics_service.get_metrics_by_time_period(model_id, period)
    except Exception as e:
        logger.exception(f"Error retrieving model metrics by period: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve metrics: {str(e)}"
        )

@router.get(
    "/models/{model_id}/series",
    summary="Get time series data",
    description="Returns time series data for a specific metric"
)
async def get_time_series_data(
    model_id: str = Path(..., description="Model ID"),
    metric: str = Query("response_time", description="Metric to retrieve (response_time, success_rate, request_count, token_usage)"),
    period: str = Query(TimePeriod.DAY, description="Time period (hour, day, week, month, all)"),
    interval: str = Query("hour", description="Interval for data points (minute, hour, day)"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get time series data for a specific metric."""
    # Validate period
    valid_periods = [TimePeriod.HOUR, TimePeriod.DAY, TimePeriod.WEEK, TimePeriod.MONTH, TimePeriod.ALL]
    if period not in valid_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid time period. Valid values are: {', '.join(valid_periods)}"
        )
    
    # Validate interval
    valid_intervals = ["minute", "hour", "day"]
    if interval not in valid_intervals:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid interval. Valid values are: {', '.join(valid_intervals)}"
        )
    
    # Validate metric
    valid_metrics = ["response_time", "success_rate", "request_count", "token_usage"]
    if metric not in valid_metrics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid metric. Valid values are: {', '.join(valid_metrics)}"
        )
    
    try:
        return metrics_service.get_time_series_data(model_id, metric, period, interval)
    except Exception as e:
        logger.exception(f"Error retrieving time series data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve time series data: {str(e)}"
        )

@router.get(
    "/providers/{provider}",
    summary="Get provider metrics",
    description="Returns aggregated metrics for a specific provider"
)
async def get_provider_metrics(
    provider: str = Path(..., description="Provider name (ollama, openai, anthropic)"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get aggregated metrics for a specific provider."""
    try:
        # Convert string to enum
        provider_enum = None
        try:
            provider_enum = ModelProvider(provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}. Valid values are: {', '.join([p.value for p in ModelProvider])}"
            )
        
        return metrics_service.get_provider_metrics(provider_enum)
    except Exception as e:
        logger.exception(f"Error retrieving provider metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve provider metrics: {str(e)}"
        )

@router.get(
    "/comparison",
    summary="Compare model metrics",
    description="Returns comparison data for multiple models"
)
async def compare_models(
    model_ids: str = Query(..., description="Comma-separated list of model IDs to compare"),
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Compare metrics for multiple models."""
    try:
        # Parse model IDs
        models = [model_id.strip() for model_id in model_ids.split(",")]
        if not models:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No model IDs provided"
            )
        
        return metrics_service.get_comparison_data(models)
    except Exception as e:
        logger.exception(f"Error comparing models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare models: {str(e)}"
        )

@router.get(
    "/overall",
    summary="Get overall metrics",
    description="Returns aggregated metrics for all models and providers"
)
async def get_overall_metrics(
    metrics_service: MetricsService = Depends(get_metrics_service)
):
    """Get overall metrics for all models and providers."""
    try:
        return metrics_service.get_overall_metrics()
    except Exception as e:
        logger.exception(f"Error retrieving overall metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve overall metrics: {str(e)}"
        )