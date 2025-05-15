# ExplainError Components Migration Guide

This document provides step-by-step instructions for migrating the ExplainError components to use the unified API client architecture.

## Files to Update

- `/frontend/src/components/ExplainError/ExplainError.tsx`
- `/frontend/src/components/ExplainError/ExplainError.jsx`

## Migration Steps

### 1. Update Import Statements

Replace imports from the old AI API module with imports from the unified API client:

```typescript
// Old
import { explainError, ExplainErrorParams, ExplainErrorResponse } from '../../api/aiApi';

// New
import { api } from '../../api/unified';
import { ErrorExplanationRequest, ErrorExplanationResponse } from '../../api/unified/types';
```

### 2. Update ExplainError.tsx

#### Replace direct API calls

```typescript
// Old
const fetchExplanation = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    if (eventId) {
      const response = await explainError(eventId, undefined, undefined, modelId);
      setExplanation(response);
    } else if (issueId) {
      const response = await explainError(undefined, issueId, undefined, modelId);
      setExplanation(response);
    } else if (errorText) {
      const response = await explainError(undefined, undefined, errorText, modelId);
      setExplanation(response);
    } else {
      throw new Error('At least one of eventId, issueId, or errorText must be provided');
    }
  } catch (err) {
    console.error('Error fetching explanation:', err);
    setError(err instanceof Error ? err : new Error('Unknown error occurred'));
  } finally {
    setIsLoading(false);
  }
};

// New
const fetchExplanation = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    let response: ErrorExplanationResponse;
    
    if (eventId) {
      response = await api.ai.explainErrorByEventId(eventId, modelId);
    } else if (issueId) {
      response = await api.ai.explainErrorByIssueId(issueId, modelId);
    } else if (errorText) {
      response = await api.ai.explainErrorText(errorText, stackTrace, modelId);
    } else {
      throw new Error('At least one of eventId, issueId, or errorText must be provided');
    }
    
    setExplanation(response);
  } catch (err) {
    console.error('Error fetching explanation:', err);
    setError(err instanceof Error ? err : new Error('Unknown error occurred'));
  } finally {
    setIsLoading(false);
  }
};
```

#### Update types

```typescript
// Old
interface ExplainErrorProps {
  eventId?: string;
  issueId?: string;
  errorText?: string;
  stackTrace?: string;
  modelId?: string;
  autoFetch?: boolean;
}

// New
interface ExplainErrorProps {
  eventId?: string;
  issueId?: string;
  errorText?: string;
  stackTrace?: string;
  modelId?: string;
  autoFetch?: boolean;
  options?: {
    maxTokens?: number;
    temperature?: number;
    includeRecommendations?: boolean;
    includeCodeExamples?: boolean;
    language?: string;
  };
}
```

### 3. Update ExplainError.jsx

For the JSX version, make similar changes:

```jsx
// Old
import { explainError } from '../../api/aiApi';

// New
import { api } from '../../api/unified';
```

And update the API calls:

```jsx
// Old
const fetchExplanation = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    let response;
    if (eventId) {
      response = await explainError(eventId);
    } else if (issueId) {
      response = await explainError(undefined, issueId);
    } else if (errorText) {
      response = await explainError(undefined, undefined, errorText);
    } else {
      throw new Error("No error source provided");
    }
    
    setExplanation(response);
  } catch (err) {
    console.error("Error fetching explanation:", err);
    setError(err);
  } finally {
    setIsLoading(false);
  }
};

// New
const fetchExplanation = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    let response;
    if (eventId) {
      response = await api.ai.explainErrorByEventId(eventId);
    } else if (issueId) {
      response = await api.ai.explainErrorByIssueId(issueId);
    } else if (errorText) {
      response = await api.ai.explainErrorText(errorText, stackTrace);
    } else {
      throw new Error("No error source provided");
    }
    
    setExplanation(response);
  } catch (err) {
    console.error("Error fetching explanation:", err);
    setError(err);
  } finally {
    setIsLoading(false);
  }
};
```

### 4. Implement React Query for Data Fetching (Optional)

For a more modern approach, update to use React Query hooks:

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/unified';

// Inside the component
const {
  data: explanation,
  isLoading,
  error,
  refetch
} = useQuery({
  queryKey: ['errorExplanation', eventId, issueId, errorText, modelId],
  queryFn: async () => {
    if (eventId) {
      return api.ai.explainErrorByEventId(eventId, modelId);
    } else if (issueId) {
      return api.ai.explainErrorByIssueId(issueId, modelId);
    } else if (errorText) {
      return api.ai.explainErrorText(errorText, stackTrace, modelId);
    }
    throw new Error('At least one of eventId, issueId, or errorText must be provided');
  },
  enabled: autoFetch && !!(eventId || issueId || errorText),
  retry: 1
});

// Replace manual fetch button with refetch
<Button onClick={refetch} loading={isLoading}>
  Explain Error
</Button>
```

### 5. Add Enhanced Error Handling

Update to use the unified error handling approach:

```typescript
import { utils } from '../../api/unified';

const handleError = utils.createErrorHandler({
  module: 'ExplainError',
  showNotifications: true
});

try {
  // API calls
} catch (error) {
  handleError(error, {
    operation: 'explainError',
    context: { eventId, issueId, errorText }
  });
  setError(error instanceof Error ? error : new Error('Unknown error occurred'));
}
```

## Testing

After migrating each component, perform the following tests:

1. **TypeScript Validation**: Run `npm run typecheck` to ensure types are correct
2. **Functionality Testing**: Verify that the component works as expected by:
   - Testing with an event ID
   - Testing with an issue ID
   - Testing with error text
   - Testing with different models
3. **Error Handling**: Test error scenarios to ensure errors are properly handled

## Common Issues and Solutions

### Error Response Structure Changes

If the structure of error explanations has changed between the old and new API:

```typescript
// Old structure
interface ExplainErrorResponse {
  explanation: string;
  suggestions?: string[];
}

// New structure
interface ErrorExplanationResponse {
  explanation: string;
  recommendations?: string[];
  codeExamples?: Array<{
    language: string;
    code: string;
    description?: string;
  }>;
}
```

Update the component to handle both structures or transform the response:

```typescript
// Compatibility function
function normalizeExplanation(response: any): NormalizedExplanation {
  return {
    explanation: response.explanation,
    recommendations: response.recommendations || response.suggestions || [],
    codeExamples: response.codeExamples || []
  };
}
```

### Handling Optional Model IDs

The old API might handle null model IDs differently than the new API:

```typescript
// Old - might pass undefined directly
await explainError(eventId, undefined, undefined, undefined);

// New - check and use default
await api.ai.explainErrorByEventId(
  eventId, 
  modelId || undefined, 
  options
);
```

## Conclusion

By following these steps, you should be able to successfully migrate the ExplainError components to use the unified API client architecture. The migration improves type safety, error handling, and maintainability while ensuring consistent API usage across the application.

The new approach offers these advantages:
- More specific function calls for different error explanation sources
- Better type safety and validation
- Consistent error handling with the rest of the application
- Optional integration with React Query for automatic caching and refetching