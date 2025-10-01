/**
 * Event Type Detection Utilities
 * 
 * This module provides functions to detect the type of an event
 * to enable specialized analysis and visualization.
 */

/**
 * Enum of possible event types
 */
export enum EventType {
  DEADLOCK = 'deadlock',
  N1_QUERY = 'n1_query',
  MEMORY_LEAK = 'memory_leak',
  RATE_LIMIT = 'rate_limit',
  AUTH_FAILURE = 'auth_failure',
  API_ERROR = 'api_error',
  UNKNOWN = 'unknown',
}

/**
 * Detect the type of an event
 * 
 * @param event The event to analyze
 * @returns The detected event type
 */
export function detectEventType(event: any): EventType {
  if (!event) return EventType.UNKNOWN;
  
  // Detect deadlock
  if (isDeadlockIssue(event)) {
    return EventType.DEADLOCK;
  }
  
  // Detect N+1 query
  if (isN1QueryIssue(event)) {
    return EventType.N1_QUERY;
  }
  
  // Detect memory leak
  if (isMemoryLeakIssue(event)) {
    return EventType.MEMORY_LEAK;
  }
  
  return EventType.UNKNOWN;
}

/**
 * Check if an event is a deadlock issue
 */
export function isDeadlockIssue(event: any): boolean {
  if (!event) return false;
  
  // Check title and message
  const titleOrMessage = (event.title || '') + (event.message || '');
  if (/deadlock detected|40P01/i.test(titleOrMessage)) {
    return true;
  }
  
  // Check tags
  return event.tags?.some((tag: any) => 
    (tag.key === 'error_code' && tag.value === '40P01') ||
    (tag.key === 'database_issue' && tag.value === 'deadlock')
  ) || false;
}

/**
 * Check if an event is an N+1 query issue
 */
export function isN1QueryIssue(event: any): boolean {
  if (!event) return false;
  
  // Check event title or message
  const titleOrMessage = (event.title || '') + (event.message || '');
  if (/n\+1 query|multiple sequential queries|performance issue/i.test(titleOrMessage)) {
    return true;
  }
  
  // Check event tags
  const hasDatabaseTag = event.tags?.some((tag: any) => 
    tag.key === 'database' || tag.value === 'postgres' || tag.value === 'mysql'
  ) || false;
  
  const hasPerformanceTag = event.tags?.some((tag: any) => 
    tag.key === 'performance' || tag.value === 'performance'
  ) || false;
  
  // Check if it has both database and performance tags
  if (hasDatabaseTag && hasPerformanceTag) {
    return true;
  }
  
  // Check for spans with database queries
  const hasSpans = event.entries?.some((entry: any) => 
    entry.type === 'spans' && entry.data?.spans?.length > 1
  ) || false;
  
  // If it has spans and database tag, it might be an N+1 issue
  if (hasSpans && hasDatabaseTag) {
    return true;
  }
  
  return false;
}

/**
 * Check if an event is a memory leak issue
 */
export function isMemoryLeakIssue(event: any): boolean {
  if (!event) return false;
  
  // Check event title or message
  const titleOrMessage = (event.title || '') + (event.message || '');
  if (/memory leak|out of memory|memory growth|excessive memory|heap growth/i.test(titleOrMessage)) {
    return true;
  }
  
  // Check event tags
  const hasMemoryTag = event.tags?.some((tag: any) => 
    tag.key === 'memory' || 
    tag.value === 'memory' || 
    tag.value === 'memory_issue' ||
    tag.key === 'memory_usage'
  ) || false;
  
  const hasPerformanceTag = event.tags?.some((tag: any) => 
    tag.key === 'performance' || 
    tag.value === 'performance' ||
    tag.key === 'issue_type' && tag.value === 'memory'
  ) || false;
  
  // Check if it has explicit memory leak tags
  const hasMemoryLeakTag = event.tags?.some((tag: any) => 
    (tag.key === 'issue_type' && tag.value === 'memory_leak') ||
    (tag.key === 'memory_issue' && tag.value === 'leak')
  ) || false;
  
  if (hasMemoryLeakTag) {
    return true;
  }
  
  // Check if it has both memory and performance tags
  if (hasMemoryTag && hasPerformanceTag) {
    return true;
  }
  
  // Check breadcrumbs for memory-related entries
  const hasMemoryBreadcrumbs = event.entries?.some((entry: any) => 
    entry.type === 'breadcrumbs' && 
    entry.data?.values?.some((breadcrumb: any) => 
      breadcrumb.type === 'debug' && 
      /memory|heap|allocation/i.test(breadcrumb.message || '')
    )
  ) || false;
  
  // Check for memory metrics in event data
  const hasMemoryMetrics = event.entries?.some((entry: any) => 
    entry.type === 'spans' && 
    entry.data?.spans?.some((span: any) => 
      /memory|heap|allocation/i.test(span.op || '') ||
      span.tags?.some((tag: any) => /memory|heap|allocation/i.test(tag.key || tag.value || ''))
    )
  ) || false;
  
  if (hasMemoryBreadcrumbs || hasMemoryMetrics) {
    return true;
  }
  
  return false;
}

/**
 * Get analyzer component name based on event type
 */
export function getAnalyzerComponent(eventType: EventType): string {
  switch (eventType) {
    case EventType.DEADLOCK:
      return 'DeadlockModal';
    case EventType.N1_QUERY:
      return 'N1QueryModal';
    case EventType.MEMORY_LEAK:
      return 'MemoryLeakModal';
    case EventType.RATE_LIMIT:
      return 'RateLimitModal';
    case EventType.AUTH_FAILURE:
      return 'AuthFailureModal';
    case EventType.API_ERROR:
      return 'ApiErrorModal';
    default:
      return '';
  }
}