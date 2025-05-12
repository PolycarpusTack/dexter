/**
 * Core API client for Dexter
 * 
 * This client provides a unified interface for making API requests,
 * including error handling, request formatting, and response parsing.
 */
import axios from 'axios';

// Create axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000 // 30 seconds
});

/**
 * API error class with enhanced details
 */
export class ApiError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Central error handler function
 */
const handleError = (error, context) => {
  // Extract error details
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message || 'Unknown error';
  const details = error.response?.data || {};

  // Create standardized error
  const apiError = new ApiError(
    `${context}: ${message}`,
    status,
    details
  );

  // Log error for monitoring (could be enhanced with real monitoring service)
  console.error('[API Error]', apiError);

  // Re-throw for component error boundaries
  throw apiError;
};

/**
 * Request deduplicator for preventing duplicate requests
 */
class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  /**
   * Execute a request with deduplication
   */
  async execute(key, requestFn) {
    // If we already have this request in flight, return the existing promise
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    // Otherwise, execute the request and store the promise
    const promise = requestFn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

/**
 * Core API client class
 */
export class ApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '/api';
    this.defaultHeaders = options.defaultHeaders || {};
    this.deduplicator = new RequestDeduplicator();
  }

  /**
   * Make a GET request
   */
  async get(path, options = {}) {
    const { params, headers, deduplicate = true } = options;
    const requestKey = deduplicate ? `GET:${path}:${JSON.stringify(params || {})}` : null;

    try {
      const requestFn = () => axiosInstance.get(path, {
        params,
        headers: { ...this.defaultHeaders, ...headers }
      });

      // Use deduplication if enabled
      const response = deduplicate
        ? await this.deduplicator.execute(requestKey, requestFn)
        : await requestFn();

      return response.data;
    } catch (error) {
      handleError(error, `GET ${path}`);
    }
  }

  /**
   * Make a POST request
   */
  async post(path, data, options = {}) {
    const { params, headers } = options;

    try {
      const response = await axiosInstance.post(path, data, {
        params,
        headers: { ...this.defaultHeaders, ...headers }
      });

      return response.data;
    } catch (error) {
      handleError(error, `POST ${path}`);
    }
  }

  /**
   * Make a PUT request
   */
  async put(path, data, options = {}) {
    const { params, headers } = options;

    try {
      const response = await axiosInstance.put(path, data, {
        params,
        headers: { ...this.defaultHeaders, ...headers }
      });

      return response.data;
    } catch (error) {
      handleError(error, `PUT ${path}`);
    }
  }

  /**
   * Make a DELETE request
   */
  async delete(path, options = {}) {
    const { params, headers } = options;

    try {
      const response = await axiosInstance.delete(path, {
        params,
        headers: { ...this.defaultHeaders, ...headers }
      });

      return response.data;
    } catch (error) {
      handleError(error, `DELETE ${path}`);
    }
  }

  /**
   * Send a batch of requests
   */
  async batch(requests) {
    try {
      const batchData = requests.map(req => ({
        method: req.method,
        path: req.path,
        body: req.data,
        params: req.params
      }));

      const response = await axiosInstance.post('/batch', batchData, {
        headers: this.defaultHeaders
      });

      return response.data;
    } catch (error) {
      handleError(error, 'Batch request');
    }
  }
}

// Create and export default client instance
const client = new ApiClient();
export default client;
