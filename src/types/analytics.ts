import type { Repository } from './index.js';

/**
 * Analytics configuration options
 */
export interface AnalyticsOptions {
  /** Enable analytics generation */
  enabled: boolean;

  /** Output format for analytics report */
  format: 'markdown' | 'json' | 'pdf';

  /** Output path for analytics report */
  outputPath: string;

  /** Repository to analyze */
  repository: Repository;

  /** Use offline mode - parse exported markdown files instead of GitHub API */
  offline?: boolean;

  /** Path to exported data (required for offline mode) */
  exportedDataPath?: string;
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
 * Review Velocity metrics - Time-based review analytics
 */
export interface ReviewVelocityAnalytics extends AnalyticsResult {
  repository: string;
  timeToFirstReview: {
    averageHours: number;
    medianHours: number;
    p90Hours: number; // 90th percentile
  };
  timeToApproval: {
    averageDays: number;
    medianDays: number;
  };
  reviewBottlenecks: {
    prNumber: number;
    title: string;
    author: string;
    createdAt: string; // ISO timestamp for age calculation
    waitingDays: number; // Days waiting for merge (from creation date)
    status: 'no_reviewers' | 'changes_requested' | 'approved_pending_merge' | 'unknown';
  }[];
  reviewerLoadDistribution: {
    reviewer: string;
    reviewCount: number;
    averageResponseHours: number;
  }[];
}

/**
 * Temporal trends - Compare current period with previous period
 */
export interface TemporalTrends extends AnalyticsResult {
  repository: string;
  comparisonPeriod: {
    current: { start: string; end: string };
    previous: { start: string; end: string };
  };
  trends: {
    prMergeRate: {
      current: number;
      previous: number;
      delta: number;
      trend: 'improving' | 'declining' | 'stable';
    };
    timeToReview: {
      current: number;
      previous: number;
      delta: number;
      trend: 'improving' | 'declining' | 'stable';
    };
    activeContributors: {
      current: number;
      previous: number;
      delta: number;
      trend: 'improving' | 'declining' | 'stable';
    };
    issueResolution: {
      current: number;
      previous: number;
      delta: number;
      trend: 'improving' | 'declining' | 'stable';
    };
  };
  velocityTrend: {
    week: number;
    mergedPRs: number;
  }[];
}

/**
 * Correlations between metrics
 */
export interface MetricCorrelations extends AnalyticsResult {
  repository: string;
  prSizeVsTimeToMerge: {
    smallPRs: { avgLines: number; avgDays: number };
    mediumPRs: { avgLines: number; avgDays: number };
    largePRs: { avgLines: number; avgDays: number };
    correlation: number; // correlation coefficient
  };
  dayOfWeekImpact: {
    day: string;
    avgResponseHours: number;
    prsSubmitted: number;
  }[];
}

/**
 * Projections and predictions
 */
export interface Projections extends AnalyticsResult {
  repository: string;
  projectionPeriod: string; // e.g., "next 30 days"
  predictions: {
    prsToMerge: { min: number; max: number; confidence: 'high' | 'medium' | 'low' };
    openIssuesAtEndOfPeriod: { min: number; max: number; confidence: 'high' | 'medium' | 'low' };
    releasesProbability: number; // percentage
  };
  backlogBurndown: {
    week: number;
    projectedOpenIssues: number;
    idealOpenIssues: number;
  }[];
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
  reviewVelocity?: ReviewVelocityAnalytics;
  trends?: TemporalTrends;
  correlations?: MetricCorrelations;
  projections?: Projections;
  benchmark?: any; // BenchmarkComparison type from benchmarking.ts
  narrative?: any; // ExecutiveNarrative type from narrative-generator.ts
}
