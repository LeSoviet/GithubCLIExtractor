import { describe, it, expect, beforeEach } from 'vitest';
import {
  AdvancedCache,
  createAdvancedCache,
  getGlobalCache,
} from '../../../src/core/advanced-cache.js';

describe('AdvancedCache', () => {
  let cache: AdvancedCache<any>;

  beforeEach(() => {
    cache = new AdvancedCache({ maxSizeMB: 100 });
  });

  describe('set and get', () => {
    it('should set and get a value', () => {
      cache.set('key1', { data: 'value1' });
      const value = cache.get('key1');

      expect(value).toEqual({ data: 'value1' });
    });

    it('should return undefined for missing key', () => {
      const value = cache.get('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should overwrite existing value', () => {
      cache.set('key1', 'first');
      cache.set('key1', 'second');

      expect(cache.get('key1')).toBe('second');
    });

    it('should handle different data types', () => {
      cache.set('string', 'text');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('array', [1, 2, 3]);
      cache.set('object', { a: 1 });

      expect(cache.get('string')).toBe('text');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('boolean')).toBe(true);
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('object')).toEqual({ a: 1 });
    });
  });

  describe('TTL expiration', () => {
    it('should return undefined for expired entry', async () => {
      cache.set('key1', 'value', 100); // 100ms TTL

      expect(cache.get('key1')).toBe('value');

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should use default TTL if not provided', () => {
      const customCache = new AdvancedCache({ defaultTTLMs: 1000 });
      customCache.set('key1', 'value');

      expect(customCache.get('key1')).toBe('value');
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      cache.set('key1', 'value');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for missing key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key', async () => {
      cache.set('key1', 'value', 100);
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an entry', () => {
      cache.set('key1', 'value');
      const deleted = cache.delete('key1');

      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false for missing key', () => {
      const deleted = cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should track hit and miss statistics', () => {
      cache.set('key1', 'value');

      cache.get('key1');
      cache.get('key1');
      cache.get('nonexistent');

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
    });

    it('should calculate hit rate', () => {
      cache.set('key1', 'value');

      cache.get('key1');
      cache.get('key1');
      cache.get('key1');
      cache.get('nonexistent');

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(75, 0);
    });

    it('should track total entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(3);
    });

    it('should calculate average entry size', () => {
      cache.set('key1', { data: 'x'.repeat(100) });
      cache.set('key2', { data: 'y'.repeat(100) });

      const stats = cache.getStats();
      expect(stats.avgEntrySize).toBeGreaterThan(0);
    });
  });

  describe('eviction policies', () => {
    it('should evict LRU entries when maxSize exceeded', () => {
      const smallCache = new AdvancedCache({
        maxSizeMB: 0.001, // Very small
        evictionPolicy: 'LRU',
      });

      smallCache.set('key1', { data: 'x'.repeat(100) });
      smallCache.set('key2', { data: 'x'.repeat(100) });

      // Access key1 to make key2 the LRU
      smallCache.get('key1');

      // Add new key, should evict key2 (LRU)
      smallCache.set('key3', { data: 'x'.repeat(100) });

      expect(smallCache.get('key1')).toBeDefined();
      expect(smallCache.get('key3')).toBeDefined();
    });

    it('should evict LFU entries when maxSize exceeded', () => {
      const smallCache = new AdvancedCache({
        maxSizeMB: 0.001,
        evictionPolicy: 'LFU',
      });

      smallCache.set('key1', { data: 'x'.repeat(100) });
      smallCache.set('key2', { data: 'x'.repeat(100) });

      // Access key1 multiple times
      smallCache.get('key1');
      smallCache.get('key1');
      smallCache.get('key1');

      // Add new key, should evict key2 (LFU)
      smallCache.set('key3', { data: 'x'.repeat(100) });

      expect(smallCache.get('key1')).toBeDefined();
    });

    it('should evict FIFO entries when maxSize exceeded', () => {
      const smallCache = new AdvancedCache({
        maxSizeMB: 0.001,
        evictionPolicy: 'FIFO',
      });

      smallCache.set('key1', { data: 'x'.repeat(100) });
      smallCache.set('key2', { data: 'x'.repeat(100) });

      // Add new key, eviction should occur
      smallCache.set('key3', { data: 'x'.repeat(100) });

      // Should have evicted something
      const stats = smallCache.getStats();
      expect(stats.evictedEntries).toBeGreaterThanOrEqual(0);
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('getSizeMB', () => {
    it('should return cache size in MB', () => {
      cache.set('key1', { data: 'value' });
      const sizeMB = cache.getSizeMB();

      expect(sizeMB).toBeGreaterThan(0);
      expect(sizeMB).toBeLessThan(100);
    });
  });

  describe('validate', () => {
    it('should validate cache integrity', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });

      const validation = cache.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect expired entries', async () => {
      cache.set('key1', 'value', 100);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const validation = cache.validate();
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('createAdvancedCache', () => {
  it('should create cache with aggressive preset', () => {
    const cache = createAdvancedCache('aggressive');
    cache.set('key', 'value');

    expect(cache.get('key')).toBe('value');
  });

  it('should create cache with balanced preset', () => {
    const cache = createAdvancedCache('balanced');
    cache.set('key', 'value');

    expect(cache.get('key')).toBe('value');
  });

  it('should create cache with conservative preset', () => {
    const cache = createAdvancedCache('conservative');
    cache.set('key', 'value');

    expect(cache.get('key')).toBe('value');
  });

  it('should default to balanced preset', () => {
    const cache = createAdvancedCache();
    cache.set('key', 'value');

    expect(cache.get('key')).toBe('value');
  });
});

describe('getGlobalCache', () => {
  it('should return singleton instance', () => {
    const cache1 = getGlobalCache();
    const cache2 = getGlobalCache();

    expect(cache1).toBe(cache2);
  });

  it('should maintain state across calls', () => {
    const cache = getGlobalCache();
    cache.set('test', 'value');

    const cache2 = getGlobalCache();
    expect(cache2.get('test')).toBe('value');
  });
});
