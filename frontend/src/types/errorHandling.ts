// File: src/types/errorHandling.ts

import { ReactNode } from 'react';

/**
 * Type for error categories
 */
export type ErrorCategory = 
  | 'network'
  | 'server_error'
  | 'client_error'
  | 'validation'
  | 'authorization'
  | 'not_found'
  | 'timeout'
  | 'parsing'
  | 'llm_api_error'
  | 'unknown';

/**
 * Interface for EnhancedError constructor options
 */
export interface EnhancedErrorOptions {
  /** Error category */
  category?: ErrorCategory;
  /** Whether the error is retryable */
  retryable?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Number of retry attempts made */
  retryCount?: number;
  /** Original error object */
  originalError?: Error | null;
}

/**
 * Interface for network error options
 */
export interface NetworkErrorOptions extends Omit<EnhancedErrorOptions, 'category'> {
  /** Whether the error is retryable (defaults to true for network errors) */
  retryable?: boolean;
}

/**
 * Interface for API error options
 */
export interface ApiErrorOptions extends EnhancedErrorOptions {
  /** HTTP status code */
  status: number;
  /** Response data */
  data?: unknown;
}

/**
 * Context for error handling
 */
export interface ErrorContext {
  component?: string;
  operation?: string;
  apiModule?: string;
  [key: string]: any;
}

/**
 * Options for error handler
 */
export interface ErrorHandlerOptions {
  /** Default title for error notifications */
  defaultTitle?: string;
  /** Additional context for the error */
  context?: ErrorContext;
  /** Whether to show a notification */
  showNotification?: boolean;
  /** Whether to log the error */
  logError?: boolean;
  /** Whether to send to error tracking */
  sendToErrorTracking?: boolean;
}

/**
 * Interface for notification options
 */
export interface NotificationOptions {
  /** Notification ID for updates */
  id?: string;
  /** Notification title */
  title: string;
  /** Notification message */
  message?: string;
  /** Error object, if any */
  error?: Error;
  /** Automatically hide after timeout (ms, 0 to persist) */
  autoClose?: number;
  /** Icon to show with notification */
  icon?: ReactNode;
  /** Notification color */
  color?: string;
  /** Loading state */
  loading?: boolean;
  /** Whether to disable auto-hiding */
  disableAutoClose?: boolean;
}

/**
 * Interface for recovery strategy
 */
export interface RecoveryStrategy {
  name: string;
  description: string;
  canHandle: (error: Error) => boolean;
  apply: (error: Error, context?: any) => Promise<any>;
  priority: number;
}

/**
 * Error Boundary Props
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: any) => void;
  name?: string;
  showDetails?: boolean;
}

/**
 * Error Boundary State
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Fallback Props
 */
export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  showDetails?: boolean;
}

/**
 * Refreshable Container Props
 */
export interface RefreshableContainerProps {
  children: ReactNode;
  title?: string;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
  refreshInterval?: number;
  actions?: ReactNode;
}

/**
 * With Error Boundary Options
 */
export interface WithErrorBoundaryOptions {
  name?: string;
  showDetails?: boolean;
}

/**
 * With Data Fetching Options
 */
export interface WithDataFetchingOptions {
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
}
