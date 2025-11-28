import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import type { BenchmarkComparison } from '../benchmarking.js';
import { ChartGenerator } from '../../utils/chart-generator.js';

/**
 * Generates the Benchmark Comparison section of the markdown report
 * Shows how repository metrics compare against industry standards
 */
export class BenchmarksSectionGenerator implements SectionGenerator {
  generate(_report: AnalyticsReport, benchmark?: BenchmarkComparison): string {
    if (!benchmark) {
      return '';
    }

    let md = `## Industry Benchmark Comparison\n\n`;
    md += `Compared against 50 similar-sized open source projects:\n\n`;
    md += this.generateBenchmarksTable(benchmark);
    md += this.generateRadarChart(benchmark);
    md += this.generateInsights(benchmark);
    return md;
  }

  private generateBenchmarksTable(benchmark: BenchmarkComparison): string {
    let md = `| Metric | Your Repo | Median | Percentile | Interpretation |\n`;
    md += `|--------|-----------|--------|------------|-----------------|\n`;

    const metrics = benchmark.metrics;

    // PR Merge Rate
    const mergeEmoji = this.getRatingEmoji(metrics.prMergeRate.rating);
    const mergeInterpretation = this.getPercentileInterpretation(metrics.prMergeRate.percentile);
    md += `| PR Merge Rate | ${metrics.prMergeRate.value.toFixed(1)}% | ${metrics.prMergeRate.median.toFixed(1)}% | ${mergeEmoji} ${metrics.prMergeRate.percentile}th | ${mergeInterpretation} |\n`;

    // Time to First Review
    const reviewEmoji = this.getRatingEmoji(metrics.timeToFirstReview.rating);
    const reviewDisplay =
      metrics.timeToFirstReview.value > 0
        ? `${metrics.timeToFirstReview.value.toFixed(1)}h`
        : 'N/A';
    const reviewInterpretation = this.getPercentileInterpretation(
      metrics.timeToFirstReview.percentile
    );
    md += `| Time to First Review | ${reviewDisplay} | ${metrics.timeToFirstReview.median.toFixed(1)}h | ${reviewEmoji} ${metrics.timeToFirstReview.percentile}th | ${reviewInterpretation} |\n`;

    // Review Coverage
    const coverageEmoji = this.getRatingEmoji(metrics.reviewCoverage.rating);
    const coverageInterpretation = this.getPercentileInterpretation(
      metrics.reviewCoverage.percentile
    );
    md += `| Review Coverage | ${metrics.reviewCoverage.value.toFixed(1)}% | ${metrics.reviewCoverage.median.toFixed(1)}% | ${coverageEmoji} ${metrics.reviewCoverage.percentile}th | ${coverageInterpretation} |\n`;

    // Bus Factor
    const busFactorEmoji = this.getRatingEmoji(metrics.busFactor.rating);
    const busFactorInterpretation = this.getPercentileInterpretation(metrics.busFactor.percentile);
    md += `| Bus Factor | ${metrics.busFactor.value.toFixed(0)} | ${metrics.busFactor.median.toFixed(0)} | ${busFactorEmoji} ${metrics.busFactor.percentile}th | ${busFactorInterpretation} |\n`;

    // Issue Resolution
    const resolutionEmoji = this.getRatingEmoji(metrics.issueResolution.rating);
    const resolutionInterpretation = this.getPercentileInterpretation(
      metrics.issueResolution.percentile
    );
    md += `| Issue Resolution | ${metrics.issueResolution.value.toFixed(1)}d | ${metrics.issueResolution.median.toFixed(1)}d | ${resolutionEmoji} ${metrics.issueResolution.percentile}th | ${resolutionInterpretation} |\n`;

    // Deployment Frequency
    const deploymentEmoji = this.getRatingEmoji(metrics.deploymentFrequency.rating);
    const deploymentInterpretation = this.getPercentileInterpretation(
      metrics.deploymentFrequency.percentile
    );
    md += `| Deployment Frequency | ${metrics.deploymentFrequency.value.toFixed(1)}/mo | ${metrics.deploymentFrequency.median.toFixed(1)}/mo | ${deploymentEmoji} ${metrics.deploymentFrequency.percentile}th | ${deploymentInterpretation} |\n\n`;

    md += `**Overall Score: ${benchmark.overallScore}/100**\n\n`;

    return md;
  }

  private generateRadarChart(benchmark: BenchmarkComparison): string {
    const metrics = benchmark.metrics;

    // Normalize percentiles to 0-100
    const normalize = (percentile: number): number => Math.min(100, Math.max(0, percentile));

    const categories = ['Merge Rate', 'Review Speed', 'Coverage', 'Bus Factor', 'Deployment'];
    const values = [
      normalize(metrics.prMergeRate.percentile),
      normalize(metrics.timeToFirstReview.percentile),
      normalize(metrics.reviewCoverage.percentile),
      normalize(metrics.busFactor.percentile),
      normalize(metrics.deploymentFrequency.percentile),
    ];

    // Only show chart if we have valid data (at least some non-zero values)
    const hasValidData = values.some((v) => v > 0);
    if (!hasValidData) {
      return '';
    }

    let md = `### Your Position in the Industry\n\n`;
    md += ChartGenerator.generateRadarChart(categories, values);
    md += `\n`;

    return md;
  }

  private generateInsights(benchmark: BenchmarkComparison): string {
    let md = `### Analysis\n\n`;

    if (benchmark.strengths.length > 0) {
      md += `**Strengths (Above 75th percentile):**\n`;
      benchmark.strengths.forEach((strength) => {
        md += `- ${strength}\n`;
      });
      md += `\n`;
    }

    if (benchmark.weaknesses.length > 0) {
      md += `**Weaknesses (Below 50th percentile):**\n`;
      benchmark.weaknesses.forEach((weakness) => {
        md += `- ${weakness}\n`;
      });
      md += `\n`;
    } else {
      md += `**Weaknesses:** None identified - all metrics at or above median.\n\n`;
    }

    if (
      benchmark.recommendations.length === 0 &&
      benchmark.weaknesses.length === 0 &&
      benchmark.strengths.length > 0
    ) {
      md += `**Recommendations:** No critical areas for improvement - maintain current practices.\n\n`;
    } else if (benchmark.recommendations.length > 0) {
      md += `**Recommendations (Priority Order):**\n`;
      benchmark.recommendations.forEach((rec, i) => {
        md += `${i + 1}. ${rec}\n`;
      });
      md += `\n`;
    }

    return md;
  }

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

  private getPercentileInterpretation(percentile: number): string {
    if (percentile >= 90) return 'Excellent (top 10%)';
    if (percentile >= 75) return 'Good (top 25%)';
    if (percentile >= 50) return 'Average (median)';
    if (percentile >= 25) return 'Below average';
    return 'Poor (bottom 25%)';
  }
}
