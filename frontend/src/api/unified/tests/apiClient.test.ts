/**
 * Tests for the Enhanced API Client
 * 
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { EnhancedApiClient } from '../enhancedApiClient';
import { ApiError, ErrorCategory } from '../types';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })),
  },
}));

describe('EnhancedApiClient', () => {
  let apiClient: EnhancedApiClient;
  let mockAxiosInstance: any;
  
  beforeEach(() => {
    // Create a new client for each test
    apiClient = new EnhancedApiClient();
    mockAxiosInstance = apiClient['axiosInstance'];
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('HTTP Methods', () => {
    it('should make a GET request', async () => {
      // Setup mock response
      mockAxiosInstance.request.mockResolvedValueOnce({ data: { result: 'success' } });
      
      // Make request
      const result = await apiClient.get('/test');
      
      // Verify
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test',
        headers: undefined,
        timeout: undefined,
        responseType: undefined,
        signal: undefined
      });
      expect(result).toEqual({ result: 'success' });
    });
    
    it('should make a POST request', async () => {
      // Setup mock response
      mockAxiosInstance.request.mockResolvedValueOnce({ data: { result: 'created' } });
      
      // Make request
      const data = { name: 'test' };
      const result = await apiClient.post('/test', data);
      
      // Verify
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/test',
        data,
        headers: undefined,
        timeout: undefined,
        responseType: undefined,
        signal: undefined
      });
      expect(result).toEqual({ result: 'created' });
    });
    
    it('should make a PUT request', async () => {
      // Setup mock response
      mockAxiosInstance.request.mockResolvedValueOnce({ data: { result: 'updated' } });
      
      // Make request
      const data = { name: 'updated' };
      const result = await apiClient.put('/test/123', data);
      
      // Verify
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/test/123',
        data,
        headers: undefined,
        timeout: undefined,
        responseType: undefined,
        signal: undefined
      });
      expect(result).toEqual({ result: 'updated' });
    });
    
    it('should make a DELETE request', async () => {
      // Setup mock response
      mockAxiosInstance.request.mockResolvedValueOnce({ data: { result: 'deleted' } });
      
      // Make request
      const result = await apiClient.delete('/test/123');
      
      // Verify
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/test/123',
        headers: undefined,
        timeout: undefined,
        responseType: undefined,
        signal: undefined
      });
      expect(result).toEqual({ result: 'deleted' });
    });
    
    it('should make a PATCH request', async () => {
      // Setup mock response
      mockAxiosInstance.request.mockResolvedValueOnce({ data: { result: 'patched' } });
      
      // Make request
      const data = { status: 'active' };
      const result = await apiClient.patch('/test/123', data);
      
      // Verify
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PATCH',
        url: '/test/123',
        data,
        headers: undefined,
        timeout: undefined,
        responseType: undefined,
        signal: undefined
      });
      expect(result).toEqual({ result: 'patched' });
    });
  });
  
  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      // Setup mock error
      const networkError = new Error('Network Error');
      mockAxiosInstance.request.mockRejectedValueOnce(networkError);
      
      // Attempt request
      try {
        await apiClient.get('/test');
        // If no error is thrown, fail the test
        expect(true).toBe(false);
      } catch (error) {
        // Verify error handling
        expect(error).toBeInstanceOf(Error);
        expect((error as ApiError).category).toBe(ErrorCategory.NETWORK);
        expect((error as ApiError).retryable).toBe(true);
      }
    });
    
    it('should handle 404 errors', async () => {
      // Setup mock error
      const notFoundError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Resource not found' }
        },
        config: { url: '/test/not-found' }
      };
      mockAxiosInstance.request.mockRejectedValueOnce(notFoundError);
      
      // Attempt request
      try {
        await apiClient.get('/test/not-found');
        // If no error is thrown, fail the test
        expect(true).toBe(false);
      } catch (error) {
        // Verify error handling
        expect(error).toBeInstanceOf(Error);
        expect((error as ApiError).status).toBe(404);
        expect((error as ApiError).category).toBe(ErrorCategory.CLIENT);
        expect((error as ApiError).retryable).toBe(false);
      }
    });
    
    it('should handle 500 server errors', async () => {
      // Setup mock error
      const serverError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        },
        config: { url: '/test' }
      };
      mockAxiosInstance.request.mockRejectedValueOnce(serverError);
      
      // Attempt request
      try {
        await apiClient.get('/test');
        // If no error is thrown, fail the test
        expect(true).toBe(false);
      } catch (error) {
        // Verify error handling
        expect(error).toBeInstanceOf(Error);
        expect((error as ApiError).status).toBe(500);
        expect((error as ApiError).category).toBe(ErrorCategory.SERVER);
        expect((error as ApiError).retryable).toBe(true);
        expect((error as ApiError).message).toContain('Internal server error');
      }
    });
  });
  
  describe('Path Resolution', () => {
    it('should call an endpoint with path parameters', async () => {
      // Setup mock configuration and response
      const mockConfig = {
        baseUrl: 'http://api.example.com',
        categories: {
          test: {
            basePath: '/api',
            endpoints: {
              getItem: {
                name: 'getItem',
                path: '/items/{item_id}',
                method: 'GET',
                description: 'Get item by ID'
              }
            }
          }
        }
      };
      
      // Create client with mock configuration
      const pathClient = new EnhancedApiClient(mockConfig);
      const mockPathAxios = pathClient['axiosInstance'];
      mockPathAxios.request.mockResolvedValueOnce({ data: { id: '123', name: 'Test Item' } });
      
      // Mock the internal path resolver methods
      vi.spyOn(pathClient as any, 'resolvePath').mockImplementation(() => '/api/items/123');
      
      // Make request
      try {
        const result = await pathClient.callEndpoint('test', 'getItem', { item_id: '123' });
        
        // Verify
        expect(result).toEqual({ id: '123', name: 'Test Item' });
      } catch (error) {
        // This should not happen
        expect(true).toBe(false);
      }
    });
  });
});