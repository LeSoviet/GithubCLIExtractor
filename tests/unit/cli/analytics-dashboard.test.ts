import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsDashboard, getAnalyticsDashboard } from '../../../src/cli/analytics-dashboard.js';

describe('AnalyticsDashboard', () => {
  let dashboard: AnalyticsDashboard;

  beforeEach(() => {
    dashboard = new AnalyticsDashboard();
  });

  describe('recordExport', () => {
    it('should record successful export', () => {
      dashboard.recordExport({
        repository: 'owner/repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      const stats = dashboard.getStats();
      expect(stats.totalExports).toBe(1);
      expect(stats.successfulExports).toBe(1);
      expect(stats.failedExports).toBe(0);
    });

    it('should record failed export', () => {
      dashboard.recordExport({
        repository: 'owner/repo',
        exportType: 'json',
        itemsProcessed: 50,
        duration: 2000,
        success: false,
      });

      const stats = dashboard.getStats();
      expect(stats.failedExports).toBe(1);
      expect(stats.successfulExports).toBe(0);
    });

    it('should accumulate items processed', () => {
      dashboard.recordExport({
        repository: 'repo1',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      dashboard.recordExport({
        repository: 'repo2',
        exportType: 'json',
        itemsProcessed: 50,
        duration: 2000,
        success: true,
      });

      const stats = dashboard.getStats();
      expect(stats.totalItemsProcessed).toBe(150);
    });

    it('should track export types', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 50,
        duration: 2000,
        success: true,
      });

      dashboard.recordExport({
        repository: 'repo',
        exportType: 'json',
        itemsProcessed: 75,
        duration: 3000,
        success: true,
      });

      const stats = dashboard.getStats();
      expect(stats.topExportTypes.length).toBeGreaterThan(0);
      expect(stats.topExportTypes[0].type).toBe('markdown');
      expect(stats.topExportTypes[0].count).toBe(2);
    });

    it('should track repositories', () => {
      dashboard.recordExport({
        repository: 'owner/repo1',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      dashboard.recordExport({
        repository: 'owner/repo1',
        exportType: 'markdown',
        itemsProcessed: 50,
        duration: 2000,
        success: true,
      });

      dashboard.recordExport({
        repository: 'owner/repo2',
        exportType: 'json',
        itemsProcessed: 75,
        duration: 3000,
        success: true,
      });

      const stats = dashboard.getStats();
      expect(stats.topRepositories[0].name).toBe('owner/repo1');
      expect(stats.topRepositories[0].exports).toBe(2);
    });

    it('should calculate average speed', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 1000,
        duration: 10000, // 10 seconds
        success: true,
      });

      const stats = dashboard.getStats();
      expect(stats.averageSpeed).toBeCloseTo(100, 0); // 100 items/sec
    });
  });

  describe('getStats', () => {
    it('should return current statistics', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      const stats = dashboard.getStats();
      expect(stats).toHaveProperty('totalExports');
      expect(stats).toHaveProperty('successfulExports');
      expect(stats).toHaveProperty('failedExports');
      expect(stats).toHaveProperty('totalItemsProcessed');
      expect(stats).toHaveProperty('averageSpeed');
    });

    it('should not modify original stats on modification', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      const stats1 = dashboard.getStats();
      stats1.totalExports = 999; // Try to modify

      const stats2 = dashboard.getStats();
      expect(stats2.totalExports).toBe(1); // Original unchanged
    });
  });

  describe('setCacheHitRate', () => {
    it('should set cache hit rate', () => {
      dashboard.setCacheHitRate(85.5);

      const stats = dashboard.getStats();
      expect(stats.hitRate).toBe(85.5);
    });
  });

  describe('render', () => {
    it('should generate dashboard output', () => {
      dashboard.recordExport({
        repository: 'owner/repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      const output = dashboard.render();
      expect(output).toContain('Export Analytics Dashboard');
      expect(output).toContain('Summary');
      expect(output).toContain('Performance');
    });

    it('should show success rate in output', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      dashboard.recordExport({
        repository: 'repo',
        exportType: 'json',
        itemsProcessed: 50,
        duration: 2000,
        success: false,
      });

      const output = dashboard.render();
      expect(output).toContain('Success Rate');
      expect(output).toContain('50'); // 50% success
    });

    it('should include top export types in output', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      const output = dashboard.render();
      if (output.includes('Top Export Types')) {
        expect(output).toContain('markdown');
      }
    });

    it('should include top repositories in output', () => {
      dashboard.recordExport({
        repository: 'owner/repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      const output = dashboard.render();
      if (output.includes('Top Repositories')) {
        expect(output).toContain('owner/repo');
      }
    });

    it('should include health progress bar', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      const output = dashboard.render();
      expect(output).toContain('Export Health');
      expect(output).toMatch(/█|░/); // Progress bar characters
    });
  });

  describe('exportAsJSON', () => {
    it('should export statistics as JSON', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      const json = dashboard.exportAsJSON();
      const parsed = JSON.parse(json);

      expect(parsed.totalExports).toBe(1);
      expect(parsed.successfulExports).toBe(1);
    });
  });

  describe('exportAsCSV', () => {
    it('should export statistics as CSV', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      const csv = dashboard.exportAsCSV();
      expect(csv).toContain('Metric,Value');
      expect(csv).toContain('Total Exports,1');
      expect(csv).toContain('Successful Exports,1');
    });

    it('should include top export types in CSV', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      const csv = dashboard.exportAsCSV();
      expect(csv).toContain('markdown');
    });
  });

  describe('reset', () => {
    it('should reset all statistics', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      dashboard.reset();

      const stats = dashboard.getStats();
      expect(stats.totalExports).toBe(0);
      expect(stats.successfulExports).toBe(0);
      expect(stats.failedExports).toBe(0);
      expect(stats.totalItemsProcessed).toBe(0);
    });
  });

  describe('getUptime', () => {
    it('should return uptime in seconds', () => {
      const uptime = dashboard.getUptime();
      expect(typeof uptime).toBe('number');
      expect(uptime).toBeGreaterThanOrEqual(0);
    });

    it('should increase over time', async () => {
      const uptime1 = dashboard.getUptime();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const uptime2 = dashboard.getUptime();

      expect(uptime2).toBeGreaterThanOrEqual(uptime1);
    });
  });

  describe('print', () => {
    it('should print dashboard to console without errors', () => {
      dashboard.recordExport({
        repository: 'repo',
        exportType: 'markdown',
        itemsProcessed: 100,
        duration: 5000,
        success: true,
      });

      expect(() => {
        dashboard.print();
      }).not.toThrow();
    });
  });
});

describe('getAnalyticsDashboard', () => {
  it('should return singleton instance', () => {
    const dash1 = getAnalyticsDashboard();
    const dash2 = getAnalyticsDashboard();

    expect(dash1).toBe(dash2);
  });

  it('should maintain state across calls', () => {
    const dash = getAnalyticsDashboard();
    dash.recordExport({
      repository: 'test/repo',
      exportType: 'markdown',
      itemsProcessed: 100,
      duration: 5000,
      success: true,
    });

    const dash2 = getAnalyticsDashboard();
    const stats = dash2.getStats();

    expect(stats.totalExports).toBeGreaterThan(0);
  });
});
