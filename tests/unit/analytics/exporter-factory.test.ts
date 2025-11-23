import { describe, it, expect } from 'vitest';
import {
  AnalyticsExporterFactory,
  MarkdownAnalyticsExporter,
  JsonAnalyticsExporter,
  type AnalyticsExporter,
} from '../../../src/analytics/report-generators/exporter-factory.js';
import type { AnalyticsReport } from '../../../src/types/analytics.js';

describe('AnalyticsExporterFactory', () => {
  const mockReport: AnalyticsReport = {
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

  describe('createExporters', () => {
    it('should create markdown exporter for markdown format', () => {
      const exporters = AnalyticsExporterFactory.createExporters('markdown');

      expect(exporters).toHaveLength(1);
      expect(exporters[0]).toBeInstanceOf(MarkdownAnalyticsExporter);
    });

    it('should create json exporter for json format', () => {
      const exporters = AnalyticsExporterFactory.createExporters('json');

      expect(exporters).toHaveLength(1);
      expect(exporters[0]).toBeInstanceOf(JsonAnalyticsExporter);
    });

    it('should create both exporters for both format', () => {
      const exporters = AnalyticsExporterFactory.createExporters('both');

      expect(exporters).toHaveLength(2);
      expect(exporters[0]).toBeInstanceOf(MarkdownAnalyticsExporter);
      expect(exporters[1]).toBeInstanceOf(JsonAnalyticsExporter);
    });

    it('should throw error for unknown format', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid format
        AnalyticsExporterFactory.createExporters('invalid');
      }).toThrow('Unknown export format: invalid');
    });
  });

  describe('createExporter', () => {
    it('should create markdown exporter for markdown format', () => {
      const exporter = AnalyticsExporterFactory.createExporter('markdown');

      expect(exporter).toBeInstanceOf(MarkdownAnalyticsExporter);
    });

    it('should create json exporter for json format', () => {
      const exporter = AnalyticsExporterFactory.createExporter('json');

      expect(exporter).toBeInstanceOf(JsonAnalyticsExporter);
    });
  });

  describe('MarkdownAnalyticsExporter', () => {
    it('should export report in markdown format', async () => {
      const exporter = new MarkdownAnalyticsExporter();
      const result = await exporter.export(mockReport, '1.0.0');

      expect(result).toContain('# 📊 Analytics Report');
      expect(result).toContain('test/repo');
      expect(result).toContain('Executive Summary');
    });

    it('should use default version when not provided', async () => {
      const exporter = new MarkdownAnalyticsExporter();
      const result = await exporter.export(mockReport);

      expect(result).toContain('**Version:** n/a');
    });

    it('should return .md file extension', () => {
      const exporter = new MarkdownAnalyticsExporter();

      expect(exporter.getFileExtension()).toBe('.md');
    });

    it('should return markdown format name', () => {
      const exporter = new MarkdownAnalyticsExporter();

      expect(exporter.getFormatName()).toBe('markdown');
    });
  });

  describe('JsonAnalyticsExporter', () => {
    it('should export report in json format', async () => {
      const exporter = new JsonAnalyticsExporter();
      const result = await exporter.export(mockReport);

      const parsed = JSON.parse(result);
      expect(parsed.repository).toBe('test/repo');
      expect(parsed.activity).toBeDefined();
      expect(parsed.contributors).toBeDefined();
      expect(parsed.labels).toBeDefined();
      expect(parsed.health).toBeDefined();
    });

    it('should format json with 2 space indentation', async () => {
      const exporter = new JsonAnalyticsExporter();
      const result = await exporter.export(mockReport);

      // Check that the JSON is formatted with 2 space indentation
      expect(result).toContain('  "repository"');
      expect(result).toContain('  "activity"');
    });

    it('should return .json file extension', () => {
      const exporter = new JsonAnalyticsExporter();

      expect(exporter.getFileExtension()).toBe('.json');
    });

    it('should return json format name', () => {
      const exporter = new JsonAnalyticsExporter();

      expect(exporter.getFormatName()).toBe('json');
    });
  });

  describe('Exporter interface compliance', () => {
    it('should implement AnalyticsExporter interface for markdown', async () => {
      const exporter: AnalyticsExporter = new MarkdownAnalyticsExporter();

      expect(exporter.export).toBeDefined();
      expect(exporter.getFileExtension).toBeDefined();
      expect(exporter.getFormatName).toBeDefined();

      const result = await exporter.export(mockReport);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should implement AnalyticsExporter interface for json', async () => {
      const exporter: AnalyticsExporter = new JsonAnalyticsExporter();

      expect(exporter.export).toBeDefined();
      expect(exporter.getFileExtension).toBeDefined();
      expect(exporter.getFormatName).toBeDefined();

      const result = await exporter.export(mockReport);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
