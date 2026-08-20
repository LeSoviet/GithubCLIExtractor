import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { formatPercentage, formatCount } from '../../utils/format-helpers.js';
import { ChartGenerator } from '../../utils/chart-generator.js';

/**
 * Generates the Activity Analytics section of the markdown report
 */
export class ActivitySectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    let md = `## Activity Analytics\n\n`;
    md += `**Analysis Period:** ${new Date(report.activity.period.start).toLocaleDateString()} to ${new Date(report.activity.period.end).toLocaleDateString()}\n\n`;

    md += this.generatePRMetrics(report);
    md += this.generateIssueResolution(report);
    md += this.generateCommitActivity(report);
    md += this.generateActivityHotspots(report);

    md += `---\n\n`;
    return md;
  }

  private generatePRMetrics(report: AnalyticsReport): string {
    const { merged, closed, open, total, mergeRate } = report.activity.prMergeRate;
    let md = `### Pull Request Metrics\n\n`;
    md += `- **Merge Rate:** ${formatPercentage(mergeRate)}\n`;
    md += `- **Merged PRs:** ${merged}\n`;
    md += `- **Closed (not merged):** ${closed}\n`;
    if (open > 0) {
      md += `- **Open PRs:** ${open}\n`;
    }
    md += `- **Total PRs:** ${total}\n\n`;
    return md;
  }

  private generateIssueResolution(report: AnalyticsReport): string {
    let md = `### Issue Resolution\n\n`;

    if (report.activity.issueResolutionTime.averageHours > 0) {
      const avgDays = (report.activity.issueResolutionTime.averageHours / 24).toFixed(1);
      const medianDays = (report.activity.issueResolutionTime.medianHours / 24).toFixed(1);
      md += `- **Average Resolution Time:** ${avgDays} days (${formatCount(report.activity.issueResolutionTime.averageHours)} hours)\n`;
      md += `- **Median Resolution Time:** ${medianDays} days (${formatCount(report.activity.issueResolutionTime.medianHours)} hours)\n`;
    } else {
      md += `- **Resolution Time:** No closed issues found in analysis period\n`;
    }

    return md;
  }

  private generateActivityHotspots(report: AnalyticsReport): string {
    if (report.activity.busiestDays.length === 0) {
      return '';
    }

    let md = `\n### Activity Hotspots\n\n`;
    md += `**Most Active Days:**\n\n`;

    report.activity.busiestDays.slice(0, 5).forEach((day, index) => {
      md += `${index + 1}. **${day.day}:** ${day.count} commits\n`;
    });

    return md;
  }

  private generateCommitActivity(report: AnalyticsReport): string {
    const { dates, counts } = report.activity.commitsOverTime;
    if (dates.length === 0) {
      return '';
    }

    const totalCommits = counts.reduce((sum, c) => sum + c, 0);
    const maxValue = Math.max(...counts, 1);

    let md = `\n### Commit Activity\n\n`;
    md += `- **Total Commits:** ${formatCount(totalCommits)}\n`;
    md += `- **Active Days:** ${dates.length}\n`;
    md += `- **Avg Commits/Day:** ${(totalCommits / dates.length).toFixed(1)}\n\n`;

    md += ChartGenerator.generateCommitsChart(dates, counts, maxValue);
    md += `\n`;

    return md;
  }
}
