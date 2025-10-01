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


def parse_n_plus_one_query(event_data: Dict[str, Any]) -> Optional[N1QueryInfo]:
    """
    Parse N+1 query information from Sentry event data.

    Args:
        event_data: The Sentry event containing performance data

    Returns:
        N1QueryInfo object or None if no N+1 issues are detected
    """
    try:
        # Extract query data from spans
        spans = _extract_spans_from_event(event_data)
        if not spans:
            logger.info("No spans found in event data")
            return None

        # Extract queries from spans
        queries = _extract_queries_from_spans(spans)
        if len(queries) < 2:
            logger.info("Not enough queries found to detect N+1 pattern")
            return None

        # Build query relationship graph
        graph = _build_query_relationship_graph(queries)

        # Detect N+1 patterns
        patterns = _detect_n1_patterns(graph, queries)
        if not patterns:
            logger.info("No N+1 patterns detected")
            return None

        # Prepare visualization data
        visualization_data = _prepare_visualization_data(queries, patterns, graph)

        # Generate optimization recommendations
        recommended_fix = _generate_recommendations(patterns)

        # Create the final N+1 query info object
        return N1QueryInfo(
            raw_message=event_data.get("message", ""),
            queries=queries,
            patterns=patterns,
            visualization_data=visualization_data,
            recommended_fix=recommended_fix,
        )
    except Exception as e:
        logger.exception(f"Error parsing N+1 query: {str(e)}")
        return None


def _extract_spans_from_event(event_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract performance spans from Sentry event data."""
    spans = []

    # Check transactions data
    transactions = event_data.get("transactions", [])
    for transaction in transactions:
        spans.extend(transaction.get("spans", []))

    # Check performance data
    performance = event_data.get("performance", {})
    if performance:
        spans.extend(performance.get("spans", []))

    # Check spans directly
    spans.extend(event_data.get("spans", []))

    return spans


def _extract_queries_from_spans(spans: List[Dict[str, Any]]) -> List[QueryInfo]:
    """Extract database queries from performance spans."""
    queries = []
    query_id_counter = 0

    for span in spans:
        # Check if it's a database span
        span_type = span.get("span_type", span.get("type", ""))
        if "db" not in span_type.lower() and "sql" not in span_type.lower():
            continue

        # Extract the SQL query
        sql = span.get("sql", span.get("description", ""))
        if not sql:
            continue

        # Parse execution time
        execution_time = span.get("duration", 0)
        if isinstance(execution_time, str):
            execution_time = float(execution_time.rstrip("ms"))

        # Extract timestamp
        timestamp = span.get("timestamp", span.get("start_timestamp", time.time()))

        # Determine query type
        query_type = _determine_query_type(sql)

        # Extract tables
        tables = _extract_tables_from_sql(sql)
        if not tables:
            continue

        # Create query info for each table
        for table in tables:
            query_id_counter += 1
            queries.append(
                QueryInfo(
                    query_id=f"q{query_id_counter}",
                    sql=sql,
                    execution_time=execution_time,
                    execution_count=1,  # Initial count
                    table=table,
                    query_type=query_type,
                    timestamp=timestamp,
                    parameters=span.get("data", {}).get("parameters", {}),
                )
            )

    # Group similar queries and update execution counts
    return _consolidate_similar_queries(queries)


def _determine_query_type(sql: str) -> str:
    """Determine the type of SQL query."""
    sql = sql.strip().upper()

    if sql.startswith("SELECT"):
        return "SELECT"
    elif sql.startswith("INSERT"):
        return "INSERT"
    elif sql.startswith("UPDATE"):
        return "UPDATE"
    elif sql.startswith("DELETE"):
        return "DELETE"
    elif "SELECT" in sql:
        return "SELECT"
    else:
        return "UNKNOWN"


def _extract_tables_from_sql(sql: str) -> List[str]:
    """Extract table names from an SQL query."""
    tables = set()

    # Normalize query
    sql = re.sub(r"\s+", " ", sql).strip()

    # Extract tables from various SQL clauses
    patterns = [
        r'FROM\s+([a-zA-Z0-9_"\.]+)',
        r'JOIN\s+([a-zA-Z0-9_"\.]+)',
        r'UPDATE\s+([a-zA-Z0-9_"\.]+)',
        r'INSERT\s+INTO\s+([a-zA-Z0-9_"\.]+)',
        r'DELETE\s+FROM\s+([a-zA-Z0-9_"\.]+)',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, sql, re.IGNORECASE):
            table = match.group(1).strip()

            # Handle schema.table format
            if "." in table:
                schema, table_name = table.split(".", 1)
                tables.add(table_name.strip('"'))
            else:
                tables.add(table.strip('"'))

    return list(tables)


def _consolidate_similar_queries(queries: List[QueryInfo]) -> List[QueryInfo]:
    """Group similar queries and update execution counts."""
    query_groups = {}

    for query in queries:
        # Create a key based on query structure (normalize parameters)
        normalized_sql = re.sub(r"\b\d+\b", "?", query.sql)
        normalized_sql = re.sub(r"'[^']*'", "'?'", normalized_sql)
        key = (normalized_sql, query.table, query.query_type)

        if key in query_groups:
            query_groups[key].execution_count += 1
        else:
            query_groups[key] = query

    return list(query_groups.values())


def _build_query_relationship_graph(queries: List[QueryInfo]) -> nx.DiGraph:
    """Build a directed graph representing query relationships."""
    graph = nx.DiGraph()

    # Add all queries as nodes
    for query in queries:
        graph.add_node(query.query_id, query=query)

    # Sort queries by timestamp
    sorted_queries = sorted(queries, key=lambda q: q.timestamp)

    # Identify potential parent-child relationships
    for i, parent in enumerate(sorted_queries):
        # Look at subsequent queries within a time window (50ms)
        time_window = 50  # milliseconds
        for child in sorted_queries[i + 1 :]:
            time_diff = (child.timestamp - parent.timestamp) * 1000  # convert to ms

            if time_diff > time_window:
                break

            # Check if it's a potential N+1 relationship
            if (
                parent.query_type == "SELECT"
                and child.query_type == "SELECT"
                and parent.table != child.table
            ):
                # Look for parameters from parent that might appear in child
                child_sql_lower = child.sql.lower()

                # Check if there's a WHERE clause with potential reference
                if "where" in child_sql_lower and parent.table.lower() in child_sql_lower:
                    graph.add_edge(parent.query_id, child.query_id, weight=1)
                    child.parent_query_id = parent.query_id

    return graph


def _detect_n1_patterns(graph: nx.DiGraph, queries: List[QueryInfo]) -> List[QueryPattern]:
    """Detect N+1 query patterns in the query graph."""
    patterns = []

    # Find nodes with multiple outgoing edges
    for node in graph.nodes():
        successors = list(graph.successors(node))
        if len(successors) > 1:
            # This could be a parent query in an N+1 pattern
            parent_query = None
            child_queries = []

            # Find the corresponding query objects
            for query in queries:
                if query.query_id == node:
                    parent_query = query
                elif query.query_id in successors:
                    child_queries.append(query)

            if parent_query and len(child_queries) > 1:
                # Calculate performance metrics
                total_time = parent_query.execution_time + sum(
                    q.execution_time for q in child_queries
                )
                # Estimate time if optimized (single query instead of N+1)
                optimized_time = parent_query.execution_time * 1.5  # Assume 50% overhead for joins
                savings_percentage = ((total_time - optimized_time) / total_time) * 100

                patterns.append(
                    QueryPattern(
                        parent_query=parent_query,
                        child_queries=child_queries,
                        total_execution_time=total_time,
                        optimized_execution_time=optimized_time,
                        savings_percentage=savings_percentage,
                    )
                )

    # Sort patterns by potential savings
    return sorted(patterns, key=lambda p: p.savings_percentage, reverse=True)


def _prepare_visualization_data(
    queries: List[QueryInfo], patterns: List[QueryPattern], graph: nx.DiGraph
) -> Dict[str, Any]:
    """Prepare data for frontend visualization."""
    nodes = []
    edges = []

    # Create nodes for queries
    for query in queries:
        is_parent = any(p.parent_query.query_id == query.query_id for p in patterns)
        is_child = any(query in p.child_queries for p in patterns)

        nodes.append(
            {
                "id": query.query_id,
                "label": f"{query.query_type}: {query.table}",
                "type": "query",
                "sql": query.sql[:100] + "..." if len(query.sql) > 100 else query.sql,
                "table": query.table,
                "query_type": query.query_type,
                "execution_time": query.execution_time,
                "execution_count": query.execution_count,
                "is_parent": is_parent,
                "is_child": is_child,
            }
        )

    # Create nodes for tables
    tables = set(q.table for q in queries)
    for table in tables:
        nodes.append(
            {
                "id": f"table_{table}",
                "label": table,
                "type": "table",
            }
        )

    # Create edges for query relationships
    for u, v, data in graph.edges(data=True):
        edges.append(
            {"source": u, "target": v, "label": "triggers", "weight": data.get("weight", 1)}
        )

    # Create edges for table relationships
    for query in queries:
        edges.append(
            {"source": query.query_id, "target": f"table_{query.table}", "label": "accesses"}
        )

    # Create pattern data
    pattern_data = []
    for i, pattern in enumerate(patterns):
        pattern_data.append(
            {
                "id": f"pattern_{i+1}",
                "parent_query": pattern.parent_query.query_id,
                "child_queries": [q.query_id for q in pattern.child_queries],
                "total_time": pattern.total_execution_time,
                "optimized_time": pattern.optimized_execution_time,
                "savings_percentage": pattern.savings_percentage,
                "child_count": len(pattern.child_queries),
            }
        )

    return {"nodes": nodes, "edges": edges, "patterns": pattern_data}


def _generate_recommendations(patterns: List[QueryPattern]) -> str:
    """Generate optimization recommendations for the N+1 patterns."""
    if not patterns:
        return "No N+1 query patterns detected."

    # Focus on the pattern with the highest potential savings
    primary_pattern = patterns[0]
    parent_query = primary_pattern.parent_query
    child_queries = primary_pattern.child_queries

    # Get the first few child queries for examples
    example_children = child_queries[:2]
    example_child = example_children[0] if example_children else None

    # Build a comprehensive recommendation
    recommendation = f"""


## N+1 Query Pattern Detected

### Overview
We have detected an N+1 query pattern where a parent query to `{parent_query.table}` is followed by {len(child_queries)} separate queries to `{example_child.table if example_child else 'related tables'}`. This pattern is inefficient and can be optimized.

### Performance Impact
- Total execution time: {primary_pattern.total_execution_time:.2f}ms
- Estimated time if optimized: {primary_pattern.optimized_execution_time:.2f}ms
- Potential performance improvement: {primary_pattern.savings_percentage:.1f}%

### Root Cause
The application is loading related data with separate queries for each record instead of using a more efficient approach. For each result from the parent query,
    a separate query is executed to fetch related data.

### Parent Query
```sql
{parent_query.sql}
```

### Example Child Query
```sql
{example_child.sql if example_child else 'No example available'}
```

### Recommended Solutions

1. **Use JOIN clause**: Modify the parent query to include a JOIN with the related table(s).
   ```sql
   SELECT parent.*, child.*
   FROM {parent_query.table} parent
   JOIN {example_child.table if example_child else 'related_table'} child ON parent.id = child.parent_id
   ```

2. **Use EXISTS or IN with subquery**: If you only need to filter based on the existence of related records.
   ```sql
   SELECT *
   FROM {parent_query.table}
   WHERE id IN (SELECT parent_id FROM {example_child.table if example_child else 'related_table'} WHERE ...)
   ```

3. **Batch loading**: If using an ORM, ensure eager loading or preloading is configured.
   ```python
   # Django example
   queryset = Parent.objects.prefetch_related('children')

   # SQLAlchemy example
   query = session.query(Parent).options(joinedload(Parent.children))
   ```

4. **Caching strategy**: For frequently accessed relationships, consider caching.

5. **Database indexes**: Ensure proper indexes are in place on the join columns.

### Implementation Considerations

- Consider the cardinality of the relationship (one-to-one, one-to-many, many-to-many)
- Be mindful of memory usage when retrieving large datasets
- Monitor query performance after changes

By implementing these recommendations, you can significantly reduce database load and improve application performance.
"""

    return recommendation
