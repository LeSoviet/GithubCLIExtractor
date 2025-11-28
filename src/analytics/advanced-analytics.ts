import type {
  ReviewVelocityAnalytics,
  TemporalTrends,
  MetricCorrelations,
  Projections,
} from '../types/analytics.js';
import { execGhJson } from '../utils/exec-gh.js';
import { MarkdownParser } from './markdown-parser.js';
import { logger } from '../utils/logger.js';

/**
 * Advanced analytics processor for Review Velocity, Trends, Correlations, and Projections
 */
export class AdvancedAnalyticsProcessor {
  constructor(
    private repository: { owner: string; name: string },
    private offline: boolean = false,
    private exportedDataPath?: string
  ) {}

  /**
   * Generate Review Velocity analytics
   */
  async generateReviewVelocity(): Promise<ReviewVelocityAnalytics> {
    const startTime = Date.now();
    const result: ReviewVelocityAnalytics = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.repository.owner}/${this.repository.name}`,
      timeToFirstReview: {
        averageHours: 0,
        medianHours: 0,
        p90Hours: 0,
      },
      timeToApproval: {
        averageDays: 0,
        medianDays: 0,
      },
      reviewBottlenecks: [],
      reviewerLoadDistribution: [],
    };

    try {
      let prs: any[] = [];

      if (!this.offline) {
        // Fetch PRs with review timeline data
        prs = await execGhJson<any[]>(
          `pr list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 200 --json number,title,author,createdAt,updatedAt,closedAt,mergedAt,reviews,reviewRequests`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );
      } else if (this.exportedDataPath) {
        const parser = new MarkdownParser(this.exportedDataPath);
        const parsedPRs = await parser.parsePullRequests();

        prs = parsedPRs.map((pr: any) => ({
          number: pr.number,
          title: pr.title,
          author: { login: pr.author },
          createdAt: pr.createdAt,
          updatedAt: pr.closedAt || pr.createdAt,
          closedAt: pr.closedAt,
          mergedAt: pr.mergedAt,
          reviews: [],
          reviewRequests: [],
        }));
      }

      // Calculate time to first review
      const reviewTimes: number[] = [];
      const approvalTimes: number[] = [];
      const reviewerStats = new Map<string, { count: number; totalResponseTime: number }>();

      for (const pr of prs) {
        if (!pr.reviews || pr.reviews.length === 0) continue;

        const createdAt = new Date(pr.createdAt);
        const firstReview = pr.reviews[0];

        if (firstReview?.submittedAt) {
          const firstReviewAt = new Date(firstReview.submittedAt);
          const hoursToFirstReview =
            (firstReviewAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

          if (hoursToFirstReview >= 0 && hoursToFirstReview < 24 * 30) {
            // Filter outliers (< 30 days)
            reviewTimes.push(hoursToFirstReview);
          }

          // Track reviewer stats
          const reviewer = firstReview.author?.login || 'unknown';
          if (reviewer !== 'unknown') {
            const stats = reviewerStats.get(reviewer) || { count: 0, totalResponseTime: 0 };
            stats.count++;
            stats.totalResponseTime += hoursToFirstReview;
            reviewerStats.set(reviewer, stats);
          }
        }

        // Calculate time to approval
        const approvedReview = pr.reviews.find((r: any) => r.state === 'APPROVED');
        if (approvedReview?.submittedAt) {
          const approvedAt = new Date(approvedReview.submittedAt);
          const daysToApproval =
            (approvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

          if (daysToApproval >= 0 && daysToApproval < 90) {
            // Filter outliers (< 90 days)
            approvalTimes.push(daysToApproval);
          }
        }
      }

      // Calculate time to first review metrics
      if (reviewTimes.length > 0) {
        const sorted = [...reviewTimes].sort((a, b) => a - b);
        result.timeToFirstReview = {
          averageHours: reviewTimes.reduce((sum, t) => sum + t, 0) / reviewTimes.length,
          medianHours: sorted[Math.floor(sorted.length / 2)],
          p90Hours: sorted[Math.floor(sorted.length * 0.9)],
        };
      }

      // Calculate time to approval metrics
      if (approvalTimes.length > 0) {
        const sorted = [...approvalTimes].sort((a, b) => a - b);
        result.timeToApproval = {
          averageDays: approvalTimes.reduce((sum, t) => sum + t, 0) / approvalTimes.length,
          medianDays: sorted[Math.floor(sorted.length / 2)],
        };
      }

      // Identify review bottlenecks (PRs waiting > 3 days)
      const now = new Date();
      const bottlenecks = prs
        .filter((pr) => pr.state !== 'MERGED' && pr.state !== 'CLOSED')
        .map((pr) => {
          const createdAt = new Date(pr.createdAt);
          const waitingDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

          let status: 'no_reviewers' | 'changes_requested' | 'approved_pending_merge' | 'unknown' =
            'unknown';

          if (!pr.reviewRequests || pr.reviewRequests.length === 0) {
            status = 'no_reviewers';
          } else if (pr.reviews && pr.reviews.some((r: any) => r.state === 'CHANGES_REQUESTED')) {
            status = 'changes_requested';
          } else if (pr.reviews && pr.reviews.some((r: any) => r.state === 'APPROVED')) {
            status = 'approved_pending_merge';
          }

          return {
            prNumber: pr.number,
            title: pr.title || `PR #${pr.number}`,
            author: pr.author?.login || 'unknown',
            waitingDays: Math.floor(waitingDays * 10) / 10,
            status,
          };
        })
        .filter((pr) => pr.waitingDays > 3)
        .sort((a, b) => b.waitingDays - a.waitingDays)
        .slice(0, 10);

      result.reviewBottlenecks = bottlenecks;

      // Calculate reviewer load distribution
      result.reviewerLoadDistribution = Array.from(reviewerStats.entries())
        .map(([reviewer, stats]) => ({
          reviewer,
          reviewCount: stats.count,
          averageResponseHours: stats.totalResponseTime / stats.count,
        }))
        .sort((a, b) => b.reviewCount - a.reviewCount)
        .slice(0, 10);

      result.success = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      logger.error(`Review velocity analytics failed: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Generate temporal trends (compare current vs previous period)
   */
  async generateTemporalTrends(): Promise<TemporalTrends> {
    const startTime = Date.now();

    // Define periods (last 30 days vs previous 30 days)
    const now = new Date();
    const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const previousEnd = currentStart;

    const result: TemporalTrends = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.repository.owner}/${this.repository.name}`,
      comparisonPeriod: {
        current: { start: currentStart.toISOString(), end: now.toISOString() },
        previous: { start: previousStart.toISOString(), end: previousEnd.toISOString() },
      },
      trends: {
        prMergeRate: {
          current: 0,
          previous: 0,
          delta: 0,
          trend: 'stable',
        },
        timeToReview: {
          current: 0,
          previous: 0,
          delta: 0,
          trend: 'stable',
        },
        activeContributors: {
          current: 0,
          previous: 0,
          delta: 0,
          trend: 'stable',
        },
        issueResolution: {
          current: 0,
          previous: 0,
          delta: 0,
          trend: 'stable',
        },
      },
      velocityTrend: [],
    };

    try {
      let prs: any[] = [];
      let issues: any[] = [];

      if (!this.offline) {
        prs = await execGhJson<any[]>(
          `pr list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 500 --json number,mergedAt,closedAt,createdAt,author`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );

        issues = await execGhJson<any[]>(
          `issue list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 500 --json createdAt,closedAt,author`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );
      } else if (this.exportedDataPath) {
        const parser = new MarkdownParser(this.exportedDataPath);
        const parsedPRs = await parser.parsePullRequests();
        const parsedIssues = await parser.parseIssues();

        prs = parsedPRs.map((pr: any) => ({
          number: pr.number,
          mergedAt: pr.mergedAt,
          closedAt: pr.closedAt,
          createdAt: pr.createdAt,
          author: { login: pr.author },
        }));

        issues = parsedIssues.map((issue: any) => ({
          createdAt: issue.createdAt,
          closedAt: issue.closedAt,
          author: { login: issue.author },
        }));
      }

      // Filter PRs by period
      const currentPRs = prs.filter((pr) => {
        const created = new Date(pr.createdAt);
        return created >= currentStart && created <= now;
      });

      const previousPRs = prs.filter((pr) => {
        const created = new Date(pr.createdAt);
        return created >= previousStart && created < previousEnd;
      });

      // Calculate PR merge rate for both periods
      const currentMerged = currentPRs.filter((pr) => pr.mergedAt).length;
      const previousMerged = previousPRs.filter((pr) => pr.mergedAt).length;

      const currentMergeRate =
        currentPRs.length > 0 ? (currentMerged / currentPRs.length) * 100 : 0;
      const previousMergeRate =
        previousPRs.length > 0 ? (previousMerged / previousPRs.length) * 100 : 0;
      const mergeRateDelta = currentMergeRate - previousMergeRate;

      result.trends.prMergeRate = {
        current: currentMergeRate,
        previous: previousMergeRate,
        delta: mergeRateDelta,
        trend:
          Math.abs(mergeRateDelta) < 5 ? 'stable' : mergeRateDelta > 0 ? 'improving' : 'declining',
      };

      // Calculate active contributors for both periods
      const currentContributors = new Set(currentPRs.map((pr) => pr.author?.login).filter(Boolean));
      const previousContributors = new Set(
        previousPRs.map((pr) => pr.author?.login).filter(Boolean)
      );

      const contributorDelta = currentContributors.size - previousContributors.size;

      result.trends.activeContributors = {
        current: currentContributors.size,
        previous: previousContributors.size,
        delta: contributorDelta,
        trend:
          Math.abs(contributorDelta) < 2
            ? 'stable'
            : contributorDelta > 0
              ? 'improving'
              : 'declining',
      };

      // Calculate issue resolution time for both periods
      const currentIssues = issues.filter((issue) => {
        const created = new Date(issue.createdAt);
        return created >= currentStart && created <= now;
      });

      const previousIssues = issues.filter((issue) => {
        const created = new Date(issue.createdAt);
        return created >= previousStart && created < previousEnd;
      });

      const currentResolutionTime = this.calculateAverageResolutionTime(currentIssues);
      const previousResolutionTime = this.calculateAverageResolutionTime(previousIssues);
      const resolutionDelta = currentResolutionTime - previousResolutionTime;

      result.trends.issueResolution = {
        current: currentResolutionTime,
        previous: previousResolutionTime,
        delta: resolutionDelta,
        // For resolution time: NEGATIVE delta = improving (lower is better, less time spent)
        trend:
          Math.abs(resolutionDelta) < 12
            ? 'stable'
            : resolutionDelta < 0
              ? 'improving'
              : 'declining',
      };

      // Calculate time to review for both periods
      const currentReviewTime = this.calculateAverageReviewTime(currentPRs);
      const previousReviewTime = this.calculateAverageReviewTime(previousPRs);
      const reviewTimeDelta = currentReviewTime - previousReviewTime;

      result.trends.timeToReview = {
        current: currentReviewTime,
        previous: previousReviewTime,
        delta: reviewTimeDelta,
        // For review time: NEGATIVE delta = improving (lower is better, faster reviews)
        trend:
          Math.abs(reviewTimeDelta) < 2
            ? 'stable'
            : reviewTimeDelta < 0
              ? 'improving'
              : 'declining',
      };

      // Generate 12-week velocity trend
      const weeksToTrack = 12;
      const velocityTrend: { week: number; mergedPRs: number }[] = [];

      for (let i = weeksToTrack - 1; i >= 0; i--) {
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

        const weekPRs = prs.filter((pr) => {
          if (!pr.mergedAt) return false;
          const merged = new Date(pr.mergedAt);
          return merged >= weekStart && merged < weekEnd;
        });

        velocityTrend.push({
          week: weeksToTrack - i,
          mergedPRs: weekPRs.length,
        });
      }

      result.velocityTrend = velocityTrend;
      result.success = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      logger.error(`Temporal trends analytics failed: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Generate metric correlations
   */
  async generateCorrelations(): Promise<MetricCorrelations> {
    const startTime = Date.now();
    const result: MetricCorrelations = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.repository.owner}/${this.repository.name}`,
      prSizeVsTimeToMerge: {
        smallPRs: { avgLines: 0, avgDays: 0 },
        mediumPRs: { avgLines: 0, avgDays: 0 },
        largePRs: { avgLines: 0, avgDays: 0 },
        correlation: 0,
      },
      dayOfWeekImpact: [],
    };

    try {
      let prs: any[] = [];

      if (!this.offline) {
        prs = await execGhJson<any[]>(
          `pr list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 300 --json number,createdAt,mergedAt,additions,deletions,reviews`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );
      }

      // Categorize PRs by size
      const smallPRs = prs.filter((pr) => pr.additions + pr.deletions < 100);
      const mediumPRs = prs.filter(
        (pr) => pr.additions + pr.deletions >= 100 && pr.additions + pr.deletions < 500
      );
      const largePRs = prs.filter((pr) => pr.additions + pr.deletions >= 500);

      result.prSizeVsTimeToMerge = {
        smallPRs: {
          avgLines: this.calculateAveragePRSize(smallPRs),
          avgDays: this.calculateAverageTimeToMerge(smallPRs),
        },
        mediumPRs: {
          avgLines: this.calculateAveragePRSize(mediumPRs),
          avgDays: this.calculateAverageTimeToMerge(mediumPRs),
        },
        largePRs: {
          avgLines: this.calculateAveragePRSize(largePRs),
          avgDays: this.calculateAverageTimeToMerge(largePRs),
        },
        correlation: this.calculateCorrelation(prs),
      };

      // Calculate day of week impact
      const dayStats = new Map<
        string,
        { totalResponseTime: number; count: number; prsSubmitted: number }
      >();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      days.forEach((day) => {
        dayStats.set(day, { totalResponseTime: 0, count: 0, prsSubmitted: 0 });
      });

      prs.forEach((pr) => {
        const createdAt = new Date(pr.createdAt);
        const dayName = days[createdAt.getDay()];
        const stats = dayStats.get(dayName)!;
        stats.prsSubmitted++;

        if (pr.reviews && pr.reviews.length > 0) {
          const firstReview = pr.reviews[0];
          if (firstReview.submittedAt) {
            const reviewedAt = new Date(firstReview.submittedAt);
            const hoursToReview = (reviewedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

            if (hoursToReview >= 0 && hoursToReview < 24 * 14) {
              // Filter outliers
              stats.totalResponseTime += hoursToReview;
              stats.count++;
            }
          }
        }
      });

      result.dayOfWeekImpact = Array.from(dayStats.entries()).map(([day, stats]) => ({
        day,
        avgResponseHours: stats.count > 0 ? stats.totalResponseTime / stats.count : 0,
        prsSubmitted: stats.prsSubmitted,
      }));

      result.success = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      logger.error(`Correlation analytics failed: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Generate projections
   */
  async generateProjections(): Promise<Projections> {
    const startTime = Date.now();
    const result: Projections = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.repository.owner}/${this.repository.name}`,
      projectionPeriod: 'next 30 days',
      predictions: {
        prsToMerge: { min: 0, max: 0, confidence: 'low' },
        openIssuesAtEndOfPeriod: { min: 0, max: 0, confidence: 'low' },
        releasesProbability: 0,
      },
      backlogBurndown: [],
    };

    try {
      let prs: any[] = [];
      let issues: any[] = [];
      let releases: any[] = [];

      if (!this.offline) {
        prs = await execGhJson<any[]>(
          `pr list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 500 --json mergedAt,createdAt`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );

        issues = await execGhJson<any[]>(
          `issue list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 500 --json createdAt,closedAt,state`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );

        releases = await execGhJson<any[]>(
          `release list --repo ${this.repository.owner}/${this.repository.name} --limit 50 --json publishedAt`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );
      }

      // Calculate average PR merge rate for last 30 days
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentMergedPRs = prs.filter((pr) => {
        if (!pr.mergedAt) return false;
        const merged = new Date(pr.mergedAt);
        return merged >= last30Days && merged <= now;
      });

      const avgPRsPerMonth = recentMergedPRs.length;
      const stdDev = Math.sqrt(avgPRsPerMonth) || 1; // Simple approximation

      result.predictions.prsToMerge = {
        min: Math.max(0, Math.floor(avgPRsPerMonth - stdDev)),
        max: Math.ceil(avgPRsPerMonth + stdDev),
        confidence: avgPRsPerMonth > 10 ? 'high' : avgPRsPerMonth > 5 ? 'medium' : 'low',
      };

      // Calculate issue projection
      const currentOpenIssues = issues.filter((issue) => issue.state === 'open').length;
      const recentClosedIssues = issues.filter((issue) => {
        if (!issue.closedAt) return false;
        const closed = new Date(issue.closedAt);
        return closed >= last30Days && closed <= now;
      }).length;

      const recentOpenedIssues = issues.filter((issue) => {
        const created = new Date(issue.createdAt);
        return created >= last30Days && created <= now;
      }).length;

      const netIssueChange = recentOpenedIssues - recentClosedIssues;
      const projectedOpenIssues = Math.max(0, currentOpenIssues + netIssueChange);

      result.predictions.openIssuesAtEndOfPeriod = {
        min: Math.max(0, Math.floor(projectedOpenIssues * 0.8)),
        max: Math.ceil(projectedOpenIssues * 1.2),
        confidence: recentClosedIssues > 5 ? 'medium' : 'low',
      };

      // Calculate release probability
      const recentReleases = releases.filter((release) => {
        const published = new Date(release.publishedAt);
        return published >= last30Days && published <= now;
      });

      result.predictions.releasesProbability = recentReleases.length > 0 ? 70 : 30;

      // Generate backlog burndown projection
      const weeksToProject = 6;
      const weeklyBurnRate = recentClosedIssues / 4.3; // Average per week

      for (let week = 1; week <= weeksToProject; week++) {
        const projectedOpenIssues = Math.max(
          0,
          Math.floor(currentOpenIssues - week * weeklyBurnRate)
        );
        const idealOpenIssues = Math.max(
          0,
          Math.floor(currentOpenIssues * (1 - week / weeksToProject))
        );

        result.backlogBurndown.push({
          week,
          projectedOpenIssues,
          idealOpenIssues,
        });
      }

      result.success = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      logger.error(`Projections analytics failed: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // Helper methods
  private calculateAverageResolutionTime(issues: any[]): number {
    const closedIssues = issues.filter((issue) => issue.closedAt && issue.createdAt);
    if (closedIssues.length === 0) return 0;

    const totalHours = closedIssues.reduce((sum, issue) => {
      const created = new Date(issue.createdAt);
      const closed = new Date(issue.closedAt);
      return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60);
    }, 0);

    return totalHours / closedIssues.length;
  }

  private calculateAverageReviewTime(prs: any[]): number {
    // Calculate average time from PR creation to first review request/approval
    // If no reviews, return 0 (no review time yet)
    if (prs.length === 0) return 0;

    const prsWithReviews = prs.filter((pr) => pr.reviews && pr.reviews.length > 0);
    if (prsWithReviews.length === 0) return 0;

    const totalHours = prsWithReviews.reduce((sum, pr) => {
      const created = new Date(pr.createdAt);
      const firstReview = pr.reviews[0];
      if (firstReview?.submittedAt) {
        const reviewed = new Date(firstReview.submittedAt);
        return sum + (reviewed.getTime() - created.getTime()) / (1000 * 60 * 60);
      }
      return sum;
    }, 0);

    return totalHours / prsWithReviews.length;
  }

  private calculateAveragePRSize(prs: any[]): number {
    if (prs.length === 0) return 0;
    const totalLines = prs.reduce((sum, pr) => sum + (pr.additions || 0) + (pr.deletions || 0), 0);
    return Math.floor(totalLines / prs.length);
  }

  private calculateAverageTimeToMerge(prs: any[]): number {
    const mergedPRs = prs.filter((pr) => pr.mergedAt && pr.createdAt);
    if (mergedPRs.length === 0) return 0;

    const totalDays = mergedPRs.reduce((sum, pr) => {
      const created = new Date(pr.createdAt);
      const merged = new Date(pr.mergedAt);
      return sum + (merged.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);

    return totalDays / mergedPRs.length;
  }

  private calculateCorrelation(prs: any[]): number {
    const validPRs = prs.filter((pr) => pr.mergedAt && pr.createdAt && pr.additions !== undefined);
    if (validPRs.length < 10) return 0;

    const sizes = validPRs.map((pr) => (pr.additions || 0) + (pr.deletions || 0));
    const times = validPRs.map((pr) => {
      const created = new Date(pr.createdAt);
      const merged = new Date(pr.mergedAt);
      return (merged.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    });

    // Simple Pearson correlation
    const n = sizes.length;
    const sumSize = sizes.reduce((a, b) => a + b, 0);
    const sumTime = times.reduce((a, b) => a + b, 0);
    const sumSizeTime = sizes.reduce((sum, size, i) => sum + size * times[i], 0);
    const sumSizeSquared = sizes.reduce((sum, size) => sum + size * size, 0);
    const sumTimeSquared = times.reduce((sum, time) => sum + time * time, 0);

    const numerator = n * sumSizeTime - sumSize * sumTime;
    const denominator = Math.sqrt(
      (n * sumSizeSquared - sumSize * sumSize) * (n * sumTimeSquared - sumTime * sumTime)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }
}
