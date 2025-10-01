"""
Compatibility package for integrations.

Re-exports integration components from services.integrations to maintain
the expected import paths in tests.
"""

from app.services.integrations.auth_manager import *  # noqa: F401,F403
from app.services.integrations.base_connector import *  # noqa: F401,F403
from app.services.integrations.connector_registry import *  # noqa: F401,F403
