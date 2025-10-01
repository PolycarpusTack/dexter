"""
Memory Heap Parsers

Parsers for different JavaScript engine heap snapshot formats with
streaming capabilities and robust error handling.
"""

import json
import logging
import struct
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.models.memory_leak import HeapSnapshotFormat, ParseError, HeapObject

logger = logging.getLogger(__name__)


class BaseHeapParser(ABC):
    """Base class for heap snapshot parsers."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize parser with configuration."""
        self.config = config or {}
        self.chunk_buffer = b""
        self.object_count = 0
        self.total_size = 0

    @abstractmethod
    async def parse(self, heap_data: bytes) -> Dict[str, Any]:
        """Parse complete heap snapshot."""

    @abstractmethod
    async def parse_chunk(
        self, chunk: bytes, is_first: bool = False, is_last: bool = False
    ) -> Dict[str, Any]:
        """Parse heap snapshot chunk for streaming."""

    @abstractmethod
    async def consolidate_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Consolidate parsed chunks into final result."""

    def _validate_header(self, data: bytes) -> bool:
        """Validate heap snapshot header."""
        return len(data) > 0

    def _extract_metadata(self, data: bytes) -> Dict[str, Any]:
        """Extract metadata from heap snapshot."""
        return {
            "parser_type": self.__class__.__name__,
            "parsed_at": datetime.utcnow().isoformat(),
            "size_bytes": len(data),
        }


class V8HeapParser(BaseHeapParser):
    """
    Parser for V8 heap snapshots (Chrome DevTools format).

    V8 snapshots are JSON-based with specific structure:
    {
        "snapshot": {...},
        "nodes": [...],
        "edges": [...],
        "strings": [...]
    }
    """

    async def parse(self, heap_data: bytes) -> Dict[str, Any]:
        """Parse complete V8 heap snapshot."""
        try:
            # Validate format
            if not self._validate_v8_format(heap_data):
                raise ParseError(
                    "Invalid V8 heap snapshot format", "V8_INVALID_FORMAT", {"size": len(heap_data)}
                )

            # Parse JSON
            text_data = heap_data.decode("utf-8")
            snapshot_data = json.loads(text_data)

            # Extract components
            snapshot_info = snapshot_data.get("snapshot", {})
            nodes = snapshot_data.get("nodes", [])
            edges = snapshot_data.get("edges", [])
            strings = snapshot_data.get("strings", [])

            # Build object graph
            objects, graph = await self._build_v8_object_graph(nodes, edges, strings, snapshot_info)

            # Calculate statistics
            statistics = self._calculate_v8_statistics(objects, snapshot_info)

            return {
                "format": HeapSnapshotFormat.V8,
                "metadata": self._extract_v8_metadata(snapshot_info, heap_data),
                "objects": objects,
                "graph": graph,
                "statistics": statistics,
                "object_count": len(objects),
                "total_size": sum(obj.size for obj in objects),
            }

        except json.JSONDecodeError as e:
            raise ParseError(
                f"Failed to parse V8 JSON: {str(e)}",
                "V8_JSON_PARSE_ERROR",
                {"error": str(e), "position": getattr(e, "pos", None)},
            )
        except Exception as e:
            raise ParseError(f"V8 parsing failed: {str(e)}", "V8_PARSE_FAILED", {"error": str(e)})

    async def parse_chunk(
        self, chunk: bytes, is_first: bool = False, is_last: bool = False
    ) -> Dict[str, Any]:
        """Parse V8 heap snapshot chunk."""
        # Accumulate chunks
        self.chunk_buffer += chunk

        if not is_last:
            # Return partial progress
            return {
                "partial": True,
                "bytes_processed": len(self.chunk_buffer),
                "estimated_objects": self._estimate_object_count(),
            }

        # Parse complete buffer
        try:
            result = await self.parse(self.chunk_buffer)
            self.chunk_buffer = b""  # Clear buffer
            return result
        except Exception:
            self.chunk_buffer = b""  # Clear on error
            raise

    async def consolidate_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Consolidate V8 chunks (used when streaming is more complex)."""
        # For V8, we typically accumulate and parse at the end
        # This method handles cases where we need to merge parsed chunks
        if not chunks:
            return {}

        # Return the last complete chunk (non-partial)
        for chunk in reversed(chunks):
            if not chunk.get("partial", False):
                return chunk

        return chunks[-1] if chunks else {}

    def _validate_v8_format(self, data: bytes) -> bool:
        """Validate V8 heap snapshot format."""
        try:
            # Check for JSON start
            text = data[:1000].decode("utf-8", errors="ignore")
            return text.strip().startswith("{") and '"snapshot"' in text
        except:
            return False

    async def _build_v8_object_graph(
        self, nodes: List[int], edges: List[int], strings: List[str], snapshot_info: Dict[str, Any]
    ) -> tuple[List[HeapObject], Dict[str, Any]]:
        """Build object graph from V8 data structures."""
        objects = []
        graph = {"nodes": [], "edges": []}

        # Parse node meta info
        node_fields = snapshot_info.get("meta", {}).get("node_fields", [])
        edge_fields = snapshot_info.get("meta", {}).get("edge_fields", [])

        # Node field indices
        node_field_count = len(node_fields)
        id_index = node_fields.index("id") if "id" in node_fields else 0
        type_index = node_fields.index("type") if "type" in node_fields else 1
        name_index = node_fields.index("name") if "name" in node_fields else 2
        size_index = node_fields.index("self_size") if "self_size" in node_fields else 3

        # Parse nodes
        for i in range(0, len(nodes), node_field_count):
            if i + node_field_count > len(nodes):
                break

            node_data = nodes[i : i + node_field_count]

            # Extract node info
            node_id = str(node_data[id_index])
            node_type = (
                strings[node_data[type_index]]
                if node_data[type_index] < len(strings)
                else "unknown"
            )
            node_name = (
                strings[node_data[name_index]] if node_data[name_index] < len(strings) else ""
            )
            node_size = node_data[size_index] if size_index < len(node_data) else 0

            # Create heap object
            heap_obj = HeapObject(
                id=node_id,
                type=node_type,
                size=node_size,
                retained_size=node_size,  # Will be calculated later
                distance_from_root=0,  # Will be calculated later
                properties={"name": node_name} if node_name else {},
            )

            objects.append(heap_obj)

            # Add to graph
            graph["nodes"].append(
                {"id": node_id, "type": node_type, "name": node_name, "size": node_size}
            )

        # Parse edges (simplified)
        edge_field_count = len(edge_fields) if edge_fields else 3
        for i in range(0, min(len(edges), 10000), edge_field_count):  # Limit for performance
            if i + edge_field_count > len(edges):
                break

            edge_data = edges[i : i + edge_field_count]

            # Add edge to graph (simplified)
            graph["edges"].append(
                {
                    "source": str(edge_data[0]) if len(edge_data) > 0 else "0",
                    "target": str(edge_data[1]) if len(edge_data) > 1 else "0",
                    "type": strings[edge_data[2]]
                    if len(edge_data) > 2 and edge_data[2] < len(strings)
                    else "reference",
                }
            )

        return objects, graph

    def _calculate_v8_statistics(
        self, objects: List[HeapObject], snapshot_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate statistics from V8 objects."""
        total_size = sum(obj.size for obj in objects)
        type_counts = {}

        for obj in objects:
            type_counts[obj.type] = type_counts.get(obj.type, 0) + 1

        return {
            "heap_size": total_size,
            "heap_used": total_size,  # Approximation
            "external_memory": 0,
            "array_buffers": 0,
            "gc_count": 0,
            "gc_duration_ms": 0,
            "object_types": type_counts,
            "node_count": len(objects),
        }

    def _extract_v8_metadata(
        self, snapshot_info: Dict[str, Any], heap_data: bytes
    ) -> Dict[str, Any]:
        """Extract V8-specific metadata."""
        metadata = self._extract_metadata(heap_data)
        metadata.update(
            {
                "v8_version": snapshot_info.get("title", "unknown"),
                "uid": snapshot_info.get("uid", 0),
                "node_count": snapshot_info.get("node_count", 0),
                "edge_count": snapshot_info.get("edge_count", 0),
            }
        )
        return metadata

    def _estimate_object_count(self) -> int:
        """Estimate object count from buffer size."""
        # Very rough estimation: ~100 bytes per object on average
        return len(self.chunk_buffer) // 100


class JSCHeapParser(BaseHeapParser):
    """
    Parser for JavaScriptCore heap snapshots (Safari/WebKit).

    JSC format is binary-based with different structure than V8.
    """

    async def parse(self, heap_data: bytes) -> Dict[str, Any]:
        """Parse JavaScriptCore heap snapshot."""
        try:
            if not self._validate_jsc_format(heap_data):
                raise ParseError(
                    "Invalid JSC heap snapshot format",
                    "JSC_INVALID_FORMAT",
                    {"size": len(heap_data)},
                )

            # Parse binary header
            header = self._parse_jsc_header(heap_data)

            # Extract object data (simplified implementation)
            objects = await self._parse_jsc_objects(heap_data, header)

            # Build graph (simplified)
            graph = {"nodes": [], "edges": []}
            for obj in objects:
                graph["nodes"].append({"id": obj.id, "type": obj.type, "size": obj.size})

            statistics = {
                "heap_size": sum(obj.size for obj in objects),
                "heap_used": sum(obj.size for obj in objects),
                "object_count": len(objects),
            }

            return {
                "format": HeapSnapshotFormat.JSC,
                "metadata": self._extract_metadata(heap_data),
                "objects": objects,
                "graph": graph,
                "statistics": statistics,
                "object_count": len(objects),
                "total_size": sum(obj.size for obj in objects),
            }

        except Exception as e:
            raise ParseError(f"JSC parsing failed: {str(e)}", "JSC_PARSE_FAILED", {"error": str(e)})

    async def parse_chunk(
        self, chunk: bytes, is_first: bool = False, is_last: bool = False
    ) -> Dict[str, Any]:
        """Parse JSC chunk."""
        self.chunk_buffer += chunk

        if not is_last:
            return {"partial": True, "bytes_processed": len(self.chunk_buffer)}

        result = await self.parse(self.chunk_buffer)
        self.chunk_buffer = b""
        return result

    async def consolidate_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Consolidate JSC chunks."""
        return chunks[-1] if chunks else {}

    def _validate_jsc_format(self, data: bytes) -> bool:
        """Validate JSC format (simplified)."""
        return data.startswith(b"JSC") or len(data) > 16

    def _parse_jsc_header(self, data: bytes) -> Dict[str, Any]:
        """Parse JSC binary header."""
        # Simplified header parsing
        return {
            "magic": data[:4],
            "version": struct.unpack("<I", data[4:8])[0] if len(data) >= 8 else 0,
            "object_count": struct.unpack("<I", data[8:12])[0] if len(data) >= 12 else 0,
        }

    async def _parse_jsc_objects(self, data: bytes, header: Dict[str, Any]) -> List[HeapObject]:
        """Parse JSC objects (simplified implementation)."""
        objects = []
        object_count = min(header.get("object_count", 100), 1000)  # Limit for demo

        for i in range(object_count):
            obj = HeapObject(
                id=f"jsc_obj_{i}",
                type="Object",
                size=1024,  # Default size
                retained_size=1024,
                distance_from_root=0,
            )
            objects.append(obj)

        return objects


class SpiderMonkeyHeapParser(BaseHeapParser):
    """
    Parser for SpiderMonkey heap snapshots (Firefox).
    """

    async def parse(self, heap_data: bytes) -> Dict[str, Any]:
        """Parse SpiderMonkey heap snapshot."""
        try:
            if not self._validate_sm_format(heap_data):
                raise ParseError(
                    "Invalid SpiderMonkey heap snapshot format",
                    "SM_INVALID_FORMAT",
                    {"size": len(heap_data)},
                )

            # SpiderMonkey often uses modified JSON format
            objects = await self._parse_sm_objects(heap_data)

            graph = {"nodes": [], "edges": []}
            for obj in objects:
                graph["nodes"].append({"id": obj.id, "type": obj.type, "size": obj.size})

            statistics = {
                "heap_size": sum(obj.size for obj in objects),
                "heap_used": sum(obj.size for obj in objects),
                "object_count": len(objects),
            }

            return {
                "format": HeapSnapshotFormat.SPIDERMONKEY,
                "metadata": self._extract_metadata(heap_data),
                "objects": objects,
                "graph": graph,
                "statistics": statistics,
                "object_count": len(objects),
                "total_size": sum(obj.size for obj in objects),
            }

        except Exception as e:
            raise ParseError(
                f"SpiderMonkey parsing failed: {str(e)}", "SM_PARSE_FAILED", {"error": str(e)}
            )

    async def parse_chunk(
        self, chunk: bytes, is_first: bool = False, is_last: bool = False
    ) -> Dict[str, Any]:
        """Parse SpiderMonkey chunk."""
        self.chunk_buffer += chunk

        if not is_last:
            return {"partial": True, "bytes_processed": len(self.chunk_buffer)}

        result = await self.parse(self.chunk_buffer)
        self.chunk_buffer = b""
        return result

    async def consolidate_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Consolidate SpiderMonkey chunks."""
        return chunks[-1] if chunks else {}

    def _validate_sm_format(self, data: bytes) -> bool:
        """Validate SpiderMonkey format."""
        text = data[:100].decode("utf-8", errors="ignore")
        return "spidermonkey" in text.lower() or "{" in text

    async def _parse_sm_objects(self, data: bytes) -> List[HeapObject]:
        """Parse SpiderMonkey objects (simplified)."""
        objects = []

        # Create some dummy objects for demo
        for i in range(100):
            obj = HeapObject(
                id=f"sm_obj_{i}", type="Object", size=512, retained_size=512, distance_from_root=0
            )
            objects.append(obj)

        return objects


class ParserFactory:
    """Factory for creating appropriate heap parsers."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize parser factory."""
        self.config = config or {}
        self._parsers = {
            HeapSnapshotFormat.V8: V8HeapParser,
            HeapSnapshotFormat.JSC: JSCHeapParser,
            HeapSnapshotFormat.SPIDERMONKEY: SpiderMonkeyHeapParser,
        }

    def get_parser(self, format_type: HeapSnapshotFormat) -> BaseHeapParser:
        """Get parser for specified format."""
        parser_class = self._parsers.get(format_type)
        if not parser_class:
            logger.warning(f"No parser for format {format_type}, using V8 parser as fallback")
            parser_class = V8HeapParser

        return parser_class(self.config)

    def register_parser(self, format_type: HeapSnapshotFormat, parser_class: type):
        """Register custom parser for format."""
        self._parsers[format_type] = parser_class
        logger.info(f"Registered custom parser for {format_type}")

    def list_supported_formats(self) -> List[HeapSnapshotFormat]:
        """List all supported formats."""
        return list(self._parsers.keys())
