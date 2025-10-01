"""
Service for Discover API operations
"""
from fastapi import HTTPException, Depends
import logging
from typing import Dict, Any, List

# Import enhanced client and the dependency function
from app.services.enhanced_sentry_client import EnhancedSentryClient, get_enhanced_sentry_client
from app.utils.query_builder import (
    validate_sentry_query,
    sanitize_field_name,
    sanitize_field_value,
    QueryValidationError,
)

# Use direct import from settings instead

logger = logging.getLogger(__name__)


class DiscoverService:
    """Service for handling Discover API operations"""

    def __init__(self, sentry_client: EnhancedSentryClient):
        self.sentry_client = sentry_client

    async def execute_query(
        self, organization_slug: str, query_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a Discover query with security validation

        Args:
            organization_slug: Organization slug
            query_params: Query parameters

        Returns:
            Query results with data and metadata

        Raises:
            HTTPException: If query validation fails
        """
        try:
            # Validate and sanitize the query parameters
            sanitized_params = self._sanitize_query_params(query_params)

            # Execute the query with sanitized parameters
            return await self.sentry_client.discover_query(organization_slug, sanitized_params)
        except QueryValidationError as e:
            logger.warning(f"Query validation failed: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid query: {str(e)}")
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise HTTPException(status_code=500, detail="Query execution failed")

    async def get_saved_queries(self, organization_slug: str) -> List[Dict[str, Any]]:
        """
        Get saved Discover queries

        Args:
            organization_slug: Organization slug

        Returns:
            List of saved queries
        """
        return await self.sentry_client.get_discover_saved_queries(organization_slug)

    async def create_saved_query(
        self, organization_slug: str, query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a saved Discover query

        Args:
            organization_slug: Organization slug
            query_data: Query definition

        Returns:
            Created query object
        """
        return await self.sentry_client.create_discover_saved_query(organization_slug, query_data)

    def validate_query(self, query: Dict[str, Any]) -> bool:
        """
        Validate a Discover query structure

        Args:
            query: Query to validate

        Returns:
            True if valid

        Raises:
            HTTPException: If query is invalid
        """
        # Check required fields
        if not query.get("fields"):
            raise HTTPException(status_code=400, detail="Query must include at least one field")

        # Validate field format
        for field in query["fields"]:
            if not isinstance(field, dict) or "field" not in field:
                raise HTTPException(status_code=400, detail="Invalid field format")

        # Validate time range
        if query.get("start") and query.get("end") and query.get("statsPeriod"):
            raise HTTPException(
                status_code=400,
                detail="Cannot specify both absolute time range and relative period",
            )

        return True

    def _sanitize_query_params(self, query_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize query parameters to prevent injection attacks.

        Args:
            query_params: Raw query parameters

        Returns:
            Sanitized query parameters

        Raises:
            QueryValidationError: If parameters are invalid
        """
        sanitized = {}

        # Sanitize the query string if present
        if "query" in query_params and query_params["query"]:
            query_string = str(query_params["query"])
            validate_sentry_query(query_string)
            sanitized["query"] = query_string

        # Sanitize field selections
        if "fields" in query_params:
            fields = query_params["fields"]
            if isinstance(fields, list):
                sanitized_fields = []
                for field in fields:
                    if isinstance(field, dict) and "field" in field:
                        safe_field = sanitize_field_name(field["field"])
                        sanitized_field = {"field": safe_field}
                        if "alias" in field:
                            # Sanitize alias too
                            safe_alias = sanitize_field_name(field["alias"])
                            sanitized_field["alias"] = safe_alias
                        sanitized_fields.append(sanitized_field)
                    elif isinstance(field, str):
                        safe_field = sanitize_field_name(field)
                        sanitized_fields.append(safe_field)
                sanitized["fields"] = sanitized_fields

        # Copy safe parameters directly
        safe_params = [
            "start",
            "end",
            "statsPeriod",
            "environment",
            "project",
            "limit",
            "orderby",
            "cursor",
        ]

        for param in safe_params:
            if param in query_params:
                value = query_params[param]
                # Additional validation for specific parameters
                if param == "limit":
                    try:
                        limit = int(value)
                        if limit < 1 or limit > 1000:
                            raise QueryValidationError("Limit must be between 1 and 1000")
                        sanitized[param] = limit
                    except (ValueError, TypeError):
                        raise QueryValidationError("Invalid limit value")
                elif param == "orderby" and value:
                    # Validate orderby field
                    orderby = str(value)
                    if orderby.startswith("-"):
                        field_name = orderby[1:]
                    else:
                        field_name = orderby
                    safe_field = sanitize_field_name(field_name)
                    sanitized[param] = f"-{safe_field}" if orderby.startswith("-") else safe_field
                elif param in ["environment", "project"] and isinstance(value, list):
                    # Sanitize list values
                    sanitized_list = []
                    for item in value:
                        if param == "project":
                            try:
                                sanitized_list.append(int(item))
                            except (ValueError, TypeError):
                                raise QueryValidationError(f"Invalid project ID: {item}")
                        else:
                            sanitized_list.append(sanitize_field_value(item))
                    sanitized[param] = sanitized_list
                else:
                    sanitized[param] = sanitize_field_value(str(value)) if value else value

        return sanitized

    def get_field_suggestions(self, partial: str = "") -> List[Dict[str, Any]]:
        """
        Get field suggestions for autocomplete

        Args:
            partial: Partial field name

        Returns:
            List of field suggestions
        """
        all_fields = [
            # Basic fields
            {"name": "id", "type": "string", "description": "Event ID"},
            {"name": "timestamp", "type": "datetime", "description": "Event timestamp"},
            {"name": "transaction", "type": "string", "description": "Transaction name"},
            {"name": "release", "type": "string", "description": "Release version"},
            {"name": "environment", "type": "string", "description": "Environment"},
            {"name": "user", "type": "string", "description": "User identifier"},
            {"name": "user.email", "type": "string", "description": "User email"},
            {"name": "user.id", "type": "string", "description": "User ID"},
            # Performance fields
            {
                "name": "transaction.duration",
                "type": "duration",
                "description": "Transaction duration",
            },
            {
                "name": "measurements.lcp",
                "type": "duration",
                "description": "Largest Contentful Paint",
            },
            {
                "name": "measurements.fcp",
                "type": "duration",
                "description": "First Contentful Paint",
            },
            {
                "name": "measurements.cls",
                "type": "number",
                "description": "Cumulative Layout Shift",
            },
            {"name": "measurements.fid", "type": "duration", "description": "First Input Delay"},
            # Error fields
            {"name": "error.type", "type": "string", "description": "Error type"},
            {"name": "error.value", "type": "string", "description": "Error message"},
            {"name": "stack.filename", "type": "string", "description": "Filename in stack trace"},
            {"name": "stack.function", "type": "string", "description": "Function in stack trace"},
            # Aggregate functions
            {"name": "count()", "type": "function", "description": "Count of events"},
            {"name": "count_unique(user)", "type": "function", "description": "Unique user count"},
            {
                "name": "avg(transaction.duration)",
                "type": "function",
                "description": "Average duration",
            },
            {
                "name": "p50(transaction.duration)",
                "type": "function",
                "description": "50th percentile duration",
            },
            {
                "name": "p75(transaction.duration)",
                "type": "function",
                "description": "75th percentile duration",
            },
            {
                "name": "p95(transaction.duration)",
                "type": "function",
                "description": "95th percentile duration",
            },
            {
                "name": "p99(transaction.duration)",
                "type": "function",
                "description": "99th percentile duration",
            },
            {
                "name": "max(transaction.duration)",
                "type": "function",
                "description": "Maximum duration",
            },
            {
                "name": "min(transaction.duration)",
                "type": "function",
                "description": "Minimum duration",
            },
            {
                "name": "sum(transaction.duration)",
                "type": "function",
                "description": "Sum of durations",
            },
            {"name": "failure_rate()", "type": "function", "description": "Failure rate"},
            {"name": "apdex()", "type": "function", "description": "Apdex score"},
        ]

        if not partial:
            return all_fields

        partial_lower = partial.lower()
        return [
            field
            for field in all_fields
            if partial_lower in field["name"].lower()
            or partial_lower in field["description"].lower()
        ]

    def get_query_examples(self) -> List[Dict[str, Any]]:
        """
        Get example queries for user guidance

        Returns:
            List of example queries
        """
        return [
            {
                "name": "Slow Transactions",
                "description": "Find transactions slower than 1 second",
                "query": {
                    "fields": [
                        {"field": "transaction"},
                        {"field": "p95(transaction.duration)", "alias": "p95_duration"},
                        {"field": "count()"},
                    ],
                    "query": "transaction.duration:>1s",
                    "orderby": "-p95_duration",
                    "statsPeriod": "24h",
                },
            },
            {
                "name": "Error Frequency",
                "description": "Track error frequency by type",
                "query": {
                    "fields": [
                        {"field": "error.type"},
                        {"field": "count()", "alias": "error_count"},
                        {"field": "count_unique(user)", "alias": "affected_users"},
                    ],
                    "query": "level:error",
                    "orderby": "-error_count",
                    "statsPeriod": "7d",
                },
            },
            {
                "name": "Performance by Page",
                "description": "Analyze performance metrics by page",
                "query": {
                    "fields": [
                        {"field": "transaction"},
                        {"field": "p50(measurements.lcp)", "alias": "lcp_p50"},
                        {"field": "p50(measurements.fcp)", "alias": "fcp_p50"},
                        {"field": "avg(measurements.cls)", "alias": "cls_avg"},
                    ],
                    "query": "event.type:transaction",
                    "orderby": "-lcp_p50",
                    "statsPeriod": "24h",
                },
            },
            {
                "name": "User Impact Analysis",
                "description": "Find issues affecting the most users",
                "query": {
                    "fields": [
                        {"field": "title"},
                        {"field": "count_unique(user)", "alias": "unique_users"},
                        {"field": "count()", "alias": "total_events"},
                    ],
                    "query": "level:error",
                    "orderby": "-unique_users",
                    "statsPeriod": "24h",
                },
            },
        ]


# Dependency injection


async def get_discover_service(
    sentry_client=Depends(get_enhanced_sentry_client),
) -> DiscoverService:
    """Get Discover service instance"""
    return DiscoverService(sentry_client)
