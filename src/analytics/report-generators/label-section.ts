import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';

/**
 * Generates the Label Analytics section of the markdown report
 */
export class LabelSectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    let md = `## 🏷️ Label Analytics\n\n`;
    md += this.generateIssueVsPRBalance(report);
    md += this.generateIssueLifecycle(report);
    md += this.generateMostCommonLabels(report);
    md += this.generateLabelDistribution(report);
    return md;
  }

  private generateIssueVsPRBalance(report: AnalyticsReport): string {
    let md = `### Issue/PR Balance\n\n`;
    if (report.labels.issueVsPrratio > 0) {
      md += `- **Ratio:** 1:${report.labels.issueVsPrratio.toFixed(2)} (${report.labels.issueVsPrratio > 1 ? 'More issues than PRs' : 'More PRs than issues'})\n`;
    } else {
      md += `- **Ratio:** No data available\n`;
    }
    return md;
  }

  private generateIssueLifecycle(report: AnalyticsReport): string {
    if (report.labels.issueLifecycle.averageOpenDays <= 0) {
      return '';
    }

    let md = `\n### Issue Lifecycle\n\n`;
    md += `- **Average Time Open:** ${report.labels.issueLifecycle.averageOpenDays.toFixed(1)} days\n`;
    md += `- **Median Time Open:** ${report.labels.issueLifecycle.medianOpenDays.toFixed(1)} days\n`;
    return md;
  }

  private generateMostCommonLabels(report: AnalyticsReport): string {
    if (report.labels.mostCommonLabels.length === 0) {
      return '';
    }

    let md = `\n### Most Common Labels\n\n`;
    md += `${report.labels.mostCommonLabels.map((label, i) => `${i + 1}. \`${label}\``).join('\n')}\n`;
    return md;
  }

  private generateLabelDistribution(report: AnalyticsReport): string {
    if (report.labels.labelDistribution.length === 0) {
      return '';
    }

    let md = `\n### Label Distribution\n\n`;
    md += `| Label | Count | Percentage |\n`;
    md += `|-------|-------|------------|\n`;

    for (const label of report.labels.labelDistribution.slice(0, 10)) {
      md += `| ${label.label} | ${label.count} | ${label.percentage.toFixed(1)}% |\n`;
    }
    md += `\n`;

    // Insights about labeling quality
    const unlabeledItems = report.labels.labelDistribution
      .filter(
        (l) => l.label.toLowerCase().includes('unname') || l.label.toLowerCase().includes('none')
      )
      .reduce((sum, l) => sum + l.count, 0);

    if (unlabeledItems > 0) {
      const totalItems = report.labels.labelDistribution.reduce((sum, l) => sum + l.count, 0);
      const unlabeledPercentage = (unlabeledItems / totalItems) * 100;
      md += `**Labeling Quality**: ${unlabeledPercentage.toFixed(1)}% of items are unlabeled, which may impact project organization.\n\n`;
    }

    return md;
  }
}
