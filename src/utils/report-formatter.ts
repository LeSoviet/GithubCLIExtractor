import type { ExportFormat } from '../types/index.js';
import { sanitizeUnicode, decodeUnicode } from './sanitize.js';
import { formatDate } from './date-formatter.js';

/**
 * Unified ReportFormatter for consistent markdown/JSON formatting across all exporters
 * Reduces code duplication and ensures consistent output
 */
export class ReportFormatter {
  private format: ExportFormat;

  constructor(format: ExportFormat = 'markdown') {
    this.format = format;
  }

  /**
   * Format a simple key-value pair for markdown
   */
  formatMetadata(key: string, value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    return `- **${key}:** ${this.sanitizeValue(value)}\n`;
  }

  /**
   * Format multiple metadata items
   */
  formatMetadataBlock(items: Record<string, string | number | boolean | null | undefined>): string {
    return Object.entries(items)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => this.formatMetadata(key, value))
      .join('');
  }

  /**
   * Format a section header
   */
  formatSection(title: string, level: number = 2): string {
    const heading = '#'.repeat(Math.min(level, 6));
    return `${heading} ${title}\n\n`;
  }

  /**
   * Format labels/tags as inline code
   */
  formatLabels(labels: string[]): string {
    if (labels.length === 0) {
      return 'None';
    }
    return labels.map((label) => `\`${sanitizeUnicode(label)}\``).join(', ');
  }

  /**
   * Format a list of items
   */
  formatList(items: string[]): string {
    return items.map((item) => `- ${this.sanitizeValue(item)}`).join('\n');
  }

  /**
   * Format a table header
   */
  formatTableHeader(columns: string[]): string {
    const header = columns.join(' | ');
    const separator = columns.map(() => '---').join(' | ');
    return `| ${header} |\n| ${separator} |\n`;
  }

  /**
   * Format a table row
   */
  formatTableRow(values: (string | number | boolean)[]): string {
    return `| ${values.map((v) => this.sanitizeValue(v)).join(' | ')} |\n`;
  }

  /**
   * Format a complete table
   */
  formatTable(header: string[], rows: (string | number | boolean)[][]): string {
    let table = this.formatTableHeader(header);
    for (const row of rows) {
      table += this.formatTableRow(row);
    }
    return table;
  }

  /**
   * Format a date consistently
   */
  formatDateField(dateString: string | Date | null | undefined): string {
    if (!dateString) {
      return 'N/A';
    }
    return formatDate(dateString);
  }

  /**
   * Format a code block
   */
  formatCodeBlock(code: string, language: string = 'text'): string {
    return `\`\`\`${language}
${code}
\`\`\`

`;
  }

  /**
   * Format a blockquote
   */
  formatBlockquote(text: string): string {
    const lines = text.split('\n');
    return lines.map((line) => `> ${line}`).join('\n') + '\n\n';
  }

  /**
   * Format a link
   */
  formatLink(text: string, url: string): string {
    return `[${this.sanitizeValue(text)}](${url})`;
  }

  /**
   * Format bold text
   */
  formatBold(text: string): string {
    return `**${this.sanitizeValue(text)}**`;
  }

  /**
   * Format italic text
   */
  formatItalic(text: string): string {
    return `*${this.sanitizeValue(text)}*`;
  }

  /**
   * Format a horizontal rule
   */
  formatHorizontalRule(): string {
    return '---\n\n';
  }

  /**
   * Format footer with attribution
   */
  formatFooter(): string {
    return `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*\n`;
  }

  /**
   * Sanitize a value for markdown output
   */
  private sanitizeValue(value: string | number | boolean): string {
    if (typeof value === 'string') {
      return sanitizeUnicode(decodeUnicode(value));
    }
    return String(value);
  }

  /**
   * Format an item for export (markdown or JSON)
   */
  formatItem<T>(item: T, toMarkdown: (item: T) => string, toJson?: (item: T) => string): string {
    if (this.format === 'json') {
      if (toJson) {
        return toJson(item);
      }
      return JSON.stringify(item, null, 2);
    }
    return toMarkdown(item);
  }

  /**
   * Create a summary block
   */
  formatSummary(stats: Record<string, string | number>): string {
    let summary = '## Summary\n\n';
    summary += this.formatMetadataBlock(stats);
    return summary + '\n';
  }

  /**
   * Create a statistics table
   */
  formatStatisticsTable(stats: Array<{ label: string; value: string | number }>): string {
    const header = ['Metric', 'Value'];
    const rows = stats.map((stat) => [stat.label, stat.value]);
    return this.formatTable(header, rows);
  }

  /**
   * Get current format
   */
  getFormat(): ExportFormat {
    return this.format;
  }

  /**
   * Set format
   */
  setFormat(format: ExportFormat): void {
    this.format = format;
  }

  /**
   * Check if exporting as JSON
   */
  isJsonFormat(): boolean {
    return this.format === 'json';
  }

  /**
   * Check if exporting as Markdown
   */
  isMarkdownFormat(): boolean {
    return this.format === 'markdown';
  }
}

/**
 * Factory function for easier instantiation
 */
export function createReportFormatter(format: ExportFormat = 'markdown'): ReportFormatter {
  return new ReportFormatter(format);
}
