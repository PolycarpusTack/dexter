import React from 'react';
import { ErrorCategory, categorizeError, showErrorNotification } from './errorHandling';
import { Logger } from './logger';

export interface ApiErrorOptions {
  silent?: boolean;
  context?: Record<string, any>;
  retryable?: boolean;
  userMessage?: string;
  logLevel?: 'error' | 'warn' | 'info';
}

export interface ErrorDetails {
  message: string;
  code?: string;
  status?: number;
  category: ErrorCategory;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

export interface ErrorRecoveryStrategy {
  shouldAttempt: (error: any) => boolean;
  execute: (error: any) => Promise<void>;
  maxAttempts?: number;
}

export class ApiErrorHandler {
  private static instance: ApiErrorHandler;
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private errorLog: ErrorDetails[] = [];
  private maxLogSize = 100;

  private constructor() {
    this.initializeDefaultStrategies();
  }

  static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler();
    }
    return ApiErrorHandler.instance;
  }

  private initializeDefaultStrategies() {
    // Network error recovery strategy
    this.registerRecoveryStrategy('network', {
      shouldAttempt: (error) => {
        const category = categorizeError(error);
        return category === 'network';
      },
      execute: async (_) => {
        // Wait for network to be back online
        if (!navigator.onLine) {
          await this.waitForOnline();
        }
      },
      maxAttempts: 3
    });

    // Auth error recovery strategy
    this.registerRecoveryStrategy('auth', {
      shouldAttempt: (error) => {
        const category = categorizeError(error);
        return category === 'authorization' || 
               (error.response?.status === 401 || error.response?.status === 403);
      },
      execute: async (error) => {
        // Attempt to refresh token or redirect to login
        if (error.response?.status === 401) {
          // Token might be expired, try to refresh
          try {
            await this.refreshAuthToken();
          } catch {
            // Refresh failed, redirect to login
            window.location.href = '/login?returnUrl=' + encodeURIComponent(window.location.pathname);
          }
        }
      },
      maxAttempts: 1
    });
  }

  private async waitForOnline(): Promise<void> {
    return new Promise((resolve) => {
      if (navigator.onLine) {
        resolve();
      } else {
        const handleOnline = () => {
          window.removeEventListener('online', handleOnline);
          resolve();
        };
        window.addEventListener('online', handleOnline);
      }
    });
  }

  private async refreshAuthToken(): Promise<void> {
    // This would be implemented based on your auth system
    // For now, it's a placeholder
    throw new Error('Token refresh not implemented');
  }

  registerRecoveryStrategy(name: string, strategy: ErrorRecoveryStrategy) {
    this.recoveryStrategies.set(name, strategy);
  }

  async handleError(error: any, options: ApiErrorOptions = {}): Promise<void> {
    const errorDetails = this.createErrorDetails(error, options);
    
    // Log error
    this.logError(errorDetails, options.logLevel);
    
    // Store in error log
    this.addToErrorLog(errorDetails);
    
    // Show notification unless silent
    if (!options.silent) {
      this.notifyUser(errorDetails, options.userMessage);
    }
    
    // Attempt recovery if applicable
    if (options.retryable !== false) {
      await this.attemptRecovery(error);
    }
  }

  public categorizeError(error: any): ErrorCategory {
    return categorizeError(error);
  }

  public createErrorDetails(error: any, options: ApiErrorOptions): ErrorDetails {
    const category = categorizeError(error);
    const timestamp = new Date().toISOString();
    
    let message = 'An unexpected error occurred';
    let code: string | undefined;
    let status: number | undefined;
    let stack: string | undefined;
    
    if (error.response) {
      // API error response
      status = error.response.status;
      message = error.response.data?.message || error.response.statusText || message;
      code = error.response.data?.code;
    } else if (error.message) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    if (error.stack) {
      stack = error.stack;
    }
    
    return {
      message,
      code,
      status,
      category,
      timestamp,
      context: options.context,
      stack
    };
  }

  private logError(errorDetails: ErrorDetails, level: 'error' | 'warn' | 'info' = 'error') {
    const logData = {
      ...errorDetails,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    switch (level) {
      case 'warn':
        Logger.warn('API Error', logData);
        break;
      case 'info':
        Logger.info('API Error', logData);
        break;
      default:
        Logger.error('API Error', logData);
    }
  }

  private addToErrorLog(errorDetails: ErrorDetails) {
    this.errorLog.unshift(errorDetails);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop();
    }
  }

  private notifyUser(errorDetails: ErrorDetails, customMessage?: string) {
    const message = customMessage || this.getUserFriendlyMessage(errorDetails);
    showErrorNotification({
      title: errorDetails.code ? `Error ${errorDetails.code}` : 'Error',
      message,
      autoClose: errorDetails.category === 'validation' ? 10000 : 5000
    });
  }

  public getUserFriendlyMessage(errorDetails: ErrorDetails): string {
    switch (errorDetails.category) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'authorization':
        return 'Your session has expired. Please log in again.';
      case 'validation':
        return errorDetails.message || 'Please check your input and try again.';
      case 'server_error':
        return 'The server encountered an error. Please try again later.';
      case 'not_found':
        return 'The requested resource was not found.';
      case 'timeout':
        return 'The request timed out. Please try again.';
      case 'client_error':
        return 'There was an error with your request. Please check and try again.';
      case 'parsing':
        return 'Error processing the response. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  public async attemptRecovery(error: any): Promise<boolean> {
    for (const [name, strategy] of this.recoveryStrategies) {
      if (strategy.shouldAttempt(error)) {
        try {
          Logger.info(`Attempting ${name} recovery strategy`);
          await strategy.execute(error);
          Logger.info(`${name} recovery strategy succeeded`);
          return true;
        } catch (recoveryError) {
          // Convert unknown error to LogData type or undefined
          const logData = recoveryError ? { 
            error: typeof recoveryError === 'object' ? recoveryError : String(recoveryError) 
          } : undefined;
          Logger.error(`${name} recovery strategy failed`, logData);
        }
      }
    }
    return false;
  }

  getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  clearErrorLog() {
    this.errorLog = [];
  }

  getErrorsByCategory(category: ErrorCategory): ErrorDetails[] {
    return this.errorLog.filter(error => error.category === category);
  }

  getRecentErrors(count: number = 10): ErrorDetails[] {
    return this.errorLog.slice(0, count);
  }
}

// Export convenience functions
export const apiErrorHandler = ApiErrorHandler.getInstance();

export const handleApiError = (error: any, options?: ApiErrorOptions) => 
  apiErrorHandler.handleError(error, options);

export const registerErrorRecoveryStrategy = (name: string, strategy: ErrorRecoveryStrategy) =>
  apiErrorHandler.registerRecoveryStrategy(name, strategy);

export const getErrorLog = () => apiErrorHandler.getErrorLog();
export const clearErrorLog = () => apiErrorHandler.clearErrorLog();
export const getErrorsByCategory = (category: ErrorCategory) => 
  apiErrorHandler.getErrorsByCategory(category);
export const getRecentErrors = (count?: number) => 
  apiErrorHandler.getRecentErrors(count);

// Create a wrapper for API calls that includes error handling
export function withApiErrorHandling<T>(
  apiCall: () => Promise<T>,
  options?: ApiErrorOptions
): Promise<T> {
  return apiCall().catch(error => {
    handleApiError(error, options);
    throw error; // Re-throw to allow caller to handle as well
  });
}

// HOC for components to add API error handling
export function withApiErrorHandler<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => {
    React.useEffect(() => {
      // Could add component-specific error handling setup here
      return () => {
        // Cleanup if needed
      };
    }, []);

    return React.createElement(Component, props);
  };
}
