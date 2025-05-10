/**
 * Event type definitions for Dexter
 * Provides comprehensive type safety for event data
 */

// Basic event time range options
export type TimeRange = '24h' | '7d' | '30d' | 'custom';

// Sort direction options
export type SortDirection = 'asc' | 'desc';

// User impact information
export interface UserImpact {
  count: number;      // Number of users affected
  percentage: number; // Percentage of total users
  uniqueUsers?: string[]; // Optional array of user identifiers
}

// Event metrics for time-series data
export interface EventMetric {
  name: string;
  value: number;
  timestamp: string;
}

// Browser information from event context
export interface BrowserInfo {
  name: string;
  version: string;
  os: string;
}

// Location information from event context
export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
}

// Tag structure for events
export interface EventTag {
  key: string;  // Required key
  value: string;  // Required value
  name?: string;
  [key: string]: any; // For other properties
}

// Core event data structure
export interface EventType {
  id: string;
  title?: string;
  message: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  timestamp: string;
  count: number;
  firstSeen?: string;
  lastSeen?: string;
  tags: (string | EventTag)[]; // Updated to handle both string and object tags
  userImpact?: UserImpact;
  metrics?: EventMetric[];
  browser?: BrowserInfo;
  location?: LocationInfo;
  stacktrace?: string[];
  culprit?: string;
  assignee?: string;
  status?: 'unresolved' | 'resolved' | 'ignored';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  project?: string;
  environment?: string;
  release?: string;
  aiSummary?: string;
  [key: string]: any; // Allow for additional fields
}

// Response structure for events list
export interface EventsResponse {
  items: EventType[];
  count?: number;
  hasMore?: boolean;
  nextCursor?: string;
}

// Response structure for event frequency data
export interface EventFrequencyResponse {
  points: Array<{
    timestamp: string;
    count: number;
  }>;
}

// Filter options for event queries
export interface EventFilterOptions {
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
  environment?: string;
  level?: string[];
  status?: string[];
  assignee?: string;
  tags?: Record<string, string[]>;
  search?: string;
  sort?: string;
  sortDirection?: SortDirection;
}

export default EventType;