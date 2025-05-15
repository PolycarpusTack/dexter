// File: frontend/src/utils/enhancedPromptEngineering.ts

/**
 * Enhanced Prompt Engineering - Advanced context-aware prompt creation system
 * This module extends the basic prompt engineering with more sophisticated templates,
 * domain-specific expertise modeling, and enhanced context integration.
 */

import { EventDetails } from '../types/eventDetails';
import { ErrorCategory, DatabaseErrorSubtype } from './errorAnalytics';
import { 
  analyzeErrorEnhanced, 
  ExtendedErrorCategory, 
  ApplicationContext,
  RuntimeContext 
} from './enhancedErrorAnalytics';

/**
 * Enhanced prompt template with domain-specific expertise
 */
interface EnhancedPromptTemplate {
  /** Template name */
  name: string;
  /** Error categories this template is good for */
  applicableCategories: ErrorCategory[];
  /** Extended error categories for more specific matching */
  applicableExtendedCategories?: ExtendedErrorCategory[];
  /** Application contexts this template is designed for */
  applicableContexts?: ApplicationContext[];
  /** System prompt (provides context to the LLM) */
  systemPrompt: string;
  /** User prompt template (will be filled with error details) */
  userPromptTemplate: string;
  /** Priority level for template selection (higher wins) */
  priority: number;
}

/**
 * Enhanced template for database deadlock issues
 */
const DATABASE_DEADLOCK_TEMPLATE: EnhancedPromptTemplate = {
  name: 'database_deadlock',
  applicableCategories: [ErrorCategory.DATABASE],
  applicableExtendedCategories: [ExtendedErrorCategory.DATABASE_DEADLOCK],
  priority: 100,
  systemPrompt: 
`You are an expert database administrator specializing in deadlock resolution and transaction management. You have deep knowledge of database internals, transaction isolation levels, and performance optimization. Your expertise includes PostgreSQL, MySQL, and other relational databases.

When analyzing deadlocks, follow these guidelines:
1. Start with a concise explanation of what a deadlock is in plain language
2. Identify the specific tables and resources involved in the deadlock
3. Explain the transaction patterns that likely caused the conflict
4. Recommend immediate solutions to resolve the current deadlock
5. Suggest code/query changes to prevent future deadlocks
6. Explain appropriate isolation levels for this specific scenario
7. Offer performance considerations related to locking

Provide actionable advice that focuses on:
- Proper transaction ordering
- Minimizing transaction scope and duration
- Using appropriate indexes for lock avoidance
- Optimizing query patterns to reduce lock contention
- Choosing the right isolation level for the application needs

Use technical terminology where appropriate, but explain terms for developers who might not be database experts.`,
  
  userPromptTemplate:
`Please analyze this database deadlock error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

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

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of this deadlock situation
2. The specific resources that are likely involved
3. Why the deadlock occurred (transaction patterns)
4. Immediate resolution steps
5. Code/query changes to prevent future deadlocks
6. Appropriate isolation level recommendations
7. Performance considerations related to this deadlock pattern`
};

/**
 * Enhanced template for database connection issues
 */
const DATABASE_CONNECTION_TEMPLATE: EnhancedPromptTemplate = {
  name: 'database_connection',
  applicableCategories: [ErrorCategory.DATABASE],
  applicableExtendedCategories: [ExtendedErrorCategory.DATABASE_CONNECTION, ExtendedErrorCategory.DATABASE_POOL],
  priority: 90,
  systemPrompt: 
`You are an expert in database connectivity and connection pooling. You have deep experience troubleshooting database connection issues across various environments and database systems. Your expertise includes network troubleshooting, connection pooling optimization, and database client configuration.

When analyzing database connection issues, follow these guidelines:
1. Start with a clear explanation of the specific connection issue
2. Identify whether this is a network, authentication, capacity, or configuration problem
3. Explain the typical causes for this specific type of connection error
4. Recommend immediate diagnostic steps to gather more information
5. Provide specific solutions based on the error details
6. Suggest best practices for connection pool configuration
7. Include monitoring recommendations to prevent future issues

Provide actionable advice that focuses on:
- Proper connection pool sizing and configuration
- Network and firewall configuration
- Authentication and credential management
- High availability and failover considerations
- Resource management and monitoring

Use technical terminology where appropriate, but ensure explanations are accessible to developers.`,
  
  userPromptTemplate:
`Please analyze this database connection error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

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

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

{{#if diagnosticQuestions}}
Key Diagnostic Questions:
{{#each diagnosticQuestions}}
- {{this}}
{{/each}}
{{/if}}

Please provide:
1. An explanation of what this specific connection error means
2. The most likely causes for this particular connection issue
3. Diagnostic steps to gather more information
4. Immediate steps to resolve the connection problem
5. Best practices for database connection management in this scenario
6. Monitoring recommendations to detect similar issues early`
};

/**
 * Enhanced template for database constraint violations
 */
const DATABASE_CONSTRAINT_TEMPLATE: EnhancedPromptTemplate = {
  name: 'database_constraint',
  applicableCategories: [ErrorCategory.DATABASE],
  applicableExtendedCategories: [ExtendedErrorCategory.DATABASE_CONSTRAINT],
  priority: 90,
  systemPrompt: 
`You are an expert in database design, data integrity, and constraint management. You have deep knowledge of relational database constraints including primary keys, foreign keys, unique constraints, check constraints, and not-null constraints.

When analyzing constraint violation errors, follow these guidelines:
1. Start with a clear explanation of what constraint was violated and why
2. Identify the specific table and column(s) involved
3. Explain what the constraint is designed to protect
4. Analyze likely application code patterns that triggered the violation
5. Provide immediate solutions to resolve the current error
6. Suggest application-level validation that could prevent the issue
7. When appropriate, recommend database schema improvements

Provide actionable advice that focuses on:
- Maintaining data integrity
- Proper error handling for constraint violations
- Application-level validation strategies
- Appropriate constraint design

Use technical terminology where appropriate, but ensure explanations include concrete examples.`,
  
  userPromptTemplate:
`Please analyze this database constraint violation:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

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

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of which constraint was violated and why
2. The specific table and column(s) involved
3. What this constraint is designed to protect
4. Likely application scenarios that triggered this violation
5. How to immediately resolve this constraint error
6. Application-level validation that could prevent similar issues
7. Recommended error handling for this type of constraint`
};

/**
 * Enhanced template for database query errors
 */
const DATABASE_QUERY_TEMPLATE: EnhancedPromptTemplate = {
  name: 'database_query',
  applicableCategories: [ErrorCategory.DATABASE],
  applicableExtendedCategories: [ExtendedErrorCategory.DATABASE_QUERY],
  priority: 85,
  systemPrompt: 
`You are an expert in SQL query optimization, database performance tuning, and query troubleshooting. You have deep experience with SQL syntax across different database systems, query plan analysis, and index optimization.

When analyzing query errors, follow these guidelines:
1. Start with a clear explanation of the specific query error
2. Identify syntax issues, semantic problems, or performance concerns
3. Point out the specific part of the query that's problematic
4. Explain the database's perspective on why this query failed
5. Provide corrected query examples
6. Suggest performance optimizations where relevant
7. Recommend best practices for similar queries

Provide actionable advice that focuses on:
- Proper SQL syntax and semantics
- Query performance optimization
- Appropriate use of indexes
- Query organization and readability
- Parameterization and SQL injection prevention

Explain database concepts clearly while providing specific technical recommendations.`,
  
  userPromptTemplate:
`Please analyze this database query error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

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

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what went wrong with this query
2. The specific part of the query that's causing the error
3. Why the database rejected or had trouble with this query
4. A corrected version of the query (if possible to infer from the error)
5. Best practices for this type of database operation
6. Performance considerations for this query pattern
7. Security considerations if applicable`
};

/**
 * Enhanced template for network connectivity issues
 */
const NETWORK_CONNECTION_TEMPLATE: EnhancedPromptTemplate = {
  name: 'network_connection',
  applicableCategories: [ErrorCategory.NETWORK],
  applicableExtendedCategories: [
    ExtendedErrorCategory.NETWORK_CONNECTION, 
    ExtendedErrorCategory.NETWORK_DNS
  ],
  priority: 90,
  systemPrompt: 
`You are an expert in network troubleshooting, API connectivity, and distributed systems. You have deep experience diagnosing connection issues between services, DNS problems, firewall configurations, and network timeout scenarios.

When analyzing network connection errors, follow these guidelines:
1. Start with a clear explanation of the specific connection failure
2. Differentiate between different causes: service unavailability, DNS issues, firewall blocks, etc.
3. Explain the network communication flow that's being disrupted
4. Recommend specific diagnostic steps to pinpoint the issue
5. Provide immediate workarounds or solutions
6. Suggest robust connection handling patterns
7. Recommend monitoring and resilience strategies

Provide actionable advice that focuses on:
- Network diagnostic procedures
- Proper error handling for network failures
- Retry strategies with exponential backoff
- Circuit breakers and fallback mechanisms
- Proper timeout configuration

Explain network concepts clearly while providing specific technical recommendations.`,
  
  userPromptTemplate:
`Please analyze this network connection error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if runtimeContext}}
Runtime Context: {{runtimeContext}}
{{/if}}

{{#if technicalContext}}
Technical Context:
{{#each technicalContext}}
- {{this}}
{{/each}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

{{#if diagnosticQuestions}}
Key Diagnostic Questions:
{{#each diagnosticQuestions}}
- {{this}}
{{/each}}
{{/if}}

Please provide:
1. A clear explanation of what this network error indicates
2. The most likely causes for this connection failure
3. Specific diagnostic steps to identify the root cause
4. Immediate solutions or workarounds
5. Proper error handling code for this scenario
6. Retry and resilience strategies for this type of failure
7. Monitoring recommendations to detect similar issues early`
};

/**
 * Enhanced template for CORS issues
 */
const CORS_ERROR_TEMPLATE: EnhancedPromptTemplate = {
  name: 'cors_error',
  applicableCategories: [ErrorCategory.NETWORK],
  applicableExtendedCategories: [ExtendedErrorCategory.NETWORK_CORS],
  priority: 95,
  systemPrompt: 
`You are an expert in web security, cross-origin resource sharing (CORS), and browser security policies. You have deep experience with web API development, browser security models, and frontend-backend integration patterns.

When analyzing CORS errors, follow these guidelines:
1. Start with a clear explanation of what CORS is and why browsers enforce it
2. Identify the specific CORS rule that's being violated
3. Explain the security implications and why this restriction exists
4. Outline both frontend and backend solutions
5. Provide specific code examples for resolving the issue
6. Include security considerations for any proposed solutions
7. Explain how to test CORS configurations

Provide actionable advice that focuses on:
- Proper CORS header configuration
- Safe cross-origin request handling
- Security best practices
- Development vs. production considerations
- Testing methodologies

Explain security concepts clearly while providing specific technical solutions.`,
  
  userPromptTemplate:
`Please analyze this CORS (Cross-Origin Resource Sharing) error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if runtimeContext}}
Runtime Context: {{runtimeContext}}
{{/if}}

{{#if technicalContext}}
Technical Context:
{{#each technicalContext}}
- {{this}}
{{/each}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

Please provide:
1. A clear explanation of what this CORS error means
2. Why the browser is blocking this request
3. Backend changes needed to resolve the CORS issue
4. Frontend approaches to handle CORS properly
5. Security considerations for the proposed solutions
6. How to test that the CORS configuration is working
7. Common pitfalls when implementing CORS solutions`
};

/**
 * Enhanced template for authentication errors
 */
const AUTHENTICATION_ERROR_TEMPLATE: EnhancedPromptTemplate = {
  name: 'authentication_error',
  applicableCategories: [ErrorCategory.AUTHENTICATION],
  applicableExtendedCategories: [
    ExtendedErrorCategory.AUTH_INVALID_CREDENTIALS,
    ExtendedErrorCategory.AUTH_EXPIRED_TOKEN,
    ExtendedErrorCategory.AUTH_MISSING_TOKEN
  ],
  priority: 90,
  systemPrompt: 
`You are an expert in authentication systems, identity management, and secure API access. You have deep experience with token-based authentication, OAuth, JWT, session management, and security best practices.

When analyzing authentication errors, follow these guidelines:
1. Start with a clear explanation of the specific authentication failure
2. Identify whether this is a credential issue, token problem, or configuration error
3. Explain the authentication flow that's being disrupted
4. Recommend specific diagnostic steps to pinpoint the issue
5. Provide solutions for both immediate resolution and long-term robustness
6. Include security considerations for any proposed solutions
7. Suggest proper user experience handling for auth failures

Provide actionable advice that focuses on:
- Secure authentication practices
- Proper token management
- Error handling for auth failures
- User experience considerations
- Security monitoring

Explain authentication concepts clearly while providing specific technical solutions.`,
  
  userPromptTemplate:
`Please analyze this authentication error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if extendedCategory}}
Specific Auth Issue Type: {{extendedCategory}}
{{/if}}

{{#if technicalContext}}
Technical Context:
{{#each technicalContext}}
- {{this}}
{{/each}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what this authentication error indicates
2. The most likely causes for this authentication failure
3. How the authentication flow is breaking down
4. Immediate steps to resolve the authentication issue
5. Best practices for handling this type of auth error
6. Security implications and considerations
7. User experience recommendations for this scenario`
};

/**
 * Enhanced template for authorization errors
 */
const AUTHORIZATION_ERROR_TEMPLATE: EnhancedPromptTemplate = {
  name: 'authorization_error',
  applicableCategories: [ErrorCategory.AUTHORIZATION],
  applicableExtendedCategories: [ExtendedErrorCategory.AUTH_PERMISSION],
  priority: 90,
  systemPrompt: 
`You are an expert in authorization systems, access control, and permission management. You have deep experience with role-based access control (RBAC), attribute-based access control (ABAC), and implementing secure permission systems.

When analyzing authorization errors, follow these guidelines:
1. Start with a clear explanation of the specific permission issue
2. Distinguish between authentication (identity) and authorization (permissions)
3. Explain why access is being denied and what permission is missing
4. Recommend specific diagnostic steps to verify the permission setup
5. Provide immediate solutions and long-term permission design advice
6. Include security considerations for any proposed solutions
7. Suggest proper user experience for permission denials

Provide actionable advice that focuses on:
- Secure authorization practices
- Permission system design
- Principle of least privilege
- Audit logging for access attempts
- User experience for permission boundaries

Explain authorization concepts clearly while providing specific technical solutions.`,
  
  userPromptTemplate:
`Please analyze this authorization error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if runtimeContext}}
Runtime Context: {{runtimeContext}}
{{/if}}

{{#if technicalContext}}
Technical Context:
{{#each technicalContext}}
- {{this}}
{{/each}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what this authorization error indicates
2. The specific permission that appears to be missing
3. How the authorization system is blocking access
4. Steps to diagnose the permission configuration
5. Immediate solutions to resolve the permission issue
6. Best practices for permission system design
7. User experience recommendations for permission boundaries`
};

/**
 * Enhanced template for API request/response errors
 */
const API_ERROR_TEMPLATE: EnhancedPromptTemplate = {
  name: 'api_error',
  applicableCategories: [ErrorCategory.NETWORK],
  applicableExtendedCategories: [
    ExtendedErrorCategory.API_REQUEST,
    ExtendedErrorCategory.API_RESPONSE,
    ExtendedErrorCategory.API_SERIALIZATION,
    ExtendedErrorCategory.API_RATE_LIMIT
  ],
  priority: 85,
  systemPrompt: 
`You are an expert in API design, RESTful services, API integration, and HTTP communication. You have deep experience troubleshooting API interactions, handling error states, and building robust API clients.

When analyzing API errors, follow these guidelines:
1. Start with a clear explanation of the specific API issue
2. Identify whether this is a client request problem, server response issue, or network error
3. Explain the HTTP communication flow that's being disrupted
4. Interpret status codes and error responses
5. Provide immediate solutions and long-term API interaction patterns
6. Include error handling best practices
7. Suggest logging and monitoring for API interactions

Provide actionable advice that focuses on:
- HTTP protocol best practices
- Robust API client design
- Proper error handling for API failures
- Retry strategies for transient issues
- Content type and serialization handling

Explain API concepts clearly while providing specific technical solutions.`,
  
  userPromptTemplate:
`Please analyze this API error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if extendedCategory}}
Specific API Issue Type: {{extendedCategory}}
{{/if}}

{{#if technicalContext}}
Technical Context:
{{#each technicalContext}}
- {{this}}
{{/each}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what this API error indicates
2. Whether this is a client, server, or network issue
3. The specific part of the API interaction that's failing
4. Immediate steps to resolve the API issue
5. How to handle this error gracefully in code
6. Robust patterns for similar API interactions
7. Logging and monitoring recommendations for API calls`
};

/**
 * Enhanced template for React errors
 */
const REACT_ERROR_TEMPLATE: EnhancedPromptTemplate = {
  name: 'react_error',
  applicableCategories: [ErrorCategory.RUNTIME],
  applicableExtendedCategories: [
    ExtendedErrorCategory.REACT_RENDERING,
    ExtendedErrorCategory.REACT_HOOKS,
    ExtendedErrorCategory.REACT_STATE,
    ExtendedErrorCategory.REACT_EFFECT
  ],
  priority: 95,
  systemPrompt: 
`You are an expert React developer specializing in troubleshooting React applications. You have deep experience with React hooks, component lifecycle, state management, and React's rendering behavior.

When analyzing React errors, follow these guidelines:
1. Start with a clear explanation of the specific React issue
2. Identify component lifecycle or hook rule violations
3. Explain React's perspective on why this error occurred
4. Distinguish between React-specific issues and general JavaScript errors
5. Provide immediate code fixes with examples
6. Include best practices for the affected React pattern
7. Suggest testing approaches to prevent similar issues

Provide actionable advice that focuses on:
- React component design
- Proper hook usage
- State management best practices
- Effect cleanup and dependency arrays
- Performance considerations

Explain React concepts clearly while providing specific code solutions.`,
  
  userPromptTemplate:
`Please analyze this React error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if extendedCategory}}
Specific React Issue Type: {{extendedCategory}}
{{/if}}

{{#if runtimeContext}}
Runtime Context: {{runtimeContext}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what this React error means
2. The React rule or principle that's being violated
3. How this affects component rendering or behavior
4. Code example showing the likely problem
5. Corrected code example that fixes the issue
6. React best practices related to this error
7. How to test or verify the solution works properly`
};

/**
 * Enhanced template for type errors and null/undefined access
 */
const TYPE_ERROR_TEMPLATE: EnhancedPromptTemplate = {
  name: 'type_error',
  applicableCategories: [ErrorCategory.RUNTIME],
  applicableExtendedCategories: [
    ExtendedErrorCategory.RUNTIME_TYPE,
    ExtendedErrorCategory.RUNTIME_REFERENCE
  ],
  priority: 85,
  systemPrompt: 
`You are an expert JavaScript/TypeScript developer specializing in type safety, defensive programming, and robust error handling. You have deep experience with type systems, null/undefined handling, and preventing runtime type errors.

When analyzing type errors, follow these guidelines:
1. Start with a clear explanation of the specific type error
2. Identify the null/undefined access pattern or type mismatch
3. Explain how the code is attempting to use a value of the wrong type
4. Provide immediate code fixes with examples showing proper type checking
5. Include defensive programming patterns for the specific scenario
6. Suggest TypeScript or static analysis tools when appropriate
7. Explain the trade-offs between different solutions

Provide actionable advice that focuses on:
- Defensive null/undefined checking
- Type guards and narrowing
- Optional chaining and nullish coalescing
- TypeScript type definitions
- Error boundary usage

Explain type concepts clearly while providing specific code solutions that balance safety and readability.`,
  
  userPromptTemplate:
`Please analyze this type error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if runtimeContext}}
Runtime Context: {{runtimeContext}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what this type error means
2. The specific null/undefined access or type mismatch occurring
3. Code example showing the likely problem pattern
4. Multiple solutions with different approaches:
   a. Quick fix with optional chaining or nullish coalescing
   b. Defensive programming with explicit checks
   c. TypeScript approach with proper types
5. Best practices for preventing similar errors
6. How to systematically find similar issues in the codebase`
};

/**
 * Enhanced template for data validation errors
 */
const DATA_VALIDATION_TEMPLATE: EnhancedPromptTemplate = {
  name: 'data_validation',
  applicableCategories: [ErrorCategory.VALIDATION, ErrorCategory.INPUT],
  applicableExtendedCategories: [
    ExtendedErrorCategory.DATA_VALIDATION,
    ExtendedErrorCategory.DATA_FORMAT,
    ExtendedErrorCategory.DATA_MISSING
  ],
  priority: 85,
  systemPrompt: 
`You are an expert in data validation, schema design, and input sanitization. You have deep experience implementing robust validation systems, handling malformed input gracefully, and designing user-friendly validation UIs.

When analyzing validation errors, follow these guidelines:
1. Start with a clear explanation of the specific validation issue
2. Identify which validation rule or constraint is being violated
3. Explain why this validation exists and its importance
4. Provide immediate solutions for handling the current validation error
5. Include code examples for proper validation
6. Suggest UI/UX patterns for preventing invalid input
7. Recommend testing approaches for validation logic

Provide actionable advice that focuses on:
- Input validation best practices
- Schema definition and enforcement
- Error message design for validation failures
- Progressive validation in user interfaces
- Security aspects of validation

Explain validation concepts clearly while providing specific technical solutions that balance user experience and data integrity.`,
  
  userPromptTemplate:
`Please analyze this data validation error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if extendedCategory}}
Specific Validation Issue Type: {{extendedCategory}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what validation rule is being violated
2. Why this validation exists and its importance
3. The specific data that's failing validation
4. Immediate solutions for handling this validation error
5. Code examples for proper validation in this scenario
6. UI/UX considerations for preventing invalid input
7. Testing strategies for validation logic`
};

/**
 * Enhanced template for configuration errors
 */
const CONFIGURATION_ERROR_TEMPLATE: EnhancedPromptTemplate = {
  name: 'configuration_error',
  applicableCategories: [ErrorCategory.CONFIGURATION],
  applicableExtendedCategories: [
    ExtendedErrorCategory.CONFIG_MISSING,
    ExtendedErrorCategory.CONFIG_INVALID,
    ExtendedErrorCategory.CONFIG_ENV
  ],
  priority: 85,
  systemPrompt: 
`You are an expert in application configuration, environment management, and deployment processes. You have deep experience with configuration systems, environment variables, configuration files, and secure credential management.

When analyzing configuration errors, follow these guidelines:
1. Start with a clear explanation of the specific configuration issue
2. Identify whether this is a missing, invalid, or environment-specific config problem
3. Explain the impact of this configuration issue on the application
4. Provide immediate solutions for resolving the configuration problem
5. Include best practices for configuration management
6. Suggest validation and verification approaches for configuration
7. Address security considerations for sensitive configuration

Provide actionable advice that focuses on:
- Configuration hierarchy and precedence
- Environment-specific configuration
- Secure credential management
- Configuration validation
- Documentation and discoverability

Explain configuration concepts clearly while providing specific technical solutions that balance flexibility, security, and maintainability.`,
  
  userPromptTemplate:
`Please analyze this configuration error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if extendedCategory}}
Specific Configuration Issue Type: {{extendedCategory}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what configuration issue is occurring
2. The specific configuration that's missing or invalid
3. How this affects the application's behavior
4. Immediate steps to resolve the configuration issue
5. Best practices for managing this type of configuration
6. Validation approaches to prevent similar issues
7. Security considerations if this involves sensitive configuration`
};

/**
 * Enhanced template for dependency errors
 */
const DEPENDENCY_ERROR_TEMPLATE: EnhancedPromptTemplate = {
  name: 'dependency_error',
  applicableCategories: [ErrorCategory.DEPENDENCY],
  applicableExtendedCategories: [
    ExtendedErrorCategory.DEPENDENCY_MISSING,
    ExtendedErrorCategory.DEPENDENCY_VERSION,
    ExtendedErrorCategory.DEPENDENCY_INCOMPATIBLE
  ],
  priority: 85,
  systemPrompt: 
`You are an expert in package management, dependency resolution, and module systems. You have deep experience with npm, yarn, package.json, bundlers, and JavaScript module formats.

When analyzing dependency errors, follow these guidelines:
1. Start with a clear explanation of the specific dependency issue
2. Identify whether this is a missing module, version conflict, or compatibility problem
3. Explain the module resolution process that's failing
4. Provide immediate solutions for resolving the dependency issue
5. Include best practices for dependency management
6. Suggest tools for dependency analysis and maintenance
7. Address potential security implications of dependency changes

Provide actionable advice that focuses on:
- Package management best practices
- Semantic versioning and version constraints
- Dependency resolution algorithms
- Bundle optimization
- Security auditing

Explain dependency concepts clearly while providing specific technical solutions that balance functionality, security, and maintainability.`,
  
  userPromptTemplate:
`Please analyze this dependency error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if extendedCategory}}
Specific Dependency Issue Type: {{extendedCategory}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what dependency issue is occurring
2. The specific module or package causing the problem
3. How the module resolution is failing
4. Immediate steps to resolve the dependency issue
5. Best practices for managing this type of dependency
6. Tools for analyzing and maintaining dependencies
7. Security considerations for dependency changes`
};

/**
 * Enhanced template for memory and resource errors
 */
const RESOURCE_ERROR_TEMPLATE: EnhancedPromptTemplate = {
  name: 'resource_error',
  applicableCategories: [ErrorCategory.MEMORY, ErrorCategory.TIMEOUT],
  applicableExtendedCategories: [
    ExtendedErrorCategory.RESOURCE_MEMORY,
    ExtendedErrorCategory.RESOURCE_CPU,
    ExtendedErrorCategory.RESOURCE_TIMEOUT,
    ExtendedErrorCategory.RESOURCE_QUOTA
  ],
  priority: 90,
  systemPrompt: 
`You are an expert in application performance, resource management, and optimization. You have deep experience with memory leaks, performance profiling, resource constraints, and scaling applications.

When analyzing resource errors, follow these guidelines:
1. Start with a clear explanation of the specific resource constraint being hit
2. Identify whether this is a memory leak, CPU bottleneck, or timeout issue
3. Explain the patterns that typically lead to this type of resource exhaustion
4. Provide immediate mitigations and long-term solutions
5. Include profiling and debugging approaches for resource issues
6. Suggest performance optimization techniques
7. Address scaling considerations for resource-intensive operations

Provide actionable advice that focuses on:
- Memory management best practices
- Async operation optimization
- Resource pooling and reuse
- Performance profiling techniques
- Scaling strategies

Explain performance concepts clearly while providing specific technical solutions that balance functionality, resource usage, and user experience.`,
  
  userPromptTemplate:
`Please analyze this resource or performance error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if extendedCategory}}
Specific Resource Issue Type: {{extendedCategory}}
{{/if}}

{{#if runtimeContext}}
Runtime Context: {{runtimeContext}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what resource constraint is being hit
2. The patterns that typically lead to this resource issue
3. How to diagnose and profile this type of problem
4. Immediate mitigations to resolve the current issue
5. Long-term solutions to prevent recurrence
6. Performance optimization techniques for this scenario
7. Scaling considerations for resource-intensive operations`
};

/**
 * Enhanced template for file system errors
 */
const FILE_SYSTEM_ERROR_TEMPLATE: EnhancedPromptTemplate = {
  name: 'file_system_error',
  applicableCategories: [ErrorCategory.RUNTIME],
  applicableExtendedCategories: [
    ExtendedErrorCategory.FS_NOT_FOUND,
    ExtendedErrorCategory.FS_PERMISSION,
    ExtendedErrorCategory.FS_DISK
  ],
  priority: 85,
  systemPrompt: 
`You are an expert in file system operations, I/O handling, and storage management. You have deep experience with file permissions, path resolution, disk space management, and platform-specific file system behaviors.

When analyzing file system errors, follow these guidelines:
1. Start with a clear explanation of the specific file system issue
2. Identify whether this is a not-found, permission, or disk space problem
3. Explain the file operation that's failing and why
4. Provide immediate solutions for resolving the file system issue
5. Include best practices for file system operations
6. Suggest error handling patterns specific to file I/O
7. Address platform-specific considerations (Windows/Unix differences)

Provide actionable advice that focuses on:
- Robust file path handling
- Permission management best practices
- Error handling for I/O operations
- Disk space monitoring and management
- Cross-platform compatibility

Explain file system concepts clearly while providing specific technical solutions that work across platforms.`,
  
  userPromptTemplate:
`Please analyze this file system error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if extendedCategory}}
Specific File System Issue Type: {{extendedCategory}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

Please provide:
1. A clear explanation of what file system issue is occurring
2. The specific file operation that's failing and why
3. Immediate steps to resolve the file system issue
4. Best practices for this type of file operation
5. Error handling patterns for robust file I/O
6. Platform-specific considerations (if applicable)
7. Monitoring recommendations for file system issues`
};

/**
 * Enhanced template for general/fallback errors
 */
const ENHANCED_GENERAL_TEMPLATE: EnhancedPromptTemplate = {
  name: 'enhanced_general',
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
  priority: 10, // Low priority as fallback
  systemPrompt: 
`You are an experienced software engineer specializing in troubleshooting application errors. You have deep experience with JavaScript/TypeScript, React, modern web development, and common error patterns.

When analyzing errors, follow these guidelines:
1. Start with a concise explanation of what the error means in plain language
2. Identify the most likely causes based on the error message and stack trace
3. Provide specific, actionable steps to diagnose and fix the issue
4. Include code examples when helpful
5. Suggest both immediate fixes and long-term improvements
6. Use bullet points for clarity
7. Avoid technical jargon unless necessary, and explain it when used

Focus on being practical and actionable rather than theoretical. Provide solutions that developers can implement immediately as well as best practices to prevent similar errors in the future.`,
  
  userPromptTemplate:
`Please analyze this error:

Error Type: {{errorType}}
Error Message:
{{errorMessage}}

{{#if stackTrace}}
Stack Trace:
{{stackTrace}}
{{/if}}

{{#if applicationContext}}
Application Context: {{applicationContext}}
{{/if}}

{{#if extendedCategory}}
Error Category: {{extendedCategory}}
{{/if}}

{{#if runtimeContext}}
Runtime Context: {{runtimeContext}}
{{/if}}

{{#if errorSource}}
Error Source: {{errorSource}}
{{/if}}

{{#if codeReferences}}
Code References:
{{#each codeReferences}}
- {{this}}
{{/each}}
{{/if}}

{{#if inferredRootCause}}
Inferred Root Cause: {{inferredRootCause}}
{{/if}}

{{#if diagnosticQuestions}}
Key Diagnostic Questions:
{{#each diagnosticQuestions}}
- {{this}}
{{/each}}
{{/if}}

Please provide:
1. A clear explanation of what this error means
2. The most likely causes for this error
3. Step-by-step troubleshooting process
4. Solutions to fix the immediate issue
5. Best practices to prevent similar errors
6. Any relevant code examples or patterns
7. Additional context that might help understand this error`
};

/**
 * Collection of all available enhanced prompt templates
 */
const ENHANCED_PROMPT_TEMPLATES: EnhancedPromptTemplate[] = [
  DATABASE_DEADLOCK_TEMPLATE,
  DATABASE_CONNECTION_TEMPLATE,
  DATABASE_CONSTRAINT_TEMPLATE,
  DATABASE_QUERY_TEMPLATE,
  NETWORK_CONNECTION_TEMPLATE,
  CORS_ERROR_TEMPLATE,
  AUTHENTICATION_ERROR_TEMPLATE,
  AUTHORIZATION_ERROR_TEMPLATE,
  API_ERROR_TEMPLATE,
  REACT_ERROR_TEMPLATE,
  TYPE_ERROR_TEMPLATE,
  DATA_VALIDATION_TEMPLATE,
  CONFIGURATION_ERROR_TEMPLATE,
  DEPENDENCY_ERROR_TEMPLATE,
  RESOURCE_ERROR_TEMPLATE,
  FILE_SYSTEM_ERROR_TEMPLATE,
  ENHANCED_GENERAL_TEMPLATE
];

/**
 * Generate an enhanced context-aware system prompt based on error details
 * 
 * @param eventDetails - Sentry event details object
 * @returns System prompt string
 */
export function generateEnhancedSystemPrompt(eventDetails: EventDetails): string {
  // Get enhanced error context
  const errorContext = analyzeErrorEnhanced(eventDetails);
  
  // Find the most appropriate template
  const template = findBestTemplate(
    errorContext.category,
    errorContext.extendedCategory,
    errorContext.applicationContext
  );
  
  return template.systemPrompt;
}

/**
 * Generate an enhanced context-aware user prompt based on error details
 * 
 * @param eventDetails - Sentry event details object
 * @returns User prompt string
 */
export function generateEnhancedUserPrompt(eventDetails: EventDetails): string {
  // Get enhanced error context
  const errorContext = analyzeErrorEnhanced(eventDetails);
  
  // Extract basic information
  const errorType = errorContext.category.toString();
  const errorMessage = extractErrorMessage(eventDetails);
  const stackTrace = extractStackTrace(eventDetails);
  
  // Find the most appropriate template
  const template = findBestTemplate(
    errorContext.category,
    errorContext.extendedCategory,
    errorContext.applicationContext
  );
  
  // Apply template with current error details
  let prompt = template.userPromptTemplate;
  
  // Process each placeholder with dynamic content substitution
  prompt = substituteTemplateVariables(prompt, {
    errorType,
    errorMessage,
    errorCategory: errorContext.category,
    extendedCategory: errorContext.extendedCategory,
    applicationContext: errorContext.applicationContext,
    runtimeContext: errorContext.runtimeContext,
    stackTrace,
    databaseSubtype: errorContext.subtype,
    technicalContext: errorContext.technicalContext,
    potentialCauses: errorContext.potentialCauses,
    errorSource: errorContext.stackAnalysis?.errorSource,
    codeReferences: errorContext.codeReferences,
    inferredRootCause: errorContext.inferredRootCause,
    diagnosticQuestions: errorContext.diagnosticQuestions
  });
  
  return prompt;
}

/**
 * Create a complete enhanced prompt bundle for LLM request
 * 
 * @param eventDetails - Sentry event details object
 * @returns Object with system and user prompts and error context
 */
export function createEnhancedPromptBundle(eventDetails: EventDetails): {
  systemPrompt: string;
  userPrompt: string;
  errorContext: ReturnType<typeof analyzeErrorEnhanced>;
} {
  const errorContext = analyzeErrorEnhanced(eventDetails);
  
  return {
    systemPrompt: generateEnhancedSystemPrompt(eventDetails),
    userPrompt: generateEnhancedUserPrompt(eventDetails),
    errorContext
  };
}

/**
 * Find the best template for a given error category and extended context
 * 
 * @param category - Error category
 * @param extendedCategory - Extended error category if available
 * @param applicationContext - Application context if available
 * @returns Best matching template
 */
function findBestTemplate(
  category: ErrorCategory,
  extendedCategory?: ExtendedErrorCategory,
  applicationContext?: ApplicationContext
): EnhancedPromptTemplate {
  // Score each template by relevance
  const scoredTemplates = ENHANCED_PROMPT_TEMPLATES.map(template => {
    let score = 0;
    
    // Base score for matching category
    if (template.applicableCategories.includes(category)) {
      score += 50;
    }
    
    // Additional score for matching extended category
    if (extendedCategory && 
        template.applicableExtendedCategories && 
        template.applicableExtendedCategories.includes(extendedCategory)) {
      score += 100;
    }
    
    // Additional score for matching application context
    if (applicationContext && 
        template.applicableContexts && 
        template.applicableContexts.includes(applicationContext)) {
      score += 25;
    }
    
    // Add template priority to the score
    score += template.priority;
    
    return { template, score };
  });
  
  // Sort by score and get the highest
  scoredTemplates.sort((a, b) => b.score - a.score);
  
  // Return the best match or fallback to general template
  return scoredTemplates[0]?.template || ENHANCED_GENERAL_TEMPLATE;
}

/**
 * Substitute template variables with actual values
 * 
 * @param template - Template string with variables
 * @param values - Object with values to substitute
 * @returns Processed template
 */
function substituteTemplateVariables(
  template: string,
  values: Record<string, any>
): string {
  let result = template;
  
  // Process simple variables
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && typeof value !== 'object') {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
  }
  
  // Process conditional blocks
  for (const key of Object.keys(values)) {
    const value = values[key];
    const ifBlockRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{/if}}`, 'g');
    
    result = result.replace(ifBlockRegex, (match, content) => {
      // If array, check if it has items
      if (Array.isArray(value)) {
        return value.length > 0 ? content : '';
      }
      
      // If truthy value, include content
      return value ? content : '';
    });
  }
  
  // Process array iterations
  for (const key of Object.keys(values)) {
    const value = values[key];
    if (Array.isArray(value)) {
      const eachBlockRegex = new RegExp(`{{#each ${key}}}([\\s\\S]*?){{/each}}`, 'g');
      
      result = result.replace(eachBlockRegex, (match, content) => {
        if (value.length === 0) return '';
        
        return value.map(item => {
          let itemContent = content;
          // Replace {{this}} with the array item value
          itemContent = itemContent.replace(/{{this}}/g, String(item));
          return itemContent;
        }).join('');
      });
    }
  }
  
  return result;
}

/**
 * Extract error message from event details
 */
function extractErrorMessage(eventDetails: EventDetails): string {
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
 */
function extractStackTrace(eventDetails: EventDetails): string {
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
  generateEnhancedSystemPrompt,
  generateEnhancedUserPrompt,
  createEnhancedPromptBundle
};