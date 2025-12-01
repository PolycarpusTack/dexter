// File: frontend/tests/utils/requestOptimizations.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestBatcher } from '../../src/utils/requestBatcher';
import { RequestDeduplicator } from '../../src/utils/requestDeduplicator';
import { RequestCache } from '../../src/utils/requestCache';

describe('RequestBatcher', () => {
  let batcher: RequestBatcher;
  
  beforeEach(() => {
    batcher = new RequestBatcher({
      maxBatchSize: 3,
      maxWaitTime: 50
    });
  });
  
  afterEach(() => {
    batcher.clear();
  });
  
  it('should batch multiple requests to the same endpoint', async () => {
    let batchCount = 0;
    
    batcher.registerProcessor('GET:/api/issues', async (items) => {
      batchCount++;
      return items.map(() => ({ id: Math.random() }));
    });
    
    // Make concurrent requests
    const promises = [
      batcher.batch('/api/issues/1'),
      batcher.batch('/api/issues/2'),
      batcher.batch('/api/issues/3')
    ];
    
    await Promise.all(promises);
    
    // Should only make one batch request
    expect(batchCount).toBe(1);
  });
  
  it('should respect maxBatchSize', async () => {
    let batchCount = 0;
    
    batcher.registerProcessor('GET:/api/issues', async (items) => {
      batchCount++;
      expect(items.length).toBeLessThanOrEqual(3);
      return items.map(() => ({ id: Math.random() }));
    });
    
    // Make more requests than batch size
    const promises = Array(5).fill(null).map((_, i) =>
      batcher.batch(`/api/issues/${i}`)
    );
    
    await Promise.all(promises);
    
    // Should make multiple batches
    expect(batchCount).toBeGreaterThan(1);
  });
  
  it('should auto-flush after maxWaitTime', async () => {
    let resolved = false;
    
    batcher.registerProcessor('GET:/api/issues', async (items) => {
      resolved = true;
      return items.map(() => ({ id: Math.random() }));
    });
    
    // Make a single request
    const promise = batcher.batch('/api/issues/1');
    
    // Should not resolve immediately
    expect(resolved).toBe(false);
    
    // Wait for auto-flush
    await new Promise(resolve => setTimeout(resolve, 60));
    await promise;
    
    expect(resolved).toBe(true);
  });
});

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;
  
  beforeEach(() => {
    deduplicator = new RequestDeduplicator({ ttl: 100 });
  });
  
  afterEach(() => {
    deduplicator.stop();
  });
  
  it('should deduplicate concurrent identical requests', async () => {
    let callCount = 0;
    
    const request = vi.fn().mockImplementation(async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return { data: 'test' };
    });
    
    // Make concurrent identical requests
    const promises = [
      deduplicator.deduplicate('/api/data', request),
      deduplicator.deduplicate('/api/data', request),
      deduplicator.deduplicate('/api/data', request)
    ];
    
    const results = await Promise.all(promises);
    
    // Should only call the request function once
    expect(callCount).toBe(1);
    
    // All promises should receive the same result
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });
  
  it('should not deduplicate different requests', async () => {
    let callCount = 0;
    
    const request = vi.fn().mockImplementation(async () => {
      callCount++;
      return { data: 'test' };
    });
    
    // Make different requests
    const promises = [
      deduplicator.deduplicate('/api/data1', request),
      deduplicator.deduplicate('/api/data2', request)
    ];
    
    await Promise.all(promises);
    
    // Should call the request function twice
    expect(callCount).toBe(2);
  });
  
  it('should clean up expired requests', async () => {
    const request = vi.fn().mockResolvedValue({ data: 'test' });
    
    // Make a request
    await deduplicator.deduplicate('/api/data', request);
    
    // Should be in pending initially
    expect(deduplicator.getPendingCount()).toBe(0); // Completed requests are removed
    
    // Make another request after TTL
    await new Promise(resolve => setTimeout(resolve, 150));
    await deduplicator.deduplicate('/api/data', request);
    
    // Should make a new request
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('RequestCache', () => {
  let cache: RequestCache;
  
  beforeEach(() => {
    cache = new RequestCache({ defaultTTL: 100 });
  });
  
  afterEach(() => {
    cache.clear();
  });
  
  it('should cache GET requests', () => {
    const data = { id: 1, name: 'Test' };
    
    cache.set('/api/data', data);
    
    const cached = cache.get('/api/data');
    expect(cached).toEqual(data);
  });
  
  it('should respect TTL', async () => {
    const data = { id: 1, name: 'Test' };
    
    cache.set('/api/data', data, undefined, { ttl: 50 });
    
    // Should be cached initially
    expect(cache.get('/api/data')).toEqual(data);
    
    // Should expire after TTL
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(cache.get('/api/data')).toBeNull();
  });
  
  it('should update hit count on access', () => {
    const data = { id: 1, name: 'Test' };
    
    cache.set('/api/data', data);
    
    // Access multiple times
    cache.get('/api/data');
    cache.get('/api/data');
    cache.get('/api/data');
    
    const stats = cache.getStats();
    expect(stats.totalHits).toBe(3);
  });
  
  it('should evict LRU entries when cache is full', () => {
    const smallCache = new RequestCache({ maxSize: 2 });
    
    // Fill cache
    smallCache.set('/api/data1', { id: 1 });
    smallCache.set('/api/data2', { id: 2 });
    
    // Access first item to make it more recently used
    smallCache.get('/api/data1');
    
    // Add new item, should evict least recently used
    smallCache.set('/api/data3', { id: 3 });
    
    expect(smallCache.has('/api/data1')).toBe(true);
    expect(smallCache.has('/api/data2')).toBe(false); // Evicted
    expect(smallCache.has('/api/data3')).toBe(true);
  });
  
  it('should handle cache key generation correctly', () => {
    const data = { id: 1, name: 'Test' };
    
    // Cache with params
    cache.set('/api/data', data, { params: { filter: 'active' } });
    
    // Should not match without params
    expect(cache.get('/api/data')).toBeNull();
    
    // Should match with same params
    expect(cache.get('/api/data', { params: { filter: 'active' } })).toEqual(data);
  });
});

describe('Optimization Decorators', () => {
  it('@cached decorator should cache method results', async () => {
    const mockService = {
      callCount: 0,
      async fetchData(id: string) {
        this.callCount++;
        return { id, data: 'test' };
      }
    };
    
    // Apply cached decorator manually
    const { cached } = await import('../../src/utils/requestCache');
    const cachedFetchData = cached(100)(
      mockService,
      'fetchData',
      { value: mockService.fetchData }
    ).value.bind(mockService);
    
    // First call
    const result1 = await cachedFetchData('123');
    expect(mockService.callCount).toBe(1);
    
    // Second call should use cache
    const result2 = await cachedFetchData('123');
    expect(mockService.callCount).toBe(1);
    expect(result1).toEqual(result2);
  });
  
  it('@deduplicated decorator should prevent duplicate calls', async () => {
    const mockService = {
      callCount: 0,
      async fetchData(id: string) {
        this.callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { id, data: 'test' };
      }
    };
    
    // Apply deduplicated decorator manually
    const { deduplicated } = await import('../../src/utils/requestDeduplicator');
    const deduplicatedFetchData = deduplicated()(
      mockService,
      'fetchData',
      { value: mockService.fetchData }
    ).value.bind(mockService);
    
    // Make concurrent calls
    const promises = [
      deduplicatedFetchData('123'),
      deduplicatedFetchData('123'),
      deduplicatedFetchData('123')
    ];
    
    await Promise.all(promises);
    
    // Should only call once
    expect(mockService.callCount).toBe(1);
  });
});
