// File: src/utils/errorHandling.ts

import {
  categorizeError,
  isRetryableError,
  createErrorHandler,
  showSuccessNotification,
  showErrorNotification,
  showInfoNotification,
  showWarningNotification,
  showLoadingNotification,
  dismissNotification,
  ErrorCategory,
  ErrorContext,
  ErrorHandlerOptions,
  NotificationOptions
} from './errorHandling/index';

import {
  AppErrorBoundary,
  ErrorBoundary,
  ErrorContext as ErrorContextProvider,
  ErrorFallback,
  RefreshableContainer,
  withDataFetching,
  withErrorBoundary
} from '../components/ErrorHandling';

import {
  EnhancedError,
  ApiError,
  NetworkError
} from './errorFactory';

import ErrorFactory from './errorFactory';

import {
  attemptErrorRecovery,
  DEFAULT_RECOVERY_STRATEGIES,
  networkRecoveryStrategy,
  sessionRecoveryStrategy
} from './errorRecovery';

// Export everything
export {
  // Error types and factories
  ErrorFactory,
  EnhancedError,
  ApiError,
  NetworkError,
  
  // Error categorization and detection
  categorizeError,
  isRetryableError,
  
  // Error handlers
  createErrorHandler,
  
  // Notifications
  showSuccessNotification,
  showErrorNotification,
  showInfoNotification,
  showWarningNotification,
  showLoadingNotification,
  dismissNotification,
  
  // Recovery
  attemptErrorRecovery,
  DEFAULT_RECOVERY_STRATEGIES,
  networkRecoveryStrategy,
  sessionRecoveryStrategy,
  
  // Error boundary components
  AppErrorBoundary,
  ErrorBoundary,
  ErrorContextProvider,
  ErrorFallback,
  RefreshableContainer,
  withDataFetching,
  withErrorBoundary,
  
  // Types
  ErrorCategory,
  ErrorContext,
  ErrorHandlerOptions,
  NotificationOptions
};

export default {
  categorizeError,
  isRetryableError,
  createErrorHandler,
  showSuccessNotification,
  showErrorNotification,
  ErrorFactory,
  attemptErrorRecovery,
  withErrorBoundary,
  withDataFetching
};
