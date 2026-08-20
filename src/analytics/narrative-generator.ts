import type { AnalyticsReport } from '../types/analytics.js';
import { logger } from '../utils/logger.js';

/**
 * Executive narrative with auto-generated insights
 */
export interface ExecutiveNarrative {
  summary: string;
  keyFindings: string[];
  paradoxes: Paradox[];
  rootCauses: RootCause[];
  actionPlan: ActionItem[];
  riskAssessment: string;
  projectedOutcome: string;
}

export interface Paradox {
  title: string;
  description: string;
  metrics: string[];
}

export interface RootCause {
  issue: string;
  hypothesis: string;
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ActionItem {
  priority: 1 | 2 | 3;
  action: string;
  rationale: string;
  expectedImpact: string;
  timeframe: string;
}

/**
 * Narrative generator that creates human-readable executive summaries
 */
export class NarrativeGenerator {
  /**
   * Generate executive narrative from analytics report
   */
  async generate(report: AnalyticsReport): Promise<ExecutiveNarrative> {
    logger.info('Generating executive narrative...');

    const paradoxes = this.detectParadoxes(report);
    const rootCauses = this.analyzeRootCauses(report, paradoxes);
    const actionPlan = this.prioritizeActions(report, rootCauses);
    const keyFindings = this.extractKeyFindings(report);
    const summary = this.generateSummary(report, keyFindings, paradoxes);
    const riskAssessment = this.assessRisk(report);
    const projectedOutcome = this.projectOutcome(report, actionPlan);

    return {
      summary,
      keyFindings,
      paradoxes,
      rootCauses,
      actionPlan,
      riskAssessment,
      projectedOutcome,
    };
  }

  /**
   * Detect paradoxes (conflicting or unexpected metric combinations)
   */
  private detectParadoxes(report: AnalyticsReport): Paradox[] {
    const paradoxes: Paradox[] = [];

    // Paradox 1: High review coverage but low merge rate
    const reviewCoverage = report.health.prReviewCoverage.coveragePercentage;
    const mergeRate = report.activity.prMergeRate.mergeRate;

    if (reviewCoverage >= 90 && mergeRate < 40) {
      // Only show this paradox if we have valid review time data
      const timeToReview = report.health.timeToFirstReview.averageHours;
      if (timeToReview > 0) {
        // Validate data exists
        paradoxes.push({
          title: 'The Review Culture Paradox',
          description: `${report.repository} exhibits excellent review culture (${reviewCoverage.toFixed(0)}% coverage) with fast review times (${timeToReview.toFixed(1)}h average), yet only ${mergeRate.toFixed(0)}% of PRs get merged—significantly below expectations. This suggests PRs are getting stuck *after* review, not during review.`,
          metrics: [
            `Review Coverage: ${reviewCoverage.toFixed(0)}%`,
            `Merge Rate: ${mergeRate.toFixed(0)}%`,
            `Time to First Review: ${timeToReview.toFixed(1)}h`,
          ],
        });
      }
    }

    // Paradox 2: Fast reviews but slow merges
    if (report.reviewVelocity) {
      const timeToFirstReview = report.reviewVelocity.timeToFirstReview.averageHours;
      const timeToApproval = report.reviewVelocity.timeToApproval.averageDays;

      if (timeToFirstReview < 6 && timeToApproval > 5) {
        paradoxes.push({
          title: 'The Approval Delay Paradox',
          description: `Reviews start quickly (${timeToFirstReview.toFixed(1)}h to first review) but take ${timeToApproval.toFixed(1)} days to reach approval. This suggests multiple review rounds or reviewer unavailability.`,
          metrics: [
            `Time to First Review: ${timeToFirstReview.toFixed(1)}h`,
            `Time to Approval: ${timeToApproval.toFixed(1)} days`,
          ],
        });
      }
    }

    // Paradox 3: Many contributors but low bus factor
    const contributorCount = report.contributors.topContributors.length;
    const busFactor = report.contributors.busFactor;

    if (contributorCount > 20 && busFactor < 3) {
      paradoxes.push({
        title: 'The Contribution Concentration Paradox',
        description: `Despite having ${contributorCount} contributors, the project's bus factor is only ${busFactor}. This indicates extreme concentration of work among a few individuals, creating high risk.`,
        metrics: [
          `Total Contributors: ${contributorCount}`,
          `Bus Factor: ${busFactor}`,
          `Top Contributor Share: ${report.contributors.contributionDistribution[0]?.percentage.toFixed(0)}%`,
        ],
      });
    }

    // Paradox 4: Growing backlog - creation velocity >> merge velocity
    if (report.trends && report.trends.hasPreviousData !== false) {
      const prMergeTrend = report.trends.trends.prMergeRate;
      const prCreationTrend = report.activity.prMergeRate.total;

      // Check if merge rate is declining significantly AND we have stalled PRs
      if (
        prMergeTrend.trend === 'declining' &&
        Math.abs(prMergeTrend.delta) > 15 &&
        (report.reviewVelocity?.reviewBottlenecks.length ?? 0) > 5
      ) {
        paradoxes.push({
          title: 'The Growing Backlog Paradox',
          description: `PR creation velocity is high (${prCreationTrend} PRs in analysis period) but merge rate is declining (${Math.abs(prMergeTrend.delta).toFixed(0)}% drop). This creates a growing backlog of ${report.reviewVelocity?.reviewBottlenecks.length || 0} stalled PRs, frustrating contributors.`,
          metrics: [
            `Merge Rate Trend: ${prMergeTrend.previous.toFixed(0)}% → ${prMergeTrend.current.toFixed(0)}% (${prMergeTrend.delta > 0 ? '+' : ''}${prMergeTrend.delta.toFixed(0)}%)`,
            `PRs in analysis period: ${prCreationTrend}`,
            `Stalled PRs (>3 days): ${report.reviewVelocity?.reviewBottlenecks.length || 0}`,
          ],
        });
      }
    }

    // Paradox 5: Trending worse despite high activity
    if (report.trends) {
      const decliningMetrics = Object.entries(report.trends.trends).filter(
        ([_, trend]) => trend.trend === 'declining'
      );

      if (decliningMetrics.length >= 3) {
        paradoxes.push({
          title: 'The Declining Velocity Paradox',
          description: `Multiple key metrics are declining simultaneously, suggesting systemic issues rather than isolated problems. ${decliningMetrics.length} out of 4 trend metrics show negative trajectory.`,
          metrics: decliningMetrics.map(
            ([name, trend]) =>
              `${name}: ${trend.previous.toFixed(1)} → ${trend.current.toFixed(1)} (${trend.delta > 0 ? '+' : ''}${trend.delta.toFixed(1)})`
          ),
        });
      }
    }

    return paradoxes;
  }

  /**
   * Analyze root causes from paradoxes and metrics
   */
  private analyzeRootCauses(report: AnalyticsReport, paradoxes: Paradox[]): RootCause[] {
    const rootCauses: RootCause[] = [];

    // Root cause 1: Abandoned PRs after review
    if (paradoxes.some((p) => p.title.includes('Review Culture Paradox'))) {
      const evidence: string[] = [];

      if (report.reviewVelocity && report.reviewVelocity.reviewBottlenecks.length > 0) {
        const changesRequested = report.reviewVelocity.reviewBottlenecks.filter(
          (b) => b.status === 'changes_requested'
        ).length;
        const approvedPending = report.reviewVelocity.reviewBottlenecks.filter(
          (b) => b.status === 'approved_pending_merge'
        ).length;

        if (changesRequested > 0) {
          evidence.push(`${changesRequested} PRs waiting on author to address review comments`);
        }
        if (approvedPending > 0) {
          evidence.push(
            `${approvedPending} approved PRs not yet merged (average wait: ${report.reviewVelocity.reviewBottlenecks.filter((b) => b.status === 'approved_pending_merge').reduce((sum, b) => sum + b.waitingDays, 0) / approvedPending || 0} days)`
          );
        }
      }

      evidence.push(
        `Merge rate (${report.activity.prMergeRate.mergeRate.toFixed(0)}%) significantly below review coverage (${report.health.prReviewCoverage.coveragePercentage.toFixed(0)}%)`
      );

      rootCauses.push({
        issue: 'PRs stalling after review',
        hypothesis:
          'Authors abandon PRs after receiving review feedback, or approved PRs wait too long for maintainer bandwidth to merge',
        evidence,
        confidence: 'high',
      });
    }

    // Root cause 2: Reviewer bottleneck
    if (report.reviewVelocity && report.reviewVelocity.reviewerLoadDistribution.length > 0) {
      const topReviewer = report.reviewVelocity.reviewerLoadDistribution[0];
      const totalReviews = report.reviewVelocity.reviewerLoadDistribution.reduce(
        (sum, r) => sum + r.reviewCount,
        0
      );
      const topReviewerShare = (topReviewer.reviewCount / totalReviews) * 100;

      if (topReviewerShare > 40) {
        rootCauses.push({
          issue: 'Reviewer load imbalance',
          hypothesis: `${topReviewer.reviewer} handles ${topReviewerShare.toFixed(0)}% of all reviews, creating a bottleneck`,
          evidence: [
            `${topReviewer.reviewer}: ${topReviewer.reviewCount} reviews (${topReviewerShare.toFixed(0)}% of total)`,
            `Average response time: ${topReviewer.averageResponseHours.toFixed(1)}h`,
            `${report.reviewVelocity.reviewerLoadDistribution.length} active reviewers (load distribution needed)`,
          ],
          confidence: 'high',
        });
      }
    }

    // Root cause 3: CI/CD or process bottleneck
    const deploymentFreq = report.health.deploymentFrequency.releases;
    if (deploymentFreq < 2 && report.activity.prMergeRate.merged > 10) {
      rootCauses.push({
        issue: 'Low deployment frequency despite active development',
        hypothesis:
          'Manual release process or CI/CD pipeline may be bottleneck preventing frequent deployments',
        evidence: [
          `${deploymentFreq} releases in analysis period`,
          `${report.activity.prMergeRate.merged} PRs merged but not released`,
          `Potential ${(report.activity.prMergeRate.merged / Math.max(deploymentFreq, 1)).toFixed(0)} PRs per release`,
        ],
        confidence: 'medium',
      });
    }

    // Root cause 4: Contributor retention issues
    if (
      report.trends &&
      report.trends.hasPreviousData !== false &&
      report.trends.trends.activeContributors.trend === 'declining'
    ) {
      rootCauses.push({
        issue: 'Declining contributor base',
        hypothesis:
          'Contributors may be leaving due to slow review times, difficult contribution process, or project direction concerns',
        evidence: [
          `Active contributors: ${report.trends.trends.activeContributors.previous} → ${report.trends.trends.activeContributors.current} (${report.trends.trends.activeContributors.delta})`,
          `New contributors: ${report.contributors.newVsReturning.new} vs Returning: ${report.contributors.newVsReturning.returning}`,
        ],
        confidence: 'medium',
      });
    }

    return rootCauses;
  }

  /**
   * Prioritize actions based on impact and urgency
   */
  private prioritizeActions(report: AnalyticsReport, rootCauses: RootCause[]): ActionItem[] {
    const actions: ActionItem[] = [];

    // Priority 1 (Critical/Urgent)
    if (report.contributors.busFactor < 2) {
      actions.push({
        priority: 1,
        action: 'Urgently expand core contributor base',
        rationale: `Bus factor of ${report.contributors.busFactor} creates critical project risk. If ${report.contributors.topContributors[0]?.login || 'top contributor'} becomes unavailable, project continuity is threatened.`,
        expectedImpact: 'Reduce project risk from critical to moderate',
        timeframe: 'Immediate (this week)',
      });
    }

    // Handle stalled PRs
    if (report.reviewVelocity && report.reviewVelocity.reviewBottlenecks.length > 5) {
      actions.push({
        priority: 1,
        action: `Audit and resolve ${report.reviewVelocity.reviewBottlenecks.length} stalled PRs`,
        rationale: `PRs waiting >3 days represent blocked work and frustrated contributors. Quick wins available by clearing backlog.`,
        expectedImpact: this.formatMergeImpact(
          report.reviewVelocity.reviewBottlenecks.length,
          report.health.prReviewCoverage.total
        ),
        timeframe: 'This week',
      });
    }

    // Priority 2 (Important/Medium-term)
    if (rootCauses.some((rc) => rc.issue.includes('Reviewer load imbalance'))) {
      const topReviewer = report.reviewVelocity?.reviewerLoadDistribution[0];
      actions.push({
        priority: 2,
        action: 'Implement reviewer load balancing',
        rationale: `${topReviewer?.reviewer || 'Top reviewer'} handles disproportionate review load. Distribute reviews among ${report.reviewVelocity?.reviewerLoadDistribution.length || 'multiple'} maintainers.`,
        expectedImpact: 'Reduce bottleneck, improve review speed by 30-40%',
        timeframe: '2-4 weeks',
      });
    }

    if (report.trends && report.trends.trends.prMergeRate.trend === 'declining') {
      actions.push({
        priority: 2,
        action: 'Implement auto-merge for approved PRs',
        rationale:
          'Merge rate declining while review coverage remains high. Automate the merge step for approved PRs passing CI.',
        expectedImpact: 'Increase merge rate by 15-20%',
        timeframe: '2 weeks',
      });
    }

    // Priority 3 (Nice-to-have/Long-term)
    if (report.activity.issueResolutionTime.averageHours / 24 > 14) {
      actions.push({
        priority: 3,
        action: 'Improve issue triage process',
        rationale: `Average issue resolution time is ${(report.activity.issueResolutionTime.averageHours / 24).toFixed(1)} days. Implement SLA-based triage with labels.`,
        expectedImpact: 'Reduce resolution time by 30-40%',
        timeframe: '1 month',
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Extract key findings
   */
  private extractKeyFindings(report: AnalyticsReport): string[] {
    const findings: string[] = [];

    // Trend findings (only when there is previous-period data to compare)
    if (report.trends && report.trends.hasPreviousData !== false) {
      const improving = Object.entries(report.trends.trends).filter(
        ([_, t]) => t.trend === 'improving'
      );
      const declining = Object.entries(report.trends.trends).filter(
        ([_, t]) => t.trend === 'declining'
      );

      // Count only the metrics that are actually shown in the trends table.
      // Time to Review is omitted from the table when there is no data, so
      // exclude it from the denominator to avoid "1 out of 4" when only 3 rows render.
      const shownMetrics = Object.entries(report.trends.trends).filter(([key, t]) => {
        if (key === 'timeToReview') {
          return t.current > 0 && isFinite(t.current);
        }
        return true;
      }).length;

      if (declining.length > improving.length) {
        findings.push(
          `📉 **Velocity declining**: ${declining.length} out of ${shownMetrics} key metrics show negative trends`
        );
      } else if (improving.length > declining.length) {
        findings.push(
          `📈 **Velocity improving**: ${improving.length} out of ${shownMetrics} key metrics show positive trends`
        );
      }
    }

    // Review velocity findings
    if (report.reviewVelocity) {
      const p90Hours = report.reviewVelocity.timeToFirstReview.p90Hours;
      // Only show review speed if we have valid data (p90 > 0)
      if (p90Hours > 0) {
        if (p90Hours > 24) {
          findings.push(`10% of PRs wait ${p90Hours.toFixed(0)}+ hours for first review (p90)`);
        } else if (p90Hours < 4) {
          findings.push(
            `Exceptional review speed: 90% of PRs reviewed within ${p90Hours.toFixed(1)}h`
          );
        } else {
          findings.push(`Average review speed: 90% of PRs reviewed within ${p90Hours.toFixed(1)}h`);
        }
      }
    }

    // Contribution findings
    const topContribPercentage = report.contributors.contributionDistribution[0]?.percentage || 0;
    if (topContribPercentage > 50) {
      findings.push(
        `⚠️  **Single contributor dominance**: ${report.contributors.topContributors[0]?.login || 'Top contributor'} accounts for ${topContribPercentage.toFixed(0)}% of contributions`
      );
    }

    return findings;
  }

  /**
   * Generate executive summary
   */
  private generateSummary(
    report: AnalyticsReport,
    findings: string[],
    paradoxes: Paradox[]
  ): string {
    const repoName = report.repository.split('/')[1] || report.repository;

    let summary = `### Executive Summary: ${repoName}\n\n`;

    if (paradoxes.length > 0) {
      const mainParadox = paradoxes[0];
      summary += `**${repoName} is experiencing ${mainParadox.title.toLowerCase()}.**\n\n`;
      summary += `${mainParadox.description}\n\n`;
    } else {
      const coverage = report.health.prReviewCoverage.coveragePercentage;
      const mergeRate = report.activity.prMergeRate.mergeRate;
      const busFactor = report.contributors.busFactor;

      if (coverage < 50 || mergeRate < 40 || busFactor < 3) {
        summary += `**${repoName} shows mixed health signals.** Review coverage is ${coverage.toFixed(0)}%, PR merge rate is ${mergeRate.toFixed(0)}%, and bus factor is ${busFactor}. These areas need attention to reduce project risk.\n\n`;
      } else {
        summary += `**${repoName} demonstrates healthy development practices** with ${coverage.toFixed(0)}% review coverage and ${mergeRate.toFixed(0)}% PR merge rate.\n\n`;
      }
    }

    summary += `## Key Observations\n\n`;
    findings.forEach((finding) => {
      summary += `- ${finding}\n`;
    });

    return summary;
  }

  /**
   * Format the expected merge-rate impact of clearing stalled PRs.
   * When the impact rounds to ~0%, describe it honestly instead of
   * presenting a "Critical" action with a null effect.
   */
  private formatMergeImpact(stalledCount: number, totalPRs: number): string {
    const pct = totalPRs > 0 ? (stalledCount / totalPRs) * 100 : 0;
    if (pct < 1) {
      return `Unblocks ${stalledCount} stalled PRs (${pct.toFixed(1)}% of all PRs) — small direct impact on merge rate, but reduces contributor frustration`;
    }
    return `Improve merge rate by ~${Math.round(pct)}%`;
  }

  /**
   * Assess project risk
   */
  private assessRisk(report: AnalyticsReport): string {
    const risks: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Bus factor risk
    if (report.contributors.busFactor < 2) {
      risks.push(`🔴 **Critical dependency risk**: Bus factor is ${report.contributors.busFactor}`);
      riskLevel = 'critical';
    } else if (report.contributors.busFactor < 3) {
      risks.push(
        `🟠 **High dependency risk**: Bus factor is only ${report.contributors.busFactor}`
      );
      if (riskLevel === 'low') riskLevel = 'high';
    }

    // Velocity risk (only meaningful when there is previous-period data)
    if (
      report.trends &&
      report.trends.hasPreviousData !== false &&
      report.trends.trends.prMergeRate.trend === 'declining'
    ) {
      const velocityDrop = Math.abs(report.trends.trends.prMergeRate.delta);
      if (velocityDrop > 20) {
        risks.push(`🟠 **Velocity collapse risk**: Merge rate dropped ${velocityDrop.toFixed(0)}%`);
        if (riskLevel !== 'critical') riskLevel = 'high';
      }
    }

    // Contributor retention risk
    if (report.trends && report.trends.trends.activeContributors.trend === 'declining') {
      risks.push(`🟡 **Contributor retention risk**: Active contributors declining`);
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    if (risks.length === 0) {
      return `**Risk Level: 🟢 Low**\n\nNo critical risks detected. Project appears healthy with good contribution patterns and review culture.`;
    }

    let assessment = `**Risk Level: ${riskLevel === 'critical' ? '🔴 Critical' : riskLevel === 'high' ? '🟠 High' : riskLevel === 'medium' ? '🟡 Medium' : '🟢 Low'}**\n\n`;
    risks.forEach((risk) => {
      assessment += `- ${risk}\n`;
    });

    return assessment;
  }

  /**
   * Project outcome if no action taken
   */
  private projectOutcome(report: AnalyticsReport, actionPlan: ActionItem[]): string {
    let projection = `## Projected Outcome\n\n`;

    if (actionPlan.some((a) => a.priority === 1)) {
      projection += `**If no action is taken:**\n\n`;

      // Only project merge rate decline if we have high confidence trends data AND projections are reliable
      const projectionReliable =
        report.projections &&
        report.projections.predictions.prsToMerge.confidence !== 'low' &&
        report.projections.predictions.openIssuesAtEndOfPeriod.confidence !== 'low';

      if (
        report.trends &&
        report.trends.trends.prMergeRate.trend === 'declining' &&
        projectionReliable
      ) {
        const currentRate = report.trends.trends.prMergeRate.current;
        const delta = report.trends.trends.prMergeRate.delta;

        // Only show this projection if delta is meaningful (>5%) to avoid contradicting low-confidence predictions
        if (Math.abs(delta) > 5) {
          const projectedRate = Math.max(0, currentRate + delta * 2); // Project 2 more periods
          projection += `- Merge rate will drop to ~${projectedRate.toFixed(0)}% within 60 days (from ${currentRate.toFixed(0)}%)\n`;
        }
      } else if (
        report.trends &&
        report.trends.trends.prMergeRate.trend === 'declining' &&
        !projectionReliable
      ) {
        // If trends show decline but projections unreliable, show cautious disclaimer
        projection += `- Merge rate is showing a declining trend, but projection confidence is low. Monitor closely.\n`;
      }

      if (report.contributors.busFactor < 2) {
        projection += `- Project continuity remains at critical risk\n`;
      }

      if (report.reviewVelocity && report.reviewVelocity.reviewBottlenecks.length > 5) {
        projection += `- Contributor frustration will increase, potentially leading to abandonment\n`;
      }

      projection += `\n**If priority actions are taken:**\n\n`;
      actionPlan.slice(0, 3).forEach((action) => {
        projection += `- ${action.expectedImpact}\n`;
      });
    } else {
      projection += `**Current trajectory:** Stable to improving. Continue monitoring key metrics and maintain current practices.\n`;
    }

    return projection;
  }

  /**
   * Generate full markdown narrative report
   */
  generateMarkdownReport(narrative: ExecutiveNarrative): string {
    let report = narrative.summary + '\n\n';

    if (narrative.paradoxes.length > 0) {
      report += `## 🔍 Detected Paradoxes\n\n`;
      narrative.paradoxes.forEach((paradox, i) => {
        report += `### ${i + 1}. ${paradox.title}\n\n`;
        report += `${paradox.description}\n\n`;
        report += `**Supporting Metrics:**\n`;
        paradox.metrics.forEach((metric) => {
          report += `- ${metric}\n`;
        });
        report += `\n`;
      });
    }

    if (narrative.rootCauses.length > 0) {
      report += `## 🎯 Root Cause Analysis\n\n`;
      narrative.rootCauses.forEach((cause, i) => {
        const confidenceIcon =
          cause.confidence === 'high' ? '🔴' : cause.confidence === 'medium' ? '🟡' : '🟢';
        report += `### ${i + 1}. ${cause.issue} (Confidence: ${confidenceIcon} ${cause.confidence})\n\n`;
        report += `**Hypothesis:** ${cause.hypothesis}\n\n`;
        report += `**Evidence:**\n`;
        cause.evidence.forEach((evidence) => {
          report += `- ${evidence}\n`;
        });
        report += `\n`;
      });
    }

    report += `## 🚀 Recommended Action Plan\n\n`;
    const priorityLabels = { 1: '🔴 Critical', 2: '🟡 Important', 3: '🟢 Nice-to-have' };
    narrative.actionPlan.forEach((action, i) => {
      report += `### ${i + 1}. ${action.action} (${priorityLabels[action.priority]})\n\n`;
      report += `- **Rationale:** ${action.rationale}\n`;
      report += `- **Expected Impact:** ${action.expectedImpact}\n`;
      report += `- **Timeframe:** ${action.timeframe}\n\n`;
    });

    report += `---\n\n`;
    report += narrative.riskAssessment + '\n\n';
    report += `---\n\n`;
    report += narrative.projectedOutcome + '\n';

    return report;
  }
}

/**
 * Helper function to generate narrative
 */
export async function generateNarrative(report: AnalyticsReport): Promise<ExecutiveNarrative> {
  const generator = new NarrativeGenerator();
  return await generator.generate(report);
}
