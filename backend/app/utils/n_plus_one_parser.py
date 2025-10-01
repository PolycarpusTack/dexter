"""
N+1 Query Parser - Analyzes database query patterns to detect N+1 query problems.

This module extracts query information from Sentry events to identify and analyze
N+1 query patterns, calculate performance impact, and suggest optimizations.
"""

import re
import time
import logging
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import networkx as nx

from .base_parser import BaseParser

logger = logging.getLogger(__name__)


class QueryInfo(BaseModel):
    """Information about a single query involved in an N+1 pattern."""

    query_id: str
    sql: str
    execution_time: float  # in milliseconds
    execution_count: int
    table: str
    query_type: str  # SELECT, INSERT, UPDATE, DELETE
    timestamp: float
    parent_query_id: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class QueryPattern(BaseModel):
    """Represents a pattern of related queries forming an N+1 problem."""

    parent_query: QueryInfo
    child_queries: List[QueryInfo]
    total_execution_time: float
    optimized_execution_time: float  # estimated time if optimized
    savings_percentage: float


class N1QueryInfo(BaseModel):
    """Complete analysis of N+1 query patterns."""

    raw_message: str
    queries: List[QueryInfo]
    patterns: List[QueryPattern]
    visualization_data: Dict[str, Any]
    recommended_fix: str


class N1QueryParser(BaseParser):
    """Parser for N+1 query patterns."""

    def parse(self, event_data: Dict[str, Any]) -> Optional[N1QueryInfo]:
        """
        Parse N+1 query information from Sentry event data.

        Args:
            event_data: The Sentry event containing performance data

        Returns:
            N1QueryInfo object or None if no N+1 issues are detected
        """
        try:
            # Extract query data from spans using base parser method
            spans = self.extract_spans_from_event(event_data)
            if not spans:
                logger.info("No spans found in event data")
                return None

            # Extract queries from spans
            queries = self._extract_queries_from_spans(spans)
            if len(queries) < 2:
                logger.info("Not enough queries found to detect N+1 pattern")
                return None

            # Build query relationship graph
            edges = [
                (q.query_id, q.parent_query_id)
                for q in queries
                if q.parent_query_id is not None
            ]
            graph = self.build_directed_graph([q.query_id for q in queries], edges)

            # Detect N+1 patterns
            patterns = self._detect_n1_patterns(graph, queries)
            if not patterns:
                logger.info("No N+1 patterns detected")
                return None

            # Prepare visualization data using base parser method
            node_labels = {q.query_id: f"Q{idx+1}" for idx, q in enumerate(queries)}
            node_metadata = {
                q.query_id: {
                    "sql": q.sql[:50] + "..." if len(q.sql) > 50 else q.sql,
                    "execution_time": q.execution_time,
                    "execution_count": q.execution_count,
                }
                for q in queries
            }
            visualization_data = self.prepare_graph_visualization_data(
                graph, node_labels, node_metadata
            )

            # Generate optimization recommendations
            recommended_fix = self._generate_recommendations(patterns)

            # Create the final N+1 query info object
            return N1QueryInfo(
                raw_message=self.extract_message(event_data),
                queries=queries,
                patterns=patterns,
                visualization_data=visualization_data,
                recommended_fix=recommended_fix,
            )
        except Exception as e:
            logger.exception(f"Error parsing N+1 query: {str(e)}")
            return None

    def _extract_queries_from_spans(self, spans: List[Dict[str, Any]]) -> List[QueryInfo]:
        """Extract query information from performance spans."""
        queries = []
        query_id_counter = 0

        for span in spans:
            op = span.get("op", "")
            if "db" not in op.lower():
                continue

            description = span.get("description", "")
            if not description:
                continue

            query_id_counter += 1
            query_id = f"q{query_id_counter}"

            # Extract SQL and table name using base parser method
            sql = description
            table = self.extract_tables_from_sql(sql)[0] if self.extract_tables_from_sql(sql) else "unknown"

            # Determine query type
            query_type = "SELECT"
            sql_upper = sql.upper()
            for qtype in ["INSERT", "UPDATE", "DELETE", "SELECT"]:
                if qtype in sql_upper:
                    query_type = qtype
                    break

            query_info = QueryInfo(
                query_id=query_id,
                sql=sql,
                execution_time=span.get("duration", 0) * 1000,  # Convert to ms
                execution_count=1,
                table=table,
                query_type=query_type,
                timestamp=span.get("start_timestamp", time.time()),
                parent_query_id=span.get("parent_span_id"),
            )
            queries.append(query_info)

        return queries

    def _detect_n1_patterns(
        self, graph: nx.DiGraph, queries: List[QueryInfo]
    ) -> List[QueryPattern]:
        """Detect N+1 query patterns in the query graph."""
        patterns = []
        query_dict = {q.query_id: q for q in queries}

        # Look for parent queries with multiple similar child queries
        for node in graph.nodes():
            if node not in query_dict:
                continue

            parent_query = query_dict[node]
            children = list(graph.successors(node))

            if len(children) < 3:  # Need at least 3 children to consider it N+1
                continue

            # Group children by normalized SQL
            child_queries = [query_dict[c] for c in children if c in query_dict]
            normalized_groups = {}

            for child in child_queries:
                normalized_sql = self.normalize_query(child.sql)
                if normalized_sql not in normalized_groups:
                    normalized_groups[normalized_sql] = []
                normalized_groups[normalized_sql].append(child)

            # Check if any group has enough similar queries
            for normalized_sql, group in normalized_groups.items():
                if len(group) >= 3:
                    total_time = sum(q.execution_time for q in group)
                    optimized_time = max(q.execution_time for q in group) * 1.5

                    pattern = QueryPattern(
                        parent_query=parent_query,
                        child_queries=group,
                        total_execution_time=total_time,
                        optimized_execution_time=optimized_time,
                        savings_percentage=self.calculate_percentage_savings(
                            total_time, optimized_time
                        ),
                    )
                    patterns.append(pattern)

        return patterns

    def _generate_recommendations(self, patterns: List[QueryPattern]) -> str:
        """Generate optimization recommendations for N+1 patterns."""
        if not patterns:
            return "No N+1 query patterns detected"

        recommendations = []
        recommendations.append(f"N+1 Query Patterns Detected: {len(patterns)}\n")

        for idx, pattern in enumerate(patterns, 1):
            recommendations.append(f"\nPattern {idx}:")
            recommendations.append(f"  Parent query: {pattern.parent_query.sql[:80]}...")
            recommendations.append(f"  Repeated queries: {len(pattern.child_queries)}")
            recommendations.append(
                f"  Total time: {pattern.total_execution_time:.2f}ms"
            )
            recommendations.append(
                f"  Estimated savings: {pattern.savings_percentage:.1f}%"
            )

        recommendations.append("\nRecommendations:")
        recommendations.append("1. Use eager loading (JOIN or SELECT IN)")
        recommendations.append("2. Batch similar queries together")
        recommendations.append("3. Use DataLoader or similar batching pattern")
        recommendations.append("4. Consider caching frequently accessed data")

        return "\n".join(recommendations)


# Public API function for backward compatibility
def parse_n_plus_one_query(event_data: Dict[str, Any]) -> Optional[N1QueryInfo]:
    """
    Parse N+1 query information from Sentry event data.

    Args:
        event_data: The Sentry event containing performance data

    Returns:
        N1QueryInfo object or None if no N+1 issues are detected
    """
    parser = N1QueryParser()
    return parser.parse(event_data)

