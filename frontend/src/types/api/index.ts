// Auto-generated Sentry API types
export * from './sentry-generated';

// Re-export existing types to maintain backward compatibility
// Note: If there are conflicts, the existing types take precedence
// Explicitly exclude SentryEvent which is already exported
export type { 
  SentryCustomEvent,
  SentryApiResponse,
  SentryPaginatedResponse,
  SentryIssueWithStats
} from './sentry';
