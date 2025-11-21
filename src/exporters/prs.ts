import { join } from 'path';
import { BaseExporter } from './base-exporter.js';
import { execGhJson } from '../utils/exec-gh.js';
import { writeMarkdown, writeJson, generateFilename } from '../utils/output.js';
import { sanitizeFilename, decodeUnicode } from '../utils/sanitize.js';
import { format } from 'date-fns';
import type { PullRequest } from '../types/index.js';

/**
 * Pull Request Exporter
 */
export class PullRequestExporter extends BaseExporter<PullRequest> {
  protected async fetchData(): Promise<PullRequest[]> {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();

    try {
      // Log diff mode info if enabled
      this.logDiffModeInfo();

      // Fetch PRs - limit to 100 for performance
      const prs = await execGhJson<any[]>(
        `pr list --repo ${repoId} --state all --limit 100 --json number,title,body,author,state,createdAt,updatedAt,closedAt,mergedAt,labels,url`,
        { timeout: 60000, useRateLimit: false, useRetry: false }
      );

      // Convert GitHub API format to our format
      let convertedPRs = prs.map((pr) => this.convertPullRequest(pr));

      // Filter by date if diff mode is enabled
      if (this.isDiffMode()) {
        const since = this.getDiffModeSince();
        if (since) {
          const sinceDate = new Date(since);
          convertedPRs = convertedPRs.filter((pr) => {
            const updatedAt = new Date(pr.updatedAt);
            return updatedAt > sinceDate;
          });
          console.log(
            `[INFO] Diff mode: filtered to ${convertedPRs.length} PRs updated since ${sinceDate.toLocaleString()}`
          );
        }
      }

      return convertedPRs;
    } catch (error) {
      throw new Error(`Failed to fetch pull requests: ${error}`);
    }
  }

  protected async exportItem(pr: PullRequest): Promise<void> {
    const shouldExportMarkdown = this.format === 'markdown' || this.format === 'both';
    const shouldExportJson = this.format === 'json' || this.format === 'both';

    // Include title in filename
    const safeTitle = sanitizeFilename(pr.title.substring(0, 50)); // Limit to 50 chars
    const identifier = `${pr.number}-${safeTitle}`;

    if (shouldExportMarkdown) {
      const markdown = this.toMarkdown(pr);
      const filename = generateFilename('PR', identifier, 'md');
      const filepath = join(this.outputPath, filename);
      await writeMarkdown(filepath, markdown);
    }

    if (shouldExportJson) {
      const json = this.toJson(pr);
      const filename = generateFilename('PR', identifier, 'json');
      const filepath = join(this.outputPath, filename);
      await writeJson(filepath, json);
    }
  }

  protected toMarkdown(pr: PullRequest): string {
    const labels = pr.labels.length > 0 ? pr.labels.map((l) => `\`${l}\``).join(', ') : 'None';
    const body = pr.body ? decodeUnicode(pr.body) : '*No description provided*';

    let markdown = `# Pull Request #${pr.number}: ${pr.title}\n\n`;
    markdown += `## Metadata\n\n`;
    markdown += `- **Author:** ${pr.author}\n`;
    markdown += `- **State:** ${pr.state.toUpperCase()}\n`;
    markdown += `- **Created:** ${this.formatDate(pr.createdAt)}\n`;
    markdown += `- **Updated:** ${this.formatDate(pr.updatedAt)}\n`;

    if (pr.closedAt) {
      markdown += `- **Closed:** ${this.formatDate(pr.closedAt)}\n`;
    }

    if (pr.mergedAt) {
      markdown += `- **Merged:** ${this.formatDate(pr.mergedAt)}\n`;
    }

    markdown += `- **Labels:** ${labels}\n`;
    markdown += `- **URL:** ${pr.url}\n\n`;

    markdown += `## Description\n\n`;
    markdown += `${body}\n\n`;

    markdown += `---\n\n`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*\n`;

    return markdown;
  }

  protected toJson(pr: PullRequest): string {
    return JSON.stringify(pr, null, 2);
  }

  protected getExportType(): string {
    return 'pull-requests';
  }

  /**
   * Convert GitHub API PR to our format
   */
  private convertPullRequest(ghPr: any): PullRequest {
    return {
      number: ghPr.number,
      title: ghPr.title,
      body: ghPr.body || undefined,
      author: ghPr.author?.login || 'unknown',
      state: ghPr.mergedAt ? 'merged' : (ghPr.state as 'open' | 'closed'),
      createdAt: ghPr.createdAt,
      updatedAt: ghPr.updatedAt,
      closedAt: ghPr.closedAt || undefined,
      mergedAt: ghPr.mergedAt || undefined,
      labels: ghPr.labels.map((l: any) => l.name),
      url: ghPr.url,
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
