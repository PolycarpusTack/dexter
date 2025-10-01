"""
Tests for BaseParser - Common parser utilities.

This module tests all shared functionality in the BaseParser abstract class,
including event extraction, stack frame analysis, SQL parsing, graph building,
and visualization data preparation.
"""

import pytest
import networkx as nx
from typing import Dict, Any

from app.utils.base_parser import BaseParser


# Concrete implementation for testing
class TestableParser(BaseParser):
    """Concrete implementation of BaseParser for testing."""

    def parse(self, event_data: Dict[str, Any]):
        """Simple parse implementation for testing."""
        return {"parsed": True, "message": self.extract_message(event_data)}


class TestBaseParserMessageExtraction:
    """Test message extraction methods."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_extract_message_from_message_field(self):
        """Test extracting message from direct message field."""
        event_data = {"message": "Test error message"}
        result = self.parser.extract_message(event_data)
        assert result == "Test error message"

    def test_extract_message_from_exception_values(self):
        """Test extracting message from exception values."""
        event_data = {
            "exception": {"values": [{"value": "Exception message", "type": "Error"}]}
        }
        result = self.parser.extract_message(event_data)
        assert result == "Exception message"

    def test_extract_message_from_title(self):
        """Test extracting message from title field."""
        event_data = {"title": "Error title"}
        result = self.parser.extract_message(event_data)
        assert result == "Error title"

    def test_extract_message_empty_when_no_message(self):
        """Test that empty string is returned when no message found."""
        event_data = {}
        result = self.parser.extract_message(event_data)
        assert result == ""

    def test_extract_message_priority_order(self):
        """Test that message field takes priority over others."""
        event_data = {
            "message": "Direct message",
            "title": "Title",
            "exception": {"values": [{"value": "Exception"}]},
        }
        result = self.parser.extract_message(event_data)
        assert result == "Direct message"


class TestBaseParserErrorTypeExtraction:
    """Test error type extraction."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_extract_error_type_success(self):
        """Test extracting error type from exception."""
        event_data = {
            "exception": {"values": [{"type": "TypeError", "value": "Invalid type"}]}
        }
        result = self.parser.extract_error_type(event_data)
        assert result == "TypeError"

    def test_extract_error_type_none_when_no_exception(self):
        """Test that None is returned when no exception."""
        event_data = {}
        result = self.parser.extract_error_type(event_data)
        assert result is None

    def test_extract_error_type_none_when_empty_values(self):
        """Test that None is returned when exception values are empty."""
        event_data = {"exception": {"values": []}}
        result = self.parser.extract_error_type(event_data)
        assert result is None


class TestBaseParserStackFrameExtraction:
    """Test stack frame extraction methods."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_extract_stack_frames_success(self):
        """Test extracting stack frames from event."""
        event_data = {
            "exception": {
                "values": [
                    {
                        "stacktrace": {
                            "frames": [
                                {"filename": "file1.py", "lineno": 10, "function": "func1"},
                                {"filename": "file2.py", "lineno": 20, "function": "func2"},
                            ]
                        }
                    }
                ]
            }
        }
        frames = self.parser.extract_stack_frames(event_data)
        assert len(frames) == 2
        assert frames[0]["filename"] == "file1.py"
        assert frames[1]["lineno"] == 20

    def test_extract_stack_frames_empty_when_no_exception(self):
        """Test that empty list is returned when no exception."""
        event_data = {}
        frames = self.parser.extract_stack_frames(event_data)
        assert frames == []

    def test_extract_stack_frames_empty_when_no_stacktrace(self):
        """Test that empty list is returned when no stacktrace."""
        event_data = {"exception": {"values": [{}]}}
        frames = self.parser.extract_stack_frames(event_data)
        assert frames == []


class TestBaseParserCodeLocation:
    """Test code location extraction."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_extract_code_location_success(self):
        """Test extracting file path, line, and column from frames."""
        frames = [
            {"filename": "file1.py", "lineno": 10, "colno": 5},
            {"filename": "file2.py", "lineno": 20, "colno": 15},
        ]
        file_path, line_number, column_number = self.parser.extract_code_location(frames)
        assert file_path == "file2.py"
        assert line_number == 20
        assert column_number == 15

    def test_extract_code_location_uses_abs_path_fallback(self):
        """Test that abs_path is used when filename is not present."""
        frames = [{"abs_path": "/absolute/path/file.py", "lineno": 10}]
        file_path, line_number, column_number = self.parser.extract_code_location(frames)
        assert file_path == "/absolute/path/file.py"

    def test_extract_code_location_none_when_empty_frames(self):
        """Test that None values are returned when frames are empty."""
        frames = []
        file_path, line_number, column_number = self.parser.extract_code_location(frames)
        assert file_path is None
        assert line_number is None
        assert column_number is None


class TestBaseParserFunctionName:
    """Test function name extraction."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_extract_function_name_success(self):
        """Test extracting function name from last frame."""
        frames = [
            {"function": "outer_function"},
            {"function": "inner_function"},
        ]
        result = self.parser.extract_function_name(frames)
        assert result == "inner_function"

    def test_extract_function_name_none_when_empty_frames(self):
        """Test that None is returned when frames are empty."""
        frames = []
        result = self.parser.extract_function_name(frames)
        assert result is None


class TestBaseParserSpansExtraction:
    """Test performance spans extraction."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_extract_spans_from_trace_context(self):
        """Test extracting spans from trace context."""
        event_data = {
            "contexts": {
                "trace": {"spans": [{"op": "db.query", "duration": 100}]}
            }
        }
        spans = self.parser.extract_spans_from_event(event_data)
        assert len(spans) == 1
        assert spans[0]["op"] == "db.query"

    def test_extract_spans_from_top_level(self):
        """Test extracting spans from top-level spans field."""
        event_data = {"spans": [{"op": "http.client", "duration": 200}]}
        spans = self.parser.extract_spans_from_event(event_data)
        assert len(spans) == 1
        assert spans[0]["op"] == "http.client"

    def test_extract_spans_empty_when_no_spans(self):
        """Test that empty list is returned when no spans."""
        event_data = {}
        spans = self.parser.extract_spans_from_event(event_data)
        assert spans == []


class TestBaseParserSQLTableExtraction:
    """Test SQL table name extraction."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_extract_tables_from_simple_select(self):
        """Test extracting table from simple SELECT."""
        sql = "SELECT * FROM users"
        tables = self.parser.extract_tables_from_sql(sql)
        assert "users" in tables

    def test_extract_tables_from_join(self):
        """Test extracting tables from JOIN query."""
        sql = "SELECT * FROM users JOIN orders ON users.id = orders.user_id"
        tables = self.parser.extract_tables_from_sql(sql)
        assert "users" in tables
        assert "orders" in tables

    def test_extract_tables_from_schema_qualified(self):
        """Test extracting schema-qualified table names."""
        sql = "SELECT * FROM public.users"
        tables = self.parser.extract_tables_from_sql(sql)
        assert "public.users" in tables

    def test_extract_tables_ignores_sql_comments(self):
        """Test that SQL comments are ignored."""
        sql = """
        -- This is a comment
        SELECT * FROM users
        /* Multi-line
           comment */
        """
        tables = self.parser.extract_tables_from_sql(sql)
        assert "users" in tables
        assert "comment" not in tables

    def test_extract_tables_case_insensitive(self):
        """Test that extraction is case-insensitive."""
        sql = "select * from USERS join orders on users.id = orders.user_id"
        tables = self.parser.extract_tables_from_sql(sql)
        assert "USERS" in tables
        assert "orders" in tables


class TestBaseParserGraphBuilding:
    """Test graph building methods."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_build_directed_graph_simple(self):
        """Test building simple directed graph."""
        nodes = ["A", "B", "C"]
        edges = [("A", "B"), ("B", "C")]
        graph = self.parser.build_directed_graph(nodes, edges)

        assert isinstance(graph, nx.DiGraph)
        assert len(graph.nodes()) == 3
        assert len(graph.edges()) == 2
        assert graph.has_edge("A", "B")
        assert graph.has_edge("B", "C")

    def test_build_directed_graph_with_isolated_nodes(self):
        """Test building graph with isolated nodes."""
        nodes = ["A", "B", "C", "D"]
        edges = [("A", "B")]
        graph = self.parser.build_directed_graph(nodes, edges)

        assert len(graph.nodes()) == 4
        assert len(graph.edges()) == 1
        assert "D" in graph.nodes()  # Isolated node present

    def test_build_directed_graph_empty(self):
        """Test building empty graph."""
        nodes = []
        edges = []
        graph = self.parser.build_directed_graph(nodes, edges)

        assert len(graph.nodes()) == 0
        assert len(graph.edges()) == 0


class TestBaseParserCycleDetection:
    """Test cycle detection in graphs."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_find_cycles_simple_cycle(self):
        """Test finding simple cycle."""
        nodes = ["A", "B", "C"]
        edges = [("A", "B"), ("B", "C"), ("C", "A")]
        graph = self.parser.build_directed_graph(nodes, edges)

        cycles = self.parser.find_cycles(graph)
        assert len(cycles) > 0
        assert set(cycles[0]) == {"A", "B", "C"}

    def test_find_cycles_no_cycles(self):
        """Test finding cycles in acyclic graph."""
        nodes = ["A", "B", "C"]
        edges = [("A", "B"), ("B", "C")]
        graph = self.parser.build_directed_graph(nodes, edges)

        cycles = self.parser.find_cycles(graph)
        assert len(cycles) == 0

    def test_find_cycles_self_loop(self):
        """Test finding self-loop cycle."""
        nodes = ["A"]
        edges = [("A", "A")]
        graph = self.parser.build_directed_graph(nodes, edges)

        cycles = self.parser.find_cycles(graph)
        assert len(cycles) > 0
        assert cycles[0] == ["A"]

    def test_find_cycles_multiple_cycles(self):
        """Test finding multiple cycles."""
        nodes = ["A", "B", "C", "D"]
        edges = [("A", "B"), ("B", "A"), ("C", "D"), ("D", "C")]
        graph = self.parser.build_directed_graph(nodes, edges)

        cycles = self.parser.find_cycles(graph)
        assert len(cycles) == 2


class TestBaseParserVisualizationData:
    """Test visualization data preparation."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_prepare_visualization_basic(self):
        """Test preparing basic visualization data."""
        nodes = ["A", "B", "C"]
        edges = [("A", "B"), ("B", "C")]
        graph = self.parser.build_directed_graph(nodes, edges)

        viz_data = self.parser.prepare_graph_visualization_data(graph)

        assert "nodes" in viz_data
        assert "edges" in viz_data
        assert "cyclic" in viz_data
        assert len(viz_data["nodes"]) == 3
        assert len(viz_data["edges"]) == 2
        assert viz_data["cyclic"] is False

    def test_prepare_visualization_with_labels(self):
        """Test preparing visualization with custom node labels."""
        nodes = ["A", "B"]
        edges = [("A", "B")]
        graph = self.parser.build_directed_graph(nodes, edges)

        node_labels = {"A": "Node A", "B": "Node B"}
        viz_data = self.parser.prepare_graph_visualization_data(graph, node_labels)

        node_a = next(n for n in viz_data["nodes"] if n["id"] == "A")
        assert node_a["label"] == "Node A"

    def test_prepare_visualization_with_metadata(self):
        """Test preparing visualization with node metadata."""
        nodes = ["A", "B"]
        edges = [("A", "B")]
        graph = self.parser.build_directed_graph(nodes, edges)

        node_metadata = {
            "A": {"color": "red", "size": 10},
            "B": {"color": "blue", "size": 20},
        }
        viz_data = self.parser.prepare_graph_visualization_data(
            graph, node_metadata=node_metadata
        )

        node_a = next(n for n in viz_data["nodes"] if n["id"] == "A")
        assert node_a["color"] == "red"
        assert node_a["size"] == 10

    def test_prepare_visualization_detects_cycles(self):
        """Test that cyclic graphs are correctly identified."""
        nodes = ["A", "B", "C"]
        edges = [("A", "B"), ("B", "C"), ("C", "A")]
        graph = self.parser.build_directed_graph(nodes, edges)

        viz_data = self.parser.prepare_graph_visualization_data(graph)
        assert viz_data["cyclic"] is True


class TestBaseParserNormalizeQuery:
    """Test SQL query normalization."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_normalize_query_uppercases_sql(self):
        """Test that SQL is converted to uppercase."""
        sql = "select * from users where id = 123"
        normalized = self.parser.normalize_query(sql)

        assert normalized == "SELECT * FROM USERS WHERE ID = 123"
        assert "select" not in normalized  # lowercase removed
        assert "SELECT" in normalized  # uppercase present


    def test_normalize_query_removes_extra_whitespace(self):
        """Test that extra whitespace is removed."""
        sql = "SELECT  *   FROM    users"
        normalized = self.parser.normalize_query(sql)

        assert normalized == "SELECT * FROM USERS"
        assert "  " not in normalized  # No double spaces


class TestBaseParserFrameworkDetection:
    """Test framework detection from stack frames."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_detect_framework_react(self):
        """Test detecting React framework."""
        event_data = {}
        frames = [{"filename": "react-dom.production.min.js", "function": "render"}]

        framework = self.parser.detect_framework(event_data, frames)
        assert framework == "react"

    def test_detect_framework_vue(self):
        """Test detecting Vue framework."""
        event_data = {}
        frames = [{"filename": "vue.runtime.esm.js", "function": "createComponent"}]

        framework = self.parser.detect_framework(event_data, frames)
        assert framework == "vue"

    def test_detect_framework_angular(self):
        """Test detecting Angular framework."""
        event_data = {}
        frames = [{"filename": "@angular/core", "function": "Component"}]

        framework = self.parser.detect_framework(event_data, frames)
        assert framework == "angular"

    def test_detect_framework_none_when_unknown(self):
        """Test that None is returned for unknown frameworks."""
        event_data = {}
        frames = [{"filename": "custom.js", "function": "myFunction"}]

        framework = self.parser.detect_framework(event_data, frames)
        assert framework is None


class TestBaseParserCalculatePercentageSavings:
    """Test percentage savings calculation."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_calculate_percentage_savings_50_percent(self):
        """Test calculating 50% savings."""
        result = self.parser.calculate_percentage_savings(100, 50)
        assert result == 50.0

    def test_calculate_percentage_savings_zero_optimized(self):
        """Test with zero optimized time (100% savings)."""
        result = self.parser.calculate_percentage_savings(100, 0)
        assert result == 100.0

    def test_calculate_percentage_savings_zero_total(self):
        """Test with zero total time (returns 0)."""
        result = self.parser.calculate_percentage_savings(0, 50)
        assert result == 0.0

    def test_calculate_percentage_savings_negative_result(self):
        """Test that negative savings are clamped to 0."""
        result = self.parser.calculate_percentage_savings(50, 100)
        assert result == 0.0


class TestBaseParserIntegration:
    """Integration tests for BaseParser methods."""

    def setup_method(self):
        self.parser = TestableParser()

    def test_parse_method_integration(self):
        """Test that parse method uses extract_message correctly."""
        event_data = {"message": "Integration test message"}
        result = self.parser.parse(event_data)

        assert result["parsed"] is True
        assert result["message"] == "Integration test message"

    def test_complete_error_parsing_workflow(self):
        """Test complete workflow of parsing an error event."""
        event_data = {
            "message": "Test error",
            "exception": {
                "values": [
                    {
                        "type": "TypeError",
                        "value": "Cannot read property of undefined",
                        "stacktrace": {
                            "frames": [
                                {
                                    "filename": "app.js",
                                    "lineno": 42,
                                    "colno": 10,
                                    "function": "handleClick",
                                }
                            ]
                        },
                    }
                ]
            },
        }

        # Extract all information
        message = self.parser.extract_message(event_data)
        error_type = self.parser.extract_error_type(event_data)
        frames = self.parser.extract_stack_frames(event_data)
        file_path, line_number, column_number = self.parser.extract_code_location(frames)
        function_name = self.parser.extract_function_name(frames)

        # Verify all extracted correctly
        assert message == "Test error"
        assert error_type == "TypeError"
        assert len(frames) == 1
        assert file_path == "app.js"
        assert line_number == 42
        assert column_number == 10
        assert function_name == "handleClick"
