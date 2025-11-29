import type { AnalyticsReport } from '../../types/analytics.js';
import type { BenchmarkComparison } from '../benchmarking.js';
import type { ExecutiveNarrative } from '../narrative-generator.js';
import { ActivitySectionGenerator } from './activity-section.js';
import { ContributorSectionGenerator } from './contributor-section.js';
import { LabelSectionGenerator } from './label-section.js';
import { HealthSectionGenerator } from './health-section.js';
import { RecommendationsGenerator } from './recommendations.js';
import { TrendsSectionGenerator } from './trends-section.js';
import { CorrelationsSectionGenerator } from './correlations-section.js';
import { PredictionsSectionGenerator } from './predictions-section.js';
import { BenchmarksSectionGenerator } from './benchmarks-section.js';
import { NarrativeSectionGenerator } from './narrative-section.js';
import { StaleItemsSectionGenerator } from './stale-items-section.js';
import { statusHelpers } from './status-helpers.js';
import { formatPercentage } from '../../utils/format-helpers.js';

/**
 * Main class for generating markdown analytics reports
 * Orchestrates all section generators
 */
export class MarkdownReportGenerator {
  private activityGenerator: ActivitySectionGenerator;
  private contributorGenerator: ContributorSectionGenerator;
  private labelGenerator: LabelSectionGenerator;
  private healthGenerator: HealthSectionGenerator;
  private recommendationsGenerator: RecommendationsGenerator;
  private trendsGenerator: TrendsSectionGenerator;
  private correlationsGenerator: CorrelationsSectionGenerator;
  private predictionsGenerator: PredictionsSectionGenerator;
  private benchmarksGenerator: BenchmarksSectionGenerator;
  private narrativeGenerator: NarrativeSectionGenerator;
  private staleItemsGenerator: StaleItemsSectionGenerator;

  constructor() {
    this.activityGenerator = new ActivitySectionGenerator();
    this.contributorGenerator = new ContributorSectionGenerator();
    this.labelGenerator = new LabelSectionGenerator();
    this.healthGenerator = new HealthSectionGenerator();
    this.recommendationsGenerator = new RecommendationsGenerator();
    this.trendsGenerator = new TrendsSectionGenerator();
    this.correlationsGenerator = new CorrelationsSectionGenerator();
    this.predictionsGenerator = new PredictionsSectionGenerator();
    this.benchmarksGenerator = new BenchmarksSectionGenerator();
    this.narrativeGenerator = new NarrativeSectionGenerator();
    this.staleItemsGenerator = new StaleItemsSectionGenerator();
  }

  /**
   * Generate a complete markdown report from analytics data
   */
  async generate(
    report: AnalyticsReport,
    packageVersion: string = 'unknown',
    benchmark?: BenchmarkComparison,
    narrative?: ExecutiveNarrative
  ): Promise<string> {
    let md = '';

    md += this.generateHeader(report);
    md += this.generateDataSummary(report);
    md += this.generateExecutiveSummary(report);
    md += this.activityGenerator.generate(report);
    md += this.contributorGenerator.generate(report);
    md += this.labelGenerator.generate(report);
    md += this.healthGenerator.generate(report);

    // Add advanced analytics sections
    md += this.trendsGenerator.generate(report);
    md += this.correlationsGenerator.generate(report);
    md += this.predictionsGenerator.generate(report);
    md += this.benchmarksGenerator.generate(report, benchmark);
    md += this.narrativeGenerator.generate(report, narrative);
    md += this.staleItemsGenerator.generate(report);

    md += this.recommendationsGenerator.generate(report);
    md += this.generateMetadata(report, packageVersion);
    md += this.generateSummaryStats(report);

    // Normalize excessive whitespace
    md = this.normalizeWhitespace(md);

    return md;
  }

  /**
   * Generate report header with title and metadata
   */
  private generateHeader(report: AnalyticsReport): string {
    const now = new Date(report.generatedAt);
    let md = `# Analytics Report\n\n`;
    md += `## ${report.repository}\n\n`;
    md += `**Generated:** ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString()}\n\n`;

    // Add partial data disclaimer if applicable
    if (report.isPartialData && report.missingDataTypes && report.missingDataTypes.length > 0) {
      md += `\n> **NOTE: Partial Analytics Report**\n>\n`;
      md += `> This report was generated from incomplete data. The following data types are missing:\n>\n`;
      report.missingDataTypes.forEach((type) => {
        md += `> - ${type}\n`;
      });
      md += `>\n> For comprehensive analytics, export all data types using "Full Repository Backup".\n\n`;
    }

    md += `---\n\n`;
    return md;
  }

  /**
   * Generate executive summary with key metrics
   */
  private generateExecutiveSummary(report: AnalyticsReport): string {
    let md = `## Executive Summary

`;
    md += `This analytics report provides data-driven insights into repository health, team dynamics, and development velocity.

`;

    // Quick stats box with cleaner data
    md += `### Key Metrics Overview

`;
    md += `| Metric | Current Value | Interpretation |
`;
    md += `|--------|--------------|----------------|
`;

    const mergeRate = report.activity.prMergeRate.mergeRate;
    const prsInPeriod = report.activity.prMergeRate.merged + report.activity.prMergeRate.closed;
    md += `| **PR Merge Rate** | ${formatPercentage(mergeRate)} (${report.activity.prMergeRate.merged}/${prsInPeriod} in period) | ${statusHelpers.getHealthStatus(mergeRate, 50, 80)} |
`;

    md += `| **Review Coverage** | ${formatPercentage(report.health.prReviewCoverage.coveragePercentage)} (${report.health.prReviewCoverage.reviewed}/${report.health.prReviewCoverage.total} total) | ${statusHelpers.getHealthStatus(report.health.prReviewCoverage.coveragePercentage, 50, 70)} |
`;
    md += `| **Active Contributors** | ${report.activity.activeContributors[0]?.contributors || 0} | ${statusHelpers.getContributorStatus(report.activity.activeContributors[0]?.contributors || 0)} |
`;
    md += `| **Bus Factor** | ${report.contributors.busFactor} | ${statusHelpers.getBusFactorStatus(report.contributors.busFactor)} |
`;
    md += `| **Deployment Frequency** | ${report.health.deploymentFrequency.releases} releases | ${statusHelpers.getDeploymentStatus(report.health.deploymentFrequency.releases)} |

`;

    // Add critical alerts section
    const alerts: string[] = [];
    if (report.contributors.busFactor <= 2) {
      alerts.push('**Critical Risk**: Low bus factor indicates project vulnerability');
    }
    if (mergeRate < 40) {
      alerts.push('**Attention Needed**: Low PR merge rate may indicate process bottlenecks');
    }
    if (report.health.prReviewCoverage.coveragePercentage < 50) {
      alerts.push('**Quality Risk**: More than half of PRs lack code review');
    }

    if (alerts.length > 0) {
      md += `### Critical Alerts

`;
      alerts.forEach((alert) => (md += `${alert}\n`));
      md += `\n`;
    }

    md += `---

`;
    return md;
  }

  /**
   * Generate data collection summary showing collection method and scope
   */
  private generateDataSummary(report: AnalyticsReport): string {
    let md = `## Data Collection Summary

`;

    // Collection method
    md += `**Collection Method:** ${report.isPartialData ? 'Partial Export (Filtered)' : 'Full Repository Backup (Complete)'}

`;

    // Analysis period
    md += `**Analysis Period:**
`;
    const start = new Date(report.activity.period.start);
    const end = new Date(report.activity.period.end);
    const periodDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    md += `- Start: ${start.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
`;
    md += `- End: ${end.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
`;
    md += `- Duration: ${periodDays} days\n\n`;

    // Data types analyzed
    md += `**Data Types Analyzed:**
`;
    const totalPRs = report.activity.prMergeRate.merged + report.activity.prMergeRate.closed;
    md += `- Pull Requests: ${totalPRs} items analyzed
`;

    // Issue count from labels section if available
    const estimatedIssues = totalPRs > 0 ? Math.round(totalPRs * report.labels.issueVsPrratio) : 0;
    md += `- Issues: ~${estimatedIssues} items (estimated from ratio)
`;

    // Releases
    md += `- Releases: ${report.health.deploymentFrequency.releases} items
`;

    // Add note about missing data types if applicable
    if (report.missingDataTypes && report.missingDataTypes.length > 0) {
      md += `\n**Note:** ${report.missingDataTypes.join(', ')} data type(s) not available in this export.
`;
    }

    md += `\n`;
    return md;
  }

  /**
   * Generate report metadata section
   */
  private generateMetadata(report: AnalyticsReport, packageVersion: string): string {
    let md = `---\n\n`;
    md += `## Report Metadata\n\n`;

    // Report generation info
    md += `**Report Generated:** ${new Date(report.generatedAt).toLocaleString('en-US')}\n\n`;

    // Data collection mode
    const collectionMode = report.isPartialData
      ? 'Partial Export (Filtered)'
      : 'Full Repository Backup (Complete)';
    md += `**Data Collection Mode:** ${collectionMode}\n\n`;

    // Period analyzed
    md += `**Period Analyzed:**\n`;
    const start = new Date(report.activity.period.start);
    const end = new Date(report.activity.period.end);
    md += `- From: ${start.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    md += `- To: ${end.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

    // Analysis durations
    md += `**Analysis Duration:**\n`;
    md += `  - Activity: ${(report.activity.duration / 1000).toFixed(2)}s\n`;
    md += `  - Contributors: ${(report.contributors.duration / 1000).toFixed(2)}s\n`;
    md += `  - Labels: ${(report.labels.duration / 1000).toFixed(2)}s\n`;
    md += `  - Health: ${(report.health.duration / 1000).toFixed(2)}s\n\n`;

    // Tool info
    md += `**Generated by:** [GitHub Extractor CLI (ghextractor)](https://github.com/LeSoviet/GithubCLIExtractor)\n`;
    md += `**Version:** ${packageVersion === 'unknown' ? 'n/a' : packageVersion}\n`;

    return md;
  }

  /**
   * Generate summary statistics section - REMOVED to avoid redundancy
   * Data is already in Executive Summary
   */
  private generateSummaryStats(_report: AnalyticsReport): string {
    // Summary stats removed as they duplicate executive summary
    // Keeping method for backward compatibility
    return ``;
  }

  /**
   * Normalize excessive whitespace in markdown
   * Prevents large blank sections in PDF output
   */
  private normalizeWhitespace(md: string): string {
    // Replace 4+ consecutive newlines with 2 newlines (max one blank line)
    md = md.replace(/(\n){4,}/g, '\n\n');

    // Remove trailing whitespace from lines
    md = md
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');

    // Trim leading/trailing whitespace from entire document
    md = md.trim();

    return md;
  }
}
