"""
Ingestion Service for Dexter Knowledge Base.

Processes incoming error events through the pipeline:
1. Validate and parse payload
2. Scrub PII (if not already done)
3. Extract and clean stack frames
4. Generate embedding
5. Store in database

All data is PII-scrubbed BEFORE storage or embedding generation.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, ValidationError

from app.db.database import AsyncSessionLocal
from app.db.repositories.issues import IssueRepository
from app.services.embedding_formatter import CleanedFrame
from app.services.embeddings_service import get_embeddings_service
from app.services.parser_adapter import get_unified_parser
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


class ProcessedEvent(BaseModel):
    """Result of processing an event."""

    success: bool
    issue_id: Optional[int] = None
    sentry_issue_id: Optional[str] = None
    error: Optional[str] = None
    is_duplicate: bool = False


class EventPayload(BaseModel):
    """Validated event payload structure."""

    action: str = "created"
    data: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        extra = "allow"


class IngestionService:
    """
    Service for ingesting error events into the knowledge base.

    Pipeline:
    1. Parse and validate payload
    2. Check for duplicates
    3. Scrub PII
    4. Extract stack frames
    5. Generate embedding
    6. Store in database
    """

    def __init__(self):
        self.parser = get_unified_parser()
        self.pii_scrubber = get_pii_scrubber()
        self._embeddings = None  # Lazy load

    @property
    def embeddings(self):
        """Lazy load embeddings service."""
        if self._embeddings is None:
            self._embeddings = get_embeddings_service()
        return self._embeddings

    async def process_event(
        self,
        payload: Dict[str, Any],
        event_id: str,
        resource: Optional[str] = None,
    ) -> ProcessedEvent:
        """
        Process a single event through the ingestion pipeline.

        Args:
            payload: PII-scrubbed webhook payload
            event_id: Unique event identifier
            resource: Webhook resource type

        Returns:
            ProcessedEvent with success status and details
        """
        logger.info(f"Processing event {event_id}")

        try:
            # 1. Parse and validate
            try:
                event_payload = EventPayload(**payload)
            except ValidationError as e:
                logger.warning(f"Invalid payload structure: {e}")
                event_payload = EventPayload(data=payload)

            # 2. Extract error data from various payload structures
            error_data = self._extract_error_data(event_payload.data)
            if not error_data:
                logger.debug(f"No error data found in event {event_id}")
                return ProcessedEvent(
                    success=False,
                    error="No error data in payload",
                )

            # 3. Extract identifiers
            sentry_issue_id = self._extract_issue_id(event_payload.data)
            sentry_event_id = error_data.get("event_id", event_id)

            # 4. Check for duplicates (by issue ID)
            async with AsyncSessionLocal() as session:
                repo = IssueRepository(session)

                if sentry_issue_id and await repo.exists_by_sentry_issue_id(sentry_issue_id):
                    logger.debug(f"Duplicate issue skipped: {sentry_issue_id}")
                    return ProcessedEvent(
                        success=True,
                        is_duplicate=True,
                        sentry_issue_id=sentry_issue_id,
                    )

                # 5. Ensure PII is scrubbed (should already be, but double-check)
                error_data = self.pii_scrubber.scrub_dict(error_data)

                # 6. Extract and clean stack frames
                cleaned_frames = self.parser.extract_cleaned_frames(error_data)

                # 7. Generate embedding text
                embedding_text = self.parser.parse_and_format(error_data, scrub_pii=False)

                # 8. Generate embedding
                embedding = None
                processing_status = "completed"
                try:
                    embedding = self.embeddings.encode_single(embedding_text)
                except Exception as e:
                    logger.error(f"Embedding generation failed: {e}")
                    processing_status = "failed"

                # 9. Store in database
                issue = await repo.create(
                    sentry_issue_id=sentry_issue_id or f"synthetic-{event_id}",
                    sentry_event_id=sentry_event_id,
                    error_type=error_data.get("type", "Error"),
                    error_message=error_data.get("value", error_data.get("message", "")),
                    platform=error_data.get("platform"),
                    level=error_data.get("level", "error"),
                    cleaned_stack=[f.model_dump() for f in cleaned_frames],
                    context_tags=self._extract_tags(event_payload.data),
                    embedding=embedding,
                    processing_status=processing_status,
                    sentry_timestamp=self._parse_timestamp(error_data.get("timestamp")),
                )

                await session.commit()

                logger.info(
                    f"Stored issue {issue.id} (sentry_id={sentry_issue_id}, "
                    f"status={processing_status})"
                )

                return ProcessedEvent(
                    success=True,
                    issue_id=issue.id,
                    sentry_issue_id=sentry_issue_id,
                )

        except Exception as e:
            logger.error(f"Failed to process event {event_id}: {e}", exc_info=True)
            return ProcessedEvent(
                success=False,
                error=str(e),
            )

    async def retry_failed(self, limit: int = 100) -> int:
        """
        Retry failed processing jobs.

        Returns:
            Number of successfully reprocessed events
        """
        success_count = 0

        async with AsyncSessionLocal() as session:
            repo = IssueRepository(session)
            failed_issues = await repo.get_failed_processing(limit=limit)

            for issue in failed_issues:
                try:
                    # Regenerate embedding
                    if issue.cleaned_stack:
                        frames = [CleanedFrame(**f) for f in issue.cleaned_stack]
                        from app.services.embedding_formatter import frames_to_embedding_text

                        embedding_text = frames_to_embedding_text(
                            error_type=issue.error_type,
                            error_message=issue.error_message,
                            frames=frames,
                            platform=issue.platform,
                        )
                        embedding = self.embeddings.encode_single(embedding_text)

                        await repo.update(
                            issue.id,
                            embedding=embedding,
                            processing_status="completed",
                        )
                        success_count += 1

                except Exception as e:
                    logger.error(f"Retry failed for issue {issue.id}: {e}")

            await session.commit()

        logger.info(f"Retry completed: {success_count}/{len(failed_issues)} successful")
        return success_count

    def _extract_error_data(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract error data from various payload structures.

        Sentry webhooks can have different structures depending on the event type.
        """
        # Direct error event
        if "event" in data:
            event = data["event"]
            if "exception" in event:
                exc_values = event["exception"].get("values", [])
                if exc_values:
                    return {
                        **exc_values[0],
                        "platform": event.get("platform"),
                        "event_id": event.get("event_id"),
                        "timestamp": event.get("timestamp"),
                    }
            return event

        # Issue with latest event
        if "issue" in data:
            issue = data["issue"]
            return {
                "type": issue.get("type", issue.get("title", "Error")),
                "value": issue.get("culprit", issue.get("metadata", {}).get("value", "")),
                "platform": issue.get("platform"),
            }

        # Direct exception data
        if "exception" in data:
            exc_values = data["exception"].get("values", [])
            if exc_values:
                return exc_values[0]

        # Fallback to data itself if it looks like error data
        if "type" in data or "value" in data or "message" in data:
            return data

        return None

    def _extract_issue_id(self, data: Dict[str, Any]) -> Optional[str]:
        """Extract Sentry issue ID from payload."""
        if "issue" in data:
            issue_id = data["issue"].get("id")
            if issue_id:
                return str(issue_id)

        if "event" in data:
            group_id = data["event"].get("groupID") or data["event"].get("group_id")
            if group_id:
                return str(group_id)

        return None

    def _extract_tags(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and filter safe context tags."""
        tags = {}

        # From event
        if "event" in data:
            event_tags = data["event"].get("tags", {})
            if isinstance(event_tags, list):
                # Convert list of [key, value] to dict
                event_tags = {t[0]: t[1] for t in event_tags if len(t) >= 2}
            tags.update(event_tags)

        # From issue
        if "issue" in data:
            issue = data["issue"]
            if "level" in issue:
                tags["level"] = issue["level"]
            if "platform" in issue:
                tags["platform"] = issue["platform"]

        # Filter out potentially sensitive tags
        sensitive_keys = {
            "user", "email", "ip", "ip_address", "session",
            "auth", "token", "key", "password", "secret",
        }
        return {
            k: v for k, v in tags.items()
            if k.lower() not in sensitive_keys
        }

    def _parse_timestamp(self, timestamp: Any) -> Optional[datetime]:
        """Parse various timestamp formats."""
        if not timestamp:
            return None

        if isinstance(timestamp, datetime):
            return timestamp

        if isinstance(timestamp, (int, float)):
            return datetime.fromtimestamp(timestamp)

        if isinstance(timestamp, str):
            try:
                # ISO format
                return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except ValueError:
                pass

        return None


# Singleton instance
_ingestion_service: Optional[IngestionService] = None


def get_ingestion_service() -> IngestionService:
    """Get singleton ingestion service."""
    global _ingestion_service
    if _ingestion_service is None:
        _ingestion_service = IngestionService()
    return _ingestion_service
