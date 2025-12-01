# Sentry Data Client Framework - Usage Examples

Comprehensive examples demonstrating real-world usage patterns for all 11 data source clients.

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Release Intelligence](#release-intelligence)
3. [Performance Analysis](#performance-analysis)
4. [Profiling](#profiling)
5. [Session Replays](#session-replays)
6. [Breadcrumbs](#breadcrumbs)
7. [Alerts & Incidents](#alerts--incidents)
8. [Attachments](#attachments)
9. [Tags](#tags)
10. [Ownership](#ownership)
11. [Measurements & Web Vitals](#measurements--web-vitals)
12. [Grouping & Fingerprints](#grouping--fingerprints)
13. [Advanced Patterns](#advanced-patterns)

---

## Setup & Configuration

### Basic Setup

```python
from app.services.sentry.releases import ReleaseClient
from app.services.sentry.performance import PerformanceClient
from app.core.config import get_settings

settings = get_settings()
token = settings.get_sentry_token()

# Initialize clients
release_client = ReleaseClient(token=token)
perf_client = PerformanceClient(token=token)
```

### Custom Configuration

```python
from app.services.sentry.releases import ReleaseClient

client = ReleaseClient(
    token=settings.get_sentry_token(),
    base_url="https://sentry.io/api/0",
    timeout=30,
    requests_per_minute=150,  # Custom rate limit
    enable_cache=True,
    cache_ttl=600,  # 10 minute cache
    circuit_breaker_threshold=10,  # More tolerant
    circuit_breaker_timeout=120.0  # Longer recovery
)
```

---

## Release Intelligence

### Example 1: Identify Unhealthy Releases

```python
from app.services.sentry.releases import ReleaseClient

async def identify_unhealthy_releases(org_slug: str, project_slug: str):
    """Find releases with poor crash-free rates."""
    client = ReleaseClient(token=settings.get_sentry_token())

    releases = await client.get_releases(org_slug, project_slug)

    unhealthy = []
    for release in releases:
        if release.crash_free_users and release.crash_free_users < 95.0:
            unhealthy.append({
                "version": release.version,
                "crash_free_users": release.crash_free_users,
                "crash_free_sessions": release.crash_free_sessions,
                "new_groups": release.new_groups,
            })

    return unhealthy

# Usage
unhealthy_releases = await identify_unhealthy_releases("my-org", "my-project")
for release in unhealthy_releases:
    print(f"⚠️ {release['version']}: {release['crash_free_users']}% crash-free")
```

### Example 2: Trace Root Cause via Suspect Commits

```python
async def trace_issue_to_commit(issue_id: str):
    """Find the likely commit that introduced an issue."""
    client = ReleaseClient(token=settings.get_sentry_token())

    commits = await client.get_suspect_commits(issue_id)

    # Filter high-confidence suspects
    high_confidence = [
        c for c in commits
        if c.confidence_score and c.confidence_score > 0.8
    ]

    if high_confidence:
        commit = high_confidence[0]
        return {
            "commit_id": commit.id,
            "author": commit.author['name'],
            "email": commit.author['email'],
            "message": commit.message,
            "confidence": commit.confidence_score,
            "repository": commit.repository.get('name', 'unknown'),
        }

    return None

# Usage
suspect = await trace_issue_to_commit("12345")
if suspect:
    print(f"Likely culprit: {suspect['author']} ({suspect['confidence']:.0%} confidence)")
    print(f"Commit: {suspect['commit_id']}")
    print(f"Message: {suspect['message']}")
```

### Example 3: Release Deployment Timeline

```python
async def get_deployment_timeline(org_slug: str, project_slug: str, version: str):
    """Get deployment timeline for a release across environments."""
    client = ReleaseClient(token=settings.get_sentry_token())

    deploys = await client.get_release_deploys(org_slug, project_slug, version)

    timeline = []
    for deploy in sorted(deploys, key=lambda d: d.date_started):
        timeline.append({
            "environment": deploy.environment,
            "started": deploy.date_started.isoformat(),
            "finished": deploy.date_finished.isoformat() if deploy.date_finished else "In progress",
        })

    return timeline

# Usage
timeline = await get_deployment_timeline("my-org", "my-project", "1.0.0")
for event in timeline:
    print(f"{event['environment']}: {event['started']} -> {event['finished']}")
```

---

## Performance Analysis

### Example 4: Identify Slow Database Queries

```python
from app.services.sentry.performance import PerformanceClient

async def find_slow_db_queries(issue_id: str, threshold_ms: float = 1000):
    """Identify slow database queries from performance spans."""
    client = PerformanceClient(token=settings.get_sentry_token())

    spans = await client.get_performance_spans(issue_id)

    slow_queries = []
    for span in spans:
        if span.operation.startswith("db.") and span.duration_ms > threshold_ms:
            slow_queries.append({
                "operation": span.operation,
                "description": span.description,
                "duration_ms": span.duration_ms,
                "tags": span.tags,
            })

    return sorted(slow_queries, key=lambda q: q['duration_ms'], reverse=True)

# Usage
slow_queries = await find_slow_db_queries("issue-12345", threshold_ms=500)
for query in slow_queries:
    print(f"⏱️ {query['duration_ms']:.0f}ms: {query['description']}")
```

### Example 5: Aggregate Performance Metrics

```python
async def get_performance_report(org_slug: str, project_slug: str):
    """Generate performance report with key metrics."""
    client = PerformanceClient(token=settings.get_sentry_token())

    metrics = await client.get_performance_metrics(org_slug, project_slug)

    report = []
    for metric in metrics:
        if metric.p95 and metric.p95 > 1000:  # Slow transactions (>1s)
            report.append({
                "transaction": metric.transaction,
                "count": metric.count,
                "p50": metric.p50,
                "p95": metric.p95,
                "p99": metric.p99,
                "failure_rate": metric.failure_rate,
            })

    return sorted(report, key=lambda r: r['p95'], reverse=True)

# Usage
report = await get_performance_report("my-org", "my-project")
for txn in report[:10]:  # Top 10 slowest
    print(f"{txn['transaction']}")
    print(f"  P95: {txn['p95']:.0f}ms | P99: {txn['p99']:.0f}ms")
    print(f"  Count: {txn['count']} | Failure rate: {txn['failure_rate']:.2%}")
```

### Example 6: Detect N+1 Queries

```python
async def detect_n_plus_one_queries(issue_id: str):
    """Detect potential N+1 query patterns from spans."""
    client = PerformanceClient(token=settings.get_sentry_token())

    spans = await client.get_performance_spans(issue_id)

    # Group by operation
    db_spans = [s for s in spans if s.operation.startswith("db.")]

    # Detect repeated similar queries
    query_patterns = {}
    for span in db_spans:
        # Simple pattern detection (real implementation would be more sophisticated)
        pattern = span.description[:50]  # First 50 chars
        query_patterns[pattern] = query_patterns.get(pattern, 0) + 1

    # N+1 indicators: many identical queries
    n_plus_one_candidates = {
        pattern: count
        for pattern, count in query_patterns.items()
        if count > 5
    }

    return n_plus_one_candidates

# Usage
candidates = await detect_n_plus_one_queries("issue-12345")
for pattern, count in candidates.items():
    print(f"⚠️ Potential N+1: {count}x occurrences")
    print(f"   Pattern: {pattern}...")
```

---

## Profiling

### Example 7: Find Hot Functions

```python
from app.services.sentry.profiling import ProfilingClient

async def find_hot_functions(org_slug: str, project: str):
    """Identify functions consuming most CPU time."""
    client = ProfilingClient(token=settings.get_sentry_token())

    profiles = await client.get_profiles(org_slug, project=project, limit=20)

    # Find slow profiles
    slow_profiles = [p for p in profiles if p.duration_ms > 1000]

    return [{
        "transaction": p.transaction_name,
        "duration_ms": p.duration_ms,
        "platform": p.platform,
        "trace_id": p.trace_id,
    } for p in slow_profiles]

# Usage
hot_functions = await find_hot_functions("my-org", "my-project")
for func in hot_functions:
    print(f"🔥 {func['transaction']}: {func['duration_ms']:.0f}ms")
```

---

## Session Replays

### Example 8: Find Replays with Errors

```python
from app.services.sentry.sessions import SessionClient

async def find_error_replays(issue_id: str):
    """Find session replays that captured errors."""
    client = SessionClient(token=settings.get_sentry_token())

    replays = await client.get_issue_replays(issue_id)

    error_replays = [
        {
            "replay_id": r.replay_id,
            "duration": r.duration,
            "error_count": r.count_errors,
            "urls": r.urls,
            "user": r.user,
        }
        for r in replays
        if r.count_errors > 0
    ]

    return error_replays

# Usage
error_replays = await find_error_replays("issue-12345")
for replay in error_replays:
    print(f"📹 Replay {replay['replay_id']}: {replay['error_count']} errors")
    print(f"   Duration: {replay['duration']}s")
    print(f"   URLs: {', '.join(replay['urls'][:3])}")
```

---

## Breadcrumbs

### Example 9: Reconstruct User Journey

```python
from app.services.sentry.breadcrumbs import BreadcrumbClient

async def reconstruct_user_journey(issue_id: str):
    """Reconstruct user's path leading to an error."""
    client = BreadcrumbClient(token=settings.get_sentry_token())

    breadcrumbs = await client.get_breadcrumbs_from_issue(issue_id)

    journey = []
    for crumb in breadcrumbs:
        journey.append({
            "timestamp": crumb.timestamp.isoformat(),
            "type": crumb.type,
            "category": crumb.category,
            "message": crumb.message,
            "level": crumb.level,
        })

    return journey

# Usage
journey = await reconstruct_user_journey("issue-12345")
print("User Journey:")
for step in journey:
    icon = "🔴" if step['level'] == "error" else "🔵"
    print(f"{icon} [{step['timestamp']}] {step['type']}: {step['message']}")
```

### Example 10: Analyze HTTP Request Patterns

```python
async def analyze_http_patterns(issue_id: str):
    """Analyze HTTP request patterns from breadcrumbs."""
    client = BreadcrumbClient(token=settings.get_sentry_token())

    http_crumbs = await client.get_http_breadcrumbs(issue_id)

    patterns = {
        "total_requests": len(http_crumbs),
        "status_codes": {},
        "methods": {},
        "slow_requests": []
    }

    for crumb in http_crumbs:
        # Extract status code
        status = crumb.data.get('status_code')
        if status:
            patterns['status_codes'][status] = patterns['status_codes'].get(status, 0) + 1

        # Extract method
        method = crumb.data.get('method')
        if method:
            patterns['methods'][method] = patterns['methods'].get(method, 0) + 1

        # Detect slow requests
        duration = crumb.data.get('duration')
        if duration and duration > 1000:
            patterns['slow_requests'].append({
                "url": crumb.data.get('url'),
                "duration_ms": duration,
            })

    return patterns

# Usage
patterns = await analyze_http_patterns("issue-12345")
print(f"Total HTTP requests: {patterns['total_requests']}")
print(f"Status codes: {patterns['status_codes']}")
print(f"Slow requests: {len(patterns['slow_requests'])}")
```

---

## Alerts & Incidents

### Example 11: Monitor Active Incidents

```python
from app.services.sentry.alerts import AlertClient

async def monitor_critical_incidents(org_slug: str):
    """Monitor critical incidents requiring immediate attention."""
    client = AlertClient(token=settings.get_sentry_token())

    incidents = await client.get_incidents(org_slug, status="open")

    critical = [
        {
            "id": inc.id,
            "title": inc.title,
            "status": inc.status,
            "started": inc.date_started.isoformat(),
            "detected": inc.date_detected.isoformat(),
        }
        for inc in incidents
        if inc.status == "critical"
    ]

    return critical

# Usage
critical_incidents = await monitor_critical_incidents("my-org")
for incident in critical_incidents:
    print(f"🚨 CRITICAL: {incident['title']}")
    print(f"   Started: {incident['started']}")
```

### Example 12: Check Uptime Monitor Status

```python
async def check_monitor_health(org_slug: str):
    """Check health of all uptime monitors."""
    client = AlertClient(token=settings.get_sentry_token())

    monitors = await client.get_monitors(org_slug)

    health_report = {
        "total": len(monitors),
        "ok": 0,
        "error": 0,
        "disabled": 0,
        "failing_monitors": []
    }

    for monitor in monitors:
        if monitor.status == "ok":
            health_report['ok'] += 1
        elif monitor.status == "error":
            health_report['error'] += 1
            health_report['failing_monitors'].append({
                "name": monitor.name,
                "type": monitor.type,
                "config": monitor.config,
            })
        elif monitor.status == "disabled":
            health_report['disabled'] += 1

    return health_report

# Usage
health = await check_monitor_health("my-org")
print(f"Monitor Health: {health['ok']} OK, {health['error']} FAILING, {health['disabled']} DISABLED")
for monitor in health['failing_monitors']:
    print(f"  ❌ {monitor['name']} ({monitor['type']})")
```

---

## Attachments

### Example 13: Download Screenshots for Analysis

```python
from app.services.sentry.attachments import AttachmentClient
import base64

async def download_screenshots(org_slug: str, project_slug: str, issue_id: str):
    """Download screenshot attachments for visual debugging."""
    client = AttachmentClient(token=settings.get_sentry_token())

    attachments = await client.get_issue_attachments(org_slug, project_slug, issue_id)

    screenshots = []
    for att in attachments:
        if "image" in att.mimetype:
            # Download the actual file
            content = await client.download_attachment(
                org_slug, project_slug, att.id, att.id
            )

            screenshots.append({
                "name": att.name,
                "size": att.size,
                "mimetype": att.mimetype,
                "data": base64.b64encode(content).decode(),
            })

    return screenshots

# Usage (note: requires actual event_id, not issue_id for download)
# screenshots = await download_screenshots("my-org", "my-project", "issue-12345")
```

---

## Tags

### Example 14: Analyze Browser Distribution

```python
from app.services.sentry.tags import TagClient

async def analyze_browser_distribution(issue_id: str):
    """Analyze which browsers are affected by an issue."""
    client = TagClient(token=settings.get_sentry_token())

    browser_values = await client.get_tag_values(issue_id, "browser")

    distribution = [
        {
            "browser": val.value,
            "count": val.count,
            "percentage": 0,  # Will calculate
        }
        for val in browser_values
    ]

    total = sum(d['count'] for d in distribution)
    for d in distribution:
        d['percentage'] = (d['count'] / total * 100) if total > 0 else 0

    return sorted(distribution, key=lambda d: d['count'], reverse=True)

# Usage
browsers = await analyze_browser_distribution("issue-12345")
for browser in browsers:
    print(f"{browser['browser']}: {browser['count']} ({browser['percentage']:.1f}%)")
```

---

## Ownership

### Example 15: Auto-assign Issues

```python
from app.services.sentry.ownership import OwnershipClient

async def suggest_issue_owner(issue_id: str):
    """Get ownership suggestions for auto-assignment."""
    client = OwnershipClient(token=settings.get_sentry_token())

    suggestions = await client.get_ownership_suggestions(issue_id)

    if not suggestions:
        return None

    # Prioritize suspect commits over other rules
    suspect_commit_owners = [s for s in suggestions if s.type == "suspectCommit"]
    if suspect_commit_owners:
        owner = suspect_commit_owners[0].owner
        return {
            "type": "suspectCommit",
            "id": owner.get('id'),
            "name": owner.get('name'),
            "email": owner.get('email'),
        }

    # Fall back to codeowners
    codeowner_suggestions = [s for s in suggestions if s.type == "codeowners"]
    if codeowner_suggestions:
        owner = codeowner_suggestions[0].owner
        return {
            "type": "codeowners",
            "id": owner.get('id'),
            "name": owner.get('name'),
        }

    return None

# Usage
owner = await suggest_issue_owner("issue-12345")
if owner:
    print(f"Suggested owner ({owner['type']}): {owner['name']}")
```

---

## Measurements & Web Vitals

### Example 16: Audit Web Performance

```python
from app.services.sentry.measurements import MeasurementClient

async def audit_web_performance(org_slug: str, project_slug: str, event_id: str):
    """Audit web performance against Core Web Vitals thresholds."""
    client = MeasurementClient(token=settings.get_sentry_token())

    vitals = await client.get_web_vitals(org_slug, project_slug, event_id)

    audit = {
        "lcp": {
            "value": vitals.lcp,
            "status": "good" if vitals.is_good_lcp else "poor",
            "threshold": 2500,
        },
        "fid": {
            "value": vitals.fid,
            "status": "good" if vitals.is_good_fid else "poor",
            "threshold": 100,
        },
        "cls": {
            "value": vitals.cls,
            "status": "good" if vitals.is_good_cls else "poor",
            "threshold": 0.1,
        },
    }

    return audit

# Usage
audit = await audit_web_performance("my-org", "my-project", "event-abc123")
for metric, data in audit.items():
    status_icon = "✅" if data['status'] == "good" else "❌"
    print(f"{status_icon} {metric.upper()}: {data['value']} (threshold: {data['threshold']})")
```

---

## Grouping & Fingerprints

### Example 17: Analyze Grouping Variants

```python
from app.services.sentry.grouping import GroupingClient

async def analyze_grouping(org_slug: str, project_slug: str, event_id: str):
    """Analyze how an event was grouped."""
    client = GroupingClient(token=settings.get_sentry_token())

    variants = await client.get_grouping_variants(org_slug, project_slug, event_id)

    analysis = []
    for name, variant in variants.items():
        analysis.append({
            "strategy": name,
            "hash": variant.hash,
            "description": variant.description,
        })

    return analysis

# Usage
analysis = await analyze_grouping("my-org", "my-project", "event-abc123")
for variant in analysis:
    print(f"Strategy: {variant['strategy']}")
    print(f"  Hash: {variant['hash']}")
```

---

## Advanced Patterns

### Example 18: Parallel Data Fetching

```python
import asyncio

async def enrich_issue_data(issue_id: str, org_slug: str, project_slug: str):
    """Fetch all available data for an issue in parallel."""
    from app.services.sentry.releases import ReleaseClient
    from app.services.sentry.performance import PerformanceClient
    from app.services.sentry.breadcrumbs import BreadcrumbClient
    from app.services.sentry.tags import TagClient

    token = settings.get_sentry_token()

    # Initialize clients
    release_client = ReleaseClient(token=token)
    perf_client = PerformanceClient(token=token)
    breadcrumb_client = BreadcrumbClient(token=token)
    tag_client = TagClient(token=token)

    # Fetch all data in parallel
    results = await asyncio.gather(
        release_client.get_suspect_commits(issue_id),
        perf_client.get_performance_spans(issue_id),
        breadcrumb_client.get_breadcrumbs_from_issue(issue_id),
        tag_client.get_issue_tags(issue_id),
        return_exceptions=True  # Don't fail if one source fails
    )

    commits, spans, breadcrumbs, tags = results

    return {
        "suspect_commits": commits if not isinstance(commits, Exception) else [],
        "performance_spans": spans if not isinstance(spans, Exception) else [],
        "breadcrumbs": breadcrumbs if not isinstance(breadcrumbs, Exception) else [],
        "tags": tags if not isinstance(tags, Exception) else [],
    }

# Usage
enriched_data = await enrich_issue_data("issue-12345", "my-org", "my-project")
print(f"Fetched {len(enriched_data['suspect_commits'])} commits")
print(f"Fetched {len(enriched_data['performance_spans'])} spans")
print(f"Fetched {len(enriched_data['breadcrumbs'])} breadcrumbs")
print(f"Fetched {len(enriched_data['tags'])} tags")
```

### Example 19: Circuit Breaker Monitoring

```python
async def monitor_client_health():
    """Monitor circuit breaker states across all clients."""
    clients = {
        "releases": ReleaseClient(token=settings.get_sentry_token()),
        "performance": PerformanceClient(token=settings.get_sentry_token()),
        "alerts": AlertClient(token=settings.get_sentry_token()),
    }

    health_report = {}
    for name, client in clients.items():
        metrics = client.get_metrics()
        health_report[name] = {
            "circuit_state": metrics['circuit_breaker']['state'],
            "available_tokens": metrics['rate_limiter']['available_tokens'],
            "cache_size": metrics.get('cache', {}).get('size', 0),
        }

    return health_report

# Usage
health = await monitor_client_health()
for client_name, status in health.items():
    print(f"{client_name}:")
    print(f"  Circuit: {status['circuit_state']}")
    print(f"  Tokens: {status['available_tokens']}")
    print(f"  Cache: {status['cache_size']} items")
```

### Example 20: Retry Strategy Customization

```python
async def fetch_with_custom_retry(issue_id: str):
    """Fetch data with custom retry strategy."""
    client = ReleaseClient(token=settings.get_sentry_token())

    try:
        # Custom retry configuration
        commits = await client._request(
            "GET",
            f"/issues/{issue_id}/events/latest/",
            retry_on=[429, 500, 502, 503, 504],  # Include 500
            max_retries=5,  # More retries
        )
        return commits.get("suspectCommits", [])
    except Exception as e:
        print(f"Failed after retries: {e}")
        return []

# Usage
commits = await fetch_with_custom_retry("issue-12345")
```

---

These examples demonstrate the full capabilities of the Sentry Data Client Framework. Combine them as needed for your specific use cases.
