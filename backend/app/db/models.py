"""
SQLAlchemy models for Dexter knowledge base.

Uses pgvector for embedding storage and similarity search.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

# Embedding dimension for Jina v2 Code model
EMBEDDING_DIMENSION = 768


class SentryIssue(Base):
    """
    Stored Sentry issue with embedding for similarity search.

    All PII must be scrubbed BEFORE storing in this table.
    """

    __tablename__ = "sentry_issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Sentry identifiers
    sentry_issue_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    sentry_event_id: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True
    )

    # Error information
    error_type: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    platform: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    level: Mapped[str] = mapped_column(String(32), default="error")

    # Processed data (NEVER store raw PII here)
    cleaned_stack: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True
    )
    context_tags: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True
    )

    # Solutions
    ai_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_suggested_fix: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    human_solution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Quality flags
    is_useful: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    feedback_count: Mapped[int] = mapped_column(Integer, default=0)

    # Vector for similarity search (768 dim for Jina code model)
    embedding = mapped_column(Vector(EMBEDDING_DIMENSION), nullable=True)

    # Processing status (for failed embedding tracking)
    processing_status: Mapped[str] = mapped_column(
        String(32), default="completed"
    )  # completed, failed, pending

    # ===== ENRICHMENT DATA (JSONB) =====
    # Story B-1: 11 data enrichment sources from Sentry API

    release_context: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Releases, suspect commits, deployment info"
    )
    performance_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Spans, transactions, problem spans from performance events"
    )
    profiling_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Function hotspots, top frames from profiling data"
    )
    session_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Session counts, replay metadata, crash-free rate, impact percentage"
    )
    breadcrumbs: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Breadcrumb timeline showing user actions and system events"
    )
    alert_context: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Alert history, incident correlation, alert rule metadata"
    )
    attachments_meta: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Attachment summaries (filenames, types, sizes - NOT content)"
    )
    tag_distributions: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Top tag values, environment/device/browser breakdowns"
    )
    ownership: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Teams, code owners, assignment rules"
    )
    measurements: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Web vitals (LCP, FID, CLS), custom measurements, performance baselines"
    )
    grouping_insights: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True,
        comment="Fingerprint variants, similar issues, grouping metadata"
    )

    # Enrichment metadata tracking
    enrichment_status: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default="{}",
        comment="Per-source enrichment status: {source: {last_fetched, error, enabled}}"
    )
    last_enriched_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True,
        comment="Last time any enrichment data was successfully fetched"
    )

    # Timestamps
    sentry_timestamp: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    feedback_entries: Mapped[List["FeedbackLog"]] = relationship(
        "FeedbackLog", back_populates="issue", cascade="all, delete-orphan"
    )
    signals: Mapped[Optional["EnrichmentSignal"]] = relationship(
        "EnrichmentSignal", back_populates="issue", uselist=False,
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<SentryIssue(id={self.id}, type={self.error_type}, useful={self.is_useful})>"


# Indexes for efficient querying
Index("idx_issues_is_useful", SentryIssue.is_useful, postgresql_where=SentryIssue.is_useful == True)
Index("idx_issues_created", SentryIssue.created_at.desc())
Index(
    "idx_issues_status",
    SentryIssue.processing_status,
    postgresql_where=SentryIssue.processing_status != "completed",
)


class FeedbackLog(Base):
    """
    Log of human feedback on AI analyses.

    Tracks positive, negative, and correction feedback.
    """

    __tablename__ = "feedback_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Foreign key to issue
    issue_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sentry_issues.id", ondelete="CASCADE"), nullable=False
    )

    # Feedback details
    feedback_type: Mapped[str] = mapped_column(
        String(16), nullable=False
    )  # 'positive', 'negative', 'correction'
    correction_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # User tracking (hashed, not raw)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    issue: Mapped["SentryIssue"] = relationship(
        "SentryIssue", back_populates="feedback_entries"
    )

    def __repr__(self) -> str:
        return f"<FeedbackLog(id={self.id}, type={self.feedback_type}, issue_id={self.issue_id})>"


Index("idx_feedback_issue", FeedbackLog.issue_id)
Index("idx_feedback_type", FeedbackLog.feedback_type)


class ProcessingQueue(Base):
    """
    Queue for async/retry processing of error events.

    Stores PII-scrubbed payloads only.
    """

    __tablename__ = "processing_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Event identifier
    sentry_event_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False
    )

    # Payload (PII-scrubbed only)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)

    # Processing status
    status: Mapped[str] = mapped_column(
        String(32), default="pending"
    )  # pending, processing, completed, failed
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<ProcessingQueue(id={self.id}, event={self.sentry_event_id}, status={self.status})>"


Index("idx_queue_status", ProcessingQueue.status)
Index("idx_queue_created", ProcessingQueue.created_at)


class EnrichmentSignal(Base):
    """
    Derived signals for multi-signal ranking (Story B-2).

    Pre-computed from enrichment data to avoid complex JSONB queries during retrieval.
    Updated whenever enrichment data changes via enrichment pipeline.

    Scoring Methodology:
    - All scores normalized to 0.0-1.0 range
    - Composite score = weighted average:
      * Vector similarity: 40% (from pgvector cosine distance)
      * Release recency: 15% (how recently deployed)
      * Ownership match: 15% (relevance to user's team)
      * Alert frequency: 10% (how often alerts fired)
      * Replay impact: 10% (session crash/error rate)
      * Tag overlap: 10% (tag similarity to query context)
    """

    __tablename__ = "enrichment_signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Foreign key to issue (one-to-one relationship)
    issue_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sentry_issues.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # ===== DERIVED SIGNALS (0.0 to 1.0 normalized) =====

    release_recency_score: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0.0",
        comment="Release recency: 1.0 = deployed in last hour, decays exponentially"
    )
    alert_frequency_score: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0.0",
        comment="Alert frequency: 1.0 = >10 alerts/hour, normalized by time window"
    )
    replay_impact_score: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0.0",
        comment="Session impact: 1.0 = affects 100% of sessions, from crash-free rate"
    )
    tag_overlap_score: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0.0",
        comment="Tag similarity: 1.0 = exact tag match with query context (env, browser, etc)"
    )
    ownership_match_score: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0.0",
        comment="Ownership relevance: 1.0 = owned by user's team, 0.5 = related team"
    )

    # Composite score for ranking
    composite_score: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0.0", index=True,
        comment="Weighted composite: vector(40%) + release(15%) + ownership(15%) + alerts(10%) + replay(10%) + tags(10%)"
    )

    # Metadata
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(),
        comment="Last time signals were recomputed"
    )

    # Relationship back to issue
    issue: Mapped["SentryIssue"] = relationship(
        "SentryIssue", back_populates="signals"
    )

    def __repr__(self) -> str:
        return f"<EnrichmentSignal(issue_id={self.issue_id}, composite={self.composite_score:.3f})>"


# Indexes for enrichment_signals table
Index("idx_signals_composite_desc", EnrichmentSignal.composite_score.desc())
Index("idx_signals_release_recency", EnrichmentSignal.release_recency_score.desc())
Index("idx_signals_alert_frequency", EnrichmentSignal.alert_frequency_score.desc())
Index("idx_signals_replay_impact", EnrichmentSignal.replay_impact_score.desc())
