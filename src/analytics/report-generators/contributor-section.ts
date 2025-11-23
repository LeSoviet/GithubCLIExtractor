import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { statusHelpers } from './status-helpers.js';

/**
 * Generates the Contributor Analytics section of the markdown report
 */
export class ContributorSectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    let md = `## 👥 Contributor Analytics\n\n`;
    md += this.generateTeamHealth(report);
    md += this.generateTopContributors(report);
    return md;
  }

  private generateTeamHealth(report: AnalyticsReport): string {
    let md = `### Team Health\n\n`;
    md += `- **Bus Factor:** ${report.contributors.busFactor} ${statusHelpers.getBusFactorStatus(report.contributors.busFactor)}\n`;
    md += `  - *Indicates project risk if key contributors become unavailable*\n`;
    md += `- **Active Contributors:** ${report.activity.activeContributors[0]?.contributors || 0} (last 90 days)\n`;
    md += `- **Contributor Mix:** ${report.contributors.newVsReturning.new} new, ${report.contributors.newVsReturning.returning} returning\n\n`;
    return md;
  }

  private generateTopContributors(report: AnalyticsReport): string {
    if (report.contributors.topContributors.length === 0) {
      return '';
    }

    let md = `### Top Contributors\n\n`;

    // Determine which columns to show based on data
    const hasCommits = report.contributors.topContributors.some((c) => c.commits > 0);
    const hasPRs = report.contributors.topContributors.some((c) => c.prs > 0);
    const hasReviews = report.contributors.topContributors.some((c) => c.reviews > 0);

    // Build table header
    let tableHeader = `| Contributor `;
    let tableDivider = `|-------------`;
    if (hasCommits) {
      tableHeader += `| Commits `;
      tableDivider += `|---------`;
    }
    if (hasPRs) {
      tableHeader += `| PRs `;
      tableDivider += `|-----`;
    }
    if (hasReviews) {
      tableHeader += `| Reviews `;
      tableDivider += `|--------`;
    }
    tableHeader += `| Total Contributions |\n`;
    tableDivider += `|-------------------|\n`;

    md += tableHeader;
    md += tableDivider;

    // Build table rows
    for (const contributor of report.contributors.topContributors.slice(0, 10)) {
      let row = `| ${contributor.login} `;
      if (hasCommits) {
        row += `| ${contributor.commits} `;
      }
      if (hasPRs) {
        row += `| ${contributor.prs} `;
      }
      if (hasReviews) {
        row += `| ${contributor.reviews} `;
      }
      row += `| ${contributor.totalContributions} |\n`;
      md += row;
    }
    md += `\n`;

    // Add contribution concentration insight
    if (report.contributors.contributionDistribution.length > 0) {
      const topContributorPercentage =
        report.contributors.contributionDistribution[0]?.percentage || 0;
      md += `**Concentration of Contributions**: The top contributor accounts for ${topContributorPercentage.toFixed(1)}% of all contributions.\n\n`;
    }

    return md;
  }
}
