# Ultimate Zero-to-Hero Guide: Context-Aware Prompting

## Introduction

Context-aware prompting is an advanced technique that dynamically analyzes errors and generates specialized prompts for AI models. This approach results in more accurate, relevant, and helpful error explanations by tailoring the prompts to specific error types such as database errors, network failures, authentication issues, etc.

## Core Components

The context-aware prompting system consists of three primary components:

1. **Error Analytics**: Analyzes error messages and events to identify patterns, categorize errors, and extract relevant context.
2. **Prompt Engineering**: Maintains specialized templates for different error categories and generates optimized prompts.
3. **Integration Layer**: Connects the frontend components with the AI service, passing context-enriched prompts.

## Technical Architecture

![Context-Aware Prompting Architecture](../docs/images/context-aware-prompting.png)

### Error Analytics

The error analytics module (`errorAnalytics.ts`) provides several key functionalities:

1. **Error Categorization**: Classifies errors into categories like:
   - Database errors
   - Network errors
   - Authentication errors 
   - Authorization errors
   - Validation errors
   - Syntax errors
   - Runtime errors
   - Memory errors
   - Configuration errors

2. **Pattern Matching**: Uses regex patterns to identify specific error signatures:
   ```typescript
   const DATABASE_ERROR_PATTERNS = {
     postgres: {
       deadlock: [
         /deadlock detected/i,
         /deadlock found/i,
         // ...more patterns
       ],
       // ...other database error types
     },
     // ...other database vendors
   };
   ```

3. **Context Extraction**: Builds rich error context objects that contain:
   - Primary error category
   - Specific error subtype (when applicable)
   - Severity level
   - Technical context relevant to the error
   - Potential causes
   - Keywords for better matching

### Prompt Engineering

The prompt engineering module (`promptEngineering.ts`) contains:

1. **Template Library**: Specialized prompt templates for different error categories:
   ```typescript
   const DATABASE_ERROR_TEMPLATE: PromptTemplate = {
     name: 'database_error',
     applicableCategories: [ErrorCategory.DATABASE],
     systemPrompt: `You are an experienced database administrator...`,
     userPromptTemplate: `Please explain this database error...`
   };
   ```

2. **Template Selection**: Logic to select the most appropriate template based on error context.

3. **Variable Substitution**: Replaces placeholders with specific error details:
   ```typescript
   // Replace placeholder variables
   prompt = prompt.replace('{{errorType}}', errorType);
   prompt = prompt.replace('{{errorMessage}}', errorMessage);
   ```

### Integration Layer

The AI API client (`aiApi.ts`) connects these systems:

1. **Context-Aware Request Creation**:
   ```typescript
   if (use_context_aware_prompting && !system_prompt && !user_prompt) {
     // Generate prompts based on error context
     const { systemPrompt, userPrompt, errorContext } = createPromptBundle(event_data);
     
     // Add the generated prompts to the request
     requestParams.system_prompt = systemPrompt;
     requestParams.user_prompt = userPrompt;
   }
   ```

2. **Configuration Options**: Allows for opt-in/out via the `use_context_aware_prompting` parameter.

3. **Fallback Behavior**: Falls back to generic prompts if specific analysis isn't possible.

## User Interface

The ExplainError component provides several UI elements for the context-aware prompting system:

1. **Category Badge**: Shows the detected error category with appropriate color coding.
2. **Context-Aware Indicator**: A badge that shows when context-aware prompting is active.
3. **Settings Panel**: Allows users to toggle context-aware prompting on/off.
4. **Debug View**: Shows the analyzed error context and generated prompts (helpful for troubleshooting).

## Use Cases & Examples

### Database Error Example

For a database deadlock error:

**Error message**:
```
ERROR: deadlock detected
Detail: Process 1234 waits for ShareLock on transaction 5678; blocked by process 9012.
Process 9012 waits for ShareLock on transaction 3456; blocked by process 1234.
```

**Analysis result**:
- Category: `database`
- Subtype: `deadlock`
- Technical context: Information about PostgreSQL deadlocks
- Potential causes: Transaction ordering issues, concurrent access patterns, etc.

**Generated System Prompt**:
```
You are an experienced database administrator and software engineer specializing 
in troubleshooting database issues. Your job is to explain database errors clearly, 
identify potential causes, and suggest solutions.

Use these guidelines when explaining:
1. Start with a concise 1-2 sentence explanation of what the error means
2. For deadlocks, explain which resources were involved in the conflict
3. Provide concrete suggestions to resolve the issue
...
```

### Network Error Example

For a connection timeout:

**Error message**:
```
Failed to fetch: request to https://api.example.com/data timed out after 30000ms
```

**Analysis result**:
- Category: `network`
- Severity: `medium`
- Keywords: `timeout`, `fetch`, `request`

**Generated User Prompt**:
```
Please explain this network error:

Error Type: network
Error Message: Failed to fetch: request to https://api.example.com/data timed out after 30000ms

Technical Context:
- Network errors typically occur when there are communication issues between systems
- Common causes include connectivity issues, firewall blocks, or service unavailability

Please provide:
1. A clear explanation of what this error means
2. Likely causes of the network issue
3. Practical troubleshooting steps
4. Ways to make the application more resilient to this type of error
```

## Advanced Customization

### Adding New Error Categories

To add a new error category:

1. Update the `ErrorCategory` enum in `errorAnalytics.ts`
2. Add pattern matching logic in the `categorizeError` function
3. Create a new prompt template in `promptEngineering.ts`
4. Add it to the `PROMPT_TEMPLATES` array

### Customizing Templates

Templates use a simple handlebars-inspired syntax:
- `{{variable}}` for simple variable substitution
- `{{#if condition}}...{{/if}}` for conditional sections
- `{{#each array}}...{{/each}}` for iterating over arrays

### Performance Considerations

Error analysis is performed on-demand and is lightweight, but for very large error objects:

1. Consider adding memoization to prevent redundant analysis
2. Use selective extraction of stack traces to reduce memory usage
3. Consider debouncing repeated analyses in rapid succession

## Future Enhancements

Potential improvements to explore:

1. **Learning System**: Track successful explanations and adjust prompting strategy over time
2. **Multi-Error Analysis**: Correlate related errors for more comprehensive explanations
3. **Language Customization**: Adjust explanation style based on user preferences (technical vs. simple)
4. **Integration with Sentry Fingerprinting**: Use Sentry's fingerprinting to identify known error patterns

## Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Error category shows as "unknown" | Check if the error message format is recognized by pattern matchers |
| Context-aware prompting doesn't affect explanation | Verify the toggle is enabled and error analysis returned meaningful context |
| Missing technical context | Add more specific patterns for this error type in `errorAnalytics.ts` |
| Slow generation time | Context-aware prompts are more detailed; consider using a smaller/faster model |

## Conclusion

Context-aware prompting significantly improves the quality and relevance of AI-generated error explanations. By analyzing error patterns and selecting specialized prompts, the system provides more accurate, actionable guidance that takes into account the specific nature of different error types.