// File: frontend/src/utils/enhancedErrorAnalytics.ts

/**
 * Enhanced Error Analytics - Advanced analysis and categorization system for errors
 * This module extends basic error analysis with more sophisticated pattern recognition,
 * contextual awareness, and specialized categorization for improved AI prompting.
 */

import { EventDetails } from '../types/eventDetails';
import { ErrorCategory, DatabaseErrorSubtype, ErrorContext } from './errorAnalytics';
// Import the error analytics functions but avoid circular dependency issues
import errorAnalyticsModule from './errorAnalytics';

/**
 * Extended error categories for more specific classification
 */
export enum ExtendedErrorCategory {
  // Database Errors
  DATABASE_CONNECTION = 'database_connection',
  DATABASE_QUERY = 'database_query',
  DATABASE_CONSTRAINT = 'database_constraint',
  DATABASE_DEADLOCK = 'database_deadlock',
  DATABASE_TIMEOUT = 'database_timeout',
  DATABASE_TRANSACTION = 'database_transaction',
  DATABASE_MIGRATION = 'database_migration',
  DATABASE_POOL = 'database_pool',
  DATABASE_OTHER = 'database_other',
  
  // Network Errors
  NETWORK_CONNECTION = 'network_connection',
  NETWORK_DNS = 'network_dns',
  NETWORK_TIMEOUT = 'network_timeout',
  NETWORK_SSL = 'network_ssl',
  NETWORK_HTTP = 'network_http',
  NETWORK_CORS = 'network_cors',
  NETWORK_OTHER = 'network_other',
  
  // Auth Errors
  AUTH_INVALID_CREDENTIALS = 'auth_invalid_credentials',
  AUTH_EXPIRED_TOKEN = 'auth_expired_token',
  AUTH_MISSING_TOKEN = 'auth_missing_token',
  AUTH_PERMISSION = 'auth_permission',
  AUTH_SESSION = 'auth_session',
  AUTH_OTHER = 'auth_other',
  
  // API Errors
  API_REQUEST = 'api_request',
  API_RESPONSE = 'api_response',
  API_SERIALIZATION = 'api_serialization',
  API_RATE_LIMIT = 'api_rate_limit',
  API_OTHER = 'api_other',
  
  // Runtime Errors
  RUNTIME_TYPE = 'runtime_type',
  RUNTIME_REFERENCE = 'runtime_reference',
  RUNTIME_RANGE = 'runtime_range',
  RUNTIME_EXCEPTION = 'runtime_exception',
  RUNTIME_PROMISE = 'runtime_promise',
  RUNTIME_OTHER = 'runtime_other',
  
  // Framework Specific
  REACT_RENDERING = 'react_rendering',
  REACT_HOOKS = 'react_hooks',
  REACT_STATE = 'react_state',
  REACT_EFFECT = 'react_effect',
  REACT_OTHER = 'react_other',
  
  // Code Errors
  CODE_SYNTAX = 'code_syntax',
  CODE_REFERENCE = 'code_reference',
  CODE_TYPO = 'code_typo',
  CODE_LOGIC = 'code_logic',
  CODE_OTHER = 'code_other',
  
  // Data Errors
  DATA_FORMAT = 'data_format',
  DATA_VALIDATION = 'data_validation',
  DATA_MISSING = 'data_missing',
  DATA_INCONSISTENT = 'data_inconsistent',
  DATA_OTHER = 'data_other',
  
  // File System Errors
  FS_NOT_FOUND = 'fs_not_found',
  FS_PERMISSION = 'fs_permission',
  FS_DISK = 'fs_disk',
  FS_OTHER = 'fs_other',
  
  // Resource Errors
  RESOURCE_MEMORY = 'resource_memory',
  RESOURCE_CPU = 'resource_cpu',
  RESOURCE_TIMEOUT = 'resource_timeout',
  RESOURCE_QUOTA = 'resource_quota',
  RESOURCE_OTHER = 'resource_other',
  
  // Config Errors
  CONFIG_MISSING = 'config_missing',
  CONFIG_INVALID = 'config_invalid',
  CONFIG_ENV = 'config_env',
  CONFIG_OTHER = 'config_other',
  
  // Dependency Errors
  DEPENDENCY_MISSING = 'dependency_missing',
  DEPENDENCY_VERSION = 'dependency_version',
  DEPENDENCY_INCOMPATIBLE = 'dependency_incompatible',
  DEPENDENCY_OTHER = 'dependency_other',
  
  // Default
  UNKNOWN = 'unknown'
}

/**
 * Application context areas to provide domain-specific context
 */
export enum ApplicationContext {
  API_CLIENT = 'api_client',
  EVENT_TABLE = 'event_table',
  DEADLOCK_ANALYZER = 'deadlock_analyzer',
  ERROR_HANDLING = 'error_handling',
  DATA_VISUALIZATION = 'data_visualization',
  SETTINGS = 'settings',
  AUTH = 'auth',
  NAVIGATION = 'navigation',
  SEARCH = 'search',
  FILTERING = 'filtering',
  UNKNOWN = 'unknown'
}

/**
 * Advanced runtime context for error clarification
 */
export enum RuntimeContext {
  INITIAL_LOAD = 'initial_load',
  DATA_FETCHING = 'data_fetching',
  USER_INTERACTION = 'user_interaction',
  BACKGROUND_PROCESS = 'background_process',
  COMPONENT_MOUNT = 'component_mount',
  COMPONENT_UPDATE = 'component_update',
  COMPONENT_UNMOUNT = 'component_unmount',
  EVENT_HANDLER = 'event_handler',
  EFFECT_CALLBACK = 'effect_callback',
  SCHEDULED_TASK = 'scheduled_task',
  UNKNOWN = 'unknown'
}

/**
 * Extended error context to provide more information for LLM prompts
 */
export interface EnhancedErrorContext extends ErrorContext {
  /** Extended category for more specific classification */
  extendedCategory?: ExtendedErrorCategory;
  /** Application context where the error occurred */
  applicationContext?: ApplicationContext;
  /** Runtime context when the error occurred */
  runtimeContext?: RuntimeContext;
  /** Code references detected in the error */
  codeReferences?: string[];
  /** Stack trace analysis */
  stackAnalysis?: {
    /** Most likely source of the error */
    errorSource?: string;
    /** Library or framework involved */
    library?: string;
    /** Most important stack frames for understanding the error */
    keyFrames?: string[];
  };
  /** Related errors that might be connected */
  relatedErrorTypes?: string[];
  /** Inferred error root cause */
  inferredRootCause?: string;
  /** Is this a known issue with documented solutions */
  isKnownIssue?: boolean;
  /** Diagnostic questions to help understand the error */
  diagnosticQuestions?: string[];
  /** Prediction of the impact level of this error */
  predictedImpact?: 'critical' | 'major' | 'moderate' | 'minor';
  /** Confidence in the analysis (0-1) */
  confidenceScore?: number;
}

/**
 * Database error pattern mappings with more specific patterns
 */
const ENHANCED_DATABASE_PATTERNS = {
  postgres: {
    // Existing patterns...
    deadlock: [
      /deadlock detected/i,
      /deadlock found/i,
      /could not serialize access/i,
      /concurrent update/i,
      /could not obtain lock on row/i,
    ],
    connection: [
      /connection to .* refused/i,
      /could not connect to server/i,
      /connection timed out/i,
      /too many connections/i,
      /connection terminated/i,
      /connection reset by peer/i,
      /connection closed/i,
    ],
    constraint: [
      /violates (not-null|check|unique|foreign key|exclusion) constraint/i,
      /duplicate key value/i,
      /invalid reference/i,
      /null value in column .* violates not-null constraint/i,
      /violates unique constraint/i,
      /violates foreign key constraint/i,
      /violates check constraint/i,
    ],
    timeout: [
      /statement timeout/i,
      /query cancelled on user's request/i,
      /canceling statement due to statement timeout/i,
      /canceling statement due to conflict with recovery/i,
      /canceling statement due to lock timeout/i,
    ],
    // New pattern categories
    transaction: [
      /transaction is aborted/i,
      /transaction has been aborted/i,
      /current transaction is aborted/i,
      /could not execute transaction/i,
      /tried to execute command on inactive transaction/i,
    ],
    migration: [
      /relation .* already exists/i,
      /relation .* does not exist/i,
      /column .* of relation .* already exists/i,
      /column .* of relation .* does not exist/i,
      /index .* already exists/i,
      /role .* does not exist/i,
    ],
    pool: [
      /connection pool exhausted/i,
      /timeout waiting for connection from pool/i,
      /connection pool overflow/i,
      /connection pool inactive/i,
    ],
    query: [
      /syntax error at or near/i,
      /column .* does not exist/i,
      /operator does not exist/i,
      /function .* does not exist/i,
      /permission denied for/i,
      /invalid input syntax for/i,
      /division by zero/i,
      /out of range/i,
    ],
  },
  mysql: {
    // More specific MySQL patterns
    deadlock: [
      /deadlock found/i,
      /lock wait timeout exceeded/i,
      /try restarting transaction/i,
      /innodb: transaction deadlock/i,
    ],
    connection: [
      /can't connect to mysql server/i,
      /too many connections/i,
      /lost connection/i,
      /access denied for user/i,
      /unknown database/i,
      /unknown host/i,
    ],
    constraint: [
      /duplicate entry/i,
      /foreign key constraint fails/i,
      /cannot be null/i,
      /check constraint/i,
      /data too long for column/i,
    ],
    timeout: [
      /lock wait timeout exceeded/i,
      /query execution was interrupted/i,
      /statement timeout/i,
      /connection timeout/i,
    ],
    transaction: [
      /transaction rollback/i,
      /transaction aborted/i,
      /cannot start new transaction/i,
      /transaction branch failed/i,
    ],
    pool: [
      /pool timeout/i,
      /pool overflowed/i,
      /failed to get connection from pool/i,
    ],
  },
  general: {
    // More general database patterns
    connection: [
      /connection refused/i,
      /cannot connect/i,
      /failed to connect/i,
      /connection timed out/i,
      /ECONNREFUSED/i,
      /connection error/i,
      /authentication failed/i,
      /database .* not found/i,
    ],
    timeout: [
      /timeout/i,
      /execution time exceeded/i,
      /timed out/i,
      /response time exceeded/i,
      /waited too long/i,
    ],
    query: [
      /sql error/i,
      /query error/i,
      /database error/i,
      /syntax error/i,
      /invalid query/i,
      /query failed/i,
      /bad query/i,
      /error executing query/i,
    ],
  },
};

/**
 * Enhanced network error patterns
 */
const ENHANCED_NETWORK_PATTERNS = {
  connection: [
    /ECONNRESET/i,
    /ECONNABORTED/i,
    /ENOTFOUND/i,
    /ECONNREFUSED/i,
    /connection refused/i,
    /unable to connect/i,
    /failed to connect/i,
    /cannot connect/i,
    /socket hang up/i,
    /connection terminated/i,
    /connection reset/i,
    /could not reach server/i,
  ],
  dns: [
    /getaddrinfo/i,
    /ENOTFOUND/i,
    /ENETUNREACH/i,
    /EHOSTUNREACH/i,
    /no such host/i,
    /could not resolve host/i,
    /dns resolution failed/i,
    /dns lookup failed/i,
  ],
  timeout: [
    /socket timeout/i,
    /network timeout/i,
    /request timed out/i,
    /connection timeout/i,
    /socket timed out/i,
    /timeout exceeded/i,
    /ETIMEDOUT/i,
    /ERR_TIMED_OUT/i,
  ],
  ssl: [
    /ssl error/i,
    /certificate error/i,
    /certificate has expired/i,
    /certificate is not trusted/i,
    /certificate is invalid/i,
    /ssl handshake failed/i,
    /CERT_HAS_EXPIRED/i,
    /ERR_SSL_PROTOCOL/i,
  ],
  http: [
    /invalid http status/i,
    /invalid http response/i,
    /http error/i,
    /unexpected http status/i,
    /bad http response/i,
    /invalid content type/i,
    /http request failed/i,
    /ERR_BAD_RESPONSE/i,
  ],
  cors: [
    /cors error/i,
    /cross-origin/i,
    /has been blocked by CORS policy/i,
    /no 'access-control-allow-origin'/i,
    /method not allowed/i,
    /origin not allowed/i,
    /ERR_FAILED/i,
    /disallowed by access-control-allow-origin/i,
  ],
};

/**
 * Enhanced authentication error patterns
 */
const ENHANCED_AUTH_PATTERNS = {
  invalidCredentials: [
    /invalid (credentials|token|api key|password)/i,
    /incorrect (credentials|password)/i,
    /wrong (credentials|password)/i,
    /auth.*fail/i,
    /authentication failed/i,
    /login (failed|incorrect)/i,
    /invalid username or password/i,
  ],
  expiredToken: [
    /token expired/i,
    /jwt expired/i,
    /session expired/i,
    /credentials expired/i,
    /auth.*expired/i,
    /token is no longer valid/i,
    /token has timed out/i,
  ],
  missingToken: [
    /missing (token|api key|auth)/i,
    /no token/i,
    /token required/i,
    /authentication required/i,
    /unauthorized/i,
    /not authenticated/i,
    /authentication missing/i,
  ],
  permission: [
    /permission denied/i,
    /insufficient privileges/i,
    /access denied/i,
    /forbidden/i,
    /not authorized/i,
    /unauthorized access/i,
    /not enough permissions/i,
  ],
  session: [
    /invalid session/i,
    /session (invalid|expired|revoked)/i,
    /session not found/i,
    /session timeout/i,
    /session does not exist/i,
  ],
};

/**
 * Enhanced API error patterns
 */
const ENHANCED_API_PATTERNS = {
  request: [
    /invalid request/i,
    /bad request/i,
    /malformed request/i,
    /request error/i,
    /error in request/i,
    /invalid parameters/i,
    /missing parameters/i,
    /request validation failed/i,
  ],
  response: [
    /invalid response/i,
    /unexpected response/i,
    /malformed response/i,
    /response error/i,
    /error in response/i,
    /invalid status/i,
    /bad response/i,
    /response validation failed/i,
  ],
  serialization: [
    /json parse error/i,
    /json parsing failed/i,
    /json serialization error/i,
    /parsing failed/i,
    /error parsing json/i,
    /serialization error/i,
    /deserialization error/i,
    /unexpected token/i,
  ],
  rateLimit: [
    /rate limit exceeded/i,
    /too many requests/i,
    /api rate limit/i,
    /request limit reached/i,
    /quota exceeded/i,
    /throttled/i,
    /429 too many requests/i,
  ],
};

/**
 * Runtime error patterns for JavaScript/TypeScript
 */
const ENHANCED_RUNTIME_PATTERNS = {
  type: [
    /type error/i,
    /cannot read properties of (undefined|null)/i,
    /is not a function/i,
    /is not iterable/i,
    /is not a constructor/i,
    /is not defined/i,
    /undefined is not an object/i,
    /null is not an object/i,
  ],
  reference: [
    /reference error/i,
    /is not defined/i,
    /cannot access.*before initialization/i,
    /variable is not defined/i,
    /has no properties/i,
  ],
  range: [
    /range error/i,
    /invalid array length/i,
    /out of range/i,
    /call stack size exceeded/i,
    /maximum call stack size exceeded/i,
  ],
  promise: [
    /unhandled promise rejection/i,
    /uncaught in promise/i,
    /promise rejection/i,
    /promise.*rejected/i,
    /no catch handler/i,
  ],
  exception: [
    /uncaught exception/i,
    /unhandled exception/i,
    /exception occurred/i,
    /exception thrown/i,
    /error thrown/i,
  ],
};

/**
 * React-specific error patterns
 */
const ENHANCED_REACT_PATTERNS = {
  rendering: [
    /invalid react element/i,
    /rendering components/i,
    /cannot update a component/i,
    /cannot read property.*of undefined/i,
    /maximum update depth exceeded/i,
    /nothing was returned from render/i,
    /cannot update during an existing state transition/i,
  ],
  hooks: [
    /invalid hook call/i,
    /do not call hooks inside loops/i,
    /cannot call hooks inside callbacks/i,
    /rendered more hooks than during the previous render/i,
    /hook is called conditionally/i,
    /hooks can only be called inside the body of a function component/i,
  ],
  state: [
    /cannot update a component while rendering a different component/i,
    /state updates should be wrapped in act/i,
    /cannot update during an existing state transition/i,
    /too many re-renders/i,
    /cannot read property.*of undefined/i,
  ],
  effect: [
    /cannot perform a react state update on an unmounted component/i,
    /can't perform a react state update on an unmounted component/i,
    /memory leak in component/i,
    /cleanup function returned something/i,
    /effect is not a function/i,
  ],
};

/**
 * Code error patterns
 */
const ENHANCED_CODE_PATTERNS = {
  syntax: [
    /syntax error/i,
    /unexpected token/i,
    /unexpected identifier/i,
    /unexpected character/i,
    /unterminated string literal/i,
    /missing \)/i,
    /missing \}/i,
    /missing closing tag/i,
  ],
  reference: [
    /reference error/i,
    /undefined reference/i,
    /unresolved reference/i,
    /undeclared variable/i,
    /has not been defined/i,
    /unknown property/i,
  ],
  typo: [
    /did you mean/i,
    /no such property/i,
    /property does not exist/i,
    /unknown method/i,
    /unknown property/i,
    /no method named/i,
  ],
  logic: [
    /infinite loop/i,
    /recursion limit/i,
    /unreachable code/i,
    /assertion failed/i,
    /invalid operation/i,
  ],
};

/**
 * Data validation and format error patterns
 */
const ENHANCED_DATA_PATTERNS = {
  format: [
    /invalid format/i,
    /malformed data/i,
    /bad format/i,
    /invalid structure/i,
    /expected.*got/i,
    /invalid date/i,
    /invalid time/i,
    /invalid json/i,
  ],
  validation: [
    /validation failed/i,
    /validation error/i,
    /constraint violation/i,
    /invalid input/i,
    /invalid value/i,
    /does not match pattern/i,
    /required field/i,
    /must be/i,
  ],
  missing: [
    /missing field/i,
    /required property/i,
    /missing required/i,
    /cannot be null/i,
    /cannot be empty/i,
    /must be provided/i,
    /expected but got null/i,
  ],
  inconsistent: [
    /data inconsistency/i,
    /inconsistent state/i,
    /conflict in data/i,
    /incompatible data/i,
    /conflicting values/i,
    /violation of invariant/i,
  ],
};

/**
 * File system error patterns
 */
const ENHANCED_FS_PATTERNS = {
  notFound: [
    /no such file/i,
    /file not found/i,
    /ENOENT/i,
    /cannot find/i,
    /does not exist/i,
    /path not found/i,
    /directory not found/i,
  ],
  permission: [
    /permission denied/i,
    /EACCES/i,
    /access denied/i,
    /not permitted/i,
    /insufficient permissions/i,
    /requires elevated privileges/i,
  ],
  disk: [
    /disk full/i,
    /no space left/i,
    /ENOSPC/i,
    /quota exceeded/i,
    /disk quota exceeded/i,
    /storage full/i,
  ],
};

/**
 * Resource error patterns
 */
const ENHANCED_RESOURCE_PATTERNS = {
  memory: [
    /out of memory/i,
    /memory limit exceeded/i,
    /allocation failed/i,
    /not enough memory/i,
    /memory allocation failed/i,
    /heap overflow/i,
    /cannot allocate memory/i,
  ],
  cpu: [
    /cpu limit exceeded/i,
    /cpu usage too high/i,
    /timeout waiting for cpu/i,
    /process timeout/i,
  ],
  timeout: [
    /timed out/i,
    /timeout exceeded/i,
    /operation timed out/i,
    /deadline exceeded/i,
    /operation took too long/i,
    /execution time exceeded/i,
  ],
  quota: [
    /quota exceeded/i,
    /limit exceeded/i,
    /resource limit reached/i,
    /rate limit exceeded/i,
    /too many requests/i,
    /maximum limit reached/i,
  ],
};

/**
 * Configuration error patterns
 */
const ENHANCED_CONFIG_PATTERNS = {
  missing: [
    /missing configuration/i,
    /missing config/i,
    /configuration not found/i,
    /config not found/i,
    /no configuration/i,
    /required configuration/i,
    /missing settings/i,
  ],
  invalid: [
    /invalid configuration/i,
    /invalid config/i,
    /configuration error/i,
    /config error/i,
    /malformed configuration/i,
    /bad configuration/i,
    /incorrect configuration/i,
  ],
  env: [
    /missing environment variable/i,
    /env not found/i,
    /environment not set/i,
    /missing env/i,
    /required environment/i,
    /no environment/i,
    /environment variable.*not set/i,
  ],
};

/**
 * Dependency error patterns
 */
const ENHANCED_DEPENDENCY_PATTERNS = {
  missing: [
    /missing dependency/i,
    /module not found/i,
    /cannot find module/i,
    /failed to resolve dependency/i,
    /package not found/i,
    /dependency not installed/i,
    /cannot locate/i,
  ],
  version: [
    /version mismatch/i,
    /incompatible version/i,
    /requires version/i,
    /version conflict/i,
    /expected version/i,
    /version constraint/i,
    /unsupported version/i,
  ],
  incompatible: [
    /incompatible dependency/i,
    /dependency conflict/i,
    /module not compatible/i,
    /library conflict/i,
    /package incompatible/i,
    /incompatible with/i,
    /not compatible with/i,
  ],
};

/**
 * React error sources to identify in stack traces
 */
const REACT_LIBRARIES = [
  'react-dom',
  'react',
  'react-router',
  'react-query',
  'zustand',
  'mantine',
  'react-redux',
  'redux',
  'react-hooks',
  '@tanstack/react-query',
];

/**
 * Common frontend libraries to identify in stack traces
 */
const COMMON_LIBRARIES = [
  'axios',
  'lodash',
  'moment',
  'dayjs',
  'date-fns',
  'd3',
  'chart.js',
  'rxjs',
  'sentry',
  'tabler',
  'vite',
  'webpack',
];

/**
 * Analyze the stack trace to extract useful information
 * 
 * @param stackTrace - The stack trace string
 * @returns Analysis of the stack trace
 */
export function analyzeStackTrace(stackTrace: string): EnhancedErrorContext['stackAnalysis'] {
  if (!stackTrace) {
    return undefined;
  }
  
  const stackAnalysis: EnhancedErrorContext['stackAnalysis'] = {
    keyFrames: [],
  };
  
  // Split stack trace into lines
  const lines = stackTrace.split('\n').filter(Boolean);
  if (lines.length === 0) {
    return stackAnalysis;
  }
  
  // Extract the most likely source of the error (usually the top of the stack)
  // But avoid internals like 'node_modules' unless they're the only thing available
  let errorSource = '';
  for (const line of lines) {
    // Skip anonymous functions and internal node functions
    if (line.includes('anonymous') || line.includes('internal/')) {
      continue;
    }
    
    // If we find a user code line (not in node_modules), use it as the source
    if (!line.includes('node_modules/')) {
      errorSource = line;
      break;
    }
    
    // Otherwise, keep the first non-anonymous line as a fallback
    if (!errorSource) {
      errorSource = line;
    }
  }
  
  // Extract the function name and file location
  const match = errorSource.match(/at\s+([^\s(]+)?\s*\(?(.*?):(\d+):(\d+)/);
  if (match) {
    const [_, fnName, filePath, line, col] = match;
    stackAnalysis.errorSource = `${fnName || 'anonymous'} at ${filePath}:${line}:${col}`;
  } else {
    stackAnalysis.errorSource = errorSource.trim();
  }
  
  // Detect libraries involved
  const detectedLibraries = new Set<string>();
  
  // Check for React libraries
  for (const lib of REACT_LIBRARIES) {
    if (stackTrace.includes(`node_modules/${lib}/`) || 
        stackTrace.includes(`node_modules\\${lib}\\`)) {
      detectedLibraries.add(lib);
    }
  }
  
  // Check for other common libraries
  for (const lib of COMMON_LIBRARIES) {
    if (stackTrace.includes(`node_modules/${lib}/`) || 
        stackTrace.includes(`node_modules\\${lib}\\`)) {
      detectedLibraries.add(lib);
    }
  }
  
  if (detectedLibraries.size > 0) {
    stackAnalysis.library = Array.from(detectedLibraries).join(', ');
  }
  
  // Extract key frames (the most important frames for understanding the error)
  // Focus on user code and the first few frames
  const keyFrames: string[] = [];
  let userCodeFrames = 0;
  
  // Process the first 10 frames at most
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    
    // Always include the first frame
    if (i === 0) {
      keyFrames.push(line);
      continue;
    }
    
    // Include user code frames (not in node_modules)
    if (!line.includes('node_modules/') && !line.includes('node_modules\\')) {
      keyFrames.push(line);
      userCodeFrames++;
      
      // Limit to 3 user code frames
      if (userCodeFrames >= 3) {
        break;
      }
    }
    
    // Include particularly relevant library frames
    if (line.includes('render') || 
        line.includes('setState') || 
        line.includes('dispatch') || 
        line.includes('effect') || 
        line.includes('hook') || 
        line.includes('query') || 
        line.includes('fetch')) {
      keyFrames.push(line);
    }
  }
  
  if (keyFrames.length > 0) {
    stackAnalysis.keyFrames = keyFrames;
  }
  
  return stackAnalysis;
}

/**
 * Determine the application context in which the error occurred
 * 
 * @param eventDetails - Sentry event details object
 * @returns Application context enum
 */
export function determineApplicationContext(eventDetails: EventDetails): ApplicationContext {
  if (!eventDetails) {
    return ApplicationContext.UNKNOWN;
  }
  
  // Extract relevant information
  const errorMessage = extractErrorMessage(eventDetails);
  const stackTrace = eventDetails.stacktrace || '';
  const title = eventDetails.title || '';
  
  // Check stack trace or title for clues about the context
  const combinedText = `${errorMessage} ${stackTrace} ${title}`.toLowerCase();
  
  if (combinedText.includes('api') || 
      combinedText.includes('fetch') || 
      combinedText.includes('request') || 
      combinedText.includes('axios') || 
      combinedText.includes('http')) {
    return ApplicationContext.API_CLIENT;
  }
  
  if (combinedText.includes('table') || 
      combinedText.includes('row') || 
      combinedText.includes('column') || 
      combinedText.includes('cell') || 
      combinedText.includes('event') && combinedText.includes('list')) {
    return ApplicationContext.EVENT_TABLE;
  }
  
  if (combinedText.includes('deadlock') || 
      combinedText.includes('lock') || 
      combinedText.includes('transaction') || 
      combinedText.includes('postgres')) {
    return ApplicationContext.DEADLOCK_ANALYZER;
  }
  
  if (combinedText.includes('error') && 
      (combinedText.includes('boundary') || 
       combinedText.includes('handling') || 
       combinedText.includes('recovery'))) {
    return ApplicationContext.ERROR_HANDLING;
  }
  
  if (combinedText.includes('chart') || 
      combinedText.includes('graph') || 
      combinedText.includes('d3') || 
      combinedText.includes('visualization') || 
      combinedText.includes('svg')) {
    return ApplicationContext.DATA_VISUALIZATION;
  }
  
  if (combinedText.includes('settings') || 
      combinedText.includes('config') || 
      combinedText.includes('preference') || 
      combinedText.includes('model settings')) {
    return ApplicationContext.SETTINGS;
  }
  
  if (combinedText.includes('auth') || 
      combinedText.includes('login') || 
      combinedText.includes('token') || 
      combinedText.includes('session') || 
      combinedText.includes('credential')) {
    return ApplicationContext.AUTH;
  }
  
  if (combinedText.includes('navigation') || 
      combinedText.includes('route') || 
      combinedText.includes('link') || 
      combinedText.includes('redirect') || 
      combinedText.includes('browser')) {
    return ApplicationContext.NAVIGATION;
  }
  
  if (combinedText.includes('search') || 
      combinedText.includes('query') || 
      combinedText.includes('find') || 
      combinedText.includes('discover')) {
    return ApplicationContext.SEARCH;
  }
  
  if (combinedText.includes('filter') || 
      combinedText.includes('sort') || 
      combinedText.includes('group') || 
      combinedText.includes('criteria')) {
    return ApplicationContext.FILTERING;
  }
  
  return ApplicationContext.UNKNOWN;
}

/**
 * Get the runtime context in which the error occurred
 * 
 * @param eventDetails - Sentry event details object
 * @returns Runtime context enum
 */
export function determineRuntimeContext(eventDetails: EventDetails): RuntimeContext {
  if (!eventDetails) {
    return RuntimeContext.UNKNOWN;
  }
  
  // Extract relevant information
  const stackTrace = eventDetails.stacktrace || '';
  const contextData = eventDetails.contexts || {};
  
  // Check for load-related errors
  if (stackTrace.includes('useEffect') && 
      (stackTrace.includes('componentDidMount') || 
       stackTrace.includes('mount'))) {
    return RuntimeContext.COMPONENT_MOUNT;
  }
  
  if (stackTrace.includes('render') || 
      stackTrace.includes('createElement') || 
      stackTrace.includes('createElementWithValidation')) {
    return RuntimeContext.COMPONENT_UPDATE;
  }
  
  if (stackTrace.includes('componentWillUnmount') || 
      stackTrace.includes('cleanup') || 
      stackTrace.includes('unmount')) {
    return RuntimeContext.COMPONENT_UNMOUNT;
  }
  
  if (stackTrace.includes('fetch') || 
      stackTrace.includes('axios') || 
      stackTrace.includes('api') || 
      stackTrace.includes('request') || 
      stackTrace.includes('response')) {
    return RuntimeContext.DATA_FETCHING;
  }
  
  if (stackTrace.includes('addEventListener') || 
      stackTrace.includes('onClick') || 
      stackTrace.includes('onChange') || 
      stackTrace.includes('onSubmit') || 
      stackTrace.includes('handleClick') || 
      stackTrace.includes('handleChange')) {
    return RuntimeContext.USER_INTERACTION;
  }
  
  if (stackTrace.includes('useEffect') || 
      stackTrace.includes('useLayoutEffect')) {
    return RuntimeContext.EFFECT_CALLBACK;
  }
  
  if (stackTrace.includes('setTimeout') || 
      stackTrace.includes('setInterval') || 
      stackTrace.includes('requestAnimationFrame') || 
      stackTrace.includes('scheduler')) {
    return RuntimeContext.SCHEDULED_TASK;
  }
  
  // Check timing information
  if (contextData.performance?.duration_ms < 1000) {
    // If the error occurred very quickly after page load
    return RuntimeContext.INITIAL_LOAD;
  }
  
  // Default fallback
  return RuntimeContext.BACKGROUND_PROCESS;
}

/**
 * Check if error matches patterns in a pattern object
 */
function matchPatterns(
  message: string, 
  errorType: string, 
  patternGroups: Record<string, RegExp[]>
): string | null {
  const combinedText = `${message} ${errorType}`.toLowerCase();
  
  for (const [category, patterns] of Object.entries(patternGroups)) {
    for (const pattern of patterns) {
      if (pattern.test(combinedText)) {
        return category;
      }
    }
  }
  
  return null;
}

/**
 * Map error message and type to an extended error category
 * 
 * @param errorMessage - Error message text
 * @param errorType - Error type/class if available
 * @param primaryCategory - Base error category from standard categorization
 * @returns ExtendedErrorCategory enum value
 */
export function categorizeExtendedError(
  errorMessage: string, 
  errorType: string, 
  primaryCategory: ErrorCategory
): ExtendedErrorCategory {
  if (!errorMessage && !errorType) {
    return ExtendedErrorCategory.UNKNOWN;
  }
  
  const message = errorMessage?.toLowerCase() || '';
  const type = errorType?.toLowerCase() || '';
  
  // Start with the primary category for context
  switch (primaryCategory) {
    case ErrorCategory.DATABASE: {
      // Check for database subtypes
      const dbSubtype = matchPatterns(message, type, ENHANCED_DATABASE_PATTERNS.postgres) || 
                       matchPatterns(message, type, ENHANCED_DATABASE_PATTERNS.mysql) ||
                       matchPatterns(message, type, ENHANCED_DATABASE_PATTERNS.general);
      
      if (dbSubtype === 'connection') return ExtendedErrorCategory.DATABASE_CONNECTION;
      if (dbSubtype === 'query') return ExtendedErrorCategory.DATABASE_QUERY;
      if (dbSubtype === 'constraint') return ExtendedErrorCategory.DATABASE_CONSTRAINT;
      if (dbSubtype === 'deadlock') return ExtendedErrorCategory.DATABASE_DEADLOCK;
      if (dbSubtype === 'timeout') return ExtendedErrorCategory.DATABASE_TIMEOUT;
      if (dbSubtype === 'transaction') return ExtendedErrorCategory.DATABASE_TRANSACTION;
      if (dbSubtype === 'migration') return ExtendedErrorCategory.DATABASE_MIGRATION;
      if (dbSubtype === 'pool') return ExtendedErrorCategory.DATABASE_POOL;
      
      return ExtendedErrorCategory.DATABASE_OTHER;
    }
    
    case ErrorCategory.NETWORK: {
      // Check for network error subtypes
      const networkSubtype = matchPatterns(message, type, ENHANCED_NETWORK_PATTERNS);
      
      if (networkSubtype === 'connection') return ExtendedErrorCategory.NETWORK_CONNECTION;
      if (networkSubtype === 'dns') return ExtendedErrorCategory.NETWORK_DNS;
      if (networkSubtype === 'timeout') return ExtendedErrorCategory.NETWORK_TIMEOUT;
      if (networkSubtype === 'ssl') return ExtendedErrorCategory.NETWORK_SSL;
      if (networkSubtype === 'http') return ExtendedErrorCategory.NETWORK_HTTP;
      if (networkSubtype === 'cors') return ExtendedErrorCategory.NETWORK_CORS;
      
      return ExtendedErrorCategory.NETWORK_OTHER;
    }
    
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.AUTHORIZATION: {
      // Check for auth error subtypes
      const authSubtype = matchPatterns(message, type, ENHANCED_AUTH_PATTERNS);
      
      if (authSubtype === 'invalidCredentials') return ExtendedErrorCategory.AUTH_INVALID_CREDENTIALS;
      if (authSubtype === 'expiredToken') return ExtendedErrorCategory.AUTH_EXPIRED_TOKEN;
      if (authSubtype === 'missingToken') return ExtendedErrorCategory.AUTH_MISSING_TOKEN;
      if (authSubtype === 'permission') return ExtendedErrorCategory.AUTH_PERMISSION;
      if (authSubtype === 'session') return ExtendedErrorCategory.AUTH_SESSION;
      
      return ExtendedErrorCategory.AUTH_OTHER;
    }
    
    case ErrorCategory.RUNTIME: {
      // Check for JavaScript runtime errors
      const runtimeSubtype = matchPatterns(message, type, ENHANCED_RUNTIME_PATTERNS);
      
      if (runtimeSubtype === 'type') return ExtendedErrorCategory.RUNTIME_TYPE;
      if (runtimeSubtype === 'reference') return ExtendedErrorCategory.RUNTIME_REFERENCE;
      if (runtimeSubtype === 'range') return ExtendedErrorCategory.RUNTIME_RANGE;
      if (runtimeSubtype === 'promise') return ExtendedErrorCategory.RUNTIME_PROMISE;
      if (runtimeSubtype === 'exception') return ExtendedErrorCategory.RUNTIME_EXCEPTION;
      
      // Check for React errors
      const reactSubtype = matchPatterns(message, type, ENHANCED_REACT_PATTERNS);
      
      if (reactSubtype === 'rendering') return ExtendedErrorCategory.REACT_RENDERING;
      if (reactSubtype === 'hooks') return ExtendedErrorCategory.REACT_HOOKS;
      if (reactSubtype === 'state') return ExtendedErrorCategory.REACT_STATE;
      if (reactSubtype === 'effect') return ExtendedErrorCategory.REACT_EFFECT;
      
      return ExtendedErrorCategory.RUNTIME_OTHER;
    }
    
    case ErrorCategory.SYNTAX: {
      // Check for code errors
      const codeSubtype = matchPatterns(message, type, ENHANCED_CODE_PATTERNS);
      
      if (codeSubtype === 'syntax') return ExtendedErrorCategory.CODE_SYNTAX;
      if (codeSubtype === 'reference') return ExtendedErrorCategory.CODE_REFERENCE;
      if (codeSubtype === 'typo') return ExtendedErrorCategory.CODE_TYPO;
      if (codeSubtype === 'logic') return ExtendedErrorCategory.CODE_LOGIC;
      
      return ExtendedErrorCategory.CODE_OTHER;
    }
    
    case ErrorCategory.VALIDATION:
    case ErrorCategory.INPUT: {
      // Check for data validation errors
      const dataSubtype = matchPatterns(message, type, ENHANCED_DATA_PATTERNS);
      
      if (dataSubtype === 'format') return ExtendedErrorCategory.DATA_FORMAT;
      if (dataSubtype === 'validation') return ExtendedErrorCategory.DATA_VALIDATION;
      if (dataSubtype === 'missing') return ExtendedErrorCategory.DATA_MISSING;
      if (dataSubtype === 'inconsistent') return ExtendedErrorCategory.DATA_INCONSISTENT;
      
      return ExtendedErrorCategory.DATA_OTHER;
    }
    
    case ErrorCategory.MEMORY: {
      return ExtendedErrorCategory.RESOURCE_MEMORY;
    }
    
    case ErrorCategory.TIMEOUT: {
      return ExtendedErrorCategory.RESOURCE_TIMEOUT;
    }
    
    case ErrorCategory.DEADLOCK: {
      return ExtendedErrorCategory.DATABASE_DEADLOCK;
    }
    
    case ErrorCategory.CONFIGURATION: {
      // Check for configuration errors
      const configSubtype = matchPatterns(message, type, ENHANCED_CONFIG_PATTERNS);
      
      if (configSubtype === 'missing') return ExtendedErrorCategory.CONFIG_MISSING;
      if (configSubtype === 'invalid') return ExtendedErrorCategory.CONFIG_INVALID;
      if (configSubtype === 'env') return ExtendedErrorCategory.CONFIG_ENV;
      
      return ExtendedErrorCategory.CONFIG_OTHER;
    }
    
    case ErrorCategory.DEPENDENCY: {
      // Check for dependency errors
      const depSubtype = matchPatterns(message, type, ENHANCED_DEPENDENCY_PATTERNS);
      
      if (depSubtype === 'missing') return ExtendedErrorCategory.DEPENDENCY_MISSING;
      if (depSubtype === 'version') return ExtendedErrorCategory.DEPENDENCY_VERSION;
      if (depSubtype === 'incompatible') return ExtendedErrorCategory.DEPENDENCY_INCOMPATIBLE;
      
      return ExtendedErrorCategory.DEPENDENCY_OTHER;
    }
  }
  
  // API error detection (independent of primary category)
  const apiSubtype = matchPatterns(message, type, ENHANCED_API_PATTERNS);
  if (apiSubtype === 'request') return ExtendedErrorCategory.API_REQUEST;
  if (apiSubtype === 'response') return ExtendedErrorCategory.API_RESPONSE;
  if (apiSubtype === 'serialization') return ExtendedErrorCategory.API_SERIALIZATION;
  if (apiSubtype === 'rateLimit') return ExtendedErrorCategory.API_RATE_LIMIT;
  
  // File system error detection
  const fsSubtype = matchPatterns(message, type, ENHANCED_FS_PATTERNS);
  if (fsSubtype === 'notFound') return ExtendedErrorCategory.FS_NOT_FOUND;
  if (fsSubtype === 'permission') return ExtendedErrorCategory.FS_PERMISSION;
  if (fsSubtype === 'disk') return ExtendedErrorCategory.FS_DISK;
  
  // Resource error detection
  const resourceSubtype = matchPatterns(message, type, ENHANCED_RESOURCE_PATTERNS);
  if (resourceSubtype === 'memory') return ExtendedErrorCategory.RESOURCE_MEMORY;
  if (resourceSubtype === 'cpu') return ExtendedErrorCategory.RESOURCE_CPU;
  if (resourceSubtype === 'timeout') return ExtendedErrorCategory.RESOURCE_TIMEOUT;
  if (resourceSubtype === 'quota') return ExtendedErrorCategory.RESOURCE_QUOTA;
  
  return ExtendedErrorCategory.UNKNOWN;
}

/**
 * Extract code references from error message and stack trace
 * These could be file paths, line numbers, function names, etc.
 * 
 * @param errorMessage - Error message text
 * @param stackTrace - Stack trace if available
 * @returns Array of code references
 */
export function extractCodeReferences(errorMessage: string, stackTrace?: string): string[] {
  if (!errorMessage && !stackTrace) {
    return [];
  }
  
  const references = new Set<string>();
  const combinedText = `${errorMessage} ${stackTrace || ''}`;
  
  // Match file paths with line numbers
  const filePathRegex = /(\/[\w\-._/]+\.\w+):(\d+)(?::(\d+))?/g;
  let match;
  while ((match = filePathRegex.exec(combinedText)) !== null) {
    references.add(match[0]);
  }
  
  // Match file paths with Windows-style paths
  const windowsPathRegex = /((?:[A-Z]:\\|\\\\)[\w\-._\\]+\.\w+):(\d+)(?::(\d+))?/gi;
  while ((match = windowsPathRegex.exec(combinedText)) !== null) {
    references.add(match[0]);
  }
  
  // Match function calls like functionName()
  const functionCallRegex = /\b([\w$]+)\(\)/g;
  while ((match = functionCallRegex.exec(combinedText)) !== null) {
    references.add(match[0]);
  }
  
  // Match property access in form obj.property
  const propertyAccessRegex = /\b([\w$]+)\.([\w$]+)\b/g;
  while ((match = propertyAccessRegex.exec(combinedText)) !== null) {
    // Only add if it looks like code, not a general sentence
    if (!/^(the|a|an|this|that|these|those|it|is|are|was|were)$/i.test(match[1])) {
      references.add(match[0]);
    }
  }
  
  // Extract relative paths and webpack bundles
  const webpackPathRegex = /(?:webpack:\/\/|webpack-internal:\/\/|webpack:)\/[\w\-._/@]+/g;
  while ((match = webpackPathRegex.exec(combinedText)) !== null) {
    references.add(match[0]);
  }
  
  return Array.from(references);
}

/**
 * Generate diagnostic questions based on the error context
 * 
 * @param errorContext - Analyzed error context
 * @returns Array of diagnostic questions
 */
export function generateDiagnosticQuestions(errorContext: EnhancedErrorContext): string[] {
  const questions: string[] = [];
  
  // Base questions depending on error category
  switch (errorContext.category) {
    case ErrorCategory.DATABASE:
      questions.push('Was there a recent change to the database schema?');
      questions.push('Are there multiple transactions accessing the same data concurrently?');
      questions.push('Is the database connection pool properly configured?');
      break;
      
    case ErrorCategory.NETWORK:
      questions.push('Is the remote service operational and accessible?');
      questions.push('Are there any network connectivity issues?');
      questions.push('Are all required ports open in firewalls?');
      break;
      
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.AUTHORIZATION:
      questions.push('Has the API token or session expired?');
      questions.push('Are the user permissions set correctly?');
      questions.push('Was there a recent change to authentication settings?');
      break;
      
    case ErrorCategory.VALIDATION:
    case ErrorCategory.INPUT:
      questions.push('Has the input format changed recently?');
      questions.push('Are all required fields being provided?');
      questions.push('Is the data in the expected format?');
      break;
      
    case ErrorCategory.RUNTIME:
      questions.push('Is there a null or undefined value being accessed?');
      questions.push('Is the error happening consistently or intermittently?');
      questions.push('Are all required dependencies properly imported?');
      break;
      
    case ErrorCategory.MEMORY:
      questions.push('Is the application handling large data sets?');
      questions.push('Are there any memory leaks in component lifecycles?');
      questions.push('Is there infinite recursion or an unbounded loop?');
      break;
      
    case ErrorCategory.TIMEOUT:
      questions.push('Is the operation taking longer than expected?');
      questions.push('Is the timeout configuration appropriate?');
      questions.push('Is the service under heavy load?');
      break;
  }
  
  // Add questions based on extended category
  if (errorContext.extendedCategory) {
    switch (errorContext.extendedCategory) {
      case ExtendedErrorCategory.DATABASE_DEADLOCK:
        questions.push('Are transactions acquiring locks in a consistent order?');
        questions.push('Would breaking the operation into smaller transactions help?');
        break;
        
      case ExtendedErrorCategory.REACT_HOOKS:
        questions.push('Are hooks being called conditionally or in loops?');
        questions.push('Are custom hooks following React rules?');
        break;
        
      case ExtendedErrorCategory.NETWORK_CORS:
        questions.push('Is CORS properly configured on the server?');
        questions.push('Are the request headers correctly set?');
        break;
        
      case ExtendedErrorCategory.API_RATE_LIMIT:
        questions.push('Is request batching or throttling implemented?');
        questions.push('Can the operation be optimized to require fewer API calls?');
        break;
    }
  }
  
  // Add more specific questions based on available context
  if (errorContext.codeReferences?.length) {
    questions.push('Has the referenced code been recently modified?');
  }
  
  if (errorContext.stackAnalysis?.library) {
    questions.push(`Is the ${errorContext.stackAnalysis.library} library up to date?`);
    questions.push(`Are there any known issues with the current version of ${errorContext.stackAnalysis.library}?`);
  }
  
  // Return top questions (avoid too many)
  return questions.slice(0, 5);
}

/**
 * Infer root cause based on error analysis
 * 
 * @param errorContext - Analyzed error context
 * @returns String description of inferred root cause
 */
export function inferRootCause(errorContext: EnhancedErrorContext): string {
  if (!errorContext.extendedCategory) {
    return '';
  }
  
  switch (errorContext.extendedCategory) {
    case ExtendedErrorCategory.DATABASE_CONNECTION:
      return 'Database connection failure, possibly due to network issues, incorrect credentials, or database unavailability';
      
    case ExtendedErrorCategory.DATABASE_DEADLOCK:
      return 'Concurrent transactions competing for the same resources in different orders';
      
    case ExtendedErrorCategory.RUNTIME_TYPE:
      return 'Type mismatch or accessing properties on null/undefined values';
      
    case ExtendedErrorCategory.RUNTIME_REFERENCE:
      return 'Referencing a variable or property that does not exist';
      
    case ExtendedErrorCategory.NETWORK_CONNECTION:
      return 'Network connectivity issue preventing connection to remote service';
      
    case ExtendedErrorCategory.AUTH_EXPIRED_TOKEN:
      return 'Authentication token has expired and needs renewal';
      
    case ExtendedErrorCategory.REACT_HOOKS:
      return 'React Hooks rules violation (possibly conditional hook calls or hooks outside component body)';
      
    case ExtendedErrorCategory.REACT_RENDERING:
      return 'React rendering error, possibly due to invalid component state or props';
      
    case ExtendedErrorCategory.API_RESPONSE:
      return 'Unexpected or invalid response from API endpoint';
      
    case ExtendedErrorCategory.DATA_VALIDATION:
      return 'Data failed validation rules or schema requirements';
      
    default:
      // Generic inference based on category
      const category = errorContext.extendedCategory.toString();
      const parts = category.split('_');
      if (parts.length >= 2) {
        return `${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)} issue in ${parts[0]} component`;
      }
      return '';
  }
}

/**
 * Check if this is a known issue with documented solutions
 * 
 * @param errorContext - Analyzed error context
 * @returns Boolean indicating if this is a known issue
 */
export function isKnownIssue(errorContext: EnhancedErrorContext): boolean {
  // This could check against a database of known issues
  // For now, we'll use a simplified approach based on error patterns
  
  if (!errorContext.extendedCategory) {
    return false;
  }
  
  // Some common issues we can confidently recognize
  const knownIssues = [
    ExtendedErrorCategory.REACT_HOOKS,            // React hooks usage errors are well-documented
    ExtendedErrorCategory.DATABASE_DEADLOCK,      // Database deadlocks have standard solutions
    ExtendedErrorCategory.NETWORK_CORS,           // CORS issues have standard solutions
    ExtendedErrorCategory.RUNTIME_TYPE,           // Null/undefined access is a common issue
    ExtendedErrorCategory.AUTH_EXPIRED_TOKEN,     // Token expiration has standard solutions
    ExtendedErrorCategory.DATA_VALIDATION         // Validation errors have clear fixes
  ];
  
  return knownIssues.includes(errorContext.extendedCategory);
}

/**
 * Predict the impact level of the error
 * 
 * @param errorContext - Analyzed error context
 * @returns Impact level string
 */
export function predictImpact(errorContext: EnhancedErrorContext): EnhancedErrorContext['predictedImpact'] {
  // Start with severity if available
  if (errorContext.severity) {
    switch (errorContext.severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'major';
      case 'medium':
        return 'moderate';
      case 'low':
        return 'minor';
    }
  }
  
  // Base impact on error category and other factors
  switch (errorContext.category) {
    case ErrorCategory.DATABASE:
      if (errorContext.extendedCategory === ExtendedErrorCategory.DATABASE_DEADLOCK ||
          errorContext.extendedCategory === ExtendedErrorCategory.DATABASE_CONNECTION) {
        return 'major';
      }
      return 'moderate';
      
    case ErrorCategory.NETWORK:
      return 'major';
      
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.AUTHORIZATION:
      return 'major';
      
    case ErrorCategory.MEMORY:
      return 'critical';
      
    case ErrorCategory.TIMEOUT:
      return 'moderate';
      
    case ErrorCategory.VALIDATION:
    case ErrorCategory.INPUT:
      return 'minor';
      
    case ErrorCategory.SYNTAX:
      return 'major';
      
    case ErrorCategory.RUNTIME:
      if (errorContext.extendedCategory === ExtendedErrorCategory.RUNTIME_TYPE ||
          errorContext.extendedCategory === ExtendedErrorCategory.RUNTIME_REFERENCE) {
        return 'major';
      }
      return 'moderate';
      
    case ErrorCategory.CONFIGURATION:
      return 'major';
      
    case ErrorCategory.DEPENDENCY:
      return 'major';
      
    default:
      return 'moderate';
  }
}

/**
 * Find related error types based on the current error
 * 
 * @param errorContext - Analyzed error context
 * @returns Array of related error types
 */
export function findRelatedErrorTypes(errorContext: EnhancedErrorContext): string[] {
  const relatedErrors: string[] = [];
  
  switch (errorContext.extendedCategory) {
    case ExtendedErrorCategory.DATABASE_CONNECTION:
      relatedErrors.push('ConnectionRefused', 'ConnectionTimeout', 'PoolExhausted');
      break;
      
    case ExtendedErrorCategory.DATABASE_DEADLOCK:
      relatedErrors.push('LockTimeout', 'SerializationFailure', 'TransactionRollback');
      break;
      
    case ExtendedErrorCategory.RUNTIME_TYPE:
      relatedErrors.push('TypeError', 'CannotReadPropertyOfUndefined', 'NullPointerException');
      break;
      
    case ExtendedErrorCategory.RUNTIME_REFERENCE:
      relatedErrors.push('ReferenceError', 'UndefinedVariable', 'NameError');
      break;
      
    case ExtendedErrorCategory.NETWORK_CONNECTION:
      relatedErrors.push('ConnectionRefused', 'NetworkError', 'SocketTimeout');
      break;
      
    case ExtendedErrorCategory.AUTH_EXPIRED_TOKEN:
      relatedErrors.push('TokenExpired', 'UnauthorizedAccess', 'InvalidToken');
      break;
      
    case ExtendedErrorCategory.REACT_HOOKS:
      relatedErrors.push('InvalidHookCall', 'HooksRulesViolation', 'StateUpdateOnUnmountedComponent');
      break;
      
    default:
      // Generic related errors based on the base category
      switch (errorContext.category) {
        case ErrorCategory.DATABASE:
          relatedErrors.push('DatabaseError', 'QueryError', 'ConstraintViolation');
          break;
          
        case ErrorCategory.NETWORK:
          relatedErrors.push('NetworkError', 'ConnectionError', 'TimeoutError');
          break;
          
        case ErrorCategory.AUTHENTICATION:
        case ErrorCategory.AUTHORIZATION:
          relatedErrors.push('AuthenticationError', 'AuthorizationError', 'PermissionDenied');
          break;
          
        case ErrorCategory.RUNTIME:
          relatedErrors.push('RuntimeError', 'TypeError', 'ReferenceError');
          break;
      }
  }
  
  return relatedErrors;
}

/**
 * Calculate confidence score for the error analysis
 * 
 * @param errorContext - Analyzed error context
 * @returns Confidence score between 0 and 1
 */
export function calculateConfidence(errorContext: EnhancedErrorContext): number {
  let score = 0;
  
  // Start with base score
  score += 0.3;
  
  // Add confidence based on available information
  if (errorContext.extendedCategory !== ExtendedErrorCategory.UNKNOWN) {
    score += 0.2;
  }
  
  if (errorContext.subtype) {
    score += 0.1;
  }
  
  if (errorContext.technicalContext && errorContext.technicalContext.length > 0) {
    score += 0.1;
  }
  
  if (errorContext.potentialCauses && errorContext.potentialCauses.length > 0) {
    score += 0.1;
  }
  
  if (errorContext.stackAnalysis?.errorSource) {
    score += 0.1;
  }
  
  if (errorContext.codeReferences && errorContext.codeReferences.length > 0) {
    score += 0.1;
  }
  
  if (errorContext.inferredRootCause) {
    score += 0.1;
  }
  
  // Cap at 1.0
  return Math.min(score, 1.0);
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
 * Extract error type from event details
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
 * Primary function to analyze an error and provide enhanced context for LLM prompting
 * 
 * @param eventDetails - Sentry event details object
 * @returns Enhanced error context object for prompting
 */
export function analyzeErrorEnhanced(eventDetails: EventDetails): EnhancedErrorContext {
  // Use the imported module to avoid circular dependency
  const { analyzeError } = errorAnalyticsModule;
  
  // Start with the basic error analysis
  const basicContext = analyzeError(eventDetails) as EnhancedErrorContext;
  
  if (!eventDetails || !basicContext.hasSufficientDetails) {
    return basicContext;
  }
  
  // Extract additional information
  const errorMessage = extractErrorMessage(eventDetails);
  const errorType = extractErrorType(eventDetails);
  const stackTrace = extractStackTrace(eventDetails);
  
  // Get extended error category
  basicContext.extendedCategory = categorizeExtendedError(
    errorMessage, 
    errorType, 
    basicContext.category
  );
  
  // Add application context
  basicContext.applicationContext = determineApplicationContext(eventDetails);
  
  // Add runtime context
  basicContext.runtimeContext = determineRuntimeContext(eventDetails);
  
  // Extract code references
  basicContext.codeReferences = extractCodeReferences(errorMessage, stackTrace);
  
  // Analyze stack trace
  basicContext.stackAnalysis = analyzeStackTrace(stackTrace);
  
  // Find related error types
  basicContext.relatedErrorTypes = findRelatedErrorTypes(basicContext);
  
  // Infer root cause
  basicContext.inferredRootCause = inferRootCause(basicContext);
  
  // Check if known issue
  basicContext.isKnownIssue = isKnownIssue(basicContext);
  
  // Generate diagnostic questions
  basicContext.diagnosticQuestions = generateDiagnosticQuestions(basicContext);
  
  // Predict impact
  basicContext.predictedImpact = predictImpact(basicContext);
  
  // Calculate confidence
  basicContext.confidenceScore = calculateConfidence(basicContext);
  
  return basicContext;
}

export default {
  analyzeErrorEnhanced,
  categorizeExtendedError,
  extractCodeReferences,
  analyzeStackTrace,
  determineApplicationContext,
  determineRuntimeContext,
  generateDiagnosticQuestions,
  inferRootCause,
  isKnownIssue,
  predictImpact,
  findRelatedErrorTypes,
  calculateConfidence,
  ExtendedErrorCategory,
  ApplicationContext,
  RuntimeContext
};