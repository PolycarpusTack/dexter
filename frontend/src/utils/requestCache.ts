// File: frontend/src/utils/requestCache.ts

import { AxiosRequestConfig } from 'axios';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  etag?: string;
  maxAge?: number;
}

/**
 * Cache options interface
 */
interface CacheOptions {
  defaultTTL?: number; // Time to live in milliseconds
  maxSize?: number;
  enableLRU?: boolean;
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
  keyPrefix?: string;
  compressionThreshold?: number; // Size in bytes to trigger compression
}

/**
 * Cache key generator function type
 */
type KeyGenerator = (url: string, config?: AxiosRequestConfig) => string;

/**
 * Request cache implementation with multiple storage backends
 */
export class RequestCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private options: Required<CacheOptions>;
  private storage?: Storage;
  private keyGenerator: KeyGenerator;

  constructor(options: CacheOptions = {}, keyGenerator?: KeyGenerator) {
    this.options = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      enableLRU: true,
      storage: 'memory',
      keyPrefix: 'dexter_cache_',
      compressionThreshold: 1024, // 1KB
      ...options
    };

    this.keyGenerator = keyGenerator || this.defaultKeyGenerator;

    // Initialize storage backend
    if (this.options.storage !== 'memory') {
      this.storage = this.options.storage === 'localStorage' ? 
        localStorage : sessionStorage;
      this.loadFromStorage();
    }
  }

  /**
   * Get cached data
   */
  get<T>(url: string, config?: AxiosRequestConfig): T | null {
    const key = this.keyGenerator(url, config);
    const entry = this.getEntry<T>(key);

    if (!entry) return null;

    // Check if cache has expired
    if (this.isExpired(entry)) {
      this.remove(key);
      return null;
    }

    // Update hit count and access time for LRU
    entry.hits++;
    entry.timestamp = Date.now();

    // Update storage
    this.setEntry(key, entry);

    return entry.data;
  }

  /**
   * Set cache data
   */
  set<T>(
    url: string, 
    data: T, 
    config?: AxiosRequestConfig, 
    options?: { ttl?: number; etag?: string }
  ): void {
    const key = this.keyGenerator(url, config);
    const ttl = options?.ttl || this.options.defaultTTL;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      etag: options?.etag,
      maxAge: ttl
    };

    // Check cache size limit
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.setEntry(key, entry);
  }

  /**
   * Remove cached data
   */
  remove(url: string, config?: AxiosRequestConfig): boolean {
    const key = this.keyGenerator(url, config);
    return this.removeEntry(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    if (this.storage) {
      const keys = Object.keys(this.storage);
      keys.forEach(key => {
        if (key.startsWith(this.options.keyPrefix)) {
          this.storage!.removeItem(key);
        }
      });
    }
  }

  /**
   * Check if request is cached
   */
  has(url: string, config?: AxiosRequestConfig): boolean {
    const key = this.keyGenerator(url, config);
    const entry = this.getEntry(key);
    return entry !== null && !this.isExpired(entry);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const avgHits = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      totalHits,
      avgHits,
      hitRate: entries.length > 0 ? 
        entries.filter(e => e.hits > 0).length / entries.length : 0
    };
  }

  /**
   * Default key generator
   */
  private defaultKeyGenerator(url: string, config?: AxiosRequestConfig): string {
    const method = config?.method || 'GET';
    const params = config?.params ? JSON.stringify(config.params) : '';
    return `${method}:${url}:${params}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    if (!entry.maxAge) return false;
    return Date.now() - entry.timestamp > entry.maxAge;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (!this.options.enableLRU || this.cache.size === 0) return;

    let lruKey: string | null = null;
    let lruEntry: CacheEntry<any> | null = null;
    let minScore = Infinity;

    // Find LRU entry based on access time and hit count
    this.cache.forEach((entry, key) => {
      const score = entry.timestamp + (entry.hits * 1000); // Weight hits
      if (score < minScore) {
        minScore = score;
        lruKey = key;
        lruEntry = entry;
      }
    });

    if (lruKey && lruEntry) {
      // Log eviction for debugging if needed
      const hits = (lruEntry as CacheEntry<any>).hits;
      const timestamp = (lruEntry as CacheEntry<any>).timestamp;
      console.debug(`Cache: Evicting LRU entry with key ${lruKey}, hits: ${hits}, age: ${Date.now() - timestamp}ms`);
      this.removeEntry(lruKey);
    }
  }

  /**
   * Get entry from cache or storage
   */
  private getEntry<T>(key: string): CacheEntry<T> | null {
    // Check memory cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Check persistent storage
    if (this.storage) {
      const storageKey = this.options.keyPrefix + key;
      const stored = this.storage.getItem(storageKey);
      if (stored) {
        try {
          const entry = JSON.parse(stored) as CacheEntry<T>;
          this.cache.set(key, entry); // Load into memory
          return entry;
        } catch (error) {
          console.error('Failed to parse cached data:', error);
          this.storage.removeItem(storageKey);
        }
      }
    }

    return null;
  }

  /**
   * Set entry in cache and storage
   */
  private setEntry<T>(key: string, entry: CacheEntry<T>): void {
    this.cache.set(key, entry);

    if (this.storage) {
      const storageKey = this.options.keyPrefix + key;
      try {
        const serialized = JSON.stringify(entry);
        
        // Check if compression is needed
        if (serialized.length > this.options.compressionThreshold) {
          // In a real implementation, you'd use a compression library here
          console.log(`Large cache entry (${serialized.length} bytes) for key: ${key}`);
        }

        this.storage.setItem(storageKey, serialized);
      } catch (error) {
        console.error('Failed to store cache entry:', error);
        // Handle storage quota exceeded
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          this.clearOldEntries();
        }
      }
    }
  }

  /**
   * Remove entry from cache and storage
   */
  private removeEntry(key: string): boolean {
    const removed = this.cache.delete(key);
    
    if (this.storage) {
      const storageKey = this.options.keyPrefix + key;
      this.storage.removeItem(storageKey);
    }

    return removed;
  }

  /**
   * Load cache from storage on initialization
   */
  private loadFromStorage(): void {
    if (!this.storage) return;

    const keys = Object.keys(this.storage);
    keys.forEach(key => {
      if (key.startsWith(this.options.keyPrefix)) {
        const cacheKey = key.substring(this.options.keyPrefix.length);
        try {
          const entry = JSON.parse(this.storage!.getItem(key)!);
          if (!this.isExpired(entry)) {
            this.cache.set(cacheKey, entry);
          } else {
            this.storage!.removeItem(key);
          }
        } catch (error) {
          console.error('Failed to load cache entry:', error);
          this.storage!.removeItem(key);
        }
      }
    });
  }

  /**
   * Clear old entries when storage is full
   */
  private clearOldEntries(): void {
    if (!this.storage) return;

    const entries: Array<[string, CacheEntry<any>]> = [];
    const keys = Object.keys(this.storage);

    keys.forEach(key => {
      if (key.startsWith(this.options.keyPrefix)) {
        try {
          const entry = JSON.parse(this.storage!.getItem(key)!);
          entries.push([key, entry]);
        } catch (error) {
          this.storage!.removeItem(key);
        }
      }
    });

    // Sort by score (lower is older/less used)
    entries.sort(([, a], [, b]) => {
      const scoreA = a.timestamp + (a.hits * 1000);
      const scoreB = b.timestamp + (b.hits * 1000);
      return scoreA - scoreB;
    });

    // Remove oldest 25% of entries
    const removeCount = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      const entry = entries[i];
      if (entry && entry[0]) {
        this.storage.removeItem(entry[0]);
      }
    }
  }
}

// Create default cache instance
export const requestCache = new RequestCache();

// Create a session-based cache
export const sessionCache = new RequestCache({ storage: 'sessionStorage' });

// Create a persistent cache with custom TTL
export const persistentCache = new RequestCache({
  storage: 'localStorage',
  defaultTTL: 30 * 60 * 1000 // 30 minutes
});

// Cache decorator
export function cached(ttl?: number, cacheInstance: RequestCache = requestCache) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor?.name || 'Unknown';

    descriptor.value = async function (...args: any[]) {
      // Use class name and method name to create a more specific key
      const cacheKey = `${className}.${propertyKey}:${JSON.stringify(args)}`;
      
      // Check cache first
      const cached = cacheInstance.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Call original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      cacheInstance.set(cacheKey, result, undefined, { ttl });
      
      return result;
    };

    return descriptor;
  };
}

export default requestCache;
