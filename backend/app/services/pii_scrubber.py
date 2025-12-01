"""
PII Scrubber for Dexter.

Scrubs personally identifiable information from error data BEFORE storage or embedding.

CRITICAL: This must be called before:
- Storing to database
- Generating embeddings
- Logging payloads
"""

import hashlib
import logging
import re
from typing import Any, Dict, List, Optional, Set

from app.models.analysis import PIIScrubResult

logger = logging.getLogger(__name__)


class PIIScrubber:
    """
    Scrubs PII from error data BEFORE storage or embedding.

    This class provides comprehensive PII detection and scrubbing for:
    - Email addresses
    - IP addresses
    - JWT tokens
    - Authorization headers
    - API keys
    - Passwords
    - User identifiers
    - Credit card numbers
    - Phone numbers
    - Social security numbers
    """

    # Regex patterns for PII detection
    EMAIL_PATTERN = re.compile(
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", re.IGNORECASE
    )
    IP_V4_PATTERN = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
    IP_V6_PATTERN = re.compile(
        r"\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b"
        r"|"
        r"\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b"
        r"|"
        r"\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b",
        re.IGNORECASE,
    )
    JWT_PATTERN = re.compile(
        r"eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*"
    )
    AUTH_HEADER_PATTERN = re.compile(
        r"(Bearer|Basic|Digest|NTLM)\s+[a-zA-Z0-9+/=_-]+", re.IGNORECASE
    )
    API_KEY_PATTERN = re.compile(
        r"(api[_-]?key|apikey|api[_-]?secret|secret[_-]?key|access[_-]?token)"
        r"\s*[:=]\s*['\"]?([a-zA-Z0-9_-]{16,})['\"]?",
        re.IGNORECASE,
    )
    CREDIT_CARD_PATTERN = re.compile(
        r"\b(?:\d{4}[- ]?){3}\d{4}\b"
    )
    PHONE_PATTERN = re.compile(
        r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    )
    SSN_PATTERN = re.compile(r"\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b")
    UUID_PATTERN = re.compile(
        r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
    )

    # Fields to always scrub completely
    SCRUB_FIELDS: Set[str] = {
        "user_id",
        "userid",
        "username",
        "email",
        "mail",
        "ip_address",
        "ip",
        "ipaddress",
        "remote_addr",
        "x-forwarded-for",
        "x-real-ip",
        "authorization",
        "auth",
        "cookie",
        "cookies",
        "set-cookie",
        "x-auth-token",
        "x-api-key",
        "api_key",
        "apikey",
        "api-key",
        "password",
        "passwd",
        "pwd",
        "secret",
        "secret_key",
        "secretkey",
        "token",
        "access_token",
        "refresh_token",
        "bearer",
        "private_key",
        "privatekey",
        "ssn",
        "social_security",
        "credit_card",
        "creditcard",
        "card_number",
        "cvv",
        "phone",
        "phone_number",
        "mobile",
        "address",
        "street",
        "zip",
        "zipcode",
        "postal_code",
        "dob",
        "date_of_birth",
        "birthdate",
        "session_id",
        "sessionid",
        "csrf_token",
        "csrftoken",
    }

    # Redaction labels
    REDACTED_EMAIL = "[EMAIL_REDACTED]"
    REDACTED_IP = "[IP_REDACTED]"
    REDACTED_TOKEN = "[TOKEN_REDACTED]"
    REDACTED_AUTH = "[AUTH_REDACTED]"
    REDACTED_KEY = "[KEY_REDACTED]"
    REDACTED_CARD = "[CARD_REDACTED]"
    REDACTED_PHONE = "[PHONE_REDACTED]"
    REDACTED_SSN = "[SSN_REDACTED]"
    REDACTED_UUID = "[UUID_REDACTED]"
    REDACTED_FIELD = "[FIELD_REDACTED]"

    def __init__(self, salt: Optional[str] = None):
        """
        Initialize PII scrubber.

        Args:
            salt: Salt for hashing values (for trackable anonymization)
        """
        self.salt = salt or "dexter-pii-salt"
        self._scrub_count = 0
        self._fields_scrubbed: List[str] = []

    def scrub_dict(
        self,
        data: Dict[str, Any],
        depth: int = 0,
        max_depth: int = 10,
    ) -> Dict[str, Any]:
        """
        Recursively scrub PII from a dictionary.

        Args:
            data: Dictionary to scrub
            depth: Current recursion depth
            max_depth: Maximum recursion depth to prevent infinite loops

        Returns:
            Scrubbed dictionary
        """
        if depth > max_depth:
            logger.warning(f"Max depth {max_depth} reached in PII scrubbing")
            return data

        scrubbed: Dict[str, Any] = {}

        for key, value in data.items():
            key_lower = key.lower().replace("-", "_").replace(" ", "_")

            # Check if field should be scrubbed entirely
            if key_lower in self.SCRUB_FIELDS:
                if value is not None:
                    scrubbed[key] = self.hash_value(str(value))
                    self._scrub_count += 1
                else:
                    scrubbed[key] = None
            elif isinstance(value, dict):
                scrubbed[key] = self.scrub_dict(value, depth + 1, max_depth)
            elif isinstance(value, list):
                scrubbed[key] = self._scrub_list(value, depth + 1, max_depth)
            elif isinstance(value, str):
                scrubbed[key] = self.scrub_string(value)
            else:
                scrubbed[key] = value

        return scrubbed

    def _scrub_list(
        self,
        items: List[Any],
        depth: int,
        max_depth: int,
    ) -> List[Any]:
        """Scrub PII from list items."""
        scrubbed = []
        for item in items:
            if isinstance(item, dict):
                scrubbed.append(self.scrub_dict(item, depth, max_depth))
            elif isinstance(item, str):
                scrubbed.append(self.scrub_string(item))
            elif isinstance(item, list):
                scrubbed.append(self._scrub_list(item, depth + 1, max_depth))
            else:
                scrubbed.append(item)
        return scrubbed

    def scrub_string(self, text: str) -> str:
        """
        Scrub PII patterns from a string.

        Args:
            text: String to scrub

        Returns:
            Scrubbed string with PII replaced by labels
        """
        if not text:
            return text

        original = text

        # Replace patterns in order of specificity
        text = self.JWT_PATTERN.sub(self.REDACTED_TOKEN, text)
        text = self.AUTH_HEADER_PATTERN.sub(self.REDACTED_AUTH, text)
        text = self.API_KEY_PATTERN.sub(r"\1=" + self.REDACTED_KEY, text)
        text = self.EMAIL_PATTERN.sub(self.REDACTED_EMAIL, text)
        text = self.CREDIT_CARD_PATTERN.sub(self.REDACTED_CARD, text)
        text = self.SSN_PATTERN.sub(self.REDACTED_SSN, text)
        text = self.PHONE_PATTERN.sub(self.REDACTED_PHONE, text)
        text = self.IP_V4_PATTERN.sub(self.REDACTED_IP, text)
        text = self.IP_V6_PATTERN.sub(self.REDACTED_IP, text)
        # UUIDs might be user IDs or session IDs - scrub them
        text = self.UUID_PATTERN.sub(self.REDACTED_UUID, text)

        if text != original:
            self._scrub_count += 1

        return text

    def scrub_stack_frames(self, frames: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Scrub PII from stack frame context_line fields.

        Args:
            frames: List of stack frame dictionaries

        Returns:
            Scrubbed frames
        """
        scrubbed = []
        for frame in frames:
            scrubbed_frame = frame.copy()

            # Scrub context_line
            if "context_line" in scrubbed_frame:
                scrubbed_frame["context_line"] = self.scrub_string(
                    scrubbed_frame.get("context_line", "") or ""
                )

            # Scrub pre_context lines
            if "pre_context" in scrubbed_frame and scrubbed_frame["pre_context"]:
                scrubbed_frame["pre_context"] = [
                    self.scrub_string(line or "") for line in scrubbed_frame["pre_context"]
                ]

            # Scrub post_context lines
            if "post_context" in scrubbed_frame and scrubbed_frame["post_context"]:
                scrubbed_frame["post_context"] = [
                    self.scrub_string(line or "") for line in scrubbed_frame["post_context"]
                ]

            # Scrub vars if present
            if "vars" in scrubbed_frame and isinstance(scrubbed_frame["vars"], dict):
                scrubbed_frame["vars"] = self.scrub_dict(scrubbed_frame["vars"])

            scrubbed.append(scrubbed_frame)

        return scrubbed

    def hash_value(self, value: str) -> str:
        """
        One-way hash for values that need to be tracked but not revealed.

        Args:
            value: Value to hash

        Returns:
            Truncated SHA-256 hash
        """
        return hashlib.sha256(f"{self.salt}{value}".encode()).hexdigest()[:16]

    def get_scrub_count(self) -> int:
        """Get the number of scrubbing operations performed."""
        return self._scrub_count

    def reset_scrub_count(self) -> None:
        """Reset the scrub count."""
        self._scrub_count = 0
        self._fields_scrubbed = []

    def scrub_with_tracking(self, data: Dict[str, Any]) -> PIIScrubResult:
        """
        Scrub PII and track what was removed.

        This method scrubs PII from the data and provides detailed tracking
        of what fields were modified.

        Args:
            data: Dictionary to scrub

        Returns:
            PIIScrubResult with scrubbed data and tracking info
        """
        # Reset tracking
        self.reset_scrub_count()

        # Deep copy and scrub
        scrubbed_data = self.scrub_dict(data)

        # Compare to find what changed
        fields_scrubbed = []
        self._compare_dicts_for_tracking(data, scrubbed_data, "", fields_scrubbed)

        pii_detected = len(fields_scrubbed) > 0 or self._scrub_count > 0

        return PIIScrubResult(
            scrubbed_data=scrubbed_data,
            pii_detected=pii_detected,
            fields_scrubbed=fields_scrubbed,
            scrub_count=self._scrub_count,
        )

    def _compare_dicts_for_tracking(
        self,
        original: Dict[str, Any],
        scrubbed: Dict[str, Any],
        path: str,
        fields_scrubbed: List[str],
    ) -> None:
        """
        Recursively compare original and scrubbed data to track changes.

        Args:
            original: Original data before scrubbing
            scrubbed: Scrubbed data
            path: Current path in the dict hierarchy
            fields_scrubbed: List to accumulate scrubbed field paths
        """
        for key, original_value in original.items():
            current_path = f"{path}.{key}" if path else key
            scrubbed_value = scrubbed.get(key)

            if isinstance(original_value, dict) and isinstance(scrubbed_value, dict):
                # Recurse into nested dicts
                self._compare_dicts_for_tracking(
                    original_value, scrubbed_value, current_path, fields_scrubbed
                )
            elif isinstance(original_value, list) and isinstance(scrubbed_value, list):
                # Compare lists element by element
                for i, (orig_item, scrub_item) in enumerate(
                    zip(original_value, scrubbed_value)
                ):
                    if isinstance(orig_item, dict) and isinstance(scrub_item, dict):
                        self._compare_dicts_for_tracking(
                            orig_item, scrub_item, f"{current_path}[{i}]", fields_scrubbed
                        )
                    elif orig_item != scrub_item:
                        fields_scrubbed.append(f"{current_path}[{i}]")
            elif original_value != scrubbed_value:
                # Value changed - PII was scrubbed
                fields_scrubbed.append(current_path)


# Singleton instance
_pii_scrubber: Optional[PIIScrubber] = None


def get_pii_scrubber(salt: Optional[str] = None) -> PIIScrubber:
    """
    Get singleton PII scrubber instance.

    Args:
        salt: Optional salt override (only used on first call)

    Returns:
        PIIScrubber instance
    """
    global _pii_scrubber
    if _pii_scrubber is None:
        _pii_scrubber = PIIScrubber(salt=salt)
    return _pii_scrubber


def scrub_for_logging(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience function to scrub data before logging.

    Args:
        data: Data to scrub

    Returns:
        Scrubbed data safe for logging
    """
    return get_pii_scrubber().scrub_dict(data)
