# File: backend/app/services/n_plus_one_analyzer.py

"""
N+1 Query Analyzer - Detects and analyzes N+1 query patterns.

This analyzer helps developers identify and fix N+1 query problems that cause
performance issues in applications by executing excessive database queries.
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
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
from ..utils.n_plus_one_parser import parse_n_plus_one_query, N1QueryInfo
from ..services.llm_service import LLMService
from ..services.n_plus_one_service import N1QueryService

logger = logging.getLogger(__name__)


class N1QueryAnalyzer(BaseAnalyzer):
    """
    Analyzer for detecting and analyzing N+1 query patterns.

    This analyzer identifies:
    - Database query patterns that indicate N+1 problems
    - Parent-child query relationships
    - Performance impact of N+1 queries
    - ORM-specific patterns (Django, SQLAlchemy, etc.)
    - API call patterns that mirror N+1 behavior
    """

    # Analysis configuration constants
    MIN_QUERIES_FOR_N1 = 3  # Minimum queries to consider N+1 pattern
    CONFIDENCE_BASE = 0.3  # Base confidence score
    CONFIDENCE_INCREMENT_PATTERNS = 0.2  # Boost for each pattern found
    CONFIDENCE_INCREMENT_CONSISTENCY = 0.1  # Boost for timing consistency
    CONFIDENCE_INCREMENT_IMPACT = 0.15  # Boost for high performance impact
    MAX_CONFIDENCE = 0.95  # Maximum achievable confidence

    def __init__(self, llm_service: Optional[LLMService] = None):
        """Initialize the analyzer with optional LLM service."""
        self.llm_service = llm_service
        self.n1_service = N1QueryService()  # Reuse existing service logic
        self._capabilities = AnalyzerCapabilities(
            analyzer_type=AnalyzerType.N_PLUS_ONE,
            name="N+1 Query Analyzer",
            description="Analyzes database query patterns to detect N+1 problems",
            version="1.0.0",
            supported_platforms=["python", "ruby", "javascript", "java", "php"],
            supported_error_types=["PerformanceTransaction", "DatabaseSpan", "HttpSpan", "Error"],
            typical_execution_time_ms=200.0,
            max_execution_time_ms=2000.0,
            memory_usage_mb=100.0,
            requires_llm=True,
            configurable_parameters=[
                "min_queries_threshold",
                "enable_api_pattern_detection",
                "enable_orm_detection",
            ],
            external_dependencies=["llm_service"],
        )

    @property
    def capabilities(self) -> AnalyzerCapabilities:
        """Return analyzer capabilities."""
        return self._capabilities

    async def detect(self, event_data: Dict[str, Any]) -> bool:
        """
        Detect if this event contains potential N+1 query patterns.

        Args:
            event_data: Raw Sentry event data

        Returns:
            True if N+1 patterns might be present
        """
        try:
            # Check if it's a performance transaction
            event_type = event_data.get("type", "")
            if event_type == "transaction":
                # Look for database spans
                spans = event_data.get("spans", [])
                db_spans = [s for s in spans if s.get("op", "").startswith("db")]

                if len(db_spans) >= self.MIN_QUERIES_FOR_N1:
                    logger.info(f"Potential N+1 pattern: {len(db_spans)} database spans found")
                    return True

            # Check error messages for N+1 indicators
            message = event_data.get("message", "").lower()
            title = event_data.get("title", "").lower()

            n1_keywords = [
                "n+1",
                "n + 1",
                "query",
                "queries",
                "database performance",
                "slow query",
                "too many queries",
                "excessive queries",
            ]

            for keyword in n1_keywords:
                if keyword in message or keyword in title:
                    logger.info(f"N+1 pattern suspected via keyword: {keyword}")
                    return True

            # Check for performance-related tags
            tags = event_data.get("tags", {})
            if tags.get("performance.issue_type") == "n_plus_one_query":
                logger.info("N+1 pattern detected via performance tags")
                return True

            # Check contexts for ORM indicators
            contexts = event_data.get("contexts", {})
            if "trace" in contexts:
                trace_op = contexts["trace"].get("op", "")
                if any(orm in trace_op for orm in ["django.db", "sqlalchemy", "activerecord"]):
                    # Check span count again with lower threshold for ORM operations
                    spans = event_data.get("spans", [])
                    if len(spans) >= 2:
                        logger.info(f"N+1 pattern suspected in ORM operation: {trace_op}")
                        return True

            return False

        except Exception as e:
            logger.error(f"Error in N+1 query detection: {e}")
            return False

    async def parse(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse N+1 query patterns from event data.

        Args:
            event_data: Raw Sentry event data

        Returns:
            Parsed N+1 query information
        """
        try:
            # Use the existing parser
            n1_info = parse_n_plus_one_query(event_data)

            if not n1_info:
                logger.warning("Failed to parse N+1 query info")
                return {
                    "event_id": event_data.get("id", "unknown"),
                    "parsed": False,
                    "raw_data": event_data,
                }

            # Calculate additional metrics
            metrics = self._calculate_metrics(n1_info)

            return {
                "event_id": event_data.get("id", "unknown"),
                "parsed": True,
                "n1_info": n1_info,
                "metrics": metrics,
                "raw_data": event_data,
            }

        except Exception as e:
            logger.error(f"Error parsing N+1 query: {e}")
            return {
                "event_id": event_data.get("id", "unknown"),
                "parsed": False,
                "error": str(e),
                "raw_data": event_data,
            }

    async def analyze(self, parsed_data: Dict[str, Any]) -> AnalysisResult:
        """
        Analyze parsed N+1 query data.

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

            n1_info = parsed_data.get("n1_info")
            metrics = parsed_data.get("metrics", {})

            # Calculate confidence score
            confidence = self._calculate_confidence(n1_info, metrics)

            # Generate findings
            findings = self._generate_findings(n1_info, metrics)

            # Generate recommendations
            recommendations = await self._generate_recommendations(n1_info, metrics, findings)

            # Calculate business impact
            business_impact = self._calculate_business_impact(n1_info, metrics)

            # Generate visualization data
            visualization_data = self._generate_visualization(n1_info, metrics)

            # Create unique analysis ID
            analysis_id = self._generate_analysis_id(event_id)

            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            return AnalysisResult(
                analyzer_type=AnalyzerType.N_PLUS_ONE,
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
                affected_users_estimate=metrics.get("affected_users"),
                financial_impact_estimate=self._estimate_financial_impact(metrics),
                visualization_data=visualization_data,
                raw_analysis_data={
                    "pattern_count": len(n1_info.patterns),
                    "total_queries": len(n1_info.queries),
                    "performance_impact_ms": metrics.get("total_wasted_time", 0),
                    "optimization_potential": metrics.get("optimization_percentage", 0),
                },
            )

        except Exception as e:
            logger.error(f"Error during N+1 query analysis: {e}")
            return self._create_failed_result(event_id, str(e), start_time)

    async def visualize(self, analysis: AnalysisResult) -> VisualizationData:
        """
        Generate visualization data for N+1 query analysis.

        Args:
            analysis: Analysis result

        Returns:
            Visualization data for frontend
        """
        try:
            raw_data = analysis.raw_analysis_data

            # Use the visualization data from the parser if available
            if hasattr(analysis, "_parsed_data") and "n1_info" in analysis._parsed_data:
                n1_info = analysis._parsed_data["n1_info"]
                return VisualizationData(
                    chart_type="query_waterfall",
                    data=n1_info.visualization_data,
                    options={
                        "interactive": True,
                        "showTimings": True,
                        "colorByLatency": True,
                        "groupByPattern": True,
                    },
                    metadata={
                        "title": "N+1 Query Pattern Visualization",
                        "description": "Timeline showing parent queries and their N+1 children",
                    },
                )

            # Fallback visualization
            return VisualizationData(
                chart_type="query_waterfall",
                data={
                    "queries": [],
                    "patterns": [],
                    "timeline": {
                        "start": 0,
                        "end": raw_data.get("performance_impact_ms", 1000),
                        "totalDuration": raw_data.get("performance_impact_ms", 1000),
                    },
                },
                options={"interactive": True, "showTimings": True},
                metadata={
                    "title": "N+1 Query Analysis",
                    "patternCount": raw_data.get("pattern_count", 0),
                    "queryCount": raw_data.get("total_queries", 0),
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

    def _calculate_metrics(self, n1_info: N1QueryInfo) -> Dict[str, Any]:
        """Calculate additional metrics from N+1 info."""
        metrics = {
            "total_queries": len(n1_info.queries),
            "pattern_count": len(n1_info.patterns),
            "total_execution_time": 0,
            "total_wasted_time": 0,
            "optimization_percentage": 0,
            "affected_users": 0,
        }

        # Calculate total execution time and waste
        for pattern in n1_info.patterns:
            metrics["total_execution_time"] += pattern.total_execution_time
            waste = pattern.total_execution_time - pattern.optimized_execution_time
            metrics["total_wasted_time"] += waste

        # Calculate optimization percentage
        if metrics["total_execution_time"] > 0:
            metrics["optimization_percentage"] = (
                metrics["total_wasted_time"] / metrics["total_execution_time"] * 100
            )

        # Estimate affected users (based on query frequency)
        if n1_info.queries:
            # Assume each unique query pattern affects different users
            unique_patterns = len(set(q.sql.split("WHERE")[0] for q in n1_info.queries))
            metrics["affected_users"] = unique_patterns * 10  # Rough estimate

        return metrics

    def _calculate_confidence(self, n1_info: N1QueryInfo, metrics: Dict[str, Any]) -> float:
        """Calculate confidence score for the analysis."""
        confidence = self.CONFIDENCE_BASE

        # More patterns increase confidence
        pattern_boost = min(len(n1_info.patterns) * self.CONFIDENCE_INCREMENT_PATTERNS, 0.4)
        confidence += pattern_boost

        # Timing consistency increases confidence
        if hasattr(self.n1_service, "_evaluate_timing_consistency"):
            for pattern in n1_info.patterns:
                consistency = self.n1_service._evaluate_timing_consistency(pattern)
                confidence += consistency * self.CONFIDENCE_INCREMENT_CONSISTENCY

        # High performance impact increases confidence
        if metrics.get("optimization_percentage", 0) > 50:
            confidence += self.CONFIDENCE_INCREMENT_IMPACT

        return min(confidence, self.MAX_CONFIDENCE)

    def _generate_findings(
        self, n1_info: N1QueryInfo, metrics: Dict[str, Any]
    ) -> List[AnalysisFinding]:
        """Generate findings from the analysis."""
        findings = []

        # Main N+1 pattern findings
        for i, pattern in enumerate(n1_info.patterns):
            findings.append(
                AnalysisFinding(
                    category="N+1 Query Pattern",
                    description=f"Detected N+1 pattern: 1 parent query spawning {len(pattern.child_queries)} child queries",
                    severity=self._determine_severity(pattern),
                    evidence={
                        "parent_query": pattern.parent_query.sql[:200] + "..."
                        if len(pattern.parent_query.sql) > 200
                        else pattern.parent_query.sql,
                        "child_count": len(pattern.child_queries),
                        "total_time_ms": pattern.total_execution_time,
                        "potential_savings_ms": pattern.total_execution_time
                        - pattern.optimized_execution_time,
                        "table": pattern.parent_query.table,
                    },
                    location=f"Query pattern #{i+1}",
                )
            )

        # Performance impact finding
        if metrics["total_wasted_time"] > 100:  # More than 100ms wasted
            findings.append(
                AnalysisFinding(
                    category="Performance Impact",
                    description=f"N+1 queries are wasting {metrics['total_wasted_time']:.1f}ms per request",
                    severity=BusinessImpact.HIGH
                    if metrics["total_wasted_time"] > 500
                    else BusinessImpact.MEDIUM,
                    evidence={
                        "wasted_time_ms": metrics["total_wasted_time"],
                        "optimization_potential": f"{metrics['optimization_percentage']:.1f}%",
                    },
                )
            )

        return findings

    def _determine_severity(self, pattern) -> BusinessImpact:
        """Determine severity based on pattern characteristics."""
        child_count = len(pattern.child_queries)
        time_impact = pattern.total_execution_time - pattern.optimized_execution_time

        if child_count > 50 or time_impact > 1000:
            return BusinessImpact.CRITICAL
        elif child_count > 20 or time_impact > 500:
            return BusinessImpact.HIGH
        elif child_count > 10 or time_impact > 200:
            return BusinessImpact.MEDIUM
        else:
            return BusinessImpact.LOW

    async def _generate_recommendations(
        self, n1_info: N1QueryInfo, metrics: Dict[str, Any], findings: List[AnalysisFinding]
    ) -> List[AnalysisRecommendation]:
        """Generate recommendations for fixing N+1 queries."""
        recommendations = []

        # Use the recommendation from the parser if available
        if n1_info.recommended_fix:
            recommendations.append(
                AnalysisRecommendation(
                    title="Optimize N+1 Queries",
                    description=n1_info.recommended_fix,
                    priority=BusinessImpact.HIGH,
                    effort_estimate="1-2 hours",
                    documentation_links=[
                        "https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm"
                    ],
                )
            )

        # ORM-specific recommendations
        for pattern in n1_info.patterns:
            pattern.parent_query.table.lower()

            # Django-specific
            if "django" in str(n1_info.queries[0].parameters):
                recommendations.append(
                    AnalysisRecommendation(
                        title="Use Django select_related() or prefetch_related()",
                        description="Use select_related() for ForeignKey and OneToOne relationships, prefetch_related() for ManyToMany and reverse ForeignKey lookups",
                        priority=BusinessImpact.HIGH,
                        effort_estimate="30 minutes",
                        code_example=f"""
# Instead of:
items = Item.objects.all()
for item in items:
    print(item.category.name)  # N+1 query!

# Use:
items = Item.objects.select_related('category').all()
for item in items:
    print(item.category.name)  # No additional queries!
""",
                        documentation_links=[
                            "https://docs.djangoproject.com/en/stable/ref/models/querysets/#select-related",
                            "https://docs.djangoproject.com/en/stable/ref/models/querysets/#prefetch-related",
                        ],
                    )
                )

            # SQLAlchemy-specific
            elif "sqlalchemy" in str(n1_info.queries[0].parameters):
                recommendations.append(
                    AnalysisRecommendation(
                        title="Use SQLAlchemy joinedload() or subqueryload()",
                        description="Use eager loading strategies to fetch related objects in a single query",
                        priority=BusinessImpact.HIGH,
                        effort_estimate="30 minutes",
                        code_example=f"""
# Instead of:
users = session.query(User).all()
for user in users:
    print(user.orders)  # N+1 query!

# Use:
from sqlalchemy.orm import joinedload
users = session.query(User).options(joinedload(User.orders)).all()
for user in users:
    print(user.orders)  # No additional queries!
""",
                        documentation_links=[
                            "https://docs.sqlalchemy.org/en/14/orm/loading_relationships.html"
                        ],
                    )
                )

        # General optimization recommendations
        if metrics["pattern_count"] > 3:
            recommendations.append(
                AnalysisRecommendation(
                    title="Consider Data Loading Strategy Review",
                    description="Multiple N+1 patterns detected. Review your application's data loading strategy comprehensively.",
                    priority=BusinessImpact.MEDIUM,
                    effort_estimate="4-8 hours",
                    documentation_links=["https://www.sitepoint.com/silver-bullet-n1-problem/"],
                )
            )

        # Caching recommendation for high-frequency queries
        if any(
            pattern.child_queries[0].execution_count > 100
            for pattern in n1_info.patterns
            if pattern.child_queries
        ):
            recommendations.append(
                AnalysisRecommendation(
                    title="Implement Query Result Caching",
                    description="High-frequency queries detected. Consider implementing caching to reduce database load.",
                    priority=BusinessImpact.MEDIUM,
                    effort_estimate="2-4 hours",
                    code_example="""
# Example with Redis caching:
def get_category(category_id):
    cache_key = f"category:{category_id}"
    cached = redis_client.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    category = Category.objects.get(id=category_id)
    redis_client.setex(cache_key, 3600, json.dumps(category.to_dict()))
    return category
""",
                    documentation_links=["https://realpython.com/caching-in-django-with-redis/"],
                )
            )

        # LLM-powered recommendations if available
        if self.llm_service:
            try:
                llm_recommendations = await self._get_llm_recommendations(n1_info, metrics)
                recommendations.extend(llm_recommendations)
            except Exception as e:
                logger.error(f"Failed to get LLM recommendations: {e}")

        return recommendations

    def _calculate_business_impact(
        self, n1_info: N1QueryInfo, metrics: Dict[str, Any]
    ) -> BusinessImpact:
        """Calculate the business impact of N+1 queries."""
        # Based on performance impact
        wasted_time = metrics.get("total_wasted_time", 0)
        pattern_count = metrics.get("pattern_count", 0)

        if wasted_time > 1000 or pattern_count > 5:  # > 1 second wasted
            return BusinessImpact.CRITICAL
        elif wasted_time > 500 or pattern_count > 3:  # > 500ms wasted
            return BusinessImpact.HIGH
        elif wasted_time > 200 or pattern_count > 1:  # > 200ms wasted
            return BusinessImpact.MEDIUM
        else:
            return BusinessImpact.LOW

    def _estimate_financial_impact(self, metrics: Dict[str, Any]) -> str:
        """Estimate financial impact of N+1 queries."""
        # Rough calculation based on wasted compute time
        wasted_seconds_per_request = metrics.get("total_wasted_time", 0) / 1000
        estimated_requests_per_day = metrics.get("affected_users", 100) * 50  # 50 requests per user

        # Assume $0.10 per compute hour
        daily_wasted_hours = (wasted_seconds_per_request * estimated_requests_per_day) / 3600
        daily_cost = daily_wasted_hours * 0.10
        annual_cost = daily_cost * 365

        if annual_cost > 1000:
            return f"${annual_cost:,.0f}/year in wasted compute"
        elif annual_cost > 100:
            return f"${annual_cost:.0f}/year in wasted compute"
        else:
            return "Minimal financial impact"

    async def _get_llm_recommendations(
        self, n1_info: N1QueryInfo, metrics: Dict[str, Any]
    ) -> List[AnalysisRecommendation]:
        """Get AI-powered recommendations using LLM service."""
        if not self.llm_service:
            return []

        try:
            # Get table names from patterns
            tables = list(set(p.parent_query.table for p in n1_info.patterns))

            prompt = f"""
            Analyze this N+1 query pattern and provide specific optimization recommendations:
            
            Tables involved: {', '.join(tables)}
            Pattern count: {metrics['pattern_count']}
            Total queries: {metrics['total_queries']}
            Performance impact: {metrics['total_wasted_time']:.1f}ms wasted per request
            
            Sample parent query: {n1_info.patterns[0].parent_query.sql[:200] if n1_info.patterns else 'N/A'}
            Child query count: {len(n1_info.patterns[0].child_queries) if n1_info.patterns else 0}
            
            Provide specific, actionable recommendations for optimizing these queries.
            Consider database design improvements, query optimization, and caching strategies.
            """

            response = await self.llm_service.analyze(prompt, max_tokens=500)

            if response:
                return [
                    AnalysisRecommendation(
                        title="AI-Powered Optimization Strategy",
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
            analyzer_type=AnalyzerType.N_PLUS_ONE,
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
        data = f"{event_id}:{timestamp}:{AnalyzerType.N_PLUS_ONE}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
