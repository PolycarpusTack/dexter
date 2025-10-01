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

from .base_parser import BaseParser

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


class PromiseRejectionParser(BaseParser):
    """Parser for unhandled promise rejections."""

    def parse(self, event_data: Dict[str, Any]) -> Optional[PromiseRejectionInfo]:
        """
        Parse a Sentry event to extract promise rejection information.

        Args:
            event_data: Raw Sentry event data

        Returns:
            PromiseRejectionInfo if a promise rejection is detected, None otherwise
        """
        try:
            # Check if this is a promise rejection event
            if not self._is_promise_rejection_event(event_data):
                return None

            # Extract basic error information using base parser
            error_message = self.extract_message(event_data)
            error_type = self.extract_error_type(event_data)

            # Parse stack traces using base parser
            frames = self.extract_stack_frames(event_data)
            if not frames:
                return None

            # Extract promise chain information
            creation_stack, rejection_stack = self._extract_promise_stacks(frames)
            async_chain = self._extract_async_chain(frames)

            # Detect framework using base parser
            framework = self.detect_framework(event_data, frames)

            # Extract code location using base parser
            file_path, line_number, column_number = self.extract_code_location(frames)

            # Extract component and function names
            component = self._extract_component_name(frames, framework)
            function_name = self.extract_function_name(frames)

            # Determine rejection type
            rejection_type = self._determine_rejection_type(event_data, frames)

            # Extract timing information
            timing_info = self._extract_timing_info(event_data)

            # Build async context
            async_context = self._build_async_context(event_data, frames)

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

    def _is_promise_rejection_event(self, event_data: Dict[str, Any]) -> bool:
        """Check if the event is a promise rejection."""
        # Check error message patterns
        message = self.extract_message(event_data).lower()
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
        error_type = self.extract_error_type(event_data)
        if error_type:
            error_type_lower = error_type.lower()
            if "promise" in error_type_lower or "rejection" in error_type_lower:
                return True

        return False

    def _extract_promise_stacks(
        self, frames: List[Dict[str, Any]]
    ) -> Tuple[List[str], List[str]]:
        """Extract creation and rejection stack traces."""
        creation_stack = []
        rejection_stack = []

        for frame in frames:
            file_path = frame.get("filename", "")
            function = frame.get("function", "")
            lineno = frame.get("lineno", 0)

            frame_str = f"{file_path}:{lineno} in {function}"

            # Classify frame based on keywords
            if any(
                keyword in function.lower()
                for keyword in ["promise", "async", "then", "catch"]
            ):
                creation_stack.append(frame_str)
            else:
                rejection_stack.append(frame_str)

        return creation_stack, rejection_stack

    def _extract_async_chain(self, frames: List[Dict[str, Any]]) -> List[str]:
        """Extract async operation chain from frames."""
        async_chain = []

        for frame in frames:
            function = frame.get("function", "")
            if any(keyword in function.lower() for keyword in ["async", "await", "promise"]):
                async_chain.append(function)

        return async_chain

    def _extract_component_name(
        self, frames: List[Dict[str, Any]], framework: Optional[str]
    ) -> Optional[str]:
        """Extract component name based on framework."""
        if not frames:
            return None

        for frame in reversed(frames):
            function = frame.get("function", "")

            # React component detection
            if framework == "react":
                if function and function[0].isupper():
                    return function

            # Vue component detection
            elif framework == "vue":
                if "VueComponent" in function or ".vue" in frame.get("filename", ""):
                    return function

            # Angular component detection
            elif framework == "angular":
                if "Component" in function:
                    return function

        return None

    def _determine_rejection_type(
        self, event_data: Dict[str, Any], frames: List[Dict[str, Any]]
    ) -> str:
        """Determine the type of promise rejection."""
        message = self.extract_message(event_data).lower()

        if "unhandled" in message:
            return "unhandled"
        elif "caught late" in message or "handled after rejection" in message:
            return "handled_late"
        elif "multiple handlers" in message:
            return "multiple_handlers"

        return "unhandled"

    def _extract_timing_info(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract timing information from event."""
        timestamp = event_data.get("timestamp")
        received = event_data.get("received")

        timing = {}

        if timestamp:
            timing["rejection_time"] = datetime.fromisoformat(
                timestamp.replace("Z", "+00:00")
            )

        if received and timestamp:
            try:
                rejection_dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                received_dt = datetime.fromisoformat(received.replace("Z", "+00:00"))
                timing["time_to_rejection_ms"] = (
                    received_dt - rejection_dt
                ).total_seconds() * 1000
            except Exception:
                pass

        return timing

    def _build_async_context(
        self, event_data: Dict[str, Any], frames: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Build async operation context."""
        context = {
            "has_async": any("async" in f.get("function", "").lower() for f in frames),
            "has_await": any("await" in f.get("function", "").lower() for f in frames),
            "promise_chain_depth": len(
                [f for f in frames if "promise" in f.get("function", "").lower()]
            ),
        }

        return context


# Public API function for backward compatibility
def parse_promise_rejection(event_data: Dict[str, Any]) -> Optional[PromiseRejectionInfo]:
    """
    Parse a Sentry event to extract promise rejection information.

    Args:
        event_data: Raw Sentry event data

    Returns:
        PromiseRejectionInfo if a promise rejection is detected, None otherwise
    """
    parser = PromiseRejectionParser()
    return parser.parse(event_data)


def extract_promise_patterns(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract promise rejection patterns from event data.

    This function analyzes promise rejection events to identify common patterns
    and anti-patterns in promise usage.

    Args:
        event_data: Raw Sentry event data

    Returns:
        Dictionary containing identified patterns and metadata
    """
    rejection_info = parse_promise_rejection(event_data)

    if not rejection_info:
        return {
            "has_rejection": False,
            "patterns": [],
            "anti_patterns": []
        }

    patterns = []
    anti_patterns = []

    # Check for common patterns
    if rejection_info.async_chain and len(rejection_info.async_chain) > 3:
        patterns.append({
            "name": "deep_async_chain",
            "description": "Deep async/await chain detected",
            "severity": "medium",
            "chain_depth": len(rejection_info.async_chain)
        })

    # Check for anti-patterns
    if rejection_info.rejection_type == "unhandled":
        anti_patterns.append({
            "name": "unhandled_rejection",
            "description": "Promise rejection was not caught",
            "severity": "high"
        })

    if rejection_info.rejection_type == "handled_late":
        anti_patterns.append({
            "name": "late_error_handling",
            "description": "Promise rejection was caught after initial rejection",
            "severity": "medium"
        })

    # Analyze async context
    if rejection_info.async_context:
        if rejection_info.async_context.get("promise_chain_depth", 0) > 5:
            anti_patterns.append({
                "name": "deep_promise_chain",
                "description": "Excessive promise chaining detected",
                "severity": "low",
                "depth": rejection_info.async_context["promise_chain_depth"]
            })

    return {
        "has_rejection": True,
        "rejection_type": rejection_info.rejection_type,
        "error_type": rejection_info.error_type,
        "framework": rejection_info.framework,
        "component": rejection_info.component,
        "patterns": patterns,
        "anti_patterns": anti_patterns,
        "file_path": rejection_info.file_path,
        "line_number": rejection_info.line_number,
        "async_chain": rejection_info.async_chain or [],
        "async_context": rejection_info.async_context or {}
    }

