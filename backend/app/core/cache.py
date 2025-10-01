"""
Application-wide cache service singleton.

Provides a globally available CacheService instance for components and tests
that are not running within a FastAPI app context.
"""
from app.core.config import get_settings
from app.services.cache_service import CacheService

_settings = get_settings()

# Global cache service instance
cache_service = CacheService(redis_url=getattr(_settings, "REDIS_URL", None))
