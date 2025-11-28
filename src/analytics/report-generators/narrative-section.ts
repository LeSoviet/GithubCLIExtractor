import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import type { ExecutiveNarrative } from '../narrative-generator.js';

/**
 * Generates the Executive Narrative section of the markdown report
 * Integrates paradoxes, root causes, and action items into a compelling story
 */
export class NarrativeSectionGenerator implements SectionGenerator {
  generate(_report: AnalyticsReport, narrative?: ExecutiveNarrative): string {
    if (!narrative) {
      return '';
    }

    let md = `## 📖 Executive Narrative\n\n`;
    md += `### The Story This Data Tells\n\n`;
    md += this.generateSummary(narrative);
    md += this.generateParadoxes(narrative);
    md += this.generateRootCauses(narrative);
    md += this.generateActionPlan(narrative);
    md += this.generateOutcome(narrative);
    return md;
  }

  private generateSummary(narrative: ExecutiveNarrative): string {
    return `${narrative.summary}\n\n`;
  }

  private generateParadoxes(narrative: ExecutiveNarrative): string {
    if (narrative.paradoxes.length === 0) {
      return '';
    }

    let md = `### Paradoxes\n\n`;

    for (const paradox of narrative.paradoxes) {
      md += `**${paradox.title}**\n\n`;
      md += `${paradox.description}\n\n`;

      md += `**Relevant Metrics:**\n`;
      for (const metric of paradox.metrics) {
        md += `- ${metric}\n`;
      }
      md += `\n`;
    }

    return md;
  }

  private generateRootCauses(narrative: ExecutiveNarrative): string {
    if (narrative.rootCauses.length === 0) {
      return '';
    }

    let md = `### Root Cause Analysis\n\n`;

    for (const cause of narrative.rootCauses) {
      const confidenceEmoji = this.getConfidenceEmoji(cause.confidence);
      md += `**${cause.issue}** ${confidenceEmoji}\n\n`;
      md += `*Hypothesis:* ${cause.hypothesis}\n\n`;

      md += `**Supporting Evidence:**\n`;
      for (const evidence of cause.evidence) {
        md += `- ${evidence}\n`;
      }
      md += `\n`;
    }

    return md;
  }

  private generateActionPlan(narrative: ExecutiveNarrative): string {
    if (narrative.actionPlan.length === 0) {
      return '';
    }

    let md = `### Recommended Actions (Priority Order)\n\n`;

    const priorityLabels: Record<1 | 2 | 3, string> = {
      1: '🥇 Critical',
      2: '🥈 Important',
      3: '🥉 Enhance',
    };

    const grouped = narrative.actionPlan.reduce(
      (acc, item) => {
        if (!acc[item.priority]) acc[item.priority] = [];
        acc[item.priority].push(item);
        return acc;
      },
      {} as Record<1 | 2 | 3, typeof narrative.actionPlan>
    );

    for (const priority of [1, 2, 3] as const) {
      if (!grouped[priority] || grouped[priority].length === 0) continue;

      md += `#### ${priorityLabels[priority]}\n\n`;

      for (const action of grouped[priority]) {
        md += `**${action.action}**\n`;
        md += `- **Rationale:** ${action.rationale}\n`;
        md += `- **Expected Impact:** ${action.expectedImpact}\n`;
        md += `- **Timeframe:** ${action.timeframe}\n\n`;
      }
    }

    return md;
  }

  private generateOutcome(narrative: ExecutiveNarrative): string {
    let md = `### Projected Outcome\n\n`;
    md += `${narrative.projectedOutcome}\n\n`;

    md += `### Risk Assessment\n\n`;
    md += `${narrative.riskAssessment}\n\n`;

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
}
