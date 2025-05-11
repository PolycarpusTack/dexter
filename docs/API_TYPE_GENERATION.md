# API Type Generation

## Overview

The API Type Generation system automatically creates TypeScript interfaces and Pydantic models from the Sentry API OpenAPI specification. This ensures type safety across the frontend and backend while maintaining consistency with the Sentry API.

## Architecture

```
sentry-api.yaml (OpenAPI Spec)
       │
       ├─── generate-api-types.js
       │           │
       │           ├─── openapi-typescript ──> frontend/src/types/api/sentry.ts
       │           │
       │           └─── custom parser ──────> backend/app/models/api/sentry.py
       │
       └─── Used for documentation and API client generation
```

## Generated Files

### Frontend Types

- **Location**: `frontend/src/types/api/sentry.ts`
- **Format**: TypeScript interfaces and types
- **Generator**: openapi-typescript
- **Features**:
  - Fully typed API request/response interfaces
  - Enum types for status values
  - Optional field handling
  - Nested object types

### Backend Models

- **Location**: `backend/app/models/api/sentry.py`
- **Format**: Pydantic models
- **Generator**: Custom script
- **Features**:
  - Pydantic BaseModel classes
  - Field aliases for case conversion
  - Type validation
  - Serialization/deserialization

## Usage

### Running Type Generation

```bash
# From the frontend directory
npm run generate:api-types

# Or from the project root
cd frontend && npm run generate:api-types
```

### Testing Type Generation

```bash
# Run the test script
node scripts/test-type-generation.js
```

### Using Generated Types

#### Frontend (TypeScript)

```typescript
import { Issue, Event, IssueUpdate } from '@/types/api/sentry';

// Use in API calls
const issue: Issue = await apiClient.get('/issues/123');

// Use for request bodies
const update: IssueUpdate = {
  status: 'resolved',
  assignedTo: 'user-123'
};
```

#### Backend (Python)

```python
from app.models.api.sentry import Issue, IssueUpdate, Event

# Use for request validation
@router.put("/issues/{issue_id}")
async def update_issue(issue_id: str, update: IssueUpdate) -> Issue:
    # Pydantic automatically validates the request body
    result = await sentry_client.update_issue(issue_id, update)
    return Issue(**result)  # Validates response data
```

## Backward Compatibility

The type generation system maintains backward compatibility by:

1. **Preserving Existing Types**: Does not modify existing type definitions
2. **Using Type Aliases**: Creates aliases for commonly used types
3. **Optional Fields**: Marks fields as optional where appropriate
4. **Field Mapping**: Handles camelCase ↔ snake_case conversion

Example compatibility layer:

```typescript
// Export aliases for backward compatibility
export type {
  Issue as SentryIssue,
  Event as SentryEvent,
  IssueUpdate as SentryIssueUpdate,
} from './sentry';
```

## Extending the OpenAPI Spec

To add new endpoints or types:

1. Edit `sentry-api.yaml`
2. Add the endpoint definition under `paths`
3. Add any new schemas under `components.schemas`
4. Run type generation: `npm run generate:api-types`

Example:

```yaml
paths:
  /issues/{issue_id}/comments/:
    get:
      summary: List issue comments
      operationId: listIssueComments
      # ... parameters and responses

components:
  schemas:
    Comment:
      type: object
      properties:
        id:
          type: string
        text:
          type: string
        author:
          $ref: '#/components/schemas/User'
```

## Dependencies

### Frontend
- `openapi-typescript`: Generates TypeScript types from OpenAPI
- `js-yaml`: Parses YAML files

### Backend
- Built-in Python libraries only
- Generates Pydantic models directly

## Best Practices

1. **Keep Spec Updated**: Update `sentry-api.yaml` when Sentry API changes
2. **Run Tests**: Verify type generation after changes
3. **Version Control**: Commit generated files for consistency
4. **Type Everything**: Use generated types throughout the codebase
5. **Validate Responses**: Use types to validate API responses

## Common Issues

### Issue: Type Generation Fails

**Solution**: Ensure dependencies are installed:
```bash
npm install -D openapi-typescript js-yaml
```

### Issue: Types Don't Match API

**Solution**: Update the OpenAPI spec to match actual API:
1. Check Sentry API documentation
2. Update `sentry-api.yaml`
3. Regenerate types

### Issue: Case Mismatch (camelCase vs snake_case)

**Solution**: Use field aliases in Pydantic models:
```python
class Issue(BaseModel):
    assigned_to: Optional[str] = Field(None, alias="assignedTo")
    
    class Config:
        populate_by_name = True
```

## Maintenance

### Regular Updates

1. **Monthly**: Check for Sentry API changes
2. **On Error**: Update spec when API mismatches occur
3. **On Feature**: Add new endpoints as needed

### Validation

1. **Type Checking**: Run TypeScript compiler
2. **Unit Tests**: Test with mock data
3. **Integration Tests**: Verify against actual API

## Future Enhancements

1. **Automated Updates**: Script to fetch latest Sentry OpenAPI spec
2. **Runtime Validation**: Add runtime type checking for API responses
3. **Code Generation**: Generate API client code from spec
4. **Documentation**: Auto-generate API documentation
5. **Breaking Change Detection**: Alert on API breaking changes
