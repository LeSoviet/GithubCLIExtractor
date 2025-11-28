import type {
  AnalyticsOptions,
  AnalyticsReport,
  ActivityAnalytics,
  ContributorAnalytics,
  LabelAnalytics,
  HealthAnalytics,
} from '../types/analytics.js';
import { logger } from '../utils/logger.js';
import { ensureDirectory } from '../utils/output.js';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { execGhJson } from '../utils/exec-gh.js';
import { MarkdownParser } from './markdown-parser.js';
import { MarkdownReportGenerator } from './report-generators/index.js';
import { AdvancedAnalyticsProcessor } from './advanced-analytics.js';
import { ReportValidator } from './report-validator.js';
import { BenchmarkingEngine } from './benchmarking.js';
import { NarrativeGenerator } from './narrative-generator.js';
import { HtmlReportGenerator } from '../utils/html-report-generator.js';
import { PuppeteerPdfConverter } from '../utils/puppeteer-pdf-converter.js';

/**
 * AnalyticsProcessor handles generating analytics reports from exported data
 */
export class AnalyticsProcessor {
  private options: AnalyticsOptions;
  private markdownGenerator: MarkdownReportGenerator;
  // private startTime: number = 0;

  constructor(options: AnalyticsOptions) {
    this.options = options;
    this.markdownGenerator = new MarkdownReportGenerator();
  }

  /**
   * Generate a complete analytics report
   */
  async generateReport(): Promise<AnalyticsReport> {
    const reportStartTime = Date.now();

    logger.info(
      `Generating analytics report for ${this.options.repository.owner}/${this.options.repository.name}...`
    );

    try {
      // Ensure output directory exists
      await ensureDirectory(this.options.outputPath);

      // Generate all analytics modules in parallel for faster execution
      const [activity, contributors, labels, health] = await Promise.all([
        this.generateActivityAnalytics(),
        this.generateContributorAnalytics(),
        this.generateLabelAnalytics(),
        this.generateHealthAnalytics(),
      ]);

      // Generate advanced analytics
      logger.info(
        'Generating advanced analytics (Review Velocity, Trends, Correlations, Projections)...'
      );
      const advancedProcessor = new AdvancedAnalyticsProcessor(
        this.options.repository,
        this.options.offline || false,
        this.options.exportedDataPath
      );

      const [reviewVelocity, trends, correlations, projections] = await Promise.all([
        advancedProcessor.generateReviewVelocity(),
        advancedProcessor.generateTemporalTrends(),
        advancedProcessor.generateCorrelations(),
        advancedProcessor.generateProjections(),
      ]);

      const report: AnalyticsReport = {
        repository: `${this.options.repository.owner}/${this.options.repository.name}`,
        generatedAt: new Date().toISOString(),
        activity,
        contributors,
        labels,
        health,
        reviewVelocity,
        trends,
        correlations,
        projections,
        isPartialData: this.options.allowPartialAnalytics,
        missingDataTypes: this.options.missingDataTypes,
      };

      // Validate report for numerical consistency with context-aware thresholds
      logger.info('Validating report for numerical consistency...');

      // Build validation context for intelligent threshold calculation
      const totalPRs = report.activity.prMergeRate.merged + report.activity.prMergeRate.closed;
      const totalIssues =
        report.labels.issueVsPrratio > 0 ? Math.round(totalPRs * report.labels.issueVsPrratio) : 0;
      const datasetSize = totalPRs + totalIssues;

      // Detect diff mode using multiple heuristics:
      // 1. Small dataset suggests incremental/diff export
      // 2. Short time period (< 60 days) suggests filtered export
      const periodStart = new Date(report.activity.period.start);
      const periodEnd = new Date(report.activity.period.end);
      const periodDays = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);

      const isDiffMode = Boolean(this.options.offline && (datasetSize < 150 || periodDays < 60));

      const validationContext = {
        isOfflineMode: this.options.offline || false,
        isDiffMode,
        datasetSize,
        period: report.activity.period,
      };

      logger.debug(
        `  → Dataset: ${totalPRs} PRs, ${totalIssues} issues (${datasetSize} total), period: ${periodDays.toFixed(0)} days`
      );
      if (isDiffMode) {
        logger.debug(`  → Diff mode detected: using relaxed validation thresholds`);
      }

      const validator = new ReportValidator();
      const validationResult = validator.validate(report, validationContext);

      if (!validationResult.valid) {
        logger.error(
          `[FAILED] Report validation FAILED with ${validationResult.errors.length} critical errors`
        );
        const summary = validator.generateSummary(validationResult);
        logger.error(summary);

        logger.info('');
        logger.info('[INFO] Possible causes:');
        logger.info('  1. Partial data export (missing Issues, Commits, etc)');
        logger.info('  2. Date filters applied inconsistently');
        logger.info('  3. Data inconsistency in markdown files');

        throw new Error(
          'Report validation failed - cannot generate report with data inconsistencies'
        );
      } else if (validationResult.warnings.length > 0) {
        logger.info(
          `[PASSED] Report validation passed with ${validationResult.warnings.length} warnings`
        );
      } else {
        logger.success('[PASSED] Report validation passed all checks');
      }

      // Generate benchmark comparison
      logger.info('Comparing metrics against industry benchmarks...');
      const benchmarkEngine = new BenchmarkingEngine();
      const benchmark = await benchmarkEngine.compareToBenchmarks(report);
      report.benchmark = benchmark;

      // Generate executive narrative
      logger.info('Generating executive narrative and insights...');
      const narrativeGenerator = new NarrativeGenerator();
      const narrative = await narrativeGenerator.generate(report, benchmark);
      report.narrative = narrative;

      // Export report in specified formats
      await this.exportReport(report);

      const reportDuration = ((Date.now() - reportStartTime) / 1000).toFixed(2);
      logger.success(`[OK] Analytics report generated in ${reportDuration}s`);
      return report;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[ERROR] Failed to generate analytics report: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Generate activity analytics
   */
  /**
   * Calculate the analysis period from actual data dates
   * @param items - Array of items with createdAt dates
   * @returns Object with start and end ISO date strings
   */
  private calculateAnalysisPeriod(items: any[]): { start: string; end: string } {
    if (items.length === 0) {
      // Fallback to last 30 days if no data
      return {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      };
    }

    // Find earliest and latest dates from the data
    const dates = items
      .filter((item) => item.createdAt)
      .map((item) => new Date(item.createdAt).getTime())
      .filter((time) => !isNaN(time));

    if (dates.length === 0) {
      // Fallback if no valid dates
      return {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      };
    }

    const earliestDate = Math.min(...dates);
    const latestDate = Math.max(...dates);

    return {
      start: new Date(earliestDate).toISOString(),
      end: new Date(latestDate).toISOString(),
    };
  }

  private async generateActivityAnalytics(): Promise<ActivityAnalytics> {
    const startTime = Date.now();
    const result: ActivityAnalytics = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.options.repository.owner}/${this.options.repository.name}`,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Temporary, will be updated
        end: new Date().toISOString(),
      },
      commitsOverTime: {
        dates: [],
        counts: [],
      },
      prMergeRate: {
        merged: 0,
        closed: 0,
        mergeRate: 0,
      },
      issueResolutionTime: {
        averageHours: 0,
        medianHours: 0,
      },
      busiestDays: [],
      activeContributors: [],
    };

    try {
      let prs: any[];
      let issues: any[];

      // Use offline mode if enabled and path is provided
      if (this.options.offline && this.options.exportedDataPath) {
        logger.info('[OFFLINE] Using offline mode: parsing exported markdown files...');
        const parser = new MarkdownParser(this.options.exportedDataPath);
        const parsedPRs = await parser.parsePullRequests();
        const parsedIssues = await parser.parseIssues();

        logger.info(
          `[PARSED] Loaded ${parsedPRs.length} PRs, ${parsedIssues.length} issues from markdown files`
        );
        const mergedCount = parsedPRs.filter((pr: any) => pr.mergedAt).length;
        logger.info(`[MERGED] Found ${mergedCount} merged PRs`);
        logger.debug(`  → Activity analytics will use ALL ${parsedPRs.length} PRs for metrics`);

        // Convert parsed data to match GitHub API format
        prs = parsedPRs.map((pr: any) => ({
          number: pr.number,
          state: pr.state === 'MERGED' ? 'closed' : pr.state.toLowerCase(),
          mergedAt: pr.mergedAt,
          closedAt: pr.closedAt,
          createdAt: pr.createdAt,
          author: { login: pr.author },
          title: pr.title,
        }));

        issues = parsedIssues.map((issue: any) => ({
          number: issue.number,
          state: issue.state.toLowerCase(),
          createdAt: issue.createdAt,
          closedAt: issue.closedAt,
          title: issue.title,
          author: { login: issue.author },
        }));
      } else {
        // Fetch PRs for merge rate calculation with increased limit
        prs = await execGhJson<any[]>(
          `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 2000 --json number,state,mergedAt,closedAt,createdAt,author,title`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );

        // Fetch issues for resolution time calculation with increased limit
        issues = await execGhJson<any[]>(
          `issue list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 2000 --json number,createdAt,closedAt,state,title,author`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );
      }

      // Calculate analysis period from actual data
      const allItems = [...prs, ...issues];
      result.period = this.calculateAnalysisPeriod(allItems);

      // Calculate PR merge rate
      const mergedPRs = prs.filter((pr) => pr.mergedAt);
      const closedPRs = prs.filter((pr) => pr.state === 'closed' && !pr.mergedAt);
      result.prMergeRate = {
        merged: mergedPRs.length,
        closed: closedPRs.length,
        mergeRate: prs.length > 0 ? (mergedPRs.length / prs.length) * 100 : 0,
      };

      // Calculate issue resolution time
      if (issues.length > 0) {
        const resolutionTimes = issues
          .filter((issue) => issue.closedAt && issue.createdAt)
          .map((issue) => {
            const created = new Date(issue.createdAt);
            const closed = new Date(issue.closedAt);
            const diffMs = closed.getTime() - created.getTime();
            return Math.max(0, diffMs / (1000 * 60 * 60)); // Hours, ensure non-negative
          })
          .filter((hours) => !isNaN(hours)); // Filter out any NaN values

        if (resolutionTimes.length > 0) {
          const averageHours =
            resolutionTimes.reduce((sum, hours) => sum + hours, 0) / resolutionTimes.length;
          const sortedTimes = [...resolutionTimes].sort((a, b) => a - b);
          const medianHours = sortedTimes[Math.floor(sortedTimes.length / 2)] || 0;

          result.issueResolutionTime = {
            averageHours: isNaN(averageHours) ? 0 : averageHours,
            medianHours: isNaN(medianHours) ? 0 : medianHours,
          };
        }
      }

      // Fetch commits for activity patterns (only in online mode, use parsed data in offline)
      let commits: any[] = [];
      if (!this.options.offline) {
        const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Last 90 days
        // Use --paginate to fetch ALL commits since the date (not just first 100)
        commits = await execGhJson<any[]>(
          `api repos/${this.options.repository.owner}/${this.options.repository.name}/commits?since=${sinceDate.toISOString()}&per_page=100 --paginate`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );
      } else {
        // In offline mode, we can't get commit data from markdown files
        // So we'll use a simple heuristic based on PR authors
        const prAuthors = new Set<string>();
        prs.forEach((pr) => {
          if (pr.author?.login) {
            prAuthors.add(pr.author.login);
          }
        });
        // Create mock commit data for each PR author
        commits = Array.from(prAuthors).map((author) => ({
          commit: {
            author: {
              name: author,
              date: new Date().toISOString(),
            },
          },
        }));
      }

      // Group commits by day for activity patterns
      const commitsByDay = new Map<string, number>();
      commits.forEach((commit) => {
        try {
          const date = new Date(commit.commit.author.date);
          // Check if date is valid
          if (!isNaN(date.getTime())) {
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            commitsByDay.set(dateStr, (commitsByDay.get(dateStr) || 0) + 1);
          }
        } catch (e) {
          // Skip invalid dates
        }
      });

      result.commitsOverTime = {
        dates: Array.from(commitsByDay.keys()),
        counts: Array.from(commitsByDay.values()),
      };

      // Find busiest days (top 5)
      const sortedDays = Array.from(commitsByDay.entries()).sort((a, b) => b[1] - a[1]);
      result.busiestDays = sortedDays.slice(0, 5).map(([day, count]) => ({
        day,
        count,
      }));

      // Calculate active contributors
      const contributors = new Set<string>();
      commits.forEach((commit) => {
        if (commit.commit.author.name) {
          contributors.add(commit.commit.author.name);
        }
      });

      result.activeContributors = [
        {
          period: 'last_30_days',
          contributors: contributors.size,
        },
      ];

      result.success = true;
      result.duration = Date.now() - startTime;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      logger.error(`Activity analytics failed: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Generate contributor analytics
   */
  private async generateContributorAnalytics(): Promise<ContributorAnalytics> {
    const startTime = Date.now();
    const result: ContributorAnalytics = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.options.repository.owner}/${this.options.repository.name}`,
      topContributors: [],
      newVsReturning: {
        new: 0,
        returning: 0,
      },
      contributionDistribution: [],
      busFactor: 0,
    };

    try {
      // Fetch commits to analyze contributors (only in online mode)
      let commits: any[] = [];

      if (!this.options.offline) {
        const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Last 90 days
        // Use --paginate to fetch ALL commits since the date (not just first 100)
        commits = await execGhJson<any[]>(
          `api repos/${this.options.repository.owner}/${this.options.repository.name}/commits?since=${sinceDate.toISOString()}&per_page=100 --paginate`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );
      }

      // Group commits by author
      const contributorStats = new Map<string, { commits: number; prs: number; reviews: number }>();

      // Count commits per contributor
      commits.forEach((commit) => {
        try {
          const author = (
            commit.commit.author.name ||
            commit.commit.author.email ||
            'unknown'
          ).trim();
          if (author && author !== 'unknown') {
            const stats = contributorStats.get(author) || { commits: 0, prs: 0, reviews: 0 };
            stats.commits++;
            contributorStats.set(author, stats);
          }
        } catch (e) {
          // Skip invalid commits
        }
      });

      // Fetch PRs to count PRs and reviews per contributor
      let prs: any[] = [];
      if (!this.options.offline) {
        // Use increased limit and let GitHub CLI handle pagination
        prs = await execGhJson<any[]>(
          `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 2000 --json number,author,reviewDecision,createdAt`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );
      } else {
        // In offline mode, use parsed data
        const parser = new MarkdownParser(this.options.exportedDataPath!);
        const parsedPRs = await parser.parsePullRequests();
        logger.debug(`  → Health analytics parsing PRs: found ${parsedPRs.length} total PRs`);

        // Convert parsed PRs to match GitHub API format
        prs = parsedPRs.map((pr: any) => ({
          number: pr.number,
          author: { login: pr.author },
          reviewDecision: 'REVIEWED', // Default value
          createdAt: pr.createdAt,
        }));
      }

      // Count PRs per contributor
      prs.forEach((pr) => {
        try {
          if (pr.author?.login) {
            const author = pr.author.login.trim();
            if (author) {
              const stats = contributorStats.get(author) || { commits: 0, prs: 0, reviews: 0 };
              stats.prs++;
              contributorStats.set(author, stats);
            }
          }
        } catch (e) {
          // Skip invalid PRs
        }
      });

      // Create top contributors list
      const contributorsArray = Array.from(contributorStats.entries())
        .map(([login, stats]) => ({
          login,
          commits: stats.commits,
          prs: stats.prs,
          reviews: stats.reviews,
          totalContributions: stats.commits + stats.prs + stats.reviews,
        }))
        .sort((a, b) => b.totalContributions - a.totalContributions);

      result.topContributors = contributorsArray.slice(0, 10);

      // Calculate contribution distribution
      const totalContributions = contributorsArray.reduce(
        (sum, c) => sum + c.totalContributions,
        0
      );
      result.contributionDistribution = contributorsArray
        .map((c) => ({
          contributor: c.login,
          percentage:
            totalContributions > 0 ? (c.totalContributions / totalContributions) * 100 : 0,
        }))
        .slice(0, 10);

      // Simple bus factor calculation (top 2 contributors hold > 50% of contributions)
      if (contributorsArray.length > 0) {
        const top2Contributions = contributorsArray
          .slice(0, 2)
          .reduce((sum, c) => sum + c.totalContributions, 0);

        if (totalContributions > 0 && top2Contributions / totalContributions > 0.5) {
          result.busFactor = 2;
        } else {
          result.busFactor = Math.min(contributorsArray.length, 5);
        }
      }

      // For new vs returning, we'll use a more accurate approach:
      // Count unique contributors and estimate based on their appearance frequency
      const activeContributors = contributorsArray.length;

      // Simple heuristic: contributors with only 1-2 contributions are likely new
      const newContributors = contributorsArray.filter((c) => c.totalContributions <= 2).length;
      const returningContributors = activeContributors - newContributors;

      result.newVsReturning = {
        new: Math.max(0, newContributors),
        returning: Math.max(0, returningContributors),
      };

      result.success = true;
      result.duration = Date.now() - startTime;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      logger.error(`Contributor analytics failed: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Generate label analytics
   */
  private async generateLabelAnalytics(): Promise<LabelAnalytics> {
    const startTime = Date.now();
    const result: LabelAnalytics = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.options.repository.owner}/${this.options.repository.name}`,
      labelDistribution: [],
      issueLifecycle: {
        averageOpenDays: 0,
        medianOpenDays: 0,
      },
      mostCommonLabels: [],
      issueVsPrratio: 0,
    };

    try {
      let issues: any[] = [];
      let prs: any[] = [];

      if (!this.options.offline) {
        // Fetch issues with labels with increased limit
        issues = await execGhJson<any[]>(
          `issue list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 2000 --json number,labels,createdAt,closedAt,state,title,author`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );

        // Fetch PRs with labels with increased limit
        prs = await execGhJson<any[]>(
          `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 2000 --json number,labels,createdAt,closedAt,title,author`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );
      } else {
        // In offline mode, use parsed data
        const parser = new MarkdownParser(this.options.exportedDataPath!);
        const parsedIssues = await parser.parseIssues();
        const parsedPRs = await parser.parsePullRequests();

        // Convert parsed data to match GitHub API format
        issues = parsedIssues.map((issue: any) => ({
          number: issue.number,
          labels: issue.labels.map((label: string) => ({ name: label })),
          createdAt: issue.createdAt,
          closedAt: issue.closedAt,
          state: issue.state,
          title: issue.title,
          author: { login: issue.author },
        }));

        prs = parsedPRs.map((pr: any) => ({
          number: pr.number,
          labels: pr.labels.map((label: string) => ({ name: label })),
          createdAt: pr.createdAt,
          closedAt: pr.closedAt,
          title: pr.title,
          author: { login: pr.author },
        }));
      }

      // Calculate issue/PR ratio
      result.issueVsPrratio = prs.length > 0 ? issues.length / prs.length : 0;

      // Collect all labels
      const labelCounts = new Map<string, number>();

      // Count labels from issues
      issues.forEach((issue) => {
        try {
          if (Array.isArray(issue.labels)) {
            issue.labels.forEach((label: any) => {
              try {
                const labelName = (label.name || 'unnamed').trim();
                if (labelName) {
                  labelCounts.set(labelName, (labelCounts.get(labelName) || 0) + 1);
                }
              } catch (e) {
                // Skip invalid labels
              }
            });
          }
        } catch (e) {
          // Skip invalid issues
        }
      });

      // Count labels from PRs
      prs.forEach((pr) => {
        try {
          if (Array.isArray(pr.labels)) {
            pr.labels.forEach((label: any) => {
              try {
                const labelName = (label.name || 'unnamed').trim();
                if (labelName) {
                  labelCounts.set(labelName, (labelCounts.get(labelName) || 0) + 1);
                }
              } catch (e) {
                // Skip invalid labels
              }
            });
          }
        } catch (e) {
          // Skip invalid PRs
        }
      });

      // Calculate label distribution
      const totalLabels = Array.from(labelCounts.values()).reduce((sum, count) => sum + count, 0);
      result.labelDistribution = Array.from(labelCounts.entries())
        .map(([label, count]) => ({
          label,
          count,
          percentage: totalLabels > 0 ? (count / totalLabels) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Find most common labels
      result.mostCommonLabels = result.labelDistribution.slice(0, 5).map((item) => item.label);

      // Calculate issue lifecycle metrics
      if (issues.length > 0) {
        const openDurations = issues
          .filter((issue) => issue.closedAt && issue.createdAt)
          .map((issue) => {
            const created = new Date(issue.createdAt);
            const closed = new Date(issue.closedAt);
            return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // Days
          });

        if (openDurations.length > 0) {
          const averageOpenDays =
            openDurations.reduce((sum, days) => sum + days, 0) / openDurations.length;
          const sortedDurations = [...openDurations].sort((a, b) => a - b);
          const medianOpenDays = sortedDurations[Math.floor(sortedDurations.length / 2)];

          result.issueLifecycle = {
            averageOpenDays,
            medianOpenDays,
          };
        }
      }

      result.success = true;
      result.duration = Date.now() - startTime;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      logger.error(`Label analytics failed: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Generate code health analytics
   */
  private async generateHealthAnalytics(): Promise<HealthAnalytics> {
    const startTime = Date.now();
    const result: HealthAnalytics = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.options.repository.owner}/${this.options.repository.name}`,
      prReviewCoverage: {
        reviewed: 0,
        total: 0,
        coveragePercentage: 0,
      },
      averagePrSize: {
        additions: 0,
        deletions: 0,
        total: 0,
      },
      timeToFirstReview: {
        averageHours: 0,
        medianHours: 0,
      },
      deploymentFrequency: {
        releases: 0,
        period: 'monthly',
      },
    };

    try {
      let prs: any[] = [];
      let releases: any[] = [];

      if (!this.options.offline) {
        // Fetch PRs to analyze review coverage and PR size with increased limit
        prs = await execGhJson<any[]>(
          `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 2000 --json number,reviewDecision,additions,deletions,createdAt,updatedAt,author,title`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );

        // Fetch releases to analyze deployment frequency with increased limit
        releases = await execGhJson<any[]>(
          `release list --repo ${this.options.repository.owner}/${this.options.repository.name} --limit 500 --json tagName,createdAt,publishedAt`,
          { timeout: 60000, useRateLimit: false, useRetry: false }
        );
      } else {
        // In offline mode, use parsed data from activity analytics (already parsed with merged/closed counts)
        const parser = new MarkdownParser(this.options.exportedDataPath!);
        const parsedPRs = await parser.parsePullRequests();
        const parsedReleases = await parser.parseReleases();

        // Convert parsed data to match GitHub API format
        // Note: Offline mode doesn't have reviewDecision data from markdown files
        // We leave reviewDecision undefined to indicate data is not available
        prs = parsedPRs.map((pr: any) => ({
          number: pr.number,
          reviewDecision: undefined, // Not available in markdown files
          additions: 0, // Not available in markdown files
          deletions: 0, // Not available in markdown files
          createdAt: pr.createdAt,
          updatedAt: pr.closedAt || pr.createdAt,
          author: { login: pr.author },
          title: pr.title,
        }));

        releases = parsedReleases.map((release: any) => ({
          tagName: release.tagName,
          createdAt: release.createdAt,
          publishedAt: release.publishedAt,
        }));
      }

      // Calculate PR review coverage
      if (prs.length > 0) {
        // In offline mode, review data is not available from markdown files
        // Count PRs with valid reviewDecision (APPROVED or CHANGES_REQUESTED)
        const reviewedPRs = prs.filter(
          (pr) => pr.reviewDecision === 'APPROVED' || pr.reviewDecision === 'CHANGES_REQUESTED'
        );
        const coveragePercentage = prs.length > 0 ? (reviewedPRs.length / prs.length) * 100 : 0;
        result.prReviewCoverage = {
          reviewed: reviewedPRs.length,
          total: prs.length,
          coveragePercentage: isNaN(coveragePercentage) ? 0 : coveragePercentage,
        };

        // Log warning if in offline mode and no review data available
        if (this.options.offline && reviewedPRs.length === 0 && prs.length > 0) {
          logger.warn(
            '[OFFLINE] Review coverage data not available in markdown files. Coverage reported as 0%.'
          );
        }
      }

      // Calculate average PR size
      if (prs.length > 0) {
        const totalAdditions = prs.reduce((sum, pr) => sum + (pr.additions || 0), 0);
        const totalDeletions = prs.reduce((sum, pr) => sum + (pr.deletions || 0), 0);
        const totalChanges = totalAdditions + totalDeletions;
        const avgAdditions = prs.length > 0 ? totalAdditions / prs.length : 0;
        const avgDeletions = prs.length > 0 ? totalDeletions / prs.length : 0;
        const avgTotal = prs.length > 0 ? totalChanges / prs.length : 0;

        result.averagePrSize = {
          additions: isNaN(avgAdditions) ? 0 : Math.round(avgAdditions),
          deletions: isNaN(avgDeletions) ? 0 : Math.round(avgDeletions),
          total: isNaN(avgTotal) ? 0 : Math.round(avgTotal),
        };
      }

      // Calculate deployment frequency (releases per month)
      if (releases.length > 0) {
        try {
          // Get date range of releases
          const releaseDates = releases
            .map((r: any) => new Date(r.createdAt))
            .filter((date) => !isNaN(date.getTime())); // Filter out invalid dates

          if (releaseDates.length > 0) {
            result.deploymentFrequency = {
              releases: releases.length,
              period: 'monthly',
            };
          }
        } catch (e) {
          // If there's an error calculating deployment frequency, use default values
          result.deploymentFrequency = {
            releases: releases.length,
            period: 'monthly',
          };
        }
      }

      result.success = true;
      result.duration = Date.now() - startTime;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      logger.error(`Health analytics failed: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Get package version from package.json
   */
  private async getPackageVersion(): Promise<string> {
    try {
      // Try to read package.json from the project root
      const packagePath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));
      return packageJson.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Export the analytics report in the specified formats
   */
  private async exportReport(report: AnalyticsReport): Promise<void> {
    const { format, outputPath } = this.options;
    const repoIdentifier = `${this.options.repository.owner}-${this.options.repository.name}`;

    try {
      // Export as JSON (without markdown report)
      if (format === 'json') {
        const jsonPath = join(outputPath, `${repoIdentifier}-analytics.json`);
        await writeFile(jsonPath, JSON.stringify(report, null, 2));
        logger.info(`Analytics report saved as JSON: ${jsonPath}`);
      }

      // Export as Markdown (direct output)
      if (format === 'markdown') {
        const markdownPath = join(outputPath, `${repoIdentifier}-analytics.md`);
        const markdownContent = await this.generateMarkdownReport(report);
        await writeFile(markdownPath, markdownContent, 'utf8');
        logger.info(`Analytics report saved as Markdown: ${markdownPath}`);
      }

      // Export as PDF (Markdown → HTML → PDF pipeline)
      if (format === 'pdf') {
        logger.info('Starting PDF generation pipeline: Markdown -> HTML -> PDF');

        // Step 1: Generate markdown
        const markdownContent = await this.generateMarkdownReport(report);
        const markdownPath = join(outputPath, `${repoIdentifier}-analytics.md`);
        await writeFile(markdownPath, markdownContent, 'utf8');
        logger.info(`[OK] Markdown report generated: ${markdownPath}`);

        // Step 2: Convert markdown to styled HTML
        const htmlGenerator = new HtmlReportGenerator();
        const htmlContent = await htmlGenerator.generateHtml(
          markdownContent,
          `${this.options.repository.owner}/${this.options.repository.name} Analytics Report`
        );
        const htmlPath = join(outputPath, `${repoIdentifier}-analytics.html`);
        await writeFile(htmlPath, htmlContent, 'utf8');
        logger.info(`[OK] HTML report generated: ${htmlPath}`);

        // Step 3: Convert HTML to PDF using Puppeteer
        const pdfConverter = new PuppeteerPdfConverter();
        const pdfPath = join(outputPath, `${repoIdentifier}-analytics.pdf`);
        await pdfConverter.convertHtmlToPdf(htmlContent, pdfPath);
        logger.info(`[OK] PDF report generated: ${pdfPath}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to export analytics report: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Generate a Markdown report from the analytics data
   */
  private async generateMarkdownReport(report: AnalyticsReport): Promise<string> {
    const version = await this.getPackageVersion();
    const benchmark = report.benchmark as any;
    const narrative = report.narrative as any;
    return await this.markdownGenerator.generate(report, version, benchmark, narrative);
  }
}
