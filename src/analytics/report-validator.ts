import type { AnalyticsReport } from '../types/analytics.js';
import { logger } from '../utils/logger.js';

/**
 * Validation result for analytics reports
 */
export interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  metadata: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
  };
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  expected: number | string;
  actual: number | string;
}

/**
 * Validates analytics report for numerical consistency and data integrity
 */
export class ReportValidator {
  private warnings: ValidationWarning[] = [];
  private errors: ValidationError[] = [];
  private totalChecks = 0;
  private passedChecks = 0;

  /**
   * Validate a complete analytics report
   */
  validate(report: AnalyticsReport): ValidationResult {
    this.warnings = [];
    this.errors = [];
    this.totalChecks = 0;
    this.passedChecks = 0;

    logger.info('Validating analytics report for numerical consistency...');

    // Run all validation checks
    this.validatePRCounts(report);
    this.validateIssueCounts(report);
    this.validateContributorCounts(report);
    this.validatePercentages(report);
    this.validateTimestamps(report);
    this.validateTrends(report);
    this.validateRatios(report);

    const failedChecks = this.errors.length;
    const warningChecks = this.warnings.length;

    const result: ValidationResult = {
      valid: this.errors.length === 0,
      warnings: this.warnings,
      errors: this.errors,
      metadata: {
        totalChecks: this.totalChecks,
        passedChecks: this.passedChecks,
        failedChecks,
        warningChecks,
      },
    };

    if (result.valid) {
      logger.success(
        `✅ Report validation passed (${this.passedChecks}/${this.totalChecks} checks)`
      );
    } else {
      logger.warn(
        `⚠️  Report validation found ${failedChecks} errors and ${warningChecks} warnings`
      );
      this.errors.forEach((error) => {
        logger.error(
          `  ❌ ${error.field}: ${error.message} (expected: ${error.expected}, got: ${error.actual})`
        );
      });
    }

    return result;
  }

  /**
   * Validate PR count consistency across different sections
   */
  private validatePRCounts(report: AnalyticsReport): void {
    const activityPRTotal = report.activity.prMergeRate.merged + report.activity.prMergeRate.closed;
    const healthPRTotal = report.health.prReviewCoverage.total;

    this.totalChecks++;
    if (activityPRTotal !== healthPRTotal) {
      // Allow 10% variance for different time windows or filtering
      const variance =
        Math.abs(activityPRTotal - healthPRTotal) / Math.max(activityPRTotal, healthPRTotal);
      if (variance > 0.1) {
        this.errors.push({
          field: 'activity.prMergeRate vs health.prReviewCoverage',
          message: 'PR counts do not match between activity and health sections',
          expected: healthPRTotal,
          actual: activityPRTotal,
        });
      } else {
        this.passedChecks++;
        this.warnings.push({
          field: 'activity.prMergeRate vs health.prReviewCoverage',
          message: `Minor variance in PR counts (${activityPRTotal} vs ${healthPRTotal})`,
          severity: 'low',
          suggestion: 'This may be due to different time windows or filters',
        });
      }
    } else {
      this.passedChecks++;
    }

    // Validate review velocity PR counts if available
    if (report.reviewVelocity) {
      this.totalChecks++;
      const bottleneckPRs = report.reviewVelocity.reviewBottlenecks.length;
      if (bottleneckPRs > activityPRTotal) {
        this.errors.push({
          field: 'reviewVelocity.reviewBottlenecks',
          message: 'More bottleneck PRs than total PRs analyzed',
          expected: `<= ${activityPRTotal}`,
          actual: bottleneckPRs,
        });
      } else {
        this.passedChecks++;
      }
    }
  }

  /**
   * Validate issue count consistency
   */
  private validateIssueCounts(report: AnalyticsReport): void {
    // Validate that issue resolution metrics make sense
    this.totalChecks++;
    const avgResolutionHours = report.activity.issueResolutionTime.averageHours;
    const medianResolutionHours = report.activity.issueResolutionTime.medianHours;

    // Average should be >= median in right-skewed distributions (typical for issues)
    if (avgResolutionHours < medianResolutionHours * 0.5) {
      this.warnings.push({
        field: 'activity.issueResolutionTime',
        message:
          'Average resolution time is significantly lower than median (unusual distribution)',
        severity: 'medium',
        suggestion: 'Check for data quality issues or outliers',
      });
    }
    this.passedChecks++;

    // Validate label analytics if available
    this.totalChecks++;
    const labelIssueLifecycle = report.labels.issueLifecycle.averageOpenDays;
    const activityResolutionDays = avgResolutionHours / 24;

    // These should be similar (allowing 50% variance due to different calculation methods)
    const variance =
      Math.abs(labelIssueLifecycle - activityResolutionDays) /
      Math.max(labelIssueLifecycle, activityResolutionDays);
    if (variance > 0.5 && labelIssueLifecycle > 0 && activityResolutionDays > 0) {
      this.warnings.push({
        field: 'labels.issueLifecycle vs activity.issueResolutionTime',
        message: `Issue lifecycle metrics differ significantly (${labelIssueLifecycle.toFixed(1)} days vs ${activityResolutionDays.toFixed(1)} days)`,
        severity: 'medium',
        suggestion: 'Different time windows or calculation methods may explain this',
      });
    }
    this.passedChecks++;
  }

  /**
   * Validate contributor count consistency
   */
  private validateContributorCounts(report: AnalyticsReport): void {
    const topContributorsCount = report.contributors.topContributors.length;
    const newContributors = report.contributors.newVsReturning.new;
    const returningContributors = report.contributors.newVsReturning.returning;
    const totalNewVsReturning = newContributors + returningContributors;

    this.totalChecks++;
    // Total should be close to top contributors count (allowing for estimation variance)
    const variance =
      Math.abs(topContributorsCount - totalNewVsReturning) /
      Math.max(topContributorsCount, totalNewVsReturning);
    if (variance > 0.3 && topContributorsCount > 0 && totalNewVsReturning > 0) {
      this.warnings.push({
        field: 'contributors.topContributors vs newVsReturning',
        message: `Contributor counts differ (${topContributorsCount} total vs ${totalNewVsReturning} categorized)`,
        severity: 'low',
        suggestion: 'newVsReturning uses estimation, some variance is expected',
      });
    }
    this.passedChecks++;

    // Validate bus factor
    this.totalChecks++;
    const busFactor = report.contributors.busFactor;
    if (busFactor > topContributorsCount) {
      this.errors.push({
        field: 'contributors.busFactor',
        message: 'Bus factor exceeds total contributor count',
        expected: `<= ${topContributorsCount}`,
        actual: busFactor,
      });
    } else if (busFactor < 1 && topContributorsCount > 0) {
      this.warnings.push({
        field: 'contributors.busFactor',
        message: 'Bus factor is less than 1 (very risky project)',
        severity: 'high',
        suggestion: 'Critical: Project relies on too few contributors',
      });
    } else {
      this.passedChecks++;
    }
  }

  /**
   * Validate percentages are in valid range (0-100)
   */
  private validatePercentages(report: AnalyticsReport): void {
    const percentages = [
      { field: 'activity.prMergeRate.mergeRate', value: report.activity.prMergeRate.mergeRate },
      {
        field: 'health.prReviewCoverage.coveragePercentage',
        value: report.health.prReviewCoverage.coveragePercentage,
      },
      ...report.labels.labelDistribution.slice(0, 5).map((label, i) => ({
        field: `labels.labelDistribution[${i}].percentage`,
        value: label.percentage,
      })),
      ...report.contributors.contributionDistribution.slice(0, 5).map((contrib, i) => ({
        field: `contributors.contributionDistribution[${i}].percentage`,
        value: contrib.percentage,
      })),
    ];

    if (report.projections) {
      percentages.push({
        field: 'projections.predictions.releasesProbability',
        value: report.projections.predictions.releasesProbability,
      });
    }

    percentages.forEach(({ field, value }) => {
      this.totalChecks++;
      if (value < 0 || value > 100) {
        this.errors.push({
          field,
          message: 'Percentage out of valid range',
          expected: '0-100',
          actual: value,
        });
      } else {
        this.passedChecks++;
      }
    });
  }

  /**
   * Validate timestamps are in correct order
   */
  private validateTimestamps(report: AnalyticsReport): void {
    this.totalChecks++;
    const periodStart = new Date(report.activity.period.start);
    const periodEnd = new Date(report.activity.period.end);
    const reportGenerated = new Date(report.generatedAt);

    if (periodStart >= periodEnd) {
      this.errors.push({
        field: 'activity.period',
        message: 'Period start date is not before end date',
        expected: `start < end`,
        actual: `${periodStart.toISOString()} >= ${periodEnd.toISOString()}`,
      });
    } else {
      this.passedChecks++;
    }

    this.totalChecks++;
    if (periodEnd > reportGenerated) {
      this.warnings.push({
        field: 'activity.period.end vs generatedAt',
        message: 'Period ends after report generation time (future data)',
        severity: 'medium',
        suggestion: 'Ensure time synchronization is correct',
      });
    } else {
      this.passedChecks++;
    }
  }

  /**
   * Validate trends if available
   */
  private validateTrends(report: AnalyticsReport): void {
    if (!report.trends) return;

    this.totalChecks++;
    const currentStart = new Date(report.trends.comparisonPeriod.current.start);
    const previousEnd = new Date(report.trends.comparisonPeriod.previous.end);

    // Previous period should be before current period
    if (previousEnd > currentStart) {
      this.warnings.push({
        field: 'trends.comparisonPeriod',
        message: 'Trend periods overlap (previous period ends after current starts)',
        severity: 'medium',
        suggestion: 'Periods should be consecutive without overlap',
      });
    } else {
      this.passedChecks++;
    }

    // Validate trend calculations
    const trends = [
      { name: 'prMergeRate', trend: report.trends.trends.prMergeRate },
      { name: 'timeToReview', trend: report.trends.trends.timeToReview },
      { name: 'activeContributors', trend: report.trends.trends.activeContributors },
      { name: 'issueResolution', trend: report.trends.trends.issueResolution },
    ];

    trends.forEach(({ name, trend }) => {
      this.totalChecks++;
      const calculatedDelta = trend.current - trend.previous;
      const reportedDelta = trend.delta;

      // Allow small floating point variance
      if (Math.abs(calculatedDelta - reportedDelta) > 0.01) {
        this.errors.push({
          field: `trends.trends.${name}.delta`,
          message: 'Trend delta does not match current - previous',
          expected: calculatedDelta.toFixed(2),
          actual: reportedDelta.toFixed(2),
        });
      } else {
        this.passedChecks++;
      }

      // Validate trend direction
      this.totalChecks++;
      const expectedTrend =
        Math.abs(calculatedDelta) < trend.current * 0.05
          ? 'stable'
          : calculatedDelta > 0
            ? 'improving'
            : 'declining';

      if (trend.trend !== expectedTrend) {
        this.warnings.push({
          field: `trends.trends.${name}.trend`,
          message: `Trend direction may be incorrect (delta: ${calculatedDelta.toFixed(2)}, marked as: ${trend.trend})`,
          severity: 'low',
          suggestion: `Expected: ${expectedTrend}`,
        });
      } else {
        this.passedChecks++;
      }
    });
  }

  /**
   * Validate ratios and correlations
   */
  private validateRatios(report: AnalyticsReport): void {
    // Validate issue to PR ratio
    this.totalChecks++;
    const issueVsPrRatio = report.labels.issueVsPrratio;
    if (issueVsPrRatio < 0) {
      this.errors.push({
        field: 'labels.issueVsPrratio',
        message: 'Issue to PR ratio cannot be negative',
        expected: '>= 0',
        actual: issueVsPrRatio,
      });
    } else {
      this.passedChecks++;
    }

    // Validate correlations if available
    if (report.correlations) {
      this.totalChecks++;
      const correlation = report.correlations.prSizeVsTimeToMerge.correlation;
      if (correlation < -1 || correlation > 1) {
        this.errors.push({
          field: 'correlations.prSizeVsTimeToMerge.correlation',
          message: 'Correlation coefficient out of valid range',
          expected: '-1 to 1',
          actual: correlation,
        });
      } else {
        this.passedChecks++;
      }

      // Validate that larger PRs generally take longer
      const small = report.correlations.prSizeVsTimeToMerge.smallPRs;
      const medium = report.correlations.prSizeVsTimeToMerge.mediumPRs;
      const large = report.correlations.prSizeVsTimeToMerge.largePRs;

      this.totalChecks++;
      if (small.avgDays > medium.avgDays || medium.avgDays > large.avgDays) {
        this.warnings.push({
          field: 'correlations.prSizeVsTimeToMerge',
          message: 'Unexpected pattern: smaller PRs take longer than larger PRs',
          severity: 'medium',
          suggestion: 'This unusual pattern may indicate process issues or data quality problems',
        });
      } else {
        this.passedChecks++;
      }
    }
  }

  /**
   * Generate a validation summary report
   */
  generateSummary(result: ValidationResult): string {
    const { valid, errors, warnings, metadata } = result;

    let summary = '# Analytics Report Validation Summary\n\n';
    summary += `**Status:** ${valid ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    summary += `**Checks:** ${metadata.passedChecks}/${metadata.totalChecks} passed\n`;
    summary += `**Errors:** ${metadata.failedChecks}\n`;
    summary += `**Warnings:** ${metadata.warningChecks}\n\n`;

    if (errors.length > 0) {
      summary += '## ❌ Errors\n\n';
      errors.forEach((error, i) => {
        summary += `${i + 1}. **${error.field}**\n`;
        summary += `   - ${error.message}\n`;
        summary += `   - Expected: ${error.expected}, Got: ${error.actual}\n\n`;
      });
    }

    if (warnings.length > 0) {
      summary += '## ⚠️  Warnings\n\n';
      warnings.forEach((warning, i) => {
        const icon =
          warning.severity === 'high' ? '🔴' : warning.severity === 'medium' ? '🟡' : '🟢';
        summary += `${i + 1}. ${icon} **${warning.field}** (${warning.severity})\n`;
        summary += `   - ${warning.message}\n`;
        if (warning.suggestion) {
          summary += `   - 💡 ${warning.suggestion}\n`;
        }
        summary += '\n';
      });
    }

    if (valid) {
      summary += '---\n\n';
      summary +=
        '✅ **All validation checks passed!** The report data is numerically consistent.\n';
    }

    return summary;
  }
}

/**
 * Helper function to validate a report and log results
 */
export function validateReport(report: AnalyticsReport): ValidationResult {
  const validator = new ReportValidator();
  return validator.validate(report);
}

/**
 * Helper function to validate and throw if invalid
 */
export function validateReportOrThrow(report: AnalyticsReport): void {
  const result = validateReport(report);
  if (!result.valid) {
    const validator = new ReportValidator();
    const summary = validator.generateSummary(result);
    throw new Error(`Report validation failed:\n\n${summary}`);
  }
}
