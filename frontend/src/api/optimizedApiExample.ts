// File: frontend/src/api/optimizedApiExample.ts

import { apiClient, persistentClient } from './apiClient';
import { requestBatcher } from '../utils/requestBatcher';
import { cached } from '../utils/requestCache';
import { deduplicated } from '../utils/requestDeduplicator';

/**
 * Example service demonstrating optimized API usage
 */
export class OptimizedIssueService {
  /**
   * Fetch a single issue with caching
   */
  async getIssue(issueId: string) {
    // This request will be cached for 5 minutes by default
    return apiClient.get(`/issues/${issueId}`);
  }
  
  /**
   * Fetch multiple issues with batching
   */
  async getMultipleIssues(issueIds: string[]) {
    // These requests will be batched into a single API call
    return apiClient.batchGet(
      issueIds.map(id => `/issues/${id}`)
    );
  }
  
  /**
   * Fetch issue events without caching
   */
  async getIssueEvents(issueId: string) {
    // Use uncachedClient for real-time data
    const { uncachedClient } = await import('./apiClient');
    return uncachedClient.get(`/issues/${issueId}/events`);
  }
  
  /**
   * Update issue with cache invalidation
   */
  async updateIssue(issueId: string, data: any) {
    const result = await apiClient.put(`/issues/${issueId}`, data);
    
    // Invalidate cache for this issue
    apiClient.invalidateCache(`/issues/${issueId}`);
    
    return result;
  }
  
  /**
   * Search issues with persistent caching
   */
  async searchIssues(query: string) {
    // Use persistent cache for search results
    return persistentClient.get('/issues', {
      params: { query }
    });
  }
  
  /**
   * Method with custom caching
   */
  async getIssueStats(issueId: string) {
    const cachedFn = cached(10 * 60 * 1000)(this, 'getIssueStats', {
      value: async () => {
        const [issue, events, comments] = await Promise.all([
          this.getIssue(issueId),
          apiClient.get(`/issues/${issueId}/events`),
          apiClient.get(`/issues/${issueId}/comments`)
        ]);
        
        return {
          issue,
          eventCount: events.length,
          commentCount: comments.length
        };
      }
    }).value;
    
    return cachedFn();
  }
  
  /**
   * Method with deduplication
   */
  async getProjectIssues(projectId: string) {
    const deduplicatedFn = deduplicated()(this, 'getProjectIssues', {
      value: async () => {
        // Multiple components can call this method without causing duplicate requests
        return apiClient.get(`/projects/${projectId}/issues`);
      }
    }).value;
    
    return deduplicatedFn();
  }
  
  /**
   * Bulk operation with custom batching
   */
  async bulkUpdateIssueStatus(updates: Array<{ id: string; status: string }>) {
    // Register custom batch processor
    requestBatcher.registerProcessor('PUT:/issues', async (items) => {
      // Convert individual updates to bulk request
      const bulkData = items.map(item => ({
        id: item.endpoint.match(/\/issues\/([^\/]+)/)?.[1],
        ...item.config?.data
      }));
      
      // Make bulk API call
      const response = await apiClient.put('/issues/bulk', { updates: bulkData });
      
      // Map results back to individual requests
      return items.map(item => {
        const id = item.endpoint.match(/\/issues\/([^\/]+)/)?.[1];
        return response.data.find((result: any) => result.id === id);
      });
    });
    
    // These will be batched
    const results = await Promise.all(
      updates.map(update => 
        requestBatcher.batch(
          `/issues/${update.id}`,
          { method: 'PUT', data: { status: update.status } }
        )
      )
    );
    
    // Clear cache for updated issues
    updates.forEach(update => {
      apiClient.invalidateCache(`/issues/${update.id}`);
    });
    
    return results;
  }
  
  /**
   * Get cache performance metrics
   */
  getCacheMetrics() {
    return apiClient.getCacheStats();
  }
}

// Usage example in a React component
export const useOptimizedApi = () => {
  const service = new OptimizedIssueService();
  
  // Example: Fetch issue with automatic deduplication
  const fetchIssue = async (issueId: string) => {
    // Multiple components can call this simultaneously without duplicate requests
    return service.getIssue(issueId);
  };
  
  // Example: Prefetch and cache issues
  const prefetchIssues = async (issueIds: string[]) => {
    // These will be batched and cached
    await service.getMultipleIssues(issueIds);
  };
  
  // Example: Real-time data without caching
  const watchIssueEvents = async (issueId: string) => {
    // This bypasses the cache for real-time updates
    return service.getIssueEvents(issueId);
  };
  
  return {
    fetchIssue,
    prefetchIssues,
    watchIssueEvents,
    service
  };
};

// Performance monitoring example
export const monitorApiPerformance = () => {
  // Log cache hit rate every minute
  setInterval(() => {
    const stats = apiClient.getCacheStats();
    console.log('API Cache Stats:', {
      hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
      size: stats.size,
      avgHits: stats.avgHits.toFixed(2)
    });
  }, 60000);
  
  // Monitor request timing
  const originalGet = apiClient.get.bind(apiClient);
  apiClient.get = async function(...args) {
    const start = performance.now();
    try {
      const result = await originalGet(...args);
      const duration = performance.now() - start;
      console.log(`GET ${args[0]} took ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`GET ${args[0]} failed after ${duration.toFixed(2)}ms`);
      throw error;
    }
  };
};

export default OptimizedIssueService;
