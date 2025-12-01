"""
Performance Client

Fetches performance/transaction data from Sentry including:
- Transaction events
- Performance spans
- Measurements (web vitals, custom metrics)
- Trace data
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from .base_client import BaseDataClient


class PerformanceSpan(BaseModel):
    """Performance span from a transaction event."""

    span_id: str = Field(alias="span_id")
    trace_id: str = Field(alias="trace_id")
    parent_span_id: Optional[str] = Field(None, alias="parent_span_id")
    operation: str  # "db.query", "http.client", etc.
    description: str
    start_timestamp: float
    timestamp: float  # End timestamp
    tags: Dict[str, str] = Field(default_factory=dict)
    data: Dict[str, Any] = Field(default_factory=dict)

    @property
    def duration_ms(self) -> float:
        """Calculate span duration in milliseconds."""
        return (self.timestamp - self.start_timestamp) * 1000

    @property
    def is_slow(self) -> bool:
        """Check if span is considered slow (>1000ms)."""
        return self.duration_ms > 1000

    class Config:
        populate_by_name = True
        extra = "allow"


class TransactionEvent(BaseModel):
    """Transaction event with performance data."""

    event_id: str = Field(alias="id")
    transaction: str  # Transaction name
    start_timestamp: float
    timestamp: float  # End timestamp
    contexts: Dict[str, Any] = Field(default_factory=dict)
    tags: Dict[str, Any] = Field(default_factory=dict)
    spans: List[PerformanceSpan] = Field(default_factory=list)
    measurements: Dict[str, Dict[str, float]] = Field(default_factory=dict)

    @property
    def duration_ms(self) -> float:
        """Calculate transaction duration in milliseconds."""
        return (self.timestamp - self.start_timestamp) * 1000

    @property
    def trace_id(self) -> Optional[str]:
        """Get trace ID from contexts."""
        trace_context = self.contexts.get("trace", {})
        return trace_context.get("trace_id")

    @property
    def slow_spans(self) -> List[PerformanceSpan]:
        """Get spans considered slow (>1000ms)."""
        return [span for span in self.spans if span.is_slow]

    class Config:
        populate_by_name = True
        extra = "allow"


class PerformanceMetrics(BaseModel):
    """Aggregated performance metrics."""

    transaction: str
    count: int
    p50: Optional[float] = None
    p75: Optional[float] = None
    p95: Optional[float] = None
    p99: Optional[float] = None
    failure_rate: Optional[float] = None
    throughput: Optional[float] = None  # Requests per second

    class Config:
        extra = "allow"


class PerformanceClient(BaseDataClient[TransactionEvent]):
    """
    Client for Sentry Performance/Transaction API.

    Endpoints:
    - GET /organizations/{org}/events/ - Query transaction events
    - GET /projects/{org}/{proj}/events/{event_id}/ - Get specific transaction
    - GET /organizations/{org}/discover/query/ - Advanced performance queries

    Example:
        client = PerformanceClient(token="your-token")

        # Get slow transactions
        transactions = await client.get_slow_transactions(
            org_slug="my-org",
            project_slug="my-project",
            threshold_ms=1000
        )

        # Analyze spans for performance issues
        for txn in transactions:
            for span in txn.slow_spans:
                print(f"Slow {span.operation}: {span.description} ({span.duration_ms}ms)")
    """

    async def get_performance_spans(
        self,
        issue_id: str,
    ) -> List[PerformanceSpan]:
        """
        Get performance spans from an issue's latest event.

        Args:
            issue_id: Issue ID

        Returns:
            List of performance spans

        Example:
            spans = await client.get_performance_spans("12345")
            db_spans = [s for s in spans if s.operation.startswith("db.")]
        """
        url = f"/issues/{issue_id}/events/latest/"
        data = await self._request("GET", url)

        # Extract spans from event
        spans_data = data.get("entries", [])
        spans = []
        for entry in spans_data:
            if entry.get("type") == "spans":
                span_list = entry.get("data", [])
                spans.extend([PerformanceSpan.model_validate(span) for span in span_list])

        return spans

    async def get_transaction_event(
        self,
        org_slug: str,
        project_slug: str,
        event_id: str,
    ) -> TransactionEvent:
        """
        Get a specific transaction event.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID

        Returns:
            Transaction event with spans and measurements

        Example:
            event = await client.get_transaction_event("my-org", "my-project", "abc123")
            print(f"Duration: {event.duration_ms}ms")
            print(f"Spans: {len(event.spans)}")
        """
        url = f"/projects/{org_slug}/{project_slug}/events/{event_id}/"
        data = await self._request("GET", url)
        return TransactionEvent.model_validate(data)

    async def get_slow_transactions(
        self,
        org_slug: str,
        project_slug: str,
        threshold_ms: float = 1000,
        limit: int = 50,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> List[TransactionEvent]:
        """
        Query slow transactions based on duration threshold.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            threshold_ms: Minimum duration in milliseconds to consider "slow"
            limit: Maximum results to return
            start: Start time for query range
            end: End time for query range

        Returns:
            List of slow transaction events

        Example:
            slow_txns = await client.get_slow_transactions(
                "my-org",
                "my-project",
                threshold_ms=2000,
                limit=20
            )
        """
        url = f"/organizations/{org_slug}/events/"

        # Build query
        query_parts = [
            "event.type:transaction",
            f"project:{project_slug}",
            f"transaction.duration:>{threshold_ms}ms",
        ]

        params: Dict[str, Any] = {
            "query": " ".join(query_parts),
            "field": [
                "id",
                "transaction",
                "transaction.duration",
                "timestamp",
                "trace",
            ],
            "per_page": min(limit, 100),
            "sort": "-transaction.duration",
        }

        if start:
            params["start"] = start.isoformat()
        if end:
            params["end"] = end.isoformat()

        data = await self._request("GET", url, params=params)

        # Note: This returns a simplified format, not full events with spans
        # For full events, need to fetch individually
        events = data.get("data", [])
        return [self._convert_discover_to_transaction(event) for event in events]

    async def get_transactions_by_operation(
        self,
        org_slug: str,
        project_slug: str,
        operation: str,
        limit: int = 50,
    ) -> List[TransactionEvent]:
        """
        Query transactions by span operation (e.g., "db.query", "http.client").

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            operation: Span operation to filter by
            limit: Maximum results

        Returns:
            List of transactions containing spans with the specified operation

        Example:
            # Find transactions with database queries
            db_txns = await client.get_transactions_by_operation(
                "my-org",
                "my-project",
                "db.query"
            )
        """
        url = f"/organizations/{org_slug}/events/"

        query_parts = [
            "event.type:transaction",
            f"project:{project_slug}",
            f"span.op:{operation}",
        ]

        params: Dict[str, Any] = {
            "query": " ".join(query_parts),
            "field": ["id", "transaction", "transaction.duration", "timestamp"],
            "per_page": min(limit, 100),
            "sort": "-transaction.duration",
        }

        data = await self._request("GET", url, params=params)
        events = data.get("data", [])
        return [self._convert_discover_to_transaction(event) for event in events]

    async def get_performance_metrics(
        self,
        org_slug: str,
        project_slug: str,
        transaction_name: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> List[PerformanceMetrics]:
        """
        Get aggregated performance metrics for transactions.

        Args:
            org_slug: Organization slug
            project_slug: Project slug
            transaction_name: Filter by specific transaction name
            start: Start time for query range
            end: End time for query range

        Returns:
            List of performance metrics (p50, p95, etc.)

        Example:
            metrics = await client.get_performance_metrics("my-org", "my-project")
            for metric in metrics:
                print(f"{metric.transaction}: p95={metric.p95}ms")
        """
        url = f"/organizations/{org_slug}/events/"

        query_parts = [
            "event.type:transaction",
            f"project:{project_slug}",
        ]

        if transaction_name:
            query_parts.append(f'transaction:"{transaction_name}"')

        params: Dict[str, Any] = {
            "query": " ".join(query_parts),
            "field": [
                "transaction",
                "count()",
                "p50(transaction.duration)",
                "p75(transaction.duration)",
                "p95(transaction.duration)",
                "p99(transaction.duration)",
                "failure_rate()",
            ],
            "per_page": 100,
        }

        if start:
            params["start"] = start.isoformat()
        if end:
            params["end"] = end.isoformat()

        data = await self._request("GET", url, params=params)
        events = data.get("data", [])

        return [self._convert_to_metrics(event) for event in events]

    def _convert_discover_to_transaction(self, data: Dict[str, Any]) -> TransactionEvent:
        """Convert Discover API response to TransactionEvent model."""
        # Simplified conversion - some fields may be missing
        return TransactionEvent.model_validate(
            {
                "id": data.get("id", ""),
                "transaction": data.get("transaction", ""),
                "start_timestamp": 0,  # Not available in discover response
                "timestamp": data.get("timestamp", 0),
                "contexts": data.get("contexts", {}),
                "tags": data.get("tags", {}),
                "spans": [],  # Not available in discover response
                "measurements": data.get("measurements", {}),
            }
        )

    def _convert_to_metrics(self, data: Dict[str, Any]) -> PerformanceMetrics:
        """Convert aggregated data to PerformanceMetrics model."""
        return PerformanceMetrics.model_validate(
            {
                "transaction": data.get("transaction", ""),
                "count": data.get("count()", 0),
                "p50": data.get("p50(transaction.duration)"),
                "p75": data.get("p75(transaction.duration)"),
                "p95": data.get("p95(transaction.duration)"),
                "p99": data.get("p99(transaction.duration)"),
                "failure_rate": data.get("failure_rate()"),
            }
        )
