import type { AnalyticsReport } from '../../types/analytics.js';

/**
 * Interface for analytics report exporters
 */
export interface AnalyticsExporter {
  /**
   * Export analytics report in a specific format
   * @param report - Analytics report to export
   * @param packageVersion - Version of the package generating the report
   * @returns Promise resolving to the exported content
   */
  export(report: AnalyticsReport, packageVersion?: string): Promise<string>;

  /**
   * Get the file extension for this exporter's format
   */
  getFileExtension(): string;

  /**
   * Get the format name for this exporter
   */
  getFormatName(): string;
}

/**
 * Markdown format exporter for analytics reports
 */
export class MarkdownAnalyticsExporter implements AnalyticsExporter {
  async export(report: AnalyticsReport, packageVersion: string = 'unknown'): Promise<string> {
    // Lazy load the MarkdownReportGenerator to avoid circular dependencies
    const { MarkdownReportGenerator } = await import('./markdown-generator.js');
    const generator = new MarkdownReportGenerator();
    return generator.generate(report, packageVersion);
  }

  getFileExtension(): string {
    return '.md';
  }

  getFormatName(): string {
    return 'markdown';
  }
}

/**
 * JSON format exporter for analytics reports
 */
export class JsonAnalyticsExporter implements AnalyticsExporter {
  async export(report: AnalyticsReport, _packageVersion?: string): Promise<string> {
    return JSON.stringify(report, null, 2);
  }

  getFileExtension(): string {
    return '.json';
  }

  getFormatName(): string {
    return 'json';
  }
}

/**
 * Export format options
 */
export type ExportFormat = 'markdown' | 'json' | 'both';

/**
 * Factory for creating analytics report exporters
 */
export class AnalyticsExporterFactory {
  /**
   * Create exporter(s) for the specified format
   * @param format - Export format ('markdown', 'json', or 'both')
   * @returns Array of exporters matching the requested format
   */
  static createExporters(format: ExportFormat): AnalyticsExporter[] {
    switch (format) {
      case 'markdown':
        return [new MarkdownAnalyticsExporter()];
      case 'json':
        return [new JsonAnalyticsExporter()];
      case 'both':
        return [new MarkdownAnalyticsExporter(), new JsonAnalyticsExporter()];
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  /**
   * Create a single exporter for the specified format
   * @param format - Export format ('markdown' or 'json')
   * @returns Single exporter matching the requested format
   * @throws Error if 'both' is specified (use createExporters instead)
   */
  static createExporter(format: 'markdown' | 'json'): AnalyticsExporter {
    const exporters = this.createExporters(format);
    return exporters[0];
  }
}
