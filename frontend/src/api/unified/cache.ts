/**
 * Bounded cache implementation with size and memory limits
 */

import { CACHE_CONFIG } from '../../constants/cache';

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  etag?: string;
}

export interface CacheStats {
  size: number;
  sizeBytes: number;
  entries: Record<string, {
    age: number;
    ttl: number;
    hasEtag: boolean;
  }>;
}

export interface CacheConfig {
  maxSize?: number;
  maxBytes?: number;
  defaultTTL?: number;
}

export class BoundedCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private currentBytes = 0;
  private readonly maxSize: number;
  private readonly maxBytes: number;
  private readonly defaultTTL: number;

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize || CACHE_CONFIG.DEFAULT_MAX_SIZE;
    this.maxBytes = config.maxBytes || CACHE_CONFIG.DEFAULT_MAX_BYTES;
    this.defaultTTL = config.defaultTTL || CACHE_CONFIG.DEFAULT_TTL;
  }

  /**
   * Add or update a cache entry
   */
  set(key: string, data: T, ttl?: number, etag?: string): void {
    const dataStr = JSON.stringify(data);
    const size = new Blob([dataStr]).size;

    // Check if we need to make room
    this.ensureCapacity(size);

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.remove(key);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      size,
      etag
    };

    this.cache.set(key, entry);
    this.currentBytes += size;
  }

  /**
   * Get a cache entry if valid
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.ttl) {
      this.remove(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Get entry with metadata
   */
  getEntry(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.ttl) {
      this.remove(key);
      return null;
    }

    return entry;
  }

  /**
   * Remove a cache entry
   */
  remove(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentBytes -= entry.size;
      this.cache.delete(key);
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.currentBytes = 0;
  }

  /**
   * Ensure there's capacity for new data
   */
  private ensureCapacity(requiredBytes: number): void {
    // First check size limit
    while (this.cache.size >= this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }

    // Then check bytes limit
    while (this.currentBytes + requiredBytes > this.maxBytes && this.cache.size > 0) {
      this.evictOldest();
    }
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    })

    if (oldestKey) {
      this.remove(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries: Record<string, { age: number; ttl: number; hasEtag: boolean }> = {};
    
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      const age = Date.now() - entry.timestamp;
      entries[key] = {
        age,
        ttl: entry.ttl,
        hasEtag: !!entry.etag
      };
    })
    
    return {
      size: this.cache.size,
      sizeBytes: this.currentBytes,
      entries
    };
  }

  /**
   * Check if cache has an entry
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Check if entry is still valid
   */
  isValid(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const age = Date.now() - entry.timestamp;
    return age <= entry.ttl;
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToRemove.push(key);
      }
    })

    keysToRemove.forEach(key => this.remove(key));
  }

  /**
   * Get current size in bytes
   */
  getSizeBytes(): number {
    return this.currentBytes;
  }

  /**
   * Get current number of entries
   */
  getSize(): number {
    return this.cache.size;
  }
}

// Request deduplication
export class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<unknown>>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If there's already a pending request for this key, return it
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    
    // Create a new request and store it
    const requestPromise = requestFn()
      .finally(() => {
        // Remove the request from pending when it's done
        this.pendingRequests.delete(key);
      });
    
    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  clearPending(): void {
    this.pendingRequests.clear();
  }
}