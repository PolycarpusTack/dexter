// File: src/utils/errorHandling/errorAnalyticsIntegration.ts

import errorAnalytics from '../../services/errorAnalyticsService';
import { EnhancedError } from './errorFactory';
import { showErrorNotification } from './notifications';

/**
 * Record error to analytics and optionally show notification
 * @param error - The error to record
 * @param context - Additional context information
 * @param showNotification - Whether to show notification
 */
export const recordAndNotifyError = (
  error: unknown,
  context: Record<string, unknown> = {},
  showNotification = true
): void => {
  // Record to analytics
  errorAnalytics.recordError(error, context);
  
  // Show notification if requested
  if (showNotification) {
    const enhancedError = error as EnhancedError;
    
    showErrorNotification({
      title: context.title as string || 'An error occurred',
      message: enhancedError.message || 'Something went wrong',
      category: enhancedError.category,
      retryable: enhancedError.retryable
    });
  }
};

/**
 * Middleware function to capture and record errors from async functions
 * @param fn - The async function to execute
 * @param context - Additional context information
 * @param showNotification - Whether to show notification on error
 */
export const withErrorAnalytics = async <T>(
  fn: () => Promise<T>,
  context: Record<string, unknown> = {},
  showNotification = true
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    // Record and notify
    recordAndNotifyError(error, context, showNotification);
    
    // Re-throw to allow further handling
    throw error;
  }
};

/**
 * HOC that wraps a component to record errors to analytics
 * @param Component - The component to wrap
 * @param context - Additional context information
 */
export const withErrorAnalyticsTracking = <P extends object>(
  Component: React.ComponentType<P>,
  context: Record<string, unknown> = {}
): React.FC<P> => {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const WrappedComponent: React.FC<P> = (props) => {
    try {
      return <Component {...props} />;
    } catch (error) {
      // Record the error
      recordAndNotifyError(error, {
        ...context,
        component: displayName,
        props: JSON.stringify(props)
      });
      
      // Re-throw to allow error boundaries to catch
      throw error;
    }
  };
  
  WrappedComponent.displayName = `WithErrorAnalytics(${displayName})`;
  
  return WrappedComponent;
};

export default {
  recordAndNotifyError,
  withErrorAnalytics,
  withErrorAnalyticsTracking
};
