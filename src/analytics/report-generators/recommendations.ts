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

    if (mergeRate < 40) {
      insights.push(
        `🗔 **Low PR Merge Rate (${mergeRate.toFixed(1)}%)**
   - Note: Different projects have different expected merge rates based on quality standards
   - Review PR approval process for blockers
   - Check if PRs are stalling after approval (merge bottleneck vs review bottleneck)
   - Recommended actions:
     - Implement auto-merge for approved PRs
     - Review branch protection requirements
     - Establish clear merge SLA`
      );
    } else if (mergeRate < 50) {
      insights.push(
        `🟡 **Moderate PR Merge Rate (${mergeRate.toFixed(1)}%)**
   - Note: Some high-quality projects maintain merge rates in 25-40% range by design
   - If above benchmark: maintain current standards
   - If trending down: investigate recent process changes
   - Consider benchmark data: industry median is ${report.benchmark?.metrics.prMergeRate.median.toFixed(1) || '45'}%`
      );
    } else if (mergeRate >= 75) {
      insights.push(
        `🟢 **Excellent PR Merge Rate (${mergeRate.toFixed(1)}%)**
   - Indicates healthy contribution workflow
   - Fast decision-making on PRs
   - Maintain current review standards`
      );
    }

    return insights;
  }

  private generateReviewCoverageInsights(report: AnalyticsReport): string[] {
    const insights: string[] = [];
    const coverage = report.health.prReviewCoverage.coveragePercentage;
    const unreviewed =
      report.health.prReviewCoverage.total - report.health.prReviewCoverage.reviewed;

    if (coverage < 70) {
      insights.push(
        `🟡 **Review Coverage Needs Improvement (${coverage.toFixed(1)}%)**
   - **Action**: ${unreviewed} PRs were merged without review
   - **Next Steps**:
     - Enable "Require approvals" in branch protection
     - Set up CODEOWNERS file for automatic review assignment
     - Schedule code review training session`
      );
    } else if (coverage >= 90) {
      insights.push(
        `🟢 **Excellent Review Coverage (${coverage.toFixed(1)}%)**\n   - Strong code quality practices in place\n   - Continue maintaining current review standards`
      );
    }

    return insights;
  }

  private generateBusFactorInsights(report: AnalyticsReport): string[] {
    const insights: string[] = [];
    const busFactor = report.contributors.busFactor;
    const topContributor = report.contributors.topContributors[0];
    const topPercentage = report.contributors.contributionDistribution[0]?.percentage || 0;

    if (busFactor <= 2) {
      insights.push(
        `🔴 **Critical: Low Bus Factor (${busFactor})**
   - **Risk**: ${topContributor?.login || 'Top contributor'} accounts for ${topPercentage.toFixed(1)}% of contributions
   - **Immediate Actions**:
     - Document critical systems and processes
     - Implement pair programming sessions
     - Create onboarding documentation for new contributors
     - Schedule knowledge transfer sessions`
      );
    } else if (busFactor >= 5) {
      insights.push(
        `🟢 **Healthy Bus Factor (${busFactor})**\n   - Well-distributed knowledge across team\n   - Low project continuity risk`
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
