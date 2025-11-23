import type { AnalyticsReport } from '../../types/analytics.js';

/**
 * Calculated metrics derived from analytics report
 */
export interface CalculatedMetrics {
  /** PR merge rate percentage */
  prMergeRate: number;
  /** PR review coverage percentage */
  reviewCoverage: number;
  /** Number of active contributors in the most recent period */
  activeContributors: number;
  /** Bus factor - number of critical contributors */
  busFactor: number;
  /** Number of releases in the analysis period */
  releases: number;
  /** Average issue resolution time in hours */
  avgIssueResolutionTime: number;
  /** Average time to first review in hours */
  avgTimeToFirstReview: number;
  /** Average PR size (total changes) */
  avgPrSize: number;
  /** Issue to PR ratio */
  issueVsPrRatio: number;
  /** Most common label */
  mostCommonLabel: string | null;
  /** Percentage of new vs returning contributors */
  newContributorPercentage: number;
}

/**
 * Metrics calculator for analytics reports
 * Pure functions that extract and compute derived metrics
 */
export class MetricsCalculator {
  /**
   * Calculate all metrics from an analytics report
   * @param report - Analytics report to calculate metrics from
   * @returns Calculated metrics object
   */
  static calculateAll(report: AnalyticsReport): CalculatedMetrics {
    return {
      prMergeRate: this.calculatePrMergeRate(report),
      reviewCoverage: this.calculateReviewCoverage(report),
      activeContributors: this.calculateActiveContributors(report),
      busFactor: this.calculateBusFactor(report),
      releases: this.calculateReleases(report),
      avgIssueResolutionTime: this.calculateAvgIssueResolutionTime(report),
      avgTimeToFirstReview: this.calculateAvgTimeToFirstReview(report),
      avgPrSize: this.calculateAvgPrSize(report),
      issueVsPrRatio: this.calculateIssueVsPrRatio(report),
      mostCommonLabel: this.calculateMostCommonLabel(report),
      newContributorPercentage: this.calculateNewContributorPercentage(report),
    };
  }

  /**
   * Calculate PR merge rate percentage
   */
  static calculatePrMergeRate(report: AnalyticsReport): number {
    return report.activity.prMergeRate.mergeRate;
  }

  /**
   * Calculate PR review coverage percentage
   */
  static calculateReviewCoverage(report: AnalyticsReport): number {
    return report.health.prReviewCoverage.coveragePercentage;
  }

  /**
   * Calculate number of active contributors in most recent period
   */
  static calculateActiveContributors(report: AnalyticsReport): number {
    const activeContributors = report.activity.activeContributors;
    return activeContributors.length > 0 ? activeContributors[0].contributors : 0;
  }

  /**
   * Calculate bus factor
   */
  static calculateBusFactor(report: AnalyticsReport): number {
    return report.contributors.busFactor;
  }

  /**
   * Calculate number of releases
   */
  static calculateReleases(report: AnalyticsReport): number {
    return report.health.deploymentFrequency.releases;
  }

  /**
   * Calculate average issue resolution time in hours
   */
  static calculateAvgIssueResolutionTime(report: AnalyticsReport): number {
    return report.activity.issueResolutionTime.averageHours;
  }

  /**
   * Calculate average time to first review in hours
   */
  static calculateAvgTimeToFirstReview(report: AnalyticsReport): number {
    return report.health.timeToFirstReview.averageHours;
  }

  /**
   * Calculate average PR size (total changes)
   */
  static calculateAvgPrSize(report: AnalyticsReport): number {
    return report.health.averagePrSize.total;
  }

  /**
   * Calculate issue vs PR ratio
   */
  static calculateIssueVsPrRatio(report: AnalyticsReport): number {
    return report.labels.issueVsPrratio;
  }

  /**
   * Calculate most common label
   */
  static calculateMostCommonLabel(report: AnalyticsReport): string | null {
    const labels = report.labels.labelDistribution;
    if (labels.length === 0) return null;

    // Find label with highest count
    const mostCommon = labels.reduce(
      (max, label) => (label.count > max.count ? label : max),
      labels[0]
    );

    return mostCommon.label;
  }

  /**
   * Calculate percentage of new contributors
   */
  static calculateNewContributorPercentage(report: AnalyticsReport): number {
    const { new: newCount, returning } = report.contributors.newVsReturning;
    const total = newCount + returning;

    if (total === 0) return 0;

    return (newCount / total) * 100;
  }

  /**
   * Calculate contributor concentration (what percentage of work is done by top contributor)
   */
  static calculateContributorConcentration(report: AnalyticsReport): number {
    const topContributors = report.contributors.topContributors;
    if (topContributors.length === 0) return 0;

    const totalContributions = topContributors.reduce((sum, c) => sum + c.totalContributions, 0);

    if (totalContributions === 0) return 0;

    const topContribution = topContributors[0].totalContributions;
    return (topContribution / totalContributions) * 100;
  }

  /**
   * Calculate review participation rate (percentage of contributors who review)
   */
  static calculateReviewParticipationRate(report: AnalyticsReport): number {
    const topContributors = report.contributors.topContributors;
    if (topContributors.length === 0) return 0;

    const reviewers = topContributors.filter((c) => c.reviews > 0).length;
    return (reviewers / topContributors.length) * 100;
  }

  /**
   * Calculate commit velocity (commits per day in the period)
   */
  static calculateCommitVelocity(report: AnalyticsReport): number {
    const commits = report.activity.commitsOverTime;
    const totalCommits = commits.counts.reduce((sum, count) => sum + count, 0);
    const days = commits.dates.length;

    if (days === 0) return 0;

    return totalCommits / days;
  }

  /**
   * Calculate PR throughput (merged PRs per day in the period)
   */
  static calculatePrThroughput(report: AnalyticsReport): number {
    const { merged } = report.activity.prMergeRate;

    // Get period duration in days
    const start = new Date(report.activity.period.start);
    const end = new Date(report.activity.period.end);
    const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return merged / days;
  }

  /**
   * Calculate code churn rate (ratio of deletions to additions)
   */
  static calculateCodeChurnRate(report: AnalyticsReport): number {
    const { additions, deletions } = report.health.averagePrSize;

    if (additions === 0) return 0;

    return (deletions / additions) * 100;
  }
}
