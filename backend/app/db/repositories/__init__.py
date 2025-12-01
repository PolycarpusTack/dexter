"""
Repository layer for database access.

Provides clean data access patterns following the repository pattern.
"""

from app.db.repositories.feedback import FeedbackRepository
from app.db.repositories.issues import IssueRepository

__all__ = ["IssueRepository", "FeedbackRepository"]
