# File: backend/app/services/promise_rejection_analyzer.py

"""
Promise Rejection Analyzer - Detects and analyzes unhandled promise rejections.

This analyzer helps developers identify and fix async/await issues, unhandled
promise rejections, and other promise-related problems in JavaScript/TypeScript
applications.
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
import hashlib

from ..models.analyzers import (
    AnalyzerType,
    AnalysisResult,
    AnalysisFinding,
    AnalysisRecommendation,
    VisualizationData,
    AnalyzerCapabilities,
    ConfidenceLevel,
    BusinessImpact,
    BaseAnalyzer,
)
from ..utils.promise_rejection_parser import (
    parse_promise_rejection,
    PromiseRejectionInfo,
    extract_promise_patterns,
)
from ..services.llm_service import LLMService

logger = logging.getLogger(__name__)


class PromiseRejectionAnalyzer(BaseAnalyzer):
    """
    Analyzer for detecting and analyzing promise rejection patterns.

    This analyzer identifies:
    - Unhandled promise rejections
    - Missing catch handlers
    - Floating promises (not awaited)
    - Promise constructor anti-patterns
    - Async/await best practice violations
    """

    # Analysis configuration constants
    ASYNC_INDICATOR_THRESHOLD = 3  # Minimum async frames to suspect promise issue
    BASE_CONFIDENCE = 0.5  # Starting confidence score
    CONFIDENCE_INCREMENT_STACK = 0.2  # Confidence boost for having stack trace
    CONFIDENCE_INCREMENT_CHAIN = 0.1  # Confidence boost for async chain
    CONFIDENCE_INCREMENT_FRAMEWORK = 0.1  # Confidence boost for known framework
    CONFIDENCE_INCREMENT_PATTERN = 0.05  # Confidence boost per detected pattern
    MAX_PATTERN_CONFIDENCE = 0.2  # Maximum confidence from patterns

    def __init__(self, llm_service: Optional[LLMService] = None):
        """Initialize the analyzer with optional LLM service."""
        self.llm_service = llm_service
        self._capabilities = AnalyzerCapabilities(
            analyzer_type=AnalyzerType.PROMISE_REJECTION,
            name="Promise Rejection Analyzer",
            description="Analyzes unhandled promise rejections and async/await patterns",
            version="1.0.0",
            supported_platforms=["javascript", "typescript", "node", "browser"],
            supported_error_types=[
                "UnhandledRejection",
                "UnhandledPromiseRejectionWarning",
                "PromiseRejectionEvent",
                "Error",
            ],
            typical_execution_time_ms=150.0,
            max_execution_time_ms=1000.0,
            memory_usage_mb=50.0,
            requires_llm=True,
            configurable_parameters=[
                "enable_pattern_detection",
                "enable_ai_recommendations",
                "max_stack_depth",
            ],
            external_dependencies=["llm_service"],
        )

    @property
    def capabilities(self) -> AnalyzerCapabilities:
        """Return analyzer capabilities."""
        return self._capabilities

    def _sanitize_for_logging(self, text: str, max_length: int = 200) -> str:
        """Sanitize text for safe logging."""
        if not text:
            return ""

        # Remove potential log injection characters
        sanitized = text.replace("\n", " ").replace("\r", " ").replace("\t", " ")

        # Truncate if too long
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length] + "..."

        return sanitized

    async def detect(self, event_data: Dict[str, Any]) -> bool:
        """
        Detect if this is a promise rejection event.

        Args:
            event_data: Raw Sentry event data

        Returns:
            True if this appears to be a promise rejection
        """
        try:
            # Quick checks first
            platform = event_data.get("platform", "")
            if platform not in ["javascript", "node", "browser"]:
                return False

            # Check event message and title
            message = event_data.get("message", "").lower()
            title = event_data.get("title", "").lower()

            rejection_keywords = [
                "unhandledrejection",
                "unhandled promise",
                "promise rejection",
                "uncaught (in promise)",
                "rejected promise",
                "promise rejected",
            ]

            for keyword in rejection_keywords:
                if keyword in message or keyword in title:
                    logger.info(
                        f"Promise rejection detected via keyword: {self._sanitize_for_logging(keyword)}"
                    )
                    return True

            # Check exception type
            exceptions = event_data.get("exception", {}).get("values", [])
            for exc in exceptions:
                exc_type = exc.get("type", "").lower()
                exc_value = exc.get("value", "").lower()

                if any(word in exc_type for word in ["promise", "rejection", "async"]):
                    logger.info(f"Promise rejection detected via exception type: {exc_type}")
                    return True

                if any(word in exc_value for word in ["promise", "rejection", "async function"]):
                    logger.info(f"Promise rejection detected via exception value")
                    return True

            # Check tags
            tags = event_data.get("tags", {})
            if tags.get("error.type", "").lower() in ["unhandledrejection", "promiserejection"]:
                logger.info("Promise rejection detected via tags")
                return True

            # Check for async stack traces
            for exc in exceptions:
                stacktrace = exc.get("stacktrace", {})
                frames = stacktrace.get("frames", [])

                async_indicators = 0
                for frame in frames:
                    func_name = frame.get("function", "").lower()
                    if any(word in func_name for word in ["async", "promise", "then", "catch"]):
                        async_indicators += 1

                if (
                    async_indicators >= self.ASYNC_INDICATOR_THRESHOLD
                ):  # Multiple async frames suggest promise issue
                    logger.info(
                        f"Promise rejection suspected via async stack trace ({async_indicators} indicators)"
                    )
                    return True

            return False

        except Exception as e:
            logger.error(f"Error in promise rejection detection: {e}")
            return False

    async def parse(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse promise rejection event data.

        Args:
            event_data: Raw Sentry event data

        Returns:
            Parsed promise rejection information
        """
        try:
            rejection_info = parse_promise_rejection(event_data)

            if not rejection_info:
                logger.warning("Failed to parse promise rejection info")
                return {
                    "event_id": event_data.get("id", "unknown"),
                    "parsed": False,
                    "raw_data": event_data,
                }

            # Extract patterns
            patterns = extract_promise_patterns(rejection_info)

            return {
                "event_id": event_data.get("id", "unknown"),
                "parsed": True,
                "rejection_info": rejection_info,
                "patterns": patterns,
                "raw_data": event_data,
            }

        except Exception as e:
            logger.error(f"Error parsing promise rejection: {e}")
            return {
                "event_id": event_data.get("id", "unknown"),
                "parsed": False,
                "error": str(e),
                "raw_data": event_data,
            }

    async def analyze(self, parsed_data: Dict[str, Any]) -> AnalysisResult:
        """
        Analyze parsed promise rejection data.

        Args:
            parsed_data: Data from parse() method

        Returns:
            Complete analysis result
        """
        start_time = datetime.utcnow()
        event_id = parsed_data.get("event_id", "unknown")

        try:
            if not parsed_data.get("parsed"):
                return self._create_failed_result(
                    event_id, "Failed to parse event data", start_time
                )

            rejection_info = parsed_data.get("rejection_info")
            patterns = parsed_data.get("patterns", {})

            # Calculate confidence based on available information
            confidence = self._calculate_confidence(rejection_info, patterns)

            # Generate findings
            findings = self._generate_findings(rejection_info, patterns)

            # Generate recommendations
            recommendations = await self._generate_recommendations(
                rejection_info, patterns, findings
            )

            # Calculate business impact
            business_impact = self._calculate_business_impact(rejection_info, patterns)

            # Generate visualization data
            visualization_data = self._generate_visualization(rejection_info, patterns)

            # Create unique analysis ID
            analysis_id = self._generate_analysis_id(event_id)

            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            return AnalysisResult(
                analyzer_type=AnalyzerType.PROMISE_REJECTION,
                analyzer_version=self._capabilities.version,
                analysis_id=analysis_id,
                timestamp=start_time,
                event_id=event_id,
                execution_time_ms=execution_time,
                is_detected=True,
                confidence=confidence,
                confidence_level=ConfidenceLevel.HIGH
                if confidence > 0.7
                else ConfidenceLevel.MEDIUM,
                findings=findings,
                recommendations=recommendations,
                business_impact=business_impact,
                visualization_data=visualization_data,
                raw_analysis_data={
                    "rejection_type": rejection_info.rejection_type,
                    "framework": rejection_info.framework,
                    "patterns_detected": patterns,
                    "async_depth": rejection_info.async_context.get("async_depth", 0)
                    if rejection_info.async_context
                    else 0,
                },
            )

        except Exception as e:
            logger.error(f"Error during promise rejection analysis: {e}")
            return self._create_failed_result(event_id, str(e), start_time)

    async def visualize(self, analysis: AnalysisResult) -> VisualizationData:
        """
        Generate visualization data for promise rejection analysis.

        Args:
            analysis: Analysis result

        Returns:
            Visualization data for frontend
        """
        try:
            raw_data = analysis.raw_analysis_data

            # Create promise flow visualization
            flow_data = {"nodes": [], "edges": [], "timeline": []}

            # Add nodes for promise lifecycle
            node_id = 0

            # Promise creation node
            flow_data["nodes"].append(
                {
                    "id": f"node_{node_id}",
                    "label": "Promise Created",
                    "type": "creation",
                    "status": "normal",
                }
            )
            creation_node = node_id
            node_id += 1

            # Async operations
            async_depth = raw_data.get("async_depth", 1)
            prev_node = creation_node

            for i in range(async_depth):
                flow_data["nodes"].append(
                    {
                        "id": f"node_{node_id}",
                        "label": f"Async Operation {i + 1}",
                        "type": "async",
                        "status": "normal",
                    }
                )

                flow_data["edges"].append(
                    {"source": f"node_{prev_node}", "target": f"node_{node_id}", "label": "await"}
                )

                prev_node = node_id
                node_id += 1

            # Rejection node
            flow_data["nodes"].append(
                {
                    "id": f"node_{node_id}",
                    "label": "Promise Rejected",
                    "type": "rejection",
                    "status": "error",
                }
            )

            flow_data["edges"].append(
                {"source": f"node_{prev_node}", "target": f"node_{node_id}", "label": "rejection"}
            )
            rejection_node = node_id
            node_id += 1

            # Missing catch handler
            patterns = raw_data.get("patterns_detected", {})
            if patterns.get("missing_catch"):
                flow_data["nodes"].append(
                    {
                        "id": f"node_{node_id}",
                        "label": "Missing Catch Handler",
                        "type": "missing",
                        "status": "warning",
                    }
                )

                flow_data["edges"].append(
                    {
                        "source": f"node_{rejection_node}",
                        "target": f"node_{node_id}",
                        "label": "unhandled",
                        "style": "dashed",
                    }
                )

            # Create pattern breakdown
            pattern_data = []
            for pattern, detected in patterns.items():
                if detected:
                    pattern_data.append(
                        {
                            "pattern": pattern.replace("_", " ").title(),
                            "detected": True,
                            "severity": self._get_pattern_severity(pattern),
                        }
                    )

            return VisualizationData(
                chart_type="promise_flow",
                data={
                    "flow": flow_data,
                    "patterns": pattern_data,
                    "rejection_type": raw_data.get("rejection_type", "unknown"),
                    "framework": raw_data.get("framework", "javascript"),
                },
                options={
                    "layout": "hierarchical",
                    "interactive": True,
                    "showLabels": True,
                    "animateOnLoad": True,
                },
                metadata={
                    "title": "Promise Rejection Flow",
                    "description": "Visual representation of the promise lifecycle and rejection",
                },
            )

        except Exception as e:
            logger.error(f"Error generating visualization: {e}")
            return VisualizationData(
                chart_type="error", data={"error": str(e)}, options={}, metadata={"error": True}
            )

    async def recommend(self, analysis: AnalysisResult) -> List[AnalysisRecommendation]:
        """
        Generate recommendations based on analysis.

        Args:
            analysis: Analysis result

        Returns:
            List of recommendations
        """
        return analysis.recommendations  # Already generated in analyze()

    def _calculate_confidence(
        self, rejection_info: PromiseRejectionInfo, patterns: Dict[str, bool]
    ) -> float:
        """Calculate confidence score for the analysis."""
        confidence = self.BASE_CONFIDENCE  # Base confidence

        # Increase confidence based on available information
        if rejection_info.rejection_stack:
            confidence += self.CONFIDENCE_INCREMENT_STACK

        if rejection_info.async_chain:
            confidence += self.CONFIDENCE_INCREMENT_CHAIN

        if rejection_info.framework:
            confidence += self.CONFIDENCE_INCREMENT_FRAMEWORK

        # Increase confidence for detected patterns
        pattern_count = sum(1 for detected in patterns.values() if detected)
        confidence += min(
            pattern_count * self.CONFIDENCE_INCREMENT_PATTERN, self.MAX_PATTERN_CONFIDENCE
        )

        return min(confidence, 1.0)

    def _generate_findings(
        self, rejection_info: PromiseRejectionInfo, patterns: Dict[str, bool]
    ) -> List[AnalysisFinding]:
        """Generate findings from the analysis."""
        findings = []

        # Main rejection finding
        findings.append(
            AnalysisFinding(
                category="Promise Rejection",
                description=f"{rejection_info.rejection_type.replace('_', ' ').title()}: {rejection_info.error_message}",
                severity=BusinessImpact.HIGH
                if rejection_info.rejection_type == "unhandled"
                else BusinessImpact.MEDIUM,
                evidence={
                    "error_type": rejection_info.error_type,
                    "framework": rejection_info.framework,
                    "component": rejection_info.component,
                    "function": rejection_info.function_name,
                },
                location=f"{rejection_info.file_path}:{rejection_info.line_number}"
                if rejection_info.file_path
                else None,
            )
        )

        # Pattern-based findings
        if patterns.get("missing_catch"):
            findings.append(
                AnalysisFinding(
                    category="Missing Error Handling",
                    description="Promise chain lacks a catch handler to handle rejections",
                    severity=BusinessImpact.HIGH,
                    evidence={"pattern": "missing_catch"},
                )
            )

        if patterns.get("floating_promise"):
            findings.append(
                AnalysisFinding(
                    category="Floating Promise",
                    description="Promise is not awaited or returned, may cause unhandled rejections",
                    severity=BusinessImpact.MEDIUM,
                    evidence={"pattern": "floating_promise"},
                )
            )

        if patterns.get("promise_constructor_antipattern"):
            findings.append(
                AnalysisFinding(
                    category="Anti-Pattern",
                    description="Using Promise constructor with async function is an anti-pattern",
                    severity=BusinessImpact.LOW,
                    evidence={"pattern": "promise_constructor_antipattern"},
                )
            )

        return findings

    async def _generate_recommendations(
        self,
        rejection_info: PromiseRejectionInfo,
        patterns: Dict[str, bool],
        findings: List[AnalysisFinding],
    ) -> List[AnalysisRecommendation]:
        """Generate recommendations for fixing the issues."""
        recommendations = []

        # Always recommend adding error handling
        recommendations.append(
            AnalysisRecommendation(
                title="Add Proper Error Handling",
                description="Ensure all promises have appropriate error handling",
                priority=BusinessImpact.HIGH,
                effort_estimate="30 minutes",
                code_example=self._get_error_handling_example(rejection_info),
                documentation_links=[
                    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#error_handling"
                ],
            )
        )

        # Pattern-specific recommendations
        if patterns.get("missing_catch"):
            recommendations.append(
                AnalysisRecommendation(
                    title="Add Catch Handler",
                    description="Add a .catch() handler to handle promise rejections",
                    priority=BusinessImpact.HIGH,
                    effort_estimate="15 minutes",
                    code_example="""
// Instead of:
fetchData()
  .then(data => processData(data));

// Use:
fetchData()
  .then(data => processData(data))
  .catch(error => {
    console.error('Error fetching data:', error);
    // Handle error appropriately
  });
""",
                    documentation_links=[
                        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch"
                    ],
                )
            )

        if patterns.get("floating_promise"):
            recommendations.append(
                AnalysisRecommendation(
                    title="Await or Return Promises",
                    description="Ensure promises are properly awaited or returned",
                    priority=BusinessImpact.MEDIUM,
                    effort_estimate="20 minutes",
                    code_example="""
// Instead of:
async function handleData() {
  processAsync(data); // Floating promise!
}

// Use:
async function handleData() {
  await processAsync(data); // Properly awaited
}

// Or return the promise:
function handleData() {
  return processAsync(data);
}
""",
                    documentation_links=["https://eslint.org/docs/rules/no-floating-promises"],
                )
            )

        # Framework-specific recommendations
        if rejection_info.framework == "react":
            recommendations.append(
                AnalysisRecommendation(
                    title="Use React Error Boundaries",
                    description="Implement Error Boundaries to catch errors in React components",
                    priority=BusinessImpact.MEDIUM,
                    effort_estimate="1 hour",
                    code_example="""
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    return this.props.children;
  }
}

// Wrap your components:
<ErrorBoundary>
  <YourAsyncComponent />
</ErrorBoundary>
""",
                    documentation_links=["https://reactjs.org/docs/error-boundaries.html"],
                )
            )

        # LLM-powered recommendations if available
        if self.llm_service:
            try:
                llm_recommendations = await self._get_llm_recommendations(rejection_info, patterns)
                recommendations.extend(llm_recommendations)
            except Exception as e:
                logger.error(f"Failed to get LLM recommendations: {e}")

        return recommendations

    def _calculate_business_impact(
        self, rejection_info: PromiseRejectionInfo, patterns: Dict[str, bool]
    ) -> BusinessImpact:
        """Calculate the business impact of the promise rejection."""
        # Unhandled rejections are always high impact
        if rejection_info.rejection_type == "unhandled":
            return BusinessImpact.HIGH

        # Multiple anti-patterns increase impact
        pattern_count = sum(1 for detected in patterns.values() if detected)
        if pattern_count >= 3:
            return BusinessImpact.HIGH
        elif pattern_count >= 2:
            return BusinessImpact.MEDIUM

        # Framework components have higher impact
        if rejection_info.component:
            return BusinessImpact.MEDIUM

        return BusinessImpact.LOW

    def _get_error_handling_example(self, rejection_info: PromiseRejectionInfo) -> str:
        """Generate error handling example based on the rejection context."""
        if rejection_info.framework == "react":
            return """
// For React components:
const MyComponent = () => {
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchData()
      .then(data => setData(data))
      .catch(err => {
        setError(err);
        // Log to error tracking service
      });
  }, []);
  
  if (error) return <ErrorDisplay error={error} />;
  return <DataDisplay data={data} />;
};
"""
        elif rejection_info.framework == "node":
            return """
// For Node.js:
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log to error tracking service
  // Optionally exit the process
});

// Or use async/await with try/catch:
async function main() {
  try {
    const result = await asyncOperation();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    throw error; // Re-throw if needed
  }
}
"""
        else:
            return """
// Generic async/await pattern:
async function safeAsyncOperation() {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    // Handle error appropriately:
    // - Show user-friendly message
    // - Log to error tracking
    // - Attempt recovery
    return defaultValue;
  }
}
"""

    def _get_pattern_severity(self, pattern: str) -> str:
        """Get severity level for a detected pattern."""
        severity_map = {
            "missing_catch": "high",
            "missing_await": "medium",
            "floating_promise": "medium",
            "nested_promise": "low",
            "promise_constructor_antipattern": "low",
            "multiple_rejection_handlers": "low",
        }
        return severity_map.get(pattern, "low")

    async def _get_llm_recommendations(
        self, rejection_info: PromiseRejectionInfo, patterns: Dict[str, bool]
    ) -> List[AnalysisRecommendation]:
        """Get AI-powered recommendations using LLM service."""
        if not self.llm_service:
            return []

        try:
            prompt = f"""
            Analyze this promise rejection and provide specific recommendations:
            
            Error Type: {rejection_info.rejection_type}
            Error Message: {rejection_info.error_message}
            Framework: {rejection_info.framework}
            Component: {rejection_info.component}
            Function: {rejection_info.function_name}
            
            Detected Patterns:
            {json.dumps(patterns, indent=2)}
            
            Provide 1-2 specific, actionable recommendations for fixing this issue.
            Focus on the root cause and best practices for {rejection_info.framework or 'JavaScript'}.
            """

            response = await self.llm_service.analyze(prompt, max_tokens=500)

            if response:
                # Parse LLM response into recommendation
                return [
                    AnalysisRecommendation(
                        title="AI-Suggested Fix",
                        description=response,
                        priority=BusinessImpact.MEDIUM,
                        effort_estimate="Varies",
                        documentation_links=[],
                    )
                ]

        except Exception as e:
            logger.error(f"LLM recommendation generation failed: {e}")

        return []

    def _create_failed_result(
        self, event_id: str, error: str, start_time: datetime
    ) -> AnalysisResult:
        """Create a failed analysis result."""
        execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        return AnalysisResult(
            analyzer_type=AnalyzerType.PROMISE_REJECTION,
            analyzer_version=self._capabilities.version,
            analysis_id=self._generate_analysis_id(event_id),
            timestamp=start_time,
            event_id=event_id,
            execution_time_ms=execution_time,
            is_detected=False,
            confidence=0.0,
            confidence_level=ConfidenceLevel.LOW,
            findings=[],
            recommendations=[],
            business_impact=BusinessImpact.LOW,
            visualization_data=None,
            raw_analysis_data={"error": error},
        )

    def _generate_analysis_id(self, event_id: str) -> str:
        """Generate unique analysis ID."""
        timestamp = datetime.utcnow().isoformat()
        data = f"{event_id}:{timestamp}:{AnalyzerType.PROMISE_REJECTION}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
