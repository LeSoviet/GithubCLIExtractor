import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { statusHelpers } from './status-helpers.js';

/**
 * Generates the Code Health Metrics section of the markdown report
 */
export class HealthSectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    let md = `---\n\n`;
    md += `## 💊 Code Health Metrics\n\n`;
    md += this.generateReviewProcess(report);
    md += this.generatePRSizeAnalysis(report);
    md += this.generateDeploymentActivity(report);
    return md;
  }

  private generateReviewProcess(report: AnalyticsReport): string {
    let md = `### Review Process\n\n`;
    md += `- **Review Coverage:** ${report.health.prReviewCoverage.coveragePercentage.toFixed(1)}% ${statusHelpers.getHealthStatus(report.health.prReviewCoverage.coveragePercentage, 50, 70)}\n`;
    md += `- **Reviewed PRs:** ${report.health.prReviewCoverage.reviewed} / ${report.health.prReviewCoverage.total}\n\n`;
    return md;
  }

  private generatePRSizeAnalysis(report: AnalyticsReport): string {
    let md = `### PR Size Analysis\n\n`;

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
      md += `- **Average PR Size:** No data available (PRs contain no diff metadata)\n\n`;
    }

    return md;
  }

  private generateDeploymentActivity(report: AnalyticsReport): string {
    let md = `### Deployment Activity\n\n`;
    md += `- **Total Releases:** ${report.health.deploymentFrequency.releases} ${statusHelpers.getDeploymentStatus(report.health.deploymentFrequency.releases)}\n`;
    return md;
  }
}
