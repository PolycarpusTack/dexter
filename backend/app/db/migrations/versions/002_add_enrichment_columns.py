"""Add enrichment columns and signals table for EPIC B data enrichment

Revision ID: 002_enrichment
Revises: 001_initial
Create Date: 2025-11-30 14:00:00.000000

EPIC B: Extend knowledge base to support 11 Sentry data enrichment sources:
1. Release Context (releases, suspect commits, deployment info)
2. Performance Data (spans, transactions, problem spans)
3. Profiling Data (function hotspots, top frames)
4. Session Data (session counts, replay metadata, crash-free rate)
5. Breadcrumbs (user action timeline)
6. Alert Context (alert history, incident correlation)
7. Attachments Metadata (summaries, not content)
8. Tag Distributions (top tags, environment/device breakdowns)
9. Ownership (teams, code owners)
10. Measurements (web vitals, custom measurements)
11. Grouping Insights (fingerprint variants, similar issues)

Changes:
- Add 11 JSONB columns to sentry_issues for enrichment data
- Add enrichment_status and last_enriched_at tracking columns
- Create enrichment_signals table for derived ranking signals
- Create GIN indexes for efficient JSONB queries
- Create B-tree indexes for signal scoring

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_enrichment'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add enrichment columns and signals table.

    This migration is designed for zero downtime:
    - All new columns are nullable
    - Indexes created with CONCURRENTLY would be used in production
    - No data transformations required
    """

    # ===== Story B-1: Add JSONB enrichment columns to sentry_issues =====

    op.add_column('sentry_issues', sa.Column(
        'release_context',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Releases, suspect commits, deployment info'
    ))

    op.add_column('sentry_issues', sa.Column(
        'performance_data',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Spans, transactions, problem spans from performance events'
    ))

    op.add_column('sentry_issues', sa.Column(
        'profiling_data',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Function hotspots, top frames from profiling data'
    ))

    op.add_column('sentry_issues', sa.Column(
        'session_data',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Session counts, replay metadata, crash-free rate, impact percentage'
    ))

    op.add_column('sentry_issues', sa.Column(
        'breadcrumbs',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Breadcrumb timeline showing user actions and system events'
    ))

    op.add_column('sentry_issues', sa.Column(
        'alert_context',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Alert history, incident correlation, alert rule metadata'
    ))

    op.add_column('sentry_issues', sa.Column(
        'attachments_meta',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Attachment summaries (filenames, types, sizes - NOT content)'
    ))

    op.add_column('sentry_issues', sa.Column(
        'tag_distributions',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Top tag values, environment/device/browser breakdowns'
    ))

    op.add_column('sentry_issues', sa.Column(
        'ownership',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Teams, code owners, assignment rules'
    ))

    op.add_column('sentry_issues', sa.Column(
        'measurements',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Web vitals (LCP, FID, CLS), custom measurements, performance baselines'
    ))

    op.add_column('sentry_issues', sa.Column(
        'grouping_insights',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        comment='Fingerprint variants, similar issues, grouping metadata'
    ))

    # Add enrichment metadata tracking columns
    op.add_column('sentry_issues', sa.Column(
        'enrichment_status',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
        server_default='{}',
        comment='Per-source enrichment status: {source: {last_fetched, error, enabled}}'
    ))

    op.add_column('sentry_issues', sa.Column(
        'last_enriched_at',
        sa.DateTime(timezone=True),
        nullable=True,
        comment='Last time any enrichment data was successfully fetched'
    ))

    # ===== Story B-2: Create enrichment_signals table =====

    op.create_table(
        'enrichment_signals',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=False),
        sa.Column('release_recency_score', sa.Float(), nullable=False, server_default='0.0',
                  comment='Release recency: 1.0 = deployed in last hour, decays exponentially'),
        sa.Column('alert_frequency_score', sa.Float(), nullable=False, server_default='0.0',
                  comment='Alert frequency: 1.0 = >10 alerts/hour, normalized by time window'),
        sa.Column('replay_impact_score', sa.Float(), nullable=False, server_default='0.0',
                  comment='Session impact: 1.0 = affects 100% of sessions, from crash-free rate'),
        sa.Column('tag_overlap_score', sa.Float(), nullable=False, server_default='0.0',
                  comment='Tag similarity: 1.0 = exact tag match with query context (env, browser, etc)'),
        sa.Column('ownership_match_score', sa.Float(), nullable=False, server_default='0.0',
                  comment='Ownership relevance: 1.0 = owned by user\'s team, 0.5 = related team'),
        sa.Column('composite_score', sa.Float(), nullable=False, server_default='0.0',
                  comment='Weighted composite: vector(40%) + release(15%) + ownership(15%) + alerts(10%) + replay(10%) + tags(10%)'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False,
                  comment='Last time signals were recomputed'),
        sa.ForeignKeyConstraint(['issue_id'], ['sentry_issues.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('issue_id')
    )

    # ===== Story B-3: Create indexes for JSONB queries =====

    # GIN indexes for JSONB columns (efficient for containment and key existence queries)
    # Note: In production, use CREATE INDEX CONCURRENTLY to avoid table locks

    # Release version lookups
    op.execute("""
        CREATE INDEX idx_issues_release_version
        ON sentry_issues
        USING gin ((release_context->'releases'))
    """)

    # Ownership team lookups
    op.execute("""
        CREATE INDEX idx_issues_ownership_teams
        ON sentry_issues
        USING gin ((ownership->'teams'))
    """)

    # Tag distribution lookups
    op.execute("""
        CREATE INDEX idx_issues_tag_distributions
        ON sentry_issues
        USING gin (tag_distributions)
    """)

    # Performance problem spans
    op.execute("""
        CREATE INDEX idx_issues_problem_spans
        ON sentry_issues
        USING gin ((performance_data->'problem_spans'))
    """)

    # Alert context for incident correlation
    op.execute("""
        CREATE INDEX idx_issues_alert_context
        ON sentry_issues
        USING gin ((alert_context->'incidents'))
    """)

    # ===== Story B-2: Create indexes for enrichment_signals =====

    # Foreign key index
    op.create_index('idx_signals_issue_id', 'enrichment_signals', ['issue_id'])

    # Composite score index for ranking queries (DESC for ORDER BY DESC)
    op.create_index('idx_signals_composite_desc', 'enrichment_signals',
                    [sa.text('composite_score DESC')])

    # Individual signal indexes for filtering/sorting
    op.create_index('idx_signals_release_recency', 'enrichment_signals',
                    [sa.text('release_recency_score DESC')])
    op.create_index('idx_signals_alert_frequency', 'enrichment_signals',
                    [sa.text('alert_frequency_score DESC')])
    op.create_index('idx_signals_replay_impact', 'enrichment_signals',
                    [sa.text('replay_impact_score DESC')])


def downgrade() -> None:
    """
    Remove enrichment columns and signals table.

    WARNING: This will delete all enrichment data and signals.
    Ensure you have backups before downgrading.
    """

    # Drop enrichment_signals indexes
    op.drop_index('idx_signals_replay_impact', table_name='enrichment_signals')
    op.drop_index('idx_signals_alert_frequency', table_name='enrichment_signals')
    op.drop_index('idx_signals_release_recency', table_name='enrichment_signals')
    op.drop_index('idx_signals_composite_desc', table_name='enrichment_signals')
    op.drop_index('idx_signals_issue_id', table_name='enrichment_signals')

    # Drop enrichment_signals table
    op.drop_table('enrichment_signals')

    # Drop JSONB indexes from sentry_issues
    op.execute('DROP INDEX IF EXISTS idx_issues_alert_context')
    op.execute('DROP INDEX IF EXISTS idx_issues_problem_spans')
    op.execute('DROP INDEX IF EXISTS idx_issues_tag_distributions')
    op.execute('DROP INDEX IF EXISTS idx_issues_ownership_teams')
    op.execute('DROP INDEX IF EXISTS idx_issues_release_version')

    # Drop enrichment columns from sentry_issues
    op.drop_column('sentry_issues', 'last_enriched_at')
    op.drop_column('sentry_issues', 'enrichment_status')
    op.drop_column('sentry_issues', 'grouping_insights')
    op.drop_column('sentry_issues', 'measurements')
    op.drop_column('sentry_issues', 'ownership')
    op.drop_column('sentry_issues', 'tag_distributions')
    op.drop_column('sentry_issues', 'attachments_meta')
    op.drop_column('sentry_issues', 'alert_context')
    op.drop_column('sentry_issues', 'breadcrumbs')
    op.drop_column('sentry_issues', 'session_data')
    op.drop_column('sentry_issues', 'profiling_data')
    op.drop_column('sentry_issues', 'performance_data')
    op.drop_column('sentry_issues', 'release_context')
