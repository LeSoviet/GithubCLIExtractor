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
      // Log diff mode info if enabled
      this.logDiffModeInfo();

      console.log('[INFO] Fetching releases list...');

      // Fetch releases with ONLY available fields
      const releases = await execGhJson<any[]>(
        `release list --repo ${repoId} --limit 100 --json tagName,name,createdAt,publishedAt,isDraft,isPrerelease`,
        { timeout: 15000, useRateLimit: false, useRetry: false }
      );

      if (!releases || releases.length === 0) {
        console.log('[INFO] No releases found');
        return [];
      }

      console.log(`[INFO] Fetched ${releases.length} releases, now fetching details...`);

      // Fetch full details for each release using gh release view
      const releasesWithDetails = await Promise.all(
        releases.map(async (release, index) => {
          try {
            console.log(
              `[INFO] Fetching details for release ${index + 1}/${releases.length}: ${release.tagName}`
            );

            // Fetch full release data including body, assets, and author using gh release view
            const fullRelease = await execGhJson<any>(
              `release view ${release.tagName} --repo ${repoId} --json tagName,name,body,author,createdAt,publishedAt,isDraft,isPrerelease,assets,url`,
              { timeout: 30000, useRetry: true, useRateLimit: true }
            );

            return this.convertRelease(fullRelease);
          } catch (error: any) {
            console.log(`[INFO] Could not fetch details for ${release.tagName}: ${error.message}`);
            // Return release without body/assets/author
            return this.convertRelease({
              ...release,
              body: '',
              assets: [],
              author: { login: 'unknown' },
              url: `https://github.com/${repoId}/releases/tag/${release.tagName}`,
            });
          }
        })
      );

      console.log(`[INFO] Successfully processed ${releasesWithDetails.length} releases`);

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
          console.log(
            `[INFO] Diff mode: filtered to ${filteredReleases.length} releases published since ${sinceDate.toLocaleString()}`
          );
        }
      }

      return filteredReleases;
    } catch (error: any) {
      throw new Error(`Failed to fetch releases: ${error.message}`);
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

    if (release.assets && release.assets.length > 0) {
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
   * Convert GitHub CLI Release to our format
   */
  private convertRelease(ghRelease: any): Release {
    return {
      tagName: ghRelease.tagName,
      name: ghRelease.name || ghRelease.tagName,
      body: ghRelease.body || undefined,
      author: ghRelease.author?.login || 'unknown',
      createdAt: ghRelease.createdAt,
      publishedAt: ghRelease.publishedAt,
      isDraft: ghRelease.isDraft || false,
      isPrerelease: ghRelease.isPrerelease || false,
      assets:
        ghRelease.assets?.map((asset: any) => ({
          name: asset.name,
          size: asset.size || 0,
          downloadCount: asset.downloadCount || asset.download_count || 0,
          downloadUrl: asset.url || asset.browser_download_url || '',
        })) || [],
      url: ghRelease.url || ghRelease.html_url || '',
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
