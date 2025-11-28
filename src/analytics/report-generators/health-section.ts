import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { statusHelpers } from './status-helpers.js';
import { formatPercentage } from '../../utils/format-helpers.js';

/**
 * Generates the Code Health Metrics section of the markdown report
 */
export class HealthSectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    let md = `---\n\n`;
    md += `## Code Health Metrics\n\n`;
    md += this.generateReviewProcess(report);
    md += this.generatePRSizeAnalysis(report);
    md += this.generateDeploymentActivity(report);
    return md;
  }

  private generateReviewProcess(report: AnalyticsReport): string {
    let md = `### Review Process\n\n`;
    md += `- **Review Coverage:** ${formatPercentage(report.health.prReviewCoverage.coveragePercentage)} ${statusHelpers.getHealthStatus(report.health.prReviewCoverage.coveragePercentage, 50, 70)}\n`;
    md += `- **Reviewed PRs:** ${report.health.prReviewCoverage.reviewed} / ${report.health.prReviewCoverage.total}\n\n`;
    return md;
  }

  private generatePRSizeAnalysis(report: AnalyticsReport): string {
    // Skip entire section if no PR size data available
    if (report.health.averagePrSize.total === 0) {
      return '';
    }

    let md = `### PR Size Analysis\n\n`;
    md += `- **Average Changes:** ${report.health.averagePrSize.total} lines per PR\n`;
    md += `  - **Additions:** +${report.health.averagePrSize.additions} lines\n`;
    md += `  - **Deletions:** -${report.health.averagePrSize.deletions} lines\n\n`;

    // Add PR size recommendation
    if (report.health.averagePrSize.total > 500) {
      md += `> **Consideration:** Average PR size is large (>500 lines). Breaking changes into smaller PRs can improve review efficiency.\n\n`;
    } else if (report.health.averagePrSize.total < 100) {
      md += `> **Healthy Practice:** Small PR sizes (avg <100 lines) enable faster reviews and reduce merge conflicts.\n\n`;
    }

    return md;
  }

  private generateDeploymentActivity(report: AnalyticsReport): string {
    let md = `### Deployment Activity\n\n`;
    md += `- **Total Releases:** ${report.health.deploymentFrequency.releases} ${statusHelpers.getDeploymentStatus(report.health.deploymentFrequency.releases)}\n`;
    return md;
  }
}
