# Attachments Enrichment Service - Usage Examples

## Basic Usage

### 1. Enable Feature

```bash
# In .env file
ENABLE_ATTACHMENTS=true
SENTRY_ORGANIZATION=your-org
SENTRY_PROJECT=your-project
SENTRY_API_TOKEN=your-token-here
```

### 2. Manual Enrichment

```python
from app.db.database import get_db
from app.services.enrichment.attachments_enrichment import (
    get_attachments_enrichment_service
)

async def enrich_single_issue(issue_id: int):
    """Enrich a single issue with attachment metadata."""
    async for db in get_db():
        try:
            # Create service
            service = await get_attachments_enrichment_service(db)

            # Enrich issue
            result = await service.enrich_issue(issue_id)

            if result["status"] == "success":
                print(f"Enriched issue {issue_id}:")
                print(f"  Total attachments: {result['total_attachments']}")
                print(f"  Important attachments: {result['important_count']}")
                print(f"  Categories: {', '.join(result['categories'])}")
            else:
                print(f"Enrichment failed: {result['reason']}")

        finally:
            break  # Exit after first iteration
```

### 3. Background Job (Automatic)

```python
from app.services.enrichment import enrich_attachments

# Schedule this to run every 24 hours
async def scheduled_enrichment():
    """Run automatic attachment enrichment."""
    await enrich_attachments()
```

### 4. Query Enriched Data

```python
from sqlalchemy import select
from app.db.models import SentryIssue

async def get_attachments_for_issue(db, issue_id: int):
    """Get attachment metadata for an issue."""
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one_or_none()

    if issue and issue.attachments_meta:
        metadata = issue.attachments_meta

        print(f"Total attachments: {metadata['summary']['total_count']}")
        print(f"Has screenshots: {metadata['summary']['has_screenshots']}")
        print(f"Has minidumps: {metadata['summary']['has_minidumps']}")
        print(f"Total size: {metadata['summary']['total_size_mb']} MB")

        # List important attachments
        if metadata['important_attachments']:
            print("\\nImportant attachments:")
            for att_id in metadata['important_attachments']:
                # Find attachment details
                for att in metadata['attachments']:
                    if att['id'] == att_id:
                        print(f"  - {att['name']} ({att['category']})")

        # List attachments by category
        print("\\nAttachments by category:")
        for category, attachments in metadata['categories'].items():
            print(f"  {category}: {len(attachments)} files")
            for att in attachments:
                print(f"    - {att['name']} ({att['size_bytes'] / 1024:.1f} KB)")
```

### 5. Filter Issues with Screenshots

```python
from sqlalchemy import select
from app.db.models import SentryIssue

async def find_issues_with_screenshots(db):
    """Find all issues that have screenshot attachments."""
    result = await db.execute(
        select(SentryIssue).where(
            SentryIssue.attachments_meta['summary']['has_screenshots'].astext == 'true'
        )
    )
    issues = result.scalars().all()

    print(f"Found {len(issues)} issues with screenshots")
    for issue in issues:
        metadata = issue.attachments_meta
        screenshot_count = len(metadata['categories'].get('screenshots', []))
        print(f"  Issue {issue.sentry_issue_id}: {screenshot_count} screenshots")
```

### 6. Find Issues with Large Attachments

```python
from sqlalchemy import select
from app.db.models import SentryIssue

async def find_issues_with_large_attachments(db, min_size_mb=10):
    """Find issues with attachments larger than specified size."""
    result = await db.execute(
        select(SentryIssue).where(
            SentryIssue.attachments_meta['summary']['total_size_mb'].astext.cast(Float) >= min_size_mb
        )
    )
    issues = result.scalars().all()

    print(f"Found {len(issues)} issues with attachments >= {min_size_mb} MB")
    for issue in issues:
        metadata = issue.attachments_meta
        total_size = metadata['summary']['total_size_mb']
        total_count = metadata['summary']['total_count']
        print(f"  Issue {issue.sentry_issue_id}: {total_count} files, {total_size} MB")
```

### 7. Check Attachment Categories

```python
async def analyze_attachment_types(db):
    """Analyze distribution of attachment types across all issues."""
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.attachments_meta.isnot(None))
    )
    issues = result.scalars().all()

    category_counts = {
        'screenshots': 0,
        'logs': 0,
        'minidumps': 0,
        'source_maps': 0,
        'other': 0
    }

    for issue in issues:
        metadata = issue.attachments_meta
        for category, attachments in metadata.get('categories', {}).items():
            category_counts[category] += len(attachments)

    print("Attachment type distribution:")
    for category, count in category_counts.items():
        print(f"  {category}: {count} files")
```

### 8. Get Download URL for Attachment

```python
async def get_attachment_url(db, issue_id: int, attachment_name: str):
    """Get download URL for a specific attachment."""
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one_or_none()

    if issue and issue.attachments_meta:
        for att in issue.attachments_meta['attachments']:
            if att['name'] == attachment_name:
                print(f"Download URL: {att['download_url']}")
                print(f"Expires at: {att['url_expires_at']}")
                print(f"Size: {att['size_bytes'] / 1024:.1f} KB")
                print(f"Category: {att['category']}")
                print(f"Important: {att['is_important']}")
                return att['download_url']

    print(f"Attachment '{attachment_name}' not found")
    return None
```

## API Integration

### FastAPI Endpoint Example

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.enrichment.attachments_enrichment import (
    get_attachments_enrichment_service
)

router = APIRouter(prefix="/api/v1/issues", tags=["issues"])

@router.post("/{issue_id}/enrich/attachments")
async def enrich_issue_attachments(
    issue_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Manually trigger attachment enrichment for an issue."""
    service = await get_attachments_enrichment_service(db)
    result = await service.enrich_issue(issue_id)
    return result

@router.get("/{issue_id}/attachments")
async def get_issue_attachments(
    issue_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get attachment metadata for an issue."""
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one_or_none()

    if not issue:
        return {"error": "Issue not found"}

    return issue.attachments_meta or {"attachments": [], "summary": {"total_count": 0}}

@router.get("/{issue_id}/attachments/important")
async def get_important_attachments(
    issue_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get only important attachments (screenshots, minidumps) for an issue."""
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one_or_none()

    if not issue or not issue.attachments_meta:
        return {"important_attachments": []}

    metadata = issue.attachments_meta
    important_ids = metadata.get('important_attachments', [])

    important = [
        att for att in metadata['attachments']
        if att['id'] in important_ids
    ]

    return {
        "count": len(important),
        "attachments": important
    }
```

## Monitoring

### Check Enrichment Status

```python
async def check_enrichment_status(db, issue_id: int):
    """Check enrichment status for an issue."""
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one_or_none()

    if issue:
        status = issue.enrichment_status.get('attachments', {})
        print(f"Attachment enrichment status: {status.get('status', 'never run')}")
        print(f"Last attempt: {status.get('last_attempt', 'N/A')}")
        if status.get('error'):
            print(f"Last error: {status['error']}")
```

### Batch Enrichment

```python
async def batch_enrich_issues(db, issue_ids: list[int]):
    """Enrich multiple issues in batch."""
    service = await get_attachments_enrichment_service(db)

    results = {
        'success': 0,
        'failed': 0,
        'skipped': 0,
        'total_attachments': 0
    }

    for issue_id in issue_ids:
        try:
            result = await service.enrich_issue(issue_id)

            if result['status'] == 'success':
                results['success'] += 1
                results['total_attachments'] += result.get('total_attachments', 0)
            elif result['status'] == 'skipped':
                results['skipped'] += 1
            else:
                results['failed'] += 1

        except Exception as e:
            print(f"Error enriching issue {issue_id}: {e}")
            results['failed'] += 1

    print(f"Batch enrichment complete:")
    print(f"  Success: {results['success']}")
    print(f"  Failed: {results['failed']}")
    print(f"  Skipped: {results['skipped']}")
    print(f"  Total attachments: {results['total_attachments']}")

    return results
```

## Testing

### Unit Test Example

```python
import pytest
from unittest.mock import AsyncMock
from app.services.enrichment.attachments_enrichment import (
    AttachmentsEnrichmentService,
    CATEGORY_SCREENSHOTS
)
from app.services.sentry.attachments import Attachment

@pytest.mark.asyncio
async def test_enrich_with_screenshots():
    """Test enrichment with screenshot attachments."""
    # Setup
    mock_db = AsyncMock()
    mock_client = AsyncMock()

    service = AttachmentsEnrichmentService(mock_db, mock_client)
    service.settings = Mock(ENABLE_ATTACHMENTS=True)

    # Mock attachments
    attachments = [
        Attachment(
            id="att-1",
            name="error.png",
            type="event.attachment",
            size=1024 * 1024,
            mimetype="image/png",
            headers={}
        )
    ]

    mock_client.get_issue_attachments = AsyncMock(return_value=attachments)

    # Execute
    result = await service.enrich_issue(1)

    # Assert
    assert result['status'] == 'success'
    assert result['total_attachments'] == 1
    assert result['important_count'] == 1
    assert CATEGORY_SCREENSHOTS in result['categories']
```

## Troubleshooting

### Issue: No attachments found

```python
# Check if issue has events with attachments
# Sentry only returns attachments for the latest event
# Solution: Ensure you're looking at the latest event
```

### Issue: URLs expired

```python
# URLs expire in 7 days
# Re-run enrichment to get fresh URLs
async def refresh_expired_urls(db, issue_id: int):
    """Force refresh of attachment URLs."""
    service = await get_attachments_enrichment_service(db)
    result = await service.enrich_issue(issue_id)
    return result
```

### Issue: Attachments filtered out

```python
# Attachments over 100MB are filtered
# Check logs for "Filtered out N oversized attachments"
# Solution: Sentry limit, cannot be changed
```

## Best Practices

1. **Enable selectively**: Only enable for projects where attachments are critical
2. **Monitor storage**: Attachment metadata adds ~2KB per issue to database
3. **Refresh URLs**: Re-enrich issues when URLs are near expiration
4. **Check permissions**: Ensure Sentry API token has `event:read` permission
5. **Batch processing**: Use background jobs for bulk enrichment
6. **Handle errors**: Always check `result['status']` before using data
7. **Privacy first**: Never attempt to download content, only use metadata

## Performance Tips

- Batch enrichment processes 50 issues at a time
- Each enrichment takes ~200-500ms (API call + processing)
- Schedule background job during off-peak hours
- Monitor API rate limits if enriching large volumes

## Related Documentation

- [EPIC L Implementation Summary](./EPIC_L_IMPLEMENTATION_SUMMARY.md)
- [Attachments Service](../app/services/enrichment/attachments_enrichment.py)
- [Unit Tests](../tests/services/test_attachments_enrichment.py)
