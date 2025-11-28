import { logger } from '../utils/logger.js';

/**
 * Dashboard statistics for export operations
 */
export interface DashboardStats {
  totalExports: number;
  successfulExports: number;
  failedExports: number;
  totalItemsProcessed: number;
  totalDuration: number;
  averageSpeed: number; // items per second
  topExportTypes: Array<{ type: string; count: number }>;
  topRepositories: Array<{ name: string; exports: number }>;
  hitRate: number; // cache hit rate percentage
}

/**
 * Analytics Dashboard for export metrics visualization
 * Provides CLI-based metrics display and historical tracking
 */
export class AnalyticsDashboard {
  private stats: DashboardStats = {
    totalExports: 0,
    successfulExports: 0,
    failedExports: 0,
    totalItemsProcessed: 0,
    totalDuration: 0,
    averageSpeed: 0,
    topExportTypes: [],
    topRepositories: [],
    hitRate: 0,
  };

  private exportTypeMap: Map<string, number> = new Map();
  private repositoryMap: Map<string, number> = new Map();
  private startTime: number = Date.now();

  constructor() {
    logger.debug('AnalyticsDashboard initialized');
  }

  /**
   * Record an export operation
   */
  recordExport(data: {
    repository: string;
    exportType: string;
    itemsProcessed: number;
    duration: number; // milliseconds
    success: boolean;
  }): void {
    this.stats.totalExports++;

    if (data.success) {
      this.stats.successfulExports++;
    } else {
      this.stats.failedExports++;
    }

    this.stats.totalItemsProcessed += data.itemsProcessed;
    this.stats.totalDuration += data.duration;

    // Track export types
    const typeCount = (this.exportTypeMap.get(data.exportType) || 0) + 1;
    this.exportTypeMap.set(data.exportType, typeCount);

    // Track repositories
    const repoCount = (this.repositoryMap.get(data.repository) || 0) + 1;
    this.repositoryMap.set(data.repository, repoCount);

    // Recalculate metrics
    this.calculateMetrics();
  }

  /**
   * Set cache hit rate
   */
  setCacheHitRate(hitRate: number): void {
    this.stats.hitRate = hitRate;
  }

  /**
   * Calculate derived metrics
   */
  private calculateMetrics(): void {
    // Calculate average speed (items per second)
    if (this.stats.totalDuration > 0) {
      this.stats.averageSpeed = (this.stats.totalItemsProcessed / this.stats.totalDuration) * 1000;
    }

    // Get top export types
    this.stats.topExportTypes = Array.from(this.exportTypeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get top repositories
    this.stats.topRepositories = Array.from(this.repositoryMap.entries())
      .map(([name, exports]) => ({ name, exports }))
      .sort((a, b) => b.exports - a.exports)
      .slice(0, 5);
  }

  /**
   * Get current statistics
   */
  getStats(): DashboardStats {
    return { ...this.stats };
  }

  /**
   * Render text-based dashboard
   */
  render(): string {
    const successRate =
      this.stats.totalExports > 0
        ? ((this.stats.successfulExports / this.stats.totalExports) * 100).toFixed(1)
        : '0';

    const duration = (this.stats.totalDuration / 1000).toFixed(2);

    let output = '\n';
    output += this.renderHeader('Export Analytics Dashboard');
    output += '\n';

    // Summary section
    output += this.renderSection('Summary');
    output += this.renderRow('Total Exports', this.stats.totalExports);
    output += this.renderRow('Successful', this.stats.successfulExports);
    output += this.renderRow('Failed', this.stats.failedExports);
    output += this.renderRow('Success Rate', `${successRate}%`);
    output += '\n';

    // Performance section
    output += this.renderSection('Performance');
    output += this.renderRow('Total Items Processed', this.stats.totalItemsProcessed);
    output += this.renderRow('Total Duration', `${duration}s`);
    output += this.renderRow('Average Speed', `${this.stats.averageSpeed.toFixed(2)} items/sec`);
    output += this.renderRow('Cache Hit Rate', `${this.stats.hitRate.toFixed(1)}%`);
    output += '\n';

    // Top export types
    if (this.stats.topExportTypes.length > 0) {
      output += this.renderSection('Top Export Types');
      for (const item of this.stats.topExportTypes) {
        output += this.renderRow(item.type, item.count);
      }
      output += '\n';
    }

    // Top repositories
    if (this.stats.topRepositories.length > 0) {
      output += this.renderSection('Top Repositories');
      for (const item of this.stats.topRepositories) {
        output += this.renderRow(item.name, item.exports);
      }
      output += '\n';
    }

    // Progress bar
    output += this.renderProgressBar(
      'Export Health',
      this.stats.successfulExports,
      this.stats.totalExports
    );
    output += '\n';

    return output;
  }

  /**
   * Render header
   */
  private renderHeader(title: string): string {
    const width = 50;
    const padding = Math.max(0, Math.floor((width - title.length) / 2));
    return '═'.repeat(width) + '\n' + ' '.repeat(padding) + title + '\n' + '═'.repeat(width);
  }

  /**
   * Render section header
   */
  private renderSection(title: string): string {
    return '── ' + title + ' ' + '─'.repeat(Math.max(0, 40 - title.length)) + '\n';
  }

  /**
   * Render a key-value row
   */
  private renderRow(label: string, value: number | string): string {
    const paddingWidth = 25 - label.length;
    const padding = ' '.repeat(Math.max(0, paddingWidth));
    return `  ${label}${padding}: ${value}\n`;
  }

  /**
   * Render a progress bar
   */
  private renderProgressBar(label: string, current: number, total: number): string {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    const filledWidth = Math.round(percentage / 5); // 20 chars total
    const emptyWidth = 20 - filledWidth;

    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(emptyWidth);
    const bar = `${filled}${empty}`;

    return `  ${label}: [${bar}] ${percentage.toFixed(1)}%\n`;
  }

  /**
   * Export statistics as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(this.stats, null, 2);
  }

  /**
   * Export statistics as CSV
   */
  exportAsCSV(): string {
    let csv = 'Metric,Value\n';
    csv += `Total Exports,${this.stats.totalExports}\n`;
    csv += `Successful Exports,${this.stats.successfulExports}\n`;
    csv += `Failed Exports,${this.stats.failedExports}\n`;
    csv += `Total Items Processed,${this.stats.totalItemsProcessed}\n`;
    csv += `Total Duration (ms),${this.stats.totalDuration}\n`;
    csv += `Average Speed (items/sec),${this.stats.averageSpeed.toFixed(2)}\n`;
    csv += `Cache Hit Rate (%),${this.stats.hitRate.toFixed(1)}\n`;

    for (const type of this.stats.topExportTypes) {
      csv += `${type.type},${type.count}\n`;
    }

    return csv;
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.stats = {
      totalExports: 0,
      successfulExports: 0,
      failedExports: 0,
      totalItemsProcessed: 0,
      totalDuration: 0,
      averageSpeed: 0,
      topExportTypes: [],
      topRepositories: [],
      hitRate: 0,
    };
    this.exportTypeMap.clear();
    this.repositoryMap.clear();
    this.startTime = Date.now();
    logger.info('Dashboard statistics reset');
  }

  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  /**
   * Print dashboard to console
   */
  print(): void {
    console.log(this.render());
  }
}

/**
 * Singleton dashboard instance
 */
let dashboardInstance: AnalyticsDashboard | null = null;

/**
 * Get or create global dashboard
 */
export function getAnalyticsDashboard(): AnalyticsDashboard {
  if (!dashboardInstance) {
    dashboardInstance = new AnalyticsDashboard();
  }
  return dashboardInstance;
}
