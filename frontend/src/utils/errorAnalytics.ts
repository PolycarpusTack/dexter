// File: frontend/src/utils/errorAnalytics.ts

/**
 * Error Analytics - Helper functions for analyzing and categorizing errors
 * This module helps with identifying error patterns and providing context to LLM prompts
 */

import { EventDetails } from '../types/eventDetails';

/**
 * Error category enum for classification
 */
export enum ErrorCategory {
  DATABASE = 'database',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  INPUT = 'input',
  SYNTAX = 'syntax',
  RUNTIME = 'runtime',
  MEMORY = 'memory',
  TIMEOUT = 'timeout',
  DEADLOCK = 'deadlock',
  CONFIGURATION = 'configuration',
  DEPENDENCY = 'dependency',
  UNKNOWN = 'unknown'
}

/**
 * Database error subtypes
 */
export enum DatabaseErrorSubtype {
  CONNECTION = 'connection',
  QUERY = 'query',
  CONSTRAINT = 'constraint',
  DEADLOCK = 'deadlock',
  TIMEOUT = 'timeout',
  MIGRATION = 'migration',
  POOL = 'pool',
  TRANSACTION = 'transaction',
  UNKNOWN = 'unknown'
}

/**
 * Error context to provide more information for LLM prompts
 */
export interface ErrorContext {
  /** Primary category of the error */
  category: ErrorCategory;
  /** Subtype for more specific categorization */
  subtype?: string;
  /** Level of severity (error, warning, info) */
  severity?: 'critical' | 'high' | 'medium' | 'low';
  /** Technical details that might be helpful for explanation */
  technicalContext?: string[];
  /** Potential causes based on error pattern recognition */
  potentialCauses?: string[];
  /** Keywords extracted from the error for better prompting */
  keywords?: string[];
  /** Has sufficient details for good explanation */
  hasSufficientDetails: boolean;
}

/**
 * Database-specific error patterns to match
 */
const DATABASE_ERROR_PATTERNS = {
  postgres: {
    deadlock: [
      /deadlock detected/i,
      /deadlock found/i,
      /could not serialize access/i,
      /concurrent update/i
    ],
    connection: [
      /connection to .* refused/i,
      /could not connect to server/i,
      /connection timed out/i,
      /too many connections/i
    ],
    constraint: [
      /violates (not-null|check|unique|foreign key|exclusion) constraint/i,
      /duplicate key value/i,
      /invalid reference/i
    ],
    timeout: [
      /statement timeout/i,
      /query cancelled on user's request/i,
      /canceling statement due to statement timeout/i
    ]
  },
  mysql: {
    deadlock: [
      /deadlock found/i,
      /lock wait timeout exceeded/i,
      /try restarting transaction/i
    ],
    connection: [
      /can't connect to mysql server/i,
      /too many connections/i,
      /lost connection/i
    ],
    constraint: [
      /duplicate entry/i,
      /foreign key constraint fails/i,
      /cannot be null/i
    ],
    timeout: [
      /lock wait timeout exceeded/i,
      /query execution was interrupted/i
    ]
  },
  general: {
    connection: [
      /connection refused/i,
      /cannot connect/i,
      /failed to connect/i,
      /connection timed out/i,
      /ECONNREFUSED/i
    ],
    timeout: [
      /timeout/i,
      /execution time exceeded/i,
      /timed out/i
    ]
  }
};

/**
 * Network error patterns to match
 */
const NETWORK_ERROR_PATTERNS = [
  /network error/i,
  /ECONNRESET/i,
  /ECONNABORTED/i,
  /ENOTFOUND/i,
  /getaddrinfo/i,
  /socket hang up/i,
  /socket timeout/i,
  /network timeout/i,
  /request failed/i,
  /failed to fetch/i,
  /request timed out/i,
  /cors error/i,
  /cross-origin/i,
  /ERR_NETWORK/i,
  /ERR_CONNECTION/i
];

/**
 * Authentication error patterns to match
 */
const AUTH_ERROR_PATTERNS = [
  /unauthorized/i, 
  /authentication failed/i,
  /not authenticated/i,
  /invalid (credentials|token|api key|password)/i,
  /access denied/i,
  /permission denied/i,
  /forbidden/i,
  /not authorized/i,
  /invalid session/i,
  /token expired/i,
  /login (failed|required)/i,
  /auth.*fail/i
];

/**
 * Identify database error subtype from error message
 * 
 * @param message - Error message text
 * @returns Database error subtype
 */
export function identifyDatabaseErrorSubtype(message: string): DatabaseErrorSubtype {
  // Check for PostgreSQL deadlock patterns
  for (const pattern of DATABASE_ERROR_PATTERNS.postgres.deadlock) {
    if (pattern.test(message)) {
      return DatabaseErrorSubtype.DEADLOCK;
    }
  }
  
  // Check for MySQL deadlock patterns
  for (const pattern of DATABASE_ERROR_PATTERNS.mysql.deadlock) {
    if (pattern.test(message)) {
      return DatabaseErrorSubtype.DEADLOCK;
    }
  }

  // Check for connection issues
  for (const pattern of [
    ...DATABASE_ERROR_PATTERNS.postgres.connection,
    ...DATABASE_ERROR_PATTERNS.mysql.connection,
    ...DATABASE_ERROR_PATTERNS.general.connection
  ]) {
    if (pattern.test(message)) {
      return DatabaseErrorSubtype.CONNECTION;
    }
  }

  // Check for constraint violations
  for (const pattern of [
    ...DATABASE_ERROR_PATTERNS.postgres.constraint,
    ...DATABASE_ERROR_PATTERNS.mysql.constraint
  ]) {
    if (pattern.test(message)) {
      return DatabaseErrorSubtype.CONSTRAINT;
    }
  }

  // Check for timeout issues
  for (const pattern of [
    ...DATABASE_ERROR_PATTERNS.postgres.timeout,
    ...DATABASE_ERROR_PATTERNS.mysql.timeout,
    ...DATABASE_ERROR_PATTERNS.general.timeout
  ]) {
    if (pattern.test(message)) {
      return DatabaseErrorSubtype.TIMEOUT;
    }
  }

  // Other specific checks could be added here...
  
  // Look for general SQL patterns
  if (
    /sql/i.test(message) || 
    /query/i.test(message) || 
    /select.*from/i.test(message) ||
    /insert into/i.test(message) ||
    /update.*set/i.test(message) ||
    /delete from/i.test(message)
  ) {
    return DatabaseErrorSubtype.QUERY;
  }

  return DatabaseErrorSubtype.UNKNOWN;
}

/**
 * Extract keywords from error message and stack trace
 * 
 * @param message - Error message
 * @param stackTrace - Stack trace if available
 * @returns Array of relevant keywords
 */
export function extractErrorKeywords(message: string, stackTrace?: string): string[] {
  const keywords = new Set<string>();
  
  if (!message) {
    return [];
  }

  // Extract words from the error message
  message.split(/\s+/).forEach(word => {
    // Filter out common words, punctuation, and keep relevant technical terms
    word = word.replace(/[.,;:()[\]{}'"]/g, '').toLowerCase();
    if (
      word.length > 3 && 
      !['the', 'and', 'that', 'this', 'with', 'from', 'have', 'your'].includes(word)
    ) {
      keywords.add(word);
    }
  });

  // Look for technical terms in both message and stack trace
  const technicalTerms = [
    'null', 'undefined', 'NaN', 'object', 'array', 'function', 'promise',
    'async', 'await', 'timeout', 'exception', 'error', 'warning', 'fatal',
    'memory', 'reference', 'syntax', 'type', 'range', 'value', 'argument',
    'parameter', 'invalid', 'missing', 'required', 'unexpected', 'expected',
    'database', 'query', 'sql', 'connection', 'network', 'http', 'api',
    'request', 'response', 'status', 'code', 'header', 'body', 'json',
    'parse', 'format', 'validation', 'schema', 'model', 'record',
    'transaction', 'commit', 'rollback', 'lock', 'deadlock', 'constraint',
    'foreign', 'primary', 'key', 'index', 'unique', 'duplicate', 'insert',
    'update', 'delete', 'select', 'join', 'where', 'group', 'order', 'limit',
    'permission', 'access', 'denied', 'forbidden', 'unauthorized', 'auth',
    'login', 'session', 'token', 'jwt', 'oauth', 'credentials', 'password'
  ];
  
  const combinedText = message + (stackTrace || '');
  
  for (const term of technicalTerms) {
    if (combinedText.toLowerCase().includes(term)) {
      keywords.add(term);
    }
  }

  return Array.from(keywords);
}

/**
 * Analyze error message to determine its category
 * 
 * @param errorMessage - Error message text
 * @param errorType - Error type/class if available
 * @returns ErrorCategory enum value
 */
export function categorizeError(errorMessage: string, errorType?: string): ErrorCategory {
  if (!errorMessage) {
    return ErrorCategory.UNKNOWN;
  }
  
  const message = errorMessage.toLowerCase();
  const type = errorType?.toLowerCase() || '';
  
  // Database errors
  if (
    type.includes('database') ||
    type.includes('sql') ||
    type.includes('query') ||
    type.includes('db') ||
    type.includes('postgres') ||
    type.includes('mysql') ||
    type.includes('sqlite') ||
    type.includes('mongo') ||
    message.includes('database') ||
    message.includes('sql') ||
    message.includes('query failed') ||
    message.includes('db error') ||
    message.includes('connection') ||
    message.includes('constraint') ||
    message.includes('duplicate key') ||
    message.includes('deadlock') ||
    message.includes('lock') ||
    message.includes('transaction')
  ) {
    return ErrorCategory.DATABASE;
  }
  
  // Network errors
  for (const pattern of NETWORK_ERROR_PATTERNS) {
    if (pattern.test(message) || pattern.test(type)) {
      return ErrorCategory.NETWORK;
    }
  }
  
  // Authentication errors
  for (const pattern of AUTH_ERROR_PATTERNS) {
    if (pattern.test(message) || pattern.test(type)) {
      return ErrorCategory.AUTHENTICATION;
    }
  }
  
  // Authorization errors
  if (
    type.includes('permission') ||
    type.includes('access') ||
    type.includes('forbidden') ||
    message.includes('permission denied') ||
    message.includes('not allowed') ||
    message.includes('unauthorized') ||
    message.includes('access denied') ||
    message.includes('forbidden')
  ) {
    return ErrorCategory.AUTHORIZATION;
  }
  
  // Validation errors
  if (
    type.includes('validation') ||
    type.includes('invalid') ||
    type.includes('schema') ||
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('schema') ||
    message.includes('not valid') ||
    message.includes('required field')
  ) {
    return ErrorCategory.VALIDATION;
  }
  
  // Syntax errors
  if (
    type.includes('syntax') ||
    type.includes('parse') ||
    message.includes('syntax') ||
    message.includes('unexpected token') ||
    message.includes('parsing') ||
    message.includes('unterminated')
  ) {
    return ErrorCategory.SYNTAX;
  }
  
  // Timeout errors
  if (
    type.includes('timeout') ||
    message.includes('timeout') ||
    message.includes('timed out')
  ) {
    return ErrorCategory.TIMEOUT;
  }
  
  // Memory errors
  if (
    type.includes('memory') ||
    message.includes('memory') ||
    message.includes('allocation') ||
    message.includes('heap') ||
    message.includes('stack overflow')
  ) {
    return ErrorCategory.MEMORY;
  }
  
  // Configuration errors
  if (
    type.includes('config') ||
    message.includes('configuration') ||
    message.includes('config') ||
    message.includes('settings') ||
    message.includes('environment')
  ) {
    return ErrorCategory.CONFIGURATION;
  }
  
  // Dependency errors
  if (
    type.includes('dependency') ||
    type.includes('module') ||
    message.includes('dependency') ||
    message.includes('module not found') ||
    message.includes('cannot find module') ||
    message.includes('import') ||
    message.includes('require')
  ) {
    return ErrorCategory.DEPENDENCY;
  }
  
  // Default to runtime errors
  return ErrorCategory.RUNTIME;
}

/**
 * Primary function to analyze an error and provide context for LLM prompting
 * 
 * @param eventDetails - Sentry event details object
 * @returns Error context object for prompting
 */
export function analyzeError(eventDetails: EventDetails): ErrorContext {
  if (!eventDetails) {
    return {
      category: ErrorCategory.UNKNOWN,
      hasSufficientDetails: false
    };
  }
  
  // Extract error information
  const errorType = extractErrorType(eventDetails);
  const errorMessage = extractErrorMessage(eventDetails);
  
  // Get stack trace from event data if available
  const stackTrace = extractStackTrace(eventDetails);
  
  // Determine error category
  const category = categorizeError(errorMessage, errorType);
  
  // Initialize context object
  const context: ErrorContext = {
    category,
    keywords: extractErrorKeywords(errorMessage, stackTrace),
    hasSufficientDetails: Boolean(errorMessage && errorMessage.length > 10)
  };
  
  // Add severity based on event level or error category
  if (eventDetails.level) {
    const level = eventDetails.level.toLowerCase();
    if (level === 'fatal' || level === 'critical') {
      context.severity = 'critical';
    } else if (level === 'error') {
      context.severity = 'high';
    } else if (level === 'warning') {
      context.severity = 'medium';
    } else {
      context.severity = 'low';
    }
  } else {
    // Default severity based on category
    if ([ErrorCategory.DATABASE, ErrorCategory.MEMORY].includes(category)) {
      context.severity = 'high';
    } else if ([ErrorCategory.NETWORK, ErrorCategory.TIMEOUT].includes(category)) {
      context.severity = 'medium';
    } else {
      context.severity = 'low';
    }
  }
  
  // Handle specific error categories
  if (category === ErrorCategory.DATABASE) {
    const subtype = identifyDatabaseErrorSubtype(errorMessage);
    context.subtype = subtype;
    
    // Add technical context based on subtype
    context.technicalContext = getDatabaseContext(subtype, errorMessage);
    
    // Add potential causes based on subtype
    context.potentialCauses = getDatabasePotentialCauses(subtype);
  } else if (category === ErrorCategory.NETWORK) {
    // Add network error context
    context.technicalContext = [
      'Network errors typically occur when there are communication issues between systems',
      'Common causes include connectivity issues, firewall blocks, or service unavailability'
    ];
    
    context.potentialCauses = [
      'Service might be unreachable or down',
      'Network connectivity issues',
      'DNS resolution problems',
      'Firewall or security rules blocking connections',
      'Timeout due to slow response or overloaded service'
    ];
  } else if (category === ErrorCategory.AUTHENTICATION) {
    context.technicalContext = [
      'Authentication errors occur when credentials are invalid or expired',
      'This could involve issues with tokens, API keys, or user credentials'
    ];
    
    context.potentialCauses = [
      'Expired authentication token',
      'Invalid credentials',
      'Missing authentication header',
      'User account issues (locked, disabled)',
      'Misconfigured authentication service'
    ];
  }
  
  return context;
}

/**
 * Extract the error type from event details
 */
function extractErrorType(eventDetails: EventDetails): string {
  if (!eventDetails) return 'Unknown';
  
  // Check in exception values
  if (eventDetails?.exception?.values?.length && eventDetails.exception.values.length > 0) {
    return eventDetails.exception.values[0]?.type || 'Unknown';
  }
  
  // Check in entries
  if (eventDetails?.entries?.length && eventDetails.entries.length > 0) {
    for (const entry of eventDetails.entries) {
      if (entry.type === 'exception' && entry?.data?.values?.length && entry.data.values.length > 0) {
        return entry.data.values[0]?.type || 'Unknown';
      }
    }
  }
  
  // Get from title as fallback
  const title = eventDetails.title || '';
  if (title.includes(': ')) {
    return title?.split(': ')[0] || '';
  }
  
  return eventDetails.level || 'Error';
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

/**
 * Get technical context for database errors based on subtype
 */
function getDatabaseContext(subtype: DatabaseErrorSubtype, errorMessage: string): string[] {
  switch (subtype) {
    case DatabaseErrorSubtype.DEADLOCK:
      if (errorMessage.toLowerCase().includes('postgres')) {
        return [
          'PostgreSQL has detected a deadlock situation',
          'Deadlocks occur when multiple transactions are waiting for locks held by each other',
          'PostgreSQL automatically detects and breaks deadlocks by aborting one of the transactions',
          'Applications should be designed to retry the failed transaction'
        ];
      } else if (errorMessage.toLowerCase().includes('mysql')) {
        return [
          'MySQL has detected a deadlock situation',
          'InnoDB automatically detects deadlocks and rolls back one of the transactions',
          'The transaction with the fewest rows modified is typically chosen as the victim',
          'Applications should catch the error and retry the transaction'
        ];
      } else {
        return [
          'A deadlock situation has been detected in the database',
          'Deadlocks occur when multiple transactions are waiting for locks held by each other',
          'The database has chosen one transaction as the "victim" and rolled it back',
          'The application should retry the failed transaction'
        ];
      }
    
    case DatabaseErrorSubtype.CONNECTION:
      return [
        'The application failed to establish a connection to the database',
        'Connection issues can be caused by network problems, database downtime, or authentication failures',
        'Always use connection pooling to handle connection issues gracefully',
        'Implement retry logic with exponential backoff for transient connection issues'
      ];
    
    case DatabaseErrorSubtype.CONSTRAINT:
      return [
        'A database constraint violation has occurred',
        'Constraints are rules that the database enforces to maintain data integrity',
        'Common constraints include: NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY, and CHECK constraints',
        'Applications should validate data before sending it to the database to prevent constraint violations'
      ];
    
    case DatabaseErrorSubtype.QUERY:
      return [
        'There was an error in the SQL query execution',
        'Query errors can be caused by syntax errors, missing tables, or permission issues',
        'Always validate and sanitize user input before using it in SQL queries',
        'Use parameterized queries to prevent SQL injection attacks'
      ];
    
    case DatabaseErrorSubtype.TIMEOUT:
      return [
        'The database query execution has timed out',
        'Long-running queries can block other operations and reduce database performance',
        'Consider optimizing the query with proper indexes and limiting result sets',
        'For analytical queries, consider using a separate reporting database or OLAP system'
      ];
    
    default:
      return [
        'A database error has occurred',
        'Database errors can have various causes including connection issues, query problems, or constraint violations',
        'Proper error handling and retries for transient errors are important for robust applications',
        'Consider using database monitoring tools to identify recurring issues'
      ];
  }
}

/**
 * Get potential causes for database errors based on subtype
 */
function getDatabasePotentialCauses(subtype: DatabaseErrorSubtype): string[] {
  switch (subtype) {
    case DatabaseErrorSubtype.DEADLOCK:
      return [
        'Multiple transactions accessing the same resources in different orders',
        'Long-running transactions increasing the chance of contention',
        'Lack of proper indexing causing table-level locks instead of row-level locks',
        'Application design issues where transactions acquire too many locks',
        'High concurrency without proper isolation level configuration'
      ];
    
    case DatabaseErrorSubtype.CONNECTION:
      return [
        'Database server is down or unreachable',
        'Network connectivity issues between application and database',
        'Firewall or security group rules blocking connections',
        'Connection pool exhaustion due to leaks or high traffic',
        'Authentication failure due to incorrect credentials or expired passwords'
      ];
    
    case DatabaseErrorSubtype.CONSTRAINT:
      return [
        'Attempting to insert a duplicate value in a unique column',
        'Inserting NULL into a NOT NULL column',
        'Violating a foreign key constraint by referencing a non-existent record',
        'Violating a check constraint with an invalid value',
        'Race condition where multiple transactions attempt to insert the same data'
      ];
    
    case DatabaseErrorSubtype.QUERY:
      return [
        'SQL syntax error in the query',
        'Referencing a table or column that doesn\'t exist',
        'Permission issues (user lacks required privileges)',
        'Data type mismatch in comparison or calculation',
        'Subquery returning multiple rows when only one is expected'
      ];
    
    case DatabaseErrorSubtype.TIMEOUT:
      return [
        'Query is too complex or inefficient',
        'Missing indexes causing full table scans',
        'Database server under high load',
        'Lock contention causing queries to wait too long',
        'Transaction running too long and hitting a timeout limit'
      ];
    
    default:
      return [
        'General database configuration issues',
        'Resource limitations (memory, connections, disk space)',
        'Schema migration or version mismatch problems',
        'Replication or clustering issues',
        'Database server internal errors'
      ];
  }
}

export default {
  analyzeError,
  categorizeError,
  extractErrorKeywords,
  identifyDatabaseErrorSubtype,
  ErrorCategory,
  DatabaseErrorSubtype
};