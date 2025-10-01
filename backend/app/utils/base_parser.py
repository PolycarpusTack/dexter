"""
Base Parser - Common utilities for all event parsers.

This module provides shared functionality for parsing Sentry events,
extracting stack traces, building graphs, and preparing visualization data.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from abc import ABC, abstractmethod
import networkx as nx

logger = logging.getLogger(__name__)


class BaseParser(ABC):
    """
    Abstract base class for all event parsers.

    Provides common extraction and analysis methods that can be shared
    across deadlock, promise rejection, N+1 query, and memory leak parsers.
    """

    @abstractmethod
    def parse(self, event_data: Dict[str, Any]) -> Optional[Any]:
        """
        Parse event data and return analysis result.

        Args:
            event_data: Raw Sentry event data

        Returns:
            Parsed analysis result or None if not applicable
        """
        pass

    # =====================================================================
    # COMMON EVENT EXTRACTION METHODS
    # =====================================================================

    def extract_message(self, event_data: Dict[str, Any]) -> str:
        """
        Extract error message from event data.

        Checks multiple possible locations for the error message.
        """
        # Try direct message field
        if "message" in event_data:
            return event_data["message"]

        # Try exception values
        exception_values = event_data.get("exception", {}).get("values", [])
        if exception_values:
            return exception_values[0].get("value", "")

        # Try title
        if "title" in event_data:
            return event_data["title"]

        return ""

    def extract_error_type(self, event_data: Dict[str, Any]) -> Optional[str]:
        """Extract error type from exception data."""
        exception_values = event_data.get("exception", {}).get("values", [])
        if exception_values:
            return exception_values[0].get("type")
        return None

    def extract_stack_frames(self, event_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract stack trace frames from event data.

        Returns:
            List of stack frame dictionaries
        """
        exception_values = event_data.get("exception", {}).get("values", [])
        if not exception_values:
            return []

        main_exception = exception_values[0]
        stacktrace = main_exception.get("stacktrace", {})
        return stacktrace.get("frames", [])

    def extract_code_location(
        self, frames: List[Dict[str, Any]]
    ) -> Tuple[Optional[str], Optional[int], Optional[int]]:
        """
        Extract file path, line number, and column number from stack frames.

        Returns:
            Tuple of (file_path, line_number, column_number)
        """
        if not frames:
            return None, None, None

        # Get the last frame (where the error occurred)
        last_frame = frames[-1]

        file_path = last_frame.get("filename") or last_frame.get("abs_path")
        line_number = last_frame.get("lineno")
        column_number = last_frame.get("colno")

        return file_path, line_number, column_number

    def extract_function_name(self, frames: List[Dict[str, Any]]) -> Optional[str]:
        """Extract function name from the last stack frame."""
        if not frames:
            return None

        last_frame = frames[-1]
        return last_frame.get("function")

    def extract_spans_from_event(self, event_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract performance spans from event data.

        Returns:
            List of span dictionaries containing timing and operation data
        """
        # Check for spans in contexts
        contexts = event_data.get("contexts", {})
        trace_context = contexts.get("trace", {})
        spans = trace_context.get("spans", [])

        if spans:
            return spans

        # Check for spans in top-level data
        if "spans" in event_data:
            return event_data["spans"]

        # Check for spans in measurements
        measurements = event_data.get("measurements", {})
        if "spans" in measurements:
            return measurements["spans"]

        return []

    # =====================================================================
    # COMMON PATTERN DETECTION METHODS
    # =====================================================================

    def extract_tables_from_sql(self, sql: str) -> List[str]:
        """
        Extract table names from SQL query.

        Args:
            sql: SQL query string

        Returns:
            List of table names found in the query
        """
        tables = []

        # Remove comments
        sql = re.sub(r'--.*$', '', sql, flags=re.MULTILINE)
        sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)

        # Match FROM clauses
        from_pattern = r'\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)'
        tables.extend(re.findall(from_pattern, sql, re.IGNORECASE))

        # Match JOIN clauses
        join_pattern = r'\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)'
        tables.extend(re.findall(join_pattern, sql, re.IGNORECASE))

        # Match UPDATE clauses
        update_pattern = r'\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)'
        tables.extend(re.findall(update_pattern, sql, re.IGNORECASE))

        # Match INSERT INTO clauses
        insert_pattern = r'\bINSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)'
        tables.extend(re.findall(insert_pattern, sql, re.IGNORECASE))

        # Return unique table names
        return list(set(tables))

    def detect_framework(
        self, event_data: Dict[str, Any], frames: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        Detect which frontend/backend framework is being used.

        Returns:
            Framework name like 'react', 'vue', 'angular', 'express', etc.
        """
        # Check SDK name
        sdk = event_data.get("sdk", {})
        sdk_name = sdk.get("name", "").lower()

        if "react" in sdk_name:
            return "react"
        elif "vue" in sdk_name:
            return "vue"
        elif "angular" in sdk_name:
            return "angular"

        # Check stack frames for framework-specific patterns
        frame_files = [f.get("filename", "") for f in frames if f.get("filename")]
        frame_text = " ".join(frame_files).lower()

        if "react" in frame_text or "jsx" in frame_text:
            return "react"
        elif "vue" in frame_text:
            return "vue"
        elif "angular" in frame_text:
            return "angular"
        elif "express" in frame_text:
            return "express"
        elif "django" in frame_text:
            return "django"
        elif "flask" in frame_text:
            return "flask"

        return None

    # =====================================================================
    # GRAPH BUILDING METHODS
    # =====================================================================

    def build_directed_graph(
        self, nodes: List[Any], edges: List[Tuple[Any, Any]]
    ) -> nx.DiGraph:
        """
        Build a directed graph from nodes and edges.

        Args:
            nodes: List of node identifiers
            edges: List of (source, target) tuples

        Returns:
            NetworkX directed graph
        """
        graph = nx.DiGraph()

        for node in nodes:
            graph.add_node(node)

        for source, target in edges:
            graph.add_edge(source, target)

        return graph

    def find_cycles(self, graph: nx.DiGraph) -> List[List[Any]]:
        """
        Find all cycles in a directed graph.

        Returns:
            List of cycles, where each cycle is a list of nodes
        """
        try:
            cycles = list(nx.simple_cycles(graph))
            return cycles
        except Exception as e:
            logger.warning(f"Error finding cycles: {e}")
            return []

    # =====================================================================
    # VISUALIZATION HELPERS
    # =====================================================================

    def prepare_graph_visualization_data(
        self,
        graph: nx.DiGraph,
        node_labels: Optional[Dict[Any, str]] = None,
        node_metadata: Optional[Dict[Any, Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Prepare graph data for frontend visualization.

        Args:
            graph: NetworkX directed graph
            node_labels: Optional mapping of node IDs to display labels
            node_metadata: Optional metadata for each node

        Returns:
            Dictionary with nodes, edges, and layout information
        """
        nodes = []
        edges = []

        # Extract nodes
        for node in graph.nodes():
            node_data = {
                "id": str(node),
                "label": node_labels.get(node, str(node)) if node_labels else str(node),
            }

            # Add metadata if provided
            if node_metadata and node in node_metadata:
                node_data.update(node_metadata[node])

            nodes.append(node_data)

        # Extract edges
        for source, target in graph.edges():
            edge_data = {
                "source": str(source),
                "target": str(target),
            }
            edges.append(edge_data)

        return {
            "nodes": nodes,
            "edges": edges,
            "cyclic": not nx.is_directed_acyclic_graph(graph),
        }

    # =====================================================================
    # UTILITY METHODS
    # =====================================================================

    def normalize_query(self, sql: str) -> str:
        """
        Normalize a SQL query for comparison.

        Removes comments, extra whitespace, and standardizes formatting.
        """
        # Remove comments
        sql = re.sub(r'--.*$', '', sql, flags=re.MULTILINE)
        sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)

        # Normalize whitespace
        sql = re.sub(r'\s+', ' ', sql)
        sql = sql.strip()

        # Convert to uppercase for comparison
        return sql.upper()

    def calculate_percentage_savings(
        self, original_time: float, optimized_time: float
    ) -> float:
        """Calculate percentage savings from optimization."""
        if original_time == 0:
            return 0.0

        savings = ((original_time - optimized_time) / original_time) * 100
        return max(0.0, min(100.0, savings))  # Clamp between 0 and 100
