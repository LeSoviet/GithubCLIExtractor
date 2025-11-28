import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { hasValidData, safeMax } from './data-validator.js';
import { ChartGenerator } from '../../utils/chart-generator.js';

/**
 * Generates the Predictions and Projections section of the markdown report
 * Shows 30-day forecasts and backlog burndown projections
 */
export class PredictionsSectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    if (!report.projections || !hasValidData(report.projections.predictions)) {
      return '';
    }

    let md = `## 🔮 Projections (Next 30 Days)\n\n`;
    md += `Based on current velocity and historical patterns:\n\n`;
    md += this.generatePredictionsTable(report);
    md += this.generateBacklogBurndownChart(report);
    return md;
  }

  private generatePredictionsTable(report: AnalyticsReport): string {
    if (!report.projections) return '';

    const pred = report.projections.predictions;

    // Only show if predictions have confidence > 'low'
    const hasHighConfidence =
      pred.prsToMerge.confidence !== 'low' || pred.openIssuesAtEndOfPeriod.confidence !== 'low';

    if (!hasHighConfidence) {
      return `⚠️ **Insufficient data for reliable projections.** Historical patterns are limited.\n\n`;
    }

    let md = `| Metric | Min | Max | Confidence |\n`;
    md += `|--------|-----|-----|------------|\n`;

    // PRs to be merged
    const prConfidenceEmoji = this.getConfidenceEmoji(pred.prsToMerge.confidence);
    md += `| PRs to be merged | ${pred.prsToMerge.min} | ${pred.prsToMerge.max} | ${prConfidenceEmoji} ${this.capitalizeConfidence(pred.prsToMerge.confidence)} |\n`;

    // Open issues at end of period
    const issueConfidenceEmoji = this.getConfidenceEmoji(pred.openIssuesAtEndOfPeriod.confidence);
    md += `| Open issues (end of period) | ${pred.openIssuesAtEndOfPeriod.min} | ${pred.openIssuesAtEndOfPeriod.max} | ${issueConfidenceEmoji} ${this.capitalizeConfidence(pred.openIssuesAtEndOfPeriod.confidence)} |\n`;

    // Release probability - only show if meaningful
    if (pred.releasesProbability > 20) {
      const releaseProbability = pred.releasesProbability;
      const releaseConfidenceEmoji =
        releaseProbability > 70 ? '🟢' : releaseProbability > 40 ? '🟡' : '🔴';
      md += `| Probability of release | ${releaseProbability}% | — | ${releaseConfidenceEmoji} ${releaseProbability > 70 ? 'Likely' : releaseProbability > 40 ? 'Possible' : 'Unlikely'} |\n`;
    }

    md += `\n`;
    return md;
  }

  private generateBacklogBurndownChart(report: AnalyticsReport): string {
    if (!report.projections || report.projections.backlogBurndown.length === 0) {
      return '';
    }

    const burndown = report.projections.backlogBurndown;
    const maxIssues = safeMax(
      burndown.map((b) => b.projectedOpenIssues),
      10
    );

    // Skip chart if max is too low (insufficient data)
    if (maxIssues <= 1) {
      return '';
    }

    const weeks = burndown.map((_, i) => (i === 0 ? 'Now' : `+${i}w`));
    const projectedIssues = burndown.map((b) => b.projectedOpenIssues);
    const idealIssues = burndown.map((b) => b.idealOpenIssues);

    let md = `### Backlog Burndown Projection\n\n`;

    // Generate Chart.js visualization
    md += ChartGenerator.generateBurndownChart(weeks, projectedIssues, idealIssues, maxIssues);
    md += `\n`;

    // Analysis - only if we have meaningful data
    const currentProjected = burndown[0]?.projectedOpenIssues || 0;
    const finalProjected = burndown[burndown.length - 1]?.projectedOpenIssues || 0;

    if (currentProjected === 0) {
      return md; // No projected data
    }

    const change = finalProjected - currentProjected;
    const percentChange = (change / currentProjected) * 100;

    if (Math.abs(percentChange) < 5) {
      md += `→ **Backlog is projected to remain stable** (±${Math.abs(percentChange).toFixed(0)}%).\n\n`;
    } else if (percentChange > 5) {
      md += `⚠️ **At current velocity, backlog will grow ${percentChange.toFixed(0)}% by end of period.**\n`;
      md += `💡 **Recommendation:** Increase team capacity or reduce issue intake.\n\n`;
    } else {
      md += `✅ **Backlog is on track to decrease by ${Math.abs(percentChange).toFixed(0)}% by end of period.**\n\n`;
    }

    return md;
  }

  private getConfidenceEmoji(confidence: 'high' | 'medium' | 'low'): string {
    switch (confidence) {
      case 'high':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔴';
    }
  }

  private capitalizeConfidence(confidence: 'high' | 'medium' | 'low'): string {
    return confidence.charAt(0).toUpperCase() + confidence.slice(1);
  }
}
