-- Dexter Knowledge Base Schema
-- PostgreSQL 16 with pgvector extension

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Main issues table
CREATE TABLE IF NOT EXISTS sentry_issues (
    id SERIAL PRIMARY KEY,
    sentry_issue_id VARCHAR(64) UNIQUE NOT NULL,
    sentry_event_id VARCHAR(64) NOT NULL,

    -- Error information
    error_type VARCHAR(255) NOT NULL,
    error_message TEXT NOT NULL,
    platform VARCHAR(64),
    level VARCHAR(32) DEFAULT 'error',

    -- Processed data (NEVER store raw PII here)
    cleaned_stack JSONB,      -- Pre-scrubbed stack frames only
    context_tags JSONB,       -- Sanitized tags only (no auth tokens, headers)

    -- Solutions
    ai_explanation TEXT,
    ai_suggested_fix TEXT,
    human_solution TEXT,

    -- Quality flags
    is_useful BOOLEAN DEFAULT FALSE,
    confidence_score FLOAT,
    feedback_count INTEGER DEFAULT 0,

    -- Vector for similarity search (768 dim for Jina code model)
    embedding vector(768),

    -- Processing status (for failed embedding tracking)
    processing_status VARCHAR(32) DEFAULT 'completed', -- completed, failed, pending

    -- Timestamps
    sentry_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_event UNIQUE (sentry_event_id)
);

-- Indexes for sentry_issues
CREATE INDEX IF NOT EXISTS idx_issues_sentry_id ON sentry_issues(sentry_issue_id);
CREATE INDEX IF NOT EXISTS idx_issues_error_type ON sentry_issues(error_type);
CREATE INDEX IF NOT EXISTS idx_issues_is_useful ON sentry_issues(is_useful) WHERE is_useful = TRUE;
CREATE INDEX IF NOT EXISTS idx_issues_created ON sentry_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_status ON sentry_issues(processing_status) WHERE processing_status != 'completed';

-- Vector similarity index (IVFFlat for faster search)
-- Note: IVFFlat requires some data to be present for optimal list tuning
-- For small datasets (<1000 rows), consider using HNSW instead
CREATE INDEX IF NOT EXISTS idx_issues_embedding ON sentry_issues
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Feedback tracking table
CREATE TABLE IF NOT EXISTS feedback_log (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES sentry_issues(id) ON DELETE CASCADE,
    feedback_type VARCHAR(16) NOT NULL,  -- 'positive', 'negative', 'correction'
    correction_text TEXT,
    user_id VARCHAR(128),                 -- Hashed, not raw
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for feedback_log
CREATE INDEX IF NOT EXISTS idx_feedback_issue ON feedback_log(issue_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback_log(feedback_type);

-- Processing queue table (for async/retry)
CREATE TABLE IF NOT EXISTS processing_queue (
    id SERIAL PRIMARY KEY,
    sentry_event_id VARCHAR(64) UNIQUE NOT NULL,
    payload JSONB NOT NULL,               -- PII-scrubbed payload only
    status VARCHAR(32) DEFAULT 'pending', -- pending, processing, completed, failed
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for processing_queue
CREATE INDEX IF NOT EXISTS idx_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created ON processing_queue(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_sentry_issues_updated_at ON sentry_issues;
CREATE TRIGGER update_sentry_issues_updated_at
    BEFORE UPDATE ON sentry_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dexter;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dexter;

-- Insert a comment for documentation
COMMENT ON TABLE sentry_issues IS 'Stores processed Sentry issues with embeddings for similarity search. All PII must be scrubbed BEFORE insertion.';
COMMENT ON TABLE feedback_log IS 'Tracks human feedback (positive, negative, correction) on AI analyses.';
COMMENT ON TABLE processing_queue IS 'Queue for async/retry processing of error events. Stores PII-scrubbed payloads only.';
COMMENT ON COLUMN sentry_issues.embedding IS '768-dimensional vector from Jina v2 Code embeddings model.';
COMMENT ON COLUMN sentry_issues.cleaned_stack IS 'Pre-scrubbed stack frames. Never contains raw PII.';
