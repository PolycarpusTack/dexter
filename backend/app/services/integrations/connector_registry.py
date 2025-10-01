"""
Connector registry for managing external system connectors.

This module provides a registry system for discovering, instantiating, and managing
the lifecycle of external system connectors.
"""

import logging
from typing import Dict, List, Type, Optional, Any, Set
import asyncio
from datetime import datetime

from .base_connector import BaseConnector, ConnectorConfig, ConnectorHealth
from .auth_manager import AuthManager

logger = logging.getLogger(__name__)


class ConnectorRegistryError(Exception):
    """Base exception for connector registry operations."""


class ConnectorNotFoundError(ConnectorRegistryError):
    """Raised when a requested connector is not found."""


class ConnectorRegistry:
    """
    Central registry for all external system connectors.

    This class manages the lifecycle of connectors, including registration,
    discovery, configuration management, and health monitoring.
    """

    def __init__(self) -> None:
        """Initialize the connector registry."""
        self._connector_types: Dict[str, Type[BaseConnector]] = {}
        self._instances: Dict[str, BaseConnector] = {}
        self._configs: Dict[str, ConnectorConfig] = {}
        self._auth_managers: Dict[str, AuthManager] = {}
        self._health_status: Dict[str, Dict[str, Any]] = {}
        self._dependencies: Dict[str, Set[str]] = {}
        self._lock = asyncio.Lock()

        logger.info("Initialized connector registry")

    def register_connector(
        self,
        connector_type: str,
        connector_class: Type[BaseConnector],
        default_config: Optional[ConnectorConfig] = None,
    ) -> None:
        """
        Register a new connector type.

        Args:
            connector_type: Unique identifier for the connector type
            connector_class: The connector class implementation
            default_config: Optional default configuration

        Raises:
            ConnectorRegistryError: If connector is already registered
        """
        if connector_type in self._connector_types:
            raise ConnectorRegistryError(f"Connector type '{connector_type}' is already registered")

        # Validate that the class implements BaseConnector
        if not issubclass(connector_class, BaseConnector):
            raise ConnectorRegistryError(f"Connector class must inherit from BaseConnector")

        # Register the connector
        self._connector_types[connector_type] = connector_class

        # Store default config if provided
        if default_config:
            self._configs[connector_type] = default_config

        # Initialize empty dependencies
        self._dependencies[connector_type] = set()

        logger.info(f"Registered connector type: {connector_type}")

    def unregister_connector(self, connector_type: str) -> None:
        """
        Unregister a connector type and clean up its resources.

        Args:
            connector_type: The connector type to unregister
        """
        if connector_type in self._connector_types:
            del self._connector_types[connector_type]

        # Clean up instance if exists
        if connector_type in self._instances:
            # Note: Should await close() in an async context
            del self._instances[connector_type]

        # Clean up other references
        for storage in [
            self._configs,
            self._auth_managers,
            self._health_status,
            self._dependencies,
        ]:
            if connector_type in storage:
                del storage[connector_type]

        logger.info(f"Unregistered connector type: {connector_type}")

    def add_dependency(self, connector_type: str, depends_on: str) -> None:
        """
        Add a dependency between connectors.

        Args:
            connector_type: The connector that has the dependency
            depends_on: The connector it depends on
        """
        if connector_type not in self._connector_types:
            raise ConnectorNotFoundError(f"Connector '{connector_type}' not found")

        if depends_on not in self._connector_types:
            raise ConnectorNotFoundError(f"Dependency connector '{depends_on}' not found")

        self._dependencies[connector_type].add(depends_on)
        logger.debug(f"Added dependency: {connector_type} -> {depends_on}")

    async def get_connector(
        self,
        connector_type: str,
        config: Optional[ConnectorConfig] = None,
        auth_manager: Optional[AuthManager] = None,
    ) -> BaseConnector:
        """
        Get a connector instance (lazy instantiation).

        Args:
            connector_type: Type of connector to get
            config: Optional configuration override
            auth_manager: Optional authentication manager

        Returns:
            Connector instance

        Raises:
            ConnectorNotFoundError: If connector type is not registered
            ConnectorRegistryError: If instantiation fails
        """
        if connector_type not in self._connector_types:
            raise ConnectorNotFoundError(
                f"Connector type '{connector_type}' not found. "
                f"Available types: {list(self._connector_types.keys())}"
            )

        async with self._lock:
            # Check if instance already exists
            if connector_type in self._instances:
                return self._instances[connector_type]

            # Ensure dependencies are initialized first
            for dep in self._dependencies.get(connector_type, set()):
                if dep not in self._instances:
                    await self.get_connector(dep)

            # Get configuration
            if config is None:
                config = self._configs.get(connector_type)
                if config is None:
                    raise ConnectorRegistryError(
                        f"No configuration provided for connector '{connector_type}'"
                    )

            # Get or create auth manager
            if auth_manager is None:
                auth_manager = self._auth_managers.get(connector_type)

            # Instantiate connector
            try:
                connector_class = self._connector_types[connector_type]
                instance = connector_class(config=config, auth_manager=auth_manager)

                # Validate connection
                logger.info(f"Validating connection for {connector_type}...")
                if await instance.validate_connection():
                    logger.info(f"Connection validated for {connector_type}")
                else:
                    logger.warning(f"Connection validation failed for {connector_type}")

                # Store instance
                self._instances[connector_type] = instance

                # Store auth manager if provided
                if auth_manager:
                    self._auth_managers[connector_type] = auth_manager

                logger.info(f"Instantiated connector: {connector_type}")
                return instance

            except Exception as e:
                raise ConnectorRegistryError(
                    f"Failed to instantiate connector '{connector_type}': {str(e)}"
                ) from e

    def set_config(self, connector_type: str, config: ConnectorConfig) -> None:
        """
        Set or update configuration for a connector type.

        Args:
            connector_type: The connector type
            config: The configuration
        """
        if connector_type not in self._connector_types:
            raise ConnectorNotFoundError(f"Connector type '{connector_type}' not found")

        self._configs[connector_type] = config

        # If instance exists, it will be recreated on next get
        if connector_type in self._instances:
            logger.warning(
                f"Configuration updated for {connector_type}. "
                "Existing instance will be replaced on next access."
            )

    def set_auth_manager(self, connector_type: str, auth_manager: AuthManager) -> None:
        """
        Set authentication manager for a connector type.

        Args:
            connector_type: The connector type
            auth_manager: The authentication manager
        """
        if connector_type not in self._connector_types:
            raise ConnectorNotFoundError(f"Connector type '{connector_type}' not found")

        self._auth_managers[connector_type] = auth_manager

        # Update existing instance if present
        if connector_type in self._instances:
            self._instances[connector_type].auth_manager = auth_manager
            logger.info(f"Updated auth manager for {connector_type}")

    def list_connector_types(self) -> List[str]:
        """
        List all registered connector types.

        Returns:
            List of registered connector types
        """
        return list(self._connector_types.keys())

    def list_active_connectors(self) -> List[str]:
        """
        List all active (instantiated) connectors.

        Returns:
            List of active connector types
        """
        return list(self._instances.keys())

    async def get_capabilities(self, connector_type: str) -> Dict[str, Any]:
        """
        Get capabilities for a specific connector.

        Args:
            connector_type: The connector type

        Returns:
            Connector capabilities
        """
        connector = await self.get_connector(connector_type)
        return await connector.get_capabilities()

    async def health_check(self, connector_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Perform health check on connectors.

        Args:
            connector_type: Specific connector to check, or None for all

        Returns:
            Health check results
        """
        health_results = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_health": ConnectorHealth.HEALTHY,
            "connectors": {},
        }

        # Determine which connectors to check
        if connector_type:
            if connector_type not in self._instances:
                raise ConnectorNotFoundError(
                    f"Connector '{connector_type}' not found or not active"
                )
            connector_types = [connector_type]
        else:
            connector_types = list(self._instances.keys())

        # Run health checks
        unhealthy_count = 0
        degraded_count = 0

        for conn_type in connector_types:
            try:
                connector = self._instances[conn_type]
                health_data = await connector.health_check()

                # Store health data
                self._health_status[conn_type] = health_data
                health_results["connectors"][conn_type] = health_data

                # Track overall health
                if health_data["health"] == ConnectorHealth.UNHEALTHY:
                    unhealthy_count += 1
                elif health_data["health"] == ConnectorHealth.DEGRADED:
                    degraded_count += 1

            except Exception as e:
                logger.error(f"Health check failed for {conn_type}: {e}")
                health_results["connectors"][conn_type] = {
                    "health": ConnectorHealth.UNHEALTHY,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat(),
                }
                unhealthy_count += 1

        # Determine overall health
        if unhealthy_count > 0:
            health_results["overall_health"] = ConnectorHealth.UNHEALTHY
        elif degraded_count > 0:
            health_results["overall_health"] = ConnectorHealth.DEGRADED

        health_results["summary"] = {
            "total": len(connector_types),
            "healthy": len(connector_types) - unhealthy_count - degraded_count,
            "degraded": degraded_count,
            "unhealthy": unhealthy_count,
        }

        return health_results

    async def refresh_all_connections(self) -> Dict[str, bool]:
        """
        Refresh all active connections.

        Returns:
            Dictionary of connector_type -> success status
        """
        results = {}

        for connector_type, connector in self._instances.items():
            try:
                # Close existing connection
                await connector.close()

                # Remove instance
                del self._instances[connector_type]

                # Re-instantiate
                await self.get_connector(connector_type)
                results[connector_type] = True

            except Exception as e:
                logger.error(f"Failed to refresh {connector_type}: {e}")
                results[connector_type] = False

        return results

    async def close_all(self) -> None:
        """Close all active connectors and clean up resources."""
        logger.info("Closing all connectors...")

        # Close in reverse dependency order
        closed = set()

        async def close_with_deps(conn_type: str) -> None:
            if conn_type in closed:
                return

            # First close any connectors that depend on this one
            for other_type, deps in self._dependencies.items():
                if conn_type in deps and other_type in self._instances:
                    await close_with_deps(other_type)

            # Then close this connector
            if conn_type in self._instances:
                try:
                    await self._instances[conn_type].close()
                except Exception as e:
                    logger.error(f"Error closing {conn_type}: {e}")
                finally:
                    del self._instances[conn_type]

            closed.add(conn_type)

        # Close all connectors
        for connector_type in list(self._instances.keys()):
            await close_with_deps(connector_type)

        logger.info("All connectors closed")

    def get_metrics(self, connector_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get metrics for connectors.

        Args:
            connector_type: Specific connector to get metrics for, or None for all

        Returns:
            Connector metrics
        """
        if connector_type:
            if connector_type not in self._instances:
                raise ConnectorNotFoundError(
                    f"Connector '{connector_type}' not found or not active"
                )
            return self._instances[connector_type].metrics.dict()
        else:
            return {
                conn_type: connector.metrics.dict()
                for conn_type, connector in self._instances.items()
            }

    def get_dependency_graph(self) -> Dict[str, List[str]]:
        """
        Get the dependency graph for all connectors.

        Returns:
            Dictionary of connector_type -> list of dependencies
        """
        return {conn_type: list(deps) for conn_type, deps in self._dependencies.items()}

    def __repr__(self) -> str:
        """String representation of the registry."""
        return (
            f"<ConnectorRegistry("
            f"types={len(self._connector_types)}, "
            f"active={len(self._instances)})>"
        )


# Global registry instance
connector_registry = ConnectorRegistry()
