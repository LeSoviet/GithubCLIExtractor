import type { Repository } from './index.js';

/**
 * Analytics configuration options
 */
export interface AnalyticsOptions {
  /** Enable analytics generation */
  enabled: boolean;

  /** Output format for analytics report */
  format: 'markdown' | 'json' | 'both';

  /** Output path for analytics report */
  outputPath: string;

  /** Repository to analyze */
  repository: Repository;
}

/**
 * Base interface for all analytics results
 */
export interface AnalyticsResult {
  success: boolean;
  duration: number;
  errors: string[];
}

/**
 * Activity analytics results
 */
export interface ActivityAnalytics extends AnalyticsResult {
  repository: string;
  period: {
    start: string;
    end: string;
  };
  commitsOverTime: {
    dates: string[];
    counts: number[];
  };
  prMergeRate: {
    merged: number;
    closed: number;
    mergeRate: number; // percentage
  };
  issueResolutionTime: {
    averageHours: number;
    medianHours: number;
  };
  busiestDays: {
    day: string;
    count: number;
  }[];
  activeContributors: {
    period: string;
    contributors: number;
  }[];
}

/**
 * Contributor analytics results
 */
export interface ContributorAnalytics extends AnalyticsResult {
  repository: string;
  topContributors: {
    login: string;
    commits: number;
    prs: number;
    reviews: number;
    totalContributions: number;
  }[];
  newVsReturning: {
    new: number;
    returning: number;
  };
  contributionDistribution: {
    contributor: string;
    percentage: number;
  }[];
  busFactor: number; // Number of contributors whose departure would critically impact the project
}

/**
 * Label/Issue analytics results
 */
export interface LabelAnalytics extends AnalyticsResult {
  repository: string;
  labelDistribution: {
    label: string;
    count: number;
    percentage: number;
  }[];
  issueLifecycle: {
    averageOpenDays: number;
    medianOpenDays: number;
  };
  mostCommonLabels: string[];
  issueVsPrratio: number; // ratio of issues to PRs
}

/**
 * Code health metrics results
 */
export interface HealthAnalytics extends AnalyticsResult {
  repository: string;
  prReviewCoverage: {
    reviewed: number;
    total: number;
    coveragePercentage: number;
  };
  averagePrSize: {
    additions: number;
    deletions: number;
    total: number;
  };
  timeToFirstReview: {
    averageHours: number;
    medianHours: number;
  };
  deploymentFrequency: {
    releases: number;
    period: string; // e.g., "monthly", "weekly"
  };
}

/**
 * Combined analytics report
 */
export interface AnalyticsReport {
  repository: string;
  generatedAt: string;
  activity: ActivityAnalytics;
  contributors: ContributorAnalytics;
  labels: LabelAnalytics;
  health: HealthAnalytics;
}
