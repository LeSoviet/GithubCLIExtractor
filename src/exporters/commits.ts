import { BaseExporter } from './base-exporter.js';
import { execGhJson } from '../utils/exec-gh.js';
import { sanitizeUnicode } from '../utils/sanitize.js';
import { convertCommit } from '../utils/converters.js';
import { logger } from '../utils/logger.js';
import type { Commit } from '../types/index.js';
import type { GitHubCommit } from '../types/github.js';

/**
 * Commits Exporter
 */
export class CommitExporter extends BaseExporter<Commit> {
  protected async fetchData(): Promise<Commit[]> {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();

    try {
      // Log diff mode info if enabled
      this.logDiffModeInfo();

      // Build API URL with optional since parameter for diff mode
      let apiUrl = `api repos/${repoId}/commits?per_page=100`;

      // Add author filter if specified
      if (this.isUserFilterEnabled()) {
        apiUrl += `&author=${encodeURIComponent(this.getUserFilter()!)}`;
      }

      if (this.isDiffMode()) {
        const since = this.getDiffModeSince();
        if (since) {
          // GitHub API accepts ISO 8601 format for since parameter
          apiUrl += `&since=${encodeURIComponent(since)}`;
        }
      }

      // Fetch commits - using reasonable per_page size
      // GitHub CLI handles pagination automatically, ensuring complete data export
      // For large repos this may take longer but guarantees all data is captured
      const commits = await execGhJson<GitHubCommit[]>(apiUrl, {
        timeout: 60000,
        useRateLimit: false,
        useRetry: false,
      });

      // Convert to our format
      const convertedCommits = commits.map((commit) => convertCommit(commit));

      return convertedCommits;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to fetch commits: ${errorMsg}`);
      return [];
    }
  }

  protected async exportItem(commit: Commit): Promise<void> {
    const shortSha = commit.sha.substring(0, 7);
    await this.exportItemTemplate(commit, this.outputPath, {
      prefix: 'COMMIT',
      identifier: shortSha,
      toMarkdown: (item) => this.toMarkdown(item),
      toJson: (item) => this.toJson(item),
    });
  }

  protected toMarkdown(commit: Commit): string {
    const shortSha = commit.sha.substring(0, 7);
    const filesChanged =
      commit.filesChanged.length > 0
        ? commit.filesChanged.map((f) => `- \`${sanitizeUnicode(f)}\``).join('\n')
        : '*No files information available*';

    let markdown = `# Commit ${shortSha}\n\n`;
    markdown += `## Metadata\n\n`;
    markdown += `- **SHA:** \`${commit.sha}\`\n`;
    markdown += `- **Author:** ${sanitizeUnicode(commit.author)} (${sanitizeUnicode(commit.authorEmail)})\n`;
    markdown += `- **Date:** ${this.formatDate(commit.date)}\n`;
    markdown += `- **URL:** ${commit.url}\n\n`;

    if (commit.additions > 0 || commit.deletions > 0) {
      markdown += `## Stats\n\n`;
      markdown += `- **Additions:** +${commit.additions}\n`;
      markdown += `- **Deletions:** -${commit.deletions}\n`;
      markdown += `- **Total Changes:** ${commit.additions + commit.deletions}\n\n`;
    }

    markdown += `## Commit Message\n\n`;
    markdown += `\`\`\`
${sanitizeUnicode(commit.message)}
\`\`\`

`;

    markdown += `## Files Changed\n\n`;
    markdown += `${filesChanged}\n\n`;

    markdown += `---\n\n`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*\n`;

    return markdown;
  }

  protected getExportType(): string {
    return 'commits';
  }
}
