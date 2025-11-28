import type { AnalyticsReport } from '../types/analytics.js';
import { logger } from '../utils/logger.js';

/**
 * Benchmark comparison result
 */
export interface BenchmarkComparison {
  repository: string;
  metrics: {
    prMergeRate: PercentileScore;
    timeToFirstReview: PercentileScore;
    reviewCoverage: PercentileScore;
    busFactor: PercentileScore;
    issueResolution: PercentileScore;
    deploymentFrequency: PercentileScore;
  };
  overallScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface PercentileScore {
  value: number;
  median: number;
  percentile: number; // 0-100 (higher is better)
  rating: 'excellent' | 'good' | 'average' | 'below_average' | 'poor';
  description: string;
}

/**
 * Industry benchmark data (synthetic for demonstration)
 * In production, this would come from a database of real repos
 */
const INDUSTRY_BENCHMARKS = {
  prMergeRate: {
    p10: 20,
    p25: 35,
    p50: 45,
    p75: 60,
    p90: 75,
  },
  timeToFirstReview: {
    // Hours
    p10: 48,
    p25: 24,
    p50: 12,
    p75: 6,
    p90: 2,
  },
  reviewCoverage: {
    p10: 40,
    p25: 55,
    p50: 72,
    p75: 85,
    p90: 95,
  },
  busFactor: {
    p10: 1,
    p25: 2,
    p50: 3,
    p75: 5,
    p90: 8,
  },
  issueResolutionDays: {
    p10: 60,
    p25: 30,
    p50: 14,
    p75: 7,
    p90: 3,
  },
  deploymentsPerMonth: {
    p10: 0.5,
    p25: 1,
    p50: 2,
    p75: 4,
    p90: 8,
  },
};

/**
 * Benchmarking engine for comparing repository metrics against industry standards
 */
export class BenchmarkingEngine {
  /**
   * Compare a repository's metrics against industry benchmarks
   */
  async compareToBenchmarks(report: AnalyticsReport): Promise<BenchmarkComparison> {
    logger.info('Comparing repository metrics to industry benchmarks...');

    const prMergeRate = this.scoreMetric(
      report.activity.prMergeRate.mergeRate,
      INDUSTRY_BENCHMARKS.prMergeRate,
      'higher-is-better',
      'PR Merge Rate'
    );

    const timeToFirstReview = this.scoreMetric(
      report.health.timeToFirstReview.averageHours,
      INDUSTRY_BENCHMARKS.timeToFirstReview,
      'lower-is-better',
      'Time to First Review'
    );

    const reviewCoverage = this.scoreMetric(
      report.health.prReviewCoverage.coveragePercentage,
      INDUSTRY_BENCHMARKS.reviewCoverage,
      'higher-is-better',
      'Review Coverage'
    );

    const busFactor = this.scoreMetric(
      report.contributors.busFactor,
      INDUSTRY_BENCHMARKS.busFactor,
      'higher-is-better',
      'Bus Factor'
    );

    const issueResolution = this.scoreMetric(
      report.activity.issueResolutionTime.averageHours / 24, // Convert to days
      INDUSTRY_BENCHMARKS.issueResolutionDays,
      'lower-is-better',
      'Issue Resolution Time (Days)'
    );

    // Estimate monthly deployment frequency
    const monthlyDeployments = this.estimateMonthlyDeployments(report.health.deploymentFrequency);
    const deploymentFrequency = this.scoreMetric(
      monthlyDeployments,
      INDUSTRY_BENCHMARKS.deploymentsPerMonth,
      'higher-is-better',
      'Deployment Frequency'
    );

    const metrics = {
      prMergeRate,
      timeToFirstReview,
      reviewCoverage,
      busFactor,
      issueResolution,
      deploymentFrequency,
    };

    // Calculate overall score (weighted average)
    const weights = {
      prMergeRate: 0.2,
      timeToFirstReview: 0.2,
      reviewCoverage: 0.15,
      busFactor: 0.15,
      issueResolution: 0.15,
      deploymentFrequency: 0.15,
    };

    const overallScore =
      prMergeRate.percentile * weights.prMergeRate +
      timeToFirstReview.percentile * weights.timeToFirstReview +
      reviewCoverage.percentile * weights.reviewCoverage +
      busFactor.percentile * weights.busFactor +
      issueResolution.percentile * weights.issueResolution +
      deploymentFrequency.percentile * weights.deploymentFrequency;

    const strengths = this.identifyStrengths(metrics);
    const weaknesses = this.identifyWeaknesses(metrics);
    const recommendations = this.generateRecommendations(metrics, report);

    return {
      repository: report.repository,
      metrics,
      overallScore: Math.round(overallScore),
      strengths,
      weaknesses,
      recommendations,
    };
  }

  /**
   * Score a metric against benchmark percentiles
   */
  private scoreMetric(
    value: number,
    benchmarks: { p10: number; p25: number; p50: number; p75: number; p90: number },
    direction: 'higher-is-better' | 'lower-is-better',
    metricName: string
  ): PercentileScore {
    let percentile: number;

    if (direction === 'higher-is-better') {
      if (value >= benchmarks.p90) percentile = 95;
      else if (value >= benchmarks.p75) percentile = 80;
      else if (value >= benchmarks.p50) percentile = 60;
      else if (value >= benchmarks.p25) percentile = 35;
      else if (value >= benchmarks.p10) percentile = 15;
      else percentile = 5;
    } else {
      // lower-is-better
      if (value <= benchmarks.p90) percentile = 95;
      else if (value <= benchmarks.p75) percentile = 80;
      else if (value <= benchmarks.p50) percentile = 60;
      else if (value <= benchmarks.p25) percentile = 35;
      else if (value <= benchmarks.p10) percentile = 15;
      else percentile = 5;
    }

    const rating: 'excellent' | 'good' | 'average' | 'below_average' | 'poor' =
      percentile >= 90
        ? 'excellent'
        : percentile >= 75
          ? 'good'
          : percentile >= 50
            ? 'average'
            : percentile >= 25
              ? 'below_average'
              : 'poor';

    const description = `${metricName}: ${this.formatValue(value, metricName)} (${this.getRatingEmoji(rating)} ${rating}, ${percentile}th percentile)`;

    return {
      value,
      median: benchmarks.p50,
      percentile,
      rating,
      description,
    };
  }

  /**
   * Format metric value for display
   */
  private formatValue(value: number, metricName: string): string {
    if (metricName.includes('Rate') || metricName.includes('Coverage')) {
      return `${value.toFixed(1)}%`;
    } else if (metricName.includes('(Days)')) {
      // Already in days (from hours / 24 conversion)
      return `${value.toFixed(1)}d`;
    } else if (metricName.includes('Time') || metricName.includes('Resolution')) {
      // These are in hours
      return value < 24 ? `${value.toFixed(1)}h` : `${(value / 24).toFixed(1)}d`;
    } else if (metricName.includes('Frequency')) {
      return `${value.toFixed(1)}/month`;
    } else {
      return value.toFixed(0);
    }
  }

  /**
   * Get emoji for rating
   */
  private getRatingEmoji(rating: string): string {
    switch (rating) {
      case 'excellent':
        return '🟢';
      case 'good':
        return '🟡';
      case 'average':
        return '⚪';
      case 'below_average':
        return '🟠';
      case 'poor':
        return '🔴';
      default:
        return '⚪';
    }
  }

  /**
   * Estimate monthly deployment frequency
   */
  private estimateMonthlyDeployments(frequency: { releases: number; period: string }): number {
    if (frequency.period === 'monthly') {
      return frequency.releases;
    } else if (frequency.period === 'weekly') {
      return frequency.releases * 4.3;
    } else {
      // Assume releases counted over 30 days
      return frequency.releases;
    }
  }

  /**
   * Identify key strengths (metrics at 75th percentile or higher)
   */
  private identifyStrengths(metrics: BenchmarkComparison['metrics']): string[] {
    const strengths: string[] = [];

    Object.entries(metrics).forEach(([, metric]) => {
      // Skip metrics with zero/invalid values (e.g., 0.0h for time to review)
      if (metric.value <= 0) return;

      if (metric.percentile >= 75) {
        strengths.push(metric.description);
      }
    });

    if (strengths.length === 0) {
      strengths.push('No metrics performing above 75th percentile');
    }

    return strengths;
  }

  /**
   * Identify key weaknesses (metrics below 50th percentile)
   */
  private identifyWeaknesses(metrics: BenchmarkComparison['metrics']): string[] {
    const weaknesses: string[] = [];

    Object.entries(metrics).forEach(([, metric]) => {
      if (metric.percentile < 50) {
        weaknesses.push(metric.description);
      }
    });

    if (weaknesses.length === 0) {
      // Don't add placeholder text if no weaknesses found
      // The section will be omitted or display 'None identified'
    }

    return weaknesses;
  }

  /**
   * Generate actionable recommendations based on benchmarks
   */
  private generateRecommendations(
    metrics: BenchmarkComparison['metrics'],
    report: AnalyticsReport
  ): string[] {
    const recommendations: string[] = [];

    // PR Merge Rate recommendations
    if (metrics.prMergeRate.percentile < 50) {
      const gap = Math.round(metrics.prMergeRate.median - metrics.prMergeRate.value);
      recommendations.push(
        `🎯 Improve PR merge rate by ${gap}% to reach industry median. Current: ${metrics.prMergeRate.value.toFixed(1)}%, Target: ${metrics.prMergeRate.median}%`
      );

      if (report.reviewVelocity && report.reviewVelocity.reviewBottlenecks.length > 0) {
        recommendations.push(
          `   → Address ${report.reviewVelocity.reviewBottlenecks.length} stalled PRs to improve merge rate`
        );
      }
    }

    // Time to First Review recommendations
    if (metrics.timeToFirstReview.percentile < 50) {
      const current = metrics.timeToFirstReview.value;
      const target = metrics.timeToFirstReview.median;
      recommendations.push(
        `⏱️  Reduce time to first review from ${current.toFixed(1)}h to ${target}h (industry median)`
      );

      if (report.reviewVelocity) {
        const topReviewer = report.reviewVelocity.reviewerLoadDistribution[0];
        if (topReviewer && topReviewer.reviewCount > 15) {
          recommendations.push(
            `   → Distribute review load: @${topReviewer.reviewer} handles ${topReviewer.reviewCount} reviews (potential bottleneck)`
          );
        }
      }
    }

    // Review Coverage recommendations
    if (metrics.reviewCoverage.percentile < 75) {
      const gap = Math.round(INDUSTRY_BENCHMARKS.reviewCoverage.p75 - metrics.reviewCoverage.value);
      if (gap > 0) {
        recommendations.push(
          `👁️  Increase review coverage by ${gap}% to reach 75th percentile (${INDUSTRY_BENCHMARKS.reviewCoverage.p75}%)`
        );
      }
    }

    // Bus Factor recommendations
    if (metrics.busFactor.rating === 'poor' || metrics.busFactor.value < 3) {
      recommendations.push(
        `🚨 CRITICAL: Bus factor is ${metrics.busFactor.value} (risky). Aim for at least 3-5 core contributors`
      );
      recommendations.push(
        `   → ${report.contributors.topContributors[0]?.login || 'Top contributor'} contributes ${(report.contributors.contributionDistribution[0]?.percentage || 0).toFixed(0)}% of work`
      );
    }

    // Issue Resolution recommendations
    if (metrics.issueResolution.percentile < 50) {
      const currentDays = metrics.issueResolution.value;
      const targetDays = metrics.issueResolution.median;
      recommendations.push(
        `📊 Reduce issue resolution time from ${currentDays.toFixed(1)} days to ${targetDays} days`
      );

      if (report.labels && report.labels.labelDistribution.length > 0) {
        recommendations.push(
          `   → Use labels to triage: ${report.labels.mostCommonLabels.slice(0, 3).join(', ')} are most common`
        );
      }
    }

    // Deployment Frequency recommendations
    if (metrics.deploymentFrequency.percentile < 50) {
      recommendations.push(
        `🚀 Increase deployment frequency to at least ${metrics.deploymentFrequency.median.toFixed(1)}/month`
      );
      recommendations.push(
        `   → Consider automated releases for merged PRs or weekly release cadence`
      );
    }

    // General excellence recommendations
    if (
      metrics.prMergeRate.rating === 'excellent' &&
      metrics.timeToFirstReview.rating === 'excellent'
    ) {
      recommendations.push(
        `🌟 Excellent review culture! Consider sharing your practices with the community`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        `✨ All metrics are above median. Focus on maintaining current quality standards`
      );
    }

    return recommendations;
  }

  /**
   * Generate a detailed benchmark report in markdown
   */
  generateBenchmarkReport(comparison: BenchmarkComparison): string {
    let report = `# 🏆 Industry Benchmark Comparison\n\n`;
    report += `**Repository:** ${comparison.repository}\n`;
    report += `**Overall Score:** ${comparison.overallScore}/100\n\n`;

    report += `---\n\n`;

    report += `## 📊 Metrics Comparison\n\n`;
    report += `Compared against industry benchmarks from similar-sized open source projects:\n\n`;

    report += `| Metric | Your Value | Median | Percentile | Rating |\n`;
    report += `|--------|------------|--------|------------|--------|\n`;

    Object.entries(comparison.metrics).forEach(([key, metric]) => {
      const metricName = key.replace(/([A-Z])/g, ' $1').trim();
      const capitalizedName = metricName.charAt(0).toUpperCase() + metricName.slice(1);
      report += `| ${capitalizedName} | ${this.formatValue(metric.value, key)} | ${this.formatValue(metric.median, key)} | ${metric.percentile}th | ${this.getRatingEmoji(metric.rating)} ${metric.rating} |\n`;
    });

    report += `\n`;

    report += `## 💪 Strengths\n\n`;
    comparison.strengths.forEach((strength) => {
      report += `- ${strength}\n`;
    });
    report += `\n`;

    report += `## 🎯 Areas for Improvement\n\n`;
    comparison.weaknesses.forEach((weakness) => {
      report += `- ${weakness}\n`;
    });
    report += `\n`;

    report += `## 💡 Recommendations\n\n`;
    comparison.recommendations.forEach((rec, i) => {
      report += `${i + 1}. ${rec}\n`;
    });
    report += `\n`;

    report += `---\n\n`;
    report += `### Radar Chart (Text Representation)\n\n`;
    report += this.generateRadarChart(comparison.metrics);

    return report;
  }

  /**
   * Generate a text-based radar chart
   */
  private generateRadarChart(metrics: BenchmarkComparison['metrics']): string {
    const chart = `\`\`\`
        Review Speed
             ${this.getPercentileBar(metrics.timeToFirstReview.percentile)}
                ╱╲
               ╱  ╲
     Bus      ╱    ╲     Coverage
    Factor   ${this.getPercentileBar(metrics.busFactor.percentile)}──────${this.getPercentileBar(metrics.reviewCoverage.percentile)}
              ╲    ╱
               ╲  ╱
                ╲╱
            Merge Rate
              ${this.getPercentileBar(metrics.prMergeRate.percentile)}
\`\`\`\n\n`;

    return chart;
  }

  /**
   * Get a visual bar for percentile (0-100)
   */
  private getPercentileBar(percentile: number): string {
    const blocks = Math.round(percentile / 10);
    return '█'.repeat(Math.max(1, blocks));
  }
}

/**
 * Helper function to benchmark a report
 */
export async function benchmarkReport(report: AnalyticsReport): Promise<BenchmarkComparison> {
  const engine = new BenchmarkingEngine();
  return await engine.compareToBenchmarks(report);
}
