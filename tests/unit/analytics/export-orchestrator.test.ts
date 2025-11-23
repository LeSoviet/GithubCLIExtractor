import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExportOrchestrator } from '../../../src/analytics/report-generators/export-orchestrator.js';
import type { AnalyticsReport } from '../../../src/types/analytics.js';
import * as output from '../../../src/utils/output.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock output utilities
vi.mock('../../../src/utils/output.js', () => ({
  ensureDirectory: vi.fn().mockResolvedValue(undefined),
}));

// Import fs after mocking
import fs from 'fs/promises';

describe('ExportOrchestrator', () => {
  let orchestrator: ExportOrchestrator;
  let mockReport: AnalyticsReport;

  beforeEach(() => {
    orchestrator = new ExportOrchestrator();
    vi.clearAllMocks();

    // Reset mocks to default successful behavior
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(output.ensureDirectory).mockResolvedValue(undefined);

    mockReport = {
      repository: 'test/repo',
      generatedAt: new Date().toISOString(),
      activity: {
        success: true,
        duration: 1000,
        errors: [],
        repository: 'test/repo',
        period: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
        commitsOverTime: {
          dates: ['2024-01-01'],
          counts: [10],
        },
        prMergeRate: {
          merged: 5,
          closed: 2,
          mergeRate: 71.4,
        },
        issueResolutionTime: {
          averageHours: 24,
          medianHours: 18,
        },
        busiestDays: [{ day: 'Monday', count: 10 }],
        activeContributors: [{ period: '2024-01', contributors: 5 }],
      },
      contributors: {
        success: true,
        duration: 1000,
        errors: [],
        repository: 'test/repo',
        topContributors: [
          {
            login: 'user1',
            commits: 100,
            prs: 20,
            reviews: 15,
            totalContributions: 135,
          },
        ],
        newVsReturning: {
          new: 2,
          returning: 8,
        },
        contributionDistribution: [{ contributor: 'user1', percentage: 50 }],
        busFactor: 3,
      },
      labels: {
        success: true,
        duration: 1000,
        errors: [],
        repository: 'test/repo',
        labelDistribution: [{ label: 'bug', count: 10, percentage: 50 }],
        issueLifecycle: {
          averageOpenDays: 5,
          medianOpenDays: 3,
        },
        mostCommonLabels: ['bug', 'feature'],
        issueVsPrratio: 1.5,
      },
      health: {
        success: true,
        duration: 1000,
        errors: [],
        repository: 'test/repo',
        prReviewCoverage: {
          reviewed: 18,
          total: 20,
          coveragePercentage: 90,
        },
        averagePrSize: {
          additions: 100,
          deletions: 50,
          total: 150,
        },
        timeToFirstReview: {
          averageHours: 12,
          medianHours: 8,
        },
        deploymentFrequency: {
          releases: 10,
          period: 'monthly',
        },
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('export', () => {
    it('should export report in markdown format', async () => {
      // Mock the executeExport method to return a successful result
      const mockExecuteExport = vi.spyOn(orchestrator as any, 'executeExport');
      mockExecuteExport.mockResolvedValue({
        format: 'markdown',
        filePath: './test-output/test-repo-analytics.md',
        success: true,
      });

      const result = await orchestrator.export(mockReport, {
        format: 'markdown',
        outputPath: './test-output',
        baseFilename: 'test-repo-analytics',
        packageVersion: '1.0.0',
      });

      expect(result.success).toBe(true);
      expect(result.totalExports).toBe(1);
      expect(result.successfulExports).toBe(1);
      expect(result.failedExports).toBe(0);
      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].format).toBe('markdown');
      expect(result.exports[0].success).toBe(true);
      expect(result.exports[0].filePath).toContain('test-repo-analytics.md');

      expect(output.ensureDirectory).toHaveBeenCalledWith('./test-output');
      expect(mockExecuteExport).toHaveBeenCalledTimes(1);
    });

    it('should export report in json format', async () => {
      // Mock the executeExport method to return a successful result
      const mockExecuteExport = vi.spyOn(orchestrator as any, 'executeExport');
      mockExecuteExport.mockResolvedValue({
        format: 'json',
        filePath: './test-output/test-repo-analytics.json',
        success: true,
      });

      const result = await orchestrator.export(mockReport, {
        format: 'json',
        outputPath: './test-output',
        baseFilename: 'test-repo-analytics',
      });

      expect(result.success).toBe(true);
      expect(result.totalExports).toBe(1);
      expect(result.successfulExports).toBe(1);
      expect(result.failedExports).toBe(0);
      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].format).toBe('json');
      expect(result.exports[0].success).toBe(true);
      expect(result.exports[0].filePath).toContain('test-repo-analytics.json');

      expect(mockExecuteExport).toHaveBeenCalledTimes(1);
    });

    it('should export report in both formats', async () => {
      // Mock the executeExport method to return successful results
      const mockExecuteExport = vi.spyOn(orchestrator as any, 'executeExport');
      mockExecuteExport.mockResolvedValueOnce({
        format: 'markdown',
        filePath: './test-output/test-repo-analytics.md',
        success: true,
      });
      mockExecuteExport.mockResolvedValueOnce({
        format: 'json',
        filePath: './test-output/test-repo-analytics.json',
        success: true,
      });

      const result = await orchestrator.export(mockReport, {
        format: 'both',
        outputPath: './test-output',
        baseFilename: 'test-repo-analytics',
        packageVersion: '1.0.0',
      });

      expect(result.success).toBe(true);
      expect(result.totalExports).toBe(2);
      expect(result.successfulExports).toBe(2);
      expect(result.failedExports).toBe(0);
      expect(result.exports).toHaveLength(2);

      expect(result.exports[0].format).toBe('markdown');
      expect(result.exports[0].filePath).toContain('.md');
      expect(result.exports[1].format).toBe('json');
      expect(result.exports[1].filePath).toContain('.json');

      expect(mockExecuteExport).toHaveBeenCalledTimes(2);
    });

    it('should handle directory creation failure', async () => {
      vi.mocked(output.ensureDirectory).mockRejectedValueOnce(new Error('Permission denied'));

      const result = await orchestrator.export(mockReport, {
        format: 'markdown',
        outputPath: './test-output',
        baseFilename: 'test-repo-analytics',
      });

      expect(result.success).toBe(false);
      expect(result.totalExports).toBe(1);
      expect(result.successfulExports).toBe(0);
      expect(result.failedExports).toBe(1);
      expect(result.exports[0].error).toContain('Permission denied');

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle file write failure', async () => {
      // Mock the executeExport method to return a failed result
      const mockExecuteExport = vi.spyOn(orchestrator as any, 'executeExport');
      mockExecuteExport.mockResolvedValue({
        format: 'markdown',
        filePath: './test-output/test-repo-analytics.md',
        success: false,
        error: 'Disk full',
      });

      const result = await orchestrator.export(mockReport, {
        format: 'markdown',
        outputPath: './test-output',
        baseFilename: 'test-repo-analytics',
      });

      expect(result.success).toBe(false);
      expect(result.totalExports).toBe(1);
      expect(result.successfulExports).toBe(0);
      expect(result.failedExports).toBe(1);
      expect(result.exports[0].error).toContain('Disk full');
    });

    it('should handle partial failure in both format', async () => {
      // Mock the executeExport method to return one success and one failure
      const mockExecuteExport = vi.spyOn(orchestrator as any, 'executeExport');
      mockExecuteExport.mockResolvedValueOnce({
        format: 'markdown',
        filePath: './test-output/test-repo-analytics.md',
        success: true,
      });
      mockExecuteExport.mockResolvedValueOnce({
        format: 'json',
        filePath: './test-output/test-repo-analytics.json',
        success: false,
        error: 'JSON write failed',
      });

      const result = await orchestrator.export(mockReport, {
        format: 'both',
        outputPath: './test-output',
        baseFilename: 'test-repo-analytics',
      });

      expect(result.success).toBe(false);
      expect(result.totalExports).toBe(2);
      expect(result.successfulExports).toBe(1);
      expect(result.failedExports).toBe(1);

      expect(result.exports[0].success).toBe(true);
      expect(result.exports[0].format).toBe('markdown');
      expect(result.exports[1].success).toBe(false);
      expect(result.exports[1].format).toBe('json');
      expect(result.exports[1].error).toBe('JSON write failed');
    });

    it('should use correct file paths', async () => {
      // Mock the executeExport method to return successful results
      const mockExecuteExport = vi.spyOn(orchestrator as any, 'executeExport');
      mockExecuteExport.mockResolvedValueOnce({
        format: 'markdown',
        filePath: './custom/path/my-report.md',
        success: true,
      });
      mockExecuteExport.mockResolvedValueOnce({
        format: 'json',
        filePath: './custom/path/my-report.json',
        success: true,
      });

      await orchestrator.export(mockReport, {
        format: 'both',
        outputPath: './custom/path',
        baseFilename: 'my-report',
      });

      expect(mockExecuteExport).toHaveBeenCalledTimes(2);
      expect(mockExecuteExport).toHaveBeenNthCalledWith(
        1,
        mockReport,
        expect.anything(),
        './custom/path',
        'my-report',
        undefined
      );
      expect(mockExecuteExport).toHaveBeenNthCalledWith(
        2,
        mockReport,
        expect.anything(),
        './custom/path',
        'my-report',
        undefined
      );
    });
  });

  describe('getSummaryMessage', () => {
    it('should return success message for single export', () => {
      const result = {
        success: true,
        exports: [
          {
            format: 'markdown',
            filePath: './output/report.md',
            success: true,
          },
        ],
        totalExports: 1,
        successfulExports: 1,
        failedExports: 0,
      };

      const message = ExportOrchestrator.getSummaryMessage(result);
      expect(message).toContain('markdown');
      expect(message).toContain('./output/report.md');
    });

    it('should return success message for multiple exports', () => {
      const result = {
        success: true,
        exports: [
          {
            format: 'markdown',
            filePath: './output/report.md',
            success: true,
          },
          {
            format: 'json',
            filePath: './output/report.json',
            success: true,
          },
        ],
        totalExports: 2,
        successfulExports: 2,
        failedExports: 0,
      };

      const message = ExportOrchestrator.getSummaryMessage(result);
      expect(message).toContain('2 formats');
      expect(message).toContain('markdown');
      expect(message).toContain('json');
    });

    it('should return error message for failed export', () => {
      const result = {
        success: false,
        exports: [
          {
            format: 'markdown',
            filePath: './output/report.md',
            success: false,
            error: 'Write failed',
          },
        ],
        totalExports: 1,
        successfulExports: 0,
        failedExports: 1,
      };

      const message = ExportOrchestrator.getSummaryMessage(result);
      expect(message).toContain('Export failed');
      expect(message).toContain('markdown');
      expect(message).toContain('Write failed');
    });

    it('should return error message with multiple failures', () => {
      const result = {
        success: false,
        exports: [
          {
            format: 'markdown',
            filePath: './output/report.md',
            success: false,
            error: 'MD write failed',
          },
          {
            format: 'json',
            filePath: './output/report.json',
            success: false,
            error: 'JSON write failed',
          },
        ],
        totalExports: 2,
        successfulExports: 0,
        failedExports: 2,
      };

      const message = ExportOrchestrator.getSummaryMessage(result);
      expect(message).toContain('Export failed');
      expect(message).toContain('MD write failed');
      expect(message).toContain('JSON write failed');
    });
  });

  describe('getExportedFiles', () => {
    it('should return file paths for successful exports', () => {
      const result = {
        success: true,
        exports: [
          {
            format: 'markdown',
            filePath: './output/report.md',
            success: true,
          },
          {
            format: 'json',
            filePath: './output/report.json',
            success: true,
          },
        ],
        totalExports: 2,
        successfulExports: 2,
        failedExports: 0,
      };

      const files = ExportOrchestrator.getExportedFiles(result);
      expect(files).toEqual(['./output/report.md', './output/report.json']);
    });

    it('should filter out failed exports', () => {
      const result = {
        success: false,
        exports: [
          {
            format: 'markdown',
            filePath: './output/report.md',
            success: true,
          },
          {
            format: 'json',
            filePath: './output/report.json',
            success: false,
            error: 'Write failed',
          },
        ],
        totalExports: 2,
        successfulExports: 1,
        failedExports: 1,
      };

      const files = ExportOrchestrator.getExportedFiles(result);
      expect(files).toEqual(['./output/report.md']);
    });

    it('should return empty array when all exports fail', () => {
      const result = {
        success: false,
        exports: [
          {
            format: 'markdown',
            filePath: './output/report.md',
            success: false,
            error: 'Write failed',
          },
        ],
        totalExports: 1,
        successfulExports: 0,
        failedExports: 1,
      };

      const files = ExportOrchestrator.getExportedFiles(result);
      expect(files).toEqual([]);
    });
  });
});
