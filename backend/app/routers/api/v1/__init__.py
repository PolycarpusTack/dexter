# File: backend/app/routers/api/v1/__init__.py

"""
API v1 module for frontend-compatible routes
"""

from . import issues, events, analytics

__all__ = ['issues', 'events', 'analytics']
