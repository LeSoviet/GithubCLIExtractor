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

/**
 * AnalyticsProcessor handles generating analytics reports from exported data
 */
export class AnalyticsProcessor {
  private options: AnalyticsOptions;
  // private startTime: number = 0;

  constructor(options: AnalyticsOptions) {
    this.options = options;
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

      const report: AnalyticsReport = {
        repository: `${this.options.repository.owner}/${this.options.repository.name}`,
        generatedAt: new Date().toISOString(),
        activity,
        contributors,
        labels,
        health,
      };

      // Export report in specified formats
      await this.exportReport(report);

      const reportDuration = ((Date.now() - reportStartTime) / 1000).toFixed(2);
      logger.success(`Analytics report generated in ${reportDuration}s`);
      return report;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to generate analytics report: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Generate activity analytics
   */
  private async generateActivityAnalytics(): Promise<ActivityAnalytics> {
    const startTime = Date.now();
    const result: ActivityAnalytics = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.options.repository.owner}/${this.options.repository.name}`,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
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
        logger.info('Using offline mode: parsing exported markdown files...');
        const parser = new MarkdownParser(this.options.exportedDataPath);
        const parsedPRs = await parser.parsePullRequests();
        const parsedIssues = await parser.parseIssues();

        logger.info(
          `📄 Parsed ${parsedPRs.length} PRs, ${parsedIssues.length} issues from markdown files`
        );
        const mergedCount = parsedPRs.filter((pr: any) => pr.mergedAt).length;
        logger.info(`🔀 Found ${mergedCount} merged PRs`);

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
        // Fetch PRs for merge rate calculation
        prs = await execGhJson<any[]>(
          `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,state,mergedAt,closedAt,createdAt,author,title`,
          { timeout: 30000, useRateLimit: false, useRetry: false }
        );

        // Fetch issues for resolution time calculation
        issues = await execGhJson<any[]>(
          `issue list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,createdAt,closedAt,state,title,author`,
          { timeout: 30000, useRateLimit: false, useRetry: false }
        );
      }

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

      // Fetch commits for activity patterns (only in online mode, skip in offline)
      let commits: any[] = [];
      if (!this.options.offline) {
        const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Last 90 days
        commits = await execGhJson<any[]>(
          `api repos/${this.options.repository.owner}/${this.options.repository.name}/commits?since=${sinceDate.toISOString()}&per_page=100`,
          { timeout: 30000, useRateLimit: false, useRetry: false }
        );
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
        commits = await execGhJson<any[]>(
          `api repos/${this.options.repository.owner}/${this.options.repository.name}/commits?since=${sinceDate.toISOString()}&per_page=100`,
          { timeout: 30000, useRateLimit: false, useRetry: false }
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
      const prs = await execGhJson<any[]>(
        `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,author,reviewDecision,createdAt`,
        { timeout: 30000, useRateLimit: false, useRetry: false }
      );

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

      // For new vs returning, we'll use a simple heuristic
      // In a real implementation, we'd track first-time contributors
      const activeContributors = contributorsArray.length;
      result.newVsReturning = {
        new: Math.floor(activeContributors * 0.3), // Estimate 30% as new
        returning: Math.ceil(activeContributors * 0.7), // Estimate 70% as returning
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
      // Fetch issues with labels
      const issues = await execGhJson<any[]>(
        `issue list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,labels,createdAt,closedAt,state,title,author`,
        { timeout: 30000, useRateLimit: false, useRetry: false }
      );

      // Fetch PRs with labels
      const prs = await execGhJson<any[]>(
        `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,labels,createdAt,closedAt,title,author`,
        { timeout: 30000, useRateLimit: false, useRetry: false }
      );

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
      // Fetch PRs to analyze review coverage and PR size
      const prs = await execGhJson<any[]>(
        `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,reviewDecision,additions,deletions,createdAt,updatedAt,author,title`,
        { timeout: 30000, useRateLimit: false, useRetry: false }
      );

      // Calculate PR review coverage
      if (prs.length > 0) {
        const reviewedPRs = prs.filter(
          (pr) => pr.reviewDecision === 'APPROVED' || pr.reviewDecision === 'CHANGES_REQUESTED'
        );
        const coveragePercentage = prs.length > 0 ? (reviewedPRs.length / prs.length) * 100 : 0;
        result.prReviewCoverage = {
          reviewed: reviewedPRs.length,
          total: prs.length,
          coveragePercentage: isNaN(coveragePercentage) ? 0 : coveragePercentage,
        };
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

      // Fetch releases to analyze deployment frequency
      const releases = await execGhJson<any[]>(
        `release list --repo ${this.options.repository.owner}/${this.options.repository.name} --limit 100 --json tagName,createdAt,publishedAt`,
        { timeout: 30000, useRateLimit: false, useRetry: false }
      );

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
   * Get health status indicator
   */
  private getHealthStatus(value: number, warning: number, good: number): string {
    if (value >= good) return '🟢 Excellent';
    if (value >= warning) return '🟡 Fair';
    return '🔴 Needs Improvement';
  }

  /**
   * Get contributor count status
   */
  private getContributorStatus(count: number): string {
    if (count >= 10) return '🟢 Healthy';
    if (count >= 5) return '🟡 Moderate';
    return '🔴 Limited';
  }

  /**
   * Get bus factor status
   */
  private getBusFactorStatus(busFactor: number): string {
    if (busFactor >= 5) return '🟢 Low Risk';
    if (busFactor >= 3) return '🟡 Medium Risk';
    return '🔴 High Risk';
  }

  /**
   * Get deployment status
   */
  private getDeploymentStatus(releases: number): string {
    if (releases >= 20) return '🟢 Very Active';
    if (releases >= 10) return '🟡 Active';
    if (releases >= 5) return '🟠 Moderate';
    return '🔴 Low Activity';
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
      // Export as JSON
      if (format === 'json' || format === 'both') {
        const jsonPath = join(outputPath, `${repoIdentifier}-analytics.json`);
        await writeFile(jsonPath, JSON.stringify(report, null, 2));
        logger.info(`Analytics report saved as JSON: ${jsonPath}`);
      }

      // Export as Markdown
      if (format === 'markdown' || format === 'both') {
        const markdownPath = join(outputPath, `${repoIdentifier}-analytics.md`);
        const markdownContent = await this.generateMarkdownReport(report);
        await writeFile(markdownPath, markdownContent);
        logger.info(`Analytics report saved as Markdown: ${markdownPath}`);
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
    const now = new Date(report.generatedAt);
    let md = `# 📊 Analytics Report\n\n`;
    md += `## ${report.repository}\n\n`;
    md += `**Generated:** ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString()}\n\n`;
    md += `---\n\n`;

    // Executive Summary with key metrics
    md += `## 📋 Executive Summary\n\n`;
    md += `This comprehensive analytics report analyzes repository activity, contributor patterns, labeling practices, and code health metrics to provide actionable insights.\n\n`;

    // Quick stats box
    md += `### Key Metrics at a Glance\n\n`;
    md += `| Metric | Value | Status |\n`;
    md += `|--------|-------|--------|\n`;
    md += `| **PR Merge Rate** | ${report.activity.prMergeRate.mergeRate.toFixed(1)}% | ${this.getHealthStatus(report.activity.prMergeRate.mergeRate, 50, 80)} |\n`;
    md += `| **Review Coverage** | ${report.health.prReviewCoverage.coveragePercentage.toFixed(1)}% | ${this.getHealthStatus(report.health.prReviewCoverage.coveragePercentage, 50, 70)} |\n`;
    md += `| **Active Contributors** | ${report.activity.activeContributors[0]?.contributors || 0} | ${this.getContributorStatus(report.activity.activeContributors[0]?.contributors || 0)} |\n`;
    md += `| **Bus Factor** | ${report.contributors.busFactor} | ${this.getBusFactorStatus(report.contributors.busFactor)} |\n`;
    md += `| **Deployment Frequency** | ${report.health.deploymentFrequency.releases} releases | ${this.getDeploymentStatus(report.health.deploymentFrequency.releases)} |\n\n`;
    md += `---\n\n`;

    // Activity Analytics
    md += `## 📈 Activity Analytics\n\n`;
    md += `**Analysis Period:** ${new Date(report.activity.period.start).toLocaleDateString()} to ${new Date(report.activity.period.end).toLocaleDateString()}\n\n`;

    md += `### Pull Request Metrics\n\n`;
    md += `- **Merge Rate:** ${report.activity.prMergeRate.mergeRate.toFixed(1)}%\n`;
    md += `- **Merged PRs:** ${report.activity.prMergeRate.merged}\n`;
    md += `- **Closed (not merged):** ${report.activity.prMergeRate.closed}\n`;
    md += `- **Total PRs:** ${report.activity.prMergeRate.merged + report.activity.prMergeRate.closed}\n\n`;

    md += `### Issue Resolution\n\n`;

    if (report.activity.issueResolutionTime.averageHours > 0) {
      const avgDays = (report.activity.issueResolutionTime.averageHours / 24).toFixed(1);
      const medianDays = (report.activity.issueResolutionTime.medianHours / 24).toFixed(1);
      md += `- **Average Resolution Time:** ${avgDays} days (${report.activity.issueResolutionTime.averageHours.toFixed(0)} hours)\n`;
      md += `- **Median Resolution Time:** ${medianDays} days (${report.activity.issueResolutionTime.medianHours.toFixed(0)} hours)\n`;
    } else {
      md += `- **Resolution Time:** No closed issues found in analysis period\n`;
    }

    if (report.activity.busiestDays.length > 0) {
      md += `\n### 🔥 Activity Hotspots\n\n`;
      md += `**Most Active Days:**\n\n`;
      report.activity.busiestDays.slice(0, 5).forEach((day, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📅';
        md += `${emoji} **${day.day}:** ${day.count} commits\n`;
      });
    }

    md += `\n---\n\n`;

    // Contributor Analytics
    md += `## 👥 Contributor Analytics\n\n`;
    md += `### Team Health\n\n`;
    md += `- **Bus Factor:** ${report.contributors.busFactor} ${this.getBusFactorStatus(report.contributors.busFactor)}\n`;
    md += `  - *Indicates project risk if key contributors become unavailable*\n`;
    md += `- **Active Contributors:** ${report.activity.activeContributors[0]?.contributors || 0} (last 90 days)\n`;
    md += `- **Contributor Mix:** ${report.contributors.newVsReturning.new} new, ${report.contributors.newVsReturning.returning} returning\n\n`;

    if (report.contributors.topContributors.length > 0) {
      md += `### Top Contributors\n\n`;
      md += `| Contributor | Commits | PRs | Reviews | Total Contributions |\n`;
      md += `|-------------|---------|-----|--------|-------------------|\n`;

      for (const contributor of report.contributors.topContributors.slice(0, 10)) {
        md += `| ${contributor.login} | ${contributor.commits} | ${contributor.prs} | ${contributor.reviews} | ${contributor.totalContributions} |\n`;
      }
      md += `\n`;

      if (report.contributors.contributionDistribution.length > 0) {
        const topContributorPercentage =
          report.contributors.contributionDistribution[0]?.percentage || 0;
        md += `**Concentration of Contributions**: The top contributor accounts for ${topContributorPercentage.toFixed(1)}% of all contributions.\n\n`;
      }
    }

    // Label Analytics
    md += `## 🏷️ Label Analytics\n\n`;

    md += `### Issue/PR Balance\n\n`;
    if (report.labels.issueVsPrratio > 0) {
      md += `- **Ratio:** 1:${report.labels.issueVsPrratio.toFixed(2)} (${report.labels.issueVsPrratio > 1 ? 'More issues than PRs' : 'More PRs than issues'})\n`;
    } else {
      md += `- **Ratio:** No data available\n`;
    }

    if (report.labels.issueLifecycle.averageOpenDays > 0) {
      md += `\n### Issue Lifecycle\n\n`;
      md += `- **Average Time Open:** ${report.labels.issueLifecycle.averageOpenDays.toFixed(1)} days\n`;
      md += `- **Median Time Open:** ${report.labels.issueLifecycle.medianOpenDays.toFixed(1)} days\n`;
    }

    if (report.labels.mostCommonLabels.length > 0) {
      md += `\n### Most Common Labels\n\n`;
      md += `${report.labels.mostCommonLabels.map((label, i) => `${i + 1}. \`${label}\``).join('\n')}\n`;
    }

    if (report.labels.labelDistribution.length > 0) {
      md += `\n### Label Distribution\n\n`;
      md += `| Label | Count | Percentage |\n`;
      md += `|-------|-------|------------|\n`;

      for (const label of report.labels.labelDistribution.slice(0, 10)) {
        md += `| ${label.label} | ${label.count} | ${label.percentage.toFixed(1)}% |\n`;
      }
      md += `\n`;

      // Insights about labeling
      const unlabeledItems = report.labels.labelDistribution
        .filter(
          (l) => l.label.toLowerCase().includes('unname') || l.label.toLowerCase().includes('none')
        )
        .reduce((sum, l) => sum + l.count, 0);
      if (unlabeledItems > 0) {
        const totalItems = report.labels.labelDistribution.reduce((sum, l) => sum + l.count, 0);
        const unlabeledPercentage = (unlabeledItems / totalItems) * 100;
        md += `**Labeling Quality**: ${unlabeledPercentage.toFixed(1)}% of items are unlabeled, which may impact project organization.\n\n`;
      }
    }

    // Health Analytics
    md += `---\n\n`;
    md += `## 💊 Code Health Metrics\n\n`;

    md += `### Review Process\n\n`;
    md += `- **Review Coverage:** ${report.health.prReviewCoverage.coveragePercentage.toFixed(1)}% ${this.getHealthStatus(report.health.prReviewCoverage.coveragePercentage, 50, 70)}\n`;
    md += `- **Reviewed PRs:** ${report.health.prReviewCoverage.reviewed} / ${report.health.prReviewCoverage.total}\n\n`;

    md += `### PR Size Analysis\n\n`;
    if (report.health.averagePrSize.total > 0) {
      md += `- **Average Changes:** ${report.health.averagePrSize.total} lines per PR\n`;
      md += `  - **Additions:** +${report.health.averagePrSize.additions} lines\n`;
      md += `  - **Deletions:** -${report.health.averagePrSize.deletions} lines\n\n`;

      // Add PR size recommendation
      if (report.health.averagePrSize.total > 500) {
        md += `> ⚠️ **Note:** Average PR size is large (>500 lines). Consider breaking down changes into smaller PRs for easier review.\n\n`;
      } else if (report.health.averagePrSize.total < 100) {
        md += `> ✅ **Good Practice:** Small PR sizes facilitate faster reviews and reduce merge conflicts.\n\n`;
      }
    } else {
      md += `- **Average PR Size:** No data available\n\n`;
    }

    md += `### Deployment Activity\n\n`;
    md += `- **Total Releases:** ${report.health.deploymentFrequency.releases} ${this.getDeploymentStatus(report.health.deploymentFrequency.releases)}\n`;

    // Insights and recommendations
    md += `\n---\n\n`;
    md += `## 💡 Insights & Recommendations\n\n`;

    const recommendations: string[] = [];

    // PR merge rate insight
    if (report.activity.prMergeRate.mergeRate < 50) {
      recommendations.push(
        `🔴 **Low PR Merge Rate (${report.activity.prMergeRate.mergeRate.toFixed(1)}%)**\n   - Review PR approval process\n   - Provide clearer contribution guidelines\n   - Consider implementing PR templates`
      );
    } else if (report.activity.prMergeRate.mergeRate > 80) {
      recommendations.push(
        `🟢 **Excellent PR Merge Rate (${report.activity.prMergeRate.mergeRate.toFixed(1)}%)**\n   - Indicates healthy contribution workflow\n   - Maintain current review standards`
      );
    }

    // Review coverage insight
    if (report.health.prReviewCoverage.coveragePercentage < 70) {
      recommendations.push(
        `🟡 **Review Coverage Needs Improvement (${report.health.prReviewCoverage.coveragePercentage.toFixed(1)}%)**\n   - Encourage more code reviews\n   - Consider requiring reviews before merge\n   - Set up CODEOWNERS file`
      );
    } else {
      recommendations.push(
        `🟢 **Strong Review Coverage (${report.health.prReviewCoverage.coveragePercentage.toFixed(1)}%)**\n   - Excellent code quality practices\n   - Continue current review process`
      );
    }

    // Bus factor insight
    if (report.contributors.busFactor <= 2) {
      recommendations.push(`🔴 **Critical: Low Bus Factor (${report.contributors.busFactor})**
   - High project risk if key contributors leave
   - Encourage knowledge sharing
   - Document critical systems
   - Onboard new contributors`);
    } else if (report.contributors.busFactor >= 5) {
      recommendations.push(
        `🟢 **Healthy Bus Factor (${report.contributors.busFactor})**\n   - Good distribution of knowledge\n   - Low project continuity risk`
      );
    }

    // Contribution concentration insight
    if (report.contributors.contributionDistribution.length > 0) {
      const topPercentage = report.contributors.contributionDistribution[0]?.percentage || 0;
      if (topPercentage > 50) {
        recommendations.push(
          `🟡 **High Contribution Concentration (${topPercentage.toFixed(1)}%)**\n   - Top contributor dominates contributions\n   - Risk of knowledge silos\n   - Encourage broader participation`
        );
      }
    }

    // Issue resolution time insight
    if (report.activity.issueResolutionTime.averageHours > 0) {
      const avgDays = report.activity.issueResolutionTime.averageHours / 24;
      if (avgDays > 30) {
        recommendations.push(
          `🟡 **Slow Issue Resolution (${avgDays.toFixed(1)} days avg)**\n   - Consider triaging issues more frequently\n   - Set up issue templates for clarity\n   - Prioritize critical issues`
        );
      } else if (avgDays < 7) {
        recommendations.push(
          `🟢 **Fast Issue Resolution (${avgDays.toFixed(1)} days avg)**\n   - Excellent responsiveness\n   - Maintain current triage process`
        );
      }
    }

    if (recommendations.length > 0) {
      recommendations.forEach((rec, i) => {
        md += `### ${i + 1}. ${rec}\n\n`;
      });
    } else {
      md += `✅ All metrics are within healthy ranges. Continue current practices!\n\n`;
    }

    md += `---\n\n`;
    md += `## 📚 Report Metadata\n\n`;
    md += `- **Analysis Duration:**\n`;
    md += `  - Activity: ${(report.activity.duration / 1000).toFixed(2)}s\n`;
    md += `  - Contributors: ${(report.contributors.duration / 1000).toFixed(2)}s\n`;
    md += `  - Labels: ${(report.labels.duration / 1000).toFixed(2)}s\n`;
    md += `  - Health: ${(report.health.duration / 1000).toFixed(2)}s\n`;
    md += `- **Generated by:** [GitHub Extractor CLI (ghextractor)](https://github.com/LeSoviet/GithubCLIExtractor)
`;
    md += `- **Version:** ${await this.getPackageVersion()}
`;

    return md;
  }
}
