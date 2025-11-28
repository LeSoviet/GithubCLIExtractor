import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { safePercentageDelta, safeTimeDelta } from './data-validator.js';
import { ChartGenerator } from '../../utils/chart-generator.js';
import { formatPercentage, formatHours, formatDays } from '../../utils/format-helpers.js';

/**
 * Generates the Temporal Trends section of the markdown report
 * Shows metrics comparison and velocity trends vs previous period
 */
export class TrendsSectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    if (!report.trends) {
      return '';
    }

    let md = `---

## Trends (vs Previous Period)

`;
    md += `### Period-over-Period Comparison\n\n`;
    md += this.generateTrendMetricsTable(report);
    md += this.generateVelocityChart(report);
    md += `---\n\n`;
    return md;
  }

  private generateTrendMetricsTable(report: AnalyticsReport): string {
    if (!report.trends) return '';

    const trends = report.trends.trends;

    let md = `| Metric | Current | Previous | Δ | Trend |\n`;
    md += `|--------|---------|----------|---|-------|\n`;

    // PR Merge Rate
    const mergeRate = trends.prMergeRate;
    const mergeIcon = this.getTrendIcon(mergeRate.trend);
    md += `| PR Merge Rate | ${formatPercentage(mergeRate.current)} | ${formatPercentage(mergeRate.previous)} | ${this.formatDelta(mergeRate.delta)} | ${mergeIcon} ${mergeRate.trend === 'improving' ? 'Improving' : mergeRate.trend === 'declining' ? 'Declining' : 'Stable'} |\n`;

    // Time to Review
    const timeToReview = trends.timeToReview;
    const reviewIcon = this.getTrendIcon(timeToReview.trend);
    const currentReviewHours = timeToReview.current;
    const previousReviewHours = timeToReview.previous;

    // Only show if we have valid data
    if (currentReviewHours > 0 && isFinite(currentReviewHours)) {
      md += `| Time to Review | ${formatHours(currentReviewHours)} | ${formatHours(previousReviewHours)} | ${this.formatTimeDelta(timeToReview.delta)} | ${reviewIcon} ${timeToReview.trend === 'improving' ? 'Improving' : timeToReview.trend === 'declining' ? 'Declining' : 'Stable'} |\n`;
    }

    // Active Contributors
    const contributors = trends.activeContributors;
    const contribIcon = this.getTrendIcon(contributors.trend);
    md += `| Active Contributors | ${contributors.current} | ${contributors.previous} | ${this.formatDeltaInt(contributors.delta)} | ${contribIcon} ${contributors.trend === 'improving' ? 'Improving' : contributors.trend === 'declining' ? 'Declining' : 'Stable'} |\n`;

    // Issue Resolution
    const resolution = trends.issueResolution;
    const resIcon = this.getTrendIcon(resolution.trend);
    const currentDays = resolution.current / 24;
    const previousDays = resolution.previous / 24;
    md += `| Issue Resolution | ${formatDays(currentDays)} | ${formatDays(previousDays)} | ${this.formatDaysDelta(resolution.delta / 24)} | ${resIcon} ${resolution.trend === 'improving' ? 'Improving' : resolution.trend === 'declining' ? 'Declining' : 'Stable'} |\n\n`;

    return md;
  }

  private getTrendIcon(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Declining';
      case 'stable':
        return 'Stable';
    }
  }

  private formatDelta(delta: number): string {
    return safePercentageDelta(delta);
  }

  private formatTimeDelta(delta: number): string {
    return safeTimeDelta(delta);
  }

  private formatDaysDelta(delta: number): string {
    if (!isFinite(delta) || isNaN(delta)) {
      return '0d';
    }
    const sign = delta > 0 ? '+' : '';
    return `${sign}${formatDays(delta)}`;
  }

  private formatDeltaInt(delta: number): string {
    if (delta === 0) return '0';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${Math.round(delta)}`;
  }

  private generateVelocityChart(report: AnalyticsReport): string {
    if (
      !report.trends ||
      !report.trends.velocityTrend ||
      report.trends.velocityTrend.length === 0
    ) {
      return '';
    }

    const trend = report.trends.velocityTrend;
    const weeks = trend.map((t) => t.week);
    const mergedPRs = trend.map((t) => t.mergedPRs);
    const maxValue = Math.max(...mergedPRs, 5);

    // Calculate trend insight
    const firstWeek = mergedPRs[0] || 1;
    const lastWeek = mergedPRs[mergedPRs.length - 1] || 1;
    const trendPercentageNum = ((lastWeek - firstWeek) / firstWeek) * 100;
    const trendDirection = lastWeek > firstWeek ? 'increasing' : 'decreasing';
    const insight = `Velocity is ${trendDirection}: ${formatPercentage(Math.abs(trendPercentageNum))} change over 12 weeks (${firstWeek} Stable ${lastWeek} PRs/week)`;

    let md = `### 12-Week Velocity Trend\n\n`;
    md += `*${insight}*\n\n`;
    md += ChartGenerator.generateVelocityChart(weeks, mergedPRs, maxValue);
    md += `\n`;

    return md;
  }
}
