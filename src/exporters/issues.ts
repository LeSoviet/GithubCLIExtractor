import { BaseExporter } from './base-exporter.js';
import { execGhJson } from '../utils/exec-gh.js';
import { decodeUnicode, sanitizeUnicode } from '../utils/sanitize.js';
import { convertIssue } from '../utils/converters.js';
import { logger } from '../utils/logger.js';
import { getExportLimit } from '../config/export-limits.js';
import type { Issue } from '../types/index.js';

/**
 * Issues Exporter
 */
export class IssueExporter extends BaseExporter<Issue> {
  protected async fetchData(): Promise<Issue[]> {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();

    try {
      // Log diff mode info if enabled
      this.logDiffModeInfo();

      // Fetch issues using dynamically configured limit for complete data export
      const issueLimit = getExportLimit('issues');
      const issues = await execGhJson<any[]>(
        `issue list --repo ${repoId} --state all --limit ${issueLimit} --json number,title,body,author,state,createdAt,updatedAt,closedAt,labels,url`,
        { timeout: 60000, useRateLimit: false, useRetry: false }
      );

      let convertedIssues = issues.map((issue) => convertIssue(issue));

      // Apply user filter and diff mode filtering
      convertedIssues = await this.applyFilters(convertedIssues, {
        authorField: 'author',
        dateField: 'updatedAt',
      });

      return convertedIssues;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Log the error but don't throw - allow export to continue with other data types
      if (errorMsg.includes('disabled issues')) {
        logger.warn(`Issues export skipped: issues are disabled for ${repoId}`);
      } else {
        logger.warn(`Failed to fetch issues: ${errorMsg}`);
      }
      return [];
    }
  }

  protected async exportItem(issue: Issue): Promise<void> {
    await this.exportItemTemplate(issue, this.outputPath, {
      prefix: 'ISSUE',
      identifier: issue.number,
      toMarkdown: (item) => this.toMarkdown(item),
      toJson: (item) => this.toJson(item),
    });
  }

  protected toMarkdown(issue: Issue): string {
    const labels =
      issue.labels.length > 0
        ? issue.labels.map((l) => `\`${sanitizeUnicode(l)}\``).join(', ')
        : 'None';
    const body = issue.body ? decodeUnicode(issue.body) : '*No description provided*';

    let markdown = `# Issue #${issue.number}: ${sanitizeUnicode(issue.title)}\n\n`;
    markdown += `## Metadata\n\n`;
    markdown += `- **Author:** ${sanitizeUnicode(issue.author)}\n`;
    markdown += `- **State:** ${issue.state.toUpperCase()}\n`;
    markdown += `- **Created:** ${this.formatDate(issue.createdAt)}\n`;
    markdown += `- **Updated:** ${this.formatDate(issue.updatedAt)}\n`;

    if (issue.closedAt) {
      markdown += `- **Closed:** ${this.formatDate(issue.closedAt)}\n`;
    }

    markdown += `- **Labels:** ${labels}\n`;
    markdown += `- **URL:** ${issue.url}\n\n`;

    markdown += `## Description\n\n`;
    markdown += `${body}\n\n`;

    markdown += `---\n\n`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*\n`;

    return markdown;
  }

  protected getExportType(): string {
    return 'issues';
  }
}
