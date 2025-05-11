// Existing Sentry types - maintains backward compatibility
// This file contains custom type definitions that override or extend
// the auto-generated types in sentry-generated.ts

// Re-export types from deadlock.ts that are actually Sentry types
export type { 
  SentryEvent, 
  EventTag, 
  EventException, 
  EventEntry, 
  EventContext 
} from '../deadlock';

// Custom overrides for specific Sentry types that need extra properties
export interface SentryCustomEvent extends Omit<import('./sentry-generated').SentryEvent, 'metadata'> {
  metadata: {
    deadlock?: any;
    custom?: any;
    [key: string]: any;
  };
}

// API response types with custom handling
export interface SentryApiResponse<T> {
  data: T;
  headers?: {
    link?: string;
    'x-hits'?: string;
    [key: string]: string | undefined;
  };
  error?: {
    detail: string;
    status?: number;
  };
}

// Pagination support
export interface SentryPaginatedResponse<T> extends SentryApiResponse<T[]> {
  cursor?: string;
  hasMore?: boolean;
}

// Custom issue types with additional fields
export interface SentryIssueWithStats extends Omit<import('./sentry-generated').SentryIssue, 'stats'> {
  stats: {
    '24h': Array<[number, number]>;
    '30d': Array<[number, number]>;
    [key: string]: Array<[number, number]>;
  };
  userReportCount?: number;
  subscriptionDetails?: {
    reason: string;
  };
}
