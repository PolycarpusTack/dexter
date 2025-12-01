"""
Integration with existing N+1 and deadlock analyzers.

This module links performance span data with existing analyzer detections
to provide comprehensive performance insights.
"""

from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def enrich_with_analyzer_insights(
    performance_data: Dict[str, Any],
    error_message: str,
    stack_trace: str
) -> Dict[str, Any]:
    """
    Add insights from existing analyzers to performance data.

    Links performance spans with analyzer detections from:
    - N+1 query analyzer (app/utils/n_plus_one_parser.py)
    - Deadlock analyzer (app/utils/deadlock_parser.py)

    Args:
        performance_data: Performance enrichment data
        error_message: Error message from Sentry event
        stack_trace: Stack trace from Sentry event

    Returns:
        Performance data enriched with analyzer insights
    """
    insights = {}

    # Check N+1 analyzer
    n_plus_one_insight = _check_n_plus_one_analyzer(error_message, stack_trace)
    if n_plus_one_insight:
        insights["n_plus_one_analyzer"] = n_plus_one_insight

    # Check deadlock analyzer
    deadlock_insight = _check_deadlock_analyzer(error_message, stack_trace)
    if deadlock_insight:
        insights["deadlock_analyzer"] = deadlock_insight

    # Compare with performance span detection
    if insights:
        insights["correlation"] = _correlate_analyzers_with_spans(
            insights, performance_data
        )

    if insights:
        performance_data["analyzer_insights"] = insights

    return performance_data


def _check_n_plus_one_analyzer(
    error_message: str,
    stack_trace: str
) -> Optional[Dict[str, Any]]:
    """
    Check N+1 analyzer for pattern detection.

    Args:
        error_message: Error message
        stack_trace: Stack trace

    Returns:
        N+1 analyzer insights or None
    """
    try:
        from app.utils.n_plus_one_parser import N1QueryParser

        parser = N1QueryParser()
        event_data = {
            "message": error_message,
            "exception": {
                "values": [
                    {
                        "stacktrace": {
                            "frames": _parse_stack_trace(stack_trace)
                        }
                    }
                ]
            }
        }

        result = parser.parse(event_data)
        if result:
            return {
                "detected": True,
                "pattern_count": len(result.patterns),
                "total_queries": len(result.queries),
                "recommended_fix": result.recommended_fix,
                "visualization_available": bool(result.visualization_data)
            }
    except Exception as e:
        logger.debug(f"N+1 analyzer check failed: {e}")

    return None


def _check_deadlock_analyzer(
    error_message: str,
    stack_trace: str
) -> Optional[Dict[str, Any]]:
    """
    Check deadlock analyzer for detection.

    Args:
        error_message: Error message
        stack_trace: Stack trace

    Returns:
        Deadlock analyzer insights or None
    """
    try:
        from app.utils.deadlock_parser import DeadlockParser

        parser = DeadlockParser()
        event_data = {
            "message": error_message,
            "exception": {
                "values": [
                    {
                        "value": error_message,
                        "stacktrace": {
                            "frames": _parse_stack_trace(stack_trace)
                        }
                    }
                ]
            }
        }

        result = parser.parse(event_data)
        if result:
            return {
                "detected": True,
                "cycle_count": len(result.cycles),
                "transaction_count": len(result.transactions),
                "recommended_fix": result.recommended_fix,
                "visualization_available": bool(result.visualization_data)
            }
    except Exception as e:
        logger.debug(f"Deadlock analyzer check failed: {e}")

    return None


def _parse_stack_trace(stack_trace: str) -> list:
    """
    Parse stack trace string into frames.

    Args:
        stack_trace: Stack trace string

    Returns:
        List of stack frame dictionaries
    """
    # Simple parser for basic stack trace format
    frames = []
    lines = stack_trace.split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Basic frame structure
        frames.append({
            "filename": "unknown",
            "lineno": 0,
            "context_line": line
        })

    return frames


def _correlate_analyzers_with_spans(
    insights: Dict[str, Any],
    performance_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Correlate analyzer detections with performance span data.

    Args:
        insights: Analyzer insights
        performance_data: Performance enrichment data

    Returns:
        Correlation analysis
    """
    correlation = {
        "span_analyzer_agreement": False,
        "conflicting_signals": False,
        "confidence": "low"
    }

    # Check N+1 correlation
    n_plus_one_from_analyzer = insights.get("n_plus_one_analyzer", {}).get("detected", False)
    n_plus_one_from_spans = len(performance_data.get("n_plus_one_patterns", [])) > 0

    if n_plus_one_from_analyzer and n_plus_one_from_spans:
        correlation["span_analyzer_agreement"] = True
        correlation["confidence"] = "high"
        correlation["detection_method"] = "both_analyzer_and_spans"
    elif n_plus_one_from_analyzer or n_plus_one_from_spans:
        correlation["confidence"] = "medium"
        if n_plus_one_from_analyzer:
            correlation["detection_method"] = "analyzer_only"
        else:
            correlation["detection_method"] = "spans_only"

    # Check for conflicting signals
    problem_span_count = len(performance_data.get("problem_spans", []))
    if problem_span_count > 0 and not (n_plus_one_from_analyzer or n_plus_one_from_spans):
        correlation["conflicting_signals"] = True
        correlation["note"] = "Performance issues detected but no specific pattern identified"

    return correlation


def generate_integrated_recommendation(
    performance_data: Dict[str, Any]
) -> str:
    """
    Generate comprehensive recommendation from all performance insights.

    Args:
        performance_data: Performance data with analyzer insights

    Returns:
        Integrated recommendation text
    """
    recommendations = []

    # Performance span insights
    problem_spans = performance_data.get("problem_spans", [])
    if problem_spans:
        critical_count = sum(1 for s in problem_spans if s.get("severity") == "critical")
        high_count = sum(1 for s in problem_spans if s.get("severity") == "high")

        if critical_count > 0:
            recommendations.append(
                f"CRITICAL: {critical_count} critical performance issue(s) detected. Immediate attention required."
            )
        if high_count > 0:
            recommendations.append(
                f"HIGH: {high_count} high-severity performance issue(s) need investigation."
            )

    # N+1 pattern insights
    n_plus_one_patterns = performance_data.get("n_plus_one_patterns", [])
    if n_plus_one_patterns:
        total_queries = sum(p.get("occurrence_count", 0) for p in n_plus_one_patterns)
        recommendations.append(
            f"N+1 Pattern Detected: {total_queries} redundant queries across {len(n_plus_one_patterns)} pattern(s). "
            "Consider using eager loading or batch fetching."
        )

    # Analyzer insights
    analyzer_insights = performance_data.get("analyzer_insights", {})
    if analyzer_insights:
        if analyzer_insights.get("n_plus_one_analyzer", {}).get("detected"):
            recommendations.append(
                "N+1 Analyzer Confirmation: Pattern confirmed by static analysis. "
                "See recommended_fix for specific guidance."
            )
        if analyzer_insights.get("deadlock_analyzer", {}).get("detected"):
            recommendations.append(
                "Deadlock Detected: Database deadlock identified. "
                "Review transaction ordering and lock acquisition strategy."
            )

    if not recommendations:
        return "No significant performance issues detected."

    return "\n\n".join(recommendations)
