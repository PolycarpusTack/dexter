/**
 * Event-related type definitions
 */

// Base event interface
export interface BaseEvent {
  id: string;
  title: string;
  level: string;
  platform: string;
  count: number;
  lastSeen: string;
  timestamp?: string;
  message?: string;
  environment?: string;
  release?: string;
  transaction?: string;
  user?: EventUser;
  tags?: EventTag[];
  contexts?: EventContexts;
  fingerprint?: string[];
  groupID?: string;
  eventID?: string;
  projectSlug?: string;
  size?: number;
  type?: string;
  metadata?: EventMetadata;
}

// User information in events
export interface EventUser {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
  geo?: {
    country_code?: string;
    city?: string;
    region?: string;
  };
}

// Event tags
export interface EventTag {
  key: string;
  value: string;
}

// Event contexts
export interface EventContexts {
  browser?: {
    name?: string;
    version?: string;
  };
  os?: {
    name?: string;
    version?: string;
  };
  device?: {
    model?: string;
    brand?: string;
    type?: string;
  };
  runtime?: {
    name?: string;
    version?: string;
  };
}

// Event metadata
export interface EventMetadata {
  [key: string]: unknown;
}

// Event filters for table/list components
export interface EventFilters {
  level?: string | string[];
  environment?: string | string[];
  release?: string | string[];
  platform?: string | string[];
  project?: string | string[];
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  assigned?: string;
  bookmarked?: boolean;
  subscribed?: boolean;
  tags?: Record<string, string>;
  sort?: string;
  cursor?: string;
}

// Event list response
export interface EventsResponse {
  events: BaseEvent[];
  pageInfo?: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount?: number;
}

// Event table sorting
export interface EventTableSort {
  field: keyof BaseEvent | string;
  direction: 'asc' | 'desc';
}

// Event table column configuration
export interface EventTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, event: BaseEvent) => React.ReactNode;
}

// Event table configuration
export interface EventTableConfig {
  columns: EventTableColumn[];
  defaultSort?: EventTableSort;
  pageSize?: number;
  showPagination?: boolean;
  virtualized?: boolean;
  selectable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

// Event actions
export type EventAction = 
  | 'view'
  | 'resolve'
  | 'ignore'
  | 'bookmark'
  | 'subscribe'
  | 'assign'
  | 'delete'
  | 'export';

// Event status
export type EventStatus = 
  | 'resolved'
  | 'unresolved'
  | 'ignored'
  | 'reprocessing';

// Event level/severity
export type EventLevel = 
  | 'fatal'
  | 'error'
  | 'warning'
  | 'info'
  | 'debug';

// Event platform
export type EventPlatform = 
  | 'javascript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'php'
  | 'ruby'
  | 'go'
  | 'rust'
  | 'swift'
  | 'kotlin'
  | 'dart'
  | 'other';

// Export convenience types
export type Event = BaseEvent;
export type { EventFilters as Filters };
export type { EventsResponse as Response };
export type { EventTableConfig as TableConfig };
export type { EventTableColumn as TableColumn };
export type { EventTableSort as TableSort };