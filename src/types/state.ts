/**
 * State management types for incremental exports
 */

import type { SingleExportType } from './index.js';

export interface ExportState {
  /** Repository identifier (owner/name) */
  repository: string;

  /** Export type */
  type: SingleExportType;

  /** Timestamp of last successful export */
  lastExportAt: string;

  /** Number of items exported in last run */
  lastCount: number;

  /** Export format used */
  format: 'markdown' | 'json' | 'both';

  /** Output path used */
  outputPath: string;
}

export interface StateStore {
  /** Version of state file format */
  version: string;

  /** All export states */
  exports: ExportState[];

  /** Last updated timestamp */
  updatedAt: string;
}

export interface DiffModeOptions {
  /** Enable diff mode */
  enabled: boolean;

  /** Only export items created/updated after this date */
  since?: string;

  /** Force full export even if state exists */
  forceFullExport?: boolean;
}
