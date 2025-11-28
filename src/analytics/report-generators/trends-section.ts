import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { safePercentageDelta, safeTimeDelta } from './data-validator.js';
import { ChartGenerator } from '../../utils/chart-generator.js';

/**
 * Generates the Temporal Trends section of the markdown report
 * Shows metrics comparison and velocity trends vs previous period
 */
export class TrendsSectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    if (!report.trends) {
      return '';
    }

    let md = `## Trends (vs Previous Period)\n\n`;
    md += `> **Note:** PR Merge Rate compares last 30 days (${report.trends.trends.prMergeRate.current.toFixed(1)}%) vs previous 30 days (${report.trends.trends.prMergeRate.previous.toFixed(1)}%). Overall metrics in Executive Summary reflect the entire analysis period.\n\n`;

    md += this.generateTrendMetricsTable(report);
    md += this.generateVelocityChart(report);
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
    md += `| PR Merge Rate | ${mergeRate.current.toFixed(1)}% | ${mergeRate.previous.toFixed(1)}% | ${this.formatDelta(mergeRate.delta)} | ${mergeIcon} ${mergeRate.trend === 'improving' ? 'Improving' : mergeRate.trend === 'declining' ? 'Declining' : 'Stable'} |\n`;

    // Time to Review
    const timeToReview = trends.timeToReview;
    const reviewIcon = this.getTrendIcon(timeToReview.trend);
    const currentReviewHours = timeToReview.current;
    const previousReviewHours = timeToReview.previous;

    // Only show if we have valid data
    if (currentReviewHours > 0 && isFinite(currentReviewHours)) {
      md += `| Time to Review | ${currentReviewHours.toFixed(1)}h | ${previousReviewHours.toFixed(1)}h | ${this.formatTimeDelta(timeToReview.delta)} | ${reviewIcon} ${timeToReview.trend === 'improving' ? 'Improving' : timeToReview.trend === 'declining' ? 'Declining' : 'Stable'} |\n`;
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
    md += `| Issue Resolution | ${currentDays.toFixed(1)}d | ${previousDays.toFixed(1)}d | ${this.formatDaysDelta(resolution.delta / 24)} | ${resIcon} ${resolution.trend === 'improving' ? 'Improving' : resolution.trend === 'declining' ? 'Declining' : 'Stable'} |\n\n`;

    return md;
  }

  private getTrendIcon(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      case 'stable':
        return '→';
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
    return `${sign}${delta.toFixed(1)}d`;
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
    const maxValue = Math.max(...mergedPRs, 5); // Ensure reasonable scale

    let md = `### 12-Week Velocity Trend\n\n`;
    md += ChartGenerator.generateVelocityChart(weeks, mergedPRs, maxValue);
    md += `\n`;

    return md;
  }
}
