import type { Repository, ExportFormat, ExportResult } from '../types/index.js';
import { ensureDirectory } from '../utils/output.js';
import { logger } from '../utils/logger.js';
import type { DiffModeOptions } from '../types/state.js';

export interface ExporterOptions {
  repository: Repository;
  outputPath: string;
  format: ExportFormat;
  diffMode?: DiffModeOptions;
}

/**
 * Abstract base class for all exporters
 */
export abstract class BaseExporter<T> {
  protected repository: Repository;
  protected outputPath: string;
  protected format: ExportFormat;
  protected diffMode?: DiffModeOptions;
  protected startTime: number = 0;
  protected apiCalls: number = 0;
  protected cacheHits: number = 0;

  constructor(options: ExporterOptions) {
    this.repository = options.repository;
    this.outputPath = options.outputPath;
    this.format = options.format;
    this.diffMode = options.diffMode;
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
}
