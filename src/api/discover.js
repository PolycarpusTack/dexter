/**
 * Discover API Module
 * 
 * This module provides methods for interacting with Sentry's Discover API.
 */
import client from './client';
import { resolveApiPath, loadApiConfig } from './config';

/**
 * Discover API class
 */
export class DiscoverApi {
  /**
   * Execute a Discover query
   */
  static async query(org, queryData) {
    const path = await resolveApiPath('discover.query', { org });
    
    return client.post(path, queryData);
  }

  /**
   * Get saved queries
   */
  static async getSavedQueries(org) {
    const path = await resolveApiPath('discover.saved_queries', { org });
    
    return client.get(path);
  }

  /**
   * Create a saved query
   */
  static async createSavedQuery(org, queryData) {
    const path = await resolveApiPath('discover.create_saved_query', { org });
    
    return client.post(path, queryData);
  }

  /**
   * Get a specific saved query
   */
  static async getSavedQuery(org, queryId) {
    const path = await resolveApiPath('discover.saved_query_detail', { org, id: queryId });
    
    return client.get(path);
  }

  /**
   * Update a saved query
   */
  static async updateSavedQuery(org, queryId, queryData) {
    const path = await resolveApiPath('discover.update_saved_query', { org, id: queryId });
    
    return client.put(path, queryData);
  }

  /**
   * Delete a saved query
   */
  static async deleteSavedQuery(org, queryId) {
    const path = await resolveApiPath('discover.delete_saved_query', { org, id: queryId });
    
    return client.delete(path);
  }

  /**
   * Get prebuilt queries
   */
  static async getPrebuiltQueries(org) {
    const path = await resolveApiPath('discover.prebuilt_queries', { org });
    
    return client.get(path);
  }

  /**
   * Export query results as CSV
   */
  static async exportToCsv(org, queryData) {
    const path = await resolveApiPath('discover.export', { org });
    
    return client.post(path, queryData, {
      headers: {
        'Accept': 'text/csv'
      }
    });
  }

  /**
   * Get query results with pagination
   */
  static async queryWithPagination(org, queryData, options = {}) {
    const { pageSize = 100, maxPages = 10 } = options;
    const results = [];
    let cursor = null;
    let page = 0;
    
    // Prepare query with pagination
    const paginatedQuery = {
      ...queryData,
      limit: pageSize
    };
    
    // Loop through pages
    while (page < maxPages) {
      if (cursor) {
        paginatedQuery.cursor = cursor;
      }
      
      const response = await this.query(org, paginatedQuery);
      
      // Add results to the collection
      if (response.data) {
        results.push(...response.data);
      }
      
      // Check if we have more pages
      if (!response.cursor) {
        break;
      }
      
      cursor = response.cursor;
      page++;
    }
    
    return {
      data: results,
      totalPages: page + 1,
      hasMore: page >= maxPages
    };
  }
}

// Initialize config when module is loaded
loadApiConfig();

// Export default instance
export default DiscoverApi;
