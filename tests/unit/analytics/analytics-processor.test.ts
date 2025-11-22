import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsProcessor } from '../../../src/analytics/analytics-processor.js';
import type { AnalyticsOptions } from '../../../src/types/analytics.js';
import type { Repository } from '../../../src/types/index.js';
import * as execGh from '../../../src/utils/exec-gh.js';

// Mock the exec-gh module
vi.mock('../../../src/utils/exec-gh');

// Mock file system operations
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('../../../src/utils/output.js', () => ({
  ensureDirectory: vi.fn().mockResolvedValue(undefined),
}));

describe('AnalyticsProcessor', () => {
  let processor: AnalyticsProcessor;
  let options: AnalyticsOptions;
  let mockRepository: Repository;

  beforeEach(() => {
    mockRepository = {
      name: 'test-repo',
      owner: 'test-owner',
      url: 'https://github.com/test-owner/test-repo',
      isPrivate: false,
    };

    options = {
      enabled: true,
      format: 'markdown',
      outputPath: './test-output',
      repository: mockRepository,
      offline: false,
    };

    processor = new AnalyticsProcessor(options);

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create an instance of AnalyticsProcessor', () => {
    expect(processor).toBeInstanceOf(AnalyticsProcessor);
  });

  it('should have a generateReport method', () => {
    expect(typeof processor.generateReport).toBe('function');
  });

  describe('generateReport', () => {
    it('should generate a complete analytics report', async () => {
      // Mock all the execGhJson calls that the analytics processor makes
      const mockPRs = [
        {
          number: 1,
          state: 'merged',
          mergedAt: '2024-01-01T10:00:00Z',
          closedAt: null,
          createdAt: '2024-01-01T09:00:00Z',
          author: { login: 'user1' },
          title: 'Test PR 1',
        },
        {
          number: 2,
          state: 'closed',
          mergedAt: null,
          closedAt: '2024-01-02T10:00:00Z',
          createdAt: '2024-01-02T09:00:00Z',
          author: { login: 'user2' },
          title: 'Test PR 2',
        },
      ];

      const mockIssues = [
        {
          number: 1,
          createdAt: '2024-01-01T08:00:00Z',
          closedAt: '2024-01-01T12:00:00Z',
          state: 'closed',
          title: 'Test Issue 1',
          author: { login: 'user1' },
        },
        {
          number: 2,
          createdAt: '2024-01-02T08:00:00Z',
          closedAt: null,
          state: 'open',
          title: 'Test Issue 2',
          author: { login: 'user2' },
        },
      ];

      const mockCommits = [
        {
          commit: {
            author: {
              name: 'User One',
              date: '2024-01-01T10:00:00Z',
            },
            message: 'Initial commit',
          },
        },
        {
          commit: {
            author: {
              name: 'User Two',
              date: '2024-01-02T11:00:00Z',
            },
            message: 'Second commit',
          },
        },
      ];

      const mockReleases = [
        {
          tagName: 'v1.0.0',
          createdAt: '2024-01-01T12:00:00Z',
          publishedAt: '2024-01-01T13:00:00Z',
        },
      ];

      // Mock all the API calls
      vi.mocked(execGh.execGhJson).mockImplementation(async (command: string) => {
        if (command.includes('pr list') && command.includes('--state all --limit 500')) {
          return mockPRs;
        }
        if (command.includes('issue list') && command.includes('--state all --limit 500')) {
          return mockIssues;
        }
        if (command.includes('api repos') && command.includes('commits')) {
          return mockCommits;
        }
        if (command.includes('release list') && command.includes('--limit 100')) {
          return mockReleases;
        }
        return [];
      });

      const report = await processor.generateReport();

      // Verify the report structure
      expect(report).toBeDefined();
      expect(report.repository).toBe('test-owner/test-repo');
      expect(report.generatedAt).toBeDefined();

      // Verify activity analytics
      expect(report.activity).toBeDefined();
      expect(report.activity.success).toBe(true);
      // Log para depuración
      console.log('PRs:', report.activity.prMergeRate);
      expect(report.activity.prMergeRate.merged + report.activity.prMergeRate.closed).toBe(2);
      // Permitir que merged y closed sean 1 cada uno, pero si el mock falla, mostrar el valor
      expect([report.activity.prMergeRate.merged, report.activity.prMergeRate.closed]).toEqual([
        1, 1,
      ]);

      // Verify contributor analytics
      expect(report.contributors).toBeDefined();
      expect(report.contributors.success).toBe(true);

      // Verify label analytics
      expect(report.labels).toBeDefined();
      expect(report.labels.success).toBe(true);

      // Verify health analytics
      expect(report.health).toBeDefined();
      expect(report.health.success).toBe(true);

      // Verify that execGhJson was called with the correct commands
      expect(execGh.execGhJson).toHaveBeenCalledWith(
        expect.stringContaining('pr list --repo test-owner/test-repo --state all --limit 500'),
        expect.any(Object)
      );

      expect(execGh.execGhJson).toHaveBeenCalledWith(
        expect.stringContaining('issue list --repo test-owner/test-repo --state all --limit 500'),
        expect.any(Object)
      );

      expect(execGh.execGhJson).toHaveBeenCalledWith(
        expect.stringContaining('api repos/test-owner/test-repo/commits'),
        expect.any(Object)
      );

      expect(execGh.execGhJson).toHaveBeenCalledWith(
        expect.stringContaining('release list --repo test-owner/test-repo --limit 100'),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      // Mock an API error
      vi.mocked(execGh.execGhJson).mockRejectedValue(new Error('API Error'));

      // The report should still be generated even with errors
      const report = await processor.generateReport();

      // All sections should still be present but may have errors
      expect(report.activity).toBeDefined();
      expect(report.contributors).toBeDefined();
      expect(report.labels).toBeDefined();
      expect(report.health).toBeDefined();

      // At least one section should have errors
      const hasErrors =
        report.activity.errors.length > 0 ||
        report.contributors.errors.length > 0 ||
        report.labels.errors.length > 0 ||
        report.health.errors.length > 0;

      expect(hasErrors).toBe(true);
    });
  });

  describe('individual analytics modules', () => {
    it('should generate activity analytics', async () => {
      const mockPRs = [
        {
          number: 1,
          state: 'merged',
          mergedAt: '2024-01-01T10:00:00Z',
          closedAt: null,
          createdAt: '2024-01-01T09:00:00Z',
          author: { login: 'user1' },
          title: 'Test PR 1',
        },
      ];

      const mockIssues = [
        {
          number: 1,
          createdAt: '2024-01-01T08:00:00Z',
          closedAt: '2024-01-01T12:00:00Z',
          state: 'closed',
          title: 'Test Issue 1',
          author: { login: 'user1' },
        },
      ];

      const mockCommits = [
        {
          commit: {
            author: {
              name: 'User One',
              date: '2024-01-01T10:00:00Z',
            },
            message: 'Test commit',
          },
        },
      ];

      vi.mocked(execGh.execGhJson).mockImplementation(async (command: string) => {
        if (command.includes('pr list')) return mockPRs;
        if (command.includes('issue list')) return mockIssues;
        if (command.includes('api repos') && command.includes('commits')) return mockCommits;
        return [];
      });

      // @ts-expect-error - accessing private method for testing
      const activityAnalytics = await processor.generateActivityAnalytics();

      expect(activityAnalytics.success).toBe(true);
      expect(activityAnalytics.prMergeRate.merged).toBe(1);
      expect(activityAnalytics.prMergeRate.mergeRate).toBe(100);
    });

    it('should generate contributor analytics', async () => {
      const mockCommits = [
        {
          commit: {
            author: {
              name: 'User One',
              date: '2024-01-01T10:00:00Z',
            },
            message: 'Test commit',
          },
        },
      ];

      const mockPRs = [
        {
          number: 1,
          author: { login: 'user1' },
          reviewDecision: 'APPROVED',
          createdAt: '2024-01-01T09:00:00Z',
        },
      ];

      vi.mocked(execGh.execGhJson).mockImplementation(async (command: string) => {
        if (command.includes('api repos') && command.includes('commits')) return mockCommits;
        if (command.includes('pr list')) return mockPRs;
        return [];
      });

      // @ts-expect-error - accessing private method for testing
      const contributorAnalytics = await processor.generateContributorAnalytics();

      expect(contributorAnalytics.success).toBe(true);
      expect(contributorAnalytics.topContributors.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate label analytics', async () => {
      const mockIssues = [
        {
          number: 1,
          labels: [{ name: 'bug' }, { name: 'priority-high' }],
          createdAt: '2024-01-01T08:00:00Z',
          closedAt: '2024-01-01T12:00:00Z',
          state: 'closed',
          title: 'Test Issue 1',
          author: { login: 'user1' },
        },
      ];

      const mockPRs = [
        {
          number: 1,
          labels: [{ name: 'enhancement' }],
          createdAt: '2024-01-01T09:00:00Z',
          closedAt: '2024-01-01T11:00:00Z',
          title: 'Test PR 1',
          author: { login: 'user1' },
        },
      ];

      vi.mocked(execGh.execGhJson).mockImplementation(async (command: string) => {
        if (command.includes('issue list')) return mockIssues;
        if (command.includes('pr list')) return mockPRs;
        return [];
      });

      // @ts-expect-error - accessing private method for testing
      const labelAnalytics = await processor.generateLabelAnalytics();

      expect(labelAnalytics.success).toBe(true);
      expect(labelAnalytics.labelDistribution).toHaveLength(3);
    });

    it('should generate health analytics', async () => {
      const mockPRs = [
        {
          number: 1,
          reviewDecision: 'APPROVED',
          additions: 100,
          deletions: 50,
          createdAt: '2024-01-01T09:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
          author: { login: 'user1' },
          title: 'Test PR 1',
        },
      ];

      const mockReleases = [
        {
          tagName: 'v1.0.0',
          createdAt: '2024-01-01T12:00:00Z',
          publishedAt: '2024-01-01T13:00:00Z',
        },
      ];

      vi.mocked(execGh.execGhJson).mockImplementation(async (command: string) => {
        if (command.includes('pr list')) return mockPRs;
        if (command.includes('release list')) return mockReleases;
        return [];
      });

      // @ts-expect-error - accessing private method for testing
      const healthAnalytics = await processor.generateHealthAnalytics();

      expect(healthAnalytics.success).toBe(true);
      expect(healthAnalytics.prReviewCoverage.reviewed).toBe(1);
      expect(healthAnalytics.averagePrSize.additions).toBe(100);
    });
  });
});
