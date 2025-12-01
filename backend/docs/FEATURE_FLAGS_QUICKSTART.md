# Feature Flags Quick Start Guide

## TL;DR

Dexter now supports 11 independently toggleable data enrichment sources that can be enabled/disabled **without restarting the application**.

## Quick Commands

### Check Current Status
```bash
# Method 1: Check script (most readable)
python scripts/check_enrichment_flags.py

# Method 2: Health endpoint (programmatic)
curl http://localhost:8000/health | jq '.features.enrichments'
```

### Toggle a Flag
```bash
# 1. Edit .env file
ENABLE_PROFILING=true

# 2. Reload config (no restart needed!)
curl -X POST http://localhost:8000/api/v1/config/reload-config

# 3. Verify change
python scripts/check_enrichment_flags.py
```

### Emergency Kill Switch
```bash
# Disable ALL enrichments immediately
ENABLE_ALL_ENRICHMENTS=true
curl -X POST http://localhost:8000/api/v1/config/reload-config
```

## The 11 Enrichment Sources

| Flag | Default | Why This Default? |
|------|---------|-------------------|
| `ENABLE_RELEASES` | ✅ `true` | Low cost, high value |
| `ENABLE_PERFORMANCE_SPANS` | ✅ `true` | Low cost, high value |
| `ENABLE_PROFILING` | ❌ `false` | **Resource intensive** |
| `ENABLE_SESSIONS_REPLAYS` | ✅ `true` | Low cost, high value |
| `ENABLE_BREADCRUMBS` | ✅ `true` | Low cost, high value |
| `ENABLE_ALERTS` | ✅ `true` | Low cost, high value |
| `ENABLE_ATTACHMENTS` | ❌ `false` | **Security sensitive** |
| `ENABLE_TAG_DISTRIBUTIONS` | ✅ `true` | Low cost, high value |
| `ENABLE_OWNERSHIP` | ✅ `true` | Low cost, high value |
| `ENABLE_MEASUREMENTS` | ✅ `true` | Low cost, high value |
| `ENABLE_GROUPING_INSIGHTS` | ✅ `true` | Low cost, high value |

**Default: 9/11 enabled**

## Common Use Cases

### 1. Enable Deep Debugging
```bash
# In .env
ENABLE_PROFILING=true
ENABLE_ATTACHMENTS=true

# Reload
curl -X POST http://localhost:8000/api/v1/config/reload-config
```

**When done:**
```bash
# Restore defaults
ENABLE_PROFILING=false
ENABLE_ATTACHMENTS=false
curl -X POST http://localhost:8000/api/v1/config/reload-config
```

### 2. Performance Tuning
```bash
# In .env
ENRICHMENT_BATCH_SIZE=100      # Process more at once
ENRICHMENT_INTERVAL_SECONDS=60  # Run more frequently

# Reload
curl -X POST http://localhost:8000/api/v1/config/reload-config
```

### 3. Security Lockdown
```bash
# Disable all potentially sensitive sources
ENABLE_ATTACHMENTS=false
ENABLE_PROFILING=false
ENABLE_BREADCRUMBS=false  # May contain user actions

curl -X POST http://localhost:8000/api/v1/config/reload-config
```

## Key Endpoints

### Health Check
```bash
GET /health
```

Returns enrichment status in response:
```json
{
  "features": {
    "enrichments": {
      "enabled_count": 9,
      "total_count": 11,
      "sources": { ... }
    }
  }
}
```

### Reload Config
```bash
POST /api/v1/config/reload-config
```

Reloads all configuration from `.env` file without restart.

## Files to Know

| File | Purpose |
|------|---------|
| `backend/.env.example` | Reference for all flags |
| `backend/app/core/config.py` | Flag definitions |
| `backend/scripts/check_enrichment_flags.py` | Status checker |
| `backend/docs/FEATURE_FLAGS_GUIDE.md` | Full documentation |

## Troubleshooting

### "My changes aren't working!"
1. Check `.env` file syntax (no spaces around `=`)
2. Make sure file is saved
3. Call reload endpoint: `POST /api/v1/config/reload-config`

### "All enrichments are disabled!"
Check master toggle:
```bash
curl http://localhost:8000/health | jq '.features.enrichments.master_override'
```

If `true`, set `ENABLE_ALL_ENRICHMENTS=false` in `.env` and reload.

### "Application is slow!"
Disable resource-intensive sources:
```bash
ENABLE_PROFILING=false
ENABLE_ATTACHMENTS=false
curl -X POST http://localhost:8000/api/v1/config/reload-config
```

## Safety Notes

⚠️ **ENABLE_PROFILING** - Can use significant CPU/memory
⚠️ **ENABLE_ATTACHMENTS** - May download sensitive data
⚠️ **ENABLE_ALL_ENRICHMENTS** - Disables ALL sources (emergency use only)

## Next Steps

- Read full guide: `backend/docs/FEATURE_FLAGS_GUIDE.md`
- View implementation: `backend/docs/EPIC_C_FEATURE_FLAGS_IMPLEMENTATION.md`
- Run checker: `python scripts/check_enrichment_flags.py`

## Support

For issues or questions:
1. Check `backend/docs/FEATURE_FLAGS_GUIDE.md`
2. Review implementation report
3. Inspect logs after reload endpoint call
