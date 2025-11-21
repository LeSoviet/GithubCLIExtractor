import type { SingleExportType, ExportFormat } from './index.js';

/**
 * Configuration for batch export operations
 */
export interface BatchConfig {
  /** List of repositories in owner/name format */
  repositories: string[];

  /** Types of exports to perform */
  exportTypes: SingleExportType[];

  /** Export format */
  format: ExportFormat;

  /** Output base path */
  outputPath: string;

  /** Number of repositories to process in parallel (default: 3) */
  parallelism?: number;

  /** Enable diff mode for all exports */
  diffMode?: boolean;

  /** Force full export even with diff mode */
  forceFullExport?: boolean;

  /** Verbose output */
  verbose?: boolean;
}

/**
 * Result of a single repository export
 */
export interface BatchRepositoryResult {
  /** Repository identifier */
  repository: string;

  /** Whether the export succeeded */
  success: boolean;

  /** Export type that was performed */
  exportType: SingleExportType;

  /** Number of items exported */
  itemsExported: number;

  /** Number of items that failed */
  itemsFailed: number;

  /** API calls made */
  apiCalls: number;

  /** Duration in milliseconds */
  duration: number;

  /** Error message if failed */
  error?: string;
}

/**
 * Overall batch export result
 */
export interface BatchResult {
  /** Total repositories processed */
  totalRepositories: number;

  /** Successful repositories */
  successfulRepositories: number;

  /** Failed repositories */
  failedRepositories: number;

  /** Results per repository */
  results: BatchRepositoryResult[];

  /** Total duration in milliseconds */
  totalDuration: number;

  /** Total items exported across all repos */
  totalItemsExported: number;

  /** Total API calls made */
  totalApiCalls: number;
}

/**
 * Batch summary for markdown report
 */
export interface BatchSummary {
  /** Timestamp of batch export */
  timestamp: string;

  /** Configuration used */
  config: BatchConfig;

  /** Results */
  result: BatchResult;
}
