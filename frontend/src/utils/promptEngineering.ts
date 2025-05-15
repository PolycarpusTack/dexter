// File: frontend/src/utils/promptEngineering.ts

/**
 * Prompt Engineering - Helper functions for creating effective prompts for LLMs
 */

import { EventDetails } from '../types/eventDetails';
import { analyzeError, ErrorCategory, DatabaseErrorSubtype } from './errorAnalytics';

/**
 * Prompt template for explaining errors
 */
interface PromptTemplate {
  /** Template name */
  name: string;
  /** Error categories this template is good for */
  applicableCategories: ErrorCategory[];
  /** System prompt (provides context to the LLM) */
  systemPrompt: string;
  /** User prompt template (will be filled with error details) */
  userPromptTemplate: string;
}

/**
 * Template for a database error explanation
 */
const DATABASE_ERROR_TEMPLATE: PromptTemplate = {
  name: 'database_error',
  applicableCategories: [ErrorCategory.DATABASE],
  systemPrompt: 
`You are an experienced database administrator and software engineer specializing in troubleshooting database issues. Your job is to explain database errors clearly, identify potential causes, and suggest solutions.

Use these guidelines when explaining:
1. Start with a concise 1-2 sentence explanation of what the error means in plain language
2. Identify the most likely causes of this specific error
3. For deadlocks, explain which resources were involved in the conflict
4. Provide concrete suggestions to resolve the issue
5. When relevant, suggest code or query improvements
6. Use bullet points for clarity
7. Avoid technical jargon unless necessary, and explain it when used

Focus on being practical and actionable rather than theoretical.`,
  
  userPromptTemplate:
`Please explain this database error:

Error Type: {{errorType}}
Error Message: {{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if databaseSubtype}}
This appears to be a {{databaseSubtype}} issue.
{{/if}}

{{#if technicalContext}}
Technical Context:
{{#each technicalContext}}
- {{this}}
{{/each}}
{{/if}}

Please provide:
1. A clear explanation of what this error means
2. Likely causes
3. Practical solutions to fix it
4. Ways to prevent it in the future`
};

/**
 * Template for a network error explanation
 */
const NETWORK_ERROR_TEMPLATE: PromptTemplate = {
  name: 'network_error',
  applicableCategories: [ErrorCategory.NETWORK],
  systemPrompt: 
`You are an experienced network engineer and software developer specializing in diagnosing network-related issues in applications. Your job is to explain network errors clearly, identify potential causes, and suggest practical solutions.

Use these guidelines when explaining:
1. Start with a concise 1-2 sentence explanation of what the error means in plain language
2. Identify the most likely causes based on the specific error message
3. Provide concrete troubleshooting steps
4. Suggest how to make the application more resilient to this type of error
5. Use bullet points for clarity
6. Avoid technical jargon unless necessary, and explain it when used

Focus on being practical and actionable rather than theoretical.`,
  
  userPromptTemplate:
`Please explain this network error:

Error Type: {{errorType}}
Error Message: {{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if technicalContext}}
Technical Context:
{{#each technicalContext}}
- {{this}}
{{/each}}
{{/if}}

Please provide:
1. A clear explanation of what this error means
2. Likely causes of the network issue
3. Practical troubleshooting steps
4. Ways to make the application more resilient to this type of error`
};

/**
 * Template for an authentication/authorization error explanation
 */
const AUTH_ERROR_TEMPLATE: PromptTemplate = {
  name: 'auth_error',
  applicableCategories: [ErrorCategory.AUTHENTICATION, ErrorCategory.AUTHORIZATION],
  systemPrompt: 
`You are an experienced security engineer and software developer specializing in authentication and authorization systems. Your job is to explain auth-related errors clearly, identify potential causes, and suggest practical solutions.

Use these guidelines when explaining:
1. Start with a concise 1-2 sentence explanation of what the error means in plain language
2. Identify the most likely causes based on the specific error message
3. Clearly distinguish between authentication issues (proving identity) and authorization issues (permission to access)
4. Provide concrete troubleshooting steps
5. Suggest secure practices related to this issue
6. Use bullet points for clarity
7. Avoid technical jargon unless necessary, and explain it when used

Focus on being practical and actionable rather than theoretical.`,
  
  userPromptTemplate:
`Please explain this {{errorCategory}} error:

Error Type: {{errorType}}
Error Message: {{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if technicalContext}}
Technical Context:
{{#each technicalContext}}
- {{this}}
{{/each}}
{{/if}}

Please provide:
1. A clear explanation of what this error means
2. Likely causes of the {{errorCategory}} issue
3. Practical troubleshooting steps
4. Security best practices related to this error`
};

/**
 * Template for a general error explanation (fallback)
 */
const GENERAL_ERROR_TEMPLATE: PromptTemplate = {
  name: 'general_error',
  applicableCategories: [
    ErrorCategory.RUNTIME, 
    ErrorCategory.SYNTAX, 
    ErrorCategory.VALIDATION, 
    ErrorCategory.INPUT,
    ErrorCategory.TIMEOUT,
    ErrorCategory.MEMORY,
    ErrorCategory.CONFIGURATION,
    ErrorCategory.DEPENDENCY,
    ErrorCategory.UNKNOWN
  ],
  systemPrompt: 
`You are an experienced software engineer specializing in troubleshooting application errors. Your job is to explain errors clearly, identify potential causes, and suggest practical solutions.

Use these guidelines when explaining:
1. Start with a concise 1-2 sentence explanation of what the error means in plain language
2. Identify the most likely causes based on the specific error message and stack trace
3. Provide concrete troubleshooting steps
4. Suggest code improvements when relevant
5. Use bullet points for clarity
6. Avoid technical jargon unless necessary, and explain it when used

Focus on being practical and actionable rather than theoretical.`,
  
  userPromptTemplate:
`Please explain this error:

Error Type: {{errorType}}
Error Message: {{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if errorCategory}}
This appears to be a {{errorCategory}} error.
{{/if}}

{{#if technicalContext}}
Technical Context:
{{#each technicalContext}}
- {{this}}
{{/each}}
{{/if}}

{{#if potentialCauses}}
Potential causes may include:
{{#each potentialCauses}}
- {{this}}
{{/each}}
{{/if}}

Please provide:
1. A clear explanation of what this error means
2. Likely causes
3. Practical solutions to fix it
4. Ways to prevent similar errors in the future`
};

/**
 * Collection of all available prompt templates
 */
const PROMPT_TEMPLATES: PromptTemplate[] = [
  DATABASE_ERROR_TEMPLATE,
  NETWORK_ERROR_TEMPLATE,
  AUTH_ERROR_TEMPLATE,
  GENERAL_ERROR_TEMPLATE
];

/**
 * Generate a context-aware system prompt based on error details
 * 
 * @param eventDetails - Sentry event details object
 * @returns System prompt string
 */
export function generateSystemPrompt(eventDetails: EventDetails): string {
  // Analyze the error to get context
  const errorContext = analyzeError(eventDetails);
  
  // Find the most appropriate template
  const template = findBestTemplate(errorContext.category);
  
  return template.systemPrompt;
}

/**
 * Generate a context-aware user prompt based on error details
 * 
 * @param eventDetails - Sentry event details object
 * @returns User prompt string
 */
export function generateUserPrompt(eventDetails: EventDetails): string {
  // Analyze the error to get context
  const errorContext = analyzeError(eventDetails);
  
  // Extract basic information
  const errorType = errorContext.category.toString();
  const errorMessage = getErrorMessage(eventDetails);
  const stackTrace = getStackTrace(eventDetails);
  
  // Find the most appropriate template
  const template = findBestTemplate(errorContext.category);
  
  // Apply template with current error details
  let prompt = template.userPromptTemplate;
  
  // Replace placeholder variables
  prompt = prompt.replace('{{errorType}}', errorType);
  prompt = prompt.replace('{{errorMessage}}', errorMessage);
  prompt = prompt.replace('{{errorCategory}}', errorContext.category);
  
  // Handle stack trace if available
  if (stackTrace) {
    const stackTraceBlock = `Stack Trace:\n${stackTrace}`;
    prompt = prompt.replace('{{#if stackTrace}}\nStack Trace:\n{{stackTrace}}\n{{/if}}', stackTraceBlock);
  } else {
    prompt = prompt.replace('{{#if stackTrace}}\nStack Trace:\n{{stackTrace}}\n{{/if}}', '');
  }
  
  // Handle database subtype if applicable
  if (errorContext.category === ErrorCategory.DATABASE && errorContext.subtype) {
    const subtypeBlock = `This appears to be a ${errorContext.subtype} issue.`;
    prompt = prompt.replace('{{#if databaseSubtype}}\nThis appears to be a {{databaseSubtype}} issue.\n{{/if}}', subtypeBlock);
  } else {
    prompt = prompt.replace('{{#if databaseSubtype}}\nThis appears to be a {{databaseSubtype}} issue.\n{{/if}}', '');
  }
  
  // Handle technical context if available
  if (errorContext.technicalContext && errorContext.technicalContext.length > 0) {
    let contextBlock = 'Technical Context:\n';
    errorContext.technicalContext.forEach(item => {
      contextBlock += `- ${item}\n`;
    });
    
    prompt = prompt.replace(
      '{{#if technicalContext}}\nTechnical Context:\n{{#each technicalContext}}\n- {{this}}\n{{/each}}\n{{/if}}',
      contextBlock
    );
  } else {
    prompt = prompt.replace(
      '{{#if technicalContext}}\nTechnical Context:\n{{#each technicalContext}}\n- {{this}}\n{{/each}}\n{{/if}}',
      ''
    );
  }
  
  // Handle potential causes if available
  if (errorContext.potentialCauses && errorContext.potentialCauses.length > 0) {
    let causesBlock = 'Potential causes may include:\n';
    errorContext.potentialCauses.forEach(item => {
      causesBlock += `- ${item}\n`;
    });
    
    prompt = prompt.replace(
      '{{#if potentialCauses}}\nPotential causes may include:\n{{#each potentialCauses}}\n- {{this}}\n{{/each}}\n{{/if}}',
      causesBlock
    );
  } else {
    prompt = prompt.replace(
      '{{#if potentialCauses}}\nPotential causes may include:\n{{#each potentialCauses}}\n- {{this}}\n{{/each}}\n{{/if}}',
      ''
    );
  }
  
  return prompt;
}

/**
 * Create a complete prompt bundle for LLM request
 * 
 * @param eventDetails - Sentry event details object
 * @returns Object with system and user prompts
 */
export function createPromptBundle(eventDetails: EventDetails): { 
  systemPrompt: string;
  userPrompt: string;
  errorContext: ReturnType<typeof analyzeError>;
} {
  const errorContext = analyzeError(eventDetails);
  
  return {
    systemPrompt: generateSystemPrompt(eventDetails),
    userPrompt: generateUserPrompt(eventDetails),
    errorContext
  };
}

/**
 * Find the best template for a given error category
 * 
 * @param category - Error category
 * @returns Best matching template
 */
function findBestTemplate(category: ErrorCategory): PromptTemplate {
  // Try to find a template that specifically handles this category
  const specificTemplate = PROMPT_TEMPLATES.find(template => 
    template.applicableCategories.includes(category)
  );
  
  // If found, return it
  if (specificTemplate) {
    return specificTemplate;
  }
  
  // Otherwise, return the general template
  return GENERAL_ERROR_TEMPLATE;
}

/**
 * Extract error message from event details
 * 
 * @param eventDetails - Sentry event details object
 * @returns Error message string
 */
function getErrorMessage(eventDetails: EventDetails): string {
  if (!eventDetails) return '';
  
  // Check direct message field
  if (eventDetails.message) {
    return eventDetails.message;
  }
  
  // Check in exception values
  if (eventDetails?.exception?.values?.length && eventDetails.exception.values.length > 0) {
    return eventDetails.exception.values[0]?.value || '';
  }
  
  // Check in entries
  if (eventDetails?.entries?.length && eventDetails.entries.length > 0) {
    for (const entry of eventDetails.entries) {
      if (entry.type === 'exception' && entry?.data?.values?.length && entry.data.values.length > 0) {
        return entry.data.values[0]?.value || '';
      }
    }
  }
  
  // Get from title as fallback
  const title = eventDetails.title || '';
  if (title.includes(': ')) {
    return title.split(': ').slice(1).join(': ');
  }
  
  return title;
}

/**
 * Extract stack trace from event details
 * 
 * @param eventDetails - Sentry event details object
 * @returns Stack trace string or empty string
 */
function getStackTrace(eventDetails: EventDetails): string {
  if (!eventDetails) return '';
  
  // Extract from exception values
  if (eventDetails?.exception?.values?.length && eventDetails.exception.values.length > 0) {
    const exception = eventDetails.exception.values[0];
    
    if (exception?.stacktrace?.frames) {
      return exception.stacktrace.frames
        .map(frame => `at ${frame.function || 'anonymous'} (${frame.filename || 'unknown'}:${frame.lineno || '?'}:${frame.colno || '?'})`)
        .join('\n');
    }
  }
  
  // Check in entries
  if (eventDetails?.entries?.length && eventDetails.entries.length > 0) {
    for (const entry of eventDetails.entries) {
      if (entry.type === 'exception' && entry?.data?.values?.length && entry.data.values.length > 0) {
        const exception = entry.data.values[0];
        
        if (exception?.stacktrace?.frames) {
          return exception.stacktrace.frames
            .map(frame => `at ${frame.function || 'anonymous'} (${frame.filename || 'unknown'}:${frame.lineno || '?'}:${frame.colno || '?'})`)
            .join('\n');
        }
      }
    }
  }
  
  return '';
}

export default {
  generateSystemPrompt,
  generateUserPrompt,
  createPromptBundle
};