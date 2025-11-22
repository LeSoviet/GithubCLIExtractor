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
      const files = await readdir(prDir);
      const prFiles = files.filter((f) => f.startsWith('PR-') && f.endsWith('.md'));

      const prs: ParsedPR[] = [];
      for (const file of prFiles) {
        try {
          const content = await readFile(join(prDir, file), 'utf-8');
          const pr = this.parsePullRequest(content);
          if (pr) {
            prs.push(pr);
          }
        } catch (error) {
          // Skip files that can't be parsed
          logger.debug(`Failed to parse PR file: ${file}`);
        }
      }

      return prs;
    } catch (error) {
      logger.debug('No Pull Requests directory found');
      return [];
    }
  }

  /**
   * Parse a single Pull Request markdown file
   */
  private parsePullRequest(content: string): ParsedPR | null {
    try {
      // Extract metadata section
      const metadataMatch = content.match(/## Metadata\n\n([\s\S]*?)\n\n/);
      if (!metadataMatch) return null;

      const metadata = metadataMatch[1];

      // Extract fields
      const number = this.extractNumber(metadata, 'number');
      const author = this.extractField(metadata, 'Author');
      const state = this.extractField(metadata, 'State') as 'OPEN' | 'CLOSED' | 'MERGED';
      const createdAt = this.extractField(metadata, 'Created');
      const closedAt = this.extractField(metadata, 'Closed');
      const mergedAt = this.extractField(metadata, 'Merged');
      const labels = this.extractLabels(metadata);
      const title = this.extractTitle(content);

      if (!number || !author || !state || !createdAt || !title) {
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
      // Extract metadata section
      const metadataMatch = content.match(/## Metadata\n\n([\s\S]*?)\n\n/);
      if (!metadataMatch) return null;

      const metadata = metadataMatch[1];

      // Extract fields
      const number = this.extractNumber(metadata, 'number');
      const author = this.extractField(metadata, 'Author');
      const state = this.extractField(metadata, 'State') as 'OPEN' | 'CLOSED';
      const createdAt = this.extractField(metadata, 'Created');
      const closedAt = this.extractField(metadata, 'Closed');
      const labels = this.extractLabels(metadata);
      const title = this.extractTitle(content);

      if (!number || !author || !state || !createdAt || !title) {
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
      // Extract metadata section
      const metadataMatch = content.match(/## Metadata\n\n([\s\S]*?)\n\n/);
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
   * Extract title from markdown content
   */
  private extractTitle(content: string): string {
    const match = content.match(/^# (?:Pull Request|Issue) #\d+: (.+)$/m);
    return match ? match[1] : '';
  }

  /**
   * Extract a numbered field from metadata
   */
  private extractNumber(metadata: string, field: string): number | null {
    const match = metadata.match(new RegExp(`- \\*\\*${field}\\*\\*: #?(\\d+)`, 'i'));
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract a text field from metadata
   */
  private extractField(metadata: string, field: string): string {
    const match = metadata.match(new RegExp(`- \\*\\*${field}\\*\\*: (.+)`, 'i'));
    if (!match) return '';

    const value = match[1].trim();
    // Remove markdown formatting
    return value.replace(/`/g, '').replace(/\*/g, '');
  }

  /**
   * Extract labels from metadata
   */
  private extractLabels(metadata: string): string[] {
    const match = metadata.match(/- \*\*Labels\*\*: (.+)/i);
    if (!match || match[1].includes('None')) return [];

    // Parse labels like: `label1`, `label2`, `label3`
    const labelsStr = match[1];
    const labels = labelsStr.match(/`([^`]+)`/g);
    return labels ? labels.map((l) => l.replace(/`/g, '')) : [];
  }
}
