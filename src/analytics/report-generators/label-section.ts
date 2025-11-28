import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { formatPercentage, formatDecimal } from '../../utils/format-helpers.js';

/**
 * Generates the Label Analytics section of the markdown report
 */
export class LabelSectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    let md = `## Label Analytics\n\n`;
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
    md += `- **Average Time Open:** ${formatDecimal(report.labels.issueLifecycle.averageOpenDays)} days\n`;
    md += `- **Median Time Open:** ${formatDecimal(report.labels.issueLifecycle.medianOpenDays)} days\n`;
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

    // Filter out automatic/noise labels
    const automatedLabels = ['release-notes', 'github_actions', 'dependencies', 'auto'];
    const meaningfulLabels = report.labels.labelDistribution.filter(
      (l) => !automatedLabels.some((auto) => l.label.toLowerCase().includes(auto))
    );

    if (meaningfulLabels.length > 0) {
      md += `| Label | Count | Percentage |\n`;
      md += `|-------|-------|------------|\n`;

      for (const label of meaningfulLabels.slice(0, 10)) {
        md += `| ${label.label} | ${label.count} | ${formatPercentage(label.percentage)} |\n`;
      }
      md += `\n`;
    }

    // Show automated labels separately if they exist
    const autoLabels = report.labels.labelDistribution.filter((l) =>
      automatedLabels.some((auto) => l.label.toLowerCase().includes(auto))
    );

    if (autoLabels.length > 0) {
      const totalAuto = autoLabels.reduce((sum, l) => sum + l.count, 0);
      const totalAll = report.labels.labelDistribution.reduce((sum, l) => sum + l.count, 0);
      const autoPercentage = (totalAuto / totalAll) * 100;
      md += `*Note: ${formatPercentage(autoPercentage)} of labels are automated (${autoLabels.map((l) => l.label).join(', ')}) and excluded from analysis*\n\n`;
    }

    // Insights about labeling quality
    const unlabeledItems = report.labels.labelDistribution
      .filter(
        (l) => l.label.toLowerCase().includes('unname') || l.label.toLowerCase().includes('none')
      )
      .reduce((sum, l) => sum + l.count, 0);

    if (unlabeledItems > 0) {
      const totalItems = report.labels.labelDistribution.reduce((sum, l) => sum + l.count, 0);
      const unlabeledPercentage = (unlabeledItems / totalItems) * 100;
      md += `**Labeling Quality**: ${formatPercentage(unlabeledPercentage)} of items are unlabeled, which may impact project organization.\n\n`;
    }

    return md;
  }
}
