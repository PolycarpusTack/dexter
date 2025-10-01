/**
 * Timing Constants
 * 
 * Centralized timing values for consistent behavior across the application.
 * All values are in milliseconds unless otherwise specified.
 */

// Time conversion constants
export const SECONDS_TO_MS = 1000;
export const MINUTES_TO_MS = 60 * SECONDS_TO_MS;
export const HOURS_TO_MS = 60 * MINUTES_TO_MS;
export const DAYS_TO_MS = 24 * HOURS_TO_MS;

// Cache and stale time durations
export const CACHE_STALE_TIME_1_MINUTE = 1 * MINUTES_TO_MS;
export const CACHE_STALE_TIME_5_MINUTES = 5 * MINUTES_TO_MS;
export const CACHE_STALE_TIME_10_MINUTES = 10 * MINUTES_TO_MS;
export const CACHE_STALE_TIME_1_HOUR = 1 * HOURS_TO_MS;

// Auto-save intervals
export const AUTOSAVE_INTERVAL_5_MINUTES = 5 * MINUTES_TO_MS;
export const AUTOSAVE_INTERVAL_10_MINUTES = 10 * MINUTES_TO_MS;

// Debounce delays
export const DEBOUNCE_SEARCH_MS = 300;
export const DEBOUNCE_RESIZE_MS = 150;
export const DEBOUNCE_SCROLL_MS = 100;

// Polling intervals
export const POLL_INTERVAL_FAST = 5 * SECONDS_TO_MS;
export const POLL_INTERVAL_NORMAL = 30 * SECONDS_TO_MS;
export const POLL_INTERVAL_SLOW = 60 * SECONDS_TO_MS;

// UI animation durations
export const ANIMATION_DURATION_FAST = 150;
export const ANIMATION_DURATION_NORMAL = 300;
export const ANIMATION_DURATION_SLOW = 500;

// Notification display durations
export const NOTIFICATION_DURATION_SHORT = 3 * SECONDS_TO_MS;
export const NOTIFICATION_DURATION_NORMAL = 5 * SECONDS_TO_MS;
export const NOTIFICATION_DURATION_LONG = 10 * SECONDS_TO_MS;

// Retry delays
export const RETRY_DELAY_SHORT = 1 * SECONDS_TO_MS;
export const RETRY_DELAY_NORMAL = 3 * SECONDS_TO_MS;
export const RETRY_DELAY_LONG = 5 * SECONDS_TO_MS;
