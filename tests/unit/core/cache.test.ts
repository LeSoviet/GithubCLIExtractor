import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cache } from '@/core/cache';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Cache', () => {
  let cache: Cache;
  let testCacheDir: string;

  beforeEach(async () => {
    // Create a temporary cache directory for testing
    testCacheDir = join(tmpdir(), `ghx-test-cache-${Date.now()}`);
    cache = new Cache({ ttl: 1, cacheDir: testCacheDir });
    await cache.init();
  });

  afterEach(async () => {
    // Clean up test cache directory
    if (existsSync(testCacheDir)) {
      await rm(testCacheDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should create cache directory on init', async () => {
      const newCacheDir = join(tmpdir(), `ghx-test-cache-new-${Date.now()}`);
      const newCache = new Cache({ cacheDir: newCacheDir });
      
      await newCache.init();
      
      expect(existsSync(newCacheDir)).toBe(true);
      
      // Cleanup
      await rm(newCacheDir, { recursive: true, force: true });
    });

    it('should not fail if cache directory already exists', async () => {
      await expect(cache.init()).resolves.not.toThrow();
    });
  });

  describe('set and get', () => {
    it('should store and retrieve data', async () => {
      const testData = { message: 'hello world', count: 42 };
      
      await cache.set('test-key', testData);
      const result = await cache.get<typeof testData>('test-key');
      
      expect(result).not.toBeNull();
      expect(result?.data).toEqual(testData);
    });

    it('should store data with etag', async () => {
      const testData = { message: 'hello world' };
      const etag = 'W/"abc123"';
      
      await cache.set('test-key', testData, etag);
      const result = await cache.get<typeof testData>('test-key');
      
      expect(result?.etag).toBe(etag);
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent-key');
      
      expect(result).toBeNull();
    });

    it('should handle custom TTL', async () => {
      const testData = { message: 'hello' };
      
      await cache.set('test-key', testData, undefined, 100); // 100ms TTL
      
      const result1 = await cache.get('test-key');
      expect(result1).not.toBeNull();
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result2 = await cache.get('test-key');
      expect(result2).toBeNull();
    });
  });

  describe('expiration', () => {
    it('should return null for expired entries', async () => {
      const testData = { message: 'test' };
      
      // Set with very short TTL
      await cache.set('test-key', testData, undefined, 10); // 10ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = await cache.get('test-key');
      expect(result).toBeNull();
    });

    it('should not return expired entries even with valid etag', async () => {
      const testData = { message: 'test' };
      const etag = 'W/"xyz"';
      
      await cache.set('test-key', testData, etag, 10); // 10ms TTL
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = await cache.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await cache.set('test-key', { data: 'test' });
      
      const exists = await cache.has('test-key');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await cache.has('non-existent-key');
      expect(exists).toBe(false);
    });

    it('should return false for expired key', async () => {
      await cache.set('test-key', { data: 'test' }, undefined, 10);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const exists = await cache.has('test-key');
      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing key', async () => {
      await cache.set('test-key', { data: 'test' });
      
      await cache.delete('test-key');
      
      const result = await cache.get('test-key');
      expect(result).toBeNull();
    });

    it('should not throw for non-existent key', async () => {
      await expect(cache.delete('non-existent-key')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      await cache.set('key1', { data: 'test1' });
      await cache.set('key2', { data: 'test2' });
      await cache.set('key3', { data: 'test3' });
      
      await cache.clear();
      
      const result1 = await cache.get('key1');
      const result2 = await cache.get('key2');
      const result3 = await cache.get('key3');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('should not fail on empty cache', async () => {
      await expect(cache.clear()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle corrupted cache files', async () => {
      const cacheKey = 'test-key';
      await cache.set(cacheKey, { data: 'test' });
      
      // Corrupt the cache file
      const cacheFilePath = join(testCacheDir, 'cache_' + Math.abs(hashString(cacheKey)) + '.json');
      await writeFile(cacheFilePath, 'invalid json{{{', 'utf-8');
      
      const result = await cache.get(cacheKey);
      expect(result).toBeNull();
    });
  });

  describe('stats', () => {
    it('should return cache statistics', async () => {
      await cache.set('key1', { data: 'test1' });
      await cache.set('key2', { data: 'test2' });
      
      const stats = await cache.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeLessThanOrEqual(Date.now());
    });

    it('should handle empty cache stats', async () => {
      const stats = await cache.getStats();
      
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });
});

// Helper function to hash strings (same as cache implementation)
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}

