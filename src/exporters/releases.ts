import { BaseExporter } from './base-exporter.js';
import { execGhJson } from '../utils/exec-gh.js';
import { decodeUnicode, sanitizeUnicode } from '../utils/sanitize.js';
import { convertRelease } from '../utils/converters.js';
import { logger } from '../utils/logger.js';
import type { Release } from '../types/index.js';

/**
 * Releases Exporter
 */
export class ReleaseExporter extends BaseExporter<Release> {
  protected async fetchData(): Promise<Release[]> {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();

    try {
      // Log diff mode info if enabled
      this.logDiffModeInfo();

      // Fetch releases with ONLY available fields - limit to 300 for better coverage
      const releases = await execGhJson<any[]>(
        `release list --repo ${repoId} --limit 300 --json tagName,name,createdAt,publishedAt,isDraft,isPrerelease`,
        { timeout: 15000, useRateLimit: false, useRetry: false }
      );

      if (!releases || releases.length === 0) {
        return [];
      }

      // Fetch full details for each release using gh release view
      const releasesWithDetails = await Promise.all(
        releases.map(async (release) => {
          try {
            // Fetch full release data including body, assets, and author using gh release view
            const fullRelease = await execGhJson<any>(
              `release view ${release.tagName} --repo ${repoId} --json tagName,name,body,author,createdAt,publishedAt,isDraft,isPrerelease,assets,url`,
              { timeout: 30000, useRetry: true, useRateLimit: true }
            );

            return convertRelease(fullRelease);
          } catch (error: any) {
            // Return release without body/assets/author
            return convertRelease({
              ...release,
              body: '',
              assets: [],
              author: { login: 'unknown' },
              url: `https://github.com/${repoId}/releases/tag/${release.tagName}`,
            });
          }
        })
      );

      // Filter by date if diff mode is enabled
      let filteredReleases = releasesWithDetails;
      if (this.isDiffMode()) {
        const since = this.getDiffModeSince();
        if (since) {
          const sinceDate = new Date(since);
          filteredReleases = releasesWithDetails.filter((release) => {
            const publishedAt = new Date(release.publishedAt);
            return publishedAt > sinceDate;
          });
        }
      }

      return filteredReleases;
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to fetch releases: ${errorMsg}`);
      return [];
    }
  }

  protected async exportItem(release: Release): Promise<void> {
    await this.exportItemTemplate(release, this.outputPath, {
      prefix: 'RELEASE',
      identifier: release.tagName,
      toMarkdown: (item) => this.toMarkdown(item),
      toJson: (item) => this.toJson(item),
    });
  }

  protected toMarkdown(release: Release): string {
    const body = release.body ? decodeUnicode(release.body) : '*No release notes provided*';
    const badges: string[] = [];

    if (release.isDraft) badges.push('`DRAFT`');
    if (release.isPrerelease) badges.push('`PRE-RELEASE`');

    const badgesStr = badges.length > 0 ? badges.join(' ') + '\n\n' : '';

    let markdown = `# Release: ${sanitizeUnicode(release.name)}\n\n`;
    markdown += badgesStr;
    markdown += `## Metadata\n\n`;
    markdown += `- **Tag:** \`${release.tagName}\`\n`;
    markdown += `- **Author:** ${sanitizeUnicode(release.author)}\n`;
    markdown += `- **Created:** ${this.formatDate(release.createdAt)}\n`;
    markdown += `- **Published:** ${this.formatDate(release.publishedAt)}\n`;
    markdown += `- **URL:** ${release.url}\n\n`;

    if (release.assets && release.assets.length > 0) {
      markdown += `## Assets (${release.assets.length})\n\n`;
      release.assets.forEach((asset) => {
        const sizeKB = (asset.size / 1024).toFixed(2);
        markdown += `- **${sanitizeUnicode(asset.name)}** (${sizeKB} KB)\n`;
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
}
