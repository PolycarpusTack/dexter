/**
 * Error Tracking Service
 * 
 * This service tracks errors throughout the application, integrates with telemetry,
 * categorizes errors, and provides recovery mechanisms.
 */

import telemetry from '../../services/telemetry';

// Error categories
export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RENDERING = 'rendering',
  BUSINESS_LOGIC = 'business_logic',
  RESOURCE = 'resource',
  TIMEOUT = 'timeout',
  INPUT = 'input',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug'
}

// Error recovery strategies
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  RELOAD = 'reload',
  RESET = 'reset',
  NOTIFY = 'notify',
  IGNORE = 'ignore'
}

// Error tracking options
export interface ErrorTrackingOptions {
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  component?: string;
  recoverable?: boolean;
  retryable?: boolean;
  maxRetries?: number;
  context?: Record<string, any>;
  recoveryStrategy?: RecoveryStrategy;
  userId?: string;
  errorCode?: string | number;
  tags?: string[];
}

// Tracked error type
export interface TrackedError {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  component?: string;
  recoverable: boolean;
  retryable: boolean;
  maxRetries: number;
  retryCount: number;
  context?: Record<string, any>;
  recoveryStrategy?: RecoveryStrategy;
  userId?: string;
  errorCode?: string | number;
  statusCode?: number;
  tags: string[];
  originalError?: Error;
}

// Default error tracking options
const defaultOptions: Partial<ErrorTrackingOptions> = {
  category: ErrorCategory.UNKNOWN,
  severity: ErrorSeverity.ERROR,
  recoverable: true,
  retryable: false,
  maxRetries: 3,
  tags: []
};

/**
 * Map an error to a category based on its properties and message
 */
function categorizeError(error: Error): ErrorCategory {
  // Check if it's a network error
  if (error instanceof TypeError && error.message.includes('network')) {
    return ErrorCategory.NETWORK;
  }
  
  // Check if it's a fetch error
  if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
    return ErrorCategory.NETWORK;
  }
  
  // Check if it's a validation error
  if (error.message.includes('validation') || 
      error.message.includes('invalid') || 
      error.message.includes('required')) {
    return ErrorCategory.VALIDATION;
  }
  
  // Check if it's an authentication error
  if (error.message.includes('authentication') || 
      error.message.includes('unauthenticated') || 
      error.message.includes('login') ||
      error.message.includes('sign in')) {
    return ErrorCategory.AUTHENTICATION;
  }
  
  // Check if it's an authorization error
  if (error.message.includes('authorization') || 
      error.message.includes('forbidden') || 
      error.message.includes('permission') ||
      error.message.includes('access denied')) {
    return ErrorCategory.AUTHORIZATION;
  }
  
  // Check if it's a timeout error
  if (error.message.includes('timeout') || 
      error.message.includes('timed out')) {
    return ErrorCategory.TIMEOUT;
  }
  
  // Default to unknown
  return ErrorCategory.UNKNOWN;
}

/**
 * Determine severity based on error category and message
 */
function determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
  // Authentication and authorization failures are warnings
  if (category === ErrorCategory.AUTHENTICATION || 
      category === ErrorCategory.AUTHORIZATION) {
    return ErrorSeverity.WARNING;
  }
  
  // Network errors could be critical if persistent
  if (category === ErrorCategory.NETWORK && 
      (error.message.includes('offline') || error.message.includes('unreachable'))) {
    return ErrorSeverity.CRITICAL;
  }
  
  // Input validation errors are generally just warnings
  if (category === ErrorCategory.VALIDATION) {
    return ErrorSeverity.WARNING;
  }
  
  // Default to error level
  return ErrorSeverity.ERROR;
}

/**
 * Extract HTTP status code from error if present
 */
function extractStatusCode(error: any): number | undefined {
  // Check common error shapes
  if (error.status && typeof error.status === 'number') {
    return error.status;
  }
  
  if (error.statusCode && typeof error.statusCode === 'number') {
    return error.statusCode;
  }
  
  if (error.response && error.response.status && typeof error.response.status === 'number') {
    return error.response.status;
  }
  
  // Try to extract from error message
  const statusMatch = error.message?.match(/(\b[45]\d{2}\b)/);
  if (statusMatch) {
    return parseInt(statusMatch[1], 10);
  }
  
  return undefined;
}

/**
 * Suggest recovery strategy based on error category and severity
 */
function suggestRecoveryStrategy(
  category: ErrorCategory, 
  severity: ErrorSeverity
): RecoveryStrategy {
  // Network errors can often be retried
  if (category === ErrorCategory.NETWORK) {
    return RecoveryStrategy.RETRY;
  }
  
  // Authentication issues typically require user to log in again
  if (category === ErrorCategory.AUTHENTICATION) {
    return RecoveryStrategy.RELOAD;
  }
  
  // Authorization issues often can't be recovered automatically
  if (category === ErrorCategory.AUTHORIZATION) {
    return RecoveryStrategy.NOTIFY;
  }
  
  // Input validation just needs user correction
  if (category === ErrorCategory.VALIDATION) {
    return RecoveryStrategy.NOTIFY;
  }
  
  // Critical errors might need a full reset
  if (severity === ErrorSeverity.CRITICAL) {
    return RecoveryStrategy.RESET;
  }
  
  // Default to notifying the user
  return RecoveryStrategy.NOTIFY;
}

/**
 * Normalize an error into a standard format
 */
function normalizeError(error: unknown): Error {
  // Handle non-Error objects
  if (!(error instanceof Error)) {
    // Convert string to Error
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    // Try to stringify objects
    if (typeof error === 'object' && error !== null) {
      try {
        const errorMessage = JSON.stringify(error);
        return new Error(errorMessage);
      } catch (e) {
        return new Error('Unknown error object');
      }
    }
    
    // Default for other types
    return new Error('Unknown error');
  }
  
  return error;
}

/**
 * Generate a unique error ID
 */
function generateErrorId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Error tracking service
 */
class ErrorTracker {
  private errors: Map<string, TrackedError> = new Map();
  private errorCallbacks: Array<(error: TrackedError) => void> = [];
  private recoveryCallbacks: Map<ErrorCategory, Array<(error: TrackedError) => boolean>> = new Map();
  
  /**
   * Track an error with optional context and tracking options
   */
  trackError(
    errorOrMessage: unknown,
    optionsOrCategory?: ErrorTrackingOptions | ErrorCategory,
    context?: Record<string, any>
  ): TrackedError {
    // Normalize error to Error instance
    const normalizedError = normalizeError(errorOrMessage);
    
    // Process options
    let options: ErrorTrackingOptions = {};
    
    if (typeof optionsOrCategory === 'string') {
      // If second param is a string, treat as category
      options.category = optionsOrCategory as ErrorCategory;
      if (context) {
        options.context = context;
      }
    } else if (optionsOrCategory && typeof optionsOrCategory === 'object') {
      // Otherwise use as options object
      options = optionsOrCategory;
    }
    
    // Merge with defaults
    const mergedOptions: ErrorTrackingOptions = {
      ...defaultOptions,
      ...options
    };
    
    // Auto-determine category if not specified
    if (!mergedOptions.category || mergedOptions.category === ErrorCategory.UNKNOWN) {
      mergedOptions.category = categorizeError(normalizedError);
    }
    
    // Auto-determine severity if not specified
    if (!mergedOptions.severity) {
      mergedOptions.severity = determineSeverity(normalizedError, mergedOptions.category);
    }
    
    // Extract status code if available
    const statusCode = extractStatusCode(normalizedError);
    
    // Suggest recovery strategy if not specified
    if (!mergedOptions.recoveryStrategy) {
      mergedOptions.recoveryStrategy = suggestRecoveryStrategy(
        mergedOptions.category,
        mergedOptions.severity
      );
    }
    
    // Create tracked error object
    const trackedError: TrackedError = {
      id: generateErrorId(),
      timestamp: Date.now(),
      message: normalizedError.message,
      stack: normalizedError.stack,
      category: mergedOptions.category,
      severity: mergedOptions.severity,
      component: mergedOptions.component,
      recoverable: mergedOptions.recoverable === undefined ? true : mergedOptions.recoverable,
      retryable: mergedOptions.retryable === undefined ? false : mergedOptions.retryable,
      maxRetries: mergedOptions.maxRetries || 3,
      retryCount: 0,
      context: mergedOptions.context,
      recoveryStrategy: mergedOptions.recoveryStrategy,
      userId: mergedOptions.userId,
      errorCode: mergedOptions.errorCode,
      statusCode,
      tags: mergedOptions.tags || [],
      originalError: normalizedError
    };
    
    // Store the error
    this.errors.set(trackedError.id, trackedError);
    
    // Send to telemetry
    telemetry.trackError({
      name: `${trackedError.category} error`,
      message: trackedError.message,
      category: trackedError.category,
      severity: this.mapSeverityToTelemetry(trackedError.severity),
      component: trackedError.component,
      details: {
        ...trackedError.context,
        errorId: trackedError.id,
        statusCode: trackedError.statusCode,
        errorCode: trackedError.errorCode,
        stack: trackedError.stack,
        recoverable: trackedError.recoverable,
        retryable: trackedError.retryable
      },
      code: trackedError.errorCode,
      recoverable: trackedError.recoverable,
      retryAttempts: trackedError.retryCount
    });
    
    // Notify error listeners
    this.notifyErrorListeners(trackedError);
    
    // Apply recovery strategy if possible
    this.applyRecoveryStrategy(trackedError);
    
    return trackedError;
  }
  
  /**
   * Register an error callback
   */
  onError(callback: (error: TrackedError) => void): () => void {
    this.errorCallbacks.push(callback);
    
    // Return function to unregister
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Register a recovery handler for a specific error category
   */
  registerRecoveryHandler(
    category: ErrorCategory,
    handler: (error: TrackedError) => boolean
  ): () => void {
    if (!this.recoveryCallbacks.has(category)) {
      this.recoveryCallbacks.set(category, []);
    }
    
    this.recoveryCallbacks.get(category)!.push(handler);
    
    // Return function to unregister
    return () => {
      const handlers = this.recoveryCallbacks.get(category);
      if (handlers) {
        this.recoveryCallbacks.set(
          category,
          handlers.filter(h => h !== handler)
        );
      }
    };
  }
  
  /**
   * Retry an error
   */
  retryError(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (!error || !error.retryable || error.retryCount >= error.maxRetries) {
      return false;
    }
    
    // Increment retry count
    error.retryCount += 1;
    this.errors.set(errorId, error);
    
    // Track retry in telemetry
    telemetry.trackCustom(`${error.category} error retry`, {
      errorId: error.id,
      retryCount: error.retryCount,
      maxRetries: error.maxRetries,
      errorMessage: error.message,
      category: error.category
    });
    
    // Apply recovery strategy again
    return this.applyRecoveryStrategy(error);
  }
  
  /**
   * Mark an error as resolved
   */
  resolveError(errorId: string, resolution?: string): void {
    const error = this.errors.get(errorId);
    if (!error) {
      return;
    }
    
    // Remove from active errors
    this.errors.delete(errorId);
    
    // Track resolution in telemetry
    telemetry.trackCustom(`${error.category} error resolved`, {
      errorId: error.id,
      errorMessage: error.message,
      category: error.category,
      resolution: resolution || 'manual',
      durationMs: Date.now() - error.timestamp
    });
  }
  
  /**
   * Get all tracked errors
   */
  getErrors(): TrackedError[] {
    return Array.from(this.errors.values());
  }
  
  /**
   * Get error by ID
   */
  getError(errorId: string): TrackedError | undefined {
    return this.errors.get(errorId);
  }
  
  /**
   * Apply recovery strategy to an error
   */
  private applyRecoveryStrategy(error: TrackedError): boolean {
    // If not recoverable, don't attempt recovery
    if (!error.recoverable) {
      return false;
    }
    
    // Try category-specific handlers first
    const handlers = this.recoveryCallbacks.get(error.category);
    if (handlers) {
      for (const handler of handlers) {
        try {
          if (handler(error)) {
            // Handler successfully recovered
            this.resolveError(error.id, 'handler');
            return true;
          }
        } catch (e) {
          // Handler failed, continue to next handler
          console.error('Error recovery handler failed:', e);
        }
      }
    }
    
    // No handler succeeded, apply default strategy
    switch (error.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        // Already handled by retryError method
        return false;
        
      case RecoveryStrategy.FALLBACK:
        // No default fallback behavior
        return false;
        
      case RecoveryStrategy.RELOAD:
        // No automatic reload to avoid disrupting user
        return false;
        
      case RecoveryStrategy.RESET:
        // No default reset behavior
        return false;
        
      default:
        return false;
    }
  }
  
  /**
   * Notify error listeners of a new error
   */
  private notifyErrorListeners(error: TrackedError): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(error);
      } catch (e) {
        console.error('Error in error callback:', e);
      }
    }
  }
  
  /**
   * Map internal severity to telemetry severity
   */
  private mapSeverityToTelemetry(severity: ErrorSeverity): 'debug' | 'info' | 'warning' | 'error' | 'critical' {
    switch (severity) {
      case ErrorSeverity.DEBUG:
        return 'debug';
      case ErrorSeverity.INFO:
        return 'info';
      case ErrorSeverity.WARNING:
        return 'warning';
      case ErrorSeverity.ERROR:
        return 'error';
      case ErrorSeverity.CRITICAL:
        return 'critical';
      default:
        return 'error';
    }
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

export default errorTracker;