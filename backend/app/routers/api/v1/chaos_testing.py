"""
Chaos Testing API endpoints for Memory Leak Analyzer

This module provides endpoints for running chaos engineering tests
to validate the resilience of the memory leak analyzer.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query

from app.services.chaos_testing import ChaosExperiment, ChaosExperimentType, ChaosTestingService
from app.services.memory_leak_analyzer import MemoryLeakAnalyzer

router = APIRouter(prefix="/chaos-testing", tags=["Chaos Testing"])


@router.post("/run-suite", response_model=Dict[str, Any])
async def run_chaos_testing_suite(
    test_data: Dict[str, Any] = Body(..., description="Sample event data for testing"),
    include_high_intensity: bool = Query(
        False, description="Include high-intensity chaos experiments"
    ),
    custom_experiments: Optional[List[Dict[str, Any]]] = Body(
        None, description="Custom chaos experiments to run"
    ),
):
    """
    Run a comprehensive chaos testing suite on the memory leak analyzer.

    This endpoint validates the resilience and reliability of the analyzer
    under various failure conditions including latency injection, service failures,
    network partitions, and resource exhaustion.

    Args:
        test_data: Sample Sentry event data to use for testing
        include_high_intensity: Whether to include high-intensity experiments
        custom_experiments: Optional custom experiments to run

    Returns:
        Comprehensive test results and resilience assessment
    """
    try:
        # Initialize analyzer and chaos testing service
        analyzer = MemoryLeakAnalyzer()
        chaos_service = ChaosTestingService(analyzer)

        # Parse custom experiments if provided
        experiments = None
        if custom_experiments:
            experiments = []
            for exp_data in custom_experiments:
                experiment = ChaosExperiment(
                    name=exp_data.get("name", "Custom Experiment"),
                    experiment_type=ChaosExperimentType(exp_data.get("type", "latency_injection")),
                    duration_seconds=exp_data.get("duration_seconds", 30),
                    intensity=exp_data.get("intensity", 0.5),
                    target_components=exp_data.get("target_components", ["all"]),
                    parameters=exp_data.get("parameters", {}),
                    enabled=exp_data.get("enabled", True),
                )
                experiments.append(experiment)

        # Filter experiments based on intensity setting
        if experiments is None and not include_high_intensity:
            # Use default experiments but exclude high-intensity ones
            default_experiments = chaos_service._get_default_experiments()
            experiments = [exp for exp in default_experiments if exp.intensity <= 0.6]

        # Run chaos testing suite
        results = await chaos_service.run_chaos_suite(test_data, experiments)

        return {"status": "success", "timestamp": datetime.now().isoformat(), **results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chaos testing failed: {str(e)}")


@router.post("/run-experiment", response_model=Dict[str, Any])
async def run_single_chaos_experiment(
    experiment_config: Dict[str, Any] = Body(..., description="Chaos experiment configuration"),
    test_data: Dict[str, Any] = Body(..., description="Sample event data for testing"),
):
    """
    Run a single chaos experiment.

    Args:
        experiment_config: Configuration for the chaos experiment
        test_data: Sample event data to use for testing

    Returns:
        Single experiment result with metrics and observations
    """
    try:
        # Initialize services
        analyzer = MemoryLeakAnalyzer()
        chaos_service = ChaosTestingService(analyzer)

        # Create experiment from config
        experiment = ChaosExperiment(
            name=experiment_config.get("name", "Single Experiment"),
            experiment_type=ChaosExperimentType(experiment_config.get("type", "latency_injection")),
            duration_seconds=experiment_config.get("duration_seconds", 30),
            intensity=experiment_config.get("intensity", 0.5),
            target_components=experiment_config.get("target_components", ["all"]),
            parameters=experiment_config.get("parameters", {}),
            enabled=True,
        )

        # Run single experiment
        result = await chaos_service._run_single_experiment(experiment, test_data)

        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "experiment_result": chaos_service._serialize_result(result),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chaos experiment failed: {str(e)}")


@router.get("/experiment-types", response_model=Dict[str, Any])
async def get_chaos_experiment_types():
    """
    Get available chaos experiment types and their descriptions.

    Returns:
        Dictionary of experiment types with descriptions and parameters
    """
    return {
        "experiment_types": {
            "latency_injection": {
                "description": "Inject artificial latency into operations",
                "parameters": {"delay_ms": "Latency delay in milliseconds (default: 1000)"},
                "intensity_range": "0.0 to 1.0 (affects probability of latency)",
            },
            "service_failure": {
                "description": "Simulate random service failures",
                "parameters": {},
                "intensity_range": "0.0 to 1.0 (failure probability)",
            },
            "network_partition": {
                "description": "Simulate network connectivity issues",
                "parameters": {},
                "intensity_range": "0.0 to 1.0 (partition probability)",
            },
            "resource_exhaustion": {
                "description": "Simulate resource constraints",
                "parameters": {"memory_limit_mb": "Memory limit in MB (default: 100)"},
                "intensity_range": "0.0 to 1.0 (severity of constraints)",
            },
            "data_corruption": {
                "description": "Corrupt input data randomly",
                "parameters": {},
                "intensity_range": "0.0 to 1.0 (corruption probability)",
            },
            "circuit_breaker_test": {
                "description": "Force circuit breaker activation",
                "parameters": {},
                "intensity_range": "0.0 to 1.0 (force activation probability)",
            },
            "timeout_simulation": {
                "description": "Simulate operation timeouts",
                "parameters": {},
                "intensity_range": "0.0 to 1.0 (timeout probability)",
            },
            "memory_pressure": {
                "description": "Simulate memory pressure conditions",
                "parameters": {},
                "intensity_range": "0.0 to 1.0 (pressure level)",
            },
        }
    }


@router.get("/default-experiments", response_model=List[Dict[str, Any]])
async def get_default_experiments():
    """
    Get the default chaos experiments configuration.

    Returns:
        List of default experiment configurations
    """
    analyzer = MemoryLeakAnalyzer()
    chaos_service = ChaosTestingService(analyzer)
    default_experiments = chaos_service._get_default_experiments()

    return [
        {
            "name": exp.name,
            "type": exp.experiment_type,
            "duration_seconds": exp.duration_seconds,
            "intensity": exp.intensity,
            "target_components": exp.target_components,
            "parameters": exp.parameters,
            "enabled": exp.enabled,
        }
        for exp in default_experiments
    ]


@router.post("/validate-config", response_model=Dict[str, Any])
async def validate_experiment_config(
    experiment_config: Dict[str, Any] = Body(
        ..., description="Experiment configuration to validate"
    )
):
    """
    Validate a chaos experiment configuration.

    Args:
        experiment_config: Experiment configuration to validate

    Returns:
        Validation result with any errors or warnings
    """
    validation_result = {"valid": True, "errors": [], "warnings": [], "suggestions": []}

    # Validate required fields
    required_fields = ["name", "type", "duration_seconds", "intensity"]
    for field in required_fields:
        if field not in experiment_config:
            validation_result["errors"].append(f"Missing required field: {field}")
            validation_result["valid"] = False

    # Validate experiment type
    if "type" in experiment_config:
        try:
            ChaosExperimentType(experiment_config["type"])
        except ValueError:
            validation_result["errors"].append(
                f"Invalid experiment type: {experiment_config['type']}"
            )
            validation_result["valid"] = False

    # Validate intensity range
    if "intensity" in experiment_config:
        intensity = experiment_config["intensity"]
        if not isinstance(intensity, (int, float)) or not (0.0 <= intensity <= 1.0):
            validation_result["errors"].append("Intensity must be a number between 0.0 and 1.0")
            validation_result["valid"] = False
        elif intensity > 0.8:
            validation_result["warnings"].append(
                "High intensity experiments may cause significant disruption"
            )

    # Validate duration
    if "duration_seconds" in experiment_config:
        duration = experiment_config["duration_seconds"]
        if not isinstance(duration, int) or duration <= 0:
            validation_result["errors"].append("Duration must be a positive integer")
            validation_result["valid"] = False
        elif duration > 300:  # 5 minutes
            validation_result["warnings"].append(
                "Long duration experiments may impact system stability"
            )

    # Suggestions
    if validation_result["valid"]:
        validation_result["suggestions"].append("Consider starting with low-intensity experiments")
        validation_result["suggestions"].append("Monitor system resources during testing")

        if experiment_config.get("intensity", 0) < 0.3:
            validation_result["suggestions"].append(
                "Low intensity may not reveal resilience issues"
            )

    return validation_result


@router.get("/resilience-report", response_model=Dict[str, Any])
async def get_resilience_report():
    """
    Get a resilience assessment report based on previous chaos test results.

    Returns:
        Resilience report with trends and recommendations
    """
    # This would typically pull from a database of historical test results
    # For now, return a sample report structure

    return {
        "report_generated": datetime.now().isoformat(),
        "overall_resilience": {"score": 0.85, "level": "good", "trend": "improving"},
        "component_scores": {
            "memory_parsers": 0.90,
            "pattern_detection": 0.85,
            "llm_integration": 0.75,
            "resilience_components": 0.95,
        },
        "recent_experiments": {
            "total_runs": 45,
            "success_rate": 0.87,
            "avg_resilience_score": 0.82,
            "last_run": "2025-01-07T10:30:00Z",
        },
        "recommendations": [
            "Continue regular chaos testing to maintain resilience",
            "Focus on improving LLM integration error handling",
            "Consider implementing additional fallback mechanisms",
        ],
        "next_scheduled_test": "2025-01-14T10:00:00Z",
    }
