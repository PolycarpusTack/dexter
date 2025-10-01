# Constants for magic values
PBKDF2_ITERATIONS = 100000
MS_PER_SECOND = 1000

# TODO: Refactor duplicate apply_to_request methods
"""
Centralized authentication management for external system connectors.

This module provides a unified interface for managing various authentication methods
including OAuth2, API keys, and token refresh logic with secure credential storage.
"""

import logging
import json
import base64
from typing import Any, Dict, Optional, Literal, List
from datetime import datetime, timedelta
from enum import Enum
import httpx
from pydantic import BaseModel, Field, validator, SecretStr
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os

logger = logging.getLogger(__name__)


class AuthError(Exception):
    """Base exception for authentication operations."""


class TokenExpiredError(AuthError):
    """Raised when a token has expired."""


class AuthMethod(str, Enum):
    """Supported authentication methods."""

    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    BASIC = "basic"
    BEARER = "bearer"
    CUSTOM = "custom"


class AuthCredentials(BaseModel):
    """Base model for authentication credentials."""

    method: AuthMethod = Field(..., description="Authentication method")

    class Config:
        """Pydantic configuration."""

        extra = "allow"  # Allow additional fields


class ApiKeyCredentials(AuthCredentials):
    """API key authentication credentials."""

    method: Literal[AuthMethod.API_KEY] = AuthMethod.API_KEY
    api_key: SecretStr = Field(..., description="API key")
    header_name: str = Field("X-API-Key", description="Header name for API key")

    def apply_to_request(self, request_kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Apply API key to request headers."""
        if "headers" not in request_kwargs:
            request_kwargs["headers"] = {}
        request_kwargs["headers"][self.header_name] = self.api_key.get_secret_value()
        return request_kwargs


class BearerTokenCredentials(AuthCredentials):
    """Bearer token authentication credentials."""

    method: Literal[AuthMethod.BEARER] = AuthMethod.BEARER
    token: SecretStr = Field(..., description="Bearer token")

    def apply_to_request(self, request_kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Apply bearer token to request headers."""
        if "headers" not in request_kwargs:
            request_kwargs["headers"] = {}
        request_kwargs["headers"]["Authorization"] = f"Bearer {self.token.get_secret_value()}"
        return request_kwargs


class BasicAuthCredentials(AuthCredentials):
    """Basic authentication credentials."""

    method: Literal[AuthMethod.BASIC] = AuthMethod.BASIC
    username: str = Field(..., description="Username")
    password: SecretStr = Field(..., description="Password")

    def apply_to_request(self, request_kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Apply basic auth to request."""
        credentials = f"{self.username}:{self.password.get_secret_value()}"
        encoded = base64.b64encode(credentials.encode()).decode()

        if "headers" not in request_kwargs:
            request_kwargs["headers"] = {}
        request_kwargs["headers"]["Authorization"] = f"Basic {encoded}"
        return request_kwargs


class OAuth2Credentials(AuthCredentials):
    """OAuth2 authentication credentials."""

    method: Literal[AuthMethod.OAUTH2] = AuthMethod.OAUTH2

    # Client credentials
    client_id: str = Field(..., description="OAuth2 client ID")
    client_secret: SecretStr = Field(..., description="OAuth2 client secret")

    # Token endpoint
    token_url: str = Field(..., description="Token endpoint URL")

    # Optional parameters
    scope: Optional[str] = Field(None, description="OAuth2 scope")
    audience: Optional[str] = Field(None, description="OAuth2 audience")
    grant_type: str = Field("client_credentials", description="OAuth2 grant type")

    # Current token data
    access_token: Optional[SecretStr] = Field(None, description="Current access token")
    refresh_token: Optional[SecretStr] = Field(None, description="Refresh token")
    expires_at: Optional[datetime] = Field(None, description="Token expiration time")

    @validator("expires_at", pre=True)
    def parse_expires_at(cls, v) -> None:
        """Parse expires_at from various formats."""
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    def is_token_expired(self, buffer_seconds: int = 60) -> bool:
        """Check if token is expired or will expire soon."""
        if not self.expires_at:
            return True
        return datetime.utcnow() + timedelta(seconds=buffer_seconds) >= self.expires_at

    def apply_to_request(self, request_kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Apply OAuth2 token to request headers."""
        if not self.access_token:
            raise AuthError("No access token available")

        if "headers" not in request_kwargs:
            request_kwargs["headers"] = {}
        request_kwargs["headers"][
            "Authorization"
        ] = f"Bearer {self.access_token.get_secret_value()}"
        return request_kwargs


class CredentialStore:
    """
    Secure credential storage with encryption.

    This class handles encrypted storage of credentials using Fernet symmetric encryption.
    """

    def __init__(self, encryption_key: Optional[bytes] = None) -> None:
        """
        Initialize credential store.

        Args:
            encryption_key: 32-byte encryption key, or None to generate
        """
        if encryption_key is None:
            # Generate a key from environment or create new
            key_source = os.environ.get("DEXTER_ENCRYPTION_KEY", "").encode()
            if not key_source:
                # Generate a new key
                self.fernet = Fernet(Fernet.generate_key())
                logger.warning(
                    "Generated new encryption key. Set DEXTER_ENCRYPTION_KEY for persistence."
                )
            else:
                # Derive key from environment variable
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=b"dexter-auth-salt",  # Fixed salt for deterministic key
                    iterations=MS_PER_SECOND00,
                )
                key = base64.urlsafe_b64encode(kdf.derive(key_source))
                self.fernet = Fernet(key)
        else:
            self.fernet = Fernet(encryption_key)

        self._store: Dict[str, bytes] = {}

    def store_credentials(self, key: str, credentials: AuthCredentials) -> None:
        """
        Store encrypted credentials.

        Args:
            key: Storage key
            credentials: Credentials to store
        """
        # Serialize credentials
        data = credentials.json()

        # Encrypt
        encrypted = self.fernet.encrypt(data.encode())

        # Store
        self._store[key] = encrypted
        logger.debug(f"Stored credentials for key: {key}")

    def retrieve_credentials(self, key: str, credential_class: type) -> Optional[AuthCredentials]:
        """
        Retrieve and decrypt credentials.

        Args:
            key: Storage key
            credential_class: Expected credential class

        Returns:
            Decrypted credentials or None if not found
        """
        if key not in self._store:
            return None

        try:
            # Decrypt
            encrypted = self._store[key]
            decrypted = self.fernet.decrypt(encrypted)

            # Deserialize
            data = json.loads(decrypted.decode())
            return credential_class(**data)

        except Exception as e:
            logger.error(f"Failed to retrieve credentials for {key}: {e}")
            return None

    def delete_credentials(self, key: str) -> None:
        """Delete stored credentials."""
        if key in self._store:
            del self._store[key]
            logger.debug(f"Deleted credentials for key: {key}")


class AuthManager:
    """
    Centralized authentication manager for handling various auth methods.

    This class manages authentication for external system connectors,
    including token refresh, credential storage, and request modification.
    """

    def __init__(self, credential_store: Optional[CredentialStore] = None) -> None:
        """
        Initialize authentication manager.

        Args:
            credential_store: Optional credential store for secure storage
        """
        self.credential_store = credential_store or CredentialStore()
        self._credentials: Dict[str, AuthCredentials] = {}
        self._http_client = httpx.AsyncClient()

        logger.info("Initialized authentication manager")

    def set_credentials(self, service_name: str, credentials: AuthCredentials) -> None:
        """
        Set credentials for a service.

        Args:
            service_name: Name of the service
            credentials: Authentication credentials
        """
        self._credentials[service_name] = credentials

        # Store encrypted copy
        self.credential_store.store_credentials(service_name, credentials)

        logger.info(f"Set {credentials.method} credentials for service: {service_name}")

    def get_credentials(self, service_name: str) -> Optional[AuthCredentials]:
        """
        Get credentials for a service.

        Args:
            service_name: Name of the service

        Returns:
            Credentials or None if not found
        """
        # Check in-memory first
        if service_name in self._credentials:
            return self._credentials[service_name]

        # Try to load from store
        for cred_class in [
            OAuth2Credentials,
            ApiKeyCredentials,
            BearerTokenCredentials,
            BasicAuthCredentials,
        ]:
            creds = self.credential_store.retrieve_credentials(service_name, cred_class)
            if creds:
                self._credentials[service_name] = creds
                return creds

        return None

    async def apply_auth(
        self, request_kwargs: Dict[str, Any], service_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Apply authentication to a request.

        Args:
            request_kwargs: Request keyword arguments
            service_name: Optional service name to get credentials for

        Returns:
            Modified request kwargs with authentication

        Raises:
            AuthError: If authentication fails
        """
        # Get the first available credentials if no service specified
        if service_name:
            credentials = self.get_credentials(service_name)
            if not credentials:
                raise AuthError(f"No credentials found for service: {service_name}")
        else:
            if not self._credentials:
                raise AuthError("No credentials available")
            credentials = next(iter(self._credentials.values()))

        # Handle OAuth2 token refresh
        if isinstance(credentials, OAuth2Credentials):
            if credentials.is_token_expired():
                logger.info("OAuth2 token expired, refreshing...")
                credentials = await self._refresh_oauth2_token(credentials)

                # Update stored credentials
                if service_name:
                    self.set_credentials(service_name, credentials)

        # Apply credentials to request
        if hasattr(credentials, "apply_to_request"):
            return credentials.apply_to_request(request_kwargs)
        else:
            raise AuthError(f"Unsupported credential type: {type(credentials)}")

    async def _refresh_oauth2_token(self, credentials: OAuth2Credentials) -> OAuth2Credentials:
        """
        Refresh an OAuth2 token.

        Args:
            credentials: OAuth2 credentials with expired token

        Returns:
            Updated credentials with new token

        Raises:
            TokenExpiredError: If token refresh fails
        """
        try:
            # Prepare token request
            data = {
                "grant_type": credentials.grant_type,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret.get_secret_value(),
            }

            if credentials.scope:
                data["scope"] = credentials.scope

            if credentials.audience:
                data["audience"] = credentials.audience

            # Use refresh token if available and grant type supports it
            if credentials.refresh_token and credentials.grant_type == "refresh_token":
                data["refresh_token"] = credentials.refresh_token.get_secret_value()

            # Make token request
            response = await self._http_client.post(
                credentials.token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            response.raise_for_status()
            token_data = response.json()

            # Update credentials
            credentials.access_token = SecretStr(token_data["access_token"])

            if "refresh_token" in token_data:
                credentials.refresh_token = SecretStr(token_data["refresh_token"])

            # Calculate expiration
            if "expires_in" in token_data:
                credentials.expires_at = datetime.utcnow() + timedelta(
                    seconds=token_data["expires_in"]
                )
            else:
                # Default to 1 hour if not specified
                credentials.expires_at = datetime.utcnow() + timedelta(hours=1)

            logger.info(
                f"Successfully refreshed OAuth2 token (expires at {credentials.expires_at})"
            )
            return credentials

        except Exception as e:
            logger.error(f"Failed to refresh OAuth2 token: {e}")
            raise TokenExpiredError(f"Token refresh failed: {str(e)}") from e

    async def validate_credentials(self, service_name: str) -> bool:
        """
        Validate that credentials are working.

        Args:
            service_name: Name of the service

        Returns:
            True if credentials are valid
        """
        credentials = self.get_credentials(service_name)
        if not credentials:
            return False

        # For OAuth2, check if token needs refresh
        if isinstance(credentials, OAuth2Credentials):
            try:
                if credentials.is_token_expired():
                    await self._refresh_oauth2_token(credentials)
                return True
            except Exception:
                return False

        # For other types, assume valid if present
        return True

    def remove_credentials(self, service_name: str) -> None:
        """
        Remove credentials for a service.

        Args:
            service_name: Name of the service
        """
        if service_name in self._credentials:
            del self._credentials[service_name]

        self.credential_store.delete_credentials(service_name)
        logger.info(f"Removed credentials for service: {service_name}")

    def list_services(self) -> List[str]:
        """
        List all services with stored credentials.

        Returns:
            List of service names
        """
        return list(self._credentials.keys())

    async def close(self) -> None:
        """Clean up resources."""
        await self._http_client.aclose()
        logger.info("Closed authentication manager")

    def __repr__(self) -> str:
        """String representation of the auth manager."""
        return f"<AuthManager(services={len(self._credentials)})>"
