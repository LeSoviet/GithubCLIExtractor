import { join } from 'path';
import { BaseExporter } from './base-exporter.js';
import { execGhJson } from '../utils/exec-gh.js';
import { writeMarkdown, writeJson, generateFilename } from '../utils/output.js';
import { decodeUnicode } from '../utils/sanitize.js';
import { format } from 'date-fns';
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

      // Fetch issues - limit to 100 for performance
      const issues = await execGhJson<any[]>(
        `issue list --repo ${repoId} --state all --limit 100 --json number,title,body,author,state,createdAt,updatedAt,closedAt,labels,url`,
        { timeout: 60000, useRateLimit: false, useRetry: false }
      );

      let convertedIssues = issues.map((issue) => this.convertIssue(issue));

      // Filter by date if diff mode is enabled
      if (this.isDiffMode()) {
        const since = this.getDiffModeSince();
        if (since) {
          const sinceDate = new Date(since);
          convertedIssues = convertedIssues.filter((issue) => {
            const updatedAt = new Date(issue.updatedAt);
            return updatedAt > sinceDate;
          });
          console.log(
            `[INFO] Diff mode: filtered to ${convertedIssues.length} issues updated since ${sinceDate.toLocaleString()}`
          );
        }
      }

      return convertedIssues;
    } catch (error) {
      throw new Error(`Failed to fetch issues: ${error}`);
    }
  }

  protected async exportItem(issue: Issue): Promise<void> {
    const shouldExportMarkdown = this.format === 'markdown' || this.format === 'both';
    const shouldExportJson = this.format === 'json' || this.format === 'both';

    if (shouldExportMarkdown) {
      const markdown = this.toMarkdown(issue);
      const filename = generateFilename('ISSUE', issue.number, 'md');
      const filepath = join(this.outputPath, filename);
      await writeMarkdown(filepath, markdown);
    }

    if (shouldExportJson) {
      const json = this.toJson(issue);
      const filename = generateFilename('ISSUE', issue.number, 'json');
      const filepath = join(this.outputPath, filename);
      await writeJson(filepath, json);
    }
  }

  protected toMarkdown(issue: Issue): string {
    const labels =
      issue.labels.length > 0 ? issue.labels.map((l) => `\`${l}\``).join(', ') : 'None';
    const body = issue.body ? decodeUnicode(issue.body) : '*No description provided*';

    let markdown = `# Issue #${issue.number}: ${issue.title}\n\n`;
    markdown += `## Metadata\n\n`;
    markdown += `- **Author:** ${issue.author}\n`;
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

  /**
   * Convert GitHub API Issue to our format
   */
  private convertIssue(ghIssue: any): Issue {
    return {
      number: ghIssue.number,
      title: ghIssue.title,
      body: ghIssue.body || undefined,
      author: ghIssue.author?.login || 'unknown',
      state: ghIssue.state as 'open' | 'closed',
      createdAt: ghIssue.createdAt,
      updatedAt: ghIssue.updatedAt,
      closedAt: ghIssue.closedAt || undefined,
      labels: ghIssue.labels.map((l: any) => l.name),
      url: ghIssue.url,
    };
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  }
}
