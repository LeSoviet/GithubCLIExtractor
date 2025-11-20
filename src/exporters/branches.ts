import { join } from 'path';
import { BaseExporter } from './base-exporter.js';
import { execGhJson } from '../utils/exec-gh.js';
import { writeMarkdown, writeJson } from '../utils/output.js';
import { sanitizeFilename } from '../utils/sanitize.js';
import { format } from 'date-fns';
import type { Branch } from '../types/index.js';
import type { GitHubBranch } from '../types/github.js';

/**
 * Branches Exporter
 */
export class BranchExporter extends BaseExporter<Branch> {
  protected async fetchData(): Promise<Branch[]> {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();

    try {
      // Fetch branches - limit to 100 for performance
      // Note: Removed --paginate as it can hang on large repos
      const branches = await execGhJson<GitHubBranch[]>(
        `api repos/${repoId}/branches?per_page=100`
      );

      return branches.map((branch) => this.convertBranch(branch));
    } catch (error) {
      throw new Error(`Failed to fetch branches: ${error}`);
    }
  }

  protected async exportItem(branch: Branch): Promise<void> {
    const shouldExportMarkdown = this.format === 'markdown' || this.format === 'both';
    const shouldExportJson = this.format === 'json' || this.format === 'both';

    const safeName = sanitizeFilename(branch.name);

    if (shouldExportMarkdown) {
      const markdown = this.toMarkdown(branch);
      const filepath = join(this.outputPath, `BRANCH-${safeName}.md`);
      await writeMarkdown(filepath, markdown);
    }

    if (shouldExportJson) {
      const json = this.toJson(branch);
      const filepath = join(this.outputPath, `BRANCH-${safeName}.json`);
      await writeJson(filepath, json);
    }
  }

  protected toMarkdown(branch: Branch): string {
    const protection = branch.isProtected ? '🔒 Protected' : '🔓 Not Protected';

    let markdown = `# Branch: ${branch.name}\n\n`;
    markdown += `## Metadata\n\n`;
    markdown += `- **Name:** \`${branch.name}\`\n`;
    markdown += `- **Protection:** ${protection}\n\n`;

    markdown += `## Last Commit\n\n`;
    markdown += `- **SHA:** \`${branch.lastCommit.sha.substring(0, 7)}\`\n`;
    markdown += `- **Message:** ${branch.lastCommit.message.split('\n')[0]}\n`;
    markdown += `- **Date:** ${this.formatDate(branch.lastCommit.date)}\n\n`;

    markdown += `---\n\n`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*\n`;

    return markdown;
  }

  protected getExportType(): string {
    return 'branches';
  }

  /**
   * Convert GitHub API Branch to our format
   */
  private convertBranch(ghBranch: GitHubBranch): Branch {
    return {
      name: ghBranch.name,
      lastCommit: {
        sha: ghBranch.commit.sha,
        message: ghBranch.commit.commit.message,
        date: ghBranch.commit.commit.author.date,
      },
      isProtected: ghBranch.protected,
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
