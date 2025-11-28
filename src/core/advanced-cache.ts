import { logger } from '../utils/logger.js';

/**
 * Cache entry with TTL and metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  avgEntrySize: number;
  totalSize: number;
  evictedEntries: number;
}

/**
 * Cache eviction policy
 */
export type EvictionPolicy = 'LRU' | 'LFU' | 'FIFO' | 'TTL';

/**
 * Advanced caching strategy with TTL, eviction policies, and statistics
 * Optimized for distributed scenarios and memory efficiency
 */
export class AdvancedCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    evicted: 0,
  };

  private readonly maxSize: number; // Max cache size in MB
  private readonly defaultTTL: number; // Default TTL in milliseconds
  private readonly evictionPolicy: EvictionPolicy;
  private currentSize: number = 0;

  constructor(options?: {
    maxSizeMB?: number;
    defaultTTLMs?: number;
    evictionPolicy?: EvictionPolicy;
  }) {
    this.maxSize = (options?.maxSizeMB || 100) * 1024 * 1024; // Convert to bytes
    this.defaultTTL = options?.defaultTTLMs || 60 * 60 * 1000; // Default 1 hour
    this.evictionPolicy = options?.evictionPolicy || 'LRU';

    logger.debug(
      `AdvancedCache initialized: maxSize=${this.maxSize / 1024 / 1024}MB, TTL=${this.defaultTTL}ms, policy=${this.evictionPolicy}`
    );

    // Run cleanup routine
    this.startCleanupRoutine();
  }

  /**
   * Set a value in cache with optional TTL override
   */
  set(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL;
    const estimatedSize = this.estimateSize(value);

    // Check if we need to evict entries
    if (this.currentSize + estimatedSize > this.maxSize) {
      this.evict(estimatedSize);
    }

    // Remove old entry if exists
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentSize -= oldEntry.size;
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      lastAccessed: Date.now(),
      size: estimatedSize,
    };

    this.cache.set(key, entry);
    this.currentSize += estimatedSize;

    logger.debug(`Cache SET: ${key} (size: ${estimatedSize} bytes, TTL: ${ttl}ms)`);
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      this.stats.misses++;
      logger.debug(`Cache EXPIRED: ${key}`);
      return undefined;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    logger.debug(`Cache HIT: ${key} (hits: ${entry.hits})`);
    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);

    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
      logger.debug(`Cache DELETE: ${key}`);
      return true;
    }

    return false;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.currentSize = 0;
    logger.info(`Cache cleared (${count} entries removed)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalHits = this.stats.hits;
    const totalMisses = this.stats.misses;
    const totalAccess = totalHits + totalMisses;
    const hitRate = totalAccess > 0 ? (totalHits / totalAccess) * 100 : 0;

    const avgEntrySize =
      this.cache.size > 0
        ? Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0) /
          this.cache.size
        : 0;

    return {
      totalEntries: this.cache.size,
      totalHits,
      totalMisses,
      hitRate,
      avgEntrySize,
      totalSize: this.currentSize,
      evictedEntries: this.stats.evicted,
    };
  }

  /**
   * Print cache statistics
   */
  printStats(): void {
    const stats = this.getStats();
    logger.info(`=== Cache Statistics ===`);
    logger.info(`Total Entries: ${stats.totalEntries}`);
    logger.info(`Hit Rate: ${stats.hitRate.toFixed(2)}%`);
    logger.info(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
    logger.info(`Avg Entry Size: ${(stats.avgEntrySize / 1024).toFixed(2)}KB`);
    logger.info(`Evicted: ${stats.evictedEntries}`);
  }

  /**
   * Estimate object size in bytes (simple heuristic)
   */
  private estimateSize(obj: any): number {
    try {
      const json = JSON.stringify(obj);
      return new Blob([json]).size;
    } catch {
      return 1024; // Default estimate if serialization fails
    }
  }

  /**
   * Evict entries based on policy
   */
  private evict(neededSpace: number): void {
    let freedSpace = 0;

    if (this.evictionPolicy === 'LRU') {
      // Least Recently Used
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      for (const [key, entry] of entries) {
        this.cache.delete(key);
        this.currentSize -= entry.size;
        this.stats.evicted++;
        freedSpace += entry.size;

        if (freedSpace >= neededSpace) {
          break;
        }
      }
    } else if (this.evictionPolicy === 'LFU') {
      // Least Frequently Used
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].hits - b[1].hits);

      for (const [key, entry] of entries) {
        this.cache.delete(key);
        this.currentSize -= entry.size;
        this.stats.evicted++;
        freedSpace += entry.size;

        if (freedSpace >= neededSpace) {
          break;
        }
      }
    } else if (this.evictionPolicy === 'FIFO') {
      // First In First Out
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (const [key, entry] of entries) {
        this.cache.delete(key);
        this.currentSize -= entry.size;
        this.stats.evicted++;
        freedSpace += entry.size;

        if (freedSpace >= neededSpace) {
          break;
        }
      }
    } else if (this.evictionPolicy === 'TTL') {
      // Evict oldest TTL entries first
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].ttl - b[1].ttl);

      for (const [key, entry] of entries) {
        this.cache.delete(key);
        this.currentSize -= entry.size;
        this.stats.evicted++;
        freedSpace += entry.size;

        if (freedSpace >= neededSpace) {
          break;
        }
      }
    }

    logger.debug(
      `Cache eviction (${this.evictionPolicy}): freed ${freedSpace / 1024}KB, ${this.stats.evicted} entries evicted`
    );
  }

  /**
   * Start cleanup routine to remove expired entries
   */
  private startCleanupRoutine(): void {
    // Run cleanup every 5 minutes
    setInterval(
      () => {
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
          if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.currentSize -= entry.size;
            cleaned++;
          }
        }

        if (cleaned > 0) {
          logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
        }
      },
      5 * 60 * 1000
    );
  }

  /**
   * Get cache size in MB
   */
  getSizeMB(): number {
    return this.currentSize / 1024 / 1024;
  }

  /**
   * Validate cache integrity
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check total size
    let calculatedSize = 0;
    for (const entry of this.cache.values()) {
      calculatedSize += entry.size;
    }

    if (Math.abs(calculatedSize - this.currentSize) > 1000) {
      errors.push(`Size mismatch: calculated=${calculatedSize}, current=${this.currentSize}`);
    }

    // Check for expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() - entry.timestamp > entry.ttl) {
        errors.push(`Expired entry found: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Factory function with presets
 */
export function createAdvancedCache<T = any>(
  preset: 'aggressive' | 'balanced' | 'conservative' = 'balanced'
): AdvancedCache<T> {
  const presets = {
    aggressive: {
      maxSizeMB: 50,
      defaultTTLMs: 30 * 60 * 1000, // 30 minutes
      evictionPolicy: 'LFU' as const,
    },
    balanced: {
      maxSizeMB: 200,
      defaultTTLMs: 60 * 60 * 1000, // 1 hour
      evictionPolicy: 'LRU' as const,
    },
    conservative: {
      maxSizeMB: 500,
      defaultTTLMs: 24 * 60 * 60 * 1000, // 24 hours
      evictionPolicy: 'FIFO' as const,
    },
  };

  return new AdvancedCache(presets[preset]);
}

/**
 * Singleton global cache instance
 */
let globalCache: AdvancedCache | null = null;

/**
 * Get or create global cache
 */
export function getGlobalCache<T = any>(): AdvancedCache<T> {
  if (!globalCache) {
    globalCache = createAdvancedCache('balanced');
  }
  return globalCache as AdvancedCache<T>;
}
