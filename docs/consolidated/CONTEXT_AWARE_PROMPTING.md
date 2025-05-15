# Context-Aware Prompting System

The Context-Aware Prompting System is a sophisticated AI prompting architecture integrated into Dexter that significantly improves the quality and relevance of AI-generated error explanations. This document provides a comprehensive overview of this system.

## Overview

Traditional AI prompting sends generic instructions to the AI model, which can produce generic or inaccurate explanations for technical errors. The Context-Aware Prompting System addresses this limitation by:

1. Analyzing error patterns to identify the specific type of error
2. Extracting relevant technical context and metadata
3. Selecting specialized prompts tailored to the error category
4. Providing domain-specific expertise instructions to the AI

This approach makes the AI behave like a specialist in the specific error domain (database, networking, authentication, etc.), significantly improving explanation quality, accuracy, and actionability.

## Architecture

The system consists of four main components:

1. **Error Analytics Engine** - Identifies error patterns and extracts context
2. **Template Repository** - Specialized prompts for different error types
3. **Prompt Engineering Engine** - Generates tailored prompts from templates
4. **Context Provider** - Manages prompt engineering settings and state

### Error Analytics Engine

Located in `/frontend/src/utils/enhancedErrorAnalytics.ts`, this module:

- Identifies 50+ distinct error categories (vs 8 in the basic system)
- Extracts technical context, potential causes, and severity
- Performs stack trace analysis to identify error sources and libraries
- Infers root causes with confidence scoring
- Generates diagnostic questions for troubleshooting
- Identifies application areas where the error occurs

### Template Repository

Located in `/frontend/src/utils/enhancedPromptEngineering.ts`, this contains:

- Specialized system prompts for each error category
- Role-specific instructions (e.g., "You are an expert database administrator...")
- Domain-specific guidance on explanation structure
- Technical focus areas based on error type
- Variable templates for user prompts that include error details

### Prompt Engineering Engine

Also in `/frontend/src/utils/enhancedPromptEngineering.ts`, this engine:

- Selects the most appropriate template based on error context
- Populates templates with error-specific information
- Handles conditional sections based on available information
- Generates complete system and user prompts for the AI

### Context Provider

Located in `/frontend/src/context/PromptEngineeringContext.tsx`, this React context:

- Manages prompt engineering settings (level, debug mode)
- Persists user preferences
- Provides a unified interface for components to access the system
- Handles error states and fallbacks gracefully

## Features

### Multiple Prompting Levels

The system supports three levels of context-aware prompting:

1. **Enhanced** - Comprehensive error analysis with domain-specific prompts
2. **Basic** - Simple error categorization with general prompts
3. **Disabled** - No context-aware prompting, using default AI behavior

### Domain-Specific Expertise

The system includes specialized prompts for:

- Database errors (connections, deadlocks, constraints, queries)
- Network errors (connections, DNS, timeouts, CORS)
- Authentication and authorization issues
- API errors (requests, responses, serialization, rate limiting)
- React-specific errors (rendering, hooks, state management)
- Type/reference errors with appropriate defensive coding patterns
- And many more specialized domains

### Enhanced Error Analysis

The system provides rich information about errors:

- Basic categorization (database, network, etc.)
- Extended categorization (50+ specific error types)
- Database subtype identification (deadlock, constraint, etc.)
- Application context (which component area the error occurs in)
- Runtime context (during initialization, user interaction, etc.)
- Stack trace analysis to identify error sources
- Code references extracted from error messages
- Inferred root causes with confidence scoring
- Diagnostic questions for troubleshooting
- Severity and impact assessment

### User Interface Integration

The system includes an error context panel that displays:

- Error categorization with confidence scoring
- Technical details and context
- Root cause analysis
- Diagnostic questions
- Generated prompts (in debug mode)

Users can also configure the system through the advanced settings panel:

- Select prompting level (enhanced, basic, disabled)
- Toggle debug mode for technical details
- View generated prompts and error analysis

## Implementation

### Files

- `/frontend/src/utils/enhancedErrorAnalytics.ts` - Error analysis engine
- `/frontend/src/utils/enhancedPromptEngineering.ts` - Prompt engineering engine
- `/frontend/src/context/PromptEngineeringContext.tsx` - Context provider
- `/frontend/src/components/ExplainError/ErrorContext.tsx` - Error context UI
- `/frontend/src/components/ExplainError/ExplainError.tsx` - Main component with AI integration

### Integration Points

The system integrates with:

- **App Store** - Persists user preferences
- **React Query** - Provides mutations for AI explanations
- **Mantine UI** - Provides UI components for the interface
- **Backend AI API** - Sends prompts to the Ollama LLM service

## Benefits

The Context-Aware Prompting System provides several advantages:

1. **Higher Quality Explanations** - Tailored to specific error types
2. **More Actionable Solutions** - Domain-specific recommendations
3. **Improved Technical Accuracy** - Expert-level explanations
4. **Better User Experience** - More relevant and useful information
5. **Enhanced Debugging** - Diagnostic questions and root cause analysis
6. **User Control** - Configurable prompting levels and settings

## Future Enhancements

Potential future improvements include:

1. **Learning System** - Tracking successful explanations to improve templates
2. **Multi-Error Analysis** - Correlating related errors for comprehensive explanations
3. **Language Customization** - Adjusting explanation style based on user preferences
4. **Integration with Telemetry** - Using error tracking data to improve templates
5. **Additional Domains** - Expanding to more specialized error types
6. **Collaborative Improvement** - Allowing user feedback to refine templates

## Conclusion

The Context-Aware Prompting System significantly enhances Dexter's AI capabilities by providing specialized, domain-specific expertise tailored to each error. This results in more accurate, actionable, and useful error explanations, making troubleshooting more efficient for developers.