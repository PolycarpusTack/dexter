/**
 * Constants index file
 * 
 * Centralized exports for all application constants
 */

export * from './api';
export * from './cache';
export * from './ui';

// Application-wide constants
export const APP = {
  /** Application name */
  NAME: 'Dexter',
  
  /** Application version */
  VERSION: '1.0.0',
  
  /** Application description */
  DESCRIPTION: 'Enhanced monitoring and observability tool',
  
  /** Local storage key prefix */
  STORAGE_PREFIX: 'dexter_',
  
  /** Session storage key prefix */
  SESSION_PREFIX: 'dexter_session_',
  
  /** Cookie prefix */
  COOKIE_PREFIX: 'dexter_'
} as const;

// Environment-related constants
export const ENV = {
  /** Development environment */
  DEVELOPMENT: 'development',
  
  /** Production environment */
  PRODUCTION: 'production',
  
  /** Testing environment */
  TESTING: 'test'
} as const;

// Feature flags
export const FEATURES = {
  /** Enable experimental features */
  EXPERIMENTAL: process.env.NODE_ENV === 'development',
  
  /** Enable debug mode */
  DEBUG: process.env.NODE_ENV === 'development',
  
  /** Enable telemetry */
  TELEMETRY: true,
  
  /** Enable error tracking */
  ERROR_TRACKING: true
} as const;

// Logging levels
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
} as const;

// Event types for analytics
export const EVENT_TYPES = {
  /** User interaction events */
  USER_INTERACTION: 'user_interaction',
  
  /** Navigation events */
  NAVIGATION: 'navigation',
  
  /** Error events */
  ERROR: 'error',
  
  /** Performance events */
  PERFORMANCE: 'performance',
  
  /** Feature usage events */
  FEATURE_USAGE: 'feature_usage'
} as const;