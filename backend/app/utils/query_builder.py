"""
Secure query builder utilities for preventing injection attacks.

This module provides safe methods for building queries and filtering
user input to prevent SQL injection and other query injection attacks.
"""

import re
import html
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Whitelist of allowed field names for Sentry queries
ALLOWED_SENTRY_FIELDS = {
    # Basic fields
    "id",
    "timestamp",
    "title",
    "message",
    "level",
    "platform",
    "environment",
    "release",
    "transaction",
    "user",
    "user.id",
    "user.email",
    "user.username",
    # Error fields
    "error.type",
    "error.value",
    "stack.filename",
    "stack.function",
    "stack.lineno",
    "stack.package",
    "stack.module",
    "stack.abs_path",
    "stack.in_app",
    # Performance fields
    "transaction.duration",
    "transaction.op",
    "transaction.status",
    "measurements.lcp",
    "measurements.fcp",
    "measurements.cls",
    "measurements.fid",
    "measurements.ttfb",
    "spans.duration",
    "spans.op",
    # Context fields
    "contexts.browser.name",
    "contexts.browser.version",
    "contexts.os.name",
    "contexts.os.version",
    "contexts.device.model",
    "contexts.device.brand",
    # Tag fields (commonly used)
    "tags.server_name",
    "tags.url",
    "tags.transaction",
    # Aggregate functions
    "count()",
    "count_unique(user)",
    "avg(transaction.duration)",
    "p50(transaction.duration)",
    "p75(transaction.duration)",
    "p95(transaction.duration)",
    "p99(transaction.duration)",
    "max(transaction.duration)",
    "min(transaction.duration)",
    "sum(transaction.duration)",
    "failure_rate()",
    "apdex()",
}

# Allowed operators for Sentry queries
ALLOWED_OPERATORS = {":", "!:", ">", "<", ">=", "<=", "=", "!=", "has", "!has"}

# Allowed logical operators
ALLOWED_LOGICAL = {"AND", "OR", "NOT"}


class QueryValidationError(Exception):
    """Raised when query validation fails."""


def sanitize_field_name(field_name: str) -> str:
    """
    Sanitize and validate a field name.

    Args:
        field_name: Field name to sanitize

    Returns:
        Sanitized field name

    Raises:
        QueryValidationError: If field name is invalid
    """
    if not field_name or not isinstance(field_name, str):
        raise QueryValidationError("Field name must be a non-empty string")

    # Remove any potential injection characters
    sanitized = re.sub(r"[^\w\.\(\)_-]", "", field_name)

    # Check against whitelist
    if sanitized not in ALLOWED_SENTRY_FIELDS:
        # Allow custom tag fields (tags.*) and measurement fields (measurements.*)
        if not (sanitized.startswith("tags.") or sanitized.startswith("measurements.")):
            logger.warning(f"Field name not in whitelist: {sanitized}")
            # Don't raise error for now, but log for monitoring

    return sanitized


def sanitize_field_value(value: Any) -> str:
    """
    Sanitize a field value for use in queries.

    Args:
        value: Value to sanitize

    Returns:
        Sanitized value as string
    """
    if value is None:
        return ""

    # Convert to string
    str_value = str(value)

    # HTML escape to prevent XSS
    escaped = html.escape(str_value)

    # Remove or escape special characters that could break queries
    # Allow alphanumeric, spaces, and common punctuation
    sanitized = re.sub(r'[^\w\s\.\-_@/:()"]', "", escaped)

    # Limit length to prevent DoS
    if len(sanitized) > 1000:
        sanitized = sanitized[:1000]
        logger.warning(f"Field value truncated to 1000 characters: {sanitized[:50]}...")

    return sanitized


def validate_operator(operator: str) -> str:
    """
    Validate and sanitize an operator.

    Args:
        operator: Operator to validate

    Returns:
        Validated operator

    Raises:
        QueryValidationError: If operator is invalid
    """
    if operator not in ALLOWED_OPERATORS:
        raise QueryValidationError(f"Invalid operator: {operator}")

    return operator


def build_secure_filter(field: str, operator: str, value: Any) -> str:
    """
    Build a secure filter expression.

    Args:
        field: Field name
        operator: Operator
        value: Field value

    Returns:
        Secure filter expression

    Raises:
        QueryValidationError: If any parameter is invalid
    """
    safe_field = sanitize_field_name(field)
    safe_operator = validate_operator(operator)
    safe_value = sanitize_field_value(value)

    # Build the filter expression
    if safe_operator in ["has", "!has"]:
        # has/!has operators don't need a value
        return f"{safe_field}:{safe_operator}"
    else:
        # Quote the value if it contains spaces or special characters
        if " " in safe_value or any(char in safe_value for char in ['"', "'", ":"]):
            safe_value = f'"{safe_value}"'

        return f"{safe_field}{safe_operator}{safe_value}"


def build_secure_query(filters: List[Dict[str, Any]], logical_operator: str = "AND") -> str:
    """
    Build a secure query from a list of filters.

    Args:
        filters: List of filter dictionaries with 'field', 'operator', and 'value' keys
        logical_operator: Logical operator to join filters (AND/OR)

    Returns:
        Secure query string

    Raises:
        QueryValidationError: If any filter is invalid
    """
    if not filters:
        return ""

    if logical_operator not in ALLOWED_LOGICAL:
        raise QueryValidationError(f"Invalid logical operator: {logical_operator}")

    query_parts = []

    for filter_def in filters:
        if not isinstance(filter_def, dict):
            raise QueryValidationError("Each filter must be a dictionary")

        required_keys = {"field", "operator", "value"}
        if not all(key in filter_def for key in required_keys):
            raise QueryValidationError(f"Filter must contain keys: {required_keys}")

        try:
            filter_expr = build_secure_filter(
                filter_def["field"], filter_def["operator"], filter_def["value"]
            )
            query_parts.append(filter_expr)
        except QueryValidationError as e:
            logger.error(f"Invalid filter: {filter_def}, error: {e}")
            # Skip invalid filters instead of failing the entire query
            continue

    if not query_parts:
        return ""

    return f" {logical_operator} ".join(query_parts)


def validate_sentry_query(query_string: str) -> bool:
    """
    Validate a Sentry query string for basic security issues.

    Args:
        query_string: Query string to validate

    Returns:
        True if query appears safe

    Raises:
        QueryValidationError: If query contains security issues
    """
    if not query_string:
        return True

    # Check length
    if len(query_string) > 2000:
        raise QueryValidationError("Query too long (max 2000 characters)")

    # Check for obvious injection patterns
    dangerous_patterns = [
        r"<script",
        r"javascript:",
        r"eval\s*\(",
        r"exec\s*\(",
        r"\bselect\b.*\bfrom\b",
        r"\binsert\b.*\binto\b",
        r"\bupdate\b.*\bset\b",
        r"\bdelete\b.*\bfrom\b",
        r"\bdrop\b.*\btable\b",
        r"union\s+select",
    ]

    query_lower = query_string.lower()
    for pattern in dangerous_patterns:
        if re.search(pattern, query_lower):
            raise QueryValidationError(f"Query contains potentially dangerous pattern: {pattern}")

    # Check for excessive nesting
    if query_string.count("(") > 10 or query_string.count(")") > 10:
        raise QueryValidationError("Query has excessive nesting")

    return True


def escape_sentry_query_value(value: str) -> str:
    """
    Escape a value for safe inclusion in Sentry queries.

    Args:
        value: Value to escape

    Returns:
        Escaped value
    """
    if not value:
        return '""'

    # Escape special characters
    escaped = value.replace("\\", "\\\\")  # Escape backslashes first
    escaped = escaped.replace('"', '\\"')  # Escape quotes
    escaped = escaped.replace(":", "\\:")  # Escape colons

    # Quote the value
    return f'"{escaped}"'


# Convenience functions for common query patterns


def build_error_query(
    error_type: Optional[str] = None,
    environment: Optional[str] = None,
    time_range: Optional[str] = None,
) -> str:
    """
    Build a secure query for error events.

    Args:
        error_type: Optional error type filter
        environment: Optional environment filter
        time_range: Optional time range (e.g., "24h")

    Returns:
        Secure error query
    """
    filters = [{"field": "level", "operator": ":", "value": "error"}]

    if error_type:
        filters.append({"field": "error.type", "operator": ":", "value": error_type})

    if environment:
        filters.append({"field": "environment", "operator": ":", "value": environment})

    return build_secure_query(filters)


def build_performance_query(
    transaction_name: Optional[str] = None,
    min_duration: Optional[float] = None,
    environment: Optional[str] = None,
) -> str:
    """
    Build a secure query for performance events.

    Args:
        transaction_name: Optional transaction name filter
        min_duration: Optional minimum duration filter (in seconds)
        environment: Optional environment filter

    Returns:
        Secure performance query
    """
    filters = [{"field": "event.type", "operator": ":", "value": "transaction"}]

    if transaction_name:
        filters.append({"field": "transaction", "operator": ":", "value": transaction_name})

    if min_duration:
        filters.append(
            {"field": "transaction.duration", "operator": ">", "value": f"{min_duration}s"}
        )

    if environment:
        filters.append({"field": "environment", "operator": ":", "value": environment})

    return build_secure_query(filters)
