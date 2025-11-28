import type { Repository, ExportFormat, ExportResult } from '../types/index.js';
import { ensureDirectory } from '../utils/output.js';
import { logger } from '../utils/logger.js';
import { formatDate } from '../utils/date-formatter.js';
import { writeMarkdown, writeJson } from '../utils/output.js';
import { join } from 'path';
import type { DiffModeOptions } from '../types/state.js';

export interface ExporterOptions {
  repository: Repository;
  outputPath: string;
  format: ExportFormat;
  diffMode?: DiffModeOptions;
  userFilter?: string; // Filter by specific user
}

/**
 * Abstract base class for all exporters
 */
export abstract class BaseExporter<T> {
  protected repository: Repository;
  protected outputPath: string;
  protected format: ExportFormat;
  protected diffMode?: DiffModeOptions;
  protected userFilter?: string;
  protected startTime: number = 0;
  protected apiCalls: number = 0;
  protected cacheHits: number = 0;

  constructor(options: ExporterOptions) {
    this.repository = options.repository;
    this.outputPath = options.outputPath;
    this.format = options.format;
    this.diffMode = options.diffMode;
    this.userFilter = options.userFilter;
  }

  /**
   * Main export method - orchestrates the entire export process
   */
  async export(): Promise<ExportResult> {
    this.startTime = Date.now();
    const result: ExportResult = {
      success: false,
      itemsExported: 0,
      itemsFailed: 0,
      apiCalls: 0,
      cacheHits: 0,
      duration: 0,
      errors: [],
    };

    try {
      logger.info(`Starting export for ${this.repository.owner}/${this.repository.name}...`);

      // Ensure output directory exists
      await ensureDirectory(this.outputPath);

      // Fetch data from GitHub
      const items = await this.fetchData();
      logger.info(`Fetched ${items.length} items`);

      // Process and export each item
      for (const item of items) {
        try {
          await this.exportItem(item);
          result.itemsExported++;
        } catch (error) {
          result.itemsFailed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(errorMsg);
          logger.error(`Failed to export item: ${errorMsg}`);
        }
      }

      result.success = result.itemsFailed === 0;
      result.apiCalls = this.apiCalls;
      result.cacheHits = this.cacheHits;
      result.duration = Date.now() - this.startTime;

      logger.success(
        `Export completed: ${result.itemsExported} exported, ${result.itemsFailed} failed`
      );

      return result;
    } catch (error) {
      result.success = false;
      result.duration = Date.now() - this.startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      logger.error(`Export failed: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Fetch data from GitHub API
   * Must be implemented by child classes
   */
  protected abstract fetchData(): Promise<T[]>;

  /**
   * Export a single item
   * Must be implemented by child classes
   */
  protected abstract exportItem(item: T): Promise<void>;

  /**
   * Convert item to Markdown format
   * Must be implemented by child classes
   */
  protected abstract toMarkdown(item: T): string;

  /**
   * Convert item to JSON format
   * Default implementation can be overridden
   */
  protected toJson(item: T): string {
    return JSON.stringify(item, null, 2);
  }

  /**
   * Get the export type name (for logging and paths)
   */
  protected abstract getExportType(): string;

  /**
   * Increment API call counter
   */
  protected incrementApiCalls(): void {
    this.apiCalls++;
  }

  /**
   * Increment cache hit counter
   */
  protected incrementCacheHits(): void {
    this.cacheHits++;
  }

  /**
   * Get repository identifier
   */
  protected getRepoIdentifier(): string {
    return `${this.repository.owner}/${this.repository.name}`;
  }

  /**
   * Check if diff mode is enabled
   */
  protected isDiffMode(): boolean {
    return this.diffMode?.enabled === true;
  }

  /**
   * Get the since date for diff mode filtering
   */
  protected getDiffModeSince(): string | undefined {
    return this.diffMode?.since;
  }

  /**
   * Log diff mode info
   */
  protected logDiffModeInfo(): void {
    if (this.isDiffMode() && this.diffMode?.since) {
      logger.info(
        `📅 Diff mode enabled: exporting items updated since ${new Date(this.diffMode.since).toLocaleString()}`
      );
    }
  }

  /**
   * Get user filter
   */
  protected getUserFilter(): string | undefined {
    return this.userFilter;
  }

  /**
   * Check if user filter is enabled
   */
  protected isUserFilterEnabled(): boolean {
    return this.userFilter !== undefined && this.userFilter !== '';
  }

  /**
   * Protected helper method to format dates for export
   */
  protected formatDate(dateString: string | Date): string {
    return formatDate(dateString);
  }

  /**
   * Apply filters (user filter + diff mode) to items
   * Should be called after conversion in fetchData implementations
   */
  protected async applyFilters<T extends Record<string, any>>(
    items: T[],
    options?: {
      authorField?: string;
      dateField?: string;
      log?: boolean;
    }
  ): Promise<T[]> {
    let filtered = items;
    const authorField = options?.authorField || 'author';
    const dateField = options?.dateField || 'updatedAt';
    const shouldLog = options?.log !== false;

    // Apply user filter
    if (this.isUserFilterEnabled()) {
      const userFilter = this.getUserFilter()!;
      filtered = filtered.filter((item) => {
        const author = item[authorField];
        return author && String(author).toLowerCase() === userFilter.toLowerCase();
      });
      if (shouldLog) {
        this.logFilteringAction(`user filter: ${filtered.length} items by user '${userFilter}'`);
      }
    }

    // Apply diff mode filter
    if (this.isDiffMode()) {
      const since = this.getDiffModeSince();
      if (since) {
        const sinceDate = new Date(since);
        filtered = filtered.filter((item) => {
          const itemDate = item[dateField];
          return itemDate && new Date(String(itemDate)) > sinceDate;
        });
        if (shouldLog) {
          this.logFilteringAction(
            `diff mode: ${filtered.length} items updated since ${sinceDate.toLocaleString()}`
          );
        }
      }
    }

    return filtered;
  }

  /**
   * Log filtering action
   */
  private logFilteringAction(message: string): void {
    logger.info(message);
  }

  /**
   * Template method for exporting items with markdown + optional JSON
   * Child classes should override toMarkdown() and can optionally override toJson()
   */
  protected async exportItemTemplate<T>(
    item: T,
    outputPath: string,
    options: {
      prefix: string;
      identifier: string | number;
      toMarkdown: (item: T) => string;
      toJson?: (item: T) => string;
    }
  ): Promise<void> {
    const { prefix, identifier, toMarkdown: mdFn, toJson: jsonFn } = options;

    // Always export as markdown
    const markdown = mdFn(item);
    const filename = `${prefix}-${identifier}.md`;
    const filepath = join(outputPath, filename);
    await writeMarkdown(filepath, markdown);

    // Export as JSON only if format is 'json'
    if (this.format === 'json') {
      const json = jsonFn ? jsonFn(item) : JSON.stringify(item, null, 2);
      const jsonFilename = `${prefix}-${identifier}.json`;
      const jsonFilepath = join(outputPath, jsonFilename);
      await writeJson(jsonFilepath, json);
    }
  }
}
