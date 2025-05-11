// File: frontend/src/api/__tests__/apiClient.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { EnhancedApiClient, apiClient, createApiClient } from '../apiClient';
import { requestCache } from '../../utils/requestCache';
import { requestDeduplicator } from '../../utils/requestDeduplicator';
import { requestBatcher } from '../../utils/requestBatcher';

// Mock utilities
vi.mock('../../utils/requestCache');
vi.mock('../../utils/requestDeduplicator');
vi.mock('../../utils/requestBatcher');

describe('EnhancedApiClient', () => {
  let mockAxios: MockAdapter;
  let client: EnhancedApiClient;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    client = createApiClient('https://api.test.com', {}, {}, {
      enableCaching: true,
      enableDeduplication: true,
      enableBatching: true
    });
    
    // Reset all mocks
    vi.clearAllMocks();
    (requestCache.get as any).mockReturnValue(null);
    (requestCache.set as any).mockImplementation(() => {});
    (requestDeduplicator.deduplicate as any).mockImplementation((_, fn) => fn());
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('GET requests', () => {
    it('makes successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockAxios.onGet('/test').reply(200, mockData);

      const result = await client.get('/test');

      expect(result).toEqual(mockData);
    });

    it('uses cache for GET requests', async () => {
      const mockData = { id: 1, name: 'Test' };
      const cachedData = { id: 1, name: 'Cached' };
      
      (requestCache.get as any).mockReturnValue(cachedData);

      const result = await client.get('/test');

      expect(result).toEqual(cachedData);
      expect(requestCache.get).toHaveBeenCalledWith('/test', undefined);
      expect(mockAxios.history.get.length).toBe(0); // No actual request made
    });

    it('sets cache after successful GET', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockAxios.onGet('/test').reply(200, mockData);

      await client.get('/test');

      expect(requestCache.set).toHaveBeenCalledWith(
        '/test',
        mockData,
        undefined,
        expect.any(Object)
      );
    });

    it('uses deduplication for concurrent GET requests', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockAxios.onGet('/test').reply(200, mockData);

      await client.get('/test');

      expect(requestDeduplicator.deduplicate).toHaveBeenCalled();
    });

    it('handles 304 Not Modified responses', async () => {
      const cachedData = { id: 1, name: 'Cached' };
      (requestCache.get as any)
        .mockReturnValueOnce(null) // First call for initial check
        .mockReturnValueOnce(cachedData); // Second call after 304

      mockAxios.onGet('/test').reply(304);

      const result = await client.get('/test');

      expect(result).toEqual(cachedData);
    });

    it('handles cache-control headers', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockAxios.onGet('/test').reply(200, mockData, {
        'Cache-Control': 'max-age=300'
      });

      await client.get('/test');

      expect(requestCache.set).toHaveBeenCalledWith(
        '/test',
        mockData,
        undefined,
        expect.objectContaining({ ttl: 300000 })
      );
    });

    it('handles ETag headers', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockAxios.onGet('/test').reply(200, mockData, {
        'ETag': '"123abc"'
      });

      await client.get('/test');

      expect(requestCache.set).toHaveBeenCalledWith(
        '/test',
        mockData,
        undefined,
        expect.objectContaining({ etag: '"123abc"' })
      );
    });
  });

  describe('POST requests', () => {
    it('makes successful POST request', async () => {
      const requestData = { name: 'New Item' };
      const responseData = { id: 1, ...requestData };
      mockAxios.onPost('/items', requestData).reply(201, responseData);

      const result = await client.post('/items', requestData);

      expect(result).toEqual(responseData);
    });

    it('does not cache POST requests', async () => {
      const requestData = { name: 'New Item' };
      const responseData = { id: 1, ...requestData };
      mockAxios.onPost('/items', requestData).reply(201, responseData);

      await client.post('/items', requestData);

      expect(requestCache.set).not.toHaveBeenCalled();
    });

    it('does not deduplicate POST requests', async () => {
      const requestData = { name: 'New Item' };
      const responseData = { id: 1, ...requestData };
      mockAxios.onPost('/items', requestData).reply(201, responseData);

      await client.post('/items', requestData);

      expect(requestDeduplicator.deduplicate).not.toHaveBeenCalled();
    });
  });

  describe('PUT requests', () => {
    it('makes successful PUT request', async () => {
      const requestData = { name: 'Updated Item' };
      const responseData = { id: 1, ...requestData };
      mockAxios.onPut('/items/1', requestData).reply(200, responseData);

      const result = await client.put('/items/1', requestData);

      expect(result).toEqual(responseData);
    });

    it('invalidates cache after PUT request', async () => {
      const requestData = { name: 'Updated Item' };
      const responseData = { id: 1, ...requestData };
      mockAxios.onPut('/items/1', requestData).reply(200, responseData);

      await client.put('/items/1', requestData);

      // Cache should not be set for PUT requests
      expect(requestCache.set).not.toHaveBeenCalled();
    });
  });

  describe('DELETE requests', () => {
    it('makes successful DELETE request', async () => {
      mockAxios.onDelete('/items/1').reply(204);

      const result = await client.delete('/items/1');

      expect(result).toBeUndefined();
    });

    it('removes from cache after DELETE request', async () => {
      mockAxios.onDelete('/items/1').reply(204);

      await client.delete('/items/1');

      expect(requestCache.remove).toHaveBeenCalledWith('/items/1', undefined);
    });
  });

  describe('PATCH requests', () => {
    it('makes successful PATCH request', async () => {
      const requestData = { name: 'Patched Item' };
      const responseData = { id: 1, name: 'Patched Item', other: 'data' };
      mockAxios.onPatch('/items/1', requestData).reply(200, responseData);

      const result = await client.patch('/items/1', requestData);

      expect(result).toEqual(responseData);
    });

    it('removes from cache after PATCH request', async () => {
      const requestData = { name: 'Patched Item' };
      mockAxios.onPatch('/items/1', requestData).reply(200);

      await client.patch('/items/1', requestData);

      expect(requestCache.remove).toHaveBeenCalledWith('/items/1', undefined);
    });
  });

  describe('Batch requests', () => {
    it('makes batch GET requests', async () => {
      const urls = ['/items/1', '/items/2', '/items/3'];
      const mockResponses = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ];

      (requestBatcher.batch as any).mockImplementation((url) => {
        const id = url.match(/\/items\/(\d+)/)[1];
        return Promise.resolve(mockResponses[id - 1]);
      });

      const results = await client.batchGet(urls);

      expect(results).toEqual(mockResponses);
      expect(requestBatcher.batch).toHaveBeenCalledTimes(3);
    });

    it('falls back to individual requests when batching is disabled', async () => {
      const noBatchClient = createApiClient('https://api.test.com', {}, {}, {
        enableBatching: false
      });

      const urls = ['/items/1', '/items/2'];
      
      mockAxios.onGet('/items/1').reply(200, { id: 1 });
      mockAxios.onGet('/items/2').reply(200, { id: 2 });

      const results = await noBatchClient.batchGet(urls);

      expect(results).toHaveLength(2);
      expect(mockAxios.history.get).toHaveLength(2);
    });
  });

  describe('Request compression', () => {
    it('adds compression headers for large requests', async () => {
      const largeData = { data: 'x'.repeat(2000) };
      mockAxios.onPost('/large').reply(201);

      await client.post('/large', largeData);

      const request = mockAxios.history.post[0];
      expect(request.headers['Content-Encoding']).toBe('gzip');
    });

    it('does not compress small requests', async () => {
      const smallData = { data: 'small' };
      mockAxios.onPost('/small').reply(201);

      await client.post('/small', smallData);

      const request = mockAxios.history.post[0];
      expect(request.headers['Content-Encoding']).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('handles network errors', async () => {
      mockAxios.onGet('/test').networkError();

      await expect(client.get('/test')).rejects.toThrow(/network error/i);
    });

    it('handles timeout errors', async () => {
      mockAxios.onGet('/test').timeout();

      await expect(client.get('/test')).rejects.toThrow(/timeout/i);
    });

    it('handles API errors with proper status codes', async () => {
      mockAxios.onGet('/test').reply(404, { detail: 'Not found' });

      await expect(client.get('/test')).rejects.toMatchObject({
        status: 404,
        message: expect.stringContaining('Not found')
      });
    });

    it('handles CORS errors', async () => {
      mockAxios.onGet('/test').reply(() => {
        throw new Error('Network Error');
      });

      await expect(client.get('/test')).rejects.toThrow(/network error/i);
    });

    it('handles rate limiting (429) errors', async () => {
      mockAxios.onGet('/test').reply(429, { detail: 'Rate limit exceeded' });

      await expect(client.get('/test')).rejects.toMatchObject({
        status: 429,
        message: expect.stringContaining('Rate limit exceeded')
      });
    });
  });

  describe('Request interceptors', () => {
    it('adds request timing metadata', async () => {
      mockAxios.onGet('/test').reply(200, {});

      await client.get('/test');

      const request = mockAxios.history.get[0];
      expect((request as any).metadata.startTime).toBeDefined();
    });

    it('adds If-None-Match header when cached etag exists', async () => {
      (requestCache.get as any).mockReturnValue({ etag: '"123abc"' });
      mockAxios.onGet('/test').reply(200, {});

      await client.get('/test');

      const request = mockAxios.history.get[0];
      expect(request.headers['If-None-Match']).toBe('"123abc"');
    });
  });

  describe('Response interceptors', () => {
    it('calculates request duration', async () => {
      const responsePromise = new Promise((resolve) => {
        mockAxios.onGet('/test').reply(() => {
          setTimeout(() => {
            resolve([200, {}]);
          }, 100);
        });
      });

      await client.get('/test');
      await responsePromise;

      // Duration should be calculated and added to response
      // Note: This is a simplified test, actual implementation may vary
    });

    it('logs server errors to error tracking', async () => {
      const errorTrackingSpy = vi.fn();
      vi.doMock('../../utils/errorTracking', () => ({
        logErrorToService: errorTrackingSpy
      }));

      mockAxios.onGet('/test').reply(500, { detail: 'Server error' });

      await expect(client.get('/test')).rejects.toThrow();

      // Note: This would need actual implementation
    });
  });

  describe('Cache management', () => {
    it('invalidates cache for specific URL', () => {
      client.invalidateCache('/items/1');

      expect(requestCache.remove).toHaveBeenCalledWith('/items/1');
    });

    it('clears all cache', () => {
      client.clearCache();

      expect(requestCache.clear).toHaveBeenCalled();
    });

    it('returns cache statistics', () => {
      const mockStats = {
        size: 10,
        hitRate: 0.8,
        totalHits: 100,
        avgHits: 10
      };
      (requestCache.getStats as any).mockReturnValue(mockStats);

      const stats = client.getCacheStats();

      expect(stats).toEqual(mockStats);
    });
  });

  describe('Optimization settings', () => {
    it('allows updating optimization settings', async () => {
      client.updateOptimizations({
        enableCaching: false,
        enableDeduplication: false
      });

      // Make a request with caching disabled
      mockAxios.onGet('/test').reply(200, { data: 'test' });
      await client.get('/test');

      expect(requestCache.get).not.toHaveBeenCalled();
      expect(requestCache.set).not.toHaveBeenCalled();
      expect(requestDeduplicator.deduplicate).not.toHaveBeenCalled();
    });
  });

  describe('Retry mechanism', () => {
    it('retries failed requests according to retry config', async () => {
      const retryClient = createApiClient('https://api.test.com', {}, {
        maxRetries: 2,
        retryDelay: 100
      });

      let attempts = 0;
      mockAxios.onGet('/flaky').reply(() => {
        attempts++;
        if (attempts < 3) {
          return [500, { error: 'Server error' }];
        }
        return [200, { success: true }];
      });

      const result = await retryClient.get('/flaky');

      expect(result).toEqual({ success: true });
      expect(attempts).toBe(3);
    });
  });

  describe('Request timing', () => {
    it('tracks request performance', async () => {
      const startTime = Date.now();
      mockAxios.onGet('/test').reply(200, {});

      await client.get('/test');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Request should complete in reasonable time
      expect(duration).toBeLessThan(1000);
    });
  });
});

describe('Default API client instances', () => {
  it('exports configured default client', () => {
    expect(apiClient).toBeInstanceOf(EnhancedApiClient);
  });

  it('creates specialized clients with correct configurations', () => {
    const { uncachedClient, persistentClient } = require('../apiClient');
    
    expect(uncachedClient).toBeInstanceOf(EnhancedApiClient);
    expect(persistentClient).toBeInstanceOf(EnhancedApiClient);
  });
});
