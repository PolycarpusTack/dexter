// File: frontend/src/store/types.ts

/**
 * Common types used across all domain stores
 * 
 * Note: The old appStore has been removed and replaced with domain-specific stores:
 * - AuthStore: User authentication and organization/project context
 * - UIStore: Theme and display preferences
 * - SelectionStore: Selected items and navigation state
 * - FilterStore: Search and filter criteria
 * - KeyboardStore: Keyboard shortcuts and accessibility
 * - AIStore: AI model configuration and preferences
 */

/**
 * Common display preference type used by UIStore
 */
export type DisplayPreference = 'compact' | 'comfortable' | 'spacious';

/**
 * Common theme type used by UIStore
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Common filter status type used by FilterStore
 */
export type FilterStatus = 'all' | 'unresolved' | 'resolved' | 'ignored' | 'bookmarked';

/**
 * Common sort direction type
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Common time range type
 */
export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'all';

export interface AuditEvent {
  action: string;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}