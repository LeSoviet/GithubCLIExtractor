import { l as logger, a as execGhJson, b as ensureDirectory } from "../index.js";
import { readdir, readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import "fs";
import { marked } from "marked";
import puppeteer from "puppeteer";
import "electron";
import "url";
import "child_process";
import "util";
import "bottleneck";
import "chalk";
import "date-fns";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
class MarkdownParser {
  exportPath;
  constructor(exportPath) {
    this.exportPath = exportPath;
  }
  /**
   * Parse all Pull Request markdown files
   */
  async parsePullRequests() {
    try {
      const prDir = join(this.exportPath, "Pull Requests");
      logger.debug(`Looking for PRs in: ${prDir}`);
      const files = await readdir(prDir);
      const prFiles = files.filter((f) => f.startsWith("PR-") && f.endsWith(".md"));
      logger.debug(`Found ${prFiles.length} PR files`);
      const prs = [];
      let successCount = 0;
      let failCount = 0;
      for (const file of prFiles) {
        try {
          const content = await readFile(join(prDir, file), "utf-8");
          const pr = this.parsePullRequest(content);
          if (pr) {
            prs.push(pr);
            successCount++;
          } else {
            failCount++;
            logger.debug(`Failed to parse PR file (returned null): ${file}`);
          }
        } catch (error) {
          failCount++;
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          logger.debug(`Failed to parse PR file (exception): ${file} - ${errorMsg}`);
        }
      }
      logger.debug(`Successfully parsed ${successCount} PRs, failed ${failCount}`);
      return prs;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.debug(`No Pull Requests directory found: ${errorMsg}`);
      return [];
    }
  }
  /**
   * Parse a single Pull Request markdown file
   */
  parsePullRequest(content) {
    try {
      const titleMatch = content.match(/^# Pull Request #(\d+):\s*(.+?)\s*$/m);
      if (!titleMatch) {
        logger.debug("Failed to extract PR number and title from header");
        return null;
      }
      const number = parseInt(titleMatch[1]);
      const title = titleMatch[2].trim();
      const metadataMatch = content.match(/## Metadata\s*([\s\S]*?)\s*(?:##|$)/);
      if (!metadataMatch) {
        logger.debug("Failed to find Metadata section");
        return null;
      }
      const metadata = metadataMatch[1];
      const author = this.extractField(metadata, "Author");
      const state = this.extractField(metadata, "State");
      const createdAt = this.extractField(metadata, "Created");
      const closedAt = this.extractField(metadata, "Closed");
      const mergedAt = this.extractField(metadata, "Merged");
      const labels = this.extractLabels(metadata);
      if (!author || !state || !createdAt) {
        logger.debug(
          `Missing required fields: author='${author}', state='${state}', created='${createdAt}'`
        );
        return null;
      }
      return {
        number,
        state,
        author,
        createdAt,
        closedAt: closedAt || void 0,
        mergedAt: mergedAt || void 0,
        labels,
        title
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.debug(`Exception parsing PR: ${errorMsg}`);
      return null;
    }
  }
  /**
   * Parse all Issue markdown files
   */
  async parseIssues() {
    try {
      const issueDir = join(this.exportPath, "Issues");
      const files = await readdir(issueDir);
      const issueFiles = files.filter((f) => f.startsWith("ISSUE-") && f.endsWith(".md"));
      const issues = [];
      for (const file of issueFiles) {
        try {
          const content = await readFile(join(issueDir, file), "utf-8");
          const issue = this.parseIssue(content);
          if (issue) {
            issues.push(issue);
          }
        } catch (error) {
          logger.debug(`Failed to parse Issue file: ${file}`);
        }
      }
      return issues;
    } catch (error) {
      logger.debug("No Issues directory found");
      return [];
    }
  }
  /**
   * Parse a single Issue markdown file
   */
  parseIssue(content) {
    try {
      const titleMatch = content.match(/^# Issue #(\d+):\s*(.+?)\s*$/m);
      if (!titleMatch) {
        logger.debug("Failed to extract Issue number and title from header");
        return null;
      }
      const number = parseInt(titleMatch[1]);
      const title = titleMatch[2].trim();
      const metadataMatch = content.match(/## Metadata\s*([\s\S]*?)\s*(?:##|$)/);
      if (!metadataMatch) {
        logger.debug("Failed to find Metadata section");
        return null;
      }
      const metadata = metadataMatch[1];
      const author = this.extractField(metadata, "Author");
      const state = this.extractField(metadata, "State");
      const createdAt = this.extractField(metadata, "Created");
      const closedAt = this.extractField(metadata, "Closed");
      const labels = this.extractLabels(metadata);
      if (!author || !state || !createdAt) {
        logger.debug(
          `Missing required fields: author=${author}, state=${state}, created=${createdAt}`
        );
        return null;
      }
      return {
        number,
        state,
        author,
        createdAt,
        closedAt: closedAt || void 0,
        labels,
        title
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.debug(`Exception parsing Issue: ${errorMsg}`);
      return null;
    }
  }
  /**
   * Parse all Release markdown files
   */
  async parseReleases() {
    try {
      const releaseDir = join(this.exportPath, "Releases");
      const files = await readdir(releaseDir);
      const releaseFiles = files.filter((f) => f.startsWith("RELEASE-") && f.endsWith(".md"));
      const releases = [];
      for (const file of releaseFiles) {
        try {
          const content = await readFile(join(releaseDir, file), "utf-8");
          const release = this.parseRelease(content);
          if (release) {
            releases.push(release);
          }
        } catch (error) {
          logger.debug(`Failed to parse Release file: ${file}`);
        }
      }
      return releases;
    } catch (error) {
      logger.debug("No Releases directory found");
      return [];
    }
  }
  /**
   * Parse a single Release markdown file
   */
  parseRelease(content) {
    try {
      const metadataMatch = content.match(/## Metadata\s*([\s\S]*?)\s*(?:##|$)/);
      if (!metadataMatch) return null;
      const metadata = metadataMatch[1];
      const tagName = this.extractField(metadata, "Tag");
      const createdAt = this.extractField(metadata, "Created");
      const publishedAt = this.extractField(metadata, "Published");
      if (!tagName || !createdAt) {
        return null;
      }
      return {
        tagName,
        createdAt,
        publishedAt: publishedAt || void 0
      };
    } catch (error) {
      return null;
    }
  }
  /**
   * Extract a text field from metadata
   */
  extractField(metadata, field) {
    const match = metadata.match(new RegExp(`- \\*\\*${field}:\\*\\*\\s*(.*)`, "i"));
    if (!match) return "";
    const value = match[1].trim();
    return value.replace(/`/g, "").replace(/\*/g, "");
  }
  /**
   * Extract labels from metadata
   */
  extractLabels(metadata) {
    const match = metadata.match(/- \*\*Labels:\*\*\s*(.+)/i);
    if (!match || match[1].includes("None")) return [];
    const labelsStr = match[1];
    const labels = labelsStr.match(/`([^`]+)`/g);
    return labels ? labels.map((l) => l.replace(/`/g, "")) : [];
  }
}
class ActivitySectionGenerator {
  generate(report) {
    let md = `## 📈 Activity Analytics

`;
    md += `**Analysis Period:** ${new Date(report.activity.period.start).toLocaleDateString()} to ${new Date(report.activity.period.end).toLocaleDateString()}

`;
    md += this.generatePRMetrics(report);
    md += this.generateIssueResolution(report);
    md += this.generateActivityHotspots(report);
    md += `---

`;
    return md;
  }
  generatePRMetrics(report) {
    let md = `### Pull Request Metrics

`;
    md += `- **Merge Rate:** ${report.activity.prMergeRate.mergeRate.toFixed(1)}%
`;
    md += `- **Merged PRs:** ${report.activity.prMergeRate.merged}
`;
    md += `- **Closed (not merged):** ${report.activity.prMergeRate.closed}
`;
    md += `- **Total PRs:** ${report.activity.prMergeRate.merged + report.activity.prMergeRate.closed}

`;
    return md;
  }
  generateIssueResolution(report) {
    let md = `### Issue Resolution

`;
    if (report.activity.issueResolutionTime.averageHours > 0) {
      const avgDays = (report.activity.issueResolutionTime.averageHours / 24).toFixed(1);
      const medianDays = (report.activity.issueResolutionTime.medianHours / 24).toFixed(1);
      md += `- **Average Resolution Time:** ${avgDays} days (${report.activity.issueResolutionTime.averageHours.toFixed(0)} hours)
`;
      md += `- **Median Resolution Time:** ${medianDays} days (${report.activity.issueResolutionTime.medianHours.toFixed(0)} hours)
`;
    } else {
      md += `- **Resolution Time:** No closed issues found in analysis period
`;
    }
    return md;
  }
  generateActivityHotspots(report) {
    if (report.activity.busiestDays.length === 0) {
      return "";
    }
    let md = `
### Activity Hotspots

`;
    md += `**Most Active Days:**

`;
    report.activity.busiestDays.slice(0, 5).forEach((day, index) => {
      const indicator = index === 0 ? "#1" : index === 1 ? "#2" : index === 2 ? "#3" : "·";
      md += `${indicator} **${day.day}:** ${day.count} commits
`;
    });
    return md;
  }
}
const statusHelpers = {
  /**
   * Get health status with emoji and text based on value and thresholds
   */
  getHealthStatus(value, minGood, minExcellent) {
    if (value >= minExcellent) return "🟢 Excellent";
    if (value >= minGood) return "🟡 Fair";
    return "🔴 Needs Improvement";
  },
  /**
   * Get status for contributor count
   */
  getContributorStatus(count) {
    if (count >= 10) return "🟢 Healthy";
    if (count >= 5) return "🟡 Moderate";
    return "🔴 Limited";
  },
  /**
   * Get status for bus factor (number of critical contributors)
   */
  getBusFactorStatus(factor) {
    if (factor >= 5) return "🟢 Low Risk";
    if (factor >= 3) return "🟡 Medium Risk";
    return "🔴 High Risk";
  },
  /**
   * Get status for deployment frequency
   */
  getDeploymentStatus(releases) {
    if (releases >= 20) return "🟢 Very Active";
    if (releases >= 10) return "🟡 Active";
    if (releases >= 5) return "🟠 Moderate";
    return "🔴 Low Activity";
  }
};
class ContributorSectionGenerator {
  generate(report) {
    let md = `## 👥 Contributor Analytics

`;
    md += this.generateTeamHealth(report);
    md += this.generateTopContributors(report);
    return md;
  }
  generateTeamHealth(report) {
    let md = `### Team Health

`;
    md += `- **Bus Factor:** ${report.contributors.busFactor} ${statusHelpers.getBusFactorStatus(report.contributors.busFactor)}
`;
    md += `  - *Indicates project risk if key contributors become unavailable*
`;
    md += `- **Active Contributors:** ${report.activity.activeContributors[0]?.contributors || 0} (last 90 days)
`;
    md += `- **Contributor Mix:** ${report.contributors.newVsReturning.new} new, ${report.contributors.newVsReturning.returning} returning

`;
    return md;
  }
  generateTopContributors(report) {
    if (report.contributors.topContributors.length === 0) {
      return "";
    }
    let md = `### Top Contributors

`;
    const hasCommits = report.contributors.topContributors.some((c) => c.commits > 0);
    const hasPRs = report.contributors.topContributors.some((c) => c.prs > 0);
    const hasReviews = report.contributors.topContributors.some((c) => c.reviews > 0);
    let tableHeader = `| Contributor `;
    let tableDivider = `|-------------`;
    if (hasCommits) {
      tableHeader += `| Commits `;
      tableDivider += `|---------`;
    }
    if (hasPRs) {
      tableHeader += `| PRs `;
      tableDivider += `|-----`;
    }
    if (hasReviews) {
      tableHeader += `| Reviews `;
      tableDivider += `|--------`;
    }
    tableHeader += `| Total Contributions |
`;
    tableDivider += `|-------------------|
`;
    md += tableHeader;
    md += tableDivider;
    for (const contributor of report.contributors.topContributors.slice(0, 10)) {
      let row = `| ${contributor.login} `;
      if (hasCommits) {
        row += `| ${contributor.commits} `;
      }
      if (hasPRs) {
        row += `| ${contributor.prs} `;
      }
      if (hasReviews) {
        row += `| ${contributor.reviews} `;
      }
      row += `| ${contributor.totalContributions} |
`;
      md += row;
    }
    md += `
`;
    if (report.contributors.contributionDistribution.length > 0) {
      const topContributorPercentage = report.contributors.contributionDistribution[0]?.percentage || 0;
      md += `**Concentration of Contributions**: The top contributor accounts for ${topContributorPercentage.toFixed(1)}% of all contributions.

`;
    }
    return md;
  }
}
class LabelSectionGenerator {
  generate(report) {
    let md = `## 🏷️ Label Analytics

`;
    md += this.generateIssueVsPRBalance(report);
    md += this.generateIssueLifecycle(report);
    md += this.generateMostCommonLabels(report);
    md += this.generateLabelDistribution(report);
    return md;
  }
  generateIssueVsPRBalance(report) {
    let md = `### Issue/PR Balance

`;
    if (report.labels.issueVsPrratio > 0) {
      md += `- **Ratio:** 1:${report.labels.issueVsPrratio.toFixed(2)} (${report.labels.issueVsPrratio > 1 ? "More issues than PRs" : "More PRs than issues"})
`;
    } else {
      md += `- **Ratio:** No data available
`;
    }
    return md;
  }
  generateIssueLifecycle(report) {
    if (report.labels.issueLifecycle.averageOpenDays <= 0) {
      return "";
    }
    let md = `
### Issue Lifecycle

`;
    md += `- **Average Time Open:** ${report.labels.issueLifecycle.averageOpenDays.toFixed(1)} days
`;
    md += `- **Median Time Open:** ${report.labels.issueLifecycle.medianOpenDays.toFixed(1)} days
`;
    return md;
  }
  generateMostCommonLabels(report) {
    if (report.labels.mostCommonLabels.length === 0) {
      return "";
    }
    let md = `
### Most Common Labels

`;
    md += `${report.labels.mostCommonLabels.map((label, i) => `${i + 1}. \`${label}\``).join("\n")}
`;
    return md;
  }
  generateLabelDistribution(report) {
    if (report.labels.labelDistribution.length === 0) {
      return "";
    }
    let md = `
### Label Distribution

`;
    const automatedLabels = ["release-notes", "github_actions", "dependencies", "auto"];
    const meaningfulLabels = report.labels.labelDistribution.filter(
      (l) => !automatedLabels.some((auto) => l.label.toLowerCase().includes(auto))
    );
    if (meaningfulLabels.length > 0) {
      md += `| Label | Count | Percentage |
`;
      md += `|-------|-------|------------|
`;
      for (const label of meaningfulLabels.slice(0, 10)) {
        md += `| ${label.label} | ${label.count} | ${label.percentage.toFixed(1)}% |
`;
      }
      md += `
`;
    }
    const autoLabels = report.labels.labelDistribution.filter(
      (l) => automatedLabels.some((auto) => l.label.toLowerCase().includes(auto))
    );
    if (autoLabels.length > 0) {
      const totalAuto = autoLabels.reduce((sum, l) => sum + l.count, 0);
      const totalAll = report.labels.labelDistribution.reduce((sum, l) => sum + l.count, 0);
      const autoPercentage = totalAuto / totalAll * 100;
      md += `*Note: ${autoPercentage.toFixed(1)}% of labels are automated (${autoLabels.map((l) => l.label).join(", ")}) and excluded from analysis*

`;
    }
    const unlabeledItems = report.labels.labelDistribution.filter(
      (l) => l.label.toLowerCase().includes("unname") || l.label.toLowerCase().includes("none")
    ).reduce((sum, l) => sum + l.count, 0);
    if (unlabeledItems > 0) {
      const totalItems = report.labels.labelDistribution.reduce((sum, l) => sum + l.count, 0);
      const unlabeledPercentage = unlabeledItems / totalItems * 100;
      md += `**Labeling Quality**: ${unlabeledPercentage.toFixed(1)}% of items are unlabeled, which may impact project organization.

`;
    }
    return md;
  }
}
class HealthSectionGenerator {
  generate(report) {
    let md = `---

`;
    md += `## 💊 Code Health Metrics

`;
    md += this.generateReviewProcess(report);
    md += this.generatePRSizeAnalysis(report);
    md += this.generateDeploymentActivity(report);
    return md;
  }
  generateReviewProcess(report) {
    let md = `### Review Process

`;
    md += `- **Review Coverage:** ${report.health.prReviewCoverage.coveragePercentage.toFixed(1)}% ${statusHelpers.getHealthStatus(report.health.prReviewCoverage.coveragePercentage, 50, 70)}
`;
    md += `- **Reviewed PRs:** ${report.health.prReviewCoverage.reviewed} / ${report.health.prReviewCoverage.total}

`;
    return md;
  }
  generatePRSizeAnalysis(report) {
    let md = `### PR Size Analysis

`;
    if (report.health.averagePrSize.total > 0) {
      md += `- **Average Changes:** ${report.health.averagePrSize.total} lines per PR
`;
      md += `  - **Additions:** +${report.health.averagePrSize.additions} lines
`;
      md += `  - **Deletions:** -${report.health.averagePrSize.deletions} lines

`;
      if (report.health.averagePrSize.total > 500) {
        md += `> ⚠️ **Note:** Average PR size is large (>500 lines). Consider breaking down changes into smaller PRs for easier review.

`;
      } else if (report.health.averagePrSize.total < 100) {
        md += `> ✅ **Good Practice:** Small PR sizes facilitate faster reviews and reduce merge conflicts.

`;
      }
    } else {
      md += `- **Average PR Size:** No data available (PRs contain no diff metadata)

`;
    }
    return md;
  }
  generateDeploymentActivity(report) {
    let md = `### Deployment Activity

`;
    md += `- **Total Releases:** ${report.health.deploymentFrequency.releases} ${statusHelpers.getDeploymentStatus(report.health.deploymentFrequency.releases)}
`;
    return md;
  }
}
class RecommendationsGenerator {
  generate(report) {
    let md = `
---

`;
    md += `## 💡 Insights & Recommendations

`;
    const recommendations = [];
    recommendations.push(...this.generatePRMergeRateInsights(report));
    recommendations.push(...this.generateReviewCoverageInsights(report));
    recommendations.push(...this.generateBusFactorInsights(report));
    recommendations.push(...this.generateContributionConcentrationInsights(report));
    recommendations.push(...this.generateIssueResolutionInsights(report));
    if (recommendations.length > 0) {
      recommendations.forEach((rec, i) => {
        md += `### ${i + 1}. ${rec}

`;
      });
    } else {
      md += `✅ All metrics are within healthy ranges. Continue current practices!

`;
    }
    return md;
  }
  generatePRMergeRateInsights(report) {
    const insights = [];
    const mergeRate = report.activity.prMergeRate.mergeRate;
    if (mergeRate < 50) {
      insights.push(
        `🔴 **Low PR Merge Rate (${mergeRate.toFixed(1)}%)**
   - Review PR approval process
   - Provide clearer contribution guidelines
   - Consider implementing PR templates`
      );
    } else if (mergeRate > 80) {
      insights.push(
        `🟢 **Excellent PR Merge Rate (${mergeRate.toFixed(1)}%)**
   - Indicates healthy contribution workflow
   - Maintain current review standards`
      );
    }
    return insights;
  }
  generateReviewCoverageInsights(report) {
    const insights = [];
    const coverage = report.health.prReviewCoverage.coveragePercentage;
    const unreviewed = report.health.prReviewCoverage.total - report.health.prReviewCoverage.reviewed;
    if (coverage < 70) {
      insights.push(
        `🟡 **Review Coverage Needs Improvement (${coverage.toFixed(1)}%)**
   - **Action**: ${unreviewed} PRs were merged without review
   - **Next Steps**:
     - Enable "Require approvals" in branch protection
     - Set up CODEOWNERS file for automatic review assignment
     - Schedule code review training session`
      );
    } else if (coverage >= 90) {
      insights.push(
        `🟢 **Excellent Review Coverage (${coverage.toFixed(1)}%)**
   - Strong code quality practices in place
   - Continue maintaining current review standards`
      );
    }
    return insights;
  }
  generateBusFactorInsights(report) {
    const insights = [];
    const busFactor = report.contributors.busFactor;
    const topContributor = report.contributors.topContributors[0];
    const topPercentage = report.contributors.contributionDistribution[0]?.percentage || 0;
    if (busFactor <= 2) {
      insights.push(
        `🔴 **Critical: Low Bus Factor (${busFactor})**
   - **Risk**: ${topContributor?.login || "Top contributor"} accounts for ${topPercentage.toFixed(1)}% of contributions
   - **Immediate Actions**:
     - Document critical systems and processes
     - Implement pair programming sessions
     - Create onboarding documentation for new contributors
     - Schedule knowledge transfer sessions`
      );
    } else if (busFactor >= 5) {
      insights.push(
        `🟢 **Healthy Bus Factor (${busFactor})**
   - Well-distributed knowledge across team
   - Low project continuity risk`
      );
    }
    return insights;
  }
  generateContributionConcentrationInsights(report) {
    const insights = [];
    if (report.contributors.contributionDistribution.length > 0) {
      const topPercentage = report.contributors.contributionDistribution[0]?.percentage || 0;
      if (topPercentage > 50) {
        insights.push(
          `🟡 **High Contribution Concentration (${topPercentage.toFixed(1)}%)**
   - Top contributor dominates contributions
   - Risk of knowledge silos
   - Encourage broader participation`
        );
      }
    }
    return insights;
  }
  generateIssueResolutionInsights(report) {
    const insights = [];
    if (report.activity.issueResolutionTime.averageHours > 0) {
      const avgDays = report.activity.issueResolutionTime.averageHours / 24;
      if (avgDays > 30) {
        insights.push(
          `🟡 **Slow Issue Resolution (${avgDays.toFixed(1)} days avg)**
   - Consider triaging issues more frequently
   - Set up issue templates for clarity
   - Prioritize critical issues`
        );
      } else if (avgDays < 7) {
        insights.push(
          `🟢 **Fast Issue Resolution (${avgDays.toFixed(1)} days avg)**
   - Excellent responsiveness
   - Maintain current triage process`
        );
      }
    }
    return insights;
  }
}
function safeMultiplier(numerator, denominator) {
  if (denominator === 0 || denominator <= 0 || isNaN(numerator) || isNaN(denominator)) {
    return "Insufficient data";
  }
  const result = numerator / denominator;
  if (!isFinite(result) || result < 0) {
    return "Insufficient data";
  }
  return `${result.toFixed(1)}x`;
}
function safePercentageDelta(delta) {
  if (!isFinite(delta) || isNaN(delta)) {
    return "0%";
  }
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}
function safeTimeDelta(delta) {
  if (!isFinite(delta) || isNaN(delta)) {
    return "0h";
  }
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}h`;
}
function hasValidData(value) {
  if (value === null || value === void 0) {
    return false;
  }
  if (typeof value === "number") {
    return isFinite(value) && !isNaN(value) && value !== 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0 && value.some((v) => hasValidData(v));
  }
  if (typeof value === "object") {
    return Object.values(value).some((v) => hasValidData(v));
  }
  return true;
}
function safeMax(arr, fallback = 0) {
  const validValues = arr.filter((v) => isFinite(v) && !isNaN(v));
  return validValues.length > 0 ? Math.max(...validValues) : fallback;
}
class ChartGenerator {
  /**
   * Generate a line chart for velocity trends
   */
  static generateVelocityChart(weeks, mergedPRs, maxValue) {
    const labels = weeks.map((w) => `W${w}`).join('","');
    const data = mergedPRs.join(",");
    return `
<div class="chart-container" style="position: relative; width: 100%; height: 300px; margin: 1.5em 0;">
  <canvas id="velocityChart"></canvas>
</div>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<script>
  const ctx = document.getElementById('velocityChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ["${labels}"],
      datasets: [{
        label: 'Merged PRs per Week',
        data: [${data}],
        borderColor: '#0066cc',
        backgroundColor: 'rgba(0, 102, 204, 0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#0066cc',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { usePointStyle: true }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: ${maxValue},
          title: { display: true, text: 'Merged PRs' }
        }
      }
    }
  });
<\/script>
`;
  }
  /**
   * Generate a line chart for backlog burndown
   */
  static generateBurndownChart(weeks, projectedIssues, idealIssues, maxValue) {
    const weekLabels = weeks.join('","');
    const projectedData = projectedIssues.join(",");
    const idealData = idealIssues.join(",");
    return `
<div class="chart-container" style="position: relative; width: 100%; height: 300px; margin: 1.5em 0;">
  <canvas id="burndownChart"></canvas>
</div>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<script>
  const ctx = document.getElementById('burndownChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ["${weekLabels}"],
      datasets: [
        {
          label: 'Projected Open Issues',
          data: [${projectedData}],
          borderColor: '#d63384',
          backgroundColor: 'rgba(214, 51, 132, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Ideal Pace',
          data: [${idealData}],
          borderColor: '#0066cc',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { usePointStyle: true }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: ${maxValue},
          title: { display: true, text: 'Open Issues' }
        }
      }
    }
  });
<\/script>
`;
  }
  /**
   * Generate a radar chart for benchmark comparison
   */
  static generateRadarChart(categories, values) {
    const categoryLabels = categories.map((c) => `"${c}"`).join(",");
    const dataValues = values.join(",");
    return `
<div class="chart-container" style="position: relative; width: 100%; height: 350px; margin: 1.5em 0;">
  <canvas id="radarChart"></canvas>
</div>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<script>
  const ctx = document.getElementById('radarChart').getContext('2d');
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: [${categoryLabels}],
      datasets: [{
        label: 'Your Repository',
        data: [${dataValues}],
        borderColor: '#0066cc',
        backgroundColor: 'rgba(0, 102, 204, 0.2)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#0066cc',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { usePointStyle: true }
        }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          beginAtZero: true,
          ticks: {
            stepSize: 20
          }
        }
      }
    }
  });
<\/script>
`;
  }
}
class TrendsSectionGenerator {
  generate(report) {
    if (!report.trends) {
      return "";
    }
    let md = `## Trends (vs Previous Period)

`;
    md += `> **Note:** PR Merge Rate compares last 30 days (${report.trends.trends.prMergeRate.current.toFixed(1)}%) vs previous 30 days (${report.trends.trends.prMergeRate.previous.toFixed(1)}%). Overall metrics in Executive Summary reflect the entire analysis period.

`;
    md += this.generateTrendMetricsTable(report);
    md += this.generateVelocityChart(report);
    return md;
  }
  generateTrendMetricsTable(report) {
    if (!report.trends) return "";
    const trends = report.trends.trends;
    let md = `| Metric | Current | Previous | Δ | Trend |
`;
    md += `|--------|---------|----------|---|-------|
`;
    const mergeRate = trends.prMergeRate;
    const mergeIcon = this.getTrendIcon(mergeRate.trend);
    md += `| PR Merge Rate | ${mergeRate.current.toFixed(1)}% | ${mergeRate.previous.toFixed(1)}% | ${this.formatDelta(mergeRate.delta)} | ${mergeIcon} ${mergeRate.trend === "improving" ? "Improving" : mergeRate.trend === "declining" ? "Declining" : "Stable"} |
`;
    const timeToReview = trends.timeToReview;
    const reviewIcon = this.getTrendIcon(timeToReview.trend);
    const currentReviewHours = timeToReview.current;
    const previousReviewHours = timeToReview.previous;
    if (currentReviewHours > 0 && isFinite(currentReviewHours)) {
      md += `| Time to Review | ${currentReviewHours.toFixed(1)}h | ${previousReviewHours.toFixed(1)}h | ${this.formatTimeDelta(timeToReview.delta)} | ${reviewIcon} ${timeToReview.trend === "improving" ? "Improving" : timeToReview.trend === "declining" ? "Declining" : "Stable"} |
`;
    }
    const contributors = trends.activeContributors;
    const contribIcon = this.getTrendIcon(contributors.trend);
    md += `| Active Contributors | ${contributors.current} | ${contributors.previous} | ${this.formatDeltaInt(contributors.delta)} | ${contribIcon} ${contributors.trend === "improving" ? "Improving" : contributors.trend === "declining" ? "Declining" : "Stable"} |
`;
    const resolution = trends.issueResolution;
    const resIcon = this.getTrendIcon(resolution.trend);
    const currentDays = resolution.current / 24;
    const previousDays = resolution.previous / 24;
    md += `| Issue Resolution | ${currentDays.toFixed(1)}d | ${previousDays.toFixed(1)}d | ${this.formatDaysDelta(resolution.delta / 24)} | ${resIcon} ${resolution.trend === "improving" ? "Improving" : resolution.trend === "declining" ? "Declining" : "Stable"} |

`;
    return md;
  }
  getTrendIcon(trend) {
    switch (trend) {
      case "improving":
        return "📈";
      case "declining":
        return "📉";
      case "stable":
        return "→";
    }
  }
  formatDelta(delta) {
    return safePercentageDelta(delta);
  }
  formatTimeDelta(delta) {
    return safeTimeDelta(delta);
  }
  formatDaysDelta(delta) {
    if (!isFinite(delta) || isNaN(delta)) {
      return "0d";
    }
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(1)}d`;
  }
  formatDeltaInt(delta) {
    if (delta === 0) return "0";
    const sign = delta > 0 ? "+" : "";
    return `${sign}${Math.round(delta)}`;
  }
  generateVelocityChart(report) {
    if (!report.trends || !report.trends.velocityTrend || report.trends.velocityTrend.length === 0) {
      return "";
    }
    const trend = report.trends.velocityTrend;
    const weeks = trend.map((t) => t.week);
    const mergedPRs = trend.map((t) => t.mergedPRs);
    const maxValue = Math.max(...mergedPRs, 5);
    let md = `### 12-Week Velocity Trend

`;
    md += ChartGenerator.generateVelocityChart(weeks, mergedPRs, maxValue);
    md += `
`;
    return md;
  }
}
class CorrelationsSectionGenerator {
  generate(report) {
    if (!report.correlations) {
      return "";
    }
    let md = `## 🔗 Correlation Insights

`;
    const prSizeSection = this.generatePRSizeCorrelation(report);
    const dayOfWeekSection = this.generateDayOfWeekImpact(report);
    if (prSizeSection) md += prSizeSection;
    if (dayOfWeekSection) md += dayOfWeekSection;
    if (!prSizeSection && !dayOfWeekSection) {
      return "";
    }
    return md;
  }
  generatePRSizeCorrelation(report) {
    if (!report.correlations || !hasValidData(report.correlations.prSizeVsTimeToMerge)) {
      return "";
    }
    const data = report.correlations.prSizeVsTimeToMerge;
    let md = `### PR Size vs Time to Merge

`;
    md += `\`\`\`
`;
    md += `│ Days to
`;
    md += `│ Merge
`;
    const chartData = [
      { size: data.smallPRs.avgLines, time: data.smallPRs.avgDays, label: "<100 lines" },
      { size: data.mediumPRs.avgLines, time: data.mediumPRs.avgDays, label: "100-500 lines" },
      { size: data.largePRs.avgLines, time: data.largePRs.avgDays, label: ">500 lines" }
    ];
    const maxTime = safeMax([data.smallPRs.avgDays, data.mediumPRs.avgDays, data.largePRs.avgDays], 1);
    const chartHeight = 6;
    for (let i = chartHeight; i > 0; i--) {
      const threshold = maxTime / chartHeight * i;
      md += `│ ${String(Math.round(threshold)).padStart(2)}┤`;
      for (const d of chartData) {
        const normalizedTime = d.time / maxTime * chartHeight;
        if (normalizedTime >= i - 0.5) {
          md += "  •";
        } else {
          md += "   ";
        }
      }
      md += `
`;
    }
    md += `│   └─────────────────────────
`;
    md += `     ${String(Math.round(data.smallPRs.avgLines)).padStart(3)} ${String(Math.round(data.mediumPRs.avgLines)).padStart(3)} ${String(Math.round(data.largePRs.avgLines)).padStart(3)}
`;
    md += `        (Lines Changed)
`;
    md += `\`\`\`

`;
    md += `| PR Size | Avg Lines | Avg Days | Category |
`;
    md += `|---------|-----------|----------|----------|
`;
    md += `| Small | ${Math.round(data.smallPRs.avgLines)} | ${data.smallPRs.avgDays.toFixed(1)} | 📗 Optimal |
`;
    md += `| Medium | ${Math.round(data.mediumPRs.avgLines)} | ${data.mediumPRs.avgDays.toFixed(1)} | 📙 Acceptable |
`;
    md += `| Large | ${Math.round(data.largePRs.avgLines)} | ${data.largePRs.avgDays.toFixed(1)} | 📕 Slow |

`;
    const speedup = safeMultiplier(data.largePRs.avgDays, data.smallPRs.avgDays);
    md += `📊 **Finding:** ${speedup === "Insufficient data" ? "Insufficient data for comparison." : `Large PRs take ${speedup} longer to merge than small PRs.`}
`;
    md += `💡 **Recommendation:** Encourage smaller, focused PRs to reduce review and merge time.

`;
    return md;
  }
  generateDayOfWeekImpact(report) {
    if (!report.correlations || report.correlations.dayOfWeekImpact.length === 0 || !hasValidData(report.correlations.dayOfWeekImpact)) {
      return "";
    }
    const dayData = report.correlations.dayOfWeekImpact;
    let md = `### Review Response Time vs Day of Week

`;
    const validDays = dayData.filter((d) => d.avgResponseHours > 0);
    if (validDays.length < 2) {
      return "";
    }
    const maxResponseTime = safeMax(validDays.map((d) => d.avgResponseHours), 0);
    const minResponseTime = Math.min(...validDays.map((d) => d.avgResponseHours));
    if (maxResponseTime === 0 || minResponseTime === maxResponseTime) {
      return "";
    }
    md += `| Day | Avg Response | PRs Submitted | Impact |
`;
    md += `|-----|--------------|---------------|--------|
`;
    for (const day of dayData) {
      const isWorstDay = day.avgResponseHours === maxResponseTime && maxResponseTime > minResponseTime * 2;
      const isBestDay = day.avgResponseHours === minResponseTime;
      let impact = "";
      if (isWorstDay) {
        impact = "⚠️ Slowest";
      } else if (isBestDay) {
        impact = "✅ Fastest";
      }
      const hours = day.avgResponseHours < 1 ? "<1h" : `${day.avgResponseHours.toFixed(1)}h`;
      md += `| ${day.day.padEnd(9)} | ${hours.padStart(12)} | ${String(day.prsSubmitted).padStart(13)} | ${impact} |
`;
    }
    md += `
`;
    const worstDay = validDays.reduce(
      (prev, current) => prev.avgResponseHours > current.avgResponseHours ? prev : current
    );
    const bestDay = validDays.reduce(
      (prev, current) => prev.avgResponseHours < current.avgResponseHours ? prev : current
    );
    if (worstDay.day === bestDay.day) {
      return md;
    }
    const slowdownFactor = safeMultiplier(worstDay.avgResponseHours, bestDay.avgResponseHours);
    md += `⚠️ **Insight:** ${slowdownFactor === "Insufficient data" ? "Insufficient data for comparison." : `${worstDay.day} has ${slowdownFactor} slower response times than ${bestDay.day}.`}
`;
    md += `💡 **Recommendation:** Adjust review scheduling and team availability for weekend/off-peak submissions.

`;
    return md;
  }
}
class PredictionsSectionGenerator {
  generate(report) {
    if (!report.projections || !hasValidData(report.projections.predictions)) {
      return "";
    }
    let md = `## 🔮 Projections (Next 30 Days)

`;
    md += `Based on current velocity and historical patterns:

`;
    md += this.generatePredictionsTable(report);
    md += this.generateBacklogBurndownChart(report);
    return md;
  }
  generatePredictionsTable(report) {
    if (!report.projections) return "";
    const pred = report.projections.predictions;
    const hasHighConfidence = pred.prsToMerge.confidence !== "low" || pred.openIssuesAtEndOfPeriod.confidence !== "low";
    if (!hasHighConfidence) {
      return `⚠️ **Insufficient data for reliable projections.** Historical patterns are limited.

`;
    }
    let md = `| Metric | Min | Max | Confidence |
`;
    md += `|--------|-----|-----|------------|
`;
    const prConfidenceEmoji = this.getConfidenceEmoji(pred.prsToMerge.confidence);
    md += `| PRs to be merged | ${pred.prsToMerge.min} | ${pred.prsToMerge.max} | ${prConfidenceEmoji} ${this.capitalizeConfidence(pred.prsToMerge.confidence)} |
`;
    const issueConfidenceEmoji = this.getConfidenceEmoji(pred.openIssuesAtEndOfPeriod.confidence);
    md += `| Open issues (end of period) | ${pred.openIssuesAtEndOfPeriod.min} | ${pred.openIssuesAtEndOfPeriod.max} | ${issueConfidenceEmoji} ${this.capitalizeConfidence(pred.openIssuesAtEndOfPeriod.confidence)} |
`;
    if (pred.releasesProbability > 20) {
      const releaseProbability = pred.releasesProbability;
      const releaseConfidenceEmoji = releaseProbability > 70 ? "🟢" : releaseProbability > 40 ? "🟡" : "🔴";
      md += `| Probability of release | ${releaseProbability}% | — | ${releaseConfidenceEmoji} ${releaseProbability > 70 ? "Likely" : releaseProbability > 40 ? "Possible" : "Unlikely"} |
`;
    }
    md += `
`;
    return md;
  }
  generateBacklogBurndownChart(report) {
    if (!report.projections || report.projections.backlogBurndown.length === 0) {
      return "";
    }
    const burndown = report.projections.backlogBurndown;
    const maxIssues = safeMax(burndown.map((b) => b.projectedOpenIssues), 10);
    if (maxIssues <= 1) {
      return "";
    }
    const weeks = burndown.map((_, i) => i === 0 ? "Now" : `+${i}w`);
    const projectedIssues = burndown.map((b) => b.projectedOpenIssues);
    const idealIssues = burndown.map((b) => b.idealOpenIssues);
    let md = `### Backlog Burndown Projection

`;
    md += ChartGenerator.generateBurndownChart(weeks, projectedIssues, idealIssues, maxIssues);
    md += `
`;
    const currentProjected = burndown[0]?.projectedOpenIssues || 0;
    const finalProjected = burndown[burndown.length - 1]?.projectedOpenIssues || 0;
    if (currentProjected === 0) {
      return md;
    }
    const change = finalProjected - currentProjected;
    const percentChange = change / currentProjected * 100;
    if (Math.abs(percentChange) < 5) {
      md += `→ **Backlog is projected to remain stable** (±${Math.abs(percentChange).toFixed(0)}%).

`;
    } else if (percentChange > 5) {
      md += `⚠️ **At current velocity, backlog will grow ${percentChange.toFixed(0)}% by end of period.**
`;
      md += `💡 **Recommendation:** Increase team capacity or reduce issue intake.

`;
    } else {
      md += `✅ **Backlog is on track to decrease by ${Math.abs(percentChange).toFixed(0)}% by end of period.**

`;
    }
    return md;
  }
  getConfidenceEmoji(confidence) {
    switch (confidence) {
      case "high":
        return "🟢";
      case "medium":
        return "🟡";
      case "low":
        return "🔴";
    }
  }
  capitalizeConfidence(confidence) {
    return confidence.charAt(0).toUpperCase() + confidence.slice(1);
  }
}
class BenchmarksSectionGenerator {
  generate(_report, benchmark) {
    if (!benchmark) {
      return "";
    }
    let md = `## Industry Benchmark Comparison

`;
    md += `Compared against 50 similar-sized open source projects:

`;
    md += this.generateBenchmarksTable(benchmark);
    md += this.generateRadarChart(benchmark);
    md += this.generateInsights(benchmark);
    return md;
  }
  generateBenchmarksTable(benchmark) {
    let md = `| Metric | Your Repo | Median | Percentile |
`;
    md += `|--------|-----------|--------|------------|
`;
    const metrics = benchmark.metrics;
    const mergeEmoji = this.getRatingEmoji(metrics.prMergeRate.rating);
    md += `| PR Merge Rate | ${metrics.prMergeRate.value.toFixed(1)}% | ${metrics.prMergeRate.median.toFixed(1)}% | ${mergeEmoji} ${metrics.prMergeRate.percentile}th |
`;
    const reviewEmoji = this.getRatingEmoji(metrics.timeToFirstReview.rating);
    const reviewDisplay = metrics.timeToFirstReview.value > 0 ? `${metrics.timeToFirstReview.value.toFixed(1)}h` : "Data unavailable";
    md += `| Time to First Review | ${reviewDisplay} | ${metrics.timeToFirstReview.median.toFixed(1)}h | ${reviewEmoji} ${metrics.timeToFirstReview.percentile}th |
`;
    const coverageEmoji = this.getRatingEmoji(metrics.reviewCoverage.rating);
    md += `| Review Coverage | ${metrics.reviewCoverage.value.toFixed(1)}% | ${metrics.reviewCoverage.median.toFixed(1)}% | ${coverageEmoji} ${metrics.reviewCoverage.percentile}th |
`;
    const busFactorEmoji = this.getRatingEmoji(metrics.busFactor.rating);
    md += `| Bus Factor | ${metrics.busFactor.value.toFixed(0)} | ${metrics.busFactor.median.toFixed(0)} | ${busFactorEmoji} ${metrics.busFactor.percentile}th |
`;
    const resolutionEmoji = this.getRatingEmoji(metrics.issueResolution.rating);
    md += `| Issue Resolution | ${metrics.issueResolution.value.toFixed(1)}d | ${metrics.issueResolution.median.toFixed(1)}d | ${resolutionEmoji} ${metrics.issueResolution.percentile}th |
`;
    const deploymentEmoji = this.getRatingEmoji(metrics.deploymentFrequency.rating);
    md += `| Deployment Frequency | ${metrics.deploymentFrequency.value.toFixed(1)}/mo | ${metrics.deploymentFrequency.median.toFixed(1)}/mo | ${deploymentEmoji} ${metrics.deploymentFrequency.percentile}th |

`;
    md += `**Overall Score: ${benchmark.overallScore}/100**

`;
    return md;
  }
  generateRadarChart(benchmark) {
    const metrics = benchmark.metrics;
    const normalize = (percentile) => Math.min(100, Math.max(0, percentile));
    const categories = ["Merge Rate", "Review Speed", "Coverage", "Bus Factor", "Deployment"];
    const values = [
      normalize(metrics.prMergeRate.percentile),
      normalize(metrics.timeToFirstReview.percentile),
      normalize(metrics.reviewCoverage.percentile),
      normalize(metrics.busFactor.percentile),
      normalize(metrics.deploymentFrequency.percentile)
    ];
    const hasValidData2 = values.some((v) => v > 0);
    if (!hasValidData2) {
      return "";
    }
    let md = `### Your Position in the Industry

`;
    md += ChartGenerator.generateRadarChart(categories, values);
    md += `
`;
    return md;
  }
  generateInsights(benchmark) {
    let md = `### Analysis

`;
    if (benchmark.strengths.length > 0) {
      md += `**Strengths (Above 75th percentile):**
`;
      benchmark.strengths.forEach((strength) => {
        md += `- ${strength}
`;
      });
      md += `
`;
    }
    if (benchmark.weaknesses.length > 0) {
      md += `**Weaknesses (Below 50th percentile):**
`;
      benchmark.weaknesses.forEach((weakness) => {
        md += `- ${weakness}
`;
      });
      md += `
`;
    } else {
      md += `**Weaknesses:** None identified - all metrics at or above median.

`;
    }
    if (benchmark.recommendations.length === 0 && benchmark.weaknesses.length === 0 && benchmark.strengths.length > 0) {
      md += `**Recommendations:** No critical areas for improvement - maintain current practices.

`;
    } else if (benchmark.recommendations.length > 0) {
      md += `**Recommendations (Priority Order):**
`;
      benchmark.recommendations.forEach((rec, i) => {
        md += `${i + 1}. ${rec}
`;
      });
      md += `
`;
    }
    return md;
  }
  getRatingEmoji(rating) {
    switch (rating) {
      case "excellent":
        return "";
      case "good":
        return "";
      case "average":
        return "";
      case "below_average":
        return "";
      case "poor":
        return "";
      default:
        return "";
    }
  }
}
class NarrativeSectionGenerator {
  generate(_report, narrative) {
    if (!narrative) {
      return "";
    }
    let md = `## 📖 Executive Narrative

`;
    md += `### The Story This Data Tells

`;
    md += this.generateSummary(narrative);
    md += this.generateParadoxes(narrative);
    md += this.generateRootCauses(narrative);
    md += this.generateActionPlan(narrative);
    md += this.generateOutcome(narrative);
    return md;
  }
  generateSummary(narrative) {
    return `${narrative.summary}

`;
  }
  generateParadoxes(narrative) {
    if (narrative.paradoxes.length === 0) {
      return "";
    }
    let md = `### Paradoxes

`;
    for (const paradox of narrative.paradoxes) {
      md += `**${paradox.title}**

`;
      md += `${paradox.description}

`;
      md += `**Relevant Metrics:**
`;
      for (const metric of paradox.metrics) {
        md += `- ${metric}
`;
      }
      md += `
`;
    }
    return md;
  }
  generateRootCauses(narrative) {
    if (narrative.rootCauses.length === 0) {
      return "";
    }
    let md = `### Root Cause Analysis

`;
    for (const cause of narrative.rootCauses) {
      const confidenceEmoji = this.getConfidenceEmoji(cause.confidence);
      md += `**${cause.issue}** ${confidenceEmoji}

`;
      md += `*Hypothesis:* ${cause.hypothesis}

`;
      md += `**Supporting Evidence:**
`;
      for (const evidence of cause.evidence) {
        md += `- ${evidence}
`;
      }
      md += `
`;
    }
    return md;
  }
  generateActionPlan(narrative) {
    if (narrative.actionPlan.length === 0) {
      return "";
    }
    let md = `### Recommended Actions (Priority Order)

`;
    const priorityLabels = {
      1: "🥇 Critical",
      2: "🥈 Important",
      3: "🥉 Enhance"
    };
    const grouped = narrative.actionPlan.reduce(
      (acc, item) => {
        if (!acc[item.priority]) acc[item.priority] = [];
        acc[item.priority].push(item);
        return acc;
      },
      {}
    );
    for (const priority of [1, 2, 3]) {
      if (!grouped[priority] || grouped[priority].length === 0) continue;
      md += `#### ${priorityLabels[priority]}

`;
      for (const action of grouped[priority]) {
        md += `**${action.action}**
`;
        md += `- **Rationale:** ${action.rationale}
`;
        md += `- **Expected Impact:** ${action.expectedImpact}
`;
        md += `- **Timeframe:** ${action.timeframe}

`;
      }
    }
    return md;
  }
  generateOutcome(narrative) {
    let md = `### Projected Outcome

`;
    md += `${narrative.projectedOutcome}

`;
    md += `### Risk Assessment

`;
    md += `${narrative.riskAssessment}

`;
    return md;
  }
  getConfidenceEmoji(confidence) {
    switch (confidence) {
      case "high":
        return "🟢";
      case "medium":
        return "🟡";
      case "low":
        return "🔴";
    }
  }
}
class StaleItemsSectionGenerator {
  generate(report) {
    let md = `## Items Requiring Attention

`;
    if (report.reviewVelocity && report.reviewVelocity.reviewBottlenecks.length > 0) {
      md += this.generateStalePRs(report);
    }
    md += this.generateStaleIssues(report);
    return md;
  }
  generateStalePRs(report) {
    if (!report.reviewVelocity || report.reviewVelocity.reviewBottlenecks.length === 0) {
      return "";
    }
    const bottlenecks = report.reviewVelocity.reviewBottlenecks.filter((b) => b.waitingDays >= 7).sort((a, b) => b.waitingDays - a.waitingDays).slice(0, 10);
    if (bottlenecks.length === 0) {
      return "";
    }
    let md = `### PRs Aging Out (>7 days without merge)

`;
    md += `| # | Title | Author | Age | Status |
`;
    md += `|---|-------|--------|-----|--------|
`;
    for (const pr of bottlenecks) {
      const status = this.getStatusLabel(pr.status);
      const ageBracket = pr.waitingDays > 14 ? "[CRITICAL]" : pr.waitingDays > 7 ? "[WARN]" : "[INFO]";
      md += `| #${pr.prNumber} | ${pr.title} | @${pr.author} | ${ageBracket} ${pr.waitingDays}d | ${status} |
`;
    }
    md += `
`;
    md += `**Value at risk:** ${bottlenecks.length} stalled PRs
`;
    md += `**Actions:**
`;
    md += `- Review PR status and unblock bottlenecks
`;
    md += `- Request author updates if waiting on changes
`;
    md += `- Auto-merge approved PRs with passing CI

`;
    return md;
  }
  generateStaleIssues(report) {
    if (!report.projections) {
      return "";
    }
    const estimatedStaleIssues = Math.ceil(
      report.projections.predictions.openIssuesAtEndOfPeriod.max * 0.05
      // Assume 5% are stale
    );
    if (estimatedStaleIssues === 0) {
      return "";
    }
    let md = `### Issues Requiring Triage

`;
    md += `**Estimated stale:** ${estimatedStaleIssues} issues
`;
    md += `**Actions:**
`;
    md += `- Unresponded (7d+): ~${Math.max(1, Math.floor(estimatedStaleIssues * 0.3))} issues - Add labels & assignee
`;
    md += `- No Priority: ~${Math.max(1, Math.floor(estimatedStaleIssues * 0.4))} issues - Triage & prioritize
`;
    md += `- Duplicate/Invalid: ~${Math.max(1, Math.floor(estimatedStaleIssues * 0.3))} issues - Close & document

`;
    return md;
  }
  getStatusLabel(status) {
    switch (status) {
      case "no_reviewers":
        return "No reviewers";
      case "changes_requested":
        return "Waiting on author";
      case "approved_pending_merge":
        return "Approved, waiting";
      case "unknown":
        return "Unknown";
    }
  }
}
class MarkdownReportGenerator {
  activityGenerator;
  contributorGenerator;
  labelGenerator;
  healthGenerator;
  recommendationsGenerator;
  trendsGenerator;
  correlationsGenerator;
  predictionsGenerator;
  benchmarksGenerator;
  narrativeGenerator;
  staleItemsGenerator;
  constructor() {
    this.activityGenerator = new ActivitySectionGenerator();
    this.contributorGenerator = new ContributorSectionGenerator();
    this.labelGenerator = new LabelSectionGenerator();
    this.healthGenerator = new HealthSectionGenerator();
    this.recommendationsGenerator = new RecommendationsGenerator();
    this.trendsGenerator = new TrendsSectionGenerator();
    this.correlationsGenerator = new CorrelationsSectionGenerator();
    this.predictionsGenerator = new PredictionsSectionGenerator();
    this.benchmarksGenerator = new BenchmarksSectionGenerator();
    this.narrativeGenerator = new NarrativeSectionGenerator();
    this.staleItemsGenerator = new StaleItemsSectionGenerator();
  }
  /**
   * Generate a complete markdown report from analytics data
   */
  async generate(report, packageVersion = "unknown", benchmark, narrative) {
    let md = "";
    md += this.generateHeader(report);
    md += this.generateExecutiveSummary(report);
    md += this.activityGenerator.generate(report);
    md += this.contributorGenerator.generate(report);
    md += this.labelGenerator.generate(report);
    md += this.healthGenerator.generate(report);
    md += this.trendsGenerator.generate(report);
    md += this.correlationsGenerator.generate(report);
    md += this.predictionsGenerator.generate(report);
    md += this.benchmarksGenerator.generate(report, benchmark);
    md += this.narrativeGenerator.generate(report, narrative);
    md += this.staleItemsGenerator.generate(report);
    md += this.recommendationsGenerator.generate(report);
    md += this.generateMetadata(report, packageVersion);
    md += this.generateSummaryStats(report);
    md = this.normalizeWhitespace(md);
    return md;
  }
  /**
   * Generate report header with title and metadata
   */
  generateHeader(report) {
    const now = new Date(report.generatedAt);
    let md = `# 📊 Analytics Report

`;
    md += `## ${report.repository}

`;
    md += `**Generated:** ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${now.toLocaleTimeString()}

`;
    md += `---

`;
    return md;
  }
  /**
   * Generate executive summary with key metrics
   */
  generateExecutiveSummary(report) {
    let md = `## 📋 Executive Summary

`;
    md += `This analytics report provides data-driven insights into repository health, team dynamics, and development velocity.

`;
    md += `### Key Metrics Overview

`;
    md += `| Metric | Current Value | Interpretation |
`;
    md += `|--------|--------------|----------------|
`;
    const mergeRate = report.activity.prMergeRate.mergeRate;
    const totalPRs = report.activity.prMergeRate.merged + report.activity.prMergeRate.closed;
    md += `| **PR Merge Rate** | ${mergeRate.toFixed(1)}% (${report.activity.prMergeRate.merged}/${totalPRs} PRs) | ${statusHelpers.getHealthStatus(mergeRate, 50, 80)} |
`;
    md += `| **Review Coverage** | ${report.health.prReviewCoverage.coveragePercentage.toFixed(1)}% (${report.health.prReviewCoverage.reviewed}/${report.health.prReviewCoverage.total}) | ${statusHelpers.getHealthStatus(report.health.prReviewCoverage.coveragePercentage, 50, 70)} |
`;
    md += `| **Active Contributors** | ${report.activity.activeContributors[0]?.contributors || 0} | ${statusHelpers.getContributorStatus(report.activity.activeContributors[0]?.contributors || 0)} |
`;
    md += `| **Bus Factor** | ${report.contributors.busFactor} | ${statusHelpers.getBusFactorStatus(report.contributors.busFactor)} |
`;
    md += `| **Deployment Frequency** | ${report.health.deploymentFrequency.releases} releases | ${statusHelpers.getDeploymentStatus(report.health.deploymentFrequency.releases)} |

`;
    const alerts = [];
    if (report.contributors.busFactor <= 2) {
      alerts.push("⚠️ **Critical Risk**: Low bus factor indicates project vulnerability");
    }
    if (mergeRate < 40) {
      alerts.push("⚠️ **Attention Needed**: Low PR merge rate may indicate process bottlenecks");
    }
    if (report.health.prReviewCoverage.coveragePercentage < 50) {
      alerts.push("⚠️ **Quality Risk**: More than half of PRs lack code review");
    }
    if (alerts.length > 0) {
      md += `### ⚠️ Critical Alerts

`;
      alerts.forEach((alert) => md += `${alert}
`);
      md += `
`;
    }
    md += `---

`;
    return md;
  }
  /**
   * Generate report metadata section
   */
  generateMetadata(report, packageVersion) {
    let md = `---

`;
    md += `## Report Metadata

`;
    md += `- **Analysis Duration:**
`;
    md += `  - Activity: ${(report.activity.duration / 1e3).toFixed(2)}s
`;
    md += `  - Contributors: ${(report.contributors.duration / 1e3).toFixed(2)}s
`;
    md += `  - Labels: ${(report.labels.duration / 1e3).toFixed(2)}s
`;
    md += `  - Health: ${(report.health.duration / 1e3).toFixed(2)}s
`;
    md += `- **Generated by:** [GitHub Extractor CLI (ghextractor)](https://github.com/LeSoviet/GithubCLIExtractor)
`;
    md += `- **Version:** ${packageVersion === "unknown" ? "n/a" : packageVersion}
`;
    return md;
  }
  /**
   * Generate summary statistics section - REMOVED to avoid redundancy
   * Data is already in Executive Summary
   */
  generateSummaryStats(_report) {
    return ``;
  }
  /**
   * Normalize excessive whitespace in markdown
   * Prevents large blank sections in PDF output
   */
  normalizeWhitespace(md) {
    md = md.replace(/(\n){4,}/g, "\n\n");
    md = md.split("\n").map((line) => line.trimEnd()).join("\n");
    md = md.trim();
    return md;
  }
}
class AdvancedAnalyticsProcessor {
  constructor(repository, offline = false, exportedDataPath) {
    this.repository = repository;
    this.offline = offline;
    this.exportedDataPath = exportedDataPath;
  }
  /**
   * Generate Review Velocity analytics
   */
  async generateReviewVelocity() {
    const startTime = Date.now();
    const result = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.repository.owner}/${this.repository.name}`,
      timeToFirstReview: {
        averageHours: 0,
        medianHours: 0,
        p90Hours: 0
      },
      timeToApproval: {
        averageDays: 0,
        medianDays: 0
      },
      reviewBottlenecks: [],
      reviewerLoadDistribution: []
    };
    try {
      let prs = [];
      if (!this.offline) {
        prs = await execGhJson(
          `pr list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 200 --json number,title,author,createdAt,updatedAt,closedAt,mergedAt,reviews,reviewRequests`,
          { timeout: 6e4, useRateLimit: false, useRetry: false }
        );
      } else if (this.exportedDataPath) {
        const parser = new MarkdownParser(this.exportedDataPath);
        const parsedPRs = await parser.parsePullRequests();
        prs = parsedPRs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          author: { login: pr.author },
          createdAt: pr.createdAt,
          updatedAt: pr.closedAt || pr.createdAt,
          closedAt: pr.closedAt,
          mergedAt: pr.mergedAt,
          reviews: [],
          reviewRequests: []
        }));
      }
      const reviewTimes = [];
      const approvalTimes = [];
      const reviewerStats = /* @__PURE__ */ new Map();
      for (const pr of prs) {
        if (!pr.reviews || pr.reviews.length === 0) continue;
        const createdAt = new Date(pr.createdAt);
        const firstReview = pr.reviews[0];
        if (firstReview?.submittedAt) {
          const firstReviewAt = new Date(firstReview.submittedAt);
          const hoursToFirstReview = (firstReviewAt.getTime() - createdAt.getTime()) / (1e3 * 60 * 60);
          if (hoursToFirstReview >= 0 && hoursToFirstReview < 24 * 30) {
            reviewTimes.push(hoursToFirstReview);
          }
          const reviewer = firstReview.author?.login || "unknown";
          if (reviewer !== "unknown") {
            const stats = reviewerStats.get(reviewer) || { count: 0, totalResponseTime: 0 };
            stats.count++;
            stats.totalResponseTime += hoursToFirstReview;
            reviewerStats.set(reviewer, stats);
          }
        }
        const approvedReview = pr.reviews.find((r) => r.state === "APPROVED");
        if (approvedReview?.submittedAt) {
          const approvedAt = new Date(approvedReview.submittedAt);
          const daysToApproval = (approvedAt.getTime() - createdAt.getTime()) / (1e3 * 60 * 60 * 24);
          if (daysToApproval >= 0 && daysToApproval < 90) {
            approvalTimes.push(daysToApproval);
          }
        }
      }
      if (reviewTimes.length > 0) {
        const sorted = [...reviewTimes].sort((a, b) => a - b);
        result.timeToFirstReview = {
          averageHours: reviewTimes.reduce((sum, t) => sum + t, 0) / reviewTimes.length,
          medianHours: sorted[Math.floor(sorted.length / 2)],
          p90Hours: sorted[Math.floor(sorted.length * 0.9)]
        };
      }
      if (approvalTimes.length > 0) {
        const sorted = [...approvalTimes].sort((a, b) => a - b);
        result.timeToApproval = {
          averageDays: approvalTimes.reduce((sum, t) => sum + t, 0) / approvalTimes.length,
          medianDays: sorted[Math.floor(sorted.length / 2)]
        };
      }
      const now = /* @__PURE__ */ new Date();
      const bottlenecks = prs.filter((pr) => pr.state !== "MERGED" && pr.state !== "CLOSED").map((pr) => {
        const createdAt = new Date(pr.createdAt);
        const waitingDays = (now.getTime() - createdAt.getTime()) / (1e3 * 60 * 60 * 24);
        let status = "unknown";
        if (!pr.reviewRequests || pr.reviewRequests.length === 0) {
          status = "no_reviewers";
        } else if (pr.reviews && pr.reviews.some((r) => r.state === "CHANGES_REQUESTED")) {
          status = "changes_requested";
        } else if (pr.reviews && pr.reviews.some((r) => r.state === "APPROVED")) {
          status = "approved_pending_merge";
        }
        return {
          prNumber: pr.number,
          title: pr.title || `PR #${pr.number}`,
          author: pr.author?.login || "unknown",
          waitingDays: Math.floor(waitingDays * 10) / 10,
          status
        };
      }).filter((pr) => pr.waitingDays > 3).sort((a, b) => b.waitingDays - a.waitingDays).slice(0, 10);
      result.reviewBottlenecks = bottlenecks;
      result.reviewerLoadDistribution = Array.from(reviewerStats.entries()).map(([reviewer, stats]) => ({
        reviewer,
        reviewCount: stats.count,
        averageResponseHours: stats.totalResponseTime / stats.count
      })).sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 10);
      result.success = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMsg);
      logger.error(`Review velocity analytics failed: ${errorMsg}`);
    }
    result.duration = Date.now() - startTime;
    return result;
  }
  /**
   * Generate temporal trends (compare current vs previous period)
   */
  async generateTemporalTrends() {
    const startTime = Date.now();
    const now = /* @__PURE__ */ new Date();
    const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
    const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1e3);
    const previousEnd = currentStart;
    const result = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.repository.owner}/${this.repository.name}`,
      comparisonPeriod: {
        current: { start: currentStart.toISOString(), end: now.toISOString() },
        previous: { start: previousStart.toISOString(), end: previousEnd.toISOString() }
      },
      trends: {
        prMergeRate: {
          current: 0,
          previous: 0,
          delta: 0,
          trend: "stable"
        },
        timeToReview: {
          current: 0,
          previous: 0,
          delta: 0,
          trend: "stable"
        },
        activeContributors: {
          current: 0,
          previous: 0,
          delta: 0,
          trend: "stable"
        },
        issueResolution: {
          current: 0,
          previous: 0,
          delta: 0,
          trend: "stable"
        }
      },
      velocityTrend: []
    };
    try {
      let prs = [];
      let issues = [];
      if (!this.offline) {
        prs = await execGhJson(
          `pr list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 500 --json number,mergedAt,closedAt,createdAt,author`,
          { timeout: 6e4, useRateLimit: false, useRetry: false }
        );
        issues = await execGhJson(
          `issue list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 500 --json createdAt,closedAt,author`,
          { timeout: 6e4, useRateLimit: false, useRetry: false }
        );
      } else if (this.exportedDataPath) {
        const parser = new MarkdownParser(this.exportedDataPath);
        const parsedPRs = await parser.parsePullRequests();
        const parsedIssues = await parser.parseIssues();
        prs = parsedPRs.map((pr) => ({
          number: pr.number,
          mergedAt: pr.mergedAt,
          closedAt: pr.closedAt,
          createdAt: pr.createdAt,
          author: { login: pr.author }
        }));
        issues = parsedIssues.map((issue) => ({
          createdAt: issue.createdAt,
          closedAt: issue.closedAt,
          author: { login: issue.author }
        }));
      }
      const currentPRs = prs.filter((pr) => {
        const created = new Date(pr.createdAt);
        return created >= currentStart && created <= now;
      });
      const previousPRs = prs.filter((pr) => {
        const created = new Date(pr.createdAt);
        return created >= previousStart && created < previousEnd;
      });
      const currentMerged = currentPRs.filter((pr) => pr.mergedAt).length;
      const previousMerged = previousPRs.filter((pr) => pr.mergedAt).length;
      const currentMergeRate = currentPRs.length > 0 ? currentMerged / currentPRs.length * 100 : 0;
      const previousMergeRate = previousPRs.length > 0 ? previousMerged / previousPRs.length * 100 : 0;
      const mergeRateDelta = currentMergeRate - previousMergeRate;
      result.trends.prMergeRate = {
        current: currentMergeRate,
        previous: previousMergeRate,
        delta: mergeRateDelta,
        trend: Math.abs(mergeRateDelta) < 5 ? "stable" : mergeRateDelta > 0 ? "improving" : "declining"
      };
      const currentContributors = new Set(currentPRs.map((pr) => pr.author?.login).filter(Boolean));
      const previousContributors = new Set(previousPRs.map((pr) => pr.author?.login).filter(Boolean));
      const contributorDelta = currentContributors.size - previousContributors.size;
      result.trends.activeContributors = {
        current: currentContributors.size,
        previous: previousContributors.size,
        delta: contributorDelta,
        trend: Math.abs(contributorDelta) < 2 ? "stable" : contributorDelta > 0 ? "improving" : "declining"
      };
      const currentIssues = issues.filter((issue) => {
        const created = new Date(issue.createdAt);
        return created >= currentStart && created <= now;
      });
      const previousIssues = issues.filter((issue) => {
        const created = new Date(issue.createdAt);
        return created >= previousStart && created < previousEnd;
      });
      const currentResolutionTime = this.calculateAverageResolutionTime(currentIssues);
      const previousResolutionTime = this.calculateAverageResolutionTime(previousIssues);
      const resolutionDelta = currentResolutionTime - previousResolutionTime;
      result.trends.issueResolution = {
        current: currentResolutionTime,
        previous: previousResolutionTime,
        delta: resolutionDelta,
        // For resolution time: NEGATIVE delta = improving (lower is better, less time spent)
        trend: Math.abs(resolutionDelta) < 12 ? "stable" : resolutionDelta < 0 ? "improving" : "declining"
      };
      const currentReviewTime = this.calculateAverageReviewTime(currentPRs);
      const previousReviewTime = this.calculateAverageReviewTime(previousPRs);
      const reviewTimeDelta = currentReviewTime - previousReviewTime;
      result.trends.timeToReview = {
        current: currentReviewTime,
        previous: previousReviewTime,
        delta: reviewTimeDelta,
        // For review time: NEGATIVE delta = improving (lower is better, faster reviews)
        trend: Math.abs(reviewTimeDelta) < 2 ? "stable" : reviewTimeDelta < 0 ? "improving" : "declining"
      };
      const weeksToTrack = 12;
      const velocityTrend = [];
      for (let i = weeksToTrack - 1; i >= 0; i--) {
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1e3);
        const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1e3);
        const weekPRs = prs.filter((pr) => {
          if (!pr.mergedAt) return false;
          const merged = new Date(pr.mergedAt);
          return merged >= weekStart && merged < weekEnd;
        });
        velocityTrend.push({
          week: weeksToTrack - i,
          mergedPRs: weekPRs.length
        });
      }
      result.velocityTrend = velocityTrend;
      result.success = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMsg);
      logger.error(`Temporal trends analytics failed: ${errorMsg}`);
    }
    result.duration = Date.now() - startTime;
    return result;
  }
  /**
   * Generate metric correlations
   */
  async generateCorrelations() {
    const startTime = Date.now();
    const result = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.repository.owner}/${this.repository.name}`,
      prSizeVsTimeToMerge: {
        smallPRs: { avgLines: 0, avgDays: 0 },
        mediumPRs: { avgLines: 0, avgDays: 0 },
        largePRs: { avgLines: 0, avgDays: 0 },
        correlation: 0
      },
      dayOfWeekImpact: []
    };
    try {
      let prs = [];
      if (!this.offline) {
        prs = await execGhJson(
          `pr list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 300 --json number,createdAt,mergedAt,additions,deletions,reviews`,
          { timeout: 6e4, useRateLimit: false, useRetry: false }
        );
      }
      const smallPRs = prs.filter((pr) => pr.additions + pr.deletions < 100);
      const mediumPRs = prs.filter((pr) => pr.additions + pr.deletions >= 100 && pr.additions + pr.deletions < 500);
      const largePRs = prs.filter((pr) => pr.additions + pr.deletions >= 500);
      result.prSizeVsTimeToMerge = {
        smallPRs: {
          avgLines: this.calculateAveragePRSize(smallPRs),
          avgDays: this.calculateAverageTimeToMerge(smallPRs)
        },
        mediumPRs: {
          avgLines: this.calculateAveragePRSize(mediumPRs),
          avgDays: this.calculateAverageTimeToMerge(mediumPRs)
        },
        largePRs: {
          avgLines: this.calculateAveragePRSize(largePRs),
          avgDays: this.calculateAverageTimeToMerge(largePRs)
        },
        correlation: this.calculateCorrelation(prs)
      };
      const dayStats = /* @__PURE__ */ new Map();
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      days.forEach((day) => {
        dayStats.set(day, { totalResponseTime: 0, count: 0, prsSubmitted: 0 });
      });
      prs.forEach((pr) => {
        const createdAt = new Date(pr.createdAt);
        const dayName = days[createdAt.getDay()];
        const stats = dayStats.get(dayName);
        stats.prsSubmitted++;
        if (pr.reviews && pr.reviews.length > 0) {
          const firstReview = pr.reviews[0];
          if (firstReview.submittedAt) {
            const reviewedAt = new Date(firstReview.submittedAt);
            const hoursToReview = (reviewedAt.getTime() - createdAt.getTime()) / (1e3 * 60 * 60);
            if (hoursToReview >= 0 && hoursToReview < 24 * 14) {
              stats.totalResponseTime += hoursToReview;
              stats.count++;
            }
          }
        }
      });
      result.dayOfWeekImpact = Array.from(dayStats.entries()).map(([day, stats]) => ({
        day,
        avgResponseHours: stats.count > 0 ? stats.totalResponseTime / stats.count : 0,
        prsSubmitted: stats.prsSubmitted
      }));
      result.success = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMsg);
      logger.error(`Correlation analytics failed: ${errorMsg}`);
    }
    result.duration = Date.now() - startTime;
    return result;
  }
  /**
   * Generate projections
   */
  async generateProjections() {
    const startTime = Date.now();
    const result = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.repository.owner}/${this.repository.name}`,
      projectionPeriod: "next 30 days",
      predictions: {
        prsToMerge: { min: 0, max: 0, confidence: "low" },
        openIssuesAtEndOfPeriod: { min: 0, max: 0, confidence: "low" },
        releasesProbability: 0
      },
      backlogBurndown: []
    };
    try {
      let prs = [];
      let issues = [];
      let releases = [];
      if (!this.offline) {
        prs = await execGhJson(
          `pr list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 500 --json mergedAt,createdAt`,
          { timeout: 6e4, useRateLimit: false, useRetry: false }
        );
        issues = await execGhJson(
          `issue list --repo ${this.repository.owner}/${this.repository.name} --state all --limit 500 --json createdAt,closedAt,state`,
          { timeout: 6e4, useRateLimit: false, useRetry: false }
        );
        releases = await execGhJson(
          `release list --repo ${this.repository.owner}/${this.repository.name} --limit 50 --json publishedAt`,
          { timeout: 6e4, useRateLimit: false, useRetry: false }
        );
      }
      const now = /* @__PURE__ */ new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
      const recentMergedPRs = prs.filter((pr) => {
        if (!pr.mergedAt) return false;
        const merged = new Date(pr.mergedAt);
        return merged >= last30Days && merged <= now;
      });
      const avgPRsPerMonth = recentMergedPRs.length;
      const stdDev = Math.sqrt(avgPRsPerMonth) || 1;
      result.predictions.prsToMerge = {
        min: Math.max(0, Math.floor(avgPRsPerMonth - stdDev)),
        max: Math.ceil(avgPRsPerMonth + stdDev),
        confidence: avgPRsPerMonth > 10 ? "high" : avgPRsPerMonth > 5 ? "medium" : "low"
      };
      const currentOpenIssues = issues.filter((issue) => issue.state === "open").length;
      const recentClosedIssues = issues.filter((issue) => {
        if (!issue.closedAt) return false;
        const closed = new Date(issue.closedAt);
        return closed >= last30Days && closed <= now;
      }).length;
      const recentOpenedIssues = issues.filter((issue) => {
        const created = new Date(issue.createdAt);
        return created >= last30Days && created <= now;
      }).length;
      const netIssueChange = recentOpenedIssues - recentClosedIssues;
      const projectedOpenIssues = Math.max(0, currentOpenIssues + netIssueChange);
      result.predictions.openIssuesAtEndOfPeriod = {
        min: Math.max(0, Math.floor(projectedOpenIssues * 0.8)),
        max: Math.ceil(projectedOpenIssues * 1.2),
        confidence: recentClosedIssues > 5 ? "medium" : "low"
      };
      const recentReleases = releases.filter((release) => {
        const published = new Date(release.publishedAt);
        return published >= last30Days && published <= now;
      });
      result.predictions.releasesProbability = recentReleases.length > 0 ? 70 : 30;
      const weeksToProject = 6;
      const weeklyBurnRate = recentClosedIssues / 4.3;
      for (let week = 1; week <= weeksToProject; week++) {
        const projectedOpenIssues2 = Math.max(0, Math.floor(currentOpenIssues - week * weeklyBurnRate));
        const idealOpenIssues = Math.max(0, Math.floor(currentOpenIssues * (1 - week / weeksToProject)));
        result.backlogBurndown.push({
          week,
          projectedOpenIssues: projectedOpenIssues2,
          idealOpenIssues
        });
      }
      result.success = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMsg);
      logger.error(`Projections analytics failed: ${errorMsg}`);
    }
    result.duration = Date.now() - startTime;
    return result;
  }
  // Helper methods
  calculateAverageResolutionTime(issues) {
    const closedIssues = issues.filter((issue) => issue.closedAt && issue.createdAt);
    if (closedIssues.length === 0) return 0;
    const totalHours = closedIssues.reduce((sum, issue) => {
      const created = new Date(issue.createdAt);
      const closed = new Date(issue.closedAt);
      return sum + (closed.getTime() - created.getTime()) / (1e3 * 60 * 60);
    }, 0);
    return totalHours / closedIssues.length;
  }
  calculateAverageReviewTime(prs) {
    if (prs.length === 0) return 0;
    const prsWithReviews = prs.filter((pr) => pr.reviews && pr.reviews.length > 0);
    if (prsWithReviews.length === 0) return 0;
    const totalHours = prsWithReviews.reduce((sum, pr) => {
      const created = new Date(pr.createdAt);
      const firstReview = pr.reviews[0];
      if (firstReview?.submittedAt) {
        const reviewed = new Date(firstReview.submittedAt);
        return sum + (reviewed.getTime() - created.getTime()) / (1e3 * 60 * 60);
      }
      return sum;
    }, 0);
    return totalHours / prsWithReviews.length;
  }
  calculateAveragePRSize(prs) {
    if (prs.length === 0) return 0;
    const totalLines = prs.reduce((sum, pr) => sum + (pr.additions || 0) + (pr.deletions || 0), 0);
    return Math.floor(totalLines / prs.length);
  }
  calculateAverageTimeToMerge(prs) {
    const mergedPRs = prs.filter((pr) => pr.mergedAt && pr.createdAt);
    if (mergedPRs.length === 0) return 0;
    const totalDays = mergedPRs.reduce((sum, pr) => {
      const created = new Date(pr.createdAt);
      const merged = new Date(pr.mergedAt);
      return sum + (merged.getTime() - created.getTime()) / (1e3 * 60 * 60 * 24);
    }, 0);
    return totalDays / mergedPRs.length;
  }
  calculateCorrelation(prs) {
    const validPRs = prs.filter((pr) => pr.mergedAt && pr.createdAt && pr.additions !== void 0);
    if (validPRs.length < 10) return 0;
    const sizes = validPRs.map((pr) => (pr.additions || 0) + (pr.deletions || 0));
    const times = validPRs.map((pr) => {
      const created = new Date(pr.createdAt);
      const merged = new Date(pr.mergedAt);
      return (merged.getTime() - created.getTime()) / (1e3 * 60 * 60 * 24);
    });
    const n = sizes.length;
    const sumSize = sizes.reduce((a, b) => a + b, 0);
    const sumTime = times.reduce((a, b) => a + b, 0);
    const sumSizeTime = sizes.reduce((sum, size, i) => sum + size * times[i], 0);
    const sumSizeSquared = sizes.reduce((sum, size) => sum + size * size, 0);
    const sumTimeSquared = times.reduce((sum, time) => sum + time * time, 0);
    const numerator = n * sumSizeTime - sumSize * sumTime;
    const denominator = Math.sqrt((n * sumSizeSquared - sumSize * sumSize) * (n * sumTimeSquared - sumTime * sumTime));
    return denominator === 0 ? 0 : numerator / denominator;
  }
}
class ReportValidator {
  warnings = [];
  errors = [];
  totalChecks = 0;
  passedChecks = 0;
  /**
   * Validate a complete analytics report
   */
  validate(report) {
    this.warnings = [];
    this.errors = [];
    this.totalChecks = 0;
    this.passedChecks = 0;
    logger.info("Validating analytics report for numerical consistency...");
    this.validatePRCounts(report);
    this.validateIssueCounts(report);
    this.validateContributorCounts(report);
    this.validatePercentages(report);
    this.validateTimestamps(report);
    this.validateTrends(report);
    this.validateRatios(report);
    const failedChecks = this.errors.length;
    const warningChecks = this.warnings.length;
    const result = {
      valid: this.errors.length === 0,
      warnings: this.warnings,
      errors: this.errors,
      metadata: {
        totalChecks: this.totalChecks,
        passedChecks: this.passedChecks,
        failedChecks,
        warningChecks
      }
    };
    if (result.valid) {
      logger.success(`✅ Report validation passed (${this.passedChecks}/${this.totalChecks} checks)`);
    } else {
      logger.warn(`⚠️  Report validation found ${failedChecks} errors and ${warningChecks} warnings`);
      this.errors.forEach((error) => {
        logger.error(`  ❌ ${error.field}: ${error.message} (expected: ${error.expected}, got: ${error.actual})`);
      });
    }
    return result;
  }
  /**
   * Validate PR count consistency across different sections
   */
  validatePRCounts(report) {
    const activityPRTotal = report.activity.prMergeRate.merged + report.activity.prMergeRate.closed;
    const healthPRTotal = report.health.prReviewCoverage.total;
    this.totalChecks++;
    if (activityPRTotal !== healthPRTotal) {
      const variance = Math.abs(activityPRTotal - healthPRTotal) / Math.max(activityPRTotal, healthPRTotal);
      if (variance > 0.1) {
        this.errors.push({
          field: "activity.prMergeRate vs health.prReviewCoverage",
          message: "PR counts do not match between activity and health sections",
          expected: healthPRTotal,
          actual: activityPRTotal
        });
      } else {
        this.passedChecks++;
        this.warnings.push({
          field: "activity.prMergeRate vs health.prReviewCoverage",
          message: `Minor variance in PR counts (${activityPRTotal} vs ${healthPRTotal})`,
          severity: "low",
          suggestion: "This may be due to different time windows or filters"
        });
      }
    } else {
      this.passedChecks++;
    }
    if (report.reviewVelocity) {
      this.totalChecks++;
      const bottleneckPRs = report.reviewVelocity.reviewBottlenecks.length;
      if (bottleneckPRs > activityPRTotal) {
        this.errors.push({
          field: "reviewVelocity.reviewBottlenecks",
          message: "More bottleneck PRs than total PRs analyzed",
          expected: `<= ${activityPRTotal}`,
          actual: bottleneckPRs
        });
      } else {
        this.passedChecks++;
      }
    }
  }
  /**
   * Validate issue count consistency
   */
  validateIssueCounts(report) {
    this.totalChecks++;
    const avgResolutionHours = report.activity.issueResolutionTime.averageHours;
    const medianResolutionHours = report.activity.issueResolutionTime.medianHours;
    if (avgResolutionHours < medianResolutionHours * 0.5) {
      this.warnings.push({
        field: "activity.issueResolutionTime",
        message: "Average resolution time is significantly lower than median (unusual distribution)",
        severity: "medium",
        suggestion: "Check for data quality issues or outliers"
      });
    }
    this.passedChecks++;
    this.totalChecks++;
    const labelIssueLifecycle = report.labels.issueLifecycle.averageOpenDays;
    const activityResolutionDays = avgResolutionHours / 24;
    const variance = Math.abs(labelIssueLifecycle - activityResolutionDays) / Math.max(labelIssueLifecycle, activityResolutionDays);
    if (variance > 0.5 && labelIssueLifecycle > 0 && activityResolutionDays > 0) {
      this.warnings.push({
        field: "labels.issueLifecycle vs activity.issueResolutionTime",
        message: `Issue lifecycle metrics differ significantly (${labelIssueLifecycle.toFixed(1)} days vs ${activityResolutionDays.toFixed(1)} days)`,
        severity: "medium",
        suggestion: "Different time windows or calculation methods may explain this"
      });
    }
    this.passedChecks++;
  }
  /**
   * Validate contributor count consistency
   */
  validateContributorCounts(report) {
    const topContributorsCount = report.contributors.topContributors.length;
    const newContributors = report.contributors.newVsReturning.new;
    const returningContributors = report.contributors.newVsReturning.returning;
    const totalNewVsReturning = newContributors + returningContributors;
    this.totalChecks++;
    const variance = Math.abs(topContributorsCount - totalNewVsReturning) / Math.max(topContributorsCount, totalNewVsReturning);
    if (variance > 0.3 && topContributorsCount > 0 && totalNewVsReturning > 0) {
      this.warnings.push({
        field: "contributors.topContributors vs newVsReturning",
        message: `Contributor counts differ (${topContributorsCount} total vs ${totalNewVsReturning} categorized)`,
        severity: "low",
        suggestion: "newVsReturning uses estimation, some variance is expected"
      });
    }
    this.passedChecks++;
    this.totalChecks++;
    const busFactor = report.contributors.busFactor;
    if (busFactor > topContributorsCount) {
      this.errors.push({
        field: "contributors.busFactor",
        message: "Bus factor exceeds total contributor count",
        expected: `<= ${topContributorsCount}`,
        actual: busFactor
      });
    } else if (busFactor < 1 && topContributorsCount > 0) {
      this.warnings.push({
        field: "contributors.busFactor",
        message: "Bus factor is less than 1 (very risky project)",
        severity: "high",
        suggestion: "Critical: Project relies on too few contributors"
      });
    } else {
      this.passedChecks++;
    }
  }
  /**
   * Validate percentages are in valid range (0-100)
   */
  validatePercentages(report) {
    const percentages = [
      { field: "activity.prMergeRate.mergeRate", value: report.activity.prMergeRate.mergeRate },
      { field: "health.prReviewCoverage.coveragePercentage", value: report.health.prReviewCoverage.coveragePercentage },
      ...report.labels.labelDistribution.slice(0, 5).map((label, i) => ({
        field: `labels.labelDistribution[${i}].percentage`,
        value: label.percentage
      })),
      ...report.contributors.contributionDistribution.slice(0, 5).map((contrib, i) => ({
        field: `contributors.contributionDistribution[${i}].percentage`,
        value: contrib.percentage
      }))
    ];
    if (report.projections) {
      percentages.push({
        field: "projections.predictions.releasesProbability",
        value: report.projections.predictions.releasesProbability
      });
    }
    percentages.forEach(({ field, value }) => {
      this.totalChecks++;
      if (value < 0 || value > 100) {
        this.errors.push({
          field,
          message: "Percentage out of valid range",
          expected: "0-100",
          actual: value
        });
      } else {
        this.passedChecks++;
      }
    });
  }
  /**
   * Validate timestamps are in correct order
   */
  validateTimestamps(report) {
    this.totalChecks++;
    const periodStart = new Date(report.activity.period.start);
    const periodEnd = new Date(report.activity.period.end);
    const reportGenerated = new Date(report.generatedAt);
    if (periodStart >= periodEnd) {
      this.errors.push({
        field: "activity.period",
        message: "Period start date is not before end date",
        expected: `start < end`,
        actual: `${periodStart.toISOString()} >= ${periodEnd.toISOString()}`
      });
    } else {
      this.passedChecks++;
    }
    this.totalChecks++;
    if (periodEnd > reportGenerated) {
      this.warnings.push({
        field: "activity.period.end vs generatedAt",
        message: "Period ends after report generation time (future data)",
        severity: "medium",
        suggestion: "Ensure time synchronization is correct"
      });
    } else {
      this.passedChecks++;
    }
  }
  /**
   * Validate trends if available
   */
  validateTrends(report) {
    if (!report.trends) return;
    this.totalChecks++;
    const currentStart = new Date(report.trends.comparisonPeriod.current.start);
    const previousEnd = new Date(report.trends.comparisonPeriod.previous.end);
    if (previousEnd > currentStart) {
      this.warnings.push({
        field: "trends.comparisonPeriod",
        message: "Trend periods overlap (previous period ends after current starts)",
        severity: "medium",
        suggestion: "Periods should be consecutive without overlap"
      });
    } else {
      this.passedChecks++;
    }
    const trends = [
      { name: "prMergeRate", trend: report.trends.trends.prMergeRate },
      { name: "timeToReview", trend: report.trends.trends.timeToReview },
      { name: "activeContributors", trend: report.trends.trends.activeContributors },
      { name: "issueResolution", trend: report.trends.trends.issueResolution }
    ];
    trends.forEach(({ name, trend }) => {
      this.totalChecks++;
      const calculatedDelta = trend.current - trend.previous;
      const reportedDelta = trend.delta;
      if (Math.abs(calculatedDelta - reportedDelta) > 0.01) {
        this.errors.push({
          field: `trends.trends.${name}.delta`,
          message: "Trend delta does not match current - previous",
          expected: calculatedDelta.toFixed(2),
          actual: reportedDelta.toFixed(2)
        });
      } else {
        this.passedChecks++;
      }
      this.totalChecks++;
      const expectedTrend = Math.abs(calculatedDelta) < trend.current * 0.05 ? "stable" : calculatedDelta > 0 ? "improving" : "declining";
      if (trend.trend !== expectedTrend) {
        this.warnings.push({
          field: `trends.trends.${name}.trend`,
          message: `Trend direction may be incorrect (delta: ${calculatedDelta.toFixed(2)}, marked as: ${trend.trend})`,
          severity: "low",
          suggestion: `Expected: ${expectedTrend}`
        });
      } else {
        this.passedChecks++;
      }
    });
  }
  /**
   * Validate ratios and correlations
   */
  validateRatios(report) {
    this.totalChecks++;
    const issueVsPrRatio = report.labels.issueVsPrratio;
    if (issueVsPrRatio < 0) {
      this.errors.push({
        field: "labels.issueVsPrratio",
        message: "Issue to PR ratio cannot be negative",
        expected: ">= 0",
        actual: issueVsPrRatio
      });
    } else {
      this.passedChecks++;
    }
    if (report.correlations) {
      this.totalChecks++;
      const correlation = report.correlations.prSizeVsTimeToMerge.correlation;
      if (correlation < -1 || correlation > 1) {
        this.errors.push({
          field: "correlations.prSizeVsTimeToMerge.correlation",
          message: "Correlation coefficient out of valid range",
          expected: "-1 to 1",
          actual: correlation
        });
      } else {
        this.passedChecks++;
      }
      const small = report.correlations.prSizeVsTimeToMerge.smallPRs;
      const medium = report.correlations.prSizeVsTimeToMerge.mediumPRs;
      const large = report.correlations.prSizeVsTimeToMerge.largePRs;
      this.totalChecks++;
      if (small.avgDays > medium.avgDays || medium.avgDays > large.avgDays) {
        this.warnings.push({
          field: "correlations.prSizeVsTimeToMerge",
          message: "Unexpected pattern: smaller PRs take longer than larger PRs",
          severity: "medium",
          suggestion: "This unusual pattern may indicate process issues or data quality problems"
        });
      } else {
        this.passedChecks++;
      }
    }
  }
  /**
   * Generate a validation summary report
   */
  generateSummary(result) {
    const { valid, errors, warnings, metadata } = result;
    let summary = "# Analytics Report Validation Summary\n\n";
    summary += `**Status:** ${valid ? "✅ PASSED" : "❌ FAILED"}

`;
    summary += `**Checks:** ${metadata.passedChecks}/${metadata.totalChecks} passed
`;
    summary += `**Errors:** ${metadata.failedChecks}
`;
    summary += `**Warnings:** ${metadata.warningChecks}

`;
    if (errors.length > 0) {
      summary += "## ❌ Errors\n\n";
      errors.forEach((error, i) => {
        summary += `${i + 1}. **${error.field}**
`;
        summary += `   - ${error.message}
`;
        summary += `   - Expected: ${error.expected}, Got: ${error.actual}

`;
      });
    }
    if (warnings.length > 0) {
      summary += "## ⚠️  Warnings\n\n";
      warnings.forEach((warning, i) => {
        const icon = warning.severity === "high" ? "🔴" : warning.severity === "medium" ? "🟡" : "🟢";
        summary += `${i + 1}. ${icon} **${warning.field}** (${warning.severity})
`;
        summary += `   - ${warning.message}
`;
        if (warning.suggestion) {
          summary += `   - 💡 ${warning.suggestion}
`;
        }
        summary += "\n";
      });
    }
    if (valid) {
      summary += "---\n\n";
      summary += "✅ **All validation checks passed!** The report data is numerically consistent.\n";
    }
    return summary;
  }
}
const INDUSTRY_BENCHMARKS = {
  prMergeRate: {
    p10: 20,
    p25: 35,
    p50: 45,
    p75: 60,
    p90: 75
  },
  timeToFirstReview: {
    // Hours
    p10: 48,
    p25: 24,
    p50: 12,
    p75: 6,
    p90: 2
  },
  reviewCoverage: {
    p10: 40,
    p25: 55,
    p50: 72,
    p75: 85,
    p90: 95
  },
  busFactor: {
    p10: 1,
    p25: 2,
    p50: 3,
    p75: 5,
    p90: 8
  },
  issueResolutionDays: {
    p10: 60,
    p25: 30,
    p50: 14,
    p75: 7,
    p90: 3
  },
  deploymentsPerMonth: {
    p10: 0.5,
    p25: 1,
    p50: 2,
    p75: 4,
    p90: 8
  }
};
class BenchmarkingEngine {
  /**
   * Compare a repository's metrics against industry benchmarks
   */
  async compareToBenchmarks(report) {
    logger.info("Comparing repository metrics to industry benchmarks...");
    const prMergeRate = this.scoreMetric(
      report.activity.prMergeRate.mergeRate,
      INDUSTRY_BENCHMARKS.prMergeRate,
      "higher-is-better",
      "PR Merge Rate"
    );
    const timeToFirstReview = this.scoreMetric(
      report.health.timeToFirstReview.averageHours,
      INDUSTRY_BENCHMARKS.timeToFirstReview,
      "lower-is-better",
      "Time to First Review"
    );
    const reviewCoverage = this.scoreMetric(
      report.health.prReviewCoverage.coveragePercentage,
      INDUSTRY_BENCHMARKS.reviewCoverage,
      "higher-is-better",
      "Review Coverage"
    );
    const busFactor = this.scoreMetric(
      report.contributors.busFactor,
      INDUSTRY_BENCHMARKS.busFactor,
      "higher-is-better",
      "Bus Factor"
    );
    const issueResolution = this.scoreMetric(
      report.activity.issueResolutionTime.averageHours / 24,
      // Convert to days
      INDUSTRY_BENCHMARKS.issueResolutionDays,
      "lower-is-better",
      "Issue Resolution Time (Days)"
    );
    const monthlyDeployments = this.estimateMonthlyDeployments(report.health.deploymentFrequency);
    const deploymentFrequency = this.scoreMetric(
      monthlyDeployments,
      INDUSTRY_BENCHMARKS.deploymentsPerMonth,
      "higher-is-better",
      "Deployment Frequency"
    );
    const metrics = {
      prMergeRate,
      timeToFirstReview,
      reviewCoverage,
      busFactor,
      issueResolution,
      deploymentFrequency
    };
    const weights = {
      prMergeRate: 0.2,
      timeToFirstReview: 0.2,
      reviewCoverage: 0.15,
      busFactor: 0.15,
      issueResolution: 0.15,
      deploymentFrequency: 0.15
    };
    const overallScore = prMergeRate.percentile * weights.prMergeRate + timeToFirstReview.percentile * weights.timeToFirstReview + reviewCoverage.percentile * weights.reviewCoverage + busFactor.percentile * weights.busFactor + issueResolution.percentile * weights.issueResolution + deploymentFrequency.percentile * weights.deploymentFrequency;
    const strengths = this.identifyStrengths(metrics);
    const weaknesses = this.identifyWeaknesses(metrics);
    const recommendations = this.generateRecommendations(metrics, report);
    return {
      repository: report.repository,
      metrics,
      overallScore: Math.round(overallScore),
      strengths,
      weaknesses,
      recommendations
    };
  }
  /**
   * Score a metric against benchmark percentiles
   */
  scoreMetric(value, benchmarks, direction, metricName) {
    let percentile;
    if (direction === "higher-is-better") {
      if (value >= benchmarks.p90) percentile = 95;
      else if (value >= benchmarks.p75) percentile = 80;
      else if (value >= benchmarks.p50) percentile = 60;
      else if (value >= benchmarks.p25) percentile = 35;
      else if (value >= benchmarks.p10) percentile = 15;
      else percentile = 5;
    } else {
      if (value <= benchmarks.p90) percentile = 95;
      else if (value <= benchmarks.p75) percentile = 80;
      else if (value <= benchmarks.p50) percentile = 60;
      else if (value <= benchmarks.p25) percentile = 35;
      else if (value <= benchmarks.p10) percentile = 15;
      else percentile = 5;
    }
    const rating = percentile >= 90 ? "excellent" : percentile >= 75 ? "good" : percentile >= 50 ? "average" : percentile >= 25 ? "below_average" : "poor";
    const description = `${metricName}: ${this.formatValue(value, metricName)} (${this.getRatingEmoji(rating)} ${rating}, ${percentile}th percentile)`;
    return {
      value,
      median: benchmarks.p50,
      percentile,
      rating,
      description
    };
  }
  /**
   * Format metric value for display
   */
  formatValue(value, metricName) {
    if (metricName.includes("Rate") || metricName.includes("Coverage")) {
      return `${value.toFixed(1)}%`;
    } else if (metricName.includes("(Days)")) {
      return `${value.toFixed(1)}d`;
    } else if (metricName.includes("Time") || metricName.includes("Resolution")) {
      return value < 24 ? `${value.toFixed(1)}h` : `${(value / 24).toFixed(1)}d`;
    } else if (metricName.includes("Frequency")) {
      return `${value.toFixed(1)}/month`;
    } else {
      return value.toFixed(0);
    }
  }
  /**
   * Get emoji for rating
   */
  getRatingEmoji(rating) {
    switch (rating) {
      case "excellent":
        return "🟢";
      case "good":
        return "🟡";
      case "average":
        return "⚪";
      case "below_average":
        return "🟠";
      case "poor":
        return "🔴";
      default:
        return "⚪";
    }
  }
  /**
   * Estimate monthly deployment frequency
   */
  estimateMonthlyDeployments(frequency) {
    if (frequency.period === "monthly") {
      return frequency.releases;
    } else if (frequency.period === "weekly") {
      return frequency.releases * 4.3;
    } else {
      return frequency.releases;
    }
  }
  /**
   * Identify key strengths (metrics at 75th percentile or higher)
   */
  identifyStrengths(metrics) {
    const strengths = [];
    Object.entries(metrics).forEach(([, metric]) => {
      if (metric.value <= 0) return;
      if (metric.percentile >= 75) {
        strengths.push(metric.description);
      }
    });
    if (strengths.length === 0) {
      strengths.push("No metrics performing above 75th percentile");
    }
    return strengths;
  }
  /**
   * Identify key weaknesses (metrics below 50th percentile)
   */
  identifyWeaknesses(metrics) {
    const weaknesses = [];
    Object.entries(metrics).forEach(([, metric]) => {
      if (metric.percentile < 50) {
        weaknesses.push(metric.description);
      }
    });
    if (weaknesses.length === 0) ;
    return weaknesses;
  }
  /**
   * Generate actionable recommendations based on benchmarks
   */
  generateRecommendations(metrics, report) {
    const recommendations = [];
    if (metrics.prMergeRate.percentile < 50) {
      const gap = Math.round(metrics.prMergeRate.median - metrics.prMergeRate.value);
      recommendations.push(
        `🎯 Improve PR merge rate by ${gap}% to reach industry median. Current: ${metrics.prMergeRate.value.toFixed(1)}%, Target: ${metrics.prMergeRate.median}%`
      );
      if (report.reviewVelocity && report.reviewVelocity.reviewBottlenecks.length > 0) {
        recommendations.push(
          `   → Address ${report.reviewVelocity.reviewBottlenecks.length} stalled PRs to improve merge rate`
        );
      }
    }
    if (metrics.timeToFirstReview.percentile < 50) {
      const current = metrics.timeToFirstReview.value;
      const target = metrics.timeToFirstReview.median;
      recommendations.push(
        `⏱️  Reduce time to first review from ${current.toFixed(1)}h to ${target}h (industry median)`
      );
      if (report.reviewVelocity) {
        const topReviewer = report.reviewVelocity.reviewerLoadDistribution[0];
        if (topReviewer && topReviewer.reviewCount > 15) {
          recommendations.push(
            `   → Distribute review load: @${topReviewer.reviewer} handles ${topReviewer.reviewCount} reviews (potential bottleneck)`
          );
        }
      }
    }
    if (metrics.reviewCoverage.percentile < 75) {
      const gap = Math.round(INDUSTRY_BENCHMARKS.reviewCoverage.p75 - metrics.reviewCoverage.value);
      if (gap > 0) {
        recommendations.push(
          `👁️  Increase review coverage by ${gap}% to reach 75th percentile (${INDUSTRY_BENCHMARKS.reviewCoverage.p75}%)`
        );
      }
    }
    if (metrics.busFactor.rating === "poor" || metrics.busFactor.value < 3) {
      recommendations.push(
        `🚨 CRITICAL: Bus factor is ${metrics.busFactor.value} (risky). Aim for at least 3-5 core contributors`
      );
      recommendations.push(
        `   → ${report.contributors.topContributors[0]?.login || "Top contributor"} contributes ${(report.contributors.contributionDistribution[0]?.percentage || 0).toFixed(0)}% of work`
      );
    }
    if (metrics.issueResolution.percentile < 50) {
      const currentDays = metrics.issueResolution.value;
      const targetDays = metrics.issueResolution.median;
      recommendations.push(
        `📊 Reduce issue resolution time from ${currentDays.toFixed(1)} days to ${targetDays} days`
      );
      if (report.labels && report.labels.labelDistribution.length > 0) {
        recommendations.push(
          `   → Use labels to triage: ${report.labels.mostCommonLabels.slice(0, 3).join(", ")} are most common`
        );
      }
    }
    if (metrics.deploymentFrequency.percentile < 50) {
      recommendations.push(
        `🚀 Increase deployment frequency to at least ${metrics.deploymentFrequency.median.toFixed(1)}/month`
      );
      recommendations.push(
        `   → Consider automated releases for merged PRs or weekly release cadence`
      );
    }
    if (metrics.prMergeRate.rating === "excellent" && metrics.timeToFirstReview.rating === "excellent") {
      recommendations.push(
        `🌟 Excellent review culture! Consider sharing your practices with the community`
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        `✨ All metrics are above median. Focus on maintaining current quality standards`
      );
    }
    return recommendations;
  }
  /**
   * Generate a detailed benchmark report in markdown
   */
  generateBenchmarkReport(comparison) {
    let report = `# 🏆 Industry Benchmark Comparison

`;
    report += `**Repository:** ${comparison.repository}
`;
    report += `**Overall Score:** ${comparison.overallScore}/100

`;
    report += `---

`;
    report += `## 📊 Metrics Comparison

`;
    report += `Compared against industry benchmarks from similar-sized open source projects:

`;
    report += `| Metric | Your Value | Median | Percentile | Rating |
`;
    report += `|--------|------------|--------|------------|--------|
`;
    Object.entries(comparison.metrics).forEach(([key, metric]) => {
      const metricName = key.replace(/([A-Z])/g, " $1").trim();
      const capitalizedName = metricName.charAt(0).toUpperCase() + metricName.slice(1);
      report += `| ${capitalizedName} | ${this.formatValue(metric.value, key)} | ${this.formatValue(metric.median, key)} | ${metric.percentile}th | ${this.getRatingEmoji(metric.rating)} ${metric.rating} |
`;
    });
    report += `
`;
    report += `## 💪 Strengths

`;
    comparison.strengths.forEach((strength) => {
      report += `- ${strength}
`;
    });
    report += `
`;
    report += `## 🎯 Areas for Improvement

`;
    comparison.weaknesses.forEach((weakness) => {
      report += `- ${weakness}
`;
    });
    report += `
`;
    report += `## 💡 Recommendations

`;
    comparison.recommendations.forEach((rec, i) => {
      report += `${i + 1}. ${rec}
`;
    });
    report += `
`;
    report += `---

`;
    report += `### Radar Chart (Text Representation)

`;
    report += this.generateRadarChart(comparison.metrics);
    return report;
  }
  /**
   * Generate a text-based radar chart
   */
  generateRadarChart(metrics) {
    const chart = `\`\`\`
        Review Speed
             ${this.getPercentileBar(metrics.timeToFirstReview.percentile)}
                ╱╲
               ╱  ╲
     Bus      ╱    ╲     Coverage
    Factor   ${this.getPercentileBar(metrics.busFactor.percentile)}──────${this.getPercentileBar(metrics.reviewCoverage.percentile)}
              ╲    ╱
               ╲  ╱
                ╲╱
            Merge Rate
              ${this.getPercentileBar(metrics.prMergeRate.percentile)}
\`\`\`

`;
    return chart;
  }
  /**
   * Get a visual bar for percentile (0-100)
   */
  getPercentileBar(percentile) {
    const blocks = Math.round(percentile / 10);
    return "█".repeat(Math.max(1, blocks));
  }
}
class NarrativeGenerator {
  /**
   * Generate executive narrative from analytics report
   */
  async generate(report, benchmark) {
    logger.info("Generating executive narrative...");
    const paradoxes = this.detectParadoxes(report);
    const rootCauses = this.analyzeRootCauses(report, paradoxes);
    const actionPlan = this.prioritizeActions(report, rootCauses, benchmark);
    const keyFindings = this.extractKeyFindings(report, benchmark);
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
      projectedOutcome
    };
  }
  /**
   * Detect paradoxes (conflicting or unexpected metric combinations)
   */
  detectParadoxes(report) {
    const paradoxes = [];
    const reviewCoverage = report.health.prReviewCoverage.coveragePercentage;
    const mergeRate = report.activity.prMergeRate.mergeRate;
    if (reviewCoverage >= 90 && mergeRate < 40) {
      const timeToReview = report.health.timeToFirstReview.averageHours;
      if (timeToReview > 0) {
        paradoxes.push({
          title: "The Review Culture Paradox",
          description: `${report.repository} exhibits excellent review culture (${reviewCoverage.toFixed(0)}% coverage) with fast review times (${timeToReview.toFixed(1)}h average), yet only ${mergeRate.toFixed(0)}% of PRs get merged—significantly below expectations. This suggests PRs are getting stuck *after* review, not during review.`,
          metrics: [
            `Review Coverage: ${reviewCoverage.toFixed(0)}%`,
            `Merge Rate: ${mergeRate.toFixed(0)}%`,
            `Time to First Review: ${timeToReview.toFixed(1)}h`
          ]
        });
      }
    }
    if (report.reviewVelocity) {
      const timeToFirstReview = report.reviewVelocity.timeToFirstReview.averageHours;
      const timeToApproval = report.reviewVelocity.timeToApproval.averageDays;
      if (timeToFirstReview < 6 && timeToApproval > 5) {
        paradoxes.push({
          title: "The Approval Delay Paradox",
          description: `Reviews start quickly (${timeToFirstReview.toFixed(1)}h to first review) but take ${timeToApproval.toFixed(1)} days to reach approval. This suggests multiple review rounds or reviewer unavailability.`,
          metrics: [
            `Time to First Review: ${timeToFirstReview.toFixed(1)}h`,
            `Time to Approval: ${timeToApproval.toFixed(1)} days`
          ]
        });
      }
    }
    const contributorCount = report.contributors.topContributors.length;
    const busFactor = report.contributors.busFactor;
    if (contributorCount > 20 && busFactor < 3) {
      paradoxes.push({
        title: "The Contribution Concentration Paradox",
        description: `Despite having ${contributorCount} contributors, the project's bus factor is only ${busFactor}. This indicates extreme concentration of work among a few individuals, creating high risk.`,
        metrics: [
          `Total Contributors: ${contributorCount}`,
          `Bus Factor: ${busFactor}`,
          `Top Contributor Share: ${report.contributors.contributionDistribution[0]?.percentage.toFixed(0)}%`
        ]
      });
    }
    if (report.trends) {
      const decliningMetrics = Object.entries(report.trends.trends).filter(
        ([_, trend]) => trend.trend === "declining"
      );
      if (decliningMetrics.length >= 3) {
        paradoxes.push({
          title: "The Declining Velocity Paradox",
          description: `Multiple key metrics are declining simultaneously, suggesting systemic issues rather than isolated problems. ${decliningMetrics.length} out of 4 trend metrics show negative trajectory.`,
          metrics: decliningMetrics.map(
            ([name, trend]) => `${name}: ${trend.previous.toFixed(1)} → ${trend.current.toFixed(1)} (${trend.delta > 0 ? "+" : ""}${trend.delta.toFixed(1)})`
          )
        });
      }
    }
    return paradoxes;
  }
  /**
   * Analyze root causes from paradoxes and metrics
   */
  analyzeRootCauses(report, paradoxes) {
    const rootCauses = [];
    if (paradoxes.some((p) => p.title.includes("Review Culture Paradox"))) {
      const evidence = [];
      if (report.reviewVelocity && report.reviewVelocity.reviewBottlenecks.length > 0) {
        const changesRequested = report.reviewVelocity.reviewBottlenecks.filter(
          (b) => b.status === "changes_requested"
        ).length;
        const approvedPending = report.reviewVelocity.reviewBottlenecks.filter(
          (b) => b.status === "approved_pending_merge"
        ).length;
        if (changesRequested > 0) {
          evidence.push(`${changesRequested} PRs waiting on author to address review comments`);
        }
        if (approvedPending > 0) {
          evidence.push(`${approvedPending} approved PRs not yet merged (average wait: ${report.reviewVelocity.reviewBottlenecks.filter((b) => b.status === "approved_pending_merge").reduce((sum, b) => sum + b.waitingDays, 0) / approvedPending || 0} days)`);
        }
      }
      evidence.push(`Merge rate (${report.activity.prMergeRate.mergeRate.toFixed(0)}%) significantly below review coverage (${report.health.prReviewCoverage.coveragePercentage.toFixed(0)}%)`);
      rootCauses.push({
        issue: "PRs stalling after review",
        hypothesis: "Authors abandon PRs after receiving review feedback, or approved PRs wait too long for maintainer bandwidth to merge",
        evidence,
        confidence: "high"
      });
    }
    if (report.reviewVelocity && report.reviewVelocity.reviewerLoadDistribution.length > 0) {
      const topReviewer = report.reviewVelocity.reviewerLoadDistribution[0];
      const totalReviews = report.reviewVelocity.reviewerLoadDistribution.reduce(
        (sum, r) => sum + r.reviewCount,
        0
      );
      const topReviewerShare = topReviewer.reviewCount / totalReviews * 100;
      if (topReviewerShare > 40) {
        rootCauses.push({
          issue: "Reviewer load imbalance",
          hypothesis: `${topReviewer.reviewer} handles ${topReviewerShare.toFixed(0)}% of all reviews, creating a bottleneck`,
          evidence: [
            `${topReviewer.reviewer}: ${topReviewer.reviewCount} reviews (${topReviewerShare.toFixed(0)}% of total)`,
            `Average response time: ${topReviewer.averageResponseHours.toFixed(1)}h`,
            `${report.reviewVelocity.reviewerLoadDistribution.length} active reviewers (load distribution needed)`
          ],
          confidence: "high"
        });
      }
    }
    const deploymentFreq = report.health.deploymentFrequency.releases;
    if (deploymentFreq < 2 && report.activity.prMergeRate.merged > 10) {
      rootCauses.push({
        issue: "Low deployment frequency despite active development",
        hypothesis: "Manual release process or CI/CD pipeline may be bottleneck preventing frequent deployments",
        evidence: [
          `Only ${deploymentFreq} releases in analysis period`,
          `${report.activity.prMergeRate.merged} PRs merged but not released`,
          `Potential ${(report.activity.prMergeRate.merged / Math.max(deploymentFreq, 1)).toFixed(0)} PRs per release`
        ],
        confidence: "medium"
      });
    }
    if (report.trends && report.trends.trends.activeContributors.trend === "declining") {
      rootCauses.push({
        issue: "Declining contributor base",
        hypothesis: "Contributors may be leaving due to slow review times, difficult contribution process, or project direction concerns",
        evidence: [
          `Active contributors: ${report.trends.trends.activeContributors.previous} → ${report.trends.trends.activeContributors.current} (${report.trends.trends.activeContributors.delta})`,
          `New contributors: ${report.contributors.newVsReturning.new} vs Returning: ${report.contributors.newVsReturning.returning}`
        ],
        confidence: "medium"
      });
    }
    return rootCauses;
  }
  /**
   * Prioritize actions based on impact and urgency
   */
  prioritizeActions(report, rootCauses, benchmark) {
    const actions = [];
    if (report.contributors.busFactor < 2) {
      actions.push({
        priority: 1,
        action: "Urgently expand core contributor base",
        rationale: `Bus factor of ${report.contributors.busFactor} creates critical project risk. If ${report.contributors.topContributors[0]?.login || "top contributor"} becomes unavailable, project continuity is threatened.`,
        expectedImpact: "Reduce project risk from critical to moderate",
        timeframe: "Immediate (this week)"
      });
    }
    if (report.reviewVelocity && report.reviewVelocity.reviewBottlenecks.length > 5) {
      actions.push({
        priority: 1,
        action: `Audit and resolve ${report.reviewVelocity.reviewBottlenecks.length} stalled PRs`,
        rationale: `PRs waiting >3 days represent blocked work and frustrated contributors. Quick wins available by clearing backlog.`,
        expectedImpact: `Improve merge rate by ~${Math.round(report.reviewVelocity.reviewBottlenecks.length / report.health.prReviewCoverage.total * 100)}%`,
        timeframe: "This week"
      });
    }
    if (rootCauses.some((rc) => rc.issue.includes("Reviewer load imbalance"))) {
      const topReviewer = report.reviewVelocity?.reviewerLoadDistribution[0];
      actions.push({
        priority: 2,
        action: "Implement reviewer load balancing",
        rationale: `${topReviewer?.reviewer || "Top reviewer"} handles disproportionate review load. Distribute reviews among ${report.reviewVelocity?.reviewerLoadDistribution.length || "multiple"} maintainers.`,
        expectedImpact: "Reduce bottleneck, improve review speed by 30-40%",
        timeframe: "2-4 weeks"
      });
    }
    if (report.trends && report.trends.trends.prMergeRate.trend === "declining") {
      actions.push({
        priority: 2,
        action: "Implement auto-merge for approved PRs",
        rationale: "Merge rate declining while review coverage remains high. Automate the merge step for approved PRs passing CI.",
        expectedImpact: "Increase merge rate by 15-20%",
        timeframe: "2 weeks"
      });
    }
    if (benchmark && benchmark.metrics.deploymentFrequency.percentile < 50) {
      actions.push({
        priority: 3,
        action: "Increase deployment cadence",
        rationale: `Current: ${benchmark.metrics.deploymentFrequency.value.toFixed(1)}/month, Industry median: ${benchmark.metrics.deploymentFrequency.median.toFixed(1)}/month`,
        expectedImpact: "Faster feedback loops, improved velocity",
        timeframe: "1-2 months"
      });
    }
    if (report.activity.issueResolutionTime.averageHours / 24 > 14) {
      actions.push({
        priority: 3,
        action: "Improve issue triage process",
        rationale: `Average issue resolution time is ${(report.activity.issueResolutionTime.averageHours / 24).toFixed(1)} days. Implement SLA-based triage with labels.`,
        expectedImpact: "Reduce resolution time by 30-40%",
        timeframe: "1 month"
      });
    }
    return actions.sort((a, b) => a.priority - b.priority);
  }
  /**
   * Extract key findings
   */
  extractKeyFindings(report, benchmark) {
    const findings = [];
    if (report.trends) {
      const improving = Object.entries(report.trends.trends).filter(([_, t]) => t.trend === "improving");
      const declining = Object.entries(report.trends.trends).filter(([_, t]) => t.trend === "declining");
      if (declining.length > improving.length) {
        findings.push(`📉 **Velocity declining**: ${declining.length} out of 4 key metrics show negative trends`);
      } else if (improving.length > declining.length) {
        findings.push(`📈 **Velocity improving**: ${improving.length} out of 4 key metrics show positive trends`);
      }
    }
    if (report.reviewVelocity) {
      const p90Hours = report.reviewVelocity.timeToFirstReview.p90Hours;
      if (p90Hours > 0) {
        if (p90Hours > 24) {
          findings.push(`10% of PRs wait ${p90Hours.toFixed(0)}+ hours for first review (p90)`);
        } else if (p90Hours < 4) {
          findings.push(`Exceptional review speed: 90% of PRs reviewed within ${p90Hours.toFixed(1)}h`);
        } else {
          findings.push(`Average review speed: 90% of PRs reviewed within ${p90Hours.toFixed(1)}h`);
        }
      }
    }
    if (benchmark) {
      const excellentMetrics = Object.entries(benchmark.metrics).filter(
        ([_, m]) => m.rating === "excellent"
      ).length;
      const poorMetrics = Object.entries(benchmark.metrics).filter(
        ([_, m]) => m.rating === "poor"
      ).length;
      if (excellentMetrics >= 3) {
        findings.push(`🌟 **${excellentMetrics} metrics at excellent level** (90th+ percentile)`);
      }
      if (poorMetrics >= 2) {
        findings.push(`🔴 **${poorMetrics} metrics below industry standards** (require immediate attention)`);
      }
    }
    const topContribPercentage = report.contributors.contributionDistribution[0]?.percentage || 0;
    if (topContribPercentage > 50) {
      findings.push(`⚠️  **Single contributor dominance**: ${report.contributors.topContributors[0]?.login || "Top contributor"} accounts for ${topContribPercentage.toFixed(0)}% of contributions`);
    }
    return findings;
  }
  /**
   * Generate executive summary
   */
  generateSummary(report, findings, paradoxes) {
    const repoName = report.repository.split("/")[1] || report.repository;
    let summary = `# Executive Summary: ${repoName}

`;
    if (paradoxes.length > 0) {
      const mainParadox = paradoxes[0];
      summary += `**${repoName} is experiencing ${mainParadox.title.toLowerCase()}.**

`;
      summary += `${mainParadox.description}

`;
    } else {
      summary += `**${repoName} demonstrates healthy development practices** with ${report.health.prReviewCoverage.coveragePercentage.toFixed(0)}% review coverage and ${report.activity.prMergeRate.mergeRate.toFixed(0)}% PR merge rate.

`;
    }
    summary += `## Key Observations

`;
    findings.forEach((finding) => {
      summary += `- ${finding}
`;
    });
    return summary;
  }
  /**
   * Assess project risk
   */
  assessRisk(report) {
    const risks = [];
    let riskLevel = "low";
    if (report.contributors.busFactor < 2) {
      risks.push(`🔴 **Critical dependency risk**: Bus factor is ${report.contributors.busFactor}`);
      riskLevel = "critical";
    } else if (report.contributors.busFactor < 3) {
      risks.push(`🟠 **High dependency risk**: Bus factor is only ${report.contributors.busFactor}`);
      if (riskLevel === "low") riskLevel = "high";
    }
    if (report.trends && report.trends.trends.prMergeRate.trend === "declining") {
      const velocityDrop = Math.abs(report.trends.trends.prMergeRate.delta);
      if (velocityDrop > 20) {
        risks.push(`🟠 **Velocity collapse risk**: Merge rate dropped ${velocityDrop.toFixed(0)}% in 30 days`);
        if (riskLevel !== "critical") riskLevel = "high";
      }
    }
    if (report.trends && report.trends.trends.activeContributors.trend === "declining") {
      risks.push(`🟡 **Contributor retention risk**: Active contributors declining`);
      if (riskLevel === "low") riskLevel = "medium";
    }
    if (risks.length === 0) {
      return `**Risk Level: 🟢 Low**

No critical risks detected. Project appears healthy with good contribution patterns and review culture.`;
    }
    let assessment = `**Risk Level: ${riskLevel === "critical" ? "🔴 Critical" : riskLevel === "high" ? "🟠 High" : riskLevel === "medium" ? "🟡 Medium" : "🟢 Low"}**

`;
    risks.forEach((risk) => {
      assessment += `- ${risk}
`;
    });
    return assessment;
  }
  /**
   * Project outcome if no action taken
   */
  projectOutcome(report, actionPlan) {
    let projection = `## Projected Outcome

`;
    if (actionPlan.some((a) => a.priority === 1)) {
      projection += `**If no action is taken:**

`;
      if (report.trends && report.trends.trends.prMergeRate.trend === "declining") {
        const currentRate = report.trends.trends.prMergeRate.current;
        const delta = report.trends.trends.prMergeRate.delta;
        if (Math.abs(delta) > 5) {
          const projectedRate = Math.max(0, currentRate + delta * 2);
          projection += `- Merge rate will drop to ~${projectedRate.toFixed(0)}% within 60 days (from ${currentRate.toFixed(0)}%)
`;
        }
      }
      if (report.contributors.busFactor < 2) {
        projection += `- Project continuity remains at critical risk
`;
      }
      if (report.reviewVelocity && report.reviewVelocity.reviewBottlenecks.length > 5) {
        projection += `- Contributor frustration will increase, potentially leading to abandonment
`;
      }
      projection += `
**If priority actions are taken:**

`;
      actionPlan.slice(0, 3).forEach((action) => {
        projection += `- ${action.expectedImpact}
`;
      });
    } else {
      projection += `**Current trajectory:** Stable to improving. Continue monitoring key metrics and maintain current practices.
`;
    }
    return projection;
  }
  /**
   * Generate full markdown narrative report
   */
  generateMarkdownReport(narrative) {
    let report = narrative.summary + "\n\n";
    if (narrative.paradoxes.length > 0) {
      report += `## 🔍 Detected Paradoxes

`;
      narrative.paradoxes.forEach((paradox, i) => {
        report += `### ${i + 1}. ${paradox.title}

`;
        report += `${paradox.description}

`;
        report += `**Supporting Metrics:**
`;
        paradox.metrics.forEach((metric) => {
          report += `- ${metric}
`;
        });
        report += `
`;
      });
    }
    if (narrative.rootCauses.length > 0) {
      report += `## 🎯 Root Cause Analysis

`;
      narrative.rootCauses.forEach((cause, i) => {
        const confidenceIcon = cause.confidence === "high" ? "🔴" : cause.confidence === "medium" ? "🟡" : "🟢";
        report += `### ${i + 1}. ${cause.issue} (Confidence: ${confidenceIcon} ${cause.confidence})

`;
        report += `**Hypothesis:** ${cause.hypothesis}

`;
        report += `**Evidence:**
`;
        cause.evidence.forEach((evidence) => {
          report += `- ${evidence}
`;
        });
        report += `
`;
      });
    }
    report += `## 🚀 Recommended Action Plan

`;
    const priorityLabels = { 1: "🔴 Critical", 2: "🟡 Important", 3: "🟢 Nice-to-have" };
    narrative.actionPlan.forEach((action, i) => {
      report += `### ${i + 1}. ${action.action} (${priorityLabels[action.priority]})

`;
      report += `- **Rationale:** ${action.rationale}
`;
      report += `- **Expected Impact:** ${action.expectedImpact}
`;
      report += `- **Timeframe:** ${action.timeframe}

`;
    });
    report += `---

`;
    report += narrative.riskAssessment + "\n\n";
    report += `---

`;
    report += narrative.projectedOutcome + "\n";
    return report;
  }
}
class HtmlReportGenerator {
  /**
   * Convert markdown content to styled HTML
   */
  async generateHtml(markdownContent, title = "Analytics Report") {
    try {
      const htmlContent = await marked(markdownContent);
      const styledHtml = this.wrapWithStyles(htmlContent, title);
      return styledHtml;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Failed to generate HTML report: ${errorMsg}`);
      throw error;
    }
  }
  wrapWithStyles(htmlContent, title) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 40px 20px;
    }

    @media (max-width: 768px) {
      body {
        padding: 20px 10px;
      }
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 60px 50px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }

    @media (max-width: 768px) {
      .container {
        padding: 30px 20px;
      }
    }

    h1 {
      font-size: 2.5em;
      margin-bottom: 0.3em;
      color: #1a1a1a;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 0.3em;
    }

    h2 {
      font-size: 1.8em;
      margin: 1em 0 0.5em 0;
      color: #0066cc;
      border-left: 4px solid #0066cc;
      padding-left: 1em;
    }

    h3 {
      font-size: 1.1em;
      margin: 0.6em 0 0.3em 0;
      color: #333;
    }

    h4 {
      font-size: 0.95em;
      margin: 0.5em 0 0.25em 0;
      color: #555;
    }

    p {
      margin-bottom: 1em;
      text-align: justify;
    }

    code {
      background: #f0f0f0;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #d63384;
    }

    pre {
      background: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 1em;
      margin: 1em 0;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      line-height: 1.4;
    }

    pre code {
      background: none;
      padding: 0;
      color: #333;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 0.95em;
    }

    th {
      background: #f0f0f0;
      padding: 0.8em;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
      color: #333;
    }

    td {
      padding: 0.8em;
      border-bottom: 1px solid #ddd;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:nth-child(even) {
      background: #f9f9f9;
    }

    ul, ol {
      margin-left: 2em;
      margin-bottom: 1em;
    }

    li {
      margin-bottom: 0.3em;
    }

    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1em;
      margin: 1em 0;
      color: #666;
      font-style: italic;
    }

    strong {
      font-weight: 600;
      color: #1a1a1a;
    }

    em {
      font-style: italic;
      color: #555;
    }

    hr {
      border: none;
      border-top: 2px solid #eee;
      margin: 2em 0;
    }

    /* Alert/highlight boxes */
    .alert {
      padding: 1em;
      margin: 1em 0;
      border-radius: 4px;
      border-left: 4px solid;
    }

    /* Emoji size reduction */
    em, strong em {
      font-size: 0.9em;
      line-height: 1;
    }

    /* Paragraph spacing in dense sections */
    h2 + p,
    h3 + p {
      margin-top: 0;
    }

    /* Section control for PDF page breaks */
    h2 {
      page-break-inside: avoid;
      margin-bottom: 0.3em;
    }

    h2 + * {
      page-break-before: avoid;
    }

    .section {
      page-break-inside: avoid;
    }

    /* Reduce excessive whitespace */
    h2 {
      margin-top: 1.2em;
    }

    h3 {
      margin-top: 0.8em;
      margin-bottom: 0.2em;
    }

    /* Compact content sections */
    ul, ol {
      margin-top: 0.3em;
      margin-bottom: 0.3em;
    }

    p {
      margin-bottom: 0.5em;
    }

    /* Print styles */
    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        max-width: 100%;
        box-shadow: none;
        padding: 0;
      }

      h1 {
        page-break-after: avoid;
      }

      h2, h3 {
        page-break-after: avoid;
      }

      table {
        page-break-inside: avoid;
      }
    }

    /* Page sizing for PDF */
    @page {
      size: A4;
      margin: 20mm;
    }
  </style>
</head>
<body>
  <div class="container">
    ${htmlContent}
  </div>
</body>
</html>
    `;
  }
  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
class PuppeteerPdfConverter {
  /**
   * Convert HTML content to PDF file
   */
  async convertHtmlToPdf(htmlContent, outputPath) {
    let browser;
    try {
      logger.info(`Converting HTML to PDF: ${outputPath}`);
      await ensureDirectory(dirname(outputPath));
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, {
        waitUntil: "networkidle0",
        timeout: 3e4
      });
      await page.pdf({
        path: outputPath,
        format: "A4",
        margin: {
          top: "20mm",
          bottom: "20mm",
          left: "15mm",
          right: "15mm"
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="width: 100%; font-size: 10px; padding: 10px 20px;">
            <span style="float: left;">GitHub Analytics Report</span>
            <span style="float: right;"><span class="date"></span></span>
          </div>
        `,
        footerTemplate: `
          <div style="width: 100%; font-size: 10px; padding: 10px 20px; text-align: center;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
        printBackground: true
      });
      logger.info(`PDF generated successfully: ${outputPath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Failed to convert HTML to PDF: ${errorMsg}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  /**
   * Convert markdown-generated HTML to PDF
   * This is the main entry point for the PDF conversion pipeline
   */
  async convertMarkdownHtmlToPdf(htmlContent, outputPath, title = "Analytics Report") {
    logger.info(`Starting HTML to PDF conversion for: ${title}`);
    await this.convertHtmlToPdf(htmlContent, outputPath);
  }
}
class AnalyticsProcessor {
  options;
  markdownGenerator;
  // private startTime: number = 0;
  constructor(options) {
    this.options = options;
    this.markdownGenerator = new MarkdownReportGenerator();
  }
  /**
   * Generate a complete analytics report
   */
  async generateReport() {
    const reportStartTime = Date.now();
    logger.info(
      `Generating analytics report for ${this.options.repository.owner}/${this.options.repository.name}...`
    );
    try {
      await ensureDirectory(this.options.outputPath);
      const [activity, contributors, labels, health] = await Promise.all([
        this.generateActivityAnalytics(),
        this.generateContributorAnalytics(),
        this.generateLabelAnalytics(),
        this.generateHealthAnalytics()
      ]);
      logger.info("Generating advanced analytics (Review Velocity, Trends, Correlations, Projections)...");
      const advancedProcessor = new AdvancedAnalyticsProcessor(
        this.options.repository,
        this.options.offline || false,
        this.options.exportedDataPath
      );
      const [reviewVelocity, trends, correlations, projections] = await Promise.all([
        advancedProcessor.generateReviewVelocity(),
        advancedProcessor.generateTemporalTrends(),
        advancedProcessor.generateCorrelations(),
        advancedProcessor.generateProjections()
      ]);
      const report = {
        repository: `${this.options.repository.owner}/${this.options.repository.name}`,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        activity,
        contributors,
        labels,
        health,
        reviewVelocity,
        trends,
        correlations,
        projections
      };
      logger.info("Validating report for numerical consistency...");
      const validator = new ReportValidator();
      const validationResult = validator.validate(report);
      if (!validationResult.valid) {
        logger.warn(`Report validation found ${validationResult.errors.length} errors`);
        const summary = validator.generateSummary(validationResult);
        logger.warn(summary);
      } else if (validationResult.warnings.length > 0) {
        logger.info(`Report validation passed with ${validationResult.warnings.length} warnings`);
      }
      logger.info("Comparing metrics against industry benchmarks...");
      const benchmarkEngine = new BenchmarkingEngine();
      const benchmark = await benchmarkEngine.compareToBenchmarks(report);
      report.benchmark = benchmark;
      logger.info("Generating executive narrative and insights...");
      const narrativeGenerator = new NarrativeGenerator();
      const narrative = await narrativeGenerator.generate(report, benchmark);
      report.narrative = narrative;
      await this.exportReport(report);
      const reportDuration = ((Date.now() - reportStartTime) / 1e3).toFixed(2);
      logger.success(`Analytics report generated in ${reportDuration}s`);
      return report;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Failed to generate analytics report: ${errorMsg}`);
      throw error;
    }
  }
  /**
   * Generate activity analytics
   */
  async generateActivityAnalytics() {
    const startTime = Date.now();
    const result = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.options.repository.owner}/${this.options.repository.name}`,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString(),
        // Last 30 days
        end: (/* @__PURE__ */ new Date()).toISOString()
      },
      commitsOverTime: {
        dates: [],
        counts: []
      },
      prMergeRate: {
        merged: 0,
        closed: 0,
        mergeRate: 0
      },
      issueResolutionTime: {
        averageHours: 0,
        medianHours: 0
      },
      busiestDays: [],
      activeContributors: []
    };
    try {
      let prs;
      let issues;
      if (this.options.offline && this.options.exportedDataPath) {
        logger.info("Using offline mode: parsing exported markdown files...");
        const parser = new MarkdownParser(this.options.exportedDataPath);
        const parsedPRs = await parser.parsePullRequests();
        const parsedIssues = await parser.parseIssues();
        logger.info(
          `📄 Parsed ${parsedPRs.length} PRs, ${parsedIssues.length} issues from markdown files`
        );
        const mergedCount = parsedPRs.filter((pr) => pr.mergedAt).length;
        logger.info(`🔀 Found ${mergedCount} merged PRs`);
        prs = parsedPRs.map((pr) => ({
          number: pr.number,
          state: pr.state === "MERGED" ? "closed" : pr.state.toLowerCase(),
          mergedAt: pr.mergedAt,
          closedAt: pr.closedAt,
          createdAt: pr.createdAt,
          author: { login: pr.author },
          title: pr.title
        }));
        issues = parsedIssues.map((issue) => ({
          number: issue.number,
          state: issue.state.toLowerCase(),
          createdAt: issue.createdAt,
          closedAt: issue.closedAt,
          title: issue.title,
          author: { login: issue.author }
        }));
      } else {
        prs = await execGhJson(
          `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,state,mergedAt,closedAt,createdAt,author,title`,
          { timeout: 3e4, useRateLimit: false, useRetry: false }
        );
        issues = await execGhJson(
          `issue list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,createdAt,closedAt,state,title,author`,
          { timeout: 3e4, useRateLimit: false, useRetry: false }
        );
      }
      const mergedPRs = prs.filter((pr) => pr.mergedAt);
      const closedPRs = prs.filter((pr) => pr.state === "closed" && !pr.mergedAt);
      result.prMergeRate = {
        merged: mergedPRs.length,
        closed: closedPRs.length,
        mergeRate: prs.length > 0 ? mergedPRs.length / prs.length * 100 : 0
      };
      if (issues.length > 0) {
        const resolutionTimes = issues.filter((issue) => issue.closedAt && issue.createdAt).map((issue) => {
          const created = new Date(issue.createdAt);
          const closed = new Date(issue.closedAt);
          const diffMs = closed.getTime() - created.getTime();
          return Math.max(0, diffMs / (1e3 * 60 * 60));
        }).filter((hours) => !isNaN(hours));
        if (resolutionTimes.length > 0) {
          const averageHours = resolutionTimes.reduce((sum, hours) => sum + hours, 0) / resolutionTimes.length;
          const sortedTimes = [...resolutionTimes].sort((a, b) => a - b);
          const medianHours = sortedTimes[Math.floor(sortedTimes.length / 2)] || 0;
          result.issueResolutionTime = {
            averageHours: isNaN(averageHours) ? 0 : averageHours,
            medianHours: isNaN(medianHours) ? 0 : medianHours
          };
        }
      }
      let commits = [];
      if (!this.options.offline) {
        const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1e3);
        commits = await execGhJson(
          `api repos/${this.options.repository.owner}/${this.options.repository.name}/commits?since=${sinceDate.toISOString()}&per_page=100`,
          { timeout: 3e4, useRateLimit: false, useRetry: false }
        );
      } else {
        const prAuthors = /* @__PURE__ */ new Set();
        prs.forEach((pr) => {
          if (pr.author?.login) {
            prAuthors.add(pr.author.login);
          }
        });
        commits = Array.from(prAuthors).map((author) => ({
          commit: {
            author: {
              name: author,
              date: (/* @__PURE__ */ new Date()).toISOString()
            }
          }
        }));
      }
      const commitsByDay = /* @__PURE__ */ new Map();
      commits.forEach((commit) => {
        try {
          const date = new Date(commit.commit.author.date);
          if (!isNaN(date.getTime())) {
            const dateStr = date.toISOString().split("T")[0];
            commitsByDay.set(dateStr, (commitsByDay.get(dateStr) || 0) + 1);
          }
        } catch (e) {
        }
      });
      result.commitsOverTime = {
        dates: Array.from(commitsByDay.keys()),
        counts: Array.from(commitsByDay.values())
      };
      const sortedDays = Array.from(commitsByDay.entries()).sort((a, b) => b[1] - a[1]);
      result.busiestDays = sortedDays.slice(0, 5).map(([day, count]) => ({
        day,
        count
      }));
      const contributors = /* @__PURE__ */ new Set();
      commits.forEach((commit) => {
        if (commit.commit.author.name) {
          contributors.add(commit.commit.author.name);
        }
      });
      result.activeContributors = [
        {
          period: "last_30_days",
          contributors: contributors.size
        }
      ];
      result.success = true;
      result.duration = Date.now() - startTime;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMsg);
      logger.error(`Activity analytics failed: ${errorMsg}`);
    }
    result.duration = Date.now() - startTime;
    return result;
  }
  /**
   * Generate contributor analytics
   */
  async generateContributorAnalytics() {
    const startTime = Date.now();
    const result = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.options.repository.owner}/${this.options.repository.name}`,
      topContributors: [],
      newVsReturning: {
        new: 0,
        returning: 0
      },
      contributionDistribution: [],
      busFactor: 0
    };
    try {
      let commits = [];
      if (!this.options.offline) {
        const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1e3);
        commits = await execGhJson(
          `api repos/${this.options.repository.owner}/${this.options.repository.name}/commits?since=${sinceDate.toISOString()}&per_page=100`,
          { timeout: 3e4, useRateLimit: false, useRetry: false }
        );
      }
      const contributorStats = /* @__PURE__ */ new Map();
      commits.forEach((commit) => {
        try {
          const author = (commit.commit.author.name || commit.commit.author.email || "unknown").trim();
          if (author && author !== "unknown") {
            const stats = contributorStats.get(author) || { commits: 0, prs: 0, reviews: 0 };
            stats.commits++;
            contributorStats.set(author, stats);
          }
        } catch (e) {
        }
      });
      let prs = [];
      if (!this.options.offline) {
        prs = await execGhJson(
          `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,author,reviewDecision,createdAt`,
          { timeout: 3e4, useRateLimit: false, useRetry: false }
        );
      } else {
        const parser = new MarkdownParser(this.options.exportedDataPath);
        const parsedPRs = await parser.parsePullRequests();
        prs = parsedPRs.map((pr) => ({
          number: pr.number,
          author: { login: pr.author },
          reviewDecision: "REVIEWED",
          // Default value
          createdAt: pr.createdAt
        }));
      }
      prs.forEach((pr) => {
        try {
          if (pr.author?.login) {
            const author = pr.author.login.trim();
            if (author) {
              const stats = contributorStats.get(author) || { commits: 0, prs: 0, reviews: 0 };
              stats.prs++;
              contributorStats.set(author, stats);
            }
          }
        } catch (e) {
        }
      });
      const contributorsArray = Array.from(contributorStats.entries()).map(([login, stats]) => ({
        login,
        commits: stats.commits,
        prs: stats.prs,
        reviews: stats.reviews,
        totalContributions: stats.commits + stats.prs + stats.reviews
      })).sort((a, b) => b.totalContributions - a.totalContributions);
      result.topContributors = contributorsArray.slice(0, 10);
      const totalContributions = contributorsArray.reduce(
        (sum, c) => sum + c.totalContributions,
        0
      );
      result.contributionDistribution = contributorsArray.map((c) => ({
        contributor: c.login,
        percentage: totalContributions > 0 ? c.totalContributions / totalContributions * 100 : 0
      })).slice(0, 10);
      if (contributorsArray.length > 0) {
        const top2Contributions = contributorsArray.slice(0, 2).reduce((sum, c) => sum + c.totalContributions, 0);
        if (totalContributions > 0 && top2Contributions / totalContributions > 0.5) {
          result.busFactor = 2;
        } else {
          result.busFactor = Math.min(contributorsArray.length, 5);
        }
      }
      const activeContributors = contributorsArray.length;
      const newContributors = contributorsArray.filter((c) => c.totalContributions <= 2).length;
      const returningContributors = activeContributors - newContributors;
      result.newVsReturning = {
        new: Math.max(0, newContributors),
        returning: Math.max(0, returningContributors)
      };
      result.success = true;
      result.duration = Date.now() - startTime;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMsg);
      logger.error(`Contributor analytics failed: ${errorMsg}`);
    }
    result.duration = Date.now() - startTime;
    return result;
  }
  /**
   * Generate label analytics
   */
  async generateLabelAnalytics() {
    const startTime = Date.now();
    const result = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.options.repository.owner}/${this.options.repository.name}`,
      labelDistribution: [],
      issueLifecycle: {
        averageOpenDays: 0,
        medianOpenDays: 0
      },
      mostCommonLabels: [],
      issueVsPrratio: 0
    };
    try {
      let issues = [];
      let prs = [];
      if (!this.options.offline) {
        issues = await execGhJson(
          `issue list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,labels,createdAt,closedAt,state,title,author`,
          { timeout: 3e4, useRateLimit: false, useRetry: false }
        );
        prs = await execGhJson(
          `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,labels,createdAt,closedAt,title,author`,
          { timeout: 3e4, useRateLimit: false, useRetry: false }
        );
      } else {
        const parser = new MarkdownParser(this.options.exportedDataPath);
        const parsedIssues = await parser.parseIssues();
        const parsedPRs = await parser.parsePullRequests();
        issues = parsedIssues.map((issue) => ({
          number: issue.number,
          labels: issue.labels.map((label) => ({ name: label })),
          createdAt: issue.createdAt,
          closedAt: issue.closedAt,
          state: issue.state,
          title: issue.title,
          author: { login: issue.author }
        }));
        prs = parsedPRs.map((pr) => ({
          number: pr.number,
          labels: pr.labels.map((label) => ({ name: label })),
          createdAt: pr.createdAt,
          closedAt: pr.closedAt,
          title: pr.title,
          author: { login: pr.author }
        }));
      }
      result.issueVsPrratio = prs.length > 0 ? issues.length / prs.length : 0;
      const labelCounts = /* @__PURE__ */ new Map();
      issues.forEach((issue) => {
        try {
          if (Array.isArray(issue.labels)) {
            issue.labels.forEach((label) => {
              try {
                const labelName = (label.name || "unnamed").trim();
                if (labelName) {
                  labelCounts.set(labelName, (labelCounts.get(labelName) || 0) + 1);
                }
              } catch (e) {
              }
            });
          }
        } catch (e) {
        }
      });
      prs.forEach((pr) => {
        try {
          if (Array.isArray(pr.labels)) {
            pr.labels.forEach((label) => {
              try {
                const labelName = (label.name || "unnamed").trim();
                if (labelName) {
                  labelCounts.set(labelName, (labelCounts.get(labelName) || 0) + 1);
                }
              } catch (e) {
              }
            });
          }
        } catch (e) {
        }
      });
      const totalLabels = Array.from(labelCounts.values()).reduce((sum, count) => sum + count, 0);
      result.labelDistribution = Array.from(labelCounts.entries()).map(([label, count]) => ({
        label,
        count,
        percentage: totalLabels > 0 ? count / totalLabels * 100 : 0
      })).sort((a, b) => b.count - a.count).slice(0, 10);
      result.mostCommonLabels = result.labelDistribution.slice(0, 5).map((item) => item.label);
      if (issues.length > 0) {
        const openDurations = issues.filter((issue) => issue.closedAt && issue.createdAt).map((issue) => {
          const created = new Date(issue.createdAt);
          const closed = new Date(issue.closedAt);
          return (closed.getTime() - created.getTime()) / (1e3 * 60 * 60 * 24);
        });
        if (openDurations.length > 0) {
          const averageOpenDays = openDurations.reduce((sum, days) => sum + days, 0) / openDurations.length;
          const sortedDurations = [...openDurations].sort((a, b) => a - b);
          const medianOpenDays = sortedDurations[Math.floor(sortedDurations.length / 2)];
          result.issueLifecycle = {
            averageOpenDays,
            medianOpenDays
          };
        }
      }
      result.success = true;
      result.duration = Date.now() - startTime;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMsg);
      logger.error(`Label analytics failed: ${errorMsg}`);
    }
    result.duration = Date.now() - startTime;
    return result;
  }
  /**
   * Generate code health analytics
   */
  async generateHealthAnalytics() {
    const startTime = Date.now();
    const result = {
      success: false,
      duration: 0,
      errors: [],
      repository: `${this.options.repository.owner}/${this.options.repository.name}`,
      prReviewCoverage: {
        reviewed: 0,
        total: 0,
        coveragePercentage: 0
      },
      averagePrSize: {
        additions: 0,
        deletions: 0,
        total: 0
      },
      timeToFirstReview: {
        averageHours: 0,
        medianHours: 0
      },
      deploymentFrequency: {
        releases: 0,
        period: "monthly"
      }
    };
    try {
      let prs = [];
      let releases = [];
      if (!this.options.offline) {
        prs = await execGhJson(
          `pr list --repo ${this.options.repository.owner}/${this.options.repository.name} --state all --limit 500 --json number,reviewDecision,additions,deletions,createdAt,updatedAt,author,title`,
          { timeout: 3e4, useRateLimit: false, useRetry: false }
        );
        releases = await execGhJson(
          `release list --repo ${this.options.repository.owner}/${this.options.repository.name} --limit 100 --json tagName,createdAt,publishedAt`,
          { timeout: 3e4, useRateLimit: false, useRetry: false }
        );
      } else {
        const parser = new MarkdownParser(this.options.exportedDataPath);
        const parsedPRs = await parser.parsePullRequests();
        const parsedReleases = await parser.parseReleases();
        prs = parsedPRs.map((pr) => ({
          number: pr.number,
          reviewDecision: pr.mergedAt ? "APPROVED" : "CHANGES_REQUESTED",
          additions: 0,
          // Not available in markdown files
          deletions: 0,
          // Not available in markdown files
          createdAt: pr.createdAt,
          updatedAt: pr.closedAt || pr.createdAt,
          author: { login: pr.author },
          title: pr.title
        }));
        releases = parsedReleases.map((release) => ({
          tagName: release.tagName,
          createdAt: release.createdAt,
          publishedAt: release.publishedAt
        }));
      }
      if (prs.length > 0) {
        const reviewedPRs = this.options.offline ? prs : prs.filter((pr) => pr.reviewDecision === "APPROVED" || pr.reviewDecision === "CHANGES_REQUESTED");
        const coveragePercentage = prs.length > 0 ? reviewedPRs.length / prs.length * 100 : 0;
        result.prReviewCoverage = {
          reviewed: reviewedPRs.length,
          total: prs.length,
          coveragePercentage: isNaN(coveragePercentage) ? 0 : coveragePercentage
        };
      }
      if (prs.length > 0) {
        const totalAdditions = prs.reduce((sum, pr) => sum + (pr.additions || 0), 0);
        const totalDeletions = prs.reduce((sum, pr) => sum + (pr.deletions || 0), 0);
        const totalChanges = totalAdditions + totalDeletions;
        const avgAdditions = prs.length > 0 ? totalAdditions / prs.length : 0;
        const avgDeletions = prs.length > 0 ? totalDeletions / prs.length : 0;
        const avgTotal = prs.length > 0 ? totalChanges / prs.length : 0;
        result.averagePrSize = {
          additions: isNaN(avgAdditions) ? 0 : Math.round(avgAdditions),
          deletions: isNaN(avgDeletions) ? 0 : Math.round(avgDeletions),
          total: isNaN(avgTotal) ? 0 : Math.round(avgTotal)
        };
      }
      if (releases.length > 0) {
        try {
          const releaseDates = releases.map((r) => new Date(r.createdAt)).filter((date) => !isNaN(date.getTime()));
          if (releaseDates.length > 0) {
            result.deploymentFrequency = {
              releases: releases.length,
              period: "monthly"
            };
          }
        } catch (e) {
          result.deploymentFrequency = {
            releases: releases.length,
            period: "monthly"
          };
        }
      }
      result.success = true;
      result.duration = Date.now() - startTime;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMsg);
      logger.error(`Health analytics failed: ${errorMsg}`);
    }
    result.duration = Date.now() - startTime;
    return result;
  }
  /**
   * Get package version from package.json
   */
  async getPackageVersion() {
    try {
      const packagePath = join(__dirname, "../../package.json");
      const packageJson = JSON.parse(await readFile(packagePath, "utf-8"));
      return packageJson.version || "unknown";
    } catch {
      return "unknown";
    }
  }
  /**
   * Export the analytics report in the specified formats
   */
  async exportReport(report) {
    const { format, outputPath } = this.options;
    const repoIdentifier = `${this.options.repository.owner}-${this.options.repository.name}`;
    try {
      if (format === "json") {
        const jsonPath = join(outputPath, `${repoIdentifier}-analytics.json`);
        await writeFile(jsonPath, JSON.stringify(report, null, 2));
        logger.info(`Analytics report saved as JSON: ${jsonPath}`);
      }
      if (format === "markdown") {
        const markdownPath = join(outputPath, `${repoIdentifier}-analytics.md`);
        const markdownContent = await this.generateMarkdownReport(report);
        await writeFile(markdownPath, markdownContent, "utf8");
        logger.info(`Analytics report saved as Markdown: ${markdownPath}`);
      }
      if (format === "pdf") {
        logger.info("Starting PDF generation pipeline: Markdown → HTML → PDF");
        const markdownContent = await this.generateMarkdownReport(report);
        const markdownPath = join(outputPath, `${repoIdentifier}-analytics.md`);
        await writeFile(markdownPath, markdownContent, "utf8");
        logger.info(`✓ Markdown report generated: ${markdownPath}`);
        const htmlGenerator = new HtmlReportGenerator();
        const htmlContent = await htmlGenerator.generateHtml(
          markdownContent,
          `${this.options.repository.owner}/${this.options.repository.name} Analytics Report`
        );
        const htmlPath = join(outputPath, `${repoIdentifier}-analytics.html`);
        await writeFile(htmlPath, htmlContent, "utf8");
        logger.info(`✓ HTML report generated: ${htmlPath}`);
        const pdfConverter = new PuppeteerPdfConverter();
        const pdfPath = join(outputPath, `${repoIdentifier}-analytics.pdf`);
        await pdfConverter.convertHtmlToPdf(htmlContent, pdfPath);
        logger.info(`✓ PDF report generated: ${pdfPath}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Failed to export analytics report: ${errorMsg}`);
      throw error;
    }
  }
  /**
   * Generate a Markdown report from the analytics data
   */
  async generateMarkdownReport(report) {
    const version = await this.getPackageVersion();
    const benchmark = report.benchmark;
    const narrative = report.narrative;
    return await this.markdownGenerator.generate(report, version, benchmark, narrative);
  }
}
export {
  AnalyticsProcessor
};
