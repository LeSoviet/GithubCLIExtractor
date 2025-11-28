import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { safeMax, safeMultiplier, hasValidData } from './data-validator.js';
import { formatDecimal, formatHours } from '../../utils/format-helpers.js';

/**
 * Generates the Metric Correlations section of the markdown report
 * Shows PR size vs merge time and day-of-week impact analysis
 */
export class CorrelationsSectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    if (!report.correlations) {
      return '';
    }

    let md = `## 🔗 Correlation Insights\n\n`;
    const prSizeSection = this.generatePRSizeCorrelation(report);
    const dayOfWeekSection = this.generateDayOfWeekImpact(report);

    // Only include sections that have valid data
    if (prSizeSection) md += prSizeSection;
    if (dayOfWeekSection) md += dayOfWeekSection;

    // Return empty if no valid sections
    if (!prSizeSection && !dayOfWeekSection) {
      return '';
    }

    return md;
  }

  private generatePRSizeCorrelation(report: AnalyticsReport): string {
    if (!report.correlations || !hasValidData(report.correlations.prSizeVsTimeToMerge)) {
      return '';
    }

    const data = report.correlations.prSizeVsTimeToMerge;

    let md = `### PR Size vs Time to Merge\n\n`;

    // ASCII chart
    md += `\`\`\`\n`;
    md += `│ Days to\n`;
    md += `│ Merge\n`;

    const chartData = [
      { size: data.smallPRs.avgLines, time: data.smallPRs.avgDays, label: '<100 lines' },
      { size: data.mediumPRs.avgLines, time: data.mediumPRs.avgDays, label: '100-500 lines' },
      { size: data.largePRs.avgLines, time: data.largePRs.avgDays, label: '>500 lines' },
    ];

    const maxTime = safeMax(
      [data.smallPRs.avgDays, data.mediumPRs.avgDays, data.largePRs.avgDays],
      1
    );
    const chartHeight = 6;

    for (let i = chartHeight; i > 0; i--) {
      const threshold = (maxTime / chartHeight) * i;
      md += `│ ${String(Math.round(threshold)).padStart(2)}┤`;

      for (const d of chartData) {
        const normalizedTime = (d.time / maxTime) * chartHeight;
        if (normalizedTime >= i - 0.5) {
          md += '  •';
        } else {
          md += '   ';
        }
      }
      md += `\n`;
    }

    md += `│   └─────────────────────────\n`;
    md += `     ${String(Math.round(data.smallPRs.avgLines)).padStart(3)} ${String(Math.round(data.mediumPRs.avgLines)).padStart(3)} ${String(Math.round(data.largePRs.avgLines)).padStart(3)}\n`;
    md += `        (Lines Changed)\n`;
    md += `\`\`\`\n\n`;

    // Summary table
    md += `| PR Size | Avg Lines | Avg Days | Category |\n`;
    md += `|---------|-----------|----------|----------|\n`;
    md += `| Small | ${Math.round(data.smallPRs.avgLines)} | ${formatDecimal(data.smallPRs.avgDays)} | 📗 Optimal |\n`;
    md += `| Medium | ${Math.round(data.mediumPRs.avgLines)} | ${formatDecimal(data.mediumPRs.avgDays)} | 📙 Acceptable |\n`;
    md += `| Large | ${Math.round(data.largePRs.avgLines)} | ${formatDecimal(data.largePRs.avgDays)} | 📕 Slow |\n\n`;

    // Correlation interpretation with safe division
    const speedup = safeMultiplier(data.largePRs.avgDays, data.smallPRs.avgDays);
    md += ` **Finding:** ${speedup === 'Insufficient data' ? 'Insufficient data for comparison.' : `Large PRs take ${speedup} longer to merge than small PRs.`}\n`;
    md += ` **Recommendation:** Encourage smaller, focused PRs to reduce review and merge time.\n\n`;

    return md;
  }

  private generateDayOfWeekImpact(report: AnalyticsReport): string {
    if (
      !report.correlations ||
      report.correlations.dayOfWeekImpact.length === 0 ||
      !hasValidData(report.correlations.dayOfWeekImpact)
    ) {
      return '';
    }

    const dayData = report.correlations.dayOfWeekImpact;

    let md = `### Review Response Time vs Day of Week\n\n`;

    // Find slowest and fastest days
    const validDays = dayData.filter((d) => d.avgResponseHours > 0);
    if (validDays.length < 2) {
      return ''; // Need at least 2 different days to compare
    }

    const maxResponseTime = safeMax(
      validDays.map((d) => d.avgResponseHours),
      0
    );
    const minResponseTime = Math.min(...validDays.map((d) => d.avgResponseHours));

    if (maxResponseTime === 0 || minResponseTime === maxResponseTime) {
      return ''; // All days have same response time
    }

    md += `| Day | Avg Response | PRs Submitted | Impact |\n`;
    md += `|-----|--------------|---------------|--------|\n`;

    for (const day of dayData) {
      const isWorstDay =
        day.avgResponseHours === maxResponseTime && maxResponseTime > minResponseTime * 2;
      const isBestDay = day.avgResponseHours === minResponseTime;

      let impact = '';
      if (isWorstDay) {
        impact = ' Slowest';
      } else if (isBestDay) {
        impact = ' Fastest';
      }

      const hours = day.avgResponseHours < 1 ? '<1h' : `${formatHours(day.avgResponseHours)}`;
      md += `| ${day.day.padEnd(9)} | ${hours.padStart(12)} | ${String(day.prsSubmitted).padStart(13)} | ${impact} |\n`;
    }

    md += `\n`;

    // Find worst and best days
    const worstDay = validDays.reduce((prev, current) =>
      prev.avgResponseHours > current.avgResponseHours ? prev : current
    );
    const bestDay = validDays.reduce((prev, current) =>
      prev.avgResponseHours < current.avgResponseHours ? prev : current
    );

    // Only show insight if worst and best are different days
    if (worstDay.day === bestDay.day) {
      return md; // Return without insight
    }

    const slowdownFactor = safeMultiplier(worstDay.avgResponseHours, bestDay.avgResponseHours);

    md += ` **Insight:** ${slowdownFactor === 'Insufficient data' ? 'Insufficient data for comparison.' : `${worstDay.day} has ${slowdownFactor} slower response times than ${bestDay.day}.`}\n`;
    md += ` **Recommendation:** Adjust review scheduling and team availability for weekend/off-peak submissions.\n\n`;

    return md;
  }
}
