import { useCallback, useEffect, useState } from 'react';
import errorTracker, { 
  ErrorCategory, 
  ErrorSeverity, 
  RecoveryStrategy,
  TrackedError,
  ErrorTrackingOptions
} from '../utils/errorHandling/errorTracker';

export interface UseErrorTrackerOptions {
  /**
   * Component name for error context
   */
  component?: string;
  
  /**
   * Default category for tracked errors
   */
  defaultCategory?: ErrorCategory;
  
  /**
   * Default severity for tracked errors
   */
  defaultSeverity?: ErrorSeverity;
  
  /**
   * User ID for error tracking
   */
  userId?: string;
  
  /**
   * Whether to track all errors thrown in the component
   */
  trackAll?: boolean;
  
  /**
   * Callback when errors are tracked
   */
  onError?: (error: TrackedError) => void;
}

/**
 * Hook for tracking errors with telemetry integration
 */
export function useErrorTracker(options: UseErrorTrackerOptions = {}) {
  // Default options
  const {
    component,
    defaultCategory = ErrorCategory.UNKNOWN,
    defaultSeverity = ErrorSeverity.ERROR,
    userId,
    trackAll = false,
    onError
  } = options;
  
  // State for active errors in this component
  const [errors, setErrors] = useState<TrackedError[]>([]);
  
  // Track error with component context
  const trackError = useCallback((
    errorOrMessage: unknown,
    optionsOrCategory?: ErrorTrackingOptions | ErrorCategory,
    context?: Record<string, any>
  ) => {
    // Process options
    let trackOptions: ErrorTrackingOptions = {};
    
    if (typeof optionsOrCategory === 'string') {
      // If second param is a string, treat as category
      trackOptions.category = optionsOrCategory as ErrorCategory;
      if (context) {
        trackOptions.context = context;
      }
    } else if (optionsOrCategory && typeof optionsOrCategory === 'object') {
      // Otherwise use as options object
      trackOptions = optionsOrCategory;
    }
    
    // Add component information
    trackOptions = {
      component,
      userId,
      category: defaultCategory,
      severity: defaultSeverity,
      ...trackOptions
    };
    
    // Track the error
    const trackedError = errorTracker.trackError(errorOrMessage, trackOptions);
    
    // Update local errors
    setErrors(current => [...current, trackedError]);
    
    // Call onError callback if provided
    if (onError) {
      onError(trackedError);
    }
    
    return trackedError;
  }, [component, userId, defaultCategory, defaultSeverity, onError]);
  
  // Create tracking wrapper for specific categories
  const createCategoryTracker = useCallback((category: ErrorCategory) => {
    return (
      errorOrMessage: unknown,
      optionsOrContext?: ErrorTrackingOptions | Record<string, any>
    ) => {
      if (optionsOrContext && 'category' in optionsOrContext) {
        // It's an options object
        return trackError(errorOrMessage, {
          ...optionsOrContext,
          category
        });
      } else {
        // It's a context object or undefined
        return trackError(
          errorOrMessage, 
          category, 
          optionsOrContext as Record<string, any>
        );
      }
    };
  }, [trackError]);
  
  // Specialized trackers for common error categories
  const trackNetworkError = useCallback(
    createCategoryTracker(ErrorCategory.NETWORK),
    [createCategoryTracker]
  );
  
  const trackApiError = useCallback(
    createCategoryTracker(ErrorCategory.API),
    [createCategoryTracker]
  );
  
  const trackValidationError = useCallback(
    createCategoryTracker(ErrorCategory.VALIDATION),
    [createCategoryTracker]
  );
  
  const trackRenderingError = useCallback(
    createCategoryTracker(ErrorCategory.RENDERING),
    [createCategoryTracker]
  );
  
  // Retry a tracked error
  const retryError = useCallback((errorId: string) => {
    const result = errorTracker.retryError(errorId);
    
    // Update errors if retry was successful
    if (result) {
      setErrors(current => current.filter(e => e.id !== errorId));
    }
    
    return result;
  }, []);
  
  // Resolve a tracked error
  const resolveError = useCallback((errorId: string, resolution?: string) => {
    errorTracker.resolveError(errorId, resolution);
    
    // Update local errors
    setErrors(current => current.filter(e => e.id !== errorId));
  }, []);
  
  // Register a recovery handler
  const registerRecoveryHandler = useCallback((
    category: ErrorCategory,
    handler: (error: TrackedError) => boolean
  ) => {
    return errorTracker.registerRecoveryHandler(category, handler);
  }, []);
  
  // Setup a global error handler if trackAll is true
  useEffect(() => {
    if (!trackAll) return;
    
    const errorHandler = (event: ErrorEvent) => {
      trackError(event.error || event.message, {
        category: ErrorCategory.UNKNOWN,
        context: {
          fileName: event.filename,
          lineNumber: event.lineno,
          columnNumber: event.colno
        }
      });
      
      // Prevent default browser error handling
      event.preventDefault();
    };
    
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      trackError(event.reason, {
        category: ErrorCategory.UNKNOWN,
        context: {
          promise: 'unhandled_rejection'
        }
      });
      
      // Prevent default browser error handling
      event.preventDefault();
    };
    
    // Add event listeners
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, [trackAll, trackError]);
  
  // Clean up tracked errors on unmount
  useEffect(() => {
    return () => {
      // Resolve all errors tracked by this component
      errors.forEach(error => {
        errorTracker.resolveError(error.id, 'component_unmount');
      });
    };
  }, [errors]);
  
  return {
    // Core tracking
    trackError,
    
    // Specialized trackers
    trackNetworkError,
    trackApiError,
    trackValidationError,
    trackRenderingError,
    
    // Error management
    errors,
    retryError,
    resolveError,
    registerRecoveryHandler,
    
    // Direct access to errorTracker 
    errorTracker,
    
    // Constants
    ErrorCategory,
    ErrorSeverity,
    RecoveryStrategy
  };
}

export default useErrorTracker;