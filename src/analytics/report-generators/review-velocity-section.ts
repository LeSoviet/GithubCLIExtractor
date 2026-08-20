import type { AnalyticsReport } from '../../types/analytics.js';
import type { SectionGenerator } from './types.js';
import { formatHours, formatDays } from '../../utils/format-helpers.js';

/**
 * Generates the Review Velocity section of the markdown report
 * Shows real review metrics: time to first review, time to approval, reviewer load
 */
export class ReviewVelocitySectionGenerator implements SectionGenerator {
  generate(report: AnalyticsReport): string {
    if (!report.reviewVelocity) {
      return '';
    }

    const rv = report.reviewVelocity;
    const hasReviewTiming =
      rv.timeToFirstReview.averageHours > 0 || rv.timeToApproval.averageDays > 0;
    const hasReviewerLoad = rv.reviewerLoadDistribution.length > 0;

    if (!hasReviewTiming && !hasReviewerLoad) {
      return '';
    }

    let md = `## Review Velocity\n\n`;
    md += this.generateReviewTiming(report);
    md += this.generateReviewerLoad(report);
    md += `---\n\n`;
    return md;
  }

  private generateReviewTiming(report: AnalyticsReport): string {
    const rv = report.reviewVelocity!;
    const hasFirstReview = rv.timeToFirstReview.averageHours > 0;
    const hasApproval = rv.timeToApproval.averageDays > 0;

    if (!hasFirstReview && !hasApproval) {
      return '';
    }

    let md = `### Review Timing\n\n`;

    if (hasFirstReview) {
      md += `- **Time to First Review (avg):** ${formatHours(rv.timeToFirstReview.averageHours)}\n`;
      md += `- **Time to First Review (median):** ${formatHours(rv.timeToFirstReview.medianHours)}\n`;
      if (rv.timeToFirstReview.p90Hours > 0) {
        md += `- **Time to First Review (p90):** ${formatHours(rv.timeToFirstReview.p90Hours)}\n`;
      }
    }

    if (hasApproval) {
      md += `- **Time to Approval (avg):** ${formatDays(rv.timeToApproval.averageDays)}\n`;
      md += `- **Time to Approval (median):** ${formatDays(rv.timeToApproval.medianDays)}\n`;
    }

    md += `\n`;
    return md;
  }

  private generateReviewerLoad(report: AnalyticsReport): string {
    const rv = report.reviewVelocity!;
    if (rv.reviewerLoadDistribution.length === 0) {
      return '';
    }

    const totalReviews = rv.reviewerLoadDistribution.reduce(
      (sum, r) => sum + r.reviewCount,
      0
    );

    let md = `### Reviewer Load Distribution\n\n`;
    md += `| Reviewer | Reviews | Share | Avg Response |\n`;
    md += `|----------|---------|-------|--------------|\n`;

    for (const reviewer of rv.reviewerLoadDistribution.slice(0, 10)) {
      const share = totalReviews > 0 ? (reviewer.reviewCount / totalReviews) * 100 : 0;
      const response =
        reviewer.averageResponseHours > 0
          ? formatHours(reviewer.averageResponseHours)
          : 'N/A';
      md += `| @${reviewer.reviewer} | ${reviewer.reviewCount} | ${share.toFixed(1)}% | ${response} |\n`;
    }

    md += `\n`;

    // Concentration insight
    if (rv.reviewerLoadDistribution.length > 0) {
      const topReviewer = rv.reviewerLoadDistribution[0];
      const topShare = totalReviews > 0 ? (topReviewer.reviewCount / totalReviews) * 100 : 0;
      if (topShare > 40) {
        md += `**Concentration:** @${topReviewer.reviewer} handles ${topShare.toFixed(0)}% of all reviews, which may create a review bottleneck.\n\n`;
      }
    }

    return md;
  }
}
