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
      console.log('[INFO] Fetching branches (timeout: 10s)...');
      
      // Fetch branches with aggressive timeout and no retry
      const branches = await execGhJson<GitHubBranch[]>(
        `api repos/${repoId}/branches?per_page=20`,
        { 
          timeout: 10000, // 10 second timeout
          useRetry: false, // Disable retry for faster failure
          useRateLimit: true
        }
      );

      if (!branches || !Array.isArray(branches)) {
        console.log('[INFO] No branches found or invalid response');
        return [];
      }

      console.log(`[INFO] Successfully fetched ${branches.length} branches`);
      return branches.map((branch) => this.convertBranch(branch));
      
    } catch (error: any) {
      console.log(`[INFO] Branch fetch failed: ${error.message} - Skipping branches`);
      return []; // Return empty array to allow export to continue
    }
  }

  protected async exportItem(branch: Branch): Promise<void> {
    try {
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
    } catch (error: any) {
      console.log(`[INFO] Failed to export branch ${branch.name}: ${error.message}`);
      throw error;
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

  private convertBranch(ghBranch: GitHubBranch): Branch {
    return {
      name: ghBranch.name || 'unknown',
      lastCommit: {
        sha: ghBranch.commit?.sha || '',
        message: ghBranch.commit?.commit?.message || 'No message',
        date: ghBranch.commit?.commit?.author?.date || new Date().toISOString(),
      },
      isProtected: ghBranch.protected || false,
    };
  }

  private formatDate(dateString: string): string {
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  }
}