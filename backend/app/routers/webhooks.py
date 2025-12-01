"""
Webhook Router for Sentry event ingestion.

Receives webhook payloads from Sentry, validates signatures,
and queues events for processing.

SECURITY: All payloads are PII-scrubbed before any storage or logging.
"""

import hashlib
import hmac
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.database import get_db
from app.dependencies import require_kb_initialized
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)

# Router with KB initialization check
router = APIRouter(
    prefix="/webhooks",
    tags=["webhooks"],
    dependencies=[Depends(require_kb_initialized)],
)

# In-memory deduplication cache (use Redis in production for multi-instance)
_recent_events: Dict[str, datetime] = {}


class WebhookResponse(BaseModel):
    """Response model for webhook endpoints."""

    status: str
    message: str
    event_id: Optional[str] = None


class SentryWebhookPayload(BaseModel):
    """Pydantic model for Sentry webhook payloads."""

    action: str = Field(..., description="Webhook action type")
    data: Dict[str, Any] = Field(default_factory=dict)
    actor: Optional[Dict[str, Any]] = None
    installation: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"


def verify_sentry_signature(
    payload: bytes,
    signature: str,
    secret: str,
) -> bool:
    """
    Verify Sentry webhook signature using HMAC-SHA256.

    Args:
        payload: Raw request body bytes
        signature: Sentry-Hook-Signature header value
        secret: Client secret from Sentry integration

    Returns:
        True if signature is valid
    """
    if not secret:
        logger.warning("No webhook secret configured - skipping signature verification")
        return True  # Allow in development, but log warning

    expected = hmac.new(
        key=secret.encode("utf-8"),
        msg=payload,
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


def is_duplicate_event(event_id: str, window_minutes: int = 5) -> bool:
    """
    Check if event was recently processed (deduplication).

    Args:
        event_id: Sentry event ID
        window_minutes: Deduplication window in minutes

    Returns:
        True if event was seen recently
    """
    global _recent_events

    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=window_minutes)

    # Clean old entries
    _recent_events = {
        k: v for k, v in _recent_events.items() if v > cutoff
    }

    if event_id in _recent_events:
        return True

    _recent_events[event_id] = now
    return False


async def get_webhook_settings():
    """Dependency for webhook settings."""
    settings = get_settings()
    return {
        "secret": settings.SENTRY_CLIENT_SECRET,
        "dedup_window": settings.WEBHOOK_DEDUP_WINDOW_MINUTES,
        "enabled": settings.ENABLE_KNOWLEDGE_BASE,
    }


@router.post("/sentry/issue", response_model=WebhookResponse)
async def handle_sentry_issue_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    sentry_hook_signature: Optional[str] = Header(None, alias="Sentry-Hook-Signature"),
    sentry_hook_resource: Optional[str] = Header(None, alias="Sentry-Hook-Resource"),
    db: AsyncSession = Depends(get_db),
    webhook_settings: dict = Depends(get_webhook_settings),
):
    """
    Handle Sentry issue webhooks.

    Receives issue.created, issue.resolved, etc. events from Sentry.
    Validates signature, deduplicates, and queues for processing.

    Security:
    - HMAC signature validation (if secret configured)
    - PII scrubbing before any storage/logging
    - Rate limiting via deduplication
    """
    if not webhook_settings["enabled"]:
        return WebhookResponse(
            status="skipped",
            message="Knowledge base disabled",
        )

    # Read raw body for signature verification
    body = await request.body()

    # Verify signature
    if sentry_hook_signature:
        if not verify_sentry_signature(
            body, sentry_hook_signature, webhook_settings["secret"]
        ):
            logger.warning("Invalid webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse payload
    try:
        import json
        raw_payload = json.loads(body)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Scrub PII immediately
    scrubber = get_pii_scrubber()
    payload = scrubber.scrub_dict(raw_payload)

    # Log scrubbed payload (safe for logging)
    logger.info(f"Received webhook: resource={sentry_hook_resource}, action={payload.get('action')}")

    # Extract event ID for deduplication
    event_id = None
    if "data" in payload and "event" in payload["data"]:
        event_id = payload["data"]["event"].get("event_id")
    elif "data" in payload and "issue" in payload["data"]:
        event_id = payload["data"]["issue"].get("id")

    if not event_id:
        # Generate synthetic ID from payload hash
        event_id = hashlib.sha256(body).hexdigest()[:16]

    # Check for duplicates
    if is_duplicate_event(event_id, webhook_settings["dedup_window"]):
        logger.debug(f"Duplicate event skipped: {event_id}")
        return WebhookResponse(
            status="skipped",
            message="Duplicate event",
            event_id=event_id,
        )

    # Queue for background processing
    background_tasks.add_task(
        process_webhook_event,
        payload=payload,
        event_id=event_id,
        resource=sentry_hook_resource,
    )

    return WebhookResponse(
        status="accepted",
        message="Event queued for processing",
        event_id=event_id,
    )


@router.post("/sentry/error", response_model=WebhookResponse)
async def handle_sentry_error_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    sentry_hook_signature: Optional[str] = Header(None, alias="Sentry-Hook-Signature"),
    db: AsyncSession = Depends(get_db),
    webhook_settings: dict = Depends(get_webhook_settings),
):
    """
    Handle Sentry error webhooks (event_alert action).

    Similar to issue webhook but for individual error events.
    """
    if not webhook_settings["enabled"]:
        return WebhookResponse(
            status="skipped",
            message="Knowledge base disabled",
        )

    body = await request.body()

    # Verify signature
    if sentry_hook_signature and webhook_settings["secret"]:
        if not verify_sentry_signature(
            body, sentry_hook_signature, webhook_settings["secret"]
        ):
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        import json
        raw_payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Scrub PII immediately
    scrubber = get_pii_scrubber()
    payload = scrubber.scrub_dict(raw_payload)

    # Extract event ID
    event_id = payload.get("data", {}).get("event", {}).get("event_id")
    if not event_id:
        event_id = hashlib.sha256(body).hexdigest()[:16]

    # Deduplication
    if is_duplicate_event(event_id, webhook_settings["dedup_window"]):
        return WebhookResponse(
            status="skipped",
            message="Duplicate event",
            event_id=event_id,
        )

    background_tasks.add_task(
        process_webhook_event,
        payload=payload,
        event_id=event_id,
        resource="error",
    )

    return WebhookResponse(
        status="accepted",
        message="Event queued for processing",
        event_id=event_id,
    )


async def process_webhook_event(
    payload: Dict[str, Any],
    event_id: str,
    resource: Optional[str],
):
    """
    Background task to process webhook events.

    This function is called asynchronously after the webhook response is sent.
    """
    try:
        from app.services.ingestion_service import get_ingestion_service

        ingestion = get_ingestion_service()
        await ingestion.process_event(payload, event_id, resource)

    except Exception as e:
        logger.error(f"Failed to process webhook event {event_id}: {e}", exc_info=True)
        # Event will be retried via processing queue if configured


@router.get("/health")
async def webhook_health():
    """Health check for webhook endpoint."""
    settings = get_settings()
    return {
        "status": "healthy",
        "knowledge_base_enabled": settings.ENABLE_KNOWLEDGE_BASE,
        "signature_verification": bool(settings.SENTRY_CLIENT_SECRET),
        "recent_events_cached": len(_recent_events),
    }
