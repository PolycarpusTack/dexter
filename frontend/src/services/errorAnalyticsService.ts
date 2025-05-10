// File: src/services/errorAnalyticsService.ts

import { ErrorAnalyticsData, ErrorCountByCategory, ErrorCountByTime, ErrorDetails, TimeRange } from '../types/index';

/**
 * Service configuration
 */
interface ErrorAnalyticsConfig {
  applicationId: string;
  environment: string;
  version: string;
  endpoint?: string;
  batchSize?: number;
  flushInterval?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ErrorAnalyticsConfig = {
  applicationId: 'dexter',
  environment: 'development',
  version: '1.0.0',
  endpoint: '/api/analytics',
  batchSize: 10,
  flushInterval: 30000 // 30 seconds
};

/**
 * Error data for reporting
 */
interface ErrorReport {
  timestamp: string;
  error: string;
  message: string;
  stack?: string;
  metadata: Record<string, any>;
}

/**
 * Error analytics service
 */
class ErrorAnalyticsService {
  private config: ErrorAnalyticsConfig = DEFAULT_CONFIG;
  private buffer: ErrorReport[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private initialized = false;
  
  /**
   * Initialize the service with configuration
   * 
   * @param config - Service configuration
   */
  public initialize(config: Partial<ErrorAnalyticsConfig> = {}): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialized = true;
    
    console.log(`Error Analytics Service initialized for ${this.config.applicationId} (${this.config.environment})`);
    
    // Start flush timer
    this.startFlushTimer();
  }
  
  /**
   * Shutdown the service
   */
  public shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush any remaining errors
    if (this.buffer.length > 0) {
      this.flush();
    }
    
    this.initialized = false;
  }
  
  /**
   * Report an error
   * 
   * @param error - The error to report
   * @param metadata - Additional context
   */
  public reportError(error: Error, metadata: Record<string, any> = {}): void {
    if (!this.initialized) {
      console.warn('Error Analytics Service not initialized');
      return;
    }
    
    // Create error report
    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      error: error.name,
      message: error.message,
      stack: error.stack,
      metadata: {
        ...metadata,
        environment: this.config.environment,
        version: this.config.version
      }
    };
    
    // Add to buffer
    this.buffer.push(report);
    
    // Flush if buffer reaches batch size
    if (this.buffer.length >= (this.config.batchSize || 10)) {
      this.flush();
    }
  }
  
  /**
   * Flush the error buffer
   */
  private flush(): void {
    if (this.buffer.length === 0) return;
    
    // In a real implementation, send to a backend endpoint
    // For now, just log to console
    console.log(`Flushing ${this.buffer.length} errors to analytics`);
    
    // In development, we don't actually send anything
    if (process.env.NODE_ENV !== 'production') {
      console.debug('Error analytics (development mode):', this.buffer);
      this.buffer = [];
      return;
    }
    
    // In production, we would send to a real endpoint
    // fetch(this.config.endpoint, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     applicationId: this.config.applicationId,
    //     errors: this.buffer
    //   })
    // })
    //   .then(() => {
    //     this.buffer = [];
    //   })
    //   .catch(err => {
    //     console.error('Failed to send error analytics:', err);
    //   });
    
    // For now, just clear the buffer
    this.buffer = [];
  }
  
  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval || 30000);
  }
  
  /**
   * Get error analytics data
   * 
   * @param options - Query options
   * @returns Analytics data
   */
  public async getErrorAnalytics(options: {
    timeRange?: TimeRange;
    category?: string;
    impact?: string;
  } = {}): Promise<ErrorAnalyticsData> {
    // In a real implementation, this would make an API call
    // For demonstration, return mock data
    return this.generateMockErrorAnalytics(options);
  }
  
  /**
   * Get error occurrences
   * 
   * @param errorId - Error ID to get occurrences for
   * @param options - Query options
   * @returns Error occurrences
   */
  public async getErrorOccurrences(
    errorId: string,
    options: { limit?: number } = {}
  ): Promise<{ occurrences: any[] }> {
    // Mock data
    return {
      occurrences: Array.from({ length: options.limit || 5 }, (_, i) => ({
        id: `${errorId}-occ-${i}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        userId: i % 2 === 0 ? `user-${i}` : null,
        details: `Occurrence details for ${errorId}`
      }))
    };
  }
  
  /**
   * Generate mock analytics data for development
   * 
   * @param options - Query options
   * @returns Mock analytics data
   */
  public generateMockErrorAnalytics(options: {
    timeRange?: TimeRange;
    category?: string;
    impact?: string;
  } = {}): ErrorAnalyticsData {
    // Mock category data
    const byCategory: ErrorCountByCategory[] = [
      { name: 'network', count: 25, color: '#FF6B6B' },
      { name: 'client_error', count: 18, color: '#FFD166' },
      { name: 'server_error', count: 12, color: '#F72585' },
      { name: 'timeout', count: 8, color: '#FF9E7A' },
      { name: 'validation_error', count: 6, color: '#7209B7' },
      { name: 'auth_error', count: 4, color: '#4CC9F0' },
      { name: 'llm_api_error', count: 3, color: '#7678ED' },
      { name: 'unknown', count: 2, color: '#B8B8B8' }
    ];
    
    // Create mock time data based on time range
    const timePoints = getTimePointsFromRange(options.timeRange || '24h');
    const byTime: ErrorCountByTime[] = timePoints.map(time => {
      // Generate random data with some patterns
      const baseValue = Math.floor(Math.random() * 5);
      return {
        time,
        network: Math.max(0, baseValue + Math.floor(Math.random() * 8)),
        client_error: Math.max(0, baseValue + Math.floor(Math.random() * 6)),
        server_error: Math.max(0, baseValue + Math.floor(Math.random() * 4) - 1),
        timeout: Math.max(0, baseValue + Math.floor(Math.random() * 3) - 1),
        validation_error: Math.max(0, baseValue + Math.floor(Math.random() * 2) - 1),
        auth_error: Math.max(0, Math.floor(Math.random() * 2)),
        llm_api_error: Math.max(0, Math.floor(Math.random() * 2) - 1),
        unknown: Math.max(0, Math.floor(Math.random() * 2) - 1)
      };
    });
    
    // Mock error details
    const allErrors: ErrorDetails[] = [
      {
        id: 'err-001',
        type: 'NetworkError',
        message: 'Failed to fetch from API: Network error',
        category: 'network',
        impact: 'High',
        count: 15,
        userCount: 43,
        firstSeen: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      },
      {
        id: 'err-002',
        type: 'ApiError',
        message: 'API returned 500 Internal Server Error',
        category: 'server_error',
        impact: 'High',
        count: 12,
        userCount: 28,
        firstSeen: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
      },
      {
        id: 'err-003',
        type: 'ValidationError',
        message: 'Invalid input: name field is required',
        category: 'validation_error',
        impact: 'Low',
        count: 6,
        userCount: 5,
        firstSeen: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      },
      {
        id: 'err-004',
        type: 'TimeoutError',
        message: 'Request timed out after 30000ms',
        category: 'timeout',
        impact: 'Medium',
        count: 8,
        userCount: 15,
        firstSeen: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
      },
      {
        id: 'err-005',
        type: 'AuthError',
        message: 'Authentication failed: invalid token',
        category: 'auth_error',
        impact: 'Medium',
        count: 4,
        userCount: 3,
        firstSeen: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'err-006',
        type: 'ClientError',
        message: 'Invalid query parameter: limit must be a number',
        category: 'client_error',
        impact: 'Low',
        count: 18,
        userCount: 10,
        firstSeen: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
      },
      {
        id: 'err-007',
        type: 'LLMApiError',
        message: 'Failed to connect to LLM service: connection refused',
        category: 'llm_api_error',
        impact: 'High',
        count: 3,
        userCount: 2,
        firstSeen: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
      },
      {
        id: 'err-008',
        type: 'UnknownError',
        message: 'An unknown error occurred',
        category: 'unknown',
        impact: 'Low',
        count: 2,
        userCount: 2,
        firstSeen: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
        lastSeen: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString()
      }
    ];
    
    // Filter errors based on category and impact if provided
    let filteredErrors = [...allErrors];
    if (options.category) {
      filteredErrors = filteredErrors.filter(error => error.category === options.category);
    }
    if (options.impact) {
      filteredErrors = filteredErrors.filter(error => error.impact === options.impact);
    }
    
    // Sort by count (descending)
    const topErrors = filteredErrors.sort((a, b) => b.count - a.count);
    
    // Generate summary
    const summary = {
      totalErrors: byCategory.reduce((sum, category) => sum + category.count, 0),
      uniqueErrors: allErrors.length,
      affectedUsers: allErrors.reduce((sum, error) => sum + error.userCount, 0),
      highImpactErrors: allErrors.filter(error => error.impact === 'High').length,
      mostCommonCategory: byCategory.length > 0 ? [...byCategory].sort((a, b) => b.count - a.count)[0]?.name || 'unknown' : 'unknown',
      trendingErrors: [
        {
          id: 'err-001',
          type: 'NetworkError',
          count: 15,
          trend: 25 // percentage increase
        },
        {
          id: 'err-004',
          type: 'TimeoutError',
          count: 8,
          trend: 15 // percentage increase
        }
      ]
    };
    
    return {
      summary,
      byCategory,
      byTime,
      topErrors
    };
  }
}

/**
 * Helper to generate time points based on time range
 */
function getTimePointsFromRange(timeRange: TimeRange): number[] {
  switch (timeRange) {
    case '1h':
      return Array.from({ length: 12 }, (_, i) => i); // 5-minute intervals
    case '6h':
      return Array.from({ length: 24 }, (_, i) => i); // 15-minute intervals
    case '24h':
      return Array.from({ length: 24 }, (_, i) => i); // 1-hour intervals
    case '7d':
      return Array.from({ length: 28 }, (_, i) => i); // 6-hour intervals
    case '30d':
      return Array.from({ length: 30 }, (_, i) => i); // 1-day intervals
    default:
      return Array.from({ length: 24 }, (_, i) => i); // Default to 24 hours
  }
}

// Export a singleton instance
export default new ErrorAnalyticsService();
