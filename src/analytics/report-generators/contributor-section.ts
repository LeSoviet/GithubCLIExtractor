import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { statusHelpers } from './status-helpers.js';
import { formatPercentage } from '../../utils/format-helpers.js';

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
    md += `- **Active Contributors:** ${report.activity.activeContributors[0]?.contributors || 0} (in analysis period)\n`;
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
      md += `**Concentration of Contributions**: The top contributor accounts for ${formatPercentage(topContributorPercentage)} of all contributions.\n\n`;
    }

    // Add contribution mix breakdown
    const totalCommits = report.contributors.topContributors.reduce((sum, c) => sum + c.commits, 0);
    const totalPRs = report.contributors.topContributors.reduce((sum, c) => sum + c.prs, 0);
    const totalReviews = report.contributors.topContributors.reduce((sum, c) => sum + c.reviews, 0);
    const totalAll = totalCommits + totalPRs + totalReviews;

    if (totalAll > 0) {
      // Use the real total PR count from the activity section as the denominator,
      // not the sum of the (truncated) top-10 list, so the share is not misleading.
      const totalPRsInRepo = report.activity.prMergeRate.total;
      const prShare = totalPRsInRepo > 0 ? (totalPRs / totalPRsInRepo) * 100 : 0;

      md += `### Contribution Mix\n\n`;
      md += `*Breakdown of the top ${report.contributors.topContributors.length} contributors (of ${report.contributors.totalContributors} total in the analysis period). Shares are relative to the full PR count (${totalPRsInRepo}).*\n\n`;
      md += `| Type | Count | Share of Total |\n`;
      md += `|------|-------|----------------|\n`;
      if (totalCommits > 0) {
        md += `| Commits | ${totalCommits} | ${((totalCommits / totalAll) * 100).toFixed(1)}% of top-10 mix |\n`;
      }
      if (totalPRs > 0) {
        md += `| Pull Requests | ${totalPRs} | ${prShare.toFixed(1)}% of all PRs |\n`;
      }
      if (totalReviews > 0) {
        md += `| Reviews | ${totalReviews} | ${((totalReviews / totalAll) * 100).toFixed(1)}% of top-10 mix |\n`;
      }
      md += `\n`;
    }

    return md;
  }
}
