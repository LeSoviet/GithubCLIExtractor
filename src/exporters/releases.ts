import { join } from 'path';
import { BaseExporter } from './base-exporter.js';
import { execGhJson } from '../utils/exec-gh.js';
import { writeMarkdown, writeJson, generateFilename } from '../utils/output.js';
import { decodeUnicode } from '../utils/sanitize.js';
import { format } from 'date-fns';
import type { Release } from '../types/index.js';

/**
 * Releases Exporter
 */
export class ReleaseExporter extends BaseExporter<Release> {
  protected async fetchData(): Promise<Release[]> {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();

    try {
      // Fetch releases - limit to 100 for performance
      const releases = await execGhJson<any[]>(
        `release list --repo ${repoId} --limit 100 --json tagName,name,body,author,createdAt,publishedAt,isDraft,isPrerelease,assets,url`,
        { timeout: 60000, useRateLimit: false, useRetry: false }
      );

      return releases.map((release) => this.convertRelease(release));
    } catch (error) {
      throw new Error(`Failed to fetch releases: ${error}`);
    }
  }

  protected async exportItem(release: Release): Promise<void> {
    const shouldExportMarkdown = this.format === 'markdown' || this.format === 'both';
    const shouldExportJson = this.format === 'json' || this.format === 'both';

    if (shouldExportMarkdown) {
      const markdown = this.toMarkdown(release);
      const filename = generateFilename('RELEASE', release.tagName, 'md');
      const filepath = join(this.outputPath, filename);
      await writeMarkdown(filepath, markdown);
    }

    if (shouldExportJson) {
      const json = this.toJson(release);
      const filename = generateFilename('RELEASE', release.tagName, 'json');
      const filepath = join(this.outputPath, filename);
      await writeJson(filepath, json);
    }
  }

  protected toMarkdown(release: Release): string {
    const body = release.body ? decodeUnicode(release.body) : '*No release notes provided*';
    const badges: string[] = [];

    if (release.isDraft) badges.push('`DRAFT`');
    if (release.isPrerelease) badges.push('`PRE-RELEASE`');

    const badgesStr = badges.length > 0 ? badges.join(' ') + '\n\n' : '';

    let markdown = `# Release: ${release.name}\n\n`;
    markdown += badgesStr;
    markdown += `## Metadata\n\n`;
    markdown += `- **Tag:** \`${release.tagName}\`\n`;
    markdown += `- **Author:** ${release.author}\n`;
    markdown += `- **Created:** ${this.formatDate(release.createdAt)}\n`;
    markdown += `- **Published:** ${this.formatDate(release.publishedAt)}\n`;
    markdown += `- **URL:** ${release.url}\n\n`;

    if (release.assets.length > 0) {
      markdown += `## Assets (${release.assets.length})\n\n`;
      release.assets.forEach((asset) => {
        const sizeKB = (asset.size / 1024).toFixed(2);
        markdown += `- **${asset.name}** (${sizeKB} KB)\n`;
        markdown += `  - Downloads: ${asset.downloadCount}\n`;
        markdown += `  - URL: ${asset.downloadUrl}\n`;
      });
      markdown += `\n`;
    }

    markdown += `## Release Notes\n\n`;
    markdown += `${body}\n\n`;

    markdown += `---\n\n`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*\n`;

    return markdown;
  }

  protected getExportType(): string {
    return 'releases';
  }

  /**
   * Convert GitHub API Release to our format
   */
  private convertRelease(ghRelease: any): Release {
    return {
      tagName: ghRelease.tagName,
      name: ghRelease.name,
      body: ghRelease.body || undefined,
      author: ghRelease.author?.login || 'unknown',
      createdAt: ghRelease.createdAt,
      publishedAt: ghRelease.publishedAt,
      isDraft: ghRelease.isDraft,
      isPrerelease: ghRelease.isPrerelease,
      assets:
        ghRelease.assets?.map((asset: any) => ({
          name: asset.name,
          size: asset.size,
          downloadCount: asset.downloadCount || 0,
          downloadUrl: asset.url,
        })) || [],
      url: ghRelease.url,
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
