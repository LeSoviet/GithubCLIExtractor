import { mkdir, writeFile, readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

export interface CacheEntry<T> {
  data: T;
  etag?: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
  ttl?: number; // Default TTL in hours
  cacheDir?: string;
}

/**
 * Simple file-based cache system with ETag support
 */
export class Cache {
  private cacheDir: string;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    const { ttl = 24, cacheDir } = options;

    this.cacheDir = cacheDir || join(homedir(), '.ghextractor', 'cache');
    this.defaultTTL = ttl * 60 * 60 * 1000; // Convert hours to milliseconds
  }

  /**
   * Initialize cache directory
   */
  async init(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
      logger.debug(`Created cache directory: ${this.cacheDir}`);
    }
  }

  /**
   * Generate cache key from string
   */
  private getCacheKey(key: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `cache_${Math.abs(hash)}.json`;
  }

  /**
   * Get cache file path
   */
  private getCacheFilePath(key: string): string {
    return join(this.cacheDir, this.getCacheKey(key));
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    await this.init();

    const filePath = this.getCacheFilePath(key);

    try {
      if (!existsSync(filePath)) {
        return null;
      }

      const content = await readFile(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);

      // Check if entry is expired
      const now = Date.now();
      const age = now - entry.timestamp;

      if (age > entry.ttl) {
        logger.debug(`Cache expired for key: ${key}`);
        return null;
      }

      logger.debug(`Cache hit for key: ${key}`);
      return entry;
    } catch (error) {
      logger.warn(`Failed to read cache for key ${key}: ${error}`);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, data: T, etag?: string, ttl?: number): Promise<void> {
    await this.init();

    const entry: CacheEntry<T> = {
      data,
      etag,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    const filePath = this.getCacheFilePath(key);

    try {
      await writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      logger.debug(`Cached data for key: ${key}`);
    } catch (error) {
      logger.warn(`Failed to write cache for key ${key}: ${error}`);
    }
  }

  /**
   * Check if cache entry exists and is valid
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    const filePath = this.getCacheFilePath(key);

    try {
      if (existsSync(filePath)) {
        await import('fs/promises').then((fs) => fs.unlink(filePath));
        logger.debug(`Deleted cache for key: ${key}`);
      }
    } catch (error) {
      logger.warn(`Failed to delete cache for key ${key}: ${error}`);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (existsSync(this.cacheDir)) {
        const fs = await import('fs/promises');
        const files = await fs.readdir(this.cacheDir);

        for (const file of files) {
          if (file.startsWith('cache_')) {
            await fs.unlink(join(this.cacheDir, file));
          }
        }

        logger.info('Cache cleared');
      }
    } catch (error) {
      logger.warn(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry: number;
  }> {
    await this.init();

    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(this.cacheDir);
      const cacheFiles = files.filter((f) => f.startsWith('cache_'));

      let totalSize = 0;
      let oldestTimestamp = Date.now();

      for (const file of cacheFiles) {
        const filePath = join(this.cacheDir, file);
        const stats = await stat(filePath);
        totalSize += stats.size;

        try {
          const content = await readFile(filePath, 'utf-8');
          const entry: CacheEntry<unknown> = JSON.parse(content);
          if (entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
          }
        } catch {
          // Skip invalid cache files
        }
      }

      return {
        totalEntries: cacheFiles.length,
        totalSize,
        oldestEntry: oldestTimestamp,
      };
    } catch (error) {
      logger.warn(`Failed to get cache stats: ${error}`);
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: Date.now(),
      };
    }
  }
}

// Singleton instance
let cacheInstance: Cache | null = null;

/**
 * Get the global cache instance
 */
export function getCache(): Cache {
  if (!cacheInstance) {
    cacheInstance = new Cache();
  }
  return cacheInstance;
}
