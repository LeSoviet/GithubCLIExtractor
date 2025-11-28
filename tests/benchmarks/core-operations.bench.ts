import { bench, describe } from 'vitest';
import { AdvancedCache } from '../../src/core/advanced-cache.js';
import { AdaptiveRetry } from '../../src/core/adaptive-retry.js';
import { ReportFormatter } from '../../src/utils/report-formatter.js';

describe('Core Operations Benchmarks', () => {
  describe('AdvancedCache', () => {
    bench('cache.set() - small object', () => {
      const cache = new AdvancedCache({ maxSizeMB: 100 });
      cache.set('key', { value: 'test', count: 1 });
    });

    bench('cache.get() - cache hit', () => {
      const cache = new AdvancedCache({ maxSizeMB: 100 });
      cache.set('key', { value: 'test' });
      cache.get('key');
    });

    bench('cache.get() - cache miss', () => {
      const cache = new AdvancedCache({ maxSizeMB: 100 });
      cache.get('nonexistent');
    });

    bench('cache with 1000 entries', () => {
      const cache = new AdvancedCache({ maxSizeMB: 500 });
      for (let i = 0; i < 1000; i++) {
        cache.set(`key-${i}`, {
          id: i,
          data: 'x'.repeat(100),
          timestamp: Date.now(),
        });
      }
    });

    bench('cache.getStats()', () => {
      const cache = new AdvancedCache({ maxSizeMB: 100 });
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, { value: i });
        cache.get(`key-${i}`);
      }
      cache.getStats();
    });

    bench('LRU eviction with 500 entries', () => {
      const cache = new AdvancedCache({
        maxSizeMB: 5, // Very small to force eviction
        evictionPolicy: 'LRU',
      });

      for (let i = 0; i < 500; i++) {
        cache.set(`key-${i}`, { data: 'x'.repeat(10000) });
      }
    });
  });

  describe('AdaptiveRetry', () => {
    bench('small dataset (100 items) - no retry needed', async () => {
      const retry = new AdaptiveRetry({ datasetSize: 100 });
      await retry.executeWithPartialRecovery(
        async () => Array.from({ length: 100 }, (_, i) => i),
        () => true
      );
    });

    bench('medium dataset (1000 items) - chunk processing', async () => {
      const retry = new AdaptiveRetry({ datasetSize: 1000 });
      await retry.executeWithChunking(
        async (offset, limit) => Array.from({ length: limit }, (_, i) => offset + i),
        100
      );
    });

    bench('large dataset (10000 items) - chunked with retries', async () => {
      const retry = new AdaptiveRetry({ datasetSize: 10000 });
      let callCount = 0;

      await retry.executeWithChunking(
        async (offset, limit) => {
          callCount++;
          // Simulate occasional failures
          if (callCount % 5 === 0) {
            throw new Error('Simulated connection error');
          }
          return Array.from({ length: limit }, (_, i) => offset + i);
        },
        500,
        (error) => error.message.includes('connection')
      );
    });

    bench('dataset size calculation for 5000 items', () => {
      const retry = new AdaptiveRetry({ datasetSize: 5000 });
      retry.getStrategyInfo();
    });
  });

  describe('ReportFormatter', () => {
    bench('formatMetadata() - single key-value', () => {
      const formatter = new ReportFormatter('markdown');
      formatter.formatMetadata('Author', 'John Doe');
    });

    bench('formatMetadataBlock() - 10 items', () => {
      const formatter = new ReportFormatter('markdown');
      formatter.formatMetadataBlock({
        Author: 'John Doe',
        Email: 'john@example.com',
        Date: '2024-01-01',
        Status: 'Active',
        Count: 42,
        Verified: true,
        Tags: 'a,b,c',
        Rating: 4.5,
        URL: 'https://example.com',
        Version: 'v1.0.0',
      });
    });

    bench('formatTable() - 10x5 table', () => {
      const formatter = new ReportFormatter('markdown');
      const header = ['Name', 'Email', 'Status', 'Count', 'Active'];
      const rows = Array.from({ length: 10 }, (_, i) => [
        `User ${i}`,
        `user${i}@example.com`,
        i % 2 === 0 ? 'Active' : 'Inactive',
        `${i * 100}`,
        i % 3 === 0 ? 'Yes' : 'No',
      ]);

      formatter.formatTable(header, rows);
    });

    bench('formatLabels() - 20 labels', () => {
      const formatter = new ReportFormatter('markdown');
      const labels = Array.from({ length: 20 }, (_, i) => `label-${i}`);
      formatter.formatLabels(labels);
    });

    bench('complex markdown generation', () => {
      const formatter = new ReportFormatter('markdown');
      let md = formatter.formatSection('Report', 1);
      md += formatter.formatMetadataBlock({
        Title: 'Test Report',
        Author: 'Test User',
        Date: '2024-01-01',
      });
      md += formatter.formatSection('Data', 2);
      md += formatter.formatTable(
        ['Item', 'Count'],
        [
          ['A', 10],
          ['B', 20],
        ]
      );
      md += formatter.formatLink('More Info', 'https://example.com');
    });

    bench('JSON format conversion', () => {
      const formatter = new ReportFormatter('json');
      formatter.formatItem(
        { name: 'Test', count: 42, active: true },
        (item) => `# ${item.name}`,
        (item) => JSON.stringify(item)
      );
    });
  });
});
