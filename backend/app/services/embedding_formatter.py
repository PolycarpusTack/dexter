"""
Embedding Formatter for Dexter.

Converts stack traces and error data into text optimized for code embedding models.
"""

import logging
from typing import List, Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class CleanedFrame(BaseModel):
    """Pydantic model for cleaned stack frames."""

    filename: str
    function: Optional[str] = None
    lineno: Optional[int] = None
    context_line: str = ""
    module: Optional[str] = None

    def to_text(self) -> str:
        """Convert frame to embedding-friendly text format."""
        parts = []

        # File information
        if self.module:
            parts.append(f"Module: {self.module}")
        parts.append(f"File: {self.filename}")

        # Function and line
        if self.function:
            parts.append(f"Function: {self.function}")
        if self.lineno:
            parts.append(f"Line: {self.lineno}")

        # Code context (most important for similarity)
        if self.context_line and self.context_line.strip():
            parts.append(f"Code: {self.context_line.strip()}")

        return " | ".join(parts)


def frames_to_embedding_text(
    error_type: str,
    error_message: str,
    frames: List[CleanedFrame],
    platform: Optional[str] = None,
    max_frames: int = 10,
) -> str:
    """
    Generate text optimized for code embedding models.

    Format prioritizes:
    1. Error type and message (most important for similarity)
    2. Platform context
    3. Top-level function names and file paths
    4. Actual code context

    Args:
        error_type: Type of error (e.g., TypeError, ValueError)
        error_message: Error message text
        frames: List of cleaned stack frames
        platform: Optional platform (e.g., python, javascript)
        max_frames: Maximum frames to include

    Returns:
        Formatted text for embedding
    """
    parts = []

    # Error header (most important)
    error_header = f"Error: {error_type}"
    if error_message:
        # Truncate very long messages
        msg = error_message[:500] if len(error_message) > 500 else error_message
        error_header = f"{error_header}: {msg}"
    parts.append(error_header)

    # Platform context
    if platform:
        parts.append(f"Platform: {platform}")

    # Stack trace
    if frames:
        parts.append("Stack trace:")
        for frame in frames[:max_frames]:
            parts.append(f"  {frame.to_text()}")

    return "\n".join(parts)


def error_to_embedding_text(
    error_data: dict,
    max_frames: int = 10,
) -> str:
    """
    Convert raw error data to embedding-friendly text.

    Args:
        error_data: Raw error data dictionary
        max_frames: Maximum frames to include

    Returns:
        Formatted text for embedding
    """
    error_type = error_data.get("type", "Error")
    error_message = error_data.get("value", error_data.get("message", ""))
    platform = error_data.get("platform")

    # Extract frames from various structures
    frames: List[CleanedFrame] = []

    # Try direct stacktrace
    if stacktrace := error_data.get("stacktrace"):
        raw_frames = stacktrace.get("frames", [])
        frames = _convert_frames(raw_frames)

    # Try exception.values[0].stacktrace
    elif exception := error_data.get("exception"):
        values = exception.get("values", [])
        if values and isinstance(values[0], dict):
            raw_frames = values[0].get("stacktrace", {}).get("frames", [])
            frames = _convert_frames(raw_frames)

    # Try cleaned_stack if already processed
    elif cleaned_stack := error_data.get("cleaned_stack"):
        if isinstance(cleaned_stack, list):
            frames = [CleanedFrame(**f) if isinstance(f, dict) else f for f in cleaned_stack]

    return frames_to_embedding_text(
        error_type=error_type,
        error_message=error_message,
        frames=frames,
        platform=platform,
        max_frames=max_frames,
    )


def _convert_frames(raw_frames: List[dict]) -> List[CleanedFrame]:
    """Convert raw frame dictionaries to CleanedFrame objects."""
    cleaned = []
    for frame in raw_frames:
        try:
            cleaned.append(
                CleanedFrame(
                    filename=frame.get("filename", frame.get("abs_path", "unknown")),
                    function=frame.get("function"),
                    lineno=frame.get("lineno"),
                    context_line=frame.get("context_line", ""),
                    module=frame.get("module"),
                )
            )
        except Exception as e:
            logger.warning(f"Failed to convert frame: {e}")
            continue
    return cleaned
