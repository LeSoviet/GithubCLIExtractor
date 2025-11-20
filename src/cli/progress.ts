import ora, { Ora } from 'ora';
import chalk from 'chalk';
import type { ExportResult } from '../types/index.js';

/**
 * Progress tracker for export operations
 */
export class ProgressTracker {
  private spinner: Ora | null = null;
  private startTime: number = 0;

  /**
   * Start tracking progress
   */
  start(message: string): void {
    this.startTime = Date.now();
    this.spinner = ora({
      text: message,
      color: 'cyan',
    }).start();
  }

  /**
   * Update progress message
   */
  update(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  /**
   * Mark as success
   */
  succeed(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message || this.spinner.text);
      this.spinner = null;
    }
  }

  /**
   * Mark as failed
   */
  fail(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message || this.spinner.text);
      this.spinner = null;
    }
  }

  /**
   * Mark as warning
   */
  warn(message: string): void {
    if (this.spinner) {
      this.spinner.warn(message);
      this.spinner = null;
    }
  }

  /**
   * Stop spinner
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Show export summary
   */
  showSummary(result: ExportResult, rateLimit?: { remaining: number; limit: number }): void {
    console.log();
    console.log(chalk.bold('📊 Export Summary:'));
    console.log(chalk.gray('─'.repeat(50)));

    if (result.success) {
      console.log(chalk.green(`✔ Status: Success`));
    } else {
      console.log(chalk.red(`✖ Status: Failed`));
    }

    console.log(chalk.cyan(`📦 Total Items: ${result.itemsExported + result.itemsFailed}`));
    console.log(chalk.green(`✔ Exported: ${result.itemsExported}`));

    if (result.itemsFailed > 0) {
      console.log(chalk.red(`✖ Failed: ${result.itemsFailed}`));
    }

    console.log(chalk.blue(`🌐 API Calls: ${result.apiCalls}`));

    if (result.cacheHits > 0) {
      const cacheRate = ((result.cacheHits / (result.apiCalls + result.cacheHits)) * 100).toFixed(
        1
      );
      console.log(chalk.magenta(`💾 Cache Hits: ${result.cacheHits} (${cacheRate}%)`));
    }

    if (rateLimit) {
      const percentRemaining = (rateLimit.remaining / rateLimit.limit) * 100;
      const statusColor =
        percentRemaining > 50 ? chalk.green : percentRemaining > 20 ? chalk.yellow : chalk.red;
      console.log(
        statusColor(`⚡ Rate Limit: ${rateLimit.remaining}/${rateLimit.limit} remaining`)
      );
    }

    const durationSeconds = (result.duration / 1000).toFixed(2);
    console.log(chalk.yellow(`⏱️  Duration: ${durationSeconds}s`));

    if (result.errors.length > 0 && result.errors.length <= 5) {
      console.log();
      console.log(chalk.red('Errors:'));
      result.errors.forEach((error, index) => {
        console.log(chalk.red(`  ${index + 1}. ${error}`));
      });
    } else if (result.errors.length > 5) {
      console.log();
      console.log(chalk.red(`⚠️  ${result.errors.length} errors occurred (showing first 5):`));
      result.errors.slice(0, 5).forEach((error, index) => {
        console.log(chalk.red(`  ${index + 1}. ${error}`));
      });
    }

    console.log(chalk.gray('─'.repeat(50)));
    console.log();
  }
}

/**
 * Create a new progress tracker
 */
export function createProgressTracker(): ProgressTracker {
  return new ProgressTracker();
}
