"""
Integration framework for external system connections.

This module provides a base framework for integrating with external systems,
including authentication management, rate limiting, retry logic, and connection pooling.
"""

from .base_connector import (
    BaseConnector,
    ConnectorError,
    AuthenticationError,
    RateLimitError,
    ConnectionPoolError,
    ConnectorConfig,
    ConnectorMetrics,
    ConnectorHealth,
)
from .connector_registry import (
    ConnectorRegistry,
    ConnectorRegistryError,
    ConnectorNotFoundError,
    connector_registry,
)
from .auth_manager import (
    AuthManager,
    AuthMethod,
    AuthCredentials,
    OAuth2Credentials,
    ApiKeyCredentials,
    AuthError,
    TokenExpiredError,
)

__all__ = [
    # Base connector
    "BaseConnector",
    "ConnectorError",
    "AuthenticationError",
    "RateLimitError",
    "ConnectionPoolError",
    "ConnectorConfig",
    "ConnectorMetrics",
    "ConnectorHealth",
    # Registry
    "ConnectorRegistry",
    "ConnectorRegistryError",
    "ConnectorNotFoundError",
    "connector_registry",
    # Auth manager
    "AuthManager",
    "AuthMethod",
    "AuthCredentials",
    "OAuth2Credentials",
    "ApiKeyCredentials",
    "AuthError",
    "TokenExpiredError",
]
