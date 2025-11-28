import { BaseExporter } from './base-exporter.js';
import { execGhJson } from '../utils/exec-gh.js';
import { sanitizeFilename, decodeUnicode, sanitizeUnicode } from '../utils/sanitize.js';
import { convertPullRequest } from '../utils/converters.js';
import { logger } from '../utils/logger.js';
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

      // Fetch PRs - limit to 500 for better coverage
      const prs = await execGhJson<any[]>(
        `pr list --repo ${repoId} --state all --limit 500 --json number,title,body,author,state,createdAt,updatedAt,closedAt,mergedAt,labels,url`,
        { timeout: 60000, useRateLimit: false, useRetry: false }
      );

      // Convert GitHub API format to our format
      let convertedPRs = prs.map((pr) => convertPullRequest(pr));

      // Apply user filter and diff mode filtering
      convertedPRs = await this.applyFilters(convertedPRs, {
        authorField: 'author',
        dateField: 'updatedAt',
      });

      return convertedPRs;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to fetch pull requests: ${errorMsg}`);
      return [];
    }
  }

  protected async exportItem(pr: PullRequest): Promise<void> {
    const safeTitle = sanitizeFilename(pr.title.substring(0, 50));
    const identifier = `${pr.number}-${safeTitle}`;
    await this.exportItemTemplate(pr, this.outputPath, {
      prefix: 'PR',
      identifier,
      toMarkdown: (item) => this.toMarkdown(item),
      toJson: (item) => this.toJson(item),
    });
  }

  protected toMarkdown(pr: PullRequest): string {
    const labels =
      pr.labels.length > 0 ? pr.labels.map((l) => `\`${sanitizeUnicode(l)}\``).join(', ') : 'None';
    const body = pr.body ? decodeUnicode(pr.body) : '*No description provided*';

    let markdown = `# Pull Request #${pr.number}: ${sanitizeUnicode(pr.title)}\n\n`;
    markdown += `## Metadata\n\n`;
    markdown += `- **Author:** ${sanitizeUnicode(pr.author)}\n`;
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
}
