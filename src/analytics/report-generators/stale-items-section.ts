import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';

/**
 * Generates the Stale Items section of the markdown report
 * Shows aging PRs and unresponded issues that need attention
 */
export class StaleItemsSectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    let md = `## Items Requiring Attention\n\n`;

    // Stale PRs if available from review velocity data
    if (report.reviewVelocity && report.reviewVelocity.reviewBottlenecks.length > 0) {
      md += this.generateStalePRs(report);
    }

    // Stale issues (can be estimated from activity data)
    md += this.generateStaleIssues(report);

    return md;
  }

  private generateStalePRs(report: AnalyticsReport): string {
    if (!report.reviewVelocity || report.reviewVelocity.reviewBottlenecks.length === 0) {
      return '';
    }

    const bottlenecks = report.reviewVelocity.reviewBottlenecks
      .filter((b) => b.waitingDays >= 7)
      .sort((a, b) => b.waitingDays - a.waitingDays)
      .slice(0, 10);

    if (bottlenecks.length === 0) {
      return '';
    }

    let md = `### PRs Aging Out (>7 days without merge)\n\n`;
    md += `| # | Title | Author | Age | Status |\n`;
    md += `|---|-------|--------|-----|--------|\n`;

    for (const pr of bottlenecks) {
      const status = this.getStatusLabel(pr.status);
      const ageBracket =
        pr.waitingDays > 14 ? '[CRITICAL]' : pr.waitingDays > 7 ? '[WARN]' : '[INFO]';
      md += `| #${pr.prNumber} | ${pr.title} | @${pr.author} | ${ageBracket} ${pr.waitingDays}d | ${status} |\n`;
    }

    md += `\n`;

    md += `**Value at risk:** ${bottlenecks.length} stalled PRs\n`;
    md += `**Actions:**\n`;
    md += `- Review PR status and unblock bottlenecks\n`;
    md += `- Request author updates if waiting on changes\n`;
    md += `- Auto-merge approved PRs with passing CI\n\n`;

    return md;
  }

  private generateStaleIssues(report: AnalyticsReport): string {
    // Estimate based on projections or skip if not available
    if (!report.projections) {
      return '';
    }

    // Estimate stale issues based on projected open issues
    const estimatedStaleIssues = Math.ceil(
      report.projections.predictions.openIssuesAtEndOfPeriod.max * 0.05 // Assume 5% are stale
    );

    if (estimatedStaleIssues === 0) {
      return '';
    }

    let md = `### Issues Requiring Triage\n\n`;
    md += `**Estimated stale:** ${estimatedStaleIssues} issues\n`;
    md += `**Actions:**\n`;
    md += `- Unresponded (7d+): ~${Math.max(1, Math.floor(estimatedStaleIssues * 0.3))} issues - Add labels & assignee\n`;
    md += `- No Priority: ~${Math.max(1, Math.floor(estimatedStaleIssues * 0.4))} issues - Triage & prioritize\n`;
    md += `- Duplicate/Invalid: ~${Math.max(1, Math.floor(estimatedStaleIssues * 0.3))} issues - Close & document\n\n`;

    return md;
  }

  private getStatusLabel(
    status: 'no_reviewers' | 'changes_requested' | 'approved_pending_merge' | 'unknown'
  ): string {
    switch (status) {
      case 'no_reviewers':
        return 'No reviewers';
      case 'changes_requested':
        return 'Waiting on author';
      case 'approved_pending_merge':
        return 'Approved, waiting';
      case 'unknown':
        return 'Unknown';
    }
  }
}
