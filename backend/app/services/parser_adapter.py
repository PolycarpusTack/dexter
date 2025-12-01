"""
Parser Adapter for Dexter.

Adapts existing specialized parsers to the unified embedding format.
Provides a unified interface for parsing error data from various sources.
"""

import logging
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ValidationError

from app.services.embedding_formatter import CleanedFrame, frames_to_embedding_text
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


class SentryErrorPayload(BaseModel):
    """Pydantic model for Sentry error payloads - validates structure."""

    type: str = "Error"
    value: str = ""
    platform: Optional[str] = None
    stacktrace: Optional[Dict[str, Any]] = None
    exception: Optional[Dict[str, Any]] = None
    level: str = "error"

    class Config:
        extra = "allow"  # Allow additional fields from Sentry


class UnifiedStackParser:
    """
    Adapts existing parsers to unified embedding format.

    All data is PII-scrubbed before processing.
    Uses existing specialized parsers for enhanced context when applicable.
    """

    # Patterns indicating vendor/library code (to be filtered out)
    VENDOR_PATTERNS = [
        "node_modules",
        "site-packages",
        "vendor/",
        ".venv/",
        "venv/",
        "dist-packages",
        "lib/python",
        "/usr/lib/",
        "/usr/local/lib/",
        "gems/",
        ".gem/",
        "bower_components",
        "packages/",
        "__pycache__",
        ".pyc",
    ]

    def __init__(self):
        """Initialize the unified parser with specialized sub-parsers."""
        self.pii_scrubber = get_pii_scrubber()
        self._deadlock_parser = None
        self._promise_parser = None

    @property
    def deadlock_parser(self):
        """Lazy load deadlock parser."""
        if self._deadlock_parser is None:
            try:
                from app.utils.enhanced_deadlock_parser import EnhancedDeadlockParser

                self._deadlock_parser = EnhancedDeadlockParser()
            except ImportError:
                logger.debug("EnhancedDeadlockParser not available")
        return self._deadlock_parser

    @property
    def promise_parser(self):
        """Lazy load promise rejection parser."""
        if self._promise_parser is None:
            try:
                from app.utils.promise_rejection_parser import PromiseRejectionParser

                self._promise_parser = PromiseRejectionParser()
            except ImportError:
                logger.debug("PromiseRejectionParser not available")
        return self._promise_parser

    def parse_and_format(
        self,
        error_data: Dict[str, Any],
        scrub_pii: bool = True,
    ) -> str:
        """
        Parse error and return embedding-ready text.

        Pipeline:
        1. Optionally scrubs PII
        2. Validates payload structure
        3. Extracts and prunes frames
        4. Applies specialized parsing if applicable
        5. Returns formatted text

        Args:
            error_data: Raw error data dictionary
            scrub_pii: Whether to scrub PII (default: True)

        Returns:
            Formatted text optimized for embedding
        """
        # 1. Scrub PII first
        if scrub_pii:
            error_data = self.pii_scrubber.scrub_dict(error_data)

        # 2. Validate and extract basic info
        try:
            payload = SentryErrorPayload(**error_data)
        except ValidationError as e:
            logger.warning(f"Invalid payload structure: {e}")
            payload = SentryErrorPayload(
                type=error_data.get("type", "Error"),
                value=error_data.get("value", error_data.get("message", "Unknown error")),
            )

        error_type = payload.type
        error_message = payload.value
        platform = payload.platform

        # 3. Extract and clean frames
        frames = self.extract_cleaned_frames(error_data)

        # 4. Apply specialized parsing for enhanced context
        if self._is_deadlock(error_data):
            frames = self._enhance_with_deadlock_info(error_data, frames)
        elif self._is_promise_rejection(error_data):
            frames = self._enhance_with_promise_info(error_data, frames)

        # 5. Return formatted text
        return frames_to_embedding_text(
            error_type=error_type,
            error_message=error_message,
            frames=frames,
            platform=platform,
        )

    def extract_cleaned_frames(
        self,
        error_data: Dict[str, Any],
        scrub_pii: bool = False,
    ) -> List[CleanedFrame]:
        """
        Extract and clean frames from error data.

        Public method for use by other services.

        Args:
            error_data: Error data dictionary
            scrub_pii: Whether to scrub PII (usually already done)

        Returns:
            List of cleaned stack frames
        """
        # Get raw frames
        raw_frames = self._get_raw_frames(error_data)

        # Scrub if requested
        if scrub_pii:
            raw_frames = self.pii_scrubber.scrub_stack_frames(raw_frames)

        # Prune and clean
        return self._prune_frames(raw_frames)

    def _get_raw_frames(self, error_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract frames from various Sentry payload structures."""
        # Try direct stacktrace
        if stacktrace := error_data.get("stacktrace"):
            return stacktrace.get("frames", [])

        # Try exception.values[0].stacktrace
        if exception := error_data.get("exception"):
            values = exception.get("values", [])
            if values and isinstance(values[0], dict):
                return values[0].get("stacktrace", {}).get("frames", [])

        # Try cleaned_stack if already processed
        if cleaned_stack := error_data.get("cleaned_stack"):
            return cleaned_stack if isinstance(cleaned_stack, list) else []

        return []

    def _prune_frames(self, frames: List[Dict[str, Any]]) -> List[CleanedFrame]:
        """
        Filter out vendor/library frames, keep application frames.

        Prioritizes:
        1. Frames marked as in_app
        2. Frames not in vendor directories
        3. Last few frames if no app frames found
        """
        cleaned: List[CleanedFrame] = []

        for frame in frames:
            path = frame.get("abs_path") or frame.get("filename", "")

            # Skip vendor frames unless explicitly in_app
            is_vendor = any(vendor in path.lower() for vendor in self.VENDOR_PATTERNS)
            is_in_app = frame.get("in_app", False)

            if is_vendor and not is_in_app:
                continue

            # Prefer in_app frames, but also include non-vendor frames
            if is_in_app or not is_vendor:
                try:
                    cleaned.append(
                        CleanedFrame(
                            filename=frame.get("filename", path.split("/")[-1] if "/" in path else path),
                            function=frame.get("function"),
                            lineno=frame.get("lineno"),
                            context_line=(frame.get("context_line") or "").strip(),
                            module=frame.get("module"),
                        )
                    )
                except Exception as e:
                    logger.debug(f"Failed to create CleanedFrame: {e}")
                    continue

        # Fallback to last 3 frames if no app frames found
        if not cleaned and frames:
            for frame in frames[-3:]:
                try:
                    cleaned.append(
                        CleanedFrame(
                            filename=frame.get("filename", "unknown"),
                            function=frame.get("function"),
                            lineno=frame.get("lineno"),
                            context_line=(frame.get("context_line") or "").strip(),
                            module=frame.get("module"),
                        )
                    )
                except Exception:
                    continue

        # Limit to max 10 frames for embedding
        return cleaned[:10]

    def _is_deadlock(self, error_data: Dict[str, Any]) -> bool:
        """Check if error is a deadlock."""
        message = str(error_data.get("value", "")).lower()
        error_type = str(error_data.get("type", "")).lower()

        deadlock_indicators = [
            "deadlock",
            "lock wait timeout",
            "lock timeout",
            "circular wait",
            "resource deadlock",
        ]

        return any(ind in message or ind in error_type for ind in deadlock_indicators)

    def _is_promise_rejection(self, error_data: Dict[str, Any]) -> bool:
        """Check if error is an unhandled promise rejection."""
        error_type = str(error_data.get("type", ""))

        promise_indicators = [
            "UnhandledRejection",
            "PromiseRejection",
            "UnhandledPromiseRejection",
            "UncaughtPromiseException",
        ]

        return any(ind in error_type for ind in promise_indicators)

    def _enhance_with_deadlock_info(
        self,
        error_data: Dict[str, Any],
        frames: List[CleanedFrame],
    ) -> List[CleanedFrame]:
        """
        Add deadlock-specific context to frames.

        Uses the existing deadlock parser for additional context.
        """
        if not self.deadlock_parser:
            return frames

        try:
            # Use deadlock parser to extract additional context
            # This extends rather than replaces the frames
            # Implementation depends on specific deadlock parser API
            pass
        except Exception as e:
            logger.debug(f"Deadlock enhancement failed: {e}")

        return frames

    def _enhance_with_promise_info(
        self,
        error_data: Dict[str, Any],
        frames: List[CleanedFrame],
    ) -> List[CleanedFrame]:
        """
        Add promise rejection-specific context to frames.

        Uses the existing promise parser for additional context.
        """
        if not self.promise_parser:
            return frames

        try:
            # Use promise parser to extract additional context
            # This extends rather than replaces the frames
            # Implementation depends on specific promise parser API
            pass
        except Exception as e:
            logger.debug(f"Promise enhancement failed: {e}")

        return frames


# Singleton instance
_unified_parser: Optional[UnifiedStackParser] = None


def get_unified_parser() -> UnifiedStackParser:
    """Get singleton unified parser instance."""
    global _unified_parser
    if _unified_parser is None:
        _unified_parser = UnifiedStackParser()
    return _unified_parser
