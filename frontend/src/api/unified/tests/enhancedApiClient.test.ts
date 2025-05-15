/**
 * Tests for the Enhanced API Client
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { EnhancedApiClient } from '../enhancedApiClient';
import { ApiConfig, HttpMethod } from '../types';

// Mock axios
vi.mock('axios');
const mockAxios = axios as unknown as {
  create: vi.Mock;
  request: vi.Mock;
  interceptors: {
    request: { use: vi.Mock };
    response: { use: vi.Mock };
  };
};

describe('EnhancedApiClient', () => {
  let apiClient: EnhancedApiClient;
  const mockResponse = {
    data: { test: 'data' },
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config: {}
  };
  
  const mockConfig: ApiConfig = {
    baseUrl: 'https://api.example.com',
    categories: {
      test: {
        basePath: '/test',
        endpoints: {
          getItem: {
            name: 'getItem',
            path: '/items/{item_id}',
            method: HttpMethod.GET,
            description: 'Get an item by ID'
          },
          listItems: {
            name: 'listItems',
            path: '/items',
            method: HttpMethod.GET,
            description: 'List all items'
          },
          createItem: {
            name: 'createItem',
            path: '/items',
            method: HttpMethod.POST,
            description: 'Create a new item'
          },
          updateItem: {
            name: 'updateItem',
            path: '/items/{item_id}',
            method: HttpMethod.PUT,
            description: 'Update an item'
          },
          deleteItem: {
            name: 'deleteItem',
            path: '/items/{item_id}',
            method: HttpMethod.DELETE,
            description: 'Delete an item'
          }
        }
      }
    }
  };

  beforeEach(() => {
    // Setup axios mocks
    const mockAxiosInstance = {
      request: vi.fn().mockResolvedValue(mockResponse),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    };
    mockAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Create API client
    apiClient = new EnhancedApiClient(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create an instance with axios configured', () => {
    expect(mockAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api.example.com'
      })
    );
  });

  it('should make GET requests', async () => {
    const result = await apiClient.get('/test/items/123');
    
    // Check the axios request was made correctly
    expect(apiClient.getAxiosInstance().request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/test/items/123'
      })
    );
    
    // Check the response is returned correctly
    expect(result).toEqual(mockResponse.data);
  });

  it('should make POST requests', async () => {
    const data = { name: 'Test Item' };
    const result = await apiClient.post('/test/items', data);
    
    // Check the axios request was made correctly
    expect(apiClient.getAxiosInstance().request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/test/items',
        data
      })
    );
    
    // Check the response is returned correctly
    expect(result).toEqual(mockResponse.data);
  });

  it('should make PUT requests', async () => {
    const data = { name: 'Updated Item' };
    const result = await apiClient.put('/test/items/123', data);
    
    // Check the axios request was made correctly
    expect(apiClient.getAxiosInstance().request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        url: '/test/items/123',
        data
      })
    );
    
    // Check the response is returned correctly
    expect(result).toEqual(mockResponse.data);
  });

  it('should make DELETE requests', async () => {
    const result = await apiClient.delete('/test/items/123');
    
    // Check the axios request was made correctly
    expect(apiClient.getAxiosInstance().request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'DELETE',
        url: '/test/items/123'
      })
    );
    
    // Check the response is returned correctly
    expect(result).toEqual(mockResponse.data);
  });

  it('should resolve paths correctly', () => {
    const path = apiClient.resolvePath('test', 'getItem', { item_id: '123' });
    expect(path).toBe('/test/items/123');
  });

  it('should call endpoints with correct methods and paths', async () => {
    await apiClient.callEndpoint('test', 'getItem', { item_id: '123' });
    
    // Check the axios request was made correctly
    expect(apiClient.getAxiosInstance().request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringContaining('/test/items/123')
      })
    );
  });

  it('should handle query parameters in callEndpoint', async () => {
    await apiClient.callEndpoint(
      'test', 
      'listItems', 
      {}, 
      { limit: 10, offset: 20 }
    );
    
    // Check the axios request was made correctly with query params
    expect(apiClient.getAxiosInstance().request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringContaining('/test/items'),
        headers: expect.objectContaining({
          params: { limit: 10, offset: 20 }
        })
      })
    );
  });

  it('should handle cache operations', () => {
    // Call clearCache and check it doesn't throw
    expect(() => apiClient.clearCache()).not.toThrow();
    
    // Call invalidateCache and check it doesn't throw
    expect(() => apiClient.invalidateCache('/test/items')).not.toThrow();
  });

  it('should provide access to the config', () => {
    const config = apiClient.getConfig();
    expect(config).toEqual(mockConfig);
  });

  it('should update the config', () => {
    const updatedConfig = {
      baseUrl: 'https://api.example.org'
    };
    
    apiClient.updateConfig(updatedConfig);
    const config = apiClient.getConfig();
    
    expect(config.baseUrl).toBe('https://api.example.org');
  });
});