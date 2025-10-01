# File: backend/app/utils/promise_rejection_parser.py

"""
Promise rejection parser for extracting and analyzing unhandled promise rejections.

This module provides utilities to parse stack traces and error messages from
JavaScript/TypeScript applications to identify promise rejection patterns.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class PromiseRejectionInfo:
    """Information about a promise rejection."""

    rejection_type: str  # 'unhandled', 'handled_late', 'multiple_handlers'
    error_message: str
    error_type: Optional[str] = None
    promise_id: Optional[str] = None

    # Promise chain information
    creation_stack: Optional[List[str]] = None
    rejection_stack: Optional[List[str]] = None
    async_chain: Optional[List[str]] = None

    # Context
    framework: Optional[str] = None  # react, vue, angular, node, etc.
    component: Optional[str] = None
    function_name: Optional[str] = None

    # Timing
    creation_time: Optional[datetime] = None
    rejection_time: Optional[datetime] = None
    time_to_rejection_ms: Optional[float] = None

    # Code location
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    column_number: Optional[int] = None

    # Additional context
    async_context: Optional[Dict[str, Any]] = None
    related_promises: Optional[List[str]] = None
    was_caught_later: bool = False


def parse_promise_rejection(event_data: Dict[str, Any]) -> Optional[PromiseRejectionInfo]:
    """
    Parse a Sentry event to extract promise rejection information.

    Args:
        event_data: Raw Sentry event data

    Returns:
        PromiseRejectionInfo if a promise rejection is detected, None otherwise
    """
    try:
        # Check if this is a promise rejection event
        if not _is_promise_rejection_event(event_data):
            return None

        # Extract basic error information
        error_message = event_data.get("message", "")
        error_type = _extract_error_type(event_data)

        # Parse stack traces
        exception_values = event_data.get("exception", {}).get("values", [])
        if not exception_values:
            return None

        main_exception = exception_values[0]
        stacktrace = main_exception.get("stacktrace", {})
        frames = stacktrace.get("frames", [])

        # Extract promise chain information
        creation_stack, rejection_stack = _extract_promise_stacks(frames)
        async_chain = _extract_async_chain(frames)

        # Detect framework
        framework = _detect_framework(event_data, frames)

        # Extract code location
        file_path, line_number, column_number = _extract_code_location(frames)

        # Extract component and function names
        component = _extract_component_name(frames, framework)
        function_name = _extract_function_name(frames)

        # Determine rejection type
        rejection_type = _determine_rejection_type(event_data, frames)

        # Extract timing information
        timing_info = _extract_timing_info(event_data)

        # Build async context
        async_context = _build_async_context(event_data, frames)

        return PromiseRejectionInfo(
            rejection_type=rejection_type,
            error_message=error_message,
            error_type=error_type,
            creation_stack=creation_stack,
            rejection_stack=rejection_stack,
            async_chain=async_chain,
            framework=framework,
            component=component,
            function_name=function_name,
            file_path=file_path,
            line_number=line_number,
            column_number=column_number,
            async_context=async_context,
            **timing_info,
        )

    except Exception as e:
        logger.error(f"Failed to parse promise rejection: {e}")
        return None


def _is_promise_rejection_event(event_data: Dict[str, Any]) -> bool:
    """Check if the event is a promise rejection."""
    # Check error message patterns
    message = event_data.get("message", "").lower()
    title = event_data.get("title", "").lower()

    rejection_patterns = [
        "unhandledrejection",
        "unhandled promise rejection",
        "uncaught (in promise)",
        "promise rejected",
        "promise rejection",
        "rejected promise not handled",
        "possible unhandled promise rejection",
    ]

    for pattern in rejection_patterns:
        if pattern in message or pattern in title:
            return True

    # Check exception type
    exceptions = event_data.get("exception", {}).get("values", [])
    for exc in exceptions:
        exc_type = exc.get("type", "").lower()
        if "promise" in exc_type or "rejection" in exc_type:
            return True

    # Check tags
    tags = event_data.get("tags", {})
    if tags.get("error.type") == "UnhandledRejection":
        return True

    return False


def _extract_error_type(event_data: Dict[str, Any]) -> Optional[str]:
    """Extract the specific error type from the rejection."""
    exceptions = event_data.get("exception", {}).get("values", [])
    if exceptions:
        return exceptions[0].get("type")
    return None


def _extract_promise_stacks(frames: List[Dict[str, Any]]) -> Tuple[List[str], List[str]]:
    """Extract promise creation and rejection stacks."""
    creation_stack = []
    rejection_stack = []

    in_rejection = True
    for frame in reversed(frames):  # Start from top of stack
        frame_str = _format_frame(frame)

        # Look for promise creation patterns
        if any(
            pattern in frame_str.lower()
            for pattern in ["new promise", "promise.then", "async function"]
        ):
            in_rejection = False

        if in_rejection:
            rejection_stack.append(frame_str)
        else:
            creation_stack.append(frame_str)

    return creation_stack, rejection_stack


def _extract_async_chain(frames: List[Dict[str, Any]]) -> List[str]:
    """Extract the async call chain from the stack frames."""
    async_chain = []

    for frame in frames:
        function_name = frame.get("function", "")
        if any(keyword in function_name.lower() for keyword in ["async", "await", "then", "catch"]):
            async_chain.append(_format_frame(frame))

    return async_chain


def _detect_framework(event_data: Dict[str, Any], frames: List[Dict[str, Any]]) -> Optional[str]:
    """Detect the JavaScript framework being used."""
    # Check platform
    platform = event_data.get("platform", "")
    if platform == "node":
        return "node"

    # Check frames for framework indicators
    for frame in frames:
        filename = frame.get("filename", "").lower()
        module = frame.get("module", "").lower()

        if "react" in filename or "react" in module:
            return "react"
        elif "vue" in filename or "vue" in module:
            return "vue"
        elif "angular" in filename or "@angular" in module:
            return "angular"
        elif "next" in filename or "next" in module:
            return "nextjs"
        elif "nuxt" in filename or "nuxt" in module:
            return "nuxtjs"

    # Check SDK
    sdk = event_data.get("sdk", {})
    sdk_name = sdk.get("name", "").lower()
    if "react" in sdk_name:
        return "react"
    elif "vue" in sdk_name:
        return "vue"
    elif "angular" in sdk_name:
        return "angular"
    elif "node" in sdk_name:
        return "node"

    return "javascript"


def _extract_code_location(
    frames: List[Dict[str, Any]]
) -> Tuple[Optional[str], Optional[int], Optional[int]]:
    """Extract the most relevant code location from frames."""
    # Find the first application frame (not from node_modules)
    for frame in reversed(frames):
        filename = frame.get("filename", "")
        if "node_modules" not in filename and filename:
            return (filename, frame.get("lineno"), frame.get("colno"))

    # Fallback to first frame with location info
    for frame in reversed(frames):
        if frame.get("filename"):
            return (frame.get("filename"), frame.get("lineno"), frame.get("colno"))

    return None, None, None


def _extract_component_name(
    frames: List[Dict[str, Any]], framework: Optional[str]
) -> Optional[str]:
    """Extract component name based on framework patterns."""
    if not framework:
        return None

    for frame in reversed(frames):
        function_name = frame.get("function", "")

        # React patterns
        if framework == "react":
            # Look for React component patterns
            if function_name and function_name[0].isupper():
                return function_name
            # Check for hooks
            if function_name.startswith("use"):
                return f"{function_name} (hook)"

        # Vue patterns
        elif framework == "vue":
            if "component" in function_name.lower():
                return function_name

        # Angular patterns
        elif framework == "angular":
            if "Component" in function_name:
                return function_name

    return None


def _extract_function_name(frames: List[Dict[str, Any]]) -> Optional[str]:
    """Extract the most relevant function name where the rejection occurred."""
    # Find first non-library function
    for frame in reversed(frames):
        function_name = frame.get("function", "")
        filename = frame.get("filename", "")

        if function_name and "node_modules" not in filename:
            return function_name

    return None


def _determine_rejection_type(event_data: Dict[str, Any], frames: List[Dict[str, Any]]) -> str:
    """Determine the specific type of promise rejection."""
    message = event_data.get("message", "").lower()

    if "multiple" in message:
        return "multiple_handlers"
    elif "handled" in message and "late" in message:
        return "handled_late"
    else:
        return "unhandled"


def _extract_timing_info(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract timing information about the promise lifecycle."""
    timing = {}

    # Try to extract from breadcrumbs
    breadcrumbs = event_data.get("breadcrumbs", {}).get("values", [])

    promise_created = None
    promise_rejected = None

    for crumb in breadcrumbs:
        message = crumb.get("message", "").lower()
        timestamp = crumb.get("timestamp")

        if "promise" in message:
            if "create" in message or "new" in message:
                promise_created = timestamp
            elif "reject" in message:
                promise_rejected = timestamp

    if promise_created:
        timing["creation_time"] = datetime.fromisoformat(promise_created.replace("Z", "+00:00"))

    if promise_rejected:
        timing["rejection_time"] = datetime.fromisoformat(promise_rejected.replace("Z", "+00:00"))

    if promise_created and promise_rejected:
        creation = timing["creation_time"]
        rejection = timing["rejection_time"]
        timing["time_to_rejection_ms"] = (rejection - creation).total_seconds() * 1000

    return timing


def _build_async_context(
    event_data: Dict[str, Any], frames: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Build context about the async execution environment."""
    context = {
        "async_depth": 0,
        "has_error_boundary": False,
        "catch_handlers": [],
        "finally_handlers": [],
        "parallel_promises": [],
    }

    # Count async depth
    for frame in frames:
        if "async" in frame.get("function", "").lower():
            context["async_depth"] += 1

    # Look for error handling
    for frame in frames:
        func_name = frame.get("function", "").lower()
        if "catch" in func_name:
            context["catch_handlers"].append(_format_frame(frame))
        elif "finally" in func_name:
            context["finally_handlers"].append(_format_frame(frame))
        elif "errorboundary" in func_name:
            context["has_error_boundary"] = True

    # Check for Promise.all or Promise.race
    for frame in frames:
        code = frame.get("context_line", "")
        if "Promise.all" in code:
            context["parallel_promises"].append("Promise.all")
        elif "Promise.race" in code:
            context["parallel_promises"].append("Promise.race")
        elif "Promise.allSettled" in code:
            context["parallel_promises"].append("Promise.allSettled")

    return context


def _format_frame(frame: Dict[str, Any]) -> str:
    """Format a stack frame into a readable string."""
    parts = []

    if frame.get("function"):
        parts.append(frame["function"])

    if frame.get("filename"):
        location = frame["filename"]
        if frame.get("lineno"):
            location += f":{frame['lineno']}"
            if frame.get("colno"):
                location += f":{frame['colno']}"
        parts.append(f"({location})")

    return " ".join(parts) or "anonymous"


def extract_promise_patterns(rejection_info: PromiseRejectionInfo) -> Dict[str, Any]:
    """Extract common promise anti-patterns from the rejection info."""
    patterns = {
        "missing_catch": False,
        "missing_await": False,
        "floating_promise": False,
        "nested_promise": False,
        "promise_constructor_antipattern": False,
        "multiple_rejection_handlers": False,
    }

    # Check for missing catch
    if rejection_info.async_context:
        patterns["missing_catch"] = len(rejection_info.async_context.get("catch_handlers", [])) == 0

    # Check for missing await (promise not awaited)
    if rejection_info.async_chain:
        for frame in rejection_info.async_chain:
            if "then" in frame and "await" not in frame:
                patterns["floating_promise"] = True
                break

    # Check for promise constructor anti-pattern
    if rejection_info.creation_stack:
        for frame in rejection_info.creation_stack:
            if "new Promise" in frame and "async" in frame:
                patterns["promise_constructor_antipattern"] = True
                break

    return patterns
