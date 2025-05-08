// src/utils/errorHandling/errorTracking.ts

import * as Sentry from '@sentry/react';

/**
 * Interface for error tracking initialization options
 */
export interface ErrorTrackingOptions {
  /** Environment name (development, production, etc.) */
  environment?: string;
  /** Release version */
  release?: string;
}

/**
 * Initialize error tracking with Sentry
 * @param options - Configuration options
 */
export function initErrorTracking(options: ErrorTrackingOptions = {}): void {
  const { environment = 'development', release = '1.0.0' } = options;
  
  // Only initialize in production or if explicitly enabled for development
  const enableInDev = import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true';
  const isProduction = import.meta.env.MODE === 'production';
  
  if (!isProduction && !enableInDev) {
    console.log('Error tracking disabled in development mode');
    return;
  }
  
  // Get Sentry DSN from environment variables
  const dsn = import.meta.env.VITE_SENTRY_FRONTEND_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN not provided. Error tracking will be disabled.');
    return;
  }
  
  try {
    Sentry.init({
      dsn,
      environment,
      release,
      beforeSend: (event, hint) => {
        // Don't send events in development unless explicitly enabled
        if (!isProduction && !enableInDev) {
          return null;
        }
        
        // Apply sanitization
        return sanitizeErrorEvent(event, hint);
      },
      // Adjust sample rate as needed
      sampleRate: 0.9,
      // Only capture errors by default
      defaultIntegrations: false,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Integrations.GlobalHandlers({
          onunhandledrejection: true,
          onerror: true
        }),
        new Sentry.Integrations.FunctionToString(),
        new Sentry.Integrations.InboundFilters(),
        new Sentry.Integrations.LinkedErrors(),
      ],
      // Optional performance monitoring
      tracesSampleRate: 0.1
    });
    
    // Set initial global tags/context
    Sentry.setTag('app', 'dexter-frontend');
    
    console.log(`Error tracking initialized (environment: ${environment})`);
  } catch (error) {
    console.error('Failed to initialize error tracking:', error);
  }
}

/**
 * Interface for an Enhanced Error object
 */
export interface EnhancedErrorLike {
  category?: string;
  retryable?: boolean;
  metadata?: Record<string, unknown>;
  retryCount?: number;
  [key: string]: unknown;
}

/**
 * Log an error to Sentry with additional context
 * @param error - The error object
 * @param context - Additional context information
 */
export function logErrorToService(
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  // Check if it's an EnhancedError or regular Error
  const isEnhancedError = error && 
    typeof error === 'object' && 
    'category' in (error as object);
  
  try {
    // Set error context and tags based on the error type
    if (isEnhancedError) {
      const enhancedError = error as EnhancedErrorLike;
      
      // For EnhancedError objects, use their properties
      if (enhancedError.category) {
        Sentry.setTag('error.category', enhancedError.category);
      }
      
      if (enhancedError.retryable !== undefined) {
        Sentry.setTag('error.retryable', String(enhancedError.retryable));
      }
      
      if (enhancedError.metadata) {
        Sentry.setContext('error.metadata', enhancedError.metadata);
      }
      
      // Include retry information if available
      if (enhancedError.retryCount !== undefined) {
        Sentry.setTag('error.retryCount', String(enhancedError.retryCount));
      }
    }
    
    // Add any additional context
    if (context && typeof context === 'object') {
      Sentry.setContext('additionalContext', context);
    }
    
    // Capture the error
    Sentry.captureException(error);
  } catch (sentryError) {
    // Fail silently in production, log in development
    if (import.meta.env.DEV) {
      console.error('Failed to log error to Sentry:', sentryError);
      console.error('Original error:', error);
    }
  }
}

/**
 * Add a breadcrumb to the current scope
 * Useful for tracking user actions or application state changes
 * 
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category
 * @param data - Additional data to include
 * @param level - Breadcrumb severity level
 */
export function addBreadcrumb(
  message: string,
  category: string = 'default',
  data?: Record<string, unknown>,
  level: Sentry.Severity = Sentry.Severity.Info
): void {
  try {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level
    });
  } catch (error) {
    // Silently fail if Sentry isn't initialized
    if (import.meta.env.DEV) {
      console.warn('Failed to add breadcrumb:', error);
    }
  }
}

/**
 * Set a user ID in Sentry to associate errors with a specific user
 * 
 * @param userId - User ID
 * @param userData - Additional user data
 */
export function setUserContext(
  userId: string | null,
  userData?: Record<string, unknown>
): void {
  try {
    if (userId) {
      Sentry.setUser({
        id: userId,
        ...userData
      });
    } else {
      // Clear user context if null is passed
      Sentry.setUser(null);
    }
  } catch (error) {
    // Silently fail if Sentry isn't initialized
    if (import.meta.env.DEV) {
      console.warn('Failed to set user context:', error);
    }
  }
}

/**
 * Sanitize error event before sending to Sentry
 * @param event - Sentry event object
 * @param hint - Sentry hint object
 * @returns Sanitized event or null to prevent sending
 */
function sanitizeErrorEvent(event: Sentry.Event, hint?: Sentry.EventHint): Sentry.Event | null {
  try {
    // Skip sending if we can identify it as a specific type of error 
    // that should never be reported
    
    // Get the original exception
    const originalException = hint && hint.originalException;
    const errorMessage = originalException && 
      typeof originalException === 'object' && 
      'message' in originalException ? 
      (originalException as Error).message : '';
    
    // Skip irrelevant errors
    if (errorMessage) {
      // Skip CORS errors that might contain local tokens
      if (errorMessage.includes('Cross-Origin Request Blocked')) {
        return null;
      }
      
      // Skip user-canceled operations
      if (errorMessage.includes('user aborted') || 
          errorMessage.includes('canceled by user')) {
        return null;
      }
    }
    
    // Remove potential sensitive data from request URLs
    if (event.request && event.request.url) {
      // Replace token parameters
      event.request.url = event.request.url.replace(
        /([?&](token|key|auth|password|secret)=)[^&]+/gi,
        '$1[REDACTED]'
      );
    }
    
    // Sanitize error message if needed
    if (event.exception && event.exception.values) {
      event.exception.values.forEach(exception => {
        if (exception.value) {
          // Remove any potential sensitive data in error messages
          exception.value = exception.value
            .replace(/Bearer [a-zA-Z0-9._-]+/g, 'Bearer [REDACTED]')
            .replace(/([?&]token=)[^&]+/g, '$1[REDACTED]')
            .replace(/([?&]key=)[^&]+/g, '$1[REDACTED]');
        }
      });
    }
    
    // Return the sanitized event
    return event;
  } catch (error) {
    // If sanitization fails, don't send the event
    console.error('Error sanitizing Sentry event:', error);
    return null;
  }
}

/**
 * SentryErrorBoundary component for export
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

export default {
  initErrorTracking,
  logErrorToService,
  addBreadcrumb,
  setUserContext,
  SentryErrorBoundary
};
