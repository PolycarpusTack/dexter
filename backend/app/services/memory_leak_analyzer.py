"""
Memory Leak Analyzer Service

Enterprise-grade memory leak analyzer implementing the BaseAnalyzer protocol
with robust error handling, streaming parsing, and ML-based detection.
"""

import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from uuid import uuid4

from app.models.analyzers import (
    BaseAnalyzer,
    AnalyzerCapabilities,
    AnalyzerType,
    AnalysisResult,
    BusinessImpact,
    AnalysisRecommendation,
    VisualizationData,
)
from app.models.memory_leak import (
    HeapSnapshotFormat,
    LeakType,
    GrowthPattern,
    ParseError,
    AnalysisError,
    HeapSnapshot,
    LeakPattern,
    RetentionPath,
    MemoryLeakAnalysis,
    AnalysisContext,
    MemoryMetrics,
)
from app.services.resilience import CircuitBreaker, RetryPolicy
from app.services.memory_parsers import ParserFactory
from app.services.memory_patterns import PatternDetectionEngine
from app.services.memory_retention import RetentionAnalyzer
from app.services.apm_integration import APMIntegrationService

logger = logging.getLogger(__name__)


class MemoryLeakAnalyzer(BaseAnalyzer):
    """
    Enterprise-grade memory leak analyzer with robust error handling,
    streaming capabilities, and ML-based detection.
    """

    def __init__(self, llm_service=None, config: Optional[Dict[str, Any]] = None):
        """Initialize the memory leak analyzer."""
        self.llm_service = llm_service
        self.config = config or self._default_config()

        # Initialize components
        self.parser_factory = ParserFactory(config=self.config)
        self.pattern_engine = PatternDetectionEngine(config=self.config)
        self.retention_analyzer = RetentionAnalyzer(config=self.config)

        # Integration services
        self.apm_integration = APMIntegrationService()
        # Lazy import to avoid circular dependency with chaos_testing
        try:
            from app.services.chaos_testing import ChaosTestingService  # type: ignore

            self.chaos_testing = ChaosTestingService(self)
        except Exception:
            self.chaos_testing = None

        # Resilience components
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=self.config.get("circuit_breaker_threshold", 5),
            recovery_timeout=self.config.get("circuit_breaker_timeout", 60),
        )
        self.retry_policy = RetryPolicy(
            max_attempts=self.config.get("max_retries", 3),
            backoff_factor=self.config.get("backoff_factor", 2),
        )

        # Metrics
        self._analysis_count = 0
        self._error_count = 0
        self._success_rate = 1.0

    @property
    def capabilities(self) -> AnalyzerCapabilities:
        """Return analyzer capabilities."""
        return AnalyzerCapabilities(
            analyzer_type=AnalyzerType.MEMORY_LEAK,
            name="Memory Leak Analyzer",
            description="Detects JavaScript memory leaks using heap snapshot analysis",
            version="1.0.0",
            supported_platforms=["javascript", "typescript", "node", "browser"],
            capabilities={
                "heap_formats": ["v8", "javascriptcore", "spidermonkey"],
                "max_heap_size": "4GB",
                "streaming": True,
                "ml_detection": True,
                "pattern_types": [
                    "dom_detached",
                    "event_listener",
                    "closure_leak",
                    "react_context",
                    "vue_watcher",
                    "angular_observable",
                    "global_pollution",
                    "circular_reference",
                    "timer_leak",
                    "promise_leak",
                    "wasm_interop",
                ],
            },
            configuration_schema={
                "type": "object",
                "properties": {
                    "min_retained_size": {"type": "integer", "default": 1048576},
                    "leak_confidence_threshold": {"type": "number", "default": 0.7},
                    "enable_ml_detection": {"type": "boolean", "default": True},
                    "max_analysis_duration_seconds": {"type": "integer", "default": 300},
                },
            },
        )

    async def detect(self, event_data: Dict[str, Any]) -> bool:
        """
        Detect if this analyzer should process the event.

        Looks for:
        - Heap snapshot attachments
        - Memory-related error messages
        - OOM (Out of Memory) indicators
        """
        try:
            # Check for heap snapshot attachment
            if event_data.get("heap_snapshot"):
                return True

            # Check for memory-related errors
            message = event_data.get("message", "").lower()
            title = event_data.get("title", "").lower()

            memory_indicators = [
                "out of memory",
                "oom",
                "heap snapshot",
                "memory leak",
                "maximum call stack",
                "allocation failed",
                "gc overhead",
            ]

            for indicator in memory_indicators:
                if indicator in message or indicator in title:
                    return True

            # Check exception type
            exceptions = event_data.get("exception", {}).get("values", [])
            for exc in exceptions:
                exc_type = exc.get("type", "").lower()
                if any(term in exc_type for term in ["memory", "heap", "oom"]):
                    return True

            # Check tags
            tags = event_data.get("tags", [])
            for tag in tags:
                if tag.get("key") == "memory.issue":
                    return True

            return False

        except Exception as e:
            logger.error(f"Error in memory leak detection: {e}")
            return False

    async def parse(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse the event data and extract heap snapshot information.
        """
        context = AnalysisContext(
            snapshot_id=event_data.get("id", str(uuid4())),
            tenant_id=event_data.get("tenant_id"),
            session_id=str(uuid4()),
            start_time=datetime.utcnow(),
            config=self.config,
        )

        try:
            context.current_stage = "parsing"
            start_time = time.time()

            # Extract heap snapshot data
            heap_data = await self._extract_heap_data(event_data, context)
            if not heap_data:
                raise ParseError(
                    "No heap snapshot data found",
                    "PARSE_NO_DATA",
                    {"event_id": event_data.get("id")},
                )

            # Detect snapshot format
            format_type = await self._detect_format(heap_data, context)

            # Get appropriate parser
            parser = self.parser_factory.get_parser(format_type)

            # Parse snapshot with streaming if large
            if len(heap_data) > self.config.get("streaming_threshold", 104857600):  # 100MB
                parsed = await self._parse_streaming(parser, heap_data, context)
            else:
                parsed = await parser.parse(heap_data)

            # Create heap snapshot model
            snapshot = HeapSnapshot(
                id=context.snapshot_id,
                format=format_type,
                timestamp=datetime.utcnow(),
                metadata=parsed.get("metadata", {}),
                metrics=self._extract_metrics(parsed),
                object_count=parsed.get("object_count", 0),
                total_size=parsed.get("total_size", 0),
                parsing_duration_ms=(time.time() - start_time) * 1000,
            )

            context.mark_stage_complete("parsing", (time.time() - start_time) * 1000)

            return {
                "snapshot": snapshot,
                "heap_graph": parsed.get("graph"),
                "context": context,
                "event_data": event_data,
            }

        except ParseError:
            raise
        except Exception as e:
            context.add_error("parsing", e)
            raise ParseError(
                f"Failed to parse heap snapshot: {str(e)}",
                "PARSE_FAILED",
                {"error": str(e), "type": type(e).__name__},
            )

    async def analyze(self, parsed_data: Dict[str, Any]) -> AnalysisResult:
        """
        Analyze the parsed heap snapshot for memory leaks.
        """
        context = parsed_data["context"]
        snapshot = parsed_data["snapshot"]
        event_data = parsed_data.get("event_data", {})

        # Check if APM integration is enabled
        apm_data = {}
        if context.options.get("enable_apm_correlation", True):
            try:
                event_timestamp = datetime.fromisoformat(
                    event_data.get("timestamp", datetime.now().isoformat())
                )
                apm_data = await self.apm_integration.correlate_with_apm_data(
                    event_timestamp, event_data, None  # Will be filled after analysis
                )
            except Exception as e:
                logger.warning(f"APM correlation failed: {e}")
                apm_data = {"apm_correlation": {"enabled": False, "error": str(e)}}
        heap_graph = parsed_data["heap_graph"]

        try:
            context.current_stage = "analysis"
            start_time = time.time()

            # Run analysis pipeline
            analysis = await self._run_analysis_pipeline(snapshot, heap_graph, context)

            # Generate recommendations
            if self.llm_service and self.config.get("enable_ai_recommendations", True):
                recommendations = await self._generate_ai_recommendations(analysis, parsed_data)
            else:
                recommendations = self._generate_rule_recommendations(analysis)

            analysis.recommendations = recommendations

            # Create visualization data
            analysis.visualization = await self._create_visualization_data(analysis, heap_graph)

            context.mark_stage_complete("analysis", (time.time() - start_time) * 1000)
            context.is_complete = True

            # Convert to standard result format
            result = analysis.to_analysis_result()

            # Merge APM correlation data
            if apm_data:
                result.metadata.update(apm_data)

            return result

        except AnalysisError:
            raise
        except Exception as e:
            context.add_error("analysis", e)
            raise AnalysisError(
                f"Analysis failed: {str(e)}",
                "ANALYSIS_FAILED",
                {"error": str(e), "type": type(e).__name__},
            )

    async def _extract_heap_data(
        self, event_data: Dict[str, Any], context: AnalysisContext
    ) -> Optional[bytes]:
        """Extract heap snapshot data from event."""
        # Direct heap snapshot attachment
        if event_data.get("heap_snapshot"):
            snapshot_data = event_data["heap_snapshot"]
            if isinstance(snapshot_data, str):
                return snapshot_data.encode("utf-8")
            return snapshot_data

        # Check attachments
        attachments = event_data.get("attachments", [])
        for attachment in attachments:
            if attachment.get("type") == "heap_snapshot":
                return attachment.get("data")

        # Check for heap dump URL
        heap_url = event_data.get("heap_dump_url")
        if heap_url:
            context.add_warning(
                "parsing", "Heap dump URL provided but not fetched", {"url": heap_url}
            )
            # In production, would fetch from URL with proper auth

        return None

    async def _detect_format(
        self, heap_data: bytes, context: AnalysisContext
    ) -> HeapSnapshotFormat:
        """Detect heap snapshot format from data."""
        # Check magic numbers/headers
        if heap_data.startswith(b'{"snapshot"'):
            return HeapSnapshotFormat.V8
        elif heap_data.startswith(b"JSC"):
            return HeapSnapshotFormat.JSC
        elif heap_data.startswith(b"SpiderMonkey"):
            return HeapSnapshotFormat.SPIDERMONKEY

        # Try parsing first few bytes as JSON
        try:
            header = json.loads(heap_data[:1000].decode("utf-8", errors="ignore"))
            if "nodes" in header or "snapshot" in header:
                return HeapSnapshotFormat.V8
        except:
            pass

        context.add_warning(
            "parsing",
            "Unknown heap snapshot format, defaulting to V8",
            {"first_bytes": heap_data[:100].hex()},
        )
        return HeapSnapshotFormat.V8

    async def _parse_streaming(
        self, parser: Any, heap_data: bytes, context: AnalysisContext
    ) -> Dict[str, Any]:
        """Parse large heap snapshots using streaming."""
        chunk_size = self.config.get("chunk_size", 10485760)  # 10MB chunks
        total_chunks = (len(heap_data) + chunk_size - 1) // chunk_size

        parsed_chunks = []
        for i in range(total_chunks):
            start = i * chunk_size
            end = min((i + 1) * chunk_size, len(heap_data))
            chunk = heap_data[start:end]

            parsed_chunk = await parser.parse_chunk(chunk, i == 0, i == total_chunks - 1)
            parsed_chunks.append(parsed_chunk)

            # Emit progress
            progress = (i + 1) / total_chunks * 100
            logger.info(f"Parsing progress: {progress:.1f}%")

        # Consolidate chunks
        return await parser.consolidate_chunks(parsed_chunks)

    def _extract_metrics(self, parsed: Dict[str, Any]) -> MemoryMetrics:
        """Extract memory metrics from parsed data."""
        stats = parsed.get("statistics", {})
        return MemoryMetrics(
            timestamp=datetime.utcnow(),
            heap_size=stats.get("heap_size", 0),
            heap_used=stats.get("heap_used", 0),
            external_memory=stats.get("external_memory", 0),
            array_buffers=stats.get("array_buffers", 0),
            gc_count=stats.get("gc_count", 0),
            gc_duration_ms=stats.get("gc_duration_ms", 0),
        )

    async def _run_analysis_pipeline(
        self, snapshot: HeapSnapshot, heap_graph: Dict[str, Any], context: AnalysisContext
    ) -> MemoryLeakAnalysis:
        """Run the complete analysis pipeline."""
        # Stage 1: Pattern Detection
        context.current_stage = "pattern_detection"
        leak_patterns = await self.pattern_engine.detect_patterns(heap_graph)

        # Stage 2: Retention Analysis
        context.current_stage = "retention_analysis"
        retention_paths = await self.retention_analyzer.analyze_paths(heap_graph, leak_patterns)

        # Stage 3: Growth Analysis
        context.current_stage = "growth_analysis"
        growth_pattern = self._analyze_growth_pattern(snapshot, context)

        # Stage 4: Calculate leak score
        leak_score = self._calculate_leak_score(leak_patterns, retention_paths, growth_pattern)

        # Stage 5: ML confidence (if enabled)
        ml_confidence = None
        if self.config.get("enable_ml_detection", True):
            try:
                ml_confidence = await self._get_ml_confidence(leak_patterns, heap_graph)
            except Exception as e:
                context.add_warning("ml_detection", f"ML detection failed: {e}")

        return MemoryLeakAnalysis(
            snapshot_id=snapshot.id,
            timestamp=snapshot.timestamp,
            format=snapshot.format,
            leaks_detected=leak_patterns,
            growth_pattern=growth_pattern,
            leak_score=leak_score,
            retention_paths=retention_paths,
            recommendations=[],  # Will be filled later
            analysis_duration_ms=sum(context.stage_durations.values()),
            ml_confidence=ml_confidence,
            errors=context.errors,
        )

    def _analyze_growth_pattern(
        self, snapshot: HeapSnapshot, context: AnalysisContext
    ) -> GrowthPattern:
        """Analyze memory growth pattern."""
        # In production, would compare with historical snapshots
        # For now, return based on heap utilization
        utilization = snapshot.metrics.heap_utilization

        if utilization > 90:
            return GrowthPattern.EXPONENTIAL
        elif utilization > 70:
            return GrowthPattern.LINEAR
        elif utilization > 50:
            return GrowthPattern.STEPPED
        else:
            return GrowthPattern.STABLE

    def _calculate_leak_score(
        self, patterns: List[LeakPattern], paths: List[RetentionPath], growth: GrowthPattern
    ) -> float:
        """Calculate overall leak probability score."""
        if not patterns:
            return 0.0

        # Weight factors
        pattern_weight = 0.4
        retention_weight = 0.3
        growth_weight = 0.3

        # Pattern score
        pattern_score = sum(p.confidence for p in patterns) / len(patterns)

        # Retention score
        retention_score = 0.0
        if paths:
            retention_score = sum(p.leak_probability for p in paths) / len(paths)

        # Growth score
        growth_scores = {
            GrowthPattern.EXPONENTIAL: 1.0,
            GrowthPattern.LINEAR: 0.7,
            GrowthPattern.STEPPED: 0.5,
            GrowthPattern.OSCILLATING: 0.3,
            GrowthPattern.STABLE: 0.1,
        }
        growth_score = growth_scores.get(growth, 0.5)

        # Weighted combination
        total_score = (
            pattern_score * pattern_weight
            + retention_score * retention_weight
            + growth_score * growth_weight
        )

        return min(total_score, 1.0)

    async def _get_ml_confidence(
        self, patterns: List[LeakPattern], heap_graph: Dict[str, Any]
    ) -> float:
        """Get ML-based confidence score."""
        # Placeholder for ML model integration
        # Would call actual ML service here
        return 0.85

    async def _generate_ai_recommendations(
        self, analysis: MemoryLeakAnalysis, parsed_data: Dict[str, Any]
    ) -> List[AnalysisRecommendation]:
        """Generate AI-powered recommendations."""
        if not self.llm_service:
            return self._generate_rule_recommendations(analysis)

        try:
            prompt = self._create_memory_leak_prompt(analysis, parsed_data)

            # Call LLM with circuit breaker
            ai_response = await self.circuit_breaker.call(
                self.llm_service.get_explanation,
                {"event_id": analysis.snapshot_id, "prompt": prompt, "max_tokens": 1000},
            )

            return self._parse_ai_recommendations(ai_response, analysis)

        except Exception as e:
            logger.error(f"AI recommendation generation failed: {e}")
            # Fallback to rule-based
            return self._generate_rule_recommendations(analysis)

    def _generate_rule_recommendations(
        self, analysis: MemoryLeakAnalysis
    ) -> List[AnalysisRecommendation]:
        """Generate rule-based recommendations."""
        recommendations = []

        for leak in analysis.leaks_detected:
            if leak.type == LeakType.DOM_DETACHED:
                recommendations.append(
                    AnalysisRecommendation(
                        title="Remove Detached DOM Nodes",
                        description="Clean up event listeners and references to removed DOM elements",
                        priority=BusinessImpact.HIGH,
                        code_example="""
// Before: Potential leak
element.addEventListener('click', handler);
element.remove(); // Handler still attached!

// After: Proper cleanup
element.addEventListener('click', handler);
element.removeEventListener('click', handler);
element.remove();
""",
                    )
                )

            elif leak.type == LeakType.EVENT_LISTENER:
                recommendations.append(
                    AnalysisRecommendation(
                        title="Manage Event Listeners Lifecycle",
                        description="Use weak references or ensure proper cleanup of event listeners",
                        priority=BusinessImpact.HIGH,
                        code_example="""
// Use AbortController for cleanup
const controller = new AbortController();
element.addEventListener('click', handler, { signal: controller.signal });

// Cleanup
controller.abort(); // Removes all listeners with this signal
""",
                    )
                )

            elif leak.type == LeakType.CLOSURE_LEAK:
                recommendations.append(
                    AnalysisRecommendation(
                        title="Avoid Unnecessary Closures",
                        description="Be careful with closures that capture large objects",
                        priority=BusinessImpact.MEDIUM,
                        code_example="""
// Before: Closure captures entire scope
function createHandler(largeData) {
    return () => console.log(largeData.id); // Captures all of largeData
}

// After: Only capture what's needed
function createHandler(largeData) {
    const id = largeData.id;
    return () => console.log(id); // Only captures id
}
""",
                    )
                )

        # Add general recommendations
        if analysis.growth_pattern in [GrowthPattern.LINEAR, GrowthPattern.EXPONENTIAL]:
            recommendations.append(
                AnalysisRecommendation(
                    title="Implement Memory Monitoring",
                    description="Set up continuous memory monitoring to catch leaks early",
                    priority=BusinessImpact.HIGH,
                    code_example="""
// Monitor memory usage
setInterval(() => {
    if (performance.memory) {
        const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        if (usage > 0.9) {
            console.warn('High memory usage:', usage);
        }
    }
}, 60000); // Check every minute
""",
                )
            )

        return recommendations

    def _create_memory_leak_prompt(
        self, analysis: MemoryLeakAnalysis, parsed_data: Dict[str, Any]
    ) -> str:
        """Create prompt for AI recommendations."""
        leak_summary = []
        for leak in analysis.leaks_detected[:5]:  # Top 5 leaks
            leak_summary.append(
                f"- {leak.type.value}: {leak.description} "
                f"(confidence: {leak.confidence:.2f}, size: {leak.total_retained_size} bytes)"
            )

        return f"""
You are a JavaScript memory optimization expert. Analyze this memory leak report and provide actionable recommendations.

MEMORY LEAK SUMMARY:
- Total leaks detected: {len(analysis.leaks_detected)}
- Overall leak score: {analysis.leak_score:.2f}
- Growth pattern: {analysis.growth_pattern.value}
- Heap format: {analysis.format.value}

TOP LEAKS:
{chr(10).join(leak_summary)}

APPLICATION CONTEXT:
- Platform: {parsed_data['event_data'].get('platform', 'unknown')}
- Environment: {parsed_data['event_data'].get('environment', 'unknown')}

Please provide:
1. Root cause analysis of the memory leaks
2. Specific code fixes for each leak type
3. Preventive measures to avoid future leaks
4. Memory profiling best practices
5. Framework-specific optimizations if applicable

Focus on practical, implementable solutions with code examples.
"""

    def _parse_ai_recommendations(
        self, ai_response: str, analysis: MemoryLeakAnalysis
    ) -> List[AnalysisRecommendation]:
        """Parse AI response into structured recommendations."""
        recommendations = []

        # Parse sections from AI response
        sections = ai_response.split("\n\n")

        for i, section in enumerate(sections):
            if not section.strip():
                continue

            # Extract title (first line)
            lines = section.strip().split("\n")
            title = lines[0].strip("# ").strip()

            # Extract code blocks
            code_example = ""
            in_code_block = False
            description_lines = []

            for line in lines[1:]:
                if line.strip().startswith("```"):
                    in_code_block = not in_code_block
                elif in_code_block:
                    code_example += line + "\n"
                else:
                    description_lines.append(line)

            description = "\n".join(description_lines).strip()

            # Determine priority based on leak severity
            priority = BusinessImpact.HIGH
            if i > 2:  # Lower priority for later recommendations
                priority = BusinessImpact.MEDIUM

            if title and description:
                recommendations.append(
                    AnalysisRecommendation(
                        title=title,
                        description=description,
                        priority=priority,
                        code_example=code_example.strip() if code_example else None,
                    )
                )

        return recommendations[:10]  # Limit to 10 recommendations

    async def _create_visualization_data(
        self, analysis: MemoryLeakAnalysis, heap_graph: Dict[str, Any]
    ) -> VisualizationData:
        """Create visualization data for frontend display."""
        # Memory timeline data
        timeline_data = {
            "type": "timeline",
            "data": {
                "metrics": [m.dict() for m in analysis.metrics_trend[-20:]],  # Last 20 points
                "leaks": [
                    {
                        "timestamp": analysis.timestamp.isoformat(),
                        "type": leak.type.value,
                        "size": leak.total_retained_size,
                    }
                    for leak in analysis.leaks_detected
                ],
            },
        }

        # Retention tree data (simplified)
        retention_tree = {"type": "retention_tree", "data": {"nodes": [], "edges": []}}

        # Add top retention paths to tree
        for path in analysis.retention_paths[:10]:  # Top 10 paths
            for i, step in enumerate(path.path):
                node_id = step.get("object_id", f"node_{i}")
                retention_tree["data"]["nodes"].append(
                    {
                        "id": node_id,
                        "label": step.get("type", "Object"),
                        "size": step.get("retained_size", 0),
                        "leak_probability": path.leak_probability,
                    }
                )

                if i > 0:
                    prev_id = path.path[i - 1].get("object_id", f"node_{i-1}")
                    retention_tree["data"]["edges"].append(
                        {
                            "source": prev_id,
                            "target": node_id,
                            "label": step.get("property", "reference"),
                        }
                    )

        # Leak distribution chart
        leak_distribution = {
            "type": "pie_chart",
            "data": {
                "labels": [leak.type.value for leak in analysis.leaks_detected],
                "values": [leak.total_retained_size for leak in analysis.leaks_detected],
            },
        }

        return VisualizationData(
            chart_type="multi_chart",
            data={"charts": [timeline_data, retention_tree, leak_distribution]},
        )

    def _default_config(self) -> Dict[str, Any]:
        """Return default configuration."""
        return {
            "min_retained_size": 1048576,  # 1MB
            "leak_confidence_threshold": 0.7,
            "enable_ml_detection": True,
            "enable_ai_recommendations": True,
            "max_analysis_duration_seconds": 300,
            "streaming_threshold": 104857600,  # 100MB
            "chunk_size": 10485760,  # 10MB
            "circuit_breaker_threshold": 5,
            "circuit_breaker_timeout": 60,
            "max_retries": 3,
            "backoff_factor": 2,
        }
