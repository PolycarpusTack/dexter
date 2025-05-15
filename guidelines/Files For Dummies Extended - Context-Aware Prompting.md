# Files For Dummies: Context-Aware Prompting

## What Is Context-Aware Prompting?

Context-aware prompting is a feature that helps our AI give better explanations for errors. It works like a detective that:

1. Examines the error to figure out what type it is (database problem? network issue? etc.)
2. Creates a custom instruction for the AI that's specifically designed for that error type
3. Gets you a more helpful and accurate explanation

It's like having a specialized doctor instead of a general practitioner - you get advice that's tailored to your specific problem!

## Key Files and What They Do

### 1. errorAnalytics.ts

This file is the "detective" that examines errors. It:

- Looks at error messages to identify patterns (like "connection refused" = network problem)
- Categorizes errors into types (database, network, auth, etc.)
- Extracts keywords and technical details
- Determines how severe the error is
- Suggests potential causes

```typescript
// This function takes an error and returns information about it
export function analyzeError(eventDetails: EventDetails): ErrorContext {
  // Extract error information
  const errorType = extractErrorType(eventDetails);
  const errorMessage = extractErrorMessage(eventDetails);
  
  // Determine error category (database, network, etc.)
  const category = categorizeError(errorMessage, errorType);
  
  // Build context with category, keywords, severity, etc.
  const context = { 
    category, 
    keywords: [...], 
    severity: '...',
    // ...more details
  };
  
  return context;
}
```

### 2. promptEngineering.ts

This file is the "instruction writer" for the AI. It:

- Has special instruction templates for each error type
- Picks the right template based on the error category
- Fills in the template with details from your specific error
- Creates both system instructions (how the AI should approach the problem) and user instructions (what to explain)

```typescript
// This creates a complete set of instructions for the AI
export function createPromptBundle(eventDetails: EventDetails) {
  // Analyze the error first
  const errorContext = analyzeError(eventDetails);
  
  // Generate specialized instructions
  return {
    systemPrompt: generateSystemPrompt(eventDetails),
    userPrompt: generateUserPrompt(eventDetails),
    errorContext
  };
}
```

### 3. aiApi.ts

This file connects to the AI service. It:

- Takes your error details
- Gets the specialized instructions from promptEngineering.ts
- Sends everything to the AI service
- Returns the AI's explanation

```typescript
// This function gets an AI explanation for an error
export const explainError = async (params: ExplainErrorParams) => {
  // If context-aware prompting is enabled
  if (use_context_aware_prompting) {
    // Generate specialized instructions
    const { systemPrompt, userPrompt } = createPromptBundle(event_data);
    
    // Use these instructions when talking to the AI
    requestParams.system_prompt = systemPrompt;
    requestParams.user_prompt = userPrompt;
  }
  
  // Send to AI service and get explanation
  return await apiClient.post('/explain', requestParams);
};
```

### 4. ExplainError.tsx

This is the component you see on screen. It:

- Shows a button to get an AI explanation
- Sends the error to the AI when you click
- Displays the explanation
- Shows what error type was detected
- Lets you turn context-aware prompting on/off

## Common Use Cases

### Database Errors

When it detects a database error, it will:
- Identify if it's a connection issue, query problem, or deadlock
- Tell the AI to explain database concepts simply
- Ask for specific solutions relevant to database problems

### Network Errors

When it detects a network error, it will:
- Determine if it's a timeout, connection refused, or CORS issue
- Tell the AI to focus on connectivity and request/response problems
- Ask for network troubleshooting steps

### Auth Errors

When it detects an authentication error, it will:
- Distinguish between login failures and permission issues
- Tell the AI to focus on security concepts
- Ask for authentication troubleshooting steps

## How to Use It

1. When you see an error, click the "Explain with AI" button
2. The system automatically analyzes the error
3. You'll see the detected error category with a colored badge
4. The AI explanation will be tailored to that error type
5. You can see detailed error analysis in the "Advanced Settings" panel
6. You can turn context-aware prompting on/off with the toggle

## Benefits

- **Better Explanations**: Get more relevant and accurate explanations
- **Technical Focus**: Explanations focus on the right technical areas
- **Practical Solutions**: Get more useful troubleshooting steps
- **Time Saving**: Skip the back-and-forth of asking follow-up questions

## Toggling It On/Off

If you prefer generic explanations or want to compare, you can:

1. Click the "Advanced Settings" gear icon
2. Switch the "Context-Aware Prompting" toggle
3. Click "Apply Settings"
4. Generate a new explanation

## Behind the Scenes

When you click "Explain with AI", here's what happens:

1. The error details are passed to `analyzeError()`
2. The result is used by `createPromptBundle()` to generate specialized instructions
3. These instructions are sent to the AI model via the API
4. The AI follows these specialized instructions to generate your explanation
5. The explanation appears on your screen with error category badges

It's like having an AI with a specialization in exactly your kind of error!