# CLAUDE.md - AI Coding Guidelines for Dexter

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Dexter** is an AI-Powered Sentry Support Co-Pilot that transforms raw Sentry errors into actionable insights. The system is designed to be a **learning knowledge system** that improves with every human interaction.

## Core Design Principles

1. **Local-first architecture** minimizing external API costs
2. **Code-optimized embeddings** using Jina v2 (768-dim, 161M params - we accept higher compute for better recall)
3. **Active learning feedback loop** that improves with human corrections
4. **Structured prompts** with citation requirements and confidence scoring
5. **RAG retrieval** from a PostgreSQL + pgvector knowledge base
6. **PII-first security** - scrub BEFORE storage, never after

## Key Documents

- **`DEVELOPMENT_PLAN.md`** - Active development roadmap (START HERE)
- **`sentry-copilot-solution-design.docx`** - Original solution design document
- **`external/`** - Reference repositories for code patterns
- **`archive/`** - Historical documentation from previous development phases

## Reference Repositories (`/external/`)

| Repository | What to Study |
|------------|---------------|
| `rag_api` | DB-layer patterns, repositories, migrations, dependency injection |
| `vectorapi` | Vector queries, SQLAlchemy + pgvector integration |
| `ntt_rag_project` | Project structure, routers/services/schemas, test strategy |
| `pgai` | Embedding lifecycle, auto-sync, background jobs |
| `text-embeddings-inference` | Batching, concurrency, separate embeddings service |
| `fastapi-langgraph-agent-production-ready-template` | Config, logging, security, rate limiting |

## Current Implementation Status

### Existing (Preserve & Enhance)
- FastAPI backend with async architecture
- React + Mantine frontend with React Query
- Multi-provider LLM integration (Ollama, OpenAI, Claude)
- Specialized analyzers (Deadlock, N+1, Promise Rejection, Memory Leak)
- PII scrubbing utilities (basic regex-based)
- Prometheus metrics

### To Be Implemented (Per DEVELOPMENT_PLAN.md)
- PostgreSQL + pgvector knowledge base
- Jina code embeddings for semantic search
- Sentry webhook handler for real-time ingestion
- RAG retrieval system with similarity search
- Feedback loop (thumbs up/down, corrections)
- Confidence scoring in AI responses
- PII hardening with comprehensive scrubbing

## Non-Functional Requirements (Hard Constraints)

### Security & PII
- **PII Scrubbing**: Must happen BEFORE any storage or embedding
- **Fields to Scrub**: user_id, email, IP, request URL, auth tokens, cookies
- **Stack Trace Redaction**: Remove secrets from `context_line` fields
- **No Raw Headers**: Never store request headers in database
- **Logging**: Use SHA-256 hashing for any PII in logs

### Performance
- **Embedding Model**: Jina v2 Code (accept ~600MB download, ~1s per embedding)
- **Model Warm-up**: Singleton with warm-up at startup (<30s)
- **Embedding Cache**: LRU cache on `issue_id` for repeated events
- **Analysis Latency**: Target <3s P95 for full pipeline

### Accessibility (A11y)
- All `ActionIcon` components must have `aria-label`
- Focus states must be visible
- Color alone should not convey meaning
- WCAG AA compliance for status badges

## Development Commands

```bash
# Frontend
cd frontend && npm run dev      # Start dev server (port 5175)
npm run typecheck               # Type checking
npm run test                    # Run tests

# Backend
cd backend && poetry run uvicorn app.main:app --reload  # Start API (port 8000)
poetry run pytest               # Run tests

# Database (after implementation)
docker-compose up postgres      # Start PostgreSQL + pgvector
alembic upgrade head            # Run migrations
```

## Architecture

```
frontend/src/
├── api/unified/          # API client (React Query hooks)
├── components/           # React components
├── hooks/               # Custom hooks
├── store/               # Zustand state
└── utils/               # Utilities

backend/app/
├── core/                # App configuration
├── db/                  # Database layer (NEW - see DEVELOPMENT_PLAN.md)
├── routers/             # API endpoints
├── services/            # Business logic
├── models/              # Pydantic schemas
└── utils/               # Parsers and helpers
```

## Code Quality Standards

- TypeScript strict mode enabled
- 85% test coverage target
- ESLint + Prettier for frontend
- Black + isort + flake8 for backend
- All API responses validated with Zod (frontend) / Pydantic (backend)

## Key Conventions

### General
1. Use React Query hooks for data fetching, not raw axios
2. Use Zustand for client state, React Query for server state
3. All new backend endpoints go in `/api/v1/` prefix
4. Use existing analyzers as templates for new ones
5. Add feedback buttons to all AI-generated content

### Error Handling
- Use Pydantic models for ALL input validation (no loose `dict` handling)
- Wrap embedding generation in try/except with fallback (`embedding = None`)
- Return HTTP 400 for invalid payloads (not 500) to prevent webhook loops
- Log with structured format including request IDs

### PII Security (Critical)
- Always call `pii_scrubber.scrub_dict()` BEFORE:
  - Storing to database
  - Generating embeddings
  - Logging payloads
- Use public methods only (not `_private` methods) for maintainability
- Hash user identifiers with SHA-256 + salt

### Accessibility
- Every `ActionIcon` needs `aria-label`
- Every icon needs `aria-hidden="true"` if decorative
- Tables need keyboard navigation (`tabIndex`, `onKeyDown`)
- Use `role="group"` with `aria-label` for button groups

## Testing Requirements

### Unit Tests Must Cover
- PII scrubber (all patterns, edge cases)
- Database repositories (CRUD)
- Embedding service (init, caching, failure modes)
- Feedback service (all feedback types)

### Integration Tests Must Cover
- Webhook → PII Scrub → Database pipeline
- RAG retrieval accuracy
- LLM structured output parsing
- Feedback → knowledge base updates

### Security Tests
- PII scrubbing coverage (no leakage)
- HMAC signature validation
- SQL injection prevention in similarity queries

## Common Pitfalls to Avoid

1. **Don't use loose dicts** - Always validate with Pydantic models
2. **Don't call private methods** - Use public APIs for future compatibility
3. **Don't store raw PII** - Always scrub before storage
4. **Don't skip embedding errors** - Store with `processing_status='failed'` for retry
5. **Don't ignore accessibility** - aria-labels are mandatory for icon buttons
6. **Don't batch tool calls that depend on each other** - Run sequentially

## File Naming Conventions

- Backend: `snake_case.py` (e.g., `pii_scrubber.py`, `embedding_service.py`)
- Frontend: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- Tests: `test_<module>.py` (backend), `<Component>.test.tsx` (frontend)

## Implementation Order (from DEVELOPMENT_PLAN.md)

1. Phase 1: PostgreSQL + pgvector + Jina embeddings
2. Phase 1.5: PII hardening (CRITICAL - before any production use)
3. Phase 2: Webhook handler + ingestion pipeline
4. Phase 3: RAG retrieval system
5. Phase 4: Enhanced LLM with confidence scoring
6. Phase 5: Feedback loop (UI + API)
7. Phase 6: Knowledge base browser
8. Phase 7: Complexity router (optional)

## Quick Reference: Key Services

| Service | Purpose | Location |
|---------|---------|----------|
| `PIIScrubber` | Scrub PII before storage | `backend/app/services/pii_scrubber.py` |
| `CodeEmbeddings` | Generate Jina embeddings | `backend/app/services/embeddings_service.py` |
| `RetrievalService` | Find similar issues | `backend/app/services/retrieval_service.py` |
| `IngestionService` | Process webhook events | `backend/app/services/ingestion_service.py` |
| `FeedbackService` | Record human feedback | `backend/app/services/feedback_service.py` |
| `AnalysisPipeline` | Orchestrate full analysis | `backend/app/services/analysis_pipeline.py` |
