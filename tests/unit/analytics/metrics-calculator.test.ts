import { describe, it, expect } from 'vitest';
import { MetricsCalculator } from '../../../src/analytics/report-generators/metrics-calculator.js';
import type { AnalyticsReport } from '../../../src/types/analytics.js';

describe('MetricsCalculator', () => {
  const mockReport: AnalyticsReport = {
    repository: 'test/repo',
    generatedAt: '2024-01-15T00:00:00Z',
    activity: {
      success: true,
      duration: 1000,
      errors: [],
      repository: 'test/repo',
      period: {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-10T00:00:00Z',
      },
      commitsOverTime: {
        dates: ['2024-01-01', '2024-01-02', '2024-01-03'],
        counts: [10, 15, 20],
      },
      prMergeRate: {
        merged: 18,
        closed: 2,
        mergeRate: 90,
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
        {
          login: 'user2',
          commits: 50,
          prs: 10,
          reviews: 5,
          totalContributions: 65,
        },
        {
          login: 'user3',
          commits: 30,
          prs: 5,
          reviews: 0,
          totalContributions: 35,
        },
      ],
      newVsReturning: {
        new: 2,
        returning: 8,
      },
      contributionDistribution: [
        { contributor: 'user1', percentage: 50 },
        { contributor: 'user2', percentage: 30 },
        { contributor: 'user3', percentage: 20 },
      ],
      busFactor: 3,
    },
    labels: {
      success: true,
      duration: 1000,
      errors: [],
      repository: 'test/repo',
      labelDistribution: [
        { label: 'bug', count: 25, percentage: 50 },
        { label: 'feature', count: 15, percentage: 30 },
        { label: 'docs', count: 10, percentage: 20 },
      ],
      issueLifecycle: {
        averageOpenDays: 5,
        medianOpenDays: 3,
      },
      mostCommonLabels: ['bug', 'feature', 'docs'],
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
        deletions: 30,
        total: 130,
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

  describe('calculateAll', () => {
    it('should calculate all metrics from report', () => {
      const metrics = MetricsCalculator.calculateAll(mockReport);

      expect(metrics).toEqual({
        prMergeRate: 90,
        reviewCoverage: 90,
        activeContributors: 5,
        busFactor: 3,
        releases: 10,
        avgIssueResolutionTime: 24,
        avgTimeToFirstReview: 12,
        avgPrSize: 130,
        issueVsPrRatio: 1.5,
        mostCommonLabel: 'bug',
        newContributorPercentage: 20,
      });
    });
  });

  describe('calculatePrMergeRate', () => {
    it('should return PR merge rate from report', () => {
      const rate = MetricsCalculator.calculatePrMergeRate(mockReport);
      expect(rate).toBe(90);
    });
  });

  describe('calculateReviewCoverage', () => {
    it('should return review coverage percentage from report', () => {
      const coverage = MetricsCalculator.calculateReviewCoverage(mockReport);
      expect(coverage).toBe(90);
    });
  });

  describe('calculateActiveContributors', () => {
    it('should return active contributors from most recent period', () => {
      const count = MetricsCalculator.calculateActiveContributors(mockReport);
      expect(count).toBe(5);
    });

    it('should return 0 if no active contributors data', () => {
      const emptyReport = {
        ...mockReport,
        activity: {
          ...mockReport.activity,
          activeContributors: [],
        },
      };

      const count = MetricsCalculator.calculateActiveContributors(emptyReport);
      expect(count).toBe(0);
    });
  });

  describe('calculateBusFactor', () => {
    it('should return bus factor from report', () => {
      const factor = MetricsCalculator.calculateBusFactor(mockReport);
      expect(factor).toBe(3);
    });
  });

  describe('calculateReleases', () => {
    it('should return number of releases from report', () => {
      const releases = MetricsCalculator.calculateReleases(mockReport);
      expect(releases).toBe(10);
    });
  });

  describe('calculateAvgIssueResolutionTime', () => {
    it('should return average issue resolution time in hours', () => {
      const time = MetricsCalculator.calculateAvgIssueResolutionTime(mockReport);
      expect(time).toBe(24);
    });
  });

  describe('calculateAvgTimeToFirstReview', () => {
    it('should return average time to first review in hours', () => {
      const time = MetricsCalculator.calculateAvgTimeToFirstReview(mockReport);
      expect(time).toBe(12);
    });
  });

  describe('calculateAvgPrSize', () => {
    it('should return average PR size (total changes)', () => {
      const size = MetricsCalculator.calculateAvgPrSize(mockReport);
      expect(size).toBe(130);
    });
  });

  describe('calculateIssueVsPrRatio', () => {
    it('should return issue vs PR ratio', () => {
      const ratio = MetricsCalculator.calculateIssueVsPrRatio(mockReport);
      expect(ratio).toBe(1.5);
    });
  });

  describe('calculateMostCommonLabel', () => {
    it('should return label with highest count', () => {
      const label = MetricsCalculator.calculateMostCommonLabel(mockReport);
      expect(label).toBe('bug');
    });

    it('should return null if no labels', () => {
      const emptyReport = {
        ...mockReport,
        labels: {
          ...mockReport.labels,
          labelDistribution: [],
        },
      };

      const label = MetricsCalculator.calculateMostCommonLabel(emptyReport);
      expect(label).toBeNull();
    });
  });

  describe('calculateNewContributorPercentage', () => {
    it('should calculate percentage of new contributors', () => {
      const percentage = MetricsCalculator.calculateNewContributorPercentage(mockReport);
      expect(percentage).toBe(20);
    });

    it('should return 0 if no contributors', () => {
      const emptyReport = {
        ...mockReport,
        contributors: {
          ...mockReport.contributors,
          newVsReturning: { new: 0, returning: 0 },
        },
      };

      const percentage = MetricsCalculator.calculateNewContributorPercentage(emptyReport);
      expect(percentage).toBe(0);
    });
  });

  describe('calculateContributorConcentration', () => {
    it('should calculate what percentage of work is done by top contributor', () => {
      const concentration = MetricsCalculator.calculateContributorConcentration(mockReport);
      // 135 / (135 + 65 + 35) = 135 / 235 ≈ 57.45%
      expect(concentration).toBeCloseTo(57.45, 1);
    });

    it('should return 0 if no contributors', () => {
      const emptyReport = {
        ...mockReport,
        contributors: {
          ...mockReport.contributors,
          topContributors: [],
        },
      };

      const concentration = MetricsCalculator.calculateContributorConcentration(emptyReport);
      expect(concentration).toBe(0);
    });

    it('should return 0 if total contributions is 0', () => {
      const emptyReport = {
        ...mockReport,
        contributors: {
          ...mockReport.contributors,
          topContributors: [
            { login: 'user1', commits: 0, prs: 0, reviews: 0, totalContributions: 0 },
          ],
        },
      };

      const concentration = MetricsCalculator.calculateContributorConcentration(emptyReport);
      expect(concentration).toBe(0);
    });
  });

  describe('calculateReviewParticipationRate', () => {
    it('should calculate percentage of contributors who review', () => {
      const rate = MetricsCalculator.calculateReviewParticipationRate(mockReport);
      // 2 out of 3 contributors have reviews > 0
      expect(rate).toBeCloseTo(66.67, 1);
    });

    it('should return 0 if no contributors', () => {
      const emptyReport = {
        ...mockReport,
        contributors: {
          ...mockReport.contributors,
          topContributors: [],
        },
      };

      const rate = MetricsCalculator.calculateReviewParticipationRate(emptyReport);
      expect(rate).toBe(0);
    });
  });

  describe('calculateCommitVelocity', () => {
    it('should calculate commits per day', () => {
      const velocity = MetricsCalculator.calculateCommitVelocity(mockReport);
      // (10 + 15 + 20) / 3 = 45 / 3 = 15
      expect(velocity).toBe(15);
    });

    it('should return 0 if no commit data', () => {
      const emptyReport = {
        ...mockReport,
        activity: {
          ...mockReport.activity,
          commitsOverTime: { dates: [], counts: [] },
        },
      };

      const velocity = MetricsCalculator.calculateCommitVelocity(emptyReport);
      expect(velocity).toBe(0);
    });
  });

  describe('calculatePrThroughput', () => {
    it('should calculate merged PRs per day', () => {
      const throughput = MetricsCalculator.calculatePrThroughput(mockReport);
      // 18 merged PRs / 9 days = 2 PRs per day
      expect(throughput).toBe(2);
    });

    it('should handle same start and end date', () => {
      const sameDate = {
        ...mockReport,
        activity: {
          ...mockReport.activity,
          period: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-01T00:00:00Z',
          },
        },
      };

      const throughput = MetricsCalculator.calculatePrThroughput(sameDate);
      // Should use minimum of 1 day
      expect(throughput).toBe(18);
    });
  });

  describe('calculateCodeChurnRate', () => {
    it('should calculate ratio of deletions to additions', () => {
      const churnRate = MetricsCalculator.calculateCodeChurnRate(mockReport);
      // (30 / 100) * 100 = 30%
      expect(churnRate).toBe(30);
    });

    it('should return 0 if no additions', () => {
      const noAdditions = {
        ...mockReport,
        health: {
          ...mockReport.health,
          averagePrSize: {
            additions: 0,
            deletions: 50,
            total: 50,
          },
        },
      };

      const churnRate = MetricsCalculator.calculateCodeChurnRate(noAdditions);
      expect(churnRate).toBe(0);
    });
  });
});
