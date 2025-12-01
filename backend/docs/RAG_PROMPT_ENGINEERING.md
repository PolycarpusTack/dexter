# RAG Prompt Engineering Guide

**EPIC P - Story P-2: Enhanced LLM prompts with enrichment context injection**

This document explains how Dexter builds context-aware prompts for LLM analysis using enrichment data from Sentry.

## Table of Contents

- [Overview](#overview)
- [Prompt Structure](#prompt-structure)
- [Enrichment Context Injection](#enrichment-context-injection)
- [Source Prioritization](#source-prioritization)
- [Token Budget Management](#token-budget-management)
- [Error-Type-Specific Prompts](#error-type-specific-prompts)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Overview

Traditional RAG prompts only include similar past issues. Our enhanced prompts inject **operational context** from 11 Sentry enrichment sources:

1. Release context (deployments, suspect commits)
2. Performance spans (slow queries, N+1 patterns)
3. Profiling hotspots (CPU-intensive functions)
4. Alert context (incidents, alert storms)
5. Session data (crash rates, user impact)
6. Breadcrumb timeline (user actions before error)
7. Ownership (team assignments)
8. Tag distributions (environment, browser, OS)
9. Measurements (web vitals, custom metrics)
10. Grouping insights (fingerprint variants)
11. Attachments metadata (screenshots, logs)

This provides LLMs with **business context** beyond just error text.

## Prompt Structure

### Complete Prompt Anatomy

```
[System Prompt]
├── Role definition (expert software engineer)
├── Task description (debug errors)
├── Confidence-based instructions (HIGH/MEDIUM/LOW)
└── Citation requirements

[User Prompt]
├── User query (optional)
├── Current error summary
│   ├── Error type
│   ├── Error message
│   ├── Platform
│   └── Environment tags
├── Enrichment context (prioritized by error type)
│   ├── Release context
│   ├── Performance data
│   ├── Profiling data
│   ├── Alert context
│   ├── Session impact
│   ├── Breadcrumb timeline
│   ├── Ownership
│   ├── Tag distributions
│   └── Measurements
├── Similar past issues (top 3)
│   ├── Validated solutions (human-verified)
│   ├── AI explanations
│   └── Suggested fixes
└── Analysis instructions
    ├── Root cause
    ├── Solution
    └── Prevention
```

### Token Budget Allocation

Total budget: **6000 tokens** (reserve 2000 for LLM response)

| Section | Allocation | Priority |
|---------|------------|----------|
| User query | Variable (50-200) | High |
| Error summary | ~300 | High |
| Enrichment context | ~2000-3000 | Medium |
| Similar issues | ~1000-2000 | Medium |
| Instructions | ~200 | Low |

**Budget enforcement**:
- Each section allocated dynamically
- Large blocks summarized if exceeding max
- Token estimation: ~4 chars per token

## Enrichment Context Injection

### How It Works

1. **Fetch Enrichment Data**
   ```python
   issue = await session.get(SentryIssue, issue_id)
   # Enrichment data stored in JSONB columns:
   # - release_context
   # - performance_data
   # - profiling_data
   # - alert_context
   # - session_data
   # - breadcrumbs
   # - ownership
   # - tag_distributions
   # - measurements
   ```

2. **Prioritize by Error Type**
   ```python
   priorities = builder._determine_enrichment_priorities(issue.error_type)
   # Performance errors → prioritize performance_data, profiling_data
   # Database errors → prioritize performance_data, breadcrumbs
   # Memory errors → prioritize profiling_data, measurements
   ```

3. **Format Each Source**
   ```python
   for source in priorities:
       block = builder._format_enrichment_source(issue, source)
       if block_tokens > MAX_PER_SOURCE:
           block = summarize_to_budget(block, MAX_PER_SOURCE)
       enrichment_blocks.append(block)
   ```

4. **Inject into Prompt**
   ```python
   user_prompt = f"""
   {user_query}

   {error_summary}

   **Enrichment Context:**
   {enrichment_block_1}

   {enrichment_block_2}

   ...

   {similar_issues}

   {instructions}
   """
   ```

### Formatted Enrichment Examples

#### Release Context
```
**Release Context:**
- Version: v2.5.1
- Deployed: 2025-11-30T10:30:00Z
- Crash Free Rate: 98.5%
- Health Score: 0.95

**Suspect Commits (2):**
- Jane Doe: Optimize database query performance
- John Smith: Fix memory leak in worker process
```

#### Performance Data
```
**Performance Data:**

**Problem Spans (3):**
- [CRITICAL] db.query: SELECT * FROM orders WHERE ... (5000ms)
- [HIGH] http.client: POST /api/external/service (3500ms)
- [MEDIUM] cache.get: Redis lookup for user_data (800ms)

**N+1 Query Patterns (1):**
- 50 occurrences: SELECT * FROM posts WHERE user_id = ?
```

#### Profiling Hotspots
```
**Profiling Hotspots (2):**
- [HIGH] process_data in processor.py (65.0% time)
- [MEDIUM] serialize_json in utils.py (20.0% time)
```

#### Alert Context
```
**Alert Context:**
- Recent Alerts: 8 in last 24h
- ⚠️ Currently in Active Incident

**Recent Alerts (3):**
- 2025-11-30T14:00:00: Error Rate Exceeded
- 2025-11-30T13:30:00: Timeout Rate High
- 2025-11-30T13:00:00: Memory Usage Critical
```

#### Session Impact
```
**Session Impact:**
- Crash Free Rate: 95.5%
- Impact: 4.5% of sessions
- Session Replays: 10 available
```

#### Breadcrumb Timeline
```
**Breadcrumb Timeline (5 events):**
- [14:30:00] navigation: User navigated to /dashboard
- [14:30:01] xhr: AJAX request to /api/data
- [14:30:02] ui.click: Clicked "Load More" button
- [14:30:03] db: Query users table
- [14:30:05] error: TimeoutError thrown
```

## Source Prioritization

Different error types benefit from different enrichment sources.

### Performance/Timeout Errors

**Priority**:
1. Performance data (slow spans, N+1 patterns)
2. Profiling data (hot functions)
3. Measurements (web vitals)
4. Release context (recent deployments)
5. Ownership (who to notify)
6. Alert context (incident status)
7. Tag distributions (environment patterns)
8. Session data (user impact)
9. Breadcrumbs (user actions)

**Why**: Performance issues need performance diagnostics first.

### Database Errors

**Priority**:
1. Performance data (slow queries)
2. Profiling data (query hotspots)
3. Breadcrumbs (query sequence)
4. Release context (schema changes)
5. Ownership (DB team)
6. Tag distributions (environment)

**Why**: Database errors often involve query patterns visible in spans.

### Memory Errors

**Priority**:
1. Profiling data (allocation hotspots)
2. Measurements (heap size, GC stats)
3. Breadcrumbs (memory pressure timeline)
4. Release context (code changes)
5. Session data (crash patterns)

**Why**: Memory issues need profiling data and heap metrics.

### Default Priority

For unknown error types:
1. Release context (always useful)
2. Ownership (who owns it)
3. Alert context (incident status)
4. Performance data (general diagnostics)
5. Session data (user impact)
6. Breadcrumbs (context)
7. Tag distributions (patterns)
8. Profiling data (hotspots)
9. Measurements (metrics)
10. Grouping insights (variants)
11. Attachments metadata (logs/screenshots)

## Token Budget Management

### Why Token Budgets Matter

- **LLM context limits**: Most models have 8k-32k context windows
- **Cost**: Tokens cost money (input + output)
- **Quality**: Too much context → noise, too little → missing info
- **Latency**: Larger prompts = slower inference

### Budget Allocation Strategy

```python
budget = PromptBudgetManager(
    total_budget=6000,  # Total available
    output_reserve=2000  # Reserve for LLM response
)
available = 4000  # For prompt

# Allocate sections
budget.allocate("user_query", 100)       # 2.5%
budget.allocate("error_summary", 300)    # 7.5%
budget.allocate("enrichment", 2000)      # 50%
budget.allocate("similar_issues", 1400)  # 35%
budget.allocate("instructions", 200)     # 5%

total_used = 4000  # 100% of available budget
```

### Truncation Strategies

#### 1. Simple Truncation (Start Preserved)
```python
text = "Very long enrichment data..."
truncated = TokenCounter.truncate_to_budget(text, max_tokens=500)
# Result: "Very long enrichment data... [first 500 tokens] ..."
```

#### 2. End-Preserved Truncation
```python
truncated = TokenCounter.truncate_to_budget(
    text,
    max_tokens=500,
    preserve_end=True
)
# Result: "... [last 500 tokens]"
```

#### 3. Summarization (Start + End)
```python
summarized = TokenCounter.summarize_to_budget(
    text,
    max_tokens=500,
    summary_ratio=0.3  # Keep 30% from start, 30% from end
)
# Result: "[first 150 tokens] ... [content truncated] ... [last 150 tokens]"
```

### Per-Source Budgets

Each enrichment source has a max budget (2000 tokens):

```python
MAX_PER_SOURCE = 2000

for source in priorities:
    block = format_source(issue, source)
    block_tokens = count_tokens(block)

    if block_tokens > MAX_PER_SOURCE:
        # Summarize large blocks
        block = summarize_to_budget(block, MAX_PER_SOURCE)

    # Check remaining total budget
    if token_count + block_tokens > max_tokens:
        # Truncate to fit
        remaining = max_tokens - token_count
        block = truncate_to_budget(block, remaining)
        break

    blocks.append(block)
    token_count += block_tokens
```

### Token Estimation

Fast heuristic: **1 token ≈ 4 characters**

```python
def estimate_tokens(text: str) -> int:
    return len(text) // 4

# Example:
text = "Hello, world!"  # 13 chars
tokens = estimate_tokens(text)  # ~3 tokens
```

Accuracy: ±10% for English text

For exact counts, use `tiktoken` library (slower):
```python
import tiktoken
encoder = tiktoken.get_encoding("cl100k_base")
tokens = len(encoder.encode(text))
```

## Error-Type-Specific Prompts

### Timeout Error Prompt

```
## Current Error

**Type:** TimeoutError
**Message:** Request timeout after 30s in database query
**Platform:** python
**Environment:** production

**Enrichment Context:**

**Performance Data:**
**Problem Spans (1):**
- [CRITICAL] db.query: SELECT * FROM orders WHERE status = 'pending' (5000ms)

**Profiling Hotspots (1):**
- [HIGH] execute_query in db.py (65.0% time)

**Release Context:**
- Version: v2.5.1
- Deployed: 2025-11-30T10:30:00Z (2 hours ago)
**Suspect Commits (1):**
- Jane Doe: Optimize database query performance

**Alert Context:**
- Recent Alerts: 8 in last 24h
- ⚠️ Currently in Active Incident

## Similar Past Issues

### Issue #1 (Similarity: 92%)
✓ **Validated Solution**
**Error:** TimeoutError: Database query timeout
**Verified Solution:**
Added index on orders.status column. Query time dropped from 5s to 50ms.
```

### Database Deadlock Prompt

```
## Current Error

**Type:** DatabaseError
**Message:** Deadlock detected in transaction
**Platform:** python
**Environment:** production

**Enrichment Context:**

**Performance Data:**
**Problem Spans (2):**
- [HIGH] db.query: UPDATE users SET ... WHERE id = ? (2000ms)
- [HIGH] db.query: UPDATE orders SET ... WHERE user_id = ? (1800ms)

**Breadcrumb Timeline:**
- [14:30:01] db: BEGIN transaction
- [14:30:02] db: UPDATE users WHERE id = 123
- [14:30:03] db: UPDATE orders WHERE user_id = 123
- [14:30:04] db: COMMIT transaction
- [14:30:05] error: Deadlock detected

**Ownership:**
- Teams: backend-team, database-team
- Primary: database-team
```

## Examples

### Full Enriched Prompt

<details>
<summary>Click to expand full example</summary>

```
[System Prompt]
You are an expert software engineer helping debug errors.
Your task is to explain errors clearly and provide actionable solutions.

Guidelines:
1. Be concise but thorough
2. Explain the root cause first
3. Provide specific, actionable fixes
4. Include code examples when helpful
5. Mention any edge cases or gotchas

IMPORTANT: You have been provided with validated solutions from past similar issues.
These solutions have been verified by humans. Prioritize these solutions and cite them.

The knowledge base has HIGH confidence matches for this error.
Use the provided context heavily and cite the similar issues.

[User Prompt]
**User Question:** Why does this keep timing out?

## Current Error

**Type:** TimeoutError
**Message:** Request timeout after 30s in database query
**Platform:** python
**Level:** error
**Environment:** production

**Enrichment Context:**

**Performance Data:**

**Problem Spans (3):**
- [CRITICAL] db.query: SELECT * FROM orders WHERE status = 'pending' AND created_at > ? (5000ms)
- [HIGH] cache.get: Redis lookup for user_preferences (800ms)
- [MEDIUM] http.client: POST /api/notifications/send (1200ms)

**N+1 Query Patterns (1):**
- 50 occurrences: SELECT * FROM order_items WHERE order_id = ?

**Profiling Hotspots (2):**
- [HIGH] fetch_pending_orders in orders.py (65.0% time)
- [MEDIUM] process_notifications in tasks.py (20.0% time)

**Release Context:**
- Version: v2.5.1
- Deployed: 2025-11-30T10:30:00Z
- Crash Free Rate: 98.5%
- Health Score: 0.95

**Suspect Commits (2):**
- Jane Doe: Optimize database query performance
- John Smith: Add notification batching

**Alert Context:**
- Recent Alerts: 8 in last 24h
- ⚠️ Currently in Active Incident

**Recent Alerts (3):**
- 2025-11-30T14:00:00: Timeout Rate Exceeded
- 2025-11-30T13:30:00: Database Slow Query
- 2025-11-30T13:00:00: Error Rate High

**Session Impact:**
- Crash Free Rate: 95.5%
- Impact: 4.5% of sessions
- Session Replays: 10 available

**Breadcrumb Timeline (5 events):**
- [14:30:00] navigation: User navigated to /orders
- [14:30:01] xhr: AJAX request to /api/orders/pending
- [14:30:02] db: Query orders table
- [14:30:03] db: Query order_items table (x50)
- [14:30:05] error: TimeoutError thrown

**Ownership:**
- Teams: backend-team
- Primary: backend-team

**Tag Distributions:**
- environment: production (100 occurrences)
- database: postgresql (100 occurrences)

## Similar Past Issues

### Issue #1 (Similarity: 92%)
✓ **Validated Solution**
**Error:** TimeoutError: Database query timeout on orders table

**Verified Solution:**
Added composite index on (status, created_at). Query time dropped from 5s to 50ms.

**Suggested Fix:**
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

### Issue #2 (Similarity: 85%)
**Error:** TimeoutError: Slow query on large table

**Previous Analysis:**
Missing index causing full table scan. 1M+ rows scanned per query.

**Suggested Fix:**
Add index and implement pagination for large result sets.

**Important:** Please cite the relevant similar issue(s) in your explanation.

## Please Provide

1. **Root Cause:** What caused this error
2. **Solution:** How to fix it
3. **Prevention:** How to prevent it in the future
```

</details>

### LLM Response (Example)

```markdown
## Analysis

**Root Cause:**

This timeout is caused by a combination of factors (citing **Issue #1**):

1. **Missing database index**: The query `SELECT * FROM orders WHERE status = 'pending' AND created_at > ?` is doing a full table scan (5000ms execution time).
2. **N+1 query problem**: After fetching orders, the code makes 50 separate queries to `order_items` (visible in breadcrumb timeline).
3. **Recent deployment**: The issue started 2 hours ago after v2.5.1 deployment, which includes "Optimize database query performance" commit (suspect commit by Jane Doe).

The profiling data confirms 65% of time is spent in `fetch_pending_orders`.

**Solution:**

Immediate fix (based on validated solution from Issue #1):

```sql
-- Add composite index for the slow query
CREATE INDEX idx_orders_status_created
ON orders(status, created_at);
```

This should reduce query time from 5s to ~50ms.

For the N+1 problem:

```python
# Before (N+1):
orders = Order.query.filter_by(status='pending').all()
for order in orders:
    items = OrderItem.query.filter_by(order_id=order.id).all()

# After (eager loading):
from sqlalchemy.orm import joinedload
orders = Order.query.filter_by(status='pending')\
    .options(joinedload(Order.items))\
    .all()
```

**Prevention:**

1. Add database query monitoring to catch missing indexes
2. Enable SQL query logging in staging to detect N+1 patterns before production
3. Add integration tests that measure query counts
4. Review suspect commit (Jane's optimization) - it may have removed an index

**Session Replays:**

Check the 10 available session replays to confirm user impact and timing.
```

## Best Practices

### DO

✅ **Prioritize by error type** - Performance errors get performance context first
✅ **Enforce token budgets** - Prevent prompt bloat
✅ **Summarize large blocks** - Keep first + last portions
✅ **Include timestamps** - Helps correlate events
✅ **Show severity levels** - [CRITICAL], [HIGH], [MEDIUM], [LOW]
✅ **Cite sources** - Validated solutions, similar issues
✅ **Include metrics** - Numbers tell the story (5000ms, 50 occurrences, 98.5%)
✅ **Provide context** - Teams, environments, deployments

### DON'T

❌ **Don't dump raw JSON** - Format it for readability
❌ **Don't exceed token budgets** - Truncate or summarize
❌ **Don't include irrelevant data** - Prioritize by error type
❌ **Don't lose important details** - Summarize intelligently (keep critical info)
❌ **Don't ignore freshness** - Old enrichment data gets staleness discount
❌ **Don't forget user query** - If provided, include it first
❌ **Don't skip instructions** - Tell LLM what format you want

### Prompt Engineering Tips

1. **Structure matters** - Use markdown headers, lists, bold
2. **Numbers are powerful** - Quantify everything (5000ms, 98.5%, 50 queries)
3. **Context before details** - Release → Performance → Profiling
4. **Cite validated solutions** - "Based on Issue #1 (validated)..."
5. **Show severity** - [CRITICAL] grabs attention
6. **Include breadcrumbs** - Timeline shows causation
7. **Ownership helps** - Tells LLM who to notify
8. **Incidents matter** - "⚠️ Currently in Active Incident" changes priority

## References

- **Implementation**: `/backend/app/services/rag_prompt_builder.py`
- **Token Counter**: `/backend/app/utils/token_counter.py`
- **Tests**: `/backend/tests/services/test_rag_prompt_builder_enriched.py`
- **Signal Computation**: `/backend/app/services/enrichment/signal_computation.py`
