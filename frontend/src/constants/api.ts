/**
 * API-related constants
 */

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// Request timeouts (in milliseconds)
export const REQUEST_TIMEOUTS = {
  /** Default request timeout (30 seconds) */
  DEFAULT: 30 * 1000,
  
  /** Short requests (e.g., health checks) */
  SHORT: 5 * 1000,
  
  /** Long requests (e.g., large data fetches) */
  LONG: 60 * 1000,
  
  /** File uploads */
  UPLOAD: 120 * 1000,
  
  /** AI/LLM requests */
  AI_REQUEST: 90 * 1000
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  /** Default number of retry attempts */
  DEFAULT_ATTEMPTS: 3,
  
  /** Retry attempts for critical requests */
  CRITICAL_ATTEMPTS: 5,
  
  /** Base delay for exponential backoff (milliseconds) */
  BASE_DELAY: 1000,
  
  /** Maximum delay between retries */
  MAX_DELAY: 30 * 1000,
  
  /** Multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2
} as const;

// Request limits
export const REQUEST_LIMITS = {
  /** Maximum number of concurrent requests */
  MAX_CONCURRENT: 10,
  
  /** Maximum request size in bytes (10MB) */
  MAX_REQUEST_SIZE: 10 * 1024 * 1024,
  
  /** Maximum number of items per page */
  MAX_PAGE_SIZE: 100,
  
  /** Default page size */
  DEFAULT_PAGE_SIZE: 20
} as const;

// Content types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
  CSV: 'text/csv',
  XML: 'application/xml'
} as const;

// API versioning
export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2'
} as const;

// Rate limiting
export const RATE_LIMITS = {
  /** Requests per minute for standard endpoints */
  STANDARD_RPM: 60,
  
  /** Requests per minute for AI endpoints */
  AI_RPM: 20,
  
  /** Requests per minute for heavy operations */
  HEAVY_RPM: 10,
  
  /** Burst allowance */
  BURST_ALLOWANCE: 10
} as const;