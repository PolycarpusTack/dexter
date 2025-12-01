# Dexter Knowledge Base Implementation

This document describes the complete RAG-based Knowledge Base system implemented for Dexter.

## Overview

The Knowledge Base provides:
- **Semantic search** for similar past errors using vector embeddings
- **Feedback loop** for community-validated solutions
- **RAG-enhanced explanations** with context from past issues
- **Confidence-based citations** and disclaimers

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Sentry Webhooks                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Ingestion Pipeline                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ PII Scrubber│→ │  Formatter  │→ │ Embeddings (Jina v2)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL + pgvector                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │SentryIssue  │  │ FeedbackLog │  │ Vector Index (IVFFlat)  │  │
│  │(768-dim vec)│  │             │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Retrieval Service                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Similarity  │→ │  Combined   │→ │ Confidence Scoring      │  │
│  │   Search    │  │   Ranking   │  │ (HIGH/MEDIUM/LOW)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Explanation Service (RAG)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │RAG Prompt   │→ │    LLM      │→ │ Post-processing         │  │
│  │  Builder    │  │  Service    │  │ (citations, disclaimers)│  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Phase Implementation Details

### Phase 1: Database & Embeddings Foundation

**Files:**
- `app/db/database.py` - Async PostgreSQL connection
- `app/db/models.py` - SQLAlchemy models with pgvector
- `app/db/repositories/issues.py` - Issue CRUD + similarity search
- `app/db/repositories/feedback.py` - Feedback CRUD
- `app/services/pii_scrubber.py` - PII detection and removal
- `app/services/embeddings_service.py` - Jina v2 Code embeddings
- `app/services/embedding_formatter.py` - Stack trace formatting
- `app/services/parser_adapter.py` - Unified stack parser

**Key Features:**
- 768-dimensional embeddings optimized for code
- IVFFlat index for fast similarity search
- PII scrubbing BEFORE storage (critical security)
- Lazy initialization to avoid startup failures

### Phase 2: Webhook & Ingestion Pipeline

**Files:**
- `app/routers/webhooks.py` - Sentry webhook endpoints
- `app/services/ingestion_service.py` - Event processing
- `app/services/retrieval_service.py` - RAG similarity search
- `app/routers/knowledge_base.py` - KB API endpoints

**Key Features:**
- HMAC-SHA256 webhook signature validation
- Idempotent ingestion (deduplication by sentry_issue_id)
- Async processing with retry tracking
- Cosine similarity search with configurable threshold

### Phase 3: Feedback Loop & Validation

**Files:**
- `app/services/feedback_service.py` - Feedback management
- `app/services/validation_service.py` - Validation workflow
- `app/routers/validation.py` - Validation API endpoints

**Key Features:**
- Feedback types: positive, negative, correction
- Auto-validation when thresholds met
- Combined scoring (similarity + feedback bonus)
- Quality scoring for solutions

**Validation Thresholds:**
```python
VALIDATION_THRESHOLDS = {
    "min_positive_for_validation": 3,
    "min_net_score_for_validation": 2,
    "max_negative_for_rejection": 5,
    "correction_weight": 2,
    "confidence_base": 0.5,
    "confidence_per_positive": 0.1,
    "confidence_max": 0.95,
}
```

### Phase 4: LLM Integration Enhancement

**Files:**
- `app/services/rag_prompt_builder.py` - RAG prompt building
- `app/services/explanation_service.py` - RAG pipeline
- `app/routers/enhanced_ai.py` - RAG API endpoints (updated)

**Key Features:**
- Confidence-based citation requirements
- Context injection from similar issues
- Validated solution prioritization
- Graceful fallback when KB unavailable

**Citation Requirements:**
| Confidence | Must Cite | Disclaimer |
|------------|-----------|------------|
| HIGH | Yes | No |
| MEDIUM | Yes | Yes (adaptation note) |
| LOW | No | Yes (general analysis note) |

## API Endpoints

### Webhooks
- `POST /api/webhooks/sentry` - Receive Sentry events
- `POST /api/webhooks/sentry/{org}/{project}` - Project-specific webhook

### Knowledge Base
- `POST /api/knowledge-base/search` - Search similar issues
- `GET /api/knowledge-base/issues/{id}` - Get issue details
- `GET /api/knowledge-base/stats` - Get KB statistics

### Validation
- `POST /api/validation/feedback` - Submit feedback
- `GET /api/validation/feedback/{id}/stats` - Get feedback stats
- `GET /api/validation/queue` - Get validation queue
- `POST /api/validation/validate` - Manual validation
- `POST /api/validation/reject` - Reject issue
- `POST /api/validation/apply-correction` - Apply correction
- `GET /api/validation/metrics` - Validation metrics

### RAG Explanation
- `POST /api/ai-enhanced/explain/rag` - RAG-enhanced explanation
- `POST /api/ai-enhanced/explain/rag/simple` - Simple RAG query
- `GET /api/ai-enhanced/explain/rag/status` - RAG system status

## Configuration

Add to `.env`:
```bash
# Knowledge Base
ENABLE_KNOWLEDGE_BASE=true

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/dexter
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10

# Embeddings
EMBEDDINGS_MODEL=jinaai/jina-embeddings-v2-base-code
EMBEDDINGS_DIMENSION=768
EMBEDDINGS_CACHE_SIZE=1000

# PII Scrubbing
PII_SCRUB_ENABLED=true
PII_PLACEHOLDER=[REDACTED]

# Similarity Search
SIMILARITY_THRESHOLD=0.7
MAX_SIMILAR_ISSUES=5

# Webhook Security
SENTRY_WEBHOOK_SECRET=your-webhook-secret
```

## Database Schema

```sql
-- Issues table with vector column
CREATE TABLE sentry_issues (
    id SERIAL PRIMARY KEY,
    sentry_issue_id VARCHAR(255) UNIQUE NOT NULL,
    organization_slug VARCHAR(255),
    project_slug VARCHAR(255),
    error_type VARCHAR(512),
    error_message TEXT,
    stack_trace TEXT,
    platform VARCHAR(64),
    embedding vector(768),
    ai_explanation TEXT,
    ai_suggested_fix TEXT,
    human_solution TEXT,
    is_useful BOOLEAN DEFAULT FALSE,
    confidence_score FLOAT DEFAULT 0.0,
    feedback_count INTEGER DEFAULT 0,
    processing_status VARCHAR(32) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Feedback log
CREATE TABLE feedback_log (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES sentry_issues(id),
    feedback_type VARCHAR(32) NOT NULL,
    correction_text TEXT,
    user_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vector similarity index
CREATE INDEX idx_issues_embedding ON sentry_issues
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Testing

Run tests:
```bash
# Phase 1 tests
pytest tests/services/test_pii_scrubber.py -v
pytest tests/services/test_embedding_formatter.py -v
pytest tests/services/test_parser_adapter.py -v
pytest tests/db/test_models.py -v

# Phase 2 tests
pytest tests/services/test_ingestion_service.py -v
pytest tests/services/test_retrieval_service.py -v
pytest tests/routers/test_webhooks.py -v

# Phase 3 tests
pytest tests/services/test_feedback_service.py -v
pytest tests/services/test_validation_service.py -v

# Phase 4 tests
pytest tests/services/test_rag_prompt_builder.py -v
pytest tests/services/test_explanation_service.py -v
```

## Deployment

1. **Database Setup:**
   ```bash
   # Start PostgreSQL with pgvector
   docker-compose up -d postgres

   # Run migrations
   alembic upgrade head
   ```

2. **Configure Sentry Webhook:**
   - Go to Sentry → Settings → Integrations → Webhooks
   - Add URL: `https://your-domain/api/webhooks/sentry`
   - Set secret and enable issue events

3. **Enable Knowledge Base:**
   ```bash
   ENABLE_KNOWLEDGE_BASE=true
   ```

## Security Considerations

1. **PII Scrubbing:** All error data is scrubbed BEFORE storage
2. **Webhook Validation:** HMAC-SHA256 signature verification
3. **User Hashing:** User IDs in feedback are SHA256 hashed
4. **Access Control:** KB endpoints should be protected by auth

## Performance

- **Embedding Cache:** LRU cache for frequently queried errors
- **Vector Index:** IVFFlat provides sub-linear search time
- **Lazy Loading:** Services initialized on first use
- **Connection Pool:** Async connection pooling for DB
