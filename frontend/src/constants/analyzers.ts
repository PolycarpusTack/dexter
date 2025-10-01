/**
 * Analyzer-related constants
 */

export const ANALYZER_TYPES = {
  N_PLUS_ONE: 'n_plus_one',
  DEADLOCK: 'deadlock',
  MEMORY_LEAK: 'memory_leak',
  PROMISE_REJECTION: 'promise_rejection',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const;

export const API_CONSTANTS = {
  BASE_URL: process.env.VITE_API_URL || 'http://localhost:8000',
  AUTH_PREFIX: 'Bearer ',
  CONTENT_TYPE_JSON: 'application/json',
} as const;

export const N1_QUERY_CONSTANTS = {
  MIN_QUERIES_FOR_PATTERN: 3,
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.6,
} as const;
