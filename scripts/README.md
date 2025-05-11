# Dexter Scripts

This directory contains utility scripts for the Dexter project.

## generate-api-types.js

Generates TypeScript types and Pydantic models from the Sentry OpenAPI specification.

### Usage

```bash
# From the root directory
npm run generate:api-types

# Or directly
node scripts/generate-api-types.js
```

### What it does

1. Reads the Sentry API OpenAPI specification from `docs/sentry-api.yaml`
2. Generates TypeScript interfaces in `frontend/src/types/api/sentry-generated.ts`
3. Generates Pydantic models in `backend/app/models/api/sentry_generated.py`
4. Creates index files to properly export types while maintaining backward compatibility

### Generated Files

- **Frontend TypeScript Types**:
  - `frontend/src/types/api/sentry-generated.ts` - Auto-generated types
  - `frontend/src/types/api/sentry.ts` - Custom types that extend/override generated ones
  - `frontend/src/types/api/index.ts` - Export file

- **Backend Pydantic Models**:
  - `backend/app/models/api/sentry_generated.py` - Auto-generated models
  - `backend/app/models/api/sentry.py` - Custom models that extend/override generated ones
  - `backend/app/models/api/__init__.py` - Export file

### Important Notes

1. The generated files should NOT be edited manually
2. Custom types should be added to `sentry.ts` (frontend) or `sentry.py` (backend)
3. Existing custom types take precedence over generated ones
4. The script runs automatically after `npm install` in the root directory

### Adding New Types

If you need to extend or override the generated types:

1. Add your custom type to the appropriate file:
   - Frontend: `frontend/src/types/api/sentry.ts`
   - Backend: `backend/app/models/api/sentry.py`

2. Your custom type will automatically take precedence over any generated type with the same name

### Updating the OpenAPI Spec

When the Sentry API specification is updated:

1. Replace `docs/sentry-api.yaml` with the new specification
2. Run `npm run generate:api-types` to regenerate types
3. Test that existing functionality still works
4. Update any custom types if needed
