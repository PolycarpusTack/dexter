"""
Unit tests for Webhook Router.

Tests webhook signature validation and event handling.
"""

import hashlib
import hmac
import json

import pytest

from app.routers.webhooks import (
    is_duplicate_event,
    verify_sentry_signature,
    _recent_events,
)


class TestSignatureVerification:
    """Tests for HMAC signature verification."""

    def test_valid_signature(self):
        """Test valid signature verification."""
        payload = b'{"action": "created", "data": {}}'
        secret = "test-secret"

        # Generate valid signature
        signature = hmac.new(
            key=secret.encode("utf-8"),
            msg=payload,
            digestmod=hashlib.sha256,
        ).hexdigest()

        assert verify_sentry_signature(payload, signature, secret)

    def test_invalid_signature(self):
        """Test invalid signature rejection."""
        payload = b'{"action": "created", "data": {}}'
        secret = "test-secret"

        assert not verify_sentry_signature(payload, "invalid-signature", secret)

    def test_empty_secret_allows_all(self):
        """Test that empty secret allows all (dev mode)."""
        payload = b'{"action": "created"}'
        assert verify_sentry_signature(payload, "any-signature", "")

    def test_tampered_payload_fails(self):
        """Test that tampered payload fails verification."""
        original_payload = b'{"action": "created"}'
        tampered_payload = b'{"action": "resolved"}'
        secret = "test-secret"

        signature = hmac.new(
            key=secret.encode("utf-8"),
            msg=original_payload,
            digestmod=hashlib.sha256,
        ).hexdigest()

        assert not verify_sentry_signature(tampered_payload, signature, secret)


class TestDeduplication:
    """Tests for event deduplication."""

    def setup_method(self):
        """Clear dedup cache before each test."""
        _recent_events.clear()

    def test_first_event_not_duplicate(self):
        """Test that first event is not duplicate."""
        assert not is_duplicate_event("event-1")

    def test_same_event_is_duplicate(self):
        """Test that same event ID is duplicate."""
        event_id = "event-2"
        assert not is_duplicate_event(event_id)
        assert is_duplicate_event(event_id)

    def test_different_events_not_duplicate(self):
        """Test that different events are not duplicates."""
        assert not is_duplicate_event("event-a")
        assert not is_duplicate_event("event-b")
        assert not is_duplicate_event("event-c")

    def test_duplicate_within_window(self):
        """Test duplicate detection within time window."""
        event_id = "event-window"

        # First call - not duplicate
        assert not is_duplicate_event(event_id, window_minutes=5)

        # Immediate second call - duplicate
        assert is_duplicate_event(event_id, window_minutes=5)
