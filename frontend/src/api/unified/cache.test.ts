/**
 * Tests for the Bounded Cache
 */
import { BoundedCache } from './cache';

// Create a test instance
const cache = new BoundedCache({
  maxSize: 3,
  maxBytes: 1000,
  defaultTTL: 100
});

// Add test items
cache.set('key1', { name: 'Item 1', size: 100 });
cache.set('key2', { name: 'Item 2', size: 200 });
cache.set('key3', { name: 'Item 3', size: 300 });

// Test cache size limit
console.log('--- Testing cache size limit ---');
console.log('Cache size before overflow:', cache.getSize());
cache.set('key4', { name: 'Item 4', size: 400 });
console.log('Cache size after overflow:', cache.getSize());
console.log('Key1 still in cache:', cache.has('key1'));
console.log('Key4 in cache:', cache.has('key4'));

// Test cache retrieval
console.log('--- Testing cache retrieval ---');
const item3 = cache.get('key3');
console.log('Retrieved key3:', item3);

// Test cache expiration
console.log('--- Testing cache expiration ---');
cache.set('expiring', { name: 'Expiring Item' }, 1); // 1ms TTL

setTimeout(() => {
  console.log('Expired item still in cache:', cache.has('expiring'));
  
  // Test cache stats
  console.log('--- Testing cache stats ---');
  const stats = cache.getStats();
  console.log('Cache stats:', {
    size: stats.size,
    sizeBytes: stats.sizeBytes,
    entryCount: Object.keys(stats.entries).length
  });
  
  // Test cache cleanup
  console.log('--- Testing cache cleanup ---');
  cache.cleanupExpired();
  console.log('Cache size after cleanup:', cache.getSize());
}, 10);