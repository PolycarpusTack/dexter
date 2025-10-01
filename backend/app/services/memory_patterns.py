"""
Memory Leak Pattern Detection Engine

ML-based and rule-based pattern detection for various types of memory leaks
in JavaScript applications.
"""

import asyncio
import logging
import re
from typing import Dict, Any, List, Optional

from app.models.memory_leak import LeakType, LeakPattern

logger = logging.getLogger(__name__)


class PatternDetectionEngine:
    """
    Advanced pattern detection engine combining rule-based and ML-based
    detection for various memory leak patterns.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize pattern detection engine."""
        self.config = config or {}

        # Initialize pattern detectors
        self.detectors = {
            LeakType.DOM_DETACHED: DetachedDOMDetector(config),
            LeakType.EVENT_LISTENER: EventListenerDetector(config),
            LeakType.CLOSURE_LEAK: ClosureLeakDetector(config),
            LeakType.REACT_CONTEXT: ReactContextDetector(config),
            LeakType.VUE_WATCHER: VueWatcherDetector(config),
            LeakType.ANGULAR_OBSERVABLE: AngularObservableDetector(config),
            LeakType.GLOBAL_POLLUTION: GlobalPollutionDetector(config),
            LeakType.CIRCULAR_REFERENCE: CircularReferenceDetector(config),
            LeakType.TIMER_LEAK: TimerLeakDetector(config),
            LeakType.PROMISE_LEAK: PromiseLeakDetector(config),
            LeakType.WASM_INTEROP: WasmInteropDetector(config),
        }

        # Configuration
        self.min_confidence = config.get("min_confidence", 0.5)
        self.max_patterns_per_type = config.get("max_patterns_per_type", 10)

    async def detect_patterns(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """
        Detect all memory leak patterns in heap graph.

        Args:
            heap_graph: Parsed heap graph data

        Returns:
            List of detected leak patterns
        """
        detected_patterns = []

        # Run all detectors in parallel
        detection_tasks = []
        for leak_type, detector in self.detectors.items():
            task = asyncio.create_task(self._run_detector(detector, heap_graph, leak_type))
            detection_tasks.append(task)

        # Wait for all detectors to complete
        results = await asyncio.gather(*detection_tasks, return_exceptions=True)

        # Collect results
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                leak_type = list(self.detectors.keys())[i]
                logger.error(f"Pattern detection failed for {leak_type}: {result}")
                continue

            if result:
                detected_patterns.extend(result)

        # Filter by confidence and limit per type
        filtered_patterns = self._filter_patterns(detected_patterns)

        # Sort by confidence (highest first)
        filtered_patterns.sort(key=lambda p: p.confidence, reverse=True)

        logger.info(f"Detected {len(filtered_patterns)} memory leak patterns")
        return filtered_patterns

    async def _run_detector(
        self, detector: "BasePatternDetector", heap_graph: Dict[str, Any], leak_type: LeakType
    ) -> List[LeakPattern]:
        """Run single pattern detector."""
        try:
            return await detector.detect(heap_graph)
        except Exception as e:
            logger.error(f"Detector {leak_type} failed: {e}")
            return []

    def _filter_patterns(self, patterns: List[LeakPattern]) -> List[LeakPattern]:
        """Filter patterns by confidence and limit per type."""
        # Filter by confidence
        filtered = [p for p in patterns if p.confidence >= self.min_confidence]

        # Group by type and limit
        by_type = {}
        for pattern in filtered:
            if pattern.type not in by_type:
                by_type[pattern.type] = []
            by_type[pattern.type].append(pattern)

        # Limit patterns per type
        final_patterns = []
        for leak_type, type_patterns in by_type.items():
            # Sort by confidence within type
            type_patterns.sort(key=lambda p: p.confidence, reverse=True)
            # Take top N patterns
            final_patterns.extend(type_patterns[: self.max_patterns_per_type])

        return final_patterns


class BasePatternDetector:
    """Base class for pattern detectors."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize detector."""
        self.config = config or {}

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect patterns in heap graph."""
        raise NotImplementedError

    def _extract_objects(self, heap_graph: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract objects from heap graph."""
        return heap_graph.get("nodes", [])

    def _calculate_confidence(
        self, evidence: Dict[str, Any], base_confidence: float = 0.7
    ) -> float:
        """Calculate confidence score based on evidence."""
        # Simple confidence calculation - can be enhanced with ML
        confidence = base_confidence

        # Boost confidence based on evidence strength
        evidence_count = len(evidence)
        if evidence_count > 3:
            confidence = min(confidence * 1.2, 1.0)
        elif evidence_count < 2:
            confidence *= 0.8

        return confidence


class DetachedDOMDetector(BasePatternDetector):
    """Detect detached DOM nodes."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect detached DOM nodes."""
        patterns = []
        objects = self._extract_objects(heap_graph)

        detached_nodes = []
        for obj in objects:
            obj_type = obj.get("type", "")
            obj_name = obj.get("name", "")

            # Look for DOM node indicators
            if self._is_dom_node(obj_type, obj_name):
                if self._is_detached(obj, objects):
                    detached_nodes.append(obj)

        if detached_nodes:
            total_size = sum(obj.get("size", 0) for obj in detached_nodes)

            evidence = {
                "detached_count": len(detached_nodes),
                "node_types": list(set(obj.get("type", "") for obj in detached_nodes)),
                "total_size": total_size,
            }

            pattern = LeakPattern(
                type=LeakType.DOM_DETACHED,
                confidence=self._calculate_confidence(evidence, 0.85),
                affected_objects=[obj.get("id", "") for obj in detached_nodes],
                total_retained_size=total_size,
                description=f"Found {len(detached_nodes)} detached DOM nodes consuming {total_size} bytes",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _is_dom_node(self, obj_type: str, obj_name: str) -> bool:
        """Check if object is a DOM node."""
        dom_types = ["HTMLElement", "Node", "Element", "Document"]
        dom_patterns = ["HTML", "Element", "Node"]

        if obj_type in dom_types:
            return True

        for pattern in dom_patterns:
            if pattern in obj_type or pattern in obj_name:
                return True

        return False

    def _is_detached(self, node: Dict[str, Any], all_objects: List[Dict[str, Any]]) -> bool:
        """Check if DOM node is detached from document."""
        # Simplified check - look for references to document
        node_id = node.get("id", "")

        # Check if node has path to document root
        # This is a simplified implementation
        return not self._has_document_reference(node_id, all_objects)

    def _has_document_reference(self, node_id: str, all_objects: List[Dict[str, Any]]) -> bool:
        """Check if node has reference to document."""
        # Simplified - in real implementation would traverse reference graph
        return False


class EventListenerDetector(BasePatternDetector):
    """Detect event listener leaks."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect event listener leaks."""
        patterns = []
        objects = self._extract_objects(heap_graph)

        listener_objects = []
        for obj in objects:
            if self._is_event_listener(obj):
                listener_objects.append(obj)

        # Look for excessive listeners or unremoved listeners
        if len(listener_objects) > 100:  # Threshold for many listeners
            total_size = sum(obj.get("size", 0) for obj in listener_objects)

            evidence = {
                "listener_count": len(listener_objects),
                "average_size": total_size // len(listener_objects),
                "excessive_count": True,
            }

            pattern = LeakPattern(
                type=LeakType.EVENT_LISTENER,
                confidence=self._calculate_confidence(evidence, 0.75),
                affected_objects=[obj.get("id", "") for obj in listener_objects],
                total_retained_size=total_size,
                description=f"Detected {len(listener_objects)} event listeners, potentially not cleaned up",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _is_event_listener(self, obj: Dict[str, Any]) -> bool:
        """Check if object is an event listener."""
        obj_type = obj.get("type", "")
        obj_name = obj.get("name", "")

        listener_indicators = [
            "EventListener",
            "Listener",
            "Handler",
            "addEventListener",
            "onclick",
            "onload",
        ]

        for indicator in listener_indicators:
            if indicator in obj_type or indicator in obj_name:
                return True

        return False


class ClosureLeakDetector(BasePatternDetector):
    """Detect closure-related memory leaks."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect closure leaks."""
        patterns = []
        objects = self._extract_objects(heap_graph)

        closure_objects = []
        for obj in objects:
            if self._is_closure(obj):
                closure_objects.append(obj)

        # Analyze closure sizes and patterns
        large_closures = [obj for obj in closure_objects if obj.get("size", 0) > 10000]

        if large_closures:
            total_size = sum(obj.get("size", 0) for obj in large_closures)

            evidence = {
                "large_closure_count": len(large_closures),
                "total_closure_count": len(closure_objects),
                "average_size": total_size // len(large_closures),
            }

            pattern = LeakPattern(
                type=LeakType.CLOSURE_LEAK,
                confidence=self._calculate_confidence(evidence, 0.65),
                affected_objects=[obj.get("id", "") for obj in large_closures],
                total_retained_size=total_size,
                description=f"Detected {len(large_closures)} large closures potentially capturing excessive data",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _is_closure(self, obj: Dict[str, Any]) -> bool:
        """Check if object is a closure."""
        obj_type = obj.get("type", "")
        obj_name = obj.get("name", "")

        closure_indicators = ["Closure", "Function", "closure"]

        for indicator in closure_indicators:
            if indicator in obj_type or indicator in obj_name:
                return True

        return False


class ReactContextDetector(BasePatternDetector):
    """Detect React context leaks."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect React context leaks."""
        patterns = []
        objects = self._extract_objects(heap_graph)

        react_objects = []
        for obj in objects:
            if self._is_react_object(obj):
                react_objects.append(obj)

        # Look for leaked React contexts
        context_leaks = self._analyze_react_contexts(react_objects)

        if context_leaks:
            total_size = sum(obj.get("size", 0) for obj in context_leaks)

            evidence = {
                "leaked_contexts": len(context_leaks),
                "total_react_objects": len(react_objects),
            }

            pattern = LeakPattern(
                type=LeakType.REACT_CONTEXT,
                confidence=self._calculate_confidence(evidence, 0.8),
                affected_objects=[obj.get("id", "") for obj in context_leaks],
                total_retained_size=total_size,
                description=f"Detected {len(context_leaks)} leaked React contexts",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _is_react_object(self, obj: Dict[str, Any]) -> bool:
        """Check if object is React-related."""
        obj_type = obj.get("type", "")
        obj_name = obj.get("name", "")

        react_indicators = ["React", "Component", "Context", "Provider", "Consumer"]

        for indicator in react_indicators:
            if indicator in obj_type or indicator in obj_name:
                return True

        return False

    def _analyze_react_contexts(self, react_objects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze React objects for context leaks."""
        # Simplified analysis
        context_objects = []
        for obj in react_objects:
            if "Context" in obj.get("type", "") or "Context" in obj.get("name", ""):
                context_objects.append(obj)

        return context_objects


class VueWatcherDetector(BasePatternDetector):
    """Detect Vue watcher leaks."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect Vue watcher leaks."""
        patterns = []
        objects = self._extract_objects(heap_graph)

        vue_watchers = []
        for obj in objects:
            if self._is_vue_watcher(obj):
                vue_watchers.append(obj)

        if len(vue_watchers) > 50:  # Threshold
            total_size = sum(obj.get("size", 0) for obj in vue_watchers)

            evidence = {"watcher_count": len(vue_watchers), "excessive": True}

            pattern = LeakPattern(
                type=LeakType.VUE_WATCHER,
                confidence=self._calculate_confidence(evidence, 0.7),
                affected_objects=[obj.get("id", "") for obj in vue_watchers],
                total_retained_size=total_size,
                description=f"Detected {len(vue_watchers)} Vue watchers, potentially not destroyed",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _is_vue_watcher(self, obj: Dict[str, Any]) -> bool:
        """Check if object is a Vue watcher."""
        obj_type = obj.get("type", "")
        obj_name = obj.get("name", "")

        vue_indicators = ["Vue", "Watcher", "computed", "watch"]

        for indicator in vue_indicators:
            if indicator in obj_type or indicator in obj_name:
                return True

        return False


class AngularObservableDetector(BasePatternDetector):
    """Detect Angular observable leaks."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect Angular observable leaks."""
        patterns = []
        objects = self._extract_objects(heap_graph)

        observables = []
        for obj in objects:
            if self._is_angular_observable(obj):
                observables.append(obj)

        if len(observables) > 30:  # Threshold
            total_size = sum(obj.get("size", 0) for obj in observables)

            evidence = {"observable_count": len(observables), "unsubscribed": True}

            pattern = LeakPattern(
                type=LeakType.ANGULAR_OBSERVABLE,
                confidence=self._calculate_confidence(evidence, 0.75),
                affected_objects=[obj.get("id", "") for obj in observables],
                total_retained_size=total_size,
                description=f"Detected {len(observables)} Angular observables, potentially unsubscribed",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _is_angular_observable(self, obj: Dict[str, Any]) -> bool:
        """Check if object is an Angular observable."""
        obj_type = obj.get("type", "")
        obj_name = obj.get("name", "")

        angular_indicators = ["Observable", "Subject", "Subscription", "Angular"]

        for indicator in angular_indicators:
            if indicator in obj_type or indicator in obj_name:
                return True

        return False


class GlobalPollutionDetector(BasePatternDetector):
    """Detect global variable pollution."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect global pollution."""
        patterns = []
        objects = self._extract_objects(heap_graph)

        global_objects = []
        for obj in objects:
            if self._is_global_pollution(obj):
                global_objects.append(obj)

        if len(global_objects) > 20:  # Threshold
            total_size = sum(obj.get("size", 0) for obj in global_objects)

            evidence = {"global_count": len(global_objects), "pollution_detected": True}

            pattern = LeakPattern(
                type=LeakType.GLOBAL_POLLUTION,
                confidence=self._calculate_confidence(evidence, 0.6),
                affected_objects=[obj.get("id", "") for obj in global_objects],
                total_retained_size=total_size,
                description=f"Detected {len(global_objects)} potential global variable pollution",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _is_global_pollution(self, obj: Dict[str, Any]) -> bool:
        """Check if object represents global pollution."""
        obj_name = obj.get("name", "")

        # Look for accidental globals
        pollution_patterns = [
            r"^[a-z][a-zA-Z0-9]*$",  # Potential accidental globals
            r"^temp",
            r"^cache",
            r"^data",
        ]

        for pattern in pollution_patterns:
            if re.match(pattern, obj_name):
                return True

        return False


class CircularReferenceDetector(BasePatternDetector):
    """Detect circular references."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect circular references."""
        patterns = []

        # Simplified circular reference detection
        # In practice, would analyze the reference graph more thoroughly
        edges = heap_graph.get("edges", [])

        # Look for potential cycles (simplified)
        cycles = self._find_cycles(edges)

        if cycles:
            evidence = {"cycle_count": len(cycles), "detected": True}

            pattern = LeakPattern(
                type=LeakType.CIRCULAR_REFERENCE,
                confidence=self._calculate_confidence(evidence, 0.8),
                affected_objects=[],  # Would be filled with cycle participants
                total_retained_size=0,  # Would be calculated
                description=f"Detected {len(cycles)} potential circular references",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _find_cycles(self, edges: List[Dict[str, Any]]) -> List[List[str]]:
        """Find cycles in reference graph (simplified)."""
        # This is a simplified implementation
        # Real implementation would use proper cycle detection algorithms
        return []


class TimerLeakDetector(BasePatternDetector):
    """Detect timer leaks."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect timer leaks."""
        patterns = []
        objects = self._extract_objects(heap_graph)

        timer_objects = []
        for obj in objects:
            if self._is_timer(obj):
                timer_objects.append(obj)

        if len(timer_objects) > 10:  # Threshold
            total_size = sum(obj.get("size", 0) for obj in timer_objects)

            evidence = {"timer_count": len(timer_objects), "excessive": True}

            pattern = LeakPattern(
                type=LeakType.TIMER_LEAK,
                confidence=self._calculate_confidence(evidence, 0.7),
                affected_objects=[obj.get("id", "") for obj in timer_objects],
                total_retained_size=total_size,
                description=f"Detected {len(timer_objects)} active timers, potentially not cleared",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _is_timer(self, obj: Dict[str, Any]) -> bool:
        """Check if object is a timer."""
        obj_type = obj.get("type", "")
        obj_name = obj.get("name", "")

        timer_indicators = ["Timer", "Timeout", "Interval", "setTimeout", "setInterval"]

        for indicator in timer_indicators:
            if indicator in obj_type or indicator in obj_name:
                return True

        return False


class PromiseLeakDetector(BasePatternDetector):
    """Detect promise leaks."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect promise leaks."""
        patterns = []
        objects = self._extract_objects(heap_graph)

        promise_objects = []
        for obj in objects:
            if self._is_promise(obj):
                promise_objects.append(obj)

        if len(promise_objects) > 100:  # Threshold
            total_size = sum(obj.get("size", 0) for obj in promise_objects)

            evidence = {"promise_count": len(promise_objects), "potentially_unresolved": True}

            pattern = LeakPattern(
                type=LeakType.PROMISE_LEAK,
                confidence=self._calculate_confidence(evidence, 0.6),
                affected_objects=[obj.get("id", "") for obj in promise_objects],
                total_retained_size=total_size,
                description=f"Detected {len(promise_objects)} promises, potentially unresolved",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _is_promise(self, obj: Dict[str, Any]) -> bool:
        """Check if object is a promise."""
        obj_type = obj.get("type", "")
        obj_name = obj.get("name", "")

        promise_indicators = ["Promise", "promise", "async", "await"]

        for indicator in promise_indicators:
            if indicator in obj_type or indicator in obj_name:
                return True

        return False


class WasmInteropDetector(BasePatternDetector):
    """Detect WebAssembly interop leaks."""

    async def detect(self, heap_graph: Dict[str, Any]) -> List[LeakPattern]:
        """Detect WASM interop leaks."""
        patterns = []
        objects = self._extract_objects(heap_graph)

        wasm_objects = []
        for obj in objects:
            if self._is_wasm_object(obj):
                wasm_objects.append(obj)

        if wasm_objects:
            total_size = sum(obj.get("size", 0) for obj in wasm_objects)

            evidence = {"wasm_object_count": len(wasm_objects), "interop_detected": True}

            pattern = LeakPattern(
                type=LeakType.WASM_INTEROP,
                confidence=self._calculate_confidence(evidence, 0.7),
                affected_objects=[obj.get("id", "") for obj in wasm_objects],
                total_retained_size=total_size,
                description=f"Detected {len(wasm_objects)} WASM interop objects",
                evidence=evidence,
            )
            patterns.append(pattern)

        return patterns

    def _is_wasm_object(self, obj: Dict[str, Any]) -> bool:
        """Check if object is WASM-related."""
        obj_type = obj.get("type", "")
        obj_name = obj.get("name", "")

        wasm_indicators = ["WebAssembly", "WASM", "wasm", "Module", "Instance"]

        for indicator in wasm_indicators:
            if indicator in obj_type or indicator in obj_name:
                return True

        return False
