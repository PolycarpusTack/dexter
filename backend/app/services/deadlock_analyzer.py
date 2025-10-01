# File: backend/app/services/deadlock_analyzer.py

"""
PostgreSQL Deadlock Analyzer - Implements the BaseAnalyzer protocol for deadlock analysis.

This analyzer detects, parses, analyzes, and provides recommendations for PostgreSQL
deadlock errors using the enhanced deadlock parser and analyzer framework.
"""

import logging
from typing import Dict, List, Any
from datetime import datetime

from ..models.analyzers import (
    BaseAnalyzer,
    AnalyzerType,
    AnalyzerCapabilities,
    AnalysisResult,
    AnalysisFinding,
    AnalysisRecommendation,
    VisualizationData,
    BusinessImpact,
    ConfidenceLevel,
)
from ..utils.enhanced_deadlock_parser import parse_postgresql_deadlock, model_to_dict

logger = logging.getLogger(__name__)


class PostgreSQLDeadlockAnalyzer(BaseAnalyzer):
    """
    Analyzer for PostgreSQL deadlock errors.

    This analyzer detects and analyzes PostgreSQL deadlock situations,
    providing visualizations and recommendations for resolution.
    """

    def __init__(self, llm_service=None):
        """
        Initialize the deadlock analyzer.

        Args:
            llm_service: Optional LLM service for AI-powered recommendations
        """
        self.llm_service = llm_service

    @property
    def capabilities(self) -> AnalyzerCapabilities:
        """Return the capabilities of the PostgreSQL Deadlock Analyzer."""
        return AnalyzerCapabilities(
            analyzer_type=AnalyzerType.DEADLOCK,
            name="PostgreSQL Deadlock Analyzer",
            description="Detects and analyzes PostgreSQL deadlock errors with visual dependency graphs",
            version="2.0.0",
            supported_platforms=["python", "ruby", "java", "node"],
            supported_error_types=["DatabaseError", "DeadlockError", "OperationalError"],
            typical_execution_time_ms=150.0,
            max_execution_time_ms=5000.0,
            memory_usage_mb=50.0,
            features=[
                "Multi-version PostgreSQL support",
                "Lock dependency visualization",
                "Query fingerprinting",
                "PII redaction",
                "Lock compatibility analysis",
                "Severity scoring",
            ],
            tags=["database", "postgresql", "deadlock", "performance"],
        )

    async def detect(self, event_data: Dict[str, Any]) -> bool:
        """
        Detect if this event contains a PostgreSQL deadlock error.

        Args:
            event_data: Raw event data from Sentry

        Returns:
            True if a deadlock is detected, False otherwise
        """
        try:
            # Check for PostgreSQL error codes
            if "40P01" in str(event_data):  # PostgreSQL deadlock error code
                return True

            # Check for deadlock keywords in various fields
            keywords = ["deadlock detected", "deadlock_detected", "DeadlockError"]

            # Check message
            message = event_data.get("message", "").lower()
            if any(keyword.lower() in message for keyword in keywords):
                return True

            # Check title
            title = event_data.get("title", "").lower()
            if any(keyword.lower() in title for keyword in keywords):
                return True

            # Check exception values
            exception_values = event_data.get("exception", {}).get("values", [])
            for exception in exception_values:
                exc_type = exception.get("type", "").lower()
                exc_value = str(exception.get("value", "")).lower()

                if any(keyword.lower() in exc_type for keyword in keywords):
                    return True
                if any(keyword.lower() in exc_value for keyword in keywords):
                    return True

                # Check for PostgreSQL-specific exception types
                if exc_type in ["operationalerror", "databaseerror", "deadlockerror"]:
                    if "deadlock" in exc_value:
                        return True

            # Check tags
            tags = event_data.get("tags", {})
            if tags.get("database.type") == "postgresql" and tags.get("error.type") == "deadlock":
                return True

            return False

        except Exception as e:
            logger.error(f"Error in deadlock detection: {e}")
            return False

    async def parse(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse deadlock information from the event.

        Args:
            event_data: Raw event data from Sentry

        Returns:
            Parsed deadlock data
        """
        try:
            # Use the enhanced deadlock parser
            deadlock_info = parse_postgresql_deadlock(event_data)

            if deadlock_info:
                # Convert to dict for serialization
                parsed_data = {
                    "event_id": event_data.get("id", "unknown"),
                    "timestamp": event_data.get("timestamp", datetime.utcnow().isoformat()),
                    "deadlock_info": model_to_dict(deadlock_info),
                    "platform": event_data.get("platform", "unknown"),
                    "environment": event_data.get("environment", "unknown"),
                    "tags": event_data.get("tags", {}),
                    "contexts": event_data.get("contexts", {}),
                }
            else:
                # Fallback: extract basic info if parser fails
                parsed_data = {
                    "event_id": event_data.get("id", "unknown"),
                    "timestamp": event_data.get("timestamp", datetime.utcnow().isoformat()),
                    "message": event_data.get("message", ""),
                    "platform": event_data.get("platform", "unknown"),
                    "environment": event_data.get("environment", "unknown"),
                    "tags": event_data.get("tags", {}),
                    "contexts": event_data.get("contexts", {}),
                }

            return parsed_data

        except Exception as e:
            logger.error(f"Error parsing deadlock data: {e}")
            return {"error": str(e), "event_id": event_data.get("id", "unknown")}

    async def analyze(self, parsed_data: Dict[str, Any]) -> AnalysisResult:
        """
        Analyze the parsed deadlock data.

        Args:
            parsed_data: Parsed deadlock data

        Returns:
            Analysis result with findings and recommendations
        """
        start_time = datetime.utcnow()

        try:
            deadlock_info_dict = parsed_data.get("deadlock_info")

            if not deadlock_info_dict:
                # No detailed deadlock info available
                return self._create_basic_analysis(parsed_data, start_time)

            # Extract key information
            transactions = deadlock_info_dict.get("transactions", {})
            locks = deadlock_info_dict.get("locks", [])
            cycles = deadlock_info_dict.get("cycles", [])
            severity_score = deadlock_info_dict.get("severity_score", 0)

            # Calculate confidence based on available information
            confidence = self._calculate_confidence(deadlock_info_dict)

            # Determine business impact
            business_impact = self._calculate_business_impact(deadlock_info_dict, parsed_data)

            # Create findings
            findings = self._create_findings(deadlock_info_dict)

            # Generate recommendations (first try AI-powered, then fallback to rules-based)
            ai_recommendations_text = await self._generate_ai_recommendations(
                deadlock_info_dict, parsed_data
            )

            if ai_recommendations_text:
                # Store AI recommendations in deadlock_info for processing
                deadlock_info_dict["ai_recommendations"] = ai_recommendations_text

            recommendations = await self._create_recommendations_with_ai(
                deadlock_info_dict, ai_recommendations_text
            )

            # Add visualization data
            viz_data_dict = self._enhance_visualization_data(deadlock_info_dict)
            visualization_data = VisualizationData(
                chart_type="force-directed-graph",
                data=viz_data_dict,
                options={
                    "title": "PostgreSQL Deadlock Dependency Graph",
                    "width": 800,
                    "height": 600,
                },
            )

            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            # Calculate confidence level
            if confidence < 0.4:
                confidence_level = ConfidenceLevel.LOW
            elif confidence < 0.7:
                confidence_level = ConfidenceLevel.MEDIUM
            else:
                confidence_level = ConfidenceLevel.HIGH

            return AnalysisResult(
                analyzer_type=AnalyzerType.DEADLOCK,
                analyzer_version=self.capabilities.version,
                analysis_id=f"deadlock_{parsed_data.get('event_id', 'unknown')}_{datetime.utcnow().isoformat()}",
                event_id=parsed_data.get("event_id", "unknown"),
                execution_time_ms=execution_time,
                is_detected=True,
                confidence=confidence,
                confidence_level=confidence_level,
                business_impact=business_impact,
                findings=findings,
                recommendations=recommendations,
                visualization_data=visualization_data,
                metadata={
                    "severity_score": severity_score,
                    "transaction_count": len(transactions),
                    "lock_count": len(locks),
                    "cycle_count": len(cycles),
                    "environment": parsed_data.get("environment", "unknown"),
                    "platform": parsed_data.get("platform", "unknown"),
                },
                debug_info={
                    "parser_version": "enhanced",
                    "confidence_factors": self._get_confidence_factors(deadlock_info_dict),
                },
            )

        except Exception as e:
            logger.error(f"Error analyzing deadlock: {e}")
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            return AnalysisResult(
                analyzer_type=AnalyzerType.DEADLOCK,
                analyzer_version=self.capabilities.version,
                analysis_id=f"deadlock_error_{datetime.utcnow().isoformat()}",
                event_id=parsed_data.get("event_id", "unknown"),
                execution_time_ms=execution_time,
                is_detected=False,
                confidence=0.0,
                confidence_level=ConfidenceLevel.LOW,
                business_impact=BusinessImpact.LOW,
                findings=[],
                recommendations=[],
                error=str(e),
            )

    async def visualize(self, analysis: AnalysisResult) -> VisualizationData:
        """
        Generate visualization data for the deadlock.

        Args:
            analysis: Analysis result

        Returns:
            Visualization data for frontend rendering
        """
        try:
            # Get the visualization data from the analysis
            if analysis.visualization_data and isinstance(
                analysis.visualization_data, VisualizationData
            ):
                # Already have proper visualization data
                return analysis.visualization_data

            # Fallback: create basic visualization
            viz_data = {}
            if analysis.visualization_data:
                # If it's a dict or other type, extract data
                if hasattr(analysis.visualization_data, "data"):
                    viz_data = analysis.visualization_data.data
                elif isinstance(analysis.visualization_data, dict):
                    viz_data = analysis.visualization_data

            # Ensure it has the right structure for D3.js force-directed graph
            return VisualizationData(
                chart_type="force-directed-graph",
                data={
                    "nodes": viz_data.get("nodes", []) if isinstance(viz_data, dict) else [],
                    "edges": viz_data.get("edges", []) if isinstance(viz_data, dict) else [],
                    "cycles": viz_data.get("cycles", []) if isinstance(viz_data, dict) else [],
                    "lockCompatibility": viz_data.get("lockCompatibility", {})
                    if isinstance(viz_data, dict)
                    else {},
                },
                options={
                    "title": "PostgreSQL Deadlock Dependency Graph",
                    "width": 800,
                    "height": 600,
                    "nodeColors": {
                        "process": "#4A90E2",
                        "table": "#7ED321",
                        "processInCycle": "#D0021B",
                        "tableInCycle": "#F5A623",
                    },
                    "edgeColors": {
                        "waitsFor": "#9013FE",
                        "waitsForInCycle": "#D0021B",
                        "accesses": "#B8E986",
                    },
                    "physics": {
                        "enabled": True,
                        "forceStrength": -1000,
                        "centralGravity": 0.01,
                        "springLength": 200,
                        "springConstant": 0.05,
                    },
                },
            )

        except Exception as e:
            logger.error(f"Error creating visualization: {e}")
            return VisualizationData(chart_type="error", data={"error": str(e)}, options={})

    async def recommend(self, analysis: AnalysisResult) -> List[AnalysisRecommendation]:
        """
        Generate recommendations based on the analysis.

        Args:
            analysis: Analysis result

        Returns:
            List of recommendations
        """
        # Return the recommendations already generated during analysis
        return analysis.recommendations

    def _create_basic_analysis(
        self, parsed_data: Dict[str, Any], start_time: datetime
    ) -> AnalysisResult:
        """Create a basic analysis when detailed parsing fails."""
        execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        return AnalysisResult(
            analyzer_type=AnalyzerType.DEADLOCK,
            analyzer_version=self.capabilities.version,
            analysis_id=f"deadlock_basic_{parsed_data.get('event_id', 'unknown')}_{datetime.utcnow().isoformat()}",
            event_id=parsed_data.get("event_id", "unknown"),
            execution_time_ms=execution_time,
            is_detected=True,
            confidence=0.3,  # Low confidence due to limited information
            confidence_level=ConfidenceLevel.LOW,
            business_impact=BusinessImpact.MEDIUM,
            findings=[
                AnalysisFinding(
                    category="deadlock_detected",
                    description="A PostgreSQL deadlock was detected but detailed information could not be extracted",
                    severity=BusinessImpact.MEDIUM,
                    evidence={
                        "message": parsed_data.get("message", "No message available"),
                        "timestamp": parsed_data.get("timestamp", "Unknown"),
                    },
                )
            ],
            recommendations=[
                AnalysisRecommendation(
                    title="Enable Detailed Deadlock Logging",
                    description="Enable log_lock_waits and deadlock_timeout in PostgreSQL to capture more detailed deadlock information",
                    priority=BusinessImpact.HIGH,
                    effort_estimate="30 minutes",
                    code_example="""-- In postgresql.conf:
log_lock_waits = on
deadlock_timeout = 1s
log_min_error_statement = ERROR""",
                ),
                AnalysisRecommendation(
                    title="Review Transaction Patterns",
                    description="Review application code for transactions that access multiple tables and ensure consistent ordering",
                    priority=BusinessImpact.MEDIUM,
                    effort_estimate="2-4 hours",
                ),
            ],
        )

    def _calculate_confidence(self, deadlock_info: Dict[str, Any]) -> float:
        """Calculate confidence score based on available information."""
        score = 0.0
        max_score = 0.0

        # Check for transactions
        transactions = deadlock_info.get("transactions", {})
        if transactions:
            score += 0.2
        max_score += 0.2

        # Check for locks
        locks = deadlock_info.get("locks", [])
        if locks:
            score += 0.2
        max_score += 0.2

        # Check for cycles
        cycles = deadlock_info.get("cycles", [])
        if cycles:
            score += 0.3  # Cycles are most important
        max_score += 0.3

        # Check for queries
        has_queries = any(tx.get("query") for tx in transactions.values())
        if has_queries:
            score += 0.1
        max_score += 0.1

        # Check for visualization data
        if deadlock_info.get("visualization_data"):
            score += 0.1
        max_score += 0.1

        # Check for recommendations
        if deadlock_info.get("recommended_fix"):
            score += 0.1
        max_score += 0.1

        return min(score / max_score, 1.0) if max_score > 0 else 0.0

    def _calculate_business_impact(
        self, deadlock_info: Dict[str, Any], parsed_data: Dict[str, Any]
    ) -> BusinessImpact:
        """Calculate business impact of the deadlock."""
        severity_score = deadlock_info.get("severity_score", 0)

        # Check environment
        environment = parsed_data.get("environment", "").lower()
        is_production = environment in ["production", "prod"]

        # Check for critical tables
        critical_tables = {"users", "accounts", "payments", "orders", "transactions", "billing"}
        all_tables = set()

        for tx in deadlock_info.get("transactions", {}).values():
            all_tables.update(tx.get("tables_accessed", []))

        for cycle in deadlock_info.get("cycles", []):
            all_tables.update(cycle.get("relations", []))

        has_critical_table = any(table.lower() in critical_tables for table in all_tables)

        # Determine impact
        if is_production and (has_critical_table or severity_score > 50):
            return BusinessImpact.CRITICAL
        elif is_production or has_critical_table or severity_score > 30:
            return BusinessImpact.HIGH
        elif severity_score > 15:
            return BusinessImpact.MEDIUM
        else:
            return BusinessImpact.LOW

    def _create_findings(self, deadlock_info: Dict[str, Any]) -> List[AnalysisFinding]:
        """Create findings from the deadlock analysis."""
        findings = []

        # Main deadlock finding
        cycles = deadlock_info.get("cycles", [])
        if cycles:
            cycle = cycles[0]  # Focus on the first (most severe) cycle
            processes = cycle.get("processes", [])
            relations = cycle.get("relations", [])

            findings.append(
                AnalysisFinding(
                    category="deadlock_cycle",
                    description=f"Deadlock cycle detected involving {len(processes)} processes and {len(relations)} tables",
                    severity=BusinessImpact.HIGH,
                    evidence={
                        "processes": processes,
                        "tables": relations,
                        "severity": cycle.get("severity", 0),
                    },
                )
            )

        # Lock conflict findings
        locks = deadlock_info.get("locks", [])
        lock_modes = {}
        for lock in locks:
            mode = lock.get("lock_mode", "Unknown")
            lock_modes[mode] = lock_modes.get(mode, 0) + 1

        if lock_modes:
            findings.append(
                AnalysisFinding(
                    category="lock_conflicts",
                    description=f"Found {len(locks)} locks with various modes",
                    severity=BusinessImpact.MEDIUM,
                    evidence={"lock_counts": lock_modes, "total_locks": len(locks)},
                )
            )

        # Query pattern findings
        transactions = deadlock_info.get("transactions", {})
        query_patterns = {}
        for tx in transactions.values():
            query = tx.get("query", "")
            if query:
                if "UPDATE" in query.upper():
                    query_patterns["UPDATE"] = query_patterns.get("UPDATE", 0) + 1
                elif "INSERT" in query.upper():
                    query_patterns["INSERT"] = query_patterns.get("INSERT", 0) + 1
                elif "DELETE" in query.upper():
                    query_patterns["DELETE"] = query_patterns.get("DELETE", 0) + 1
                elif "SELECT" in query.upper():
                    query_patterns["SELECT"] = query_patterns.get("SELECT", 0) + 1

        if query_patterns:
            findings.append(
                AnalysisFinding(
                    category="query_patterns",
                    description="Identified query patterns involved in deadlock",
                    severity=BusinessImpact.MEDIUM,
                    evidence=query_patterns,
                )
            )

        return findings

    async def _generate_ai_recommendations(
        self, deadlock_info: Dict[str, Any], parsed_data: Dict[str, Any]
    ) -> str:
        """
        Generate AI-powered recommendations using LLM service.

        Args:
            deadlock_info: Parsed deadlock information
            parsed_data: Original parsed event data

        Returns:
            AI-generated recommendations text
        """
        if not self.llm_service:
            return ""

        try:
            # Create a specialized prompt for deadlock recommendations
            prompt = self._create_deadlock_recommendation_prompt(deadlock_info, parsed_data)

            # Use the LLM service to generate recommendations
            # Create a minimal event data structure for the LLM service
            llm_event_data = {
                "id": parsed_data.get("event_id", "unknown"),
                "title": "PostgreSQL Deadlock Analysis",
                "message": prompt,
                "platform": parsed_data.get("platform", "postgresql"),
                "level": "error",
            }

            # Get AI-powered explanation
            ai_recommendations = await self.llm_service.get_explanation(llm_event_data)

            logger.info(
                f"Generated AI recommendations for deadlock (length: {len(ai_recommendations)})"
            )
            return ai_recommendations

        except Exception as e:
            logger.error(f"Failed to generate AI recommendations: {e}")
            return ""

    def _create_deadlock_recommendation_prompt(
        self, deadlock_info: Dict[str, Any], parsed_data: Dict[str, Any]
    ) -> str:
        """Create a prompt for LLM to generate deadlock recommendations."""
        prompt = "You are a PostgreSQL database expert. Analyze this deadlock situation and provide specific, actionable recommendations.\n\n"

        # Add deadlock summary
        transactions = deadlock_info.get("transactions", {})
        locks = deadlock_info.get("locks", [])
        cycles = deadlock_info.get("cycles", [])

        prompt += f"DEADLOCK SUMMARY:\n"
        prompt += f"- Processes involved: {len(transactions)}\n"
        prompt += f"- Locks held: {len(locks)}\n"
        prompt += f"- Deadlock cycles: {len(cycles)}\n"
        prompt += f"- Severity score: {deadlock_info.get('severity_score', 0)}\n\n"

        # Add cycle details
        if cycles:
            prompt += "DEADLOCK CYCLE DETAILS:\n"
            for i, cycle in enumerate(cycles[:3]):  # Limit to first 3 cycles
                prompt += f"Cycle {i+1}:\n"
                processes = cycle.get("processes", [])
                prompt += f"  - Processes: {', '.join(str(p) for p in processes)}\n"
                relations = cycle.get("relations", [])
                if relations:
                    prompt += f"  - Tables involved: {', '.join(relations)}\n"
                prompt += f"  - Severity: {cycle.get('severity', 0)}\n\n"

        # Add transaction details
        if transactions:
            prompt += "TRANSACTION DETAILS:\n"
            for pid, tx in list(transactions.items())[:5]:  # Limit to first 5
                prompt += f"Process {pid}:\n"
                if tx.get("query"):
                    prompt += f"  - Query: {tx['query'][:200]}...\n"
                if tx.get("tables_accessed"):
                    prompt += f"  - Tables: {', '.join(tx['tables_accessed'])}\n"
                if tx.get("lock_mode"):
                    prompt += f"  - Lock mode: {tx['lock_mode']}\n"
                prompt += "\n"

        # Add specific questions for the LLM
        prompt += "Please provide:\n"
        prompt += "1. Root cause analysis of why this deadlock occurred\n"
        prompt += "2. Immediate fixes to resolve current deadlocks\n"
        prompt += "3. Long-term preventive measures\n"
        prompt += "4. Specific code examples or SQL patterns to implement\n"
        prompt += "5. Monitoring recommendations to detect future deadlocks early\n\n"
        prompt += "Focus on practical, implementable solutions. Include specific SQL examples where relevant."

        return prompt

    async def _create_recommendations_with_ai(
        self, deadlock_info: Dict[str, Any], ai_recommendations: str
    ) -> List[AnalysisRecommendation]:
        """
        Create recommendations combining AI-generated and rules-based approaches.

        Args:
            deadlock_info: Parsed deadlock information
            ai_recommendations: AI-generated recommendations text

        Returns:
            List of structured recommendations
        """
        recommendations = []

        # If we have AI recommendations, parse them into structured format
        if ai_recommendations:
            try:
                # Parse AI recommendations into sections
                sections = self._parse_ai_recommendations(ai_recommendations)

                # Create structured recommendations from AI output
                if sections.get("root_cause"):
                    recommendations.append(
                        AnalysisRecommendation(
                            title="Root Cause Analysis",
                            description=sections["root_cause"],
                            priority=BusinessImpact.HIGH,
                            effort_estimate="Immediate review",
                            tags=["ai-generated", "root-cause"],
                        )
                    )

                if sections.get("immediate_fixes"):
                    recommendations.append(
                        AnalysisRecommendation(
                            title="Immediate Resolution Steps",
                            description=sections["immediate_fixes"],
                            priority=BusinessImpact.CRITICAL,
                            effort_estimate="1-2 hours",
                            code_example=sections.get("immediate_code", ""),
                            tags=["ai-generated", "immediate-action"],
                        )
                    )

                if sections.get("preventive_measures"):
                    recommendations.append(
                        AnalysisRecommendation(
                            title="Long-term Prevention Strategy",
                            description=sections["preventive_measures"],
                            priority=BusinessImpact.MEDIUM,
                            effort_estimate="1-2 days",
                            code_example=sections.get("preventive_code", ""),
                            tags=["ai-generated", "prevention"],
                        )
                    )

                if sections.get("monitoring"):
                    recommendations.append(
                        AnalysisRecommendation(
                            title="Monitoring and Detection Setup",
                            description=sections["monitoring"],
                            priority=BusinessImpact.MEDIUM,
                            effort_estimate="2-4 hours",
                            code_example=sections.get("monitoring_code", ""),
                            tags=["ai-generated", "monitoring"],
                        )
                    )

                # If AI recommendations were successfully parsed, return them
                if recommendations:
                    logger.info(f"Generated {len(recommendations)} AI-powered recommendations")
                    return recommendations

            except Exception as e:
                logger.error(f"Failed to parse AI recommendations: {e}")
                # Fall through to rules-based recommendations

        # Fallback to rules-based recommendations
        return self._create_rules_based_recommendations(deadlock_info)

    def _parse_ai_recommendations(self, ai_text: str) -> Dict[str, str]:
        """Parse AI-generated text into structured sections."""
        sections = {}
        current_section = None
        current_content = []

        lines = ai_text.split("\n")

        for line in lines:
            line = line.strip()

            # Detect section headers
            if "root cause" in line.lower() and len(line) < 50:
                if current_section and current_content:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = "root_cause"
                current_content = []
            elif (
                "immediate" in line.lower()
                and ("fix" in line.lower() or "resolution" in line.lower())
                and len(line) < 50
            ):
                if current_section and current_content:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = "immediate_fixes"
                current_content = []
            elif "prevent" in line.lower() and len(line) < 50:
                if current_section and current_content:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = "preventive_measures"
                current_content = []
            elif "monitor" in line.lower() and len(line) < 50:
                if current_section and current_content:
                    sections[current_section] = "\n".join(current_content).strip()
                current_section = "monitoring"
                current_content = []
            elif line.startswith("```"):
                # Code block detection
                if current_section and current_section.endswith("_code"):
                    # End of code block
                    sections[current_section] = "\n".join(current_content).strip()
                    current_section = current_section.replace("_code", "")
                    current_content = []
                else:
                    # Start of code block
                    if current_section and current_content:
                        sections[current_section] = "\n".join(current_content).strip()
                    current_section = f"{current_section}_code" if current_section else "code"
                    current_content = []
            elif current_section:
                current_content.append(line)

        # Save last section
        if current_section and current_content:
            sections[current_section] = "\n".join(current_content).strip()

        return sections

    def _create_rules_based_recommendations(
        self, deadlock_info: Dict[str, Any]
    ) -> List[AnalysisRecommendation]:
        """Create rules-based recommendations (original method renamed)."""
        recommendations = []

        # Get the pre-generated recommendation
        recommended_fix = deadlock_info.get("recommended_fix", "")

        # Parse the recommendation into structured format
        if recommended_fix:
            # Extract key recommendations from the text
            if "Consistent Access Order" in recommended_fix:
                tables = []
                for cycle in deadlock_info.get("cycles", []):
                    tables.extend(cycle.get("relations", []))

                table_order = " → ".join(sorted(set(tables)))

                recommendations.append(
                    AnalysisRecommendation(
                        title="Implement Consistent Table Access Order",
                        description=f"Ensure all transactions access tables in this order: {table_order}",
                        priority=BusinessImpact.HIGH,
                        effort_estimate="2-4 hours",
                        code_example=f"""-- Always access tables in alphabetical order:
BEGIN;
{chr(10).join(f'-- Access {table}' for table in sorted(set(tables)))}
COMMIT;""",
                    )
                )

            if "NOWAIT" in recommended_fix or "lock_timeout" in recommended_fix:
                recommendations.append(
                    AnalysisRecommendation(
                        title="Implement Lock Timeouts",
                        description="Use NOWAIT or set lock_timeout to prevent indefinite blocking",
                        priority=BusinessImpact.MEDIUM,
                        effort_estimate="1-2 hours",
                        code_example="""-- Option 1: Use NOWAIT
SELECT * FROM users WHERE id = 123 FOR UPDATE NOWAIT;

-- Option 2: Set lock timeout
SET lock_timeout = '5s';
SELECT * FROM users WHERE id = 123 FOR UPDATE;""",
                    )
                )

            if "log_lock_waits" in recommended_fix:
                recommendations.append(
                    AnalysisRecommendation(
                        title="Enable Lock Wait Monitoring",
                        description="Enable PostgreSQL lock wait logging to detect potential deadlocks early",
                        priority=BusinessImpact.MEDIUM,
                        effort_estimate="30 minutes",
                        code_example="""-- In postgresql.conf:
log_lock_waits = on
deadlock_timeout = 1s
log_min_duration_statement = 1000  # Log queries taking > 1s""",
                    )
                )

        # Add generic recommendations if none were generated
        if not recommendations:
            recommendations.extend(
                [
                    AnalysisRecommendation(
                        title="Review Transaction Scope",
                        description="Minimize transaction duration and lock scope",
                        priority=BusinessImpact.HIGH,
                        effort_estimate="2-4 hours",
                    ),
                    AnalysisRecommendation(
                        title="Implement Retry Logic",
                        description="Add automatic retry logic for deadlock errors",
                        priority=BusinessImpact.MEDIUM,
                        effort_estimate="1-2 hours",
                        code_example="""import psycopg2
from psycopg2.extensions import TransactionRollbackError
import time

def execute_with_retry(conn, query, max_retries=3):
    for attempt in range(max_retries):
        try:
            with conn.cursor() as cur:
                cur.execute(query)
                conn.commit()
                return
        except TransactionRollbackError as e:
            if 'deadlock detected' in str(e):
                conn.rollback()
                time.sleep(0.1 * (2 ** attempt))  # Exponential backoff
            else:
                raise
    raise Exception("Max retries exceeded")""",
                    ),
                ]
            )

        return recommendations

    def _enhance_visualization_data(self, deadlock_info: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance the visualization data with additional information."""
        viz_data = deadlock_info.get("visualization_data", {})

        # Add summary statistics
        viz_data["summary"] = {
            "totalProcesses": len(deadlock_info.get("transactions", {})),
            "totalLocks": len(deadlock_info.get("locks", [])),
            "totalCycles": len(deadlock_info.get("cycles", [])),
            "severityScore": deadlock_info.get("severity_score", 0),
        }

        # Add tooltips for nodes
        for node in viz_data.get("nodes", []):
            if node.get("type") == "process":
                node["tooltip"] = f"Process {node.get('id', '').split('_')[1]}"
                if node.get("query"):
                    node["tooltip"] += f"\nQuery: {node['query'][:100]}..."
                if node.get("locks_held"):
                    node["tooltip"] += f"\nLocks held: {len(node['locks_held'])}"
                if node.get("locks_waiting"):
                    node["tooltip"] += f"\nLocks waiting: {len(node['locks_waiting'])}"

        return viz_data

    def _get_confidence_factors(self, deadlock_info: Dict[str, Any]) -> Dict[str, bool]:
        """Get factors that contributed to the confidence score."""
        return {
            "has_transactions": bool(deadlock_info.get("transactions")),
            "has_locks": bool(deadlock_info.get("locks")),
            "has_cycles": bool(deadlock_info.get("cycles")),
            "has_queries": any(
                tx.get("query") for tx in deadlock_info.get("transactions", {}).values()
            ),
            "has_visualization": bool(deadlock_info.get("visualization_data")),
            "has_recommendations": bool(deadlock_info.get("recommended_fix")),
        }
