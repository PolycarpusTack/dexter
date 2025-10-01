/**
 * Cache-related constants
 */

// Cache size limits
export const CACHE_CONFIG = {
  /** Default maximum number of cache entries */
  DEFAULT_MAX_SIZE: 100,
  
  /** Default maximum cache size in bytes (10MB) */
  DEFAULT_MAX_BYTES: 10 * 1024 * 1024,
  
  /** Default TTL for cache entries (5 minutes) */
  DEFAULT_TTL: 5 * 60 * 1000,
  
  /** Cleanup threshold - when to run cache cleanup (80% of max size) */
  CLEANUP_THRESHOLD: 0.8,
  
  /** Number of entries to remove during cleanup */
  CLEANUP_BATCH_SIZE: 10
} as const;

// Memory size constants
export const MEMORY_SIZES = {
  /** 1 KB in bytes */
  KB: 1024,
  
  /** 1 MB in bytes */
  MB: 1024 * 1024,
  
  /** 1 GB in bytes */
  GB: 1024 * 1024 * 1024
} as const;

// Time duration constants (in milliseconds)
export const TIME_DURATIONS = {
  /** 1 second */
  SECOND: 1000,
  
  /** 1 minute */
  MINUTE: 60 * 1000,
  
  /** 1 hour */
  HOUR: 60 * 60 * 1000,
  
  /** 1 day */
  DAY: 24 * 60 * 60 * 1000,
  
  /** 1 week */
  WEEK: 7 * 24 * 60 * 60 * 1000
} as const;

// API-specific cache TTLs
export const API_CACHE_TTL = {
  /** Configuration data (rarely changes) */
  CONFIG: 30 * TIME_DURATIONS.MINUTE,
  
  /** Event data (moderately dynamic) */
  EVENTS: 5 * TIME_DURATIONS.MINUTE,
  
  /** Issue data (moderately dynamic) */
  ISSUES: 5 * TIME_DURATIONS.MINUTE,
  
  /** Metrics data (frequently changing) */
  METRICS: 2 * TIME_DURATIONS.MINUTE,
  
  /** AI model data (static) */
  AI_MODELS: TIME_DURATIONS.HOUR,
  
  /** Template data (rarely changes) */
  TEMPLATES: 15 * TIME_DURATIONS.MINUTE,
  
  /** User preferences (rarely changes) */
  USER_PREFS: TIME_DURATIONS.HOUR,
  
  /** System status (frequently changing) */
  SYSTEM_STATUS: 30 * TIME_DURATIONS.SECOND
} as const;