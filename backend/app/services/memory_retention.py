"""
Memory Retention Path Analyzer

Analyzes object retention paths to understand why objects are not being
garbage collected and identify the root causes of memory leaks.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from collections import defaultdict, deque

from app.models.memory_leak import RetentionPath, LeakPattern

logger = logging.getLogger(__name__)


class RetentionAnalyzer:
    """
    Analyzes object retention paths to identify why objects are not
    being garbage collected.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize retention analyzer."""
        self.config = config or {}
        self.max_path_depth = config.get("max_path_depth", 10)
        self.max_paths_per_object = config.get("max_paths_per_object", 5)
        self.min_retained_size = config.get("min_retained_size", 1024)

    async def analyze_paths(
        self, heap_graph: Dict[str, Any], leak_patterns: List[LeakPattern]
    ) -> List[RetentionPath]:
        """
        Analyze retention paths for detected leak patterns.

        Args:
            heap_graph: Parsed heap graph data
            leak_patterns: Detected leak patterns

        Returns:
            List of retention paths showing why objects are retained
        """
        retention_paths = []

        # Build reference graph for analysis
        ref_graph = self._build_reference_graph(heap_graph)

        # Find GC roots
        gc_roots = self._find_gc_roots(heap_graph)

        # Analyze paths for each leak pattern
        for pattern in leak_patterns:
            pattern_paths = await self._analyze_pattern_paths(
                pattern, ref_graph, gc_roots, heap_graph
            )
            retention_paths.extend(pattern_paths)

        # Sort by leak probability (highest first)
        retention_paths.sort(key=lambda p: p.leak_probability, reverse=True)

        logger.info(f"Analyzed {len(retention_paths)} retention paths")
        return retention_paths

    def _build_reference_graph(self, heap_graph: Dict[str, Any]) -> Dict[str, List[str]]:
        """
        Build reference graph from heap data.

        Returns:
            Dictionary mapping object IDs to lists of referenced object IDs
        """
        ref_graph = defaultdict(list)
        reverse_refs = defaultdict(list)

        edges = heap_graph.get("edges", [])

        for edge in edges:
            source = edge.get("source", "")
            target = edge.get("target", "")

            if source and target:
                ref_graph[source].append(target)
                reverse_refs[target].append(source)

        # Store reverse references for retention path analysis
        self.reverse_refs = reverse_refs

        return dict(ref_graph)

    def _find_gc_roots(self, heap_graph: Dict[str, Any]) -> Set[str]:
        """
        Find garbage collection roots in the heap.

        GC roots are objects that are always reachable and prevent
        garbage collection of objects they reference.
        """
        gc_roots = set()
        objects = heap_graph.get("nodes", [])

        for obj in objects:
            obj_id = obj.get("id", "")
            obj_type = obj.get("type", "")
            obj_name = obj.get("name", "")

            # Identify common GC roots
            if self._is_gc_root(obj_type, obj_name):
                gc_roots.add(obj_id)

        # If no explicit roots found, use objects with no incoming references
        if not gc_roots:
            all_targets = set()
            for edge in heap_graph.get("edges", []):
                target = edge.get("target", "")
                if target:
                    all_targets.add(target)

            all_objects = {obj.get("id", "") for obj in objects}
            gc_roots = all_objects - all_targets

        logger.debug(f"Found {len(gc_roots)} GC roots")
        return gc_roots

    def _is_gc_root(self, obj_type: str, obj_name: str) -> bool:
        """Check if object is a GC root."""
        root_types = [
            "Window",
            "Document",
            "Global",
            "Module",
            "NativeContext",
            "CodeCache",
            "InternalNode",
        ]

        root_patterns = ["window", "document", "global", "__root__", "process", "Buffer"]

        # Check type
        if obj_type in root_types:
            return True

        # Check name patterns
        for pattern in root_patterns:
            if pattern in obj_name.lower():
                return True

        return False

    async def _analyze_pattern_paths(
        self,
        pattern: LeakPattern,
        ref_graph: Dict[str, List[str]],
        gc_roots: Set[str],
        heap_graph: Dict[str, Any],
    ) -> List[RetentionPath]:
        """Analyze retention paths for a specific leak pattern."""
        paths = []

        # Get object details
        objects_by_id = {obj.get("id", ""): obj for obj in heap_graph.get("nodes", [])}

        # Analyze paths for top affected objects
        top_objects = pattern.affected_objects[:10]  # Limit for performance

        for obj_id in top_objects:
            if obj_id not in objects_by_id:
                continue

            obj = objects_by_id[obj_id]
            obj_size = obj.get("size", 0)

            # Skip small objects
            if obj_size < self.min_retained_size:
                continue

            # Find paths from GC roots to this object
            obj_paths = self._find_paths_to_object(obj_id, gc_roots, ref_graph, objects_by_id)

            # Create retention path objects
            for path_nodes in obj_paths:
                retention_path = self._create_retention_path(
                    obj_id, path_nodes, objects_by_id, pattern
                )
                if retention_path:
                    paths.append(retention_path)

        return paths

    def _find_paths_to_object(
        self,
        target_id: str,
        gc_roots: Set[str],
        ref_graph: Dict[str, List[str]],
        objects_by_id: Dict[str, Any],
        max_paths: int = 3,
    ) -> List[List[str]]:
        """
        Find paths from GC roots to target object using BFS.

        Args:
            target_id: Target object ID
            gc_roots: Set of GC root object IDs
            ref_graph: Reference graph
            objects_by_id: Object details by ID
            max_paths: Maximum number of paths to find

        Returns:
            List of paths (each path is a list of object IDs)
        """
        paths = []

        # Use BFS to find shortest paths
        for root_id in gc_roots:
            if len(paths) >= max_paths:
                break

            root_paths = self._bfs_find_paths(
                root_id, target_id, ref_graph, max_depth=self.max_path_depth
            )

            paths.extend(root_paths[: max_paths - len(paths)])

        return paths

    def _bfs_find_paths(
        self, start_id: str, target_id: str, ref_graph: Dict[str, List[str]], max_depth: int = 10
    ) -> List[List[str]]:
        """Find paths using breadth-first search."""
        if start_id == target_id:
            return [[start_id]]

        queue = deque([(start_id, [start_id])])
        visited = set()
        paths = []

        while queue and len(paths) < self.max_paths_per_object:
            current_id, path = queue.popleft()

            if len(path) > max_depth:
                continue

            if current_id in visited:
                continue

            visited.add(current_id)

            # Get references from current object
            references = ref_graph.get(current_id, [])

            for ref_id in references:
                if ref_id == target_id:
                    # Found target
                    complete_path = path + [ref_id]
                    paths.append(complete_path)
                elif ref_id not in visited:
                    # Continue search
                    new_path = path + [ref_id]
                    queue.append((ref_id, new_path))

        return paths

    def _create_retention_path(
        self,
        object_id: str,
        path_nodes: List[str],
        objects_by_id: Dict[str, Any],
        pattern: LeakPattern,
    ) -> Optional[RetentionPath]:
        """Create RetentionPath object from path nodes."""
        if not path_nodes:
            return None

        path_details = []
        total_retained_size = 0

        for i, node_id in enumerate(path_nodes):
            obj = objects_by_id.get(node_id, {})
            obj_size = obj.get("size", 0)
            total_retained_size += obj_size

            # Determine property name for reference
            property_name = "reference"
            if i > 0:
                property_name = self._infer_property_name(path_nodes[i - 1], node_id, objects_by_id)

            step = {
                "object_id": node_id,
                "type": obj.get("type", "unknown"),
                "name": obj.get("name", ""),
                "size": obj_size,
                "retained_size": obj_size,
                "property": property_name,
                "step_index": i,
            }

            path_details.append(step)

        # Calculate leak probability based on path characteristics
        leak_probability = self._calculate_path_leak_probability(path_details, pattern)

        return RetentionPath(
            object_id=object_id,
            path=path_details,
            retained_size=total_retained_size,
            leak_probability=leak_probability,
        )

    def _infer_property_name(
        self, source_id: str, target_id: str, objects_by_id: Dict[str, Any]
    ) -> str:
        """Infer property name for reference between objects."""
        source_obj = objects_by_id.get(source_id, {})
        target_obj = objects_by_id.get(target_id, {})

        source_type = source_obj.get("type", "")
        target_obj.get("type", "")
        target_name = target_obj.get("name", "")

        # Common property patterns
        if "Array" in source_type and target_name.isdigit():
            return f"[{target_name}]"

        if "Element" in source_type or "Node" in source_type:
            if "child" in target_name.lower():
                return "childNodes"
            elif "parent" in target_name.lower():
                return "parentNode"

        if target_name:
            return target_name

        return "reference"

    def _calculate_path_leak_probability(
        self, path_details: List[Dict[str, Any]], pattern: LeakPattern
    ) -> float:
        """Calculate leak probability for retention path."""
        base_probability = pattern.confidence

        # Adjust based on path characteristics
        path_length = len(path_details)

        # Longer paths are more suspicious
        if path_length > 5:
            base_probability = min(base_probability * 1.2, 1.0)
        elif path_length < 3:
            base_probability *= 0.9

        # Check for suspicious object types in path
        suspicious_types = [
            "HTMLElement",
            "EventListener",
            "Closure",
            "Timer",
            "Promise",
            "Watcher",
        ]

        suspicious_count = 0
        for step in path_details:
            step_type = step.get("type", "")
            if any(sus_type in step_type for sus_type in suspicious_types):
                suspicious_count += 1

        if suspicious_count > 0:
            multiplier = 1 + (suspicious_count * 0.1)
            base_probability = min(base_probability * multiplier, 1.0)

        # Check for circular references (simplified)
        object_ids = [step.get("object_id", "") for step in path_details]
        if len(set(object_ids)) < len(object_ids):
            # Potential circular reference
            base_probability = min(base_probability * 1.3, 1.0)

        return base_probability

    async def analyze_object_dependencies(
        self, object_id: str, heap_graph: Dict[str, Any], max_depth: int = 3
    ) -> Dict[str, Any]:
        """
        Analyze dependencies of a specific object.

        Args:
            object_id: Object to analyze
            heap_graph: Heap graph data
            max_depth: Maximum dependency depth

        Returns:
            Dictionary with dependency analysis
        """
        ref_graph = self._build_reference_graph(heap_graph)
        objects_by_id = {obj.get("id", ""): obj for obj in heap_graph.get("nodes", [])}

        # Find direct and indirect dependencies
        dependencies = self._find_dependencies(object_id, ref_graph, objects_by_id, max_depth)

        # Find what depends on this object
        dependents = self._find_dependents(object_id, self.reverse_refs, objects_by_id, max_depth)

        # Calculate dependency metrics
        total_dependency_size = sum(dep.get("size", 0) for dep in dependencies.values())

        return {
            "object_id": object_id,
            "dependencies": dependencies,
            "dependents": dependents,
            "dependency_count": len(dependencies),
            "dependent_count": len(dependents),
            "total_dependency_size": total_dependency_size,
            "analysis_timestamp": logger.info.__name__,  # Current time placeholder
        }

    def _find_dependencies(
        self,
        object_id: str,
        ref_graph: Dict[str, List[str]],
        objects_by_id: Dict[str, Any],
        max_depth: int,
        visited: Optional[Set[str]] = None,
        current_depth: int = 0,
    ) -> Dict[str, Any]:
        """Find all objects that this object depends on."""
        if visited is None:
            visited = set()

        if current_depth >= max_depth or object_id in visited:
            return {}

        visited.add(object_id)
        dependencies = {}

        # Get direct references
        references = ref_graph.get(object_id, [])

        for ref_id in references:
            if ref_id not in visited:
                ref_obj = objects_by_id.get(ref_id, {})
                dependencies[ref_id] = {
                    "id": ref_id,
                    "type": ref_obj.get("type", "unknown"),
                    "name": ref_obj.get("name", ""),
                    "size": ref_obj.get("size", 0),
                    "depth": current_depth + 1,
                }

                # Recursively find dependencies
                nested_deps = self._find_dependencies(
                    ref_id, ref_graph, objects_by_id, max_depth, visited.copy(), current_depth + 1
                )
                dependencies.update(nested_deps)

        return dependencies

    def _find_dependents(
        self,
        object_id: str,
        reverse_refs: Dict[str, List[str]],
        objects_by_id: Dict[str, Any],
        max_depth: int,
        visited: Optional[Set[str]] = None,
        current_depth: int = 0,
    ) -> Dict[str, Any]:
        """Find all objects that depend on this object."""
        if visited is None:
            visited = set()

        if current_depth >= max_depth or object_id in visited:
            return {}

        visited.add(object_id)
        dependents = {}

        # Get objects that reference this object
        referring_objects = reverse_refs.get(object_id, [])

        for ref_id in referring_objects:
            if ref_id not in visited:
                ref_obj = objects_by_id.get(ref_id, {})
                dependents[ref_id] = {
                    "id": ref_id,
                    "type": ref_obj.get("type", "unknown"),
                    "name": ref_obj.get("name", ""),
                    "size": ref_obj.get("size", 0),
                    "depth": current_depth + 1,
                }

                # Recursively find dependents
                nested_deps = self._find_dependents(
                    ref_id,
                    reverse_refs,
                    objects_by_id,
                    max_depth,
                    visited.copy(),
                    current_depth + 1,
                )
                dependents.update(nested_deps)

        return dependents
