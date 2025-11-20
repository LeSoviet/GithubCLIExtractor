import { join } from 'path';
import { BaseExporter } from './base-exporter.js';
import { execGhJson } from '../utils/exec-gh.js';
import { writeMarkdown, writeJson, generateFilename } from '../utils/output.js';
import { format } from 'date-fns';
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
      // Fetch commits - limit to 100 for performance (configurable later)
      // Note: Removed --paginate as it can hang on large repos
      const commits = await execGhJson<GitHubCommit[]>(
        `api repos/${repoId}/commits?per_page=100`,
        { timeout: 60000, useRateLimit: false, useRetry: false }
      );

      // Convert to our format
      const convertedCommits = commits.map((commit) => this.convertCommit(commit));

      return convertedCommits;
    } catch (error) {
      throw new Error(`Failed to fetch commits: ${error}`);
    }
  }

  protected async exportItem(commit: Commit): Promise<void> {
    const shouldExportMarkdown = this.format === 'markdown' || this.format === 'both';
    const shouldExportJson = this.format === 'json' || this.format === 'both';

    if (shouldExportMarkdown) {
      const markdown = this.toMarkdown(commit);
      const filename = generateFilename('COMMIT', commit.sha.substring(0, 7), 'md');
      const filepath = join(this.outputPath, filename);
      await writeMarkdown(filepath, markdown);
    }

    if (shouldExportJson) {
      const json = this.toJson(commit);
      const filename = generateFilename('COMMIT', commit.sha.substring(0, 7), 'json');
      const filepath = join(this.outputPath, filename);
      await writeJson(filepath, json);
    }
  }

  protected toMarkdown(commit: Commit): string {
    const shortSha = commit.sha.substring(0, 7);
    const filesChanged =
      commit.filesChanged.length > 0
        ? commit.filesChanged.map((f) => `- \`${f}\``).join('\n')
        : '*No files information available*';

    let markdown = `# Commit ${shortSha}\n\n`;
    markdown += `## Metadata\n\n`;
    markdown += `- **SHA:** \`${commit.sha}\`\n`;
    markdown += `- **Author:** ${commit.author} (${commit.authorEmail})\n`;
    markdown += `- **Date:** ${this.formatDate(commit.date)}\n`;
    markdown += `- **URL:** ${commit.url}\n\n`;

    if (commit.additions > 0 || commit.deletions > 0) {
      markdown += `## Stats\n\n`;
      markdown += `- **Additions:** +${commit.additions}\n`;
      markdown += `- **Deletions:** -${commit.deletions}\n`;
      markdown += `- **Total Changes:** ${commit.additions + commit.deletions}\n\n`;
    }

    markdown += `## Commit Message\n\n`;
    markdown += `\`\`\`\n${commit.message}\n\`\`\`\n\n`;

    markdown += `## Files Changed\n\n`;
    markdown += `${filesChanged}\n\n`;

    markdown += `---\n\n`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*\n`;

    return markdown;
  }

  protected getExportType(): string {
    return 'commits';
  }

  /**
   * Convert GitHub API Commit to our format
   */
  private convertCommit(ghCommit: GitHubCommit): Commit {
    return {
      sha: ghCommit.sha,
      message: ghCommit.commit.message,
      author: ghCommit.commit.author.name,
      authorEmail: ghCommit.commit.author.email,
      date: ghCommit.commit.author.date,
      filesChanged: ghCommit.files?.map((f) => f.filename) || [],
      additions: ghCommit.stats?.additions || 0,
      deletions: ghCommit.stats?.deletions || 0,
      url: ghCommit.html_url,
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
