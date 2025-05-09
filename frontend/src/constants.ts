/**
 * Application-wide constants
 */

// Date format patterns
export const DATE_FORMAT = {
  FULL: 'MMM d, yyyy HH:mm:ss',
  SHORT: 'MMM d, yyyy',
  TIME: 'HH:mm:ss'
};

// Unknown value placeholders
export const UNKNOWN_STR = {
  DATE: 'Unknown date',
  TIME: 'Unknown time',
  USER: 'Unknown user',
  VALUE: 'Unknown'
};

// Common API statuses
export const API_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  ACTIVE_PROJECT: 'active_project'
};

export default {
  DATE_FORMAT,
  UNKNOWN_STR,
  API_STATUS,
  STORAGE_KEYS
};