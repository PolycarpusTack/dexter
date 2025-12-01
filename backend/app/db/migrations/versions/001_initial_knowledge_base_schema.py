"""Initial knowledge base schema with pgvector support

Revision ID: 001_initial
Revises:
Create Date: 2025-11-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create knowledge base tables."""
    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # Create sentry_issues table
    op.create_table(
        'sentry_issues',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('sentry_issue_id', sa.String(length=64), nullable=False),
        sa.Column('sentry_event_id', sa.String(length=64), nullable=False),
        sa.Column('error_type', sa.String(length=255), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=False),
        sa.Column('platform', sa.String(length=64), nullable=True),
        sa.Column('level', sa.String(length=32), nullable=False, server_default='error'),
        sa.Column('cleaned_stack', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('context_tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ai_explanation', sa.Text(), nullable=True),
        sa.Column('ai_suggested_fix', sa.Text(), nullable=True),
        sa.Column('human_solution', sa.Text(), nullable=True),
        sa.Column('is_useful', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('feedback_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('embedding', Vector(768), nullable=True),
        sa.Column('processing_status', sa.String(length=32), nullable=False, server_default='completed'),
        sa.Column('sentry_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sentry_issue_id'),
        sa.UniqueConstraint('sentry_event_id')
    )

    # Create indexes for sentry_issues
    op.create_index('idx_issues_error_type', 'sentry_issues', ['error_type'])
    op.create_index('idx_issues_sentry_issue_id', 'sentry_issues', ['sentry_issue_id'])
    op.create_index(
        'idx_issues_is_useful',
        'sentry_issues',
        ['is_useful'],
        postgresql_where=sa.text('is_useful = true')
    )
    op.create_index('idx_issues_created', 'sentry_issues', [sa.text('created_at DESC')])
    op.create_index(
        'idx_issues_status',
        'sentry_issues',
        ['processing_status'],
        postgresql_where=sa.text("processing_status != 'completed'")
    )

    # Create feedback_log table
    op.create_table(
        'feedback_log',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=False),
        sa.Column('feedback_type', sa.String(length=16), nullable=False),
        sa.Column('correction_text', sa.Text(), nullable=True),
        sa.Column('user_id', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['issue_id'], ['sentry_issues.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for feedback_log
    op.create_index('idx_feedback_issue', 'feedback_log', ['issue_id'])
    op.create_index('idx_feedback_type', 'feedback_log', ['feedback_type'])

    # Create processing_queue table
    op.create_table(
        'processing_queue',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('sentry_event_id', sa.String(length=64), nullable=False),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sentry_event_id')
    )

    # Create indexes for processing_queue
    op.create_index('idx_queue_status', 'processing_queue', ['status'])
    op.create_index('idx_queue_created', 'processing_queue', [sa.text('created_at')])


def downgrade() -> None:
    """Drop knowledge base tables."""
    op.drop_index('idx_queue_created', table_name='processing_queue')
    op.drop_index('idx_queue_status', table_name='processing_queue')
    op.drop_table('processing_queue')

    op.drop_index('idx_feedback_type', table_name='feedback_log')
    op.drop_index('idx_feedback_issue', table_name='feedback_log')
    op.drop_table('feedback_log')

    op.drop_index('idx_issues_status', table_name='sentry_issues')
    op.drop_index('idx_issues_created', table_name='sentry_issues')
    op.drop_index('idx_issues_is_useful', table_name='sentry_issues')
    op.drop_index('idx_issues_sentry_issue_id', table_name='sentry_issues')
    op.drop_index('idx_issues_error_type', table_name='sentry_issues')
    op.drop_table('sentry_issues')

    # Note: We don't drop the vector extension as it might be used by other apps
    # op.execute('DROP EXTENSION IF EXISTS vector')
