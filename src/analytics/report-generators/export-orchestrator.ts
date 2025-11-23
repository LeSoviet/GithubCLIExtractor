import { promises as fs } from 'fs';
import path from 'path';
import type { AnalyticsReport } from '../../types/analytics.js';
import { AnalyticsExporterFactory, type ExportFormat } from './exporter-factory.js';
import { ensureDirectory } from '../../utils/output.js';

/**
 * Result of an export operation
 */
export interface ExportOperationResult {
  /** Format that was exported */
  format: string;
  /** File path where the export was saved */
  filePath: string;
  /** Whether the export was successful */
  success: boolean;
  /** Error message if export failed */
  error?: string;
}

/**
 * Result of orchestrated export operation
 */
export interface OrchestrationResult {
  /** Whether all exports succeeded */
  success: boolean;
  /** Individual export results */
  exports: ExportOperationResult[];
  /** Total number of exports attempted */
  totalExports: number;
  /** Number of successful exports */
  successfulExports: number;
  /** Number of failed exports */
  failedExports: number;
}

/**
 * Options for export orchestration
 */
export interface ExportOrchestratorOptions {
  /** Export format(s) to use */
  format: ExportFormat;
  /** Base output path (directory) */
  outputPath: string;
  /** Base filename (without extension) */
  baseFilename: string;
  /** Package version for metadata */
  packageVersion?: string;
}

/**
 * Orchestrates the export of analytics reports in multiple formats
 * Coordinates the factory, file I/O, and error handling
 */
export class ExportOrchestrator {
  /**
   * Export analytics report in specified format(s)
   * @param report - Analytics report to export
   * @param options - Export orchestration options
   * @returns Promise resolving to orchestration result
   */
  async export(
    report: AnalyticsReport,
    options: ExportOrchestratorOptions
  ): Promise<OrchestrationResult> {
    const { format, outputPath, baseFilename, packageVersion } = options;

    // Ensure output directory exists
    try {
      await ensureDirectory(outputPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createFailedResult(`Failed to create output directory: ${errorMessage}`);
    }

    // Create exporters for the requested format(s)
    const exporters = AnalyticsExporterFactory.createExporters(format);

    // Execute exports
    const exportResults: ExportOperationResult[] = [];

    for (const exporter of exporters) {
      const result = await this.executeExport(
        report,
        exporter,
        outputPath,
        baseFilename,
        packageVersion
      );
      exportResults.push(result);
    }

    // Aggregate results
    const successfulExports = exportResults.filter((r) => r.success).length;
    const failedExports = exportResults.length - successfulExports;

    return {
      success: failedExports === 0,
      exports: exportResults,
      totalExports: exportResults.length,
      successfulExports,
      failedExports,
    };
  }

  /**
   * Execute a single export operation
   */
  private async executeExport(
    report: AnalyticsReport,
    exporter: any,
    outputPath: string,
    baseFilename: string,
    packageVersion?: string
  ): Promise<ExportOperationResult> {
    const format = exporter.getFormatName();
    const extension = exporter.getFileExtension();
    const filePath = path.join(outputPath, `${baseFilename}${extension}`);

    try {
      // Generate export content
      const content = await exporter.export(report, packageVersion);

      // Write to file
      await fs.writeFile(filePath, content, 'utf8');

      return {
        format,
        filePath,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        format,
        filePath,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create a failed orchestration result
   */
  private createFailedResult(errorMessage: string): OrchestrationResult {
    return {
      success: false,
      exports: [
        {
          format: 'unknown',
          filePath: '',
          success: false,
          error: errorMessage,
        },
      ],
      totalExports: 1,
      successfulExports: 0,
      failedExports: 1,
    };
  }

  /**
   * Get a summary message from orchestration result
   * @param result - Orchestration result
   * @returns Human-readable summary message
   */
  static getSummaryMessage(result: OrchestrationResult): string {
    if (!result.success) {
      const errors = result.exports
        .filter((e) => !e.success)
        .map((e) => `${e.format}: ${e.error}`)
        .join(', ');
      return `Export failed: ${errors}`;
    }

    const formats = result.exports.map((e) => e.format).join(', ');
    const files = result.exports.map((e) => e.filePath).join(', ');

    if (result.exports.length === 1) {
      return `Analytics report exported as ${formats}: ${files}`;
    }

    return `Analytics report exported in ${result.exports.length} formats (${formats})`;
  }

  /**
   * Get file paths from successful exports
   * @param result - Orchestration result
   * @returns Array of file paths for successful exports
   */
  static getExportedFiles(result: OrchestrationResult): string[] {
    return result.exports.filter((e) => e.success).map((e) => e.filePath);
  }
}
