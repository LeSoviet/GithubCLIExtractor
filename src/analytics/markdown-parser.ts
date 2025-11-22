import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../utils/logger.js';

/**
 * Parsed PR data from exported markdown files
 */
export interface ParsedPR {
  number: number;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  author: string;
  createdAt: string;
  closedAt?: string;
  mergedAt?: string;
  labels: string[];
  title: string;
}

/**
 * Parsed Issue data from exported markdown files
 */
export interface ParsedIssue {
  number: number;
  state: 'OPEN' | 'CLOSED';
  author: string;
  createdAt: string;
  closedAt?: string;
  labels: string[];
  title: string;
}

/**
 * Parsed Release data from exported markdown files
 */
export interface ParsedRelease {
  tagName: string;
  createdAt: string;
  publishedAt?: string;
}

/**
 * Parse exported markdown files to extract analytics data
 */
export class MarkdownParser {
  private exportPath: string;

  constructor(exportPath: string) {
    this.exportPath = exportPath;
  }

  /**
   * Parse all Pull Request markdown files
   */
  async parsePullRequests(): Promise<ParsedPR[]> {
    try {
      const prDir = join(this.exportPath, 'Pull Requests');
      logger.debug(`Looking for PRs in: ${prDir}`);
      const files = await readdir(prDir);
      const prFiles = files.filter((f) => f.startsWith('PR-') && f.endsWith('.md'));
      logger.debug(`Found ${prFiles.length} PR files`);

      const prs: ParsedPR[] = [];
      let successCount = 0;
      let failCount = 0;
      for (const file of prFiles) {
        try {
          const content = await readFile(join(prDir, file), 'utf-8');
          const pr = this.parsePullRequest(content);
          if (pr) {
            prs.push(pr);
            successCount++;
          } else {
            failCount++;
            logger.debug(`Failed to parse PR file (returned null): ${file}`);
          }
        } catch (error) {
          // Skip files that can't be parsed
          failCount++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          logger.debug(`Failed to parse PR file (exception): ${file} - ${errorMsg}`);
        }
      }

      logger.debug(`Successfully parsed ${successCount} PRs, failed ${failCount}`);
      return prs;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.debug(`No Pull Requests directory found: ${errorMsg}`);
      return [];
    }
  }

  /**
   * Parse a single Pull Request markdown file
   */
  private parsePullRequest(content: string): ParsedPR | null {
    try {
      // Extract number from title (e.g., "# Pull Request #13790: Title")
      const titleMatch = content.match(/^# Pull Request #(\d+):\s*(.+?)\s*$/m);
      if (!titleMatch) {
        logger.debug('Failed to extract PR number and title from header');
        return null;
      }
      const number = parseInt(titleMatch[1]);
      const title = titleMatch[2].trim();

      // FIX: Improved Regex for the Metadata section.
      const metadataMatch = content.match(/## Metadata\s*([\s\S]*?)\s*(?:##|$)/);
      if (!metadataMatch) {
        logger.debug('Failed to find Metadata section');
        return null;
      }

      const metadata = metadataMatch[1];

      // Extract fields
      const author = this.extractField(metadata, 'Author');
      const state = this.extractField(metadata, 'State') as 'OPEN' | 'CLOSED' | 'MERGED';
      const createdAt = this.extractField(metadata, 'Created');
      const closedAt = this.extractField(metadata, 'Closed');
      const mergedAt = this.extractField(metadata, 'Merged');
      const labels = this.extractLabels(metadata);

      if (!author || !state || !createdAt) {
        logger.debug(
          `Missing required fields: author='${author}', state='${state}', created='${createdAt}'`
        );
        return null;
      }

      return {
        number,
        state,
        author,
        createdAt,
        closedAt: closedAt || undefined,
        mergedAt: mergedAt || undefined,
        labels,
        title,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.debug(`Exception parsing PR: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Parse all Issue markdown files
   */
  async parseIssues(): Promise<ParsedIssue[]> {
    try {
      const issueDir = join(this.exportPath, 'Issues');
      const files = await readdir(issueDir);
      const issueFiles = files.filter((f) => f.startsWith('ISSUE-') && f.endsWith('.md'));

      const issues: ParsedIssue[] = [];
      for (const file of issueFiles) {
        try {
          const content = await readFile(join(issueDir, file), 'utf-8');
          const issue = this.parseIssue(content);
          if (issue) {
            issues.push(issue);
          }
        } catch (error) {
          // Skip files that can't be parsed
          logger.debug(`Failed to parse Issue file: ${file}`);
        }
      }

      return issues;
    } catch (error) {
      logger.debug('No Issues directory found');
      return [];
    }
  }

  /**
   * Parse a single Issue markdown file
   */
  private parseIssue(content: string): ParsedIssue | null {
    try {
      // Extract number from title (e.g., "# Issue #13790: Title")
      const titleMatch = content.match(/^# Issue #(\d+):\s*(.+?)\s*$/m);
      if (!titleMatch) {
        logger.debug('Failed to extract Issue number and title from header');
        return null;
      }
      const number = parseInt(titleMatch[1]);
      const title = titleMatch[2].trim();

      // FIX: Improved Regex for the Metadata section.
      const metadataMatch = content.match(/## Metadata\s*([\s\S]*?)\s*(?:##|$)/);
      if (!metadataMatch) {
        logger.debug('Failed to find Metadata section');
        return null;
      }

      const metadata = metadataMatch[1];

      // Extract fields
      const author = this.extractField(metadata, 'Author');
      const state = this.extractField(metadata, 'State') as 'OPEN' | 'CLOSED';
      const createdAt = this.extractField(metadata, 'Created');
      const closedAt = this.extractField(metadata, 'Closed');
      const labels = this.extractLabels(metadata);

      if (!author || !state || !createdAt) {
        logger.debug(
          `Missing required fields: author=${author}, state=${state}, created=${createdAt}`
        );
        return null;
      }

      return {
        number,
        state,
        author,
        createdAt,
        closedAt: closedAt || undefined,
        labels,
        title,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.debug(`Exception parsing Issue: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Parse all Release markdown files
   */
  async parseReleases(): Promise<ParsedRelease[]> {
    try {
      const releaseDir = join(this.exportPath, 'Releases');
      const files = await readdir(releaseDir);
      const releaseFiles = files.filter((f) => f.startsWith('RELEASE-') && f.endsWith('.md'));

      const releases: ParsedRelease[] = [];
      for (const file of releaseFiles) {
        try {
          const content = await readFile(join(releaseDir, file), 'utf-8');
          const release = this.parseRelease(content);
          if (release) {
            releases.push(release);
          }
        } catch (error) {
          // Skip files that can't be parsed
          logger.debug(`Failed to parse Release file: ${file}`);
        }
      }

      return releases;
    } catch (error) {
      logger.debug('No Releases directory found');
      return [];
    }
  }

  /**
   * Parse a single Release markdown file
   */
  private parseRelease(content: string): ParsedRelease | null {
    try {
      // FIX: Improved Regex for the Metadata section.
      const metadataMatch = content.match(/## Metadata\s*([\s\S]*?)\s*(?:##|$)/);
      if (!metadataMatch) return null;

      const metadata = metadataMatch[1];

      // Extract fields
      const tagName = this.extractField(metadata, 'Tag');
      const createdAt = this.extractField(metadata, 'Created');
      const publishedAt = this.extractField(metadata, 'Published');

      if (!tagName || !createdAt) {
        return null;
      }

      return {
        tagName,
        createdAt,
        publishedAt: publishedAt || undefined,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract a text field from metadata
   */
  private extractField(metadata: string, field: string): string {
    // The format is: - **FieldName:** Value (colon is INSIDE the bold markers)
    const match = metadata.match(new RegExp(`- \\*\\*${field}:\\*\\*\\s*(.*)`, 'i'));
    if (!match) return '';

    const value = match[1].trim();
    // Remove markdown formatting
    return value.replace(/`/g, '').replace(/\*/g, '');
  }

  /**
   * Extract labels from metadata
   */
  private extractLabels(metadata: string): string[] {
    // The format is: - **Labels:** Value (colon is INSIDE the bold markers)
    const match = metadata.match(/- \*\*Labels:\*\*\s*(.+)/i);
    if (!match || match[1].includes('None')) return [];

    // Parse labels like: `label1`, `label2`, `label3`
    const labelsStr = match[1];
    const labels = labelsStr.match(/`([^`]+)`/g);
    return labels ? labels.map((l) => l.replace(/`/g, '')) : [];
  }
}
