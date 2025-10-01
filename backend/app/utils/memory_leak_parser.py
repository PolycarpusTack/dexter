"""
Memory Leak Parser - Analyzes memory consumption patterns to detect memory leaks.

This module extracts memory usage information from Sentry events to identify potential
memory leaks, determine the leaking objects, and suggest mitigation strategies.
"""

import time
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class MemoryObject(BaseModel):
    """Information about a memory object type that may be leaking."""

    object_type: str
    count: int
    size_bytes: int
    growth_rate: float  # objects per minute
    retention_paths: List[str] = Field(default_factory=list)


class MemorySnapshot(BaseModel):
    """A snapshot of memory usage at a specific time."""

    timestamp: float
    total_memory: int  # bytes
    used_memory: int  # bytes
    objects: Dict[str, MemoryObject]


class MemoryLeakInfo(BaseModel):
    """Complete analysis of memory leak patterns."""

    raw_message: str
    snapshots: List[MemorySnapshot]
    leaking_objects: List[MemoryObject]
    visualization_data: Dict[str, Any]
    recommended_fix: str


def parse_memory_leak(event_data: Dict[str, Any]) -> Optional[MemoryLeakInfo]:
    """
    Parse memory leak information from Sentry event data.

    Args:
        event_data: The Sentry event containing memory usage data

    Returns:
        MemoryLeakInfo object or None if no memory leak is detected
    """
    try:
        # Extract memory information from the event
        snapshots = _extract_memory_snapshots(event_data)
        if not snapshots or len(snapshots) < 2:
            logger.info("Not enough memory snapshots found to detect leaks")
            return None

        # Sort snapshots by timestamp
        snapshots.sort(key=lambda s: s.timestamp)

        # Detect leaking objects
        leaking_objects = _detect_leaking_objects(snapshots)
        if not leaking_objects:
            logger.info("No leaking objects detected")
            return None

        # Prepare visualization data
        visualization_data = _prepare_visualization_data(snapshots, leaking_objects)

        # Generate recommendation
        recommended_fix = _generate_recommendation(leaking_objects)

        # Create the final memory leak info object
        return MemoryLeakInfo(
            raw_message=event_data.get("message", ""),
            snapshots=snapshots,
            leaking_objects=leaking_objects,
            visualization_data=visualization_data,
            recommended_fix=recommended_fix,
        )
    except Exception as e:
        logger.exception(f"Error parsing memory leak: {str(e)}")
        return None


def _extract_memory_snapshots(event_data: Dict[str, Any]) -> List[MemorySnapshot]:
    """Extract memory snapshots from event data."""
    snapshots = []

    # Check for breadcrumbs with memory information
    breadcrumbs = event_data.get("breadcrumbs", {}).get("values", [])
    for breadcrumb in breadcrumbs:
        if breadcrumb.get("category") == "memory":
            snapshot = _parse_memory_breadcrumb(breadcrumb)
            if snapshot:
                snapshots.append(snapshot)

    # Check for memory information in contexts
    memory_context = event_data.get("contexts", {}).get("memory", {})
    if memory_context:
        snapshot = _parse_memory_context(memory_context)
        if snapshot:
            snapshots.append(snapshot)

    # Check for memory information in spans
    spans = _extract_spans_from_event(event_data)
    memory_spans = [span for span in spans if span.get("op") == "memory"]
    for span in memory_spans:
        snapshot = _parse_memory_span(span)
        if snapshot:
            snapshots.append(snapshot)

    return snapshots


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


def _parse_memory_breadcrumb(breadcrumb: Dict[str, Any]) -> Optional[MemorySnapshot]:
    """Parse memory information from a breadcrumb."""
    data = breadcrumb.get("data", {})
    if not data:
        return None

    timestamp = breadcrumb.get("timestamp", time.time())

    # Extract memory information
    total_memory = data.get("total_memory", 0)
    used_memory = data.get("used_memory", 0)

    # Extract object information if available
    objects = {}
    objects_data = data.get("objects", {})
    for obj_type, obj_data in objects_data.items():
        if isinstance(obj_data, dict):
            objects[obj_type] = MemoryObject(
                object_type=obj_type,
                count=obj_data.get("count", 0),
                size_bytes=obj_data.get("size", 0),
                growth_rate=obj_data.get("growth_rate", 0),
                retention_paths=obj_data.get("retention_paths", []),
            )
        elif isinstance(obj_data, int):
            # Simple count only
            objects[obj_type] = MemoryObject(
                object_type=obj_type, count=obj_data, size_bytes=0, growth_rate=0
            )

    return MemorySnapshot(
        timestamp=timestamp,
        total_memory=total_memory,
        used_memory=used_memory,
        objects=objects,
    )


def _parse_memory_context(context: Dict[str, Any]) -> Optional[MemorySnapshot]:
    """Parse memory information from event context."""
    if not context:
        return None

    timestamp = time.time()  # No timestamp in context, use current time

    # Extract memory information
    total_memory = context.get("total_memory_bytes", context.get("total", 0))
    used_memory = context.get("used_memory_bytes", context.get("used", 0))

    # Extract object information if available
    objects = {}
    objects_data = context.get("objects", {})
    for obj_type, obj_data in objects_data.items():
        if isinstance(obj_data, dict):
            objects[obj_type] = MemoryObject(
                object_type=obj_type,
                count=obj_data.get("count", 0),
                size_bytes=obj_data.get("size", 0),
                growth_rate=obj_data.get("growth_rate", 0),
                retention_paths=obj_data.get("retention_paths", []),
            )
        elif isinstance(obj_data, int):
            # Simple count only
            objects[obj_type] = MemoryObject(
                object_type=obj_type, count=obj_data, size_bytes=0, growth_rate=0
            )

    return MemorySnapshot(
        timestamp=timestamp,
        total_memory=total_memory,
        used_memory=used_memory,
        objects=objects,
    )


def _parse_memory_span(span: Dict[str, Any]) -> Optional[MemorySnapshot]:
    """Parse memory information from a performance span."""
    data = span.get("data", {})
    if not data:
        return None

    timestamp = span.get("start_timestamp", time.time())

    # Extract memory information
    total_memory = data.get("total_memory_bytes", data.get("total", 0))
    used_memory = data.get("used_memory_bytes", data.get("used", 0))

    # Extract object information if available
    objects = {}
    objects_data = data.get("objects", {})
    for obj_type, obj_data in objects_data.items():
        if isinstance(obj_data, dict):
            objects[obj_type] = MemoryObject(
                object_type=obj_type,
                count=obj_data.get("count", 0),
                size_bytes=obj_data.get("size", 0),
                growth_rate=obj_data.get("growth_rate", 0),
                retention_paths=obj_data.get("retention_paths", []),
            )
        elif isinstance(obj_data, int):
            # Simple count only
            objects[obj_type] = MemoryObject(
                object_type=obj_type, count=obj_data, size_bytes=0, growth_rate=0
            )

    return MemorySnapshot(
        timestamp=timestamp,
        total_memory=total_memory,
        used_memory=used_memory,
        objects=objects,
    )


def _detect_leaking_objects(snapshots: List[MemorySnapshot]) -> List[MemoryObject]:
    """
    Detect objects that appear to be leaking memory.

    Uses growth rate analysis to identify objects that consistently increase in count
    or size over time.
    """
    if len(snapshots) < 2:
        return []

    # Collect all unique object types across snapshots
    all_object_types = set()
    for snapshot in snapshots:
        all_object_types.update(snapshot.objects.keys())

    # Analyze growth for each object type
    leaking_objects = []
    for obj_type in all_object_types:
        # Collect data points for this object type
        counts = []
        sizes = []
        timestamps = []

        for snapshot in snapshots:
            if obj_type in snapshot.objects:
                obj = snapshot.objects[obj_type]
                counts.append(obj.count)
                sizes.append(obj.size_bytes)
                timestamps.append(snapshot.timestamp)

        # Skip objects that don't have enough data points
        if len(counts) < 2:
            continue

        # Calculate growth rate (objects per minute)
        time_diff_minutes = (timestamps[-1] - timestamps[0]) / 60
        if time_diff_minutes > 0:
            count_growth = (counts[-1] - counts[0]) / time_diff_minutes
            size_growth = (sizes[-1] - sizes[0]) / time_diff_minutes

            # Check if the growth is consistent
            is_consistent = _check_consistent_growth(counts, timestamps)

            # If there's significant growth and it's consistent, this might be a leak
            if (count_growth > 10 or size_growth > 1024 * 100) and is_consistent:
                # Get the latest object data
                latest_obj = snapshots[-1].objects.get(obj_type)
                if latest_obj:
                    latest_obj.growth_rate = count_growth
                    leaking_objects.append(latest_obj)

    # Sort by growth rate, highest first
    return sorted(leaking_objects, key=lambda obj: obj.growth_rate, reverse=True)


def _check_consistent_growth(values: List[int], timestamps: List[float]) -> bool:
    """
    Check if a series of values shows consistent growth over time.

    Args:
        values: List of measurements (e.g., object counts)
        timestamps: Timestamps corresponding to the measurements

    Returns:
        True if growth is consistent, False otherwise
    """
    if len(values) < 3:
        return True  # Not enough data points to determine consistency

    # Calculate differences between consecutive values
    diffs = [values[i + 1] - values[i] for i in range(len(values) - 1)]

    # Calculate time differences in minutes
    time_diffs = [(timestamps[i + 1] - timestamps[i]) / 60 for i in range(len(timestamps) - 1)]

    # Calculate growth rates per minute
    rates = [diffs[i] / time_diffs[i] if time_diffs[i] > 0 else 0 for i in range(len(diffs))]

    # Check if at least 75% of the rates are positive
    positive_rates = sum(1 for rate in rates if rate > 0)
    if positive_rates / len(rates) < 0.75:
        return False

    # Check if there's no significant decrease
    has_significant_decrease = any(diffs[i] < -0.5 * values[i] for i in range(len(diffs)))
    if has_significant_decrease:
        return False

    return True


def _prepare_visualization_data(
    snapshots: List[MemorySnapshot], leaking_objects: List[MemoryObject]
) -> Dict[str, Any]:
    """Prepare data for frontend visualization."""
    # Extract timestamps and values for charts
    timestamps = []
    total_memory = []
    used_memory = []

    # Data for object counts over time
    object_data = {}

    for snapshot in snapshots:
        iso_time = datetime.fromtimestamp(snapshot.timestamp).strftime("%Y-%m-%d %H:%M:%S")
        timestamps.append(iso_time)
        total_memory.append(snapshot.total_memory)
        used_memory.append(snapshot.used_memory)

        # Collect object counts
        for obj_type, obj in snapshot.objects.items():
            if obj_type not in object_data:
                object_data[obj_type] = {"name": obj_type, "counts": [], "sizes": []}

            object_data[obj_type]["counts"].append(obj.count)
            object_data[obj_type]["sizes"].append(obj.size_bytes)

    # Filter to include only leaking objects and top objects by count
    leaking_types = [obj.object_type for obj in leaking_objects]

    # Include top objects by count if we don't have enough leaking objects
    if len(leaking_types) < 5:
        # Get the last snapshot for counts
        if snapshots:
            last_snapshot = snapshots[-1]
            top_objects = sorted(
                last_snapshot.objects.items(), key=lambda x: x[1].count, reverse=True
            )

            for obj_type, _ in top_objects:
                if obj_type not in leaking_types and len(leaking_types) < 5:
                    leaking_types.append(obj_type)

    # Filter object data
    filtered_object_data = [
        object_data[obj_type] for obj_type in leaking_types if obj_type in object_data
    ]

    return {
        "timestamps": timestamps,
        "total_memory": total_memory,
        "used_memory": used_memory,
        "objects": filtered_object_data,
        "leaking_objects": [
            {
                "name": obj.object_type,
                "count": obj.count,
                "size_bytes": obj.size_bytes,
                "growth_rate": obj.growth_rate,
                "retention_paths": obj.retention_paths,
            }
            for obj in leaking_objects
        ],
    }


def _generate_recommendation(leaking_objects: List[MemoryObject]) -> str:
    """Generate recommendations for fixing memory leaks."""
    if not leaking_objects:
        return "No memory leaks detected."

    # Build a comprehensive recommendation
    top_objects = leaking_objects[:3]  # Focus on top 3 leaking objects

    objects_table = _format_objects_table(top_objects)
    specific_recommendations = _generate_object_specific_recommendations(top_objects)

    recommendation = (
        """


## Memory Leak Analysis

### Overview
We have detected potential memory leaks in your application. The following objects are showing consistent growth over time:

| Object Type | Current Count | Growth Rate | Size (bytes) |
|-------------|---------------|-------------|--------------|
"""
        + objects_table
        + """

### Root Causes

Memory leaks typically occur for the following reasons:

1. **Unmanaged Resources**: Not properly releasing resources when they're no longer needed
2. **Unclosed Closures**: References to objects captured in closures preventing garbage collection
3. **Caches Without Limits**: Unbounded caches that grow without constraints
4. **Event Listeners**: Not removing event listeners when components are destroyed
5. **Circular References**: Objects referring to each other in a way that prevents garbage collection

### Recommendations

Based on the analysis of the leaking objects, here are some specific recommendations:

"""
        + specific_recommendations
        + """

### General Memory Leak Prevention

1. **Regular Memory Profiling**: Use tools like Chrome DevTools Memory panel or Node.js heap snapshots
2. **Implement Proper Cleanup**: Ensure all resources are properly released
3. **Use WeakMap/WeakSet**: When creating caches or mappings that shouldn't prevent garbage collection
4. **Set Cache Limits**: Implement LRU or size-based cache eviction policies
5. **Automate Memory Tests**: Add memory leak tests to your CI/CD pipeline

### Testing for Memory Leaks

1. Use the Chrome DevTools Memory panel to take heap snapshots before and after operations
2. Look for objects that should be garbage collected but remain in memory
3. Analyze the retention paths to understand what's keeping objects alive

By addressing these issues, you can significantly reduce memory consumption and improve application stability.
"""
    )

    return recommendation


def _format_objects_table(objects: List[MemoryObject]) -> str:
    """Format a markdown table of leaking objects."""
    rows = []
    for obj in objects:
        size_formatted = _format_bytes(obj.size_bytes)
        rows.append(
            f"| {obj.object_type} | {obj.count:,} | {obj.growth_rate:.2f}/min | {size_formatted} |"
        )

    return "\n".join(rows)


def _generate_object_specific_recommendations(objects: List[MemoryObject]) -> str:
    """Generate object-specific recommendations."""
    recommendations = []

    for obj in objects:
        if "closure" in obj.object_type.lower():
            recommendations.append(
                "#### For "
                + obj.object_type
                + """

This appears to be a closure-related leak. Check for:
- Event handlers that capture variables but aren't removed
- Callbacks registered to long-lived objects
- Functions referencing parent scope variables

**Solution**: Ensure all event listeners are removed when components unmount.
```javascript
// Before component unmount:
element.removeEventListener('click', this.handleClick);
```
"""
            )
        elif "cache" in obj.object_type.lower() or "map" in obj.object_type.lower():
            recommendations.append(
                "#### For "
                + obj.object_type
                + """

This appears to be a cache or map that's growing without bounds. Check for:
- Unbounded caches storing more and more data
- Maps/objects that only add items but never remove them

**Solution**: Implement cache size limits or time-based expiration.
```javascript
// Use a cache with a max size
const cache = new LRUCache({ max: 100 });

// Or use a WeakMap if appropriate
const cache = new WeakMap();
```
"""
            )
        elif "dom" in obj.object_type.lower() or "element" in obj.object_type.lower():
            recommendations.append(
                "#### For "
                + obj.object_type
                + """

This appears to be DOM elements not being properly removed. Check for:
- Elements removed from DOM but still referenced in JavaScript
- Event listeners on elements that were removed
- Elements stored in arrays or objects

**Solution**: Null out references to DOM elements when they're removed.
```javascript
// Remove element from DOM and also clear references
const element = document.getElementById('my-element');
element.parentNode.removeChild(element);
myElementReference = null;
```
"""
            )
        else:
            recommendations.append(
                "#### For "
                + obj.object_type
                + """

Check for:
- Objects being accumulated in arrays or collections
- Objects with circular references
- Resources not being properly released

**Solution**: Review how these objects are created and ensure proper cleanup.
```javascript
// Review object lifecycle management
function createObject() {
  const obj = new ExpensiveObject();

  // Ensure cleanup when done
  return {
    ...obj,
    dispose: () => obj.cleanup()
  };


}
```
"""
            )

    return "\n".join(recommendations)


def _format_bytes(bytes: int) -> str:
    """Format bytes into a human-readable string."""
    if bytes < 1024:
        return f"{bytes} B"
    elif bytes < 1024 * 1024:
        return f"{bytes / 1024:.2f} KB"
    elif bytes < 1024 * 1024 * 1024:
        return f"{bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{bytes / (1024 * 1024 * 1024):.2f} GB"
