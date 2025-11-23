import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';

/**
 * Generates insights and recommendations section based on analytics data
 */
export class RecommendationsGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    let md = `\n---\n\n`;
    md += `## 💡 Insights & Recommendations\n\n`;

    const recommendations: string[] = [];

    recommendations.push(...this.generatePRMergeRateInsights(report));
    recommendations.push(...this.generateReviewCoverageInsights(report));
    recommendations.push(...this.generateBusFactorInsights(report));
    recommendations.push(...this.generateContributionConcentrationInsights(report));
    recommendations.push(...this.generateIssueResolutionInsights(report));

    if (recommendations.length > 0) {
      recommendations.forEach((rec, i) => {
        md += `### ${i + 1}. ${rec}\n\n`;
      });
    } else {
      md += `✅ All metrics are within healthy ranges. Continue current practices!\n\n`;
    }

    return md;
  }

  private generatePRMergeRateInsights(report: AnalyticsReport): string[] {
    const insights: string[] = [];
    const mergeRate = report.activity.prMergeRate.mergeRate;

    if (mergeRate < 50) {
      insights.push(
        `🔴 **Low PR Merge Rate (${mergeRate.toFixed(1)}%)**\n   - Review PR approval process\n   - Provide clearer contribution guidelines\n   - Consider implementing PR templates`
      );
    } else if (mergeRate > 80) {
      insights.push(
        `🟢 **Excellent PR Merge Rate (${mergeRate.toFixed(1)}%)**\n   - Indicates healthy contribution workflow\n   - Maintain current review standards`
      );
    }

    return insights;
  }

  private generateReviewCoverageInsights(report: AnalyticsReport): string[] {
    const insights: string[] = [];
    const coverage = report.health.prReviewCoverage.coveragePercentage;

    if (coverage < 70) {
      insights.push(
        `🟡 **Review Coverage Needs Improvement (${coverage.toFixed(1)}%)**\n   - Encourage more code reviews\n   - Consider requiring reviews before merge\n   - Set up CODEOWNERS file`
      );
    } else {
      insights.push(
        `🟢 **Strong Review Coverage (${coverage.toFixed(1)}%)**\n   - Excellent code quality practices\n   - Continue current review process`
      );
    }

    return insights;
  }

  private generateBusFactorInsights(report: AnalyticsReport): string[] {
    const insights: string[] = [];
    const busFactor = report.contributors.busFactor;

    if (busFactor <= 2) {
      insights.push(
        `🔴 **Critical: Low Bus Factor (${busFactor})**\n   - High project risk if key contributors leave\n   - Encourage knowledge sharing\n   - Document critical systems\n   - Onboard new contributors`
      );
    } else if (busFactor >= 5) {
      insights.push(
        `🟢 **Healthy Bus Factor (${busFactor})**\n   - Good distribution of knowledge\n   - Low project continuity risk`
      );
    }

    return insights;
  }

  private generateContributionConcentrationInsights(report: AnalyticsReport): string[] {
    const insights: string[] = [];

    if (report.contributors.contributionDistribution.length > 0) {
      const topPercentage = report.contributors.contributionDistribution[0]?.percentage || 0;
      if (topPercentage > 50) {
        insights.push(
          `🟡 **High Contribution Concentration (${topPercentage.toFixed(1)}%)**\n   - Top contributor dominates contributions\n   - Risk of knowledge silos\n   - Encourage broader participation`
        );
      }
    }

    return insights;
  }

  private generateIssueResolutionInsights(report: AnalyticsReport): string[] {
    const insights: string[] = [];

    if (report.activity.issueResolutionTime.averageHours > 0) {
      const avgDays = report.activity.issueResolutionTime.averageHours / 24;

      if (avgDays > 30) {
        insights.push(
          `🟡 **Slow Issue Resolution (${avgDays.toFixed(1)} days avg)**\n   - Consider triaging issues more frequently\n   - Set up issue templates for clarity\n   - Prioritize critical issues`
        );
      } else if (avgDays < 7) {
        insights.push(
          `🟢 **Fast Issue Resolution (${avgDays.toFixed(1)} days avg)**\n   - Excellent responsiveness\n   - Maintain current triage process`
        );
      }
    }

    return insights;
  }
}
