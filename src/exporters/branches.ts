import { BaseExporter } from './base-exporter.js';
import { execGhJson } from '../utils/exec-gh.js';
import { sanitizeFilename, sanitizeUnicode } from '../utils/sanitize.js';
import { convertBranch } from '../utils/converters.js';
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
      // Log diff mode info if enabled
      this.logDiffModeInfo();

      // Fetch branches with pagination to get all branches
      const branches = await execGhJson<GitHubBranch[]>(
        `api repos/${repoId}/branches?per_page=100 --paginate`,
        {
          timeout: 60000, // Increased timeout for pagination
          useRetry: false, // Disable retry for faster failure
          useRateLimit: false,
        }
      );

      if (!branches || !Array.isArray(branches)) {
        return [];
      }

      // Convert branches
      let convertedBranches = branches.map((branch) => convertBranch(branch));

      // Filter by last commit date if diff mode is enabled
      if (this.isDiffMode()) {
        const since = this.getDiffModeSince();
        if (since) {
          const sinceDate = new Date(since);
          convertedBranches = convertedBranches.filter((branch) => {
            const lastCommitDate = new Date(branch.lastCommit.date);
            return lastCommitDate > sinceDate;
          });
        }
      }

      return convertedBranches;
    } catch (error: any) {
      return []; // Return empty array to allow export to continue
    }
  }

  protected async exportItem(branch: Branch): Promise<void> {
    const safeName = sanitizeFilename(branch.name);
    await this.exportItemTemplate(branch, this.outputPath, {
      prefix: 'BRANCH',
      identifier: safeName,
      toMarkdown: (item) => this.toMarkdown(item),
      toJson: (item) => this.toJson(item),
    });
  }

  protected toMarkdown(branch: Branch): string {
    const protection = branch.isProtected ? '[Protected]' : '[Not Protected]';

    let markdown = `# Branch: ${sanitizeUnicode(branch.name)}\n\n`;
    markdown += `## Metadata\n\n`;
    markdown += `- **Name:** \`${sanitizeUnicode(branch.name)}\`\n`;
    markdown += `- **Protection:** ${protection}\n\n`;

    markdown += `## Last Commit\n\n`;
    markdown += `- **SHA:** \`${branch.lastCommit.sha.substring(0, 7)}\`\n`;
    markdown += `- **Message:** ${sanitizeUnicode(branch.lastCommit.message.split('\n')[0])}\n`;
    markdown += `- **Date:** ${this.formatDate(branch.lastCommit.date)}\n\n`;

    markdown += `---\n\n`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*\n`;

    return markdown;
  }

  protected getExportType(): string {
    return 'branches';
  }
}
