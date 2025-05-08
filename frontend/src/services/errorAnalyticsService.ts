// File: src/services/errorAnalyticsService.ts

import { ErrorCategory } from '../utils/errorHandling/errorHandling';
import ErrorFactory, { EnhancedError } from '../utils/errorHandling/errorFactory';
import { logErrorToService } from '../utils/errorHandling/errorTracking';

/**
 * Interface for error analytics entry
 */
export interface ErrorAnalyticsEntry {
  /** Error ID (UUID) */
  id: string;
  /** Timestamp when the error occurred */
  timestamp: string;
  /** Error message */
  message: string;
  /** Error category */
  category: ErrorCategory;
  /** Component or function where the error occurred */
  source: string;
  /** Error stack trace */
  stack?: string;
  /** User ID if available */
  userId?: string;
  /** Session ID if available */
  sessionId?: string;
  /** URL where the error occurred */
  url: string;
  /** Browser and OS information */
  userAgent: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Whether this is a repeated error */
  isRepeated: boolean;
  /** Error frequency (for repeated errors) */
  frequency?: number;
  /** Error impact level */
  impact: 'High' | 'Medium' | 'Low';
}

/**
 * Error analytics storage service
 */
class ErrorAnalyticsService {
  private storageKey = 'dexter_error_analytics';
  private sessionId: string;
  private errors: ErrorAnalyticsEntry[] = [];
  private initialized = false;
  private maxStoredErrors = 100;
  
  constructor() {
    // Generate session ID
    this.sessionId = this.generateSessionId();
    
    // Try to load cached errors
    this.loadErrors();
    
    // Mark as initialized
    this.initialized = true;
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Load errors from localStorage
   */
  private loadErrors(): void {
    try {
      const storedErrors = localStorage.getItem(this.storageKey);
      
      if (storedErrors) {
        this.errors = JSON.parse(storedErrors);
      }
    } catch (error) {
      console.error('Failed to load error analytics:', error);
      
      // Clear corrupted data
      localStorage.removeItem(this.storageKey);
      this.errors = [];
    }
  }
  
  /**
   * Save errors to localStorage
   */
  private saveErrors(): void {
    try {
      // Trim errors to maximum limit
      if (this.errors.length > this.maxStoredErrors) {
        this.errors = this.errors.slice(-this.maxStoredErrors);
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(this.errors));
    } catch (error) {
      console.error('Failed to save error analytics:', error);
    }
  }
  
  /**
   * Determine error impact level
   */
  private determineImpact(error: unknown): 'High' | 'Medium' | 'Low' {
    if (error instanceof EnhancedError) {
      // High impact errors
      if (
        error.category === 'server_error' ||
        error.category === 'auth_error' ||
        error.metadata?.impact === 'high'
      ) {
        return 'High';
      }
      
      // Medium impact errors
      if (
        error.category === 'client_error' ||
        error.category === 'network' ||
        error.category === 'timeout' ||
        error.metadata?.impact === 'medium'
      ) {
        return 'Medium';
      }
      
      // Low impact errors by default
      return 'Low';
    }
    
    // Default to medium for unknown errors
    return 'Medium';
  }
  
  /**
   * Find similar error by message and category
   */
  private findSimilarError(message: string, category: ErrorCategory): ErrorAnalyticsEntry | undefined {
    // Find error with similar message and same category
    return this.errors.find(error => 
      error.category === category && 
      this.isSimilarMessage(error.message, message)
    );
  }
  
  /**
   * Check if two error messages are similar
   */
  private isSimilarMessage(message1: string, message2: string): boolean {
    // Simple similarity check based on first few words
    const words1 = message1.split(' ', 5).join(' ');
    const words2 = message2.split(' ', 5).join(' ');
    
    return words1 === words2;
  }
  
  /**
   * Generate error ID
   */
  private generateErrorId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Record error in analytics
   */
  public recordError(error: unknown, context: Record<string, unknown> = {}): void {
    try {
      if (!this.initialized) {
        this.loadErrors();
        this.initialized = true;
      }
      
      // Convert to EnhancedError if needed
      const enhancedError = error instanceof EnhancedError 
        ? error 
        : ErrorFactory.create(error);
      
      // Get basic error information
      const message = enhancedError.message;
      const category = enhancedError.category as ErrorCategory;
      const stack = enhancedError.stack;
      const source = context.source as string || 'unknown';
      const userId = context.userId as string;
      const url = window.location.href;
      const userAgent = navigator.userAgent;
      const metadata = {
        ...enhancedError.metadata,
        ...context
      };
      
      // Check if this is a repeated error
      const similarError = this.findSimilarError(message, category);
      
      if (similarError) {
        // Update existing error
        similarError.frequency = (similarError.frequency || 1) + 1;
        similarError.timestamp = new Date().toISOString();
        similarError.isRepeated = true;
        
        // Update impact if higher
        if (this.determineImpact(enhancedError) === 'High' && similarError.impact !== 'High') {
          similarError.impact = 'High';
        } else if (this.determineImpact(enhancedError) === 'Medium' && similarError.impact === 'Low') {
          similarError.impact = 'Medium';
        }
      } else {
        // Create new error entry
        const errorEntry: ErrorAnalyticsEntry = {
          id: this.generateErrorId(),
          timestamp: new Date().toISOString(),
          message,
          category,
          source,
          stack,
          userId,
          sessionId: this.sessionId,
          url,
          userAgent,
          metadata,
          isRepeated: false,
          impact: this.determineImpact(enhancedError)
        };
        
        // Add to errors collection
        this.errors.push(errorEntry);
      }
      
      // Save errors
      this.saveErrors();
      
      // Also log to Sentry with analytics context
      logErrorToService(error, {
        ...context,
        errorAnalyticsTracked: true,
        sessionId: this.sessionId
      });
    } catch (analyticsError) {
      // Don't let analytics tracking cause more problems
      console.error('Error in error analytics:', analyticsError);
    }
  }
  
  /**
   * Get all recorded errors
   */
  public getErrors(): ErrorAnalyticsEntry[] {
    if (!this.initialized) {
      this.loadErrors();
      this.initialized = true;
    }
    
    return this.errors;
  }
  
  /**
   * Get error count by category
   */
  public getErrorCountByCategory(): Record<ErrorCategory, number> {
    if (!this.initialized) {
      this.loadErrors();
      this.initialized = true;
    }
    
    const counts: Partial<Record<ErrorCategory, number>> = {};
    
    for (const error of this.errors) {
      counts[error.category] = (counts[error.category] || 0) + 1;
    }
    
    return counts as Record<ErrorCategory, number>;
  }
  
  /**
   * Get error count by impact
   */
  public getErrorCountByImpact(): Record<'High' | 'Medium' | 'Low', number> {
    if (!this.initialized) {
      this.loadErrors();
      this.initialized = true;
    }
    
    const counts: Record<'High' | 'Medium' | 'Low', number> = {
      'High': 0,
      'Medium': 0,
      'Low': 0
    };
    
    for (const error of this.errors) {
      counts[error.impact]++;
    }
    
    return counts;
  }
  
  /**
   * Clear all error analytics data
   */
  public clearErrors(): void {
    this.errors = [];
    localStorage.removeItem(this.storageKey);
  }
}

// Create and export singleton instance
export const errorAnalytics = new ErrorAnalyticsService();

// Extend window with error analytics
declare global {
  interface Window {
    DexterAnalytics?: {
      recordError: (error: unknown, context?: Record<string, unknown>) => void;
      getErrors: () => ErrorAnalyticsEntry[];
      clearErrors: () => void;
    };
  }
}

// Add to window for debugging
if (typeof window !== 'undefined') {
  window.DexterAnalytics = {
    recordError: errorAnalytics.recordError.bind(errorAnalytics),
    getErrors: errorAnalytics.getErrors.bind(errorAnalytics),
    clearErrors: errorAnalytics.clearErrors.bind(errorAnalytics),
  };
}

export default errorAnalytics;
