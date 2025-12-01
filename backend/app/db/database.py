"""
Database connection and session management for Dexter.

Provides async PostgreSQL connection with pgvector support.
"""

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

# Base class for all models
Base = declarative_base()

# Engine and session factory - initialized lazily
_engine = None
_async_session_factory = None


def get_engine(database_url: str, debug: bool = False):
    """
    Get or create the async database engine.

    Args:
        database_url: PostgreSQL connection URL (asyncpg format)
        debug: Whether to echo SQL statements

    Returns:
        AsyncEngine instance
    """
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            database_url,
            echo=debug,
            pool_pre_ping=True,  # Verify connections before use
            pool_size=5,
            max_overflow=10,
            pool_recycle=3600,  # Recycle connections after 1 hour
        )
        logger.info("Database engine created")
    return _engine


def get_session_factory(database_url: str, debug: bool = False):
    """
    Get or create the async session factory.

    Args:
        database_url: PostgreSQL connection URL
        debug: Whether to echo SQL statements

    Returns:
        Async session factory
    """
    global _async_session_factory
    if _async_session_factory is None:
        engine = get_engine(database_url, debug)
        _async_session_factory = sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
        logger.info("Session factory created")
    return _async_session_factory


# Lazy engine reference for imports
engine = None
AsyncSessionLocal = None


def init_db(database_url: str, debug: bool = False):
    """
    Initialize database connection.

    Must be called at application startup before using get_db().

    Args:
        database_url: PostgreSQL connection URL
        debug: Whether to echo SQL statements
    """
    global engine, AsyncSessionLocal
    engine = get_engine(database_url, debug)
    AsyncSessionLocal = get_session_factory(database_url, debug)
    logger.info(f"Database initialized with URL: {database_url[:50]}...")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session.

    Yields a session and handles cleanup on completion or error.

    Usage:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...

    Yields:
        AsyncSession: Database session
    """
    if AsyncSessionLocal is None:
        raise RuntimeError(
            "Database not initialized. Call init_db() at application startup."
        )

    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            logger.error(f"Database session error: {e}", exc_info=True)
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """
    Create all tables defined in models.

    Should only be used for development/testing.
    Use Alembic migrations for production.
    """
    if engine is None:
        raise RuntimeError("Database not initialized")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created")


async def drop_tables():
    """
    Drop all tables.

    WARNING: Destroys all data. Use only for testing.
    """
    if engine is None:
        raise RuntimeError("Database not initialized")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        logger.warning("Database tables dropped")
