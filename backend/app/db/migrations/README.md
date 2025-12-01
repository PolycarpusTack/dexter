# Alembic Database Migrations

This directory contains Alembic database migrations for the Dexter knowledge base.

## Prerequisites

1. PostgreSQL 12+ with pgvector extension installed
2. Database created and accessible via `DATABASE_URL`
3. Backend dependencies installed

## Applying Migrations

### First-time setup

When setting up a new database, run:

```bash
cd /mnt/c/Projects/dexter/backend

# Set your database URL
export DATABASE_URL="postgresql+asyncpg://dexter:password@localhost:5432/dexter"

# Or use the PYTHONPATH approach
PYTHONPATH=/mnt/c/Projects/dexter/backend alembic upgrade head
```

### Checking migration status

```bash
PYTHONPATH=/mnt/c/Projects/dexter/backend alembic current
PYTHONPATH=/mnt/c/Projects/dexter/backend alembic history
```

### Rolling back migrations

```bash
# Rollback one migration
PYTHONPATH=/mnt/c/Projects/dexter/backend alembic downgrade -1

# Rollback to specific revision
PYTHONPATH=/mnt/c/Projects/dexter/backend alembic downgrade <revision>

# Rollback all migrations
PYTHONPATH=/mnt/c/Projects/dexter/backend alembic downgrade base
```

## Creating New Migrations

For autogenerate to work, you need a running PostgreSQL instance:

```bash
PYTHONPATH=/mnt/c/Projects/dexter/backend alembic revision --autogenerate -m "Description of changes"
```

If the database is not available, create migrations manually in `versions/` directory following the pattern of existing migrations.

## Migration Files

- `001_initial_knowledge_base_schema.py` - Initial schema with pgvector support
  - Creates `sentry_issues` table with embedding storage
  - Creates `feedback_log` table for human feedback
  - Creates `processing_queue` table for async processing
  - Enables pgvector extension

## Important Notes

1. **pgvector extension**: The migration automatically enables the pgvector extension. Ensure your PostgreSQL user has CREATE EXTENSION privileges.

2. **Async operations**: Alembic runs migrations synchronously even though the app uses async SQLAlchemy. This is normal and expected.

3. **Connection string**: The migration will use `DATABASE_URL` from your environment or settings, falling back to `alembic.ini` if not set.

4. **PYTHONPATH**: Set `PYTHONPATH=/mnt/c/Projects/dexter/backend` to ensure the `app` module can be imported.
