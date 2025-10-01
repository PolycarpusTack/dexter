# API Path Migration Script

This script standardizes API path naming conventions across the Dexter codebase.

## Naming Conventions

The script enforces these conventions:
- **Backend (Python)**: `organization_slug`, `project_slug` (snake_case)
- **Frontend (TypeScript)**: `organizationSlug`, `projectSlug` (camelCase)
- **URL Templates**: `{organization_slug}`, `{project_slug}`

## Usage

### Dry Run (Default)
First, run in dry-run mode to see what changes will be made:
```bash
python scripts/api-path-migration/migrate_api_paths.py
```

### Execute Migration
Once you're satisfied with the dry run results:
```bash
python scripts/api-path-migration/migrate_api_paths.py --execute
```

### Options
- `--execute`: Apply changes (default is dry run)
- `--no-backup`: Skip creating backups (not recommended)

## What It Does

1. **Backend Migration**:
   - Updates Python files to use `organization_slug` and `project_slug`
   - Fixes function parameters and path definitions
   - Updates router path parameters

2. **Frontend Migration**:
   - Updates TypeScript interfaces to use camelCase (`organizationSlug`, `projectSlug`)
   - Fixes mixed usage of `projectID` vs `projectSlug`
   - Updates API client calls

3. **Path Template Migration**:
   - Updates URL templates in configuration files
   - Fixes path placeholders (`{organizationId}` → `{organization_slug}`)
   - Updates Express-style parameters (`:organizationId` → `:organization_slug`)

## Safety Features

1. **Dry Run Mode**: Default behavior shows changes without applying them
2. **Automatic Backup**: Creates timestamped backup of all modified files
3. **Rollback Script**: Generates `rollback_api_migration.py` for easy undo
4. **Detailed Report**: Creates JSON report of all changes made

## Testing

Run the test suite before migration:
```bash
python scripts/api-path-migration/test_migrate_api_paths.py
```

## Rollback

If needed, use the generated rollback script:
```bash
python rollback_api_migration.py
```

## Migration Report

After migration, check the generated report:
- `api_migration_report_YYYYMMDD_HHMMSS.json`

## Common Patterns Migrated

### Backend
- `organizationId` → `organization_slug`
- `projectId` → `project_slug`
- `organization_id` → `organization_slug` (in function params)
- `project_id` → `project_slug` (in function params)

### Frontend
- `organizationID` → `organizationSlug`
- `projectID` → `projectSlug`
- `organization_id` → `organizationSlug`
- `project_id` → `projectSlug`

### Path Templates
- `{organizationId}` → `{organization_slug}`
- `{projectId}` → `{project_slug}`
- `:organizationId` → `:organization_slug`
- `:projectId` → `:project_slug}`