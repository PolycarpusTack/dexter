"""
Metrics service for collecting, storing, and analyzing AI model performance metrics.

This service extends the basic metrics tracking in the model registry to provide:
- Historical metrics storage
- Advanced performance analytics
- Cost tracking for commercial models
- Metrics aggregation and reporting
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
import statistics
from fastapi import HTTPException, status
import asyncio
import json

from app.models.ai_models import (
    Model,
    ModelProvider,
    ModelStatus,
    ModelCapability,
    ModelParameters,
    ModelMetrics
)
from app.services.model_registry_service import ModelRegistry, get_model_registry

logger = logging.getLogger(__name__)

# Constants for cost calculation (approximate costs per 1K tokens)
COST_PER_1K_TOKENS = {
    # OpenAI models
    "gpt-4o": {"input": 0.01, "output": 0.03},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-4": {"input": 0.03, "output": 0.06},
    "gpt-3.5-turbo": {"input": 0.0015, "output": 0.002},
    
    # Anthropic models
    "claude-3-opus-20240229": {"input": 0.015, "output": 0.075},
    "claude-3-sonnet-20240229": {"input": 0.003, "output": 0.015},
    "claude-3-haiku-20240307": {"input": 0.00025, "output": 0.00125},
    
    # Default for unknown models
    "default": {"input": 0.0, "output": 0.0}
}

# Time periods for historical data
class TimePeriod:
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    ALL = "all"

class MetricsService:
    """Service for tracking and analyzing AI model metrics"""
    
    def __init__(self):
        self.model_registry = get_model_registry()
        self.historical_metrics: Dict[str, List[Dict[str, Any]]] = {}
        self.token_usage: Dict[str, Dict[str, int]] = {}
        self.cost_tracking: Dict[str, float] = {}
        self._initialize()
        
    def _initialize(self):
        """Initialize metrics storage for all registered models"""
        # Set up storage for all models in the registry
        for model_id, model in self.model_registry.models.items():
            if model_id not in self.historical_metrics:
                self.historical_metrics[model_id] = []
                
            if model_id not in self.token_usage:
                self.token_usage[model_id] = {
                    "input_tokens": 0,
                    "output_tokens": 0
                }
                
            if model_id not in self.cost_tracking:
                self.cost_tracking[model_id] = 0.0
                
    def record_usage(self, 
                    model_id: str, 
                    response_time: float, 
                    success: bool, 
                    input_tokens: Optional[int] = None,
                    output_tokens: Optional[int] = None):
        """
        Record usage metrics for a model
        
        Args:
            model_id: ID of the model used
            response_time: Time taken for the request in seconds
            success: Whether the request was successful
            input_tokens: Number of input tokens (for cost calculation)
            output_tokens: Number of output tokens (for cost calculation)
        """
        # Ensure model exists in our tracking
        if model_id not in self.historical_metrics:
            self.historical_metrics[model_id] = []
            
        if model_id not in self.token_usage:
            self.token_usage[model_id] = {
                "input_tokens": 0,
                "output_tokens": 0
            }
            
        if model_id not in self.cost_tracking:
            self.cost_tracking[model_id] = 0.0
            
        # Record the metrics
        timestamp = datetime.now().isoformat()
        metric_entry = {
            "timestamp": timestamp,
            "response_time": response_time,
            "success": success,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        }
        
        # Add to historical records
        self.historical_metrics[model_id].append(metric_entry)
        
        # Trim historical data (keep last 1000 entries)
        if len(self.historical_metrics[model_id]) > 1000:
            self.historical_metrics[model_id] = self.historical_metrics[model_id][-1000:]
            
        # Update token usage if provided
        if input_tokens:
            self.token_usage[model_id]["input_tokens"] += input_tokens
            
        if output_tokens:
            self.token_usage[model_id]["output_tokens"] += output_tokens
            
        # Calculate cost if tokens are provided
        if input_tokens or output_tokens:
            self._calculate_cost(model_id, input_tokens or 0, output_tokens or 0)
            
    def _calculate_cost(self, model_id: str, input_tokens: int, output_tokens: int):
        """Calculate cost for a model based on token usage"""
        # Get the base model name by removing version suffixes
        base_model = model_id
        
        # Strip version from claude models
        if "-2024" in base_model:
            base_model = base_model.split("-2024")[0]
            
        # Use base model cost rates or default if not found
        cost_rates = COST_PER_1K_TOKENS.get(base_model, COST_PER_1K_TOKENS["default"])
        
        # Calculate cost
        input_cost = (input_tokens / 1000) * cost_rates["input"]
        output_cost = (output_tokens / 1000) * cost_rates["output"]
        total_cost = input_cost + output_cost
        
        # Update cost tracking
        self.cost_tracking[model_id] += total_cost
        
    def get_model_metrics(self, model_id: str) -> Dict[str, Any]:
        """Get detailed metrics for a specific model"""
        # Ensure model exists
        if model_id not in self.historical_metrics:
            return {
                "model_id": model_id,
                "status": "No metrics available",
                "metrics": None
            }
            
        # Get model information
        model = self.model_registry.get_model(model_id)
        current_metrics = model.metrics if model and model.metrics else None
        
        # Calculate historical metrics
        historical_data = self.historical_metrics[model_id]
        
        # Response times
        response_times = [entry["response_time"] for entry in historical_data if entry["response_time"]]
        avg_response_time = statistics.mean(response_times) if response_times else None
        
        # Calculate percentiles if we have enough data
        percentiles = {}
        if len(response_times) >= 5:
            percentiles = {
                "p50": statistics.median(response_times),
                "p90": statistics.quantiles(response_times, n=10)[8],
                "p95": statistics.quantiles(response_times, n=20)[18],
                "p99": statistics.quantiles(response_times, n=100)[98] if len(response_times) >= 100 else None
            }
            
        # Success rate
        total_requests = len(historical_data)
        successful_requests = sum(1 for entry in historical_data if entry["success"])
        success_rate = successful_requests / total_requests if total_requests > 0 else None
        
        # Token usage
        token_usage = self.token_usage.get(model_id, {
            "input_tokens": 0,
            "output_tokens": 0
        })
        
        # Cost data
        cost = self.cost_tracking.get(model_id, 0.0)
        
        # Result
        return {
            "model_id": model_id,
            "model_name": model.name if model else model_id,
            "provider": model.provider.value if model else None,
            "current_metrics": current_metrics.dict() if current_metrics else None,
            "historical_metrics": {
                "requests": {
                    "total": total_requests,
                    "successful": successful_requests,
                    "failed": total_requests - successful_requests
                },
                "performance": {
                    "avg_response_time": avg_response_time,
                    "percentiles": percentiles,
                    "success_rate": success_rate
                }
            },
            "usage": {
                "tokens": token_usage,
                "cost": cost
            },
            "last_used": model.metrics.last_used if model and model.metrics else None
        }
        
    def get_metrics_by_time_period(self, 
                                 model_id: str, 
                                 period: str = TimePeriod.ALL) -> Dict[str, Any]:
        """Get metrics for a specific time period"""
        # Ensure model exists
        if model_id not in self.historical_metrics:
            return {
                "model_id": model_id,
                "period": period,
                "status": "No metrics available",
                "metrics": None
            }
            
        # Get all historical data
        all_data = self.historical_metrics[model_id]
        
        # Filter by time period
        now = datetime.now()
        filtered_data = []
        
        if period == TimePeriod.ALL:
            filtered_data = all_data
        else:
            # Calculate cutoff time
            cutoff = None
            if period == TimePeriod.HOUR:
                cutoff = now - timedelta(hours=1)
            elif period == TimePeriod.DAY:
                cutoff = now - timedelta(days=1)
            elif period == TimePeriod.WEEK:
                cutoff = now - timedelta(weeks=1)
            elif period == TimePeriod.MONTH:
                cutoff = now - timedelta(days=30)
                
            # Filter data
            if cutoff:
                filtered_data = [
                    entry for entry in all_data 
                    if datetime.fromisoformat(entry["timestamp"]) >= cutoff
                ]
                
        # If no data in period, return empty metrics
        if not filtered_data:
            return {
                "model_id": model_id,
                "period": period,
                "status": "No data in specified period",
                "metrics": None
            }
            
        # Calculate metrics for the period
        response_times = [entry["response_time"] for entry in filtered_data if entry["response_time"]]
        avg_response_time = statistics.mean(response_times) if response_times else None
        
        total_requests = len(filtered_data)
        successful_requests = sum(1 for entry in filtered_data if entry["success"])
        success_rate = successful_requests / total_requests if total_requests > 0 else None
        
        # Token usage for this period
        input_tokens = sum(entry.get("input_tokens", 0) or 0 for entry in filtered_data)
        output_tokens = sum(entry.get("output_tokens", 0) or 0 for entry in filtered_data)
        
        return {
            "model_id": model_id,
            "period": period,
            "metrics": {
                "requests": {
                    "total": total_requests,
                    "successful": successful_requests,
                    "failed": total_requests - successful_requests
                },
                "performance": {
                    "avg_response_time": avg_response_time,
                    "success_rate": success_rate
                },
                "usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens
                }
            },
            "time_range": {
                "start": filtered_data[0]["timestamp"] if filtered_data else None,
                "end": filtered_data[-1]["timestamp"] if filtered_data else None
            }
        }
        
    def get_time_series_data(self, 
                           model_id: str, 
                           metric: str = "response_time",
                           period: str = TimePeriod.DAY,
                           interval: str = "hour") -> Dict[str, Any]:
        """
        Get time series data for a specific metric
        
        Args:
            model_id: ID of the model
            metric: Metric to get (response_time, success_rate, etc.)
            period: Time period to cover
            interval: Interval for data points (minute, hour, day)
        
        Returns:
            Dictionary with time series data
        """
        # Ensure model exists
        if model_id not in self.historical_metrics:
            return {
                "model_id": model_id,
                "metric": metric,
                "status": "No metrics available",
                "data": []
            }
            
        # Get filtered data for the period
        period_metrics = self.get_metrics_by_time_period(model_id, period)
        if not period_metrics["metrics"]:
            return {
                "model_id": model_id,
                "metric": metric,
                "status": "No data for specified period",
                "data": []
            }
            
        # Get all data points in the period
        all_data = self.historical_metrics[model_id]
        now = datetime.now()
        
        # Calculate cutoff time
        cutoff = None
        if period == TimePeriod.HOUR:
            cutoff = now - timedelta(hours=1)
        elif period == TimePeriod.DAY:
            cutoff = now - timedelta(days=1)
        elif period == TimePeriod.WEEK:
            cutoff = now - timedelta(weeks=1)
        elif period == TimePeriod.MONTH:
            cutoff = now - timedelta(days=30)
        else:
            # Default to all data
            cutoff = datetime.min
            
        # Filter data
        filtered_data = [
            entry for entry in all_data 
            if cutoff is None or datetime.fromisoformat(entry["timestamp"]) >= cutoff
        ]
        
        # Group data by intervals
        intervals = []
        interval_data = {}
        
        if interval == "minute":
            # Group by minute
            for entry in filtered_data:
                timestamp = datetime.fromisoformat(entry["timestamp"])
                minute_key = timestamp.strftime("%Y-%m-%d %H:%M:00")
                
                if minute_key not in interval_data:
                    interval_data[minute_key] = []
                    intervals.append(minute_key)
                    
                interval_data[minute_key].append(entry)
                
        elif interval == "hour":
            # Group by hour
            for entry in filtered_data:
                timestamp = datetime.fromisoformat(entry["timestamp"])
                hour_key = timestamp.strftime("%Y-%m-%d %H:00:00")
                
                if hour_key not in interval_data:
                    interval_data[hour_key] = []
                    intervals.append(hour_key)
                    
                interval_data[hour_key].append(entry)
                
        elif interval == "day":
            # Group by day
            for entry in filtered_data:
                timestamp = datetime.fromisoformat(entry["timestamp"])
                day_key = timestamp.strftime("%Y-%m-%d 00:00:00")
                
                if day_key not in interval_data:
                    interval_data[day_key] = []
                    intervals.append(day_key)
                    
                interval_data[day_key].append(entry)
                
        # Calculate metric for each interval
        series_data = []
        
        for interval_key in sorted(intervals):
            entries = interval_data[interval_key]
            
            if metric == "response_time":
                # Average response time
                response_times = [entry["response_time"] for entry in entries if entry["response_time"]]
                value = statistics.mean(response_times) if response_times else None
                
            elif metric == "success_rate":
                # Success rate
                total = len(entries)
                successful = sum(1 for entry in entries if entry["success"])
                value = (successful / total) * 100 if total > 0 else None
                
            elif metric == "request_count":
                # Request count
                value = len(entries)
                
            elif metric == "token_usage":
                # Token usage
                input_tokens = sum(entry.get("input_tokens", 0) or 0 for entry in entries)
                output_tokens = sum(entry.get("output_tokens", 0) or 0 for entry in entries)
                value = {
                    "input": input_tokens,
                    "output": output_tokens,
                    "total": input_tokens + output_tokens
                }
                
            else:
                # Unsupported metric
                value = None
                
            # Add to series
            series_data.append({
                "timestamp": interval_key,
                "value": value
            })
            
        return {
            "model_id": model_id,
            "metric": metric,
            "period": period,
            "interval": interval,
            "data": series_data
        }
        
    def get_provider_metrics(self, provider: ModelProvider) -> Dict[str, Any]:
        """Get aggregated metrics for a specific provider"""
        # Get all models for this provider
        provider_models = [
            model for model in self.model_registry.models.values()
            if model.provider == provider
        ]
        
        if not provider_models:
            return {
                "provider": provider.value,
                "status": "No models available for this provider",
                "metrics": None
            }
            
        # Initialize aggregated metrics
        total_requests = 0
        successful_requests = 0
        response_times = []
        total_input_tokens = 0
        total_output_tokens = 0
        total_cost = 0.0
        
        # Collect metrics for all models
        model_metrics = []
        for model in provider_models:
            model_id = model.id
            
            # Skip if no metrics available
            if model_id not in self.historical_metrics:
                continue
                
            # Get metrics
            metrics = self.get_model_metrics(model_id)
            model_metrics.append(metrics)
            
            # Aggregate metrics
            if metrics["historical_metrics"]:
                hist = metrics["historical_metrics"]
                total_requests += hist["requests"]["total"]
                successful_requests += hist["requests"]["successful"]
                
            # Collect response times
            hist_data = self.historical_metrics.get(model_id, [])
            response_times.extend([entry["response_time"] for entry in hist_data if entry["response_time"]])
            
            # Aggregate token usage and cost
            if model_id in self.token_usage:
                total_input_tokens += self.token_usage[model_id]["input_tokens"]
                total_output_tokens += self.token_usage[model_id]["output_tokens"]
                
            if model_id in self.cost_tracking:
                total_cost += self.cost_tracking[model_id]
                
        # Calculate overall metrics
        avg_response_time = statistics.mean(response_times) if response_times else None
        success_rate = (successful_requests / total_requests) if total_requests > 0 else None
        
        return {
            "provider": provider.value,
            "metrics": {
                "models": len(provider_models),
                "models_with_metrics": len(model_metrics),
                "requests": {
                    "total": total_requests,
                    "successful": successful_requests,
                    "failed": total_requests - successful_requests
                },
                "performance": {
                    "avg_response_time": avg_response_time,
                    "success_rate": success_rate
                },
                "usage": {
                    "input_tokens": total_input_tokens,
                    "output_tokens": total_output_tokens,
                    "total_tokens": total_input_tokens + total_output_tokens
                },
                "cost": total_cost
            },
            "model_details": [
                {
                    "model_id": m["model_id"],
                    "success_rate": m["historical_metrics"]["performance"]["success_rate"] if m["historical_metrics"] else None,
                    "avg_response_time": m["historical_metrics"]["performance"]["avg_response_time"] if m["historical_metrics"] else None,
                    "requests": m["historical_metrics"]["requests"]["total"] if m["historical_metrics"] else 0,
                    "cost": m["usage"]["cost"] if "cost" in m["usage"] else 0
                }
                for m in model_metrics
            ]
        }
        
    def get_comparison_data(self, model_ids: List[str]) -> Dict[str, Any]:
        """Get comparison data for multiple models"""
        comparison = []
        
        for model_id in model_ids:
            metrics = self.get_model_metrics(model_id)
            
            # Skip if no metrics
            if not metrics or not metrics["historical_metrics"]:
                comparison.append({
                    "model_id": model_id,
                    "status": "No metrics available"
                })
                continue
                
            # Extract key metrics for comparison
            model = self.model_registry.get_model(model_id)
            
            comparison_entry = {
                "model_id": model_id,
                "model_name": model.name if model else model_id,
                "provider": model.provider.value if model else None,
                "performance": {
                    "avg_response_time": metrics["historical_metrics"]["performance"]["avg_response_time"],
                    "success_rate": metrics["historical_metrics"]["performance"]["success_rate"],
                    "percentiles": metrics["historical_metrics"]["performance"].get("percentiles", {})
                },
                "usage": {
                    "total_requests": metrics["historical_metrics"]["requests"]["total"],
                    "tokens": metrics["usage"]["tokens"],
                    "cost": metrics["usage"]["cost"]
                },
                "capabilities": model.capabilities if model else []
            }
            
            comparison.append(comparison_entry)
            
        return {
            "models": comparison,
            "summary": {
                "total_models": len(comparison),
                "best_response_time": min(
                    [m["performance"]["avg_response_time"] for m in comparison 
                     if "performance" in m and m["performance"]["avg_response_time"]],
                    default=None
                ),
                "best_success_rate": max(
                    [m["performance"]["success_rate"] for m in comparison 
                     if "performance" in m and m["performance"]["success_rate"]],
                    default=None
                )
            }
        }
        
    def get_overall_metrics(self) -> Dict[str, Any]:
        """Get overall metrics for all models and providers"""
        # Initialize counters
        total_requests = 0
        successful_requests = 0
        total_input_tokens = 0
        total_output_tokens = 0
        total_cost = 0.0
        
        # Get all models
        all_models = list(self.model_registry.models.values())
        models_with_metrics = 0
        
        # Collect response times
        all_response_times = []
        
        # Process each model
        for model in all_models:
            model_id = model.id
            
            # Skip if no metrics
            if model_id not in self.historical_metrics:
                continue
                
            models_with_metrics += 1
            
            # Get metrics
            hist_data = self.historical_metrics.get(model_id, [])
            total_requests += len(hist_data)
            successful_requests += sum(1 for entry in hist_data if entry["success"])
            all_response_times.extend([entry["response_time"] for entry in hist_data if entry["response_time"]])
            
            # Token usage
            if model_id in self.token_usage:
                total_input_tokens += self.token_usage[model_id]["input_tokens"]
                total_output_tokens += self.token_usage[model_id]["output_tokens"]
                
            # Cost
            if model_id in self.cost_tracking:
                total_cost += self.cost_tracking[model_id]
                
        # Provider statistics
        providers = {}
        for provider in ModelProvider:
            provider_metrics = self.get_provider_metrics(provider)
            if provider_metrics["metrics"]:
                providers[provider.value] = provider_metrics["metrics"]
                
        # Calculate overall metrics
        avg_response_time = statistics.mean(all_response_times) if all_response_times else None
        success_rate = (successful_requests / total_requests) if total_requests > 0 else None
        
        return {
            "summary": {
                "total_models": len(all_models),
                "models_with_metrics": models_with_metrics,
                "requests": {
                    "total": total_requests,
                    "successful": successful_requests,
                    "failed": total_requests - successful_requests
                },
                "performance": {
                    "avg_response_time": avg_response_time,
                    "success_rate": success_rate
                },
                "usage": {
                    "input_tokens": total_input_tokens,
                    "output_tokens": total_output_tokens,
                    "total_tokens": total_input_tokens + total_output_tokens
                },
                "cost": total_cost
            },
            "providers": providers
        }

# Singleton instance
_metrics_service = MetricsService()

def get_metrics_service() -> MetricsService:
    """Get the singleton metrics service instance"""
    return _metrics_service