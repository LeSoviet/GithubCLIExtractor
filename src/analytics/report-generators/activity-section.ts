import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';

/**
 * Generates the Activity Analytics section of the markdown report
 */
export class ActivitySectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    let md = `## 📈 Activity Analytics\n\n`;
    md += `**Analysis Period:** ${new Date(report.activity.period.start).toLocaleDateString()} to ${new Date(report.activity.period.end).toLocaleDateString()}\n\n`;

    md += this.generatePRMetrics(report);
    md += this.generateIssueResolution(report);
    md += this.generateActivityHotspots(report);

    md += `---\n\n`;
    return md;
  }

  private generatePRMetrics(report: AnalyticsReport): string {
    let md = `### Pull Request Metrics\n\n`;
    md += `- **Merge Rate:** ${report.activity.prMergeRate.mergeRate.toFixed(1)}%\n`;
    md += `- **Merged PRs:** ${report.activity.prMergeRate.merged}\n`;
    md += `- **Closed (not merged):** ${report.activity.prMergeRate.closed}\n`;
    md += `- **Total PRs:** ${report.activity.prMergeRate.merged + report.activity.prMergeRate.closed}\n\n`;
    return md;
  }

  private generateIssueResolution(report: AnalyticsReport): string {
    let md = `### Issue Resolution\n\n`;

    if (report.activity.issueResolutionTime.averageHours > 0) {
      const avgDays = (report.activity.issueResolutionTime.averageHours / 24).toFixed(1);
      const medianDays = (report.activity.issueResolutionTime.medianHours / 24).toFixed(1);
      md += `- **Average Resolution Time:** ${avgDays} days (${report.activity.issueResolutionTime.averageHours.toFixed(0)} hours)\n`;
      md += `- **Median Resolution Time:** ${medianDays} days (${report.activity.issueResolutionTime.medianHours.toFixed(0)} hours)\n`;
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
      const indicator = index === 0 ? '#1' : index === 1 ? '#2' : index === 2 ? '#3' : '·';
      md += `${indicator} **${day.day}:** ${day.count} commits\n`;
    });

    return md;
  }
}
