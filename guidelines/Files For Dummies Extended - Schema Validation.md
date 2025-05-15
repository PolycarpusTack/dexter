# Deadlock Schema Validation for Dummies

This guide explains how we implement robust schema validation for our deadlock analyzer.

## What Is Schema Validation?

Schema validation is like having a security guard for your data. It checks that the data structure matches what your application expects, so there are no surprises when you try to use it. We use the Zod library for this.

## Files Involved

### 1. `frontend/src/schemas/deadlockSchemas.ts`

This file contains all the validation schemas for the deadlock analyzer. It defines:

- What fields are expected in each data object
- Which fields are required vs. optional
- The data types for each field
- How to normalize data that doesn't quite match expectations

```typescript
// Example from the file
export const deadlockProcessSchema = z.object({
  pid: z.number(),                             // Required number
  applicationName: z.string().optional(),      // Optional string
  username: z.string().optional(),             // Optional string
  // ... other fields
});
```

### 2. `frontend/src/api/enhancedDeadlockApi.ts`

This file contains the API methods that fetch deadlock data and apply validation:

```typescript
export async function analyzeDeadlock(eventId: string, options = {}) {
  // Fetch data from API
  const response = await apiClient.get(`/some-endpoint/${eventId}`);
  
  // Apply validation
  try {
    // Try strict validation first
    return validateDeadlockAnalysisResponse(response.data);
  } catch (error) {
    // If that fails, normalize the data
    return normalizeDeadlockData(response.data);
  }
}
```

## How It Works

### 1. Schema Definition

We define schemas that match our expected data structures. Each schema describes what fields we expect, their types, and whether they're required:

```typescript
// Schema for deadlock analysis response
export const deadlockAnalysisResponseSchema = z.object({
  success: z.boolean(),                       // Required boolean
  analysis: deadlockAnalysisSchema.optional(), // Optional nested object
  error: z.string().optional()                // Optional string
});
```

### 2. Validation Functions

We provide two types of validation functions:

#### Strict Validation

Throws an error if the data doesn't match the schema:

```typescript
export function validateDeadlockAnalysisResponse(data: unknown): DeadlockAnalysisResponse {
  // This will throw if validation fails
  return deadlockAnalysisResponseSchema.parse(data) as DeadlockAnalysisResponse;
}
```

#### Safe Validation

Returns null instead of throwing an error:

```typescript
export function safeValidateDeadlockAnalysisResponse(data: unknown): DeadlockAnalysisResponse | null {
  try {
    return deadlockAnalysisResponseSchema.parse(data) as DeadlockAnalysisResponse;
  } catch (error) {
    // Log the error but don't crash
    console.warn('Validation failed:', error);
    return null;
  }
}
```

### 3. Data Normalization

For cases where the data format might vary, we provide normalization functions:

```typescript
export function normalizeProcess(process: any): z.infer<typeof deadlockProcessSchema> {
  return {
    pid: Number(process.pid || 0),
    applicationName: process.applicationName || process.application_name || '',
    // ... handle other fields and format variations
  };
}
```

### 4. API Integration

In our API methods, we implement a two-step validation process:

1. Try strict validation first
2. If that fails, fall back to normalization
3. Always return a valid response, even in case of errors

```typescript
try {
  // Try to fetch and validate data
  const response = await apiClient.get('/endpoint');
  const validData = validateDeadlockAnalysisResponse(response.data);
  return validData;
} catch (error) {
  // Return a standardized error response
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}
```

## Why This Matters

1. **Type Safety**: The TypeScript compiler knows what data to expect
2. **Runtime Validation**: Catches issues that TypeScript can't check at runtime
3. **Error Resilience**: Our app can handle unexpected data formats
4. **Debugging**: Provides clear error messages when data doesn't match expectations

## How to Use in Components

```typescript
import { analyzeDeadlock } from '../api/enhancedDeadlockApi';

// In your component
const fetchData = async () => {
  const result = await analyzeDeadlock(eventId);
  
  // No need to check if fields exist - validation guarantees they do!
  if (result.success && result.analysis) {
    // We can safely use the data
    setProcesses(result.analysis.visualization_data.processes);
  } else {
    // Handle error case
    setError(result.error || 'Unknown error');
  }
};
```

## Common Validation Patterns

1. **Required Fields**: `z.string()`, `z.number()`, etc.
2. **Optional Fields**: `z.string().optional()`
3. **Alternative Types**: `z.string().or(z.number())`
4. **Arrays**: `z.array(deadlockProcessSchema)`
5. **Records/Maps**: `z.record(z.string(), z.boolean())`

## Tips for Adding New Schemas

1. Start by defining the expected structure (use TypeScript interfaces as a guide)
2. Add validation schemas with Zod, marking fields as optional when appropriate
3. Create a validation function that uses the schema
4. Add normalization logic for handling edge cases
5. Update the exports to include your new schemas and functions

## Testing Schema Validation

It's important to test schema validation with:

1. **Valid data**: Make sure perfect data passes validation
2. **Missing fields**: Check how optional vs. required fields are handled
3. **Incorrect types**: Test with wrong data types
4. **Edge cases**: Test with empty arrays, null values, etc.

## Next Steps

Now that you understand schema validation, you can:

1. Add new schemas for other data structures
2. Improve normalization for better error resilience
3. Implement these patterns in other parts of the application