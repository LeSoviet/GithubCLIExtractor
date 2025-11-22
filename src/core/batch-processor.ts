import type {
  BatchConfig,
  BatchResult,
  BatchRepositoryResult,
  BatchSummary,
} from '../types/batch.js';
import { getRepositoryFromString } from '../scanner/repo-scanner.js';
import { PullRequestExporter } from '../exporters/prs.js';
import { IssueExporter } from '../exporters/issues.js';
import { CommitExporter } from '../exporters/commits.js';
import { BranchExporter } from '../exporters/branches.js';
import { ReleaseExporter } from '../exporters/releases.js';
import { buildOutputPath } from '../utils/output.js';
import { getStateManager } from './state-manager.js';
import { AnalyticsProcessor } from '../analytics/analytics-processor.js';
import { showInfo, showSuccess, showError } from '../cli/prompts.js';
import type { Repository, SingleExportType } from '../types/index.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * BatchProcessor handles exporting multiple repositories in parallel
 */
export class BatchProcessor {
  private config: BatchConfig;
  private startTime: number = 0;

  constructor(config: BatchConfig) {
    this.config = config;
  }

  /**
   * Process batch export for all repositories
   */
  async process(): Promise<BatchResult> {
    this.startTime = Date.now();

    const result: BatchResult = {
      totalRepositories: this.config.repositories.length,
      successfulRepositories: 0,
      failedRepositories: 0,
      results: [],
      totalDuration: 0,
      totalItemsExported: 0,
      totalApiCalls: 0,
    };

    showInfo(`Starting batch export for ${this.config.repositories.length} repositories...`);
    showInfo(`Parallelism: ${this.config.parallelism || 3}`);
    showInfo(`Export types: ${this.config.exportTypes.join(', ')}`);
    console.log();

    // Process repositories with controlled parallelism
    const parallelism = this.config.parallelism || 3;
    const chunks = this.chunkArray(this.config.repositories, parallelism);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      showInfo(
        `Processing batch ${chunkIndex + 1}/${chunks.length} (${chunk.length} repositories)...`
      );

      // Process chunk in parallel
      const chunkResults = await Promise.allSettled(
        chunk.map((repoString) => this.processRepository(repoString))
      );

      // Collect results
      for (const promiseResult of chunkResults) {
        if (promiseResult.status === 'fulfilled') {
          const repoResults = promiseResult.value;
          result.results.push(...repoResults);

          // Count successes
          const successCount = repoResults.filter((r) => r.success).length;
          result.successfulRepositories += successCount > 0 ? 1 : 0;
          result.failedRepositories += successCount === 0 ? 1 : 0;
        } else {
          // Promise rejected
          result.failedRepositories++;
          console.error(`Batch error: ${promiseResult.reason}`);
        }
      }
    }

    // Calculate totals
    result.totalDuration = Date.now() - this.startTime;
    result.totalItemsExported = result.results.reduce((sum, r) => sum + r.itemsExported, 0);
    result.totalApiCalls = result.results.reduce((sum, r) => sum + r.apiCalls, 0);

    // Generate summary
    await this.generateSummary(result);

    // Show final summary
    console.log();
    showInfo('Batch export summary:');
    console.log(`  Total repositories: ${result.totalRepositories}`);
    console.log(`  Successful: ${result.successfulRepositories}`);
    console.log(`  Failed: ${result.failedRepositories}`);
    console.log(`  Total items exported: ${result.totalItemsExported}`);
    console.log(`  Total duration: ${(result.totalDuration / 1000).toFixed(2)}s`);
    console.log();

    showSuccess(
      `Batch export completed! Summary saved to: ${this.config.outputPath}/batch-summary.md`
    );

    return result;
  }

  /**
   * Process a single repository with all export types
   */
  private async processRepository(repoString: string): Promise<BatchRepositoryResult[]> {
    const results: BatchRepositoryResult[] = [];

    try {
      // Validate and get repository info
      showInfo(`Validating repository: ${repoString}...`);
      const repository = await getRepositoryFromString(repoString);

      // Process each export type
      for (const exportType of this.config.exportTypes) {
        const repoStartTime = Date.now();

        try {
          showInfo(`Exporting ${exportType} from ${repository.owner}/${repository.name}...`);

          const result = await this.exportSingleType(repository, exportType);

          results.push({
            repository: `${repository.owner}/${repository.name}`,
            success: result.success,
            exportType,
            itemsExported: result.itemsExported,
            itemsFailed: result.itemsFailed,
            apiCalls: result.apiCalls,
            duration: Date.now() - repoStartTime,
          });

          if (result.success) {
            showSuccess(
              `✓ ${repository.owner}/${repository.name} - ${exportType}: ${result.itemsExported} items`
            );
          } else {
            showError(`✗ ${repository.owner}/${repository.name} - ${exportType}: Failed`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            repository: `${repository.owner}/${repository.name}`,
            success: false,
            exportType,
            itemsExported: 0,
            itemsFailed: 0,
            apiCalls: 0,
            duration: Date.now() - repoStartTime,
            error: errorMsg,
          });

          showError(`✗ ${repository.owner}/${repository.name} - ${exportType}: ${errorMsg}`);
        }
      }
    } catch (error) {
      // Repository validation failed
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      showError(`✗ ${repoString}: ${errorMsg}`);

      // Add failed result for all export types
      for (const exportType of this.config.exportTypes) {
        results.push({
          repository: repoString,
          success: false,
          exportType,
          itemsExported: 0,
          itemsFailed: 0,
          apiCalls: 0,
          duration: 0,
          error: errorMsg,
        });
      }
    }

    return results;
  }

  /**
   * Export a single type for a repository
   */
  private async exportSingleType(
    repository: Repository,
    exportType: SingleExportType | 'analytics'
  ) {
    // Handle analytics separately
    if (exportType === 'analytics') {
      // For analytics, use the base repository path (without export type subfolder)
      const exportPath = join(this.config.outputPath, repository.owner, repository.name);

      const analyticsOptions = {
        enabled: true,
        format: this.config.format,
        outputPath: this.config.outputPath,
        repository: repository,
        offline: true, // Use offline mode - parse exported files
        exportedDataPath: exportPath,
      };

      const analyticsProcessor = new AnalyticsProcessor(analyticsOptions);
      await analyticsProcessor.generateReport();

      // Return a mock result for analytics
      return {
        success: true,
        itemsExported: 1,
        itemsFailed: 0,
        apiCalls: 0,
        cacheHits: 0,
        duration: 1000,
        errors: [],
      };
    }

    const finalOutputPath = buildOutputPath(
      this.config.outputPath,
      repository.owner,
      repository.name,
      this.getExportTypeName(exportType)
    );

    // Get diff mode options if enabled
    const stateManager = getStateManager();
    const diffModeOptions = this.config.diffMode
      ? await stateManager.getDiffModeOptions(
          `${repository.owner}/${repository.name}`,
          exportType as SingleExportType,
          this.config.forceFullExport
        )
      : undefined;

    const exportOptions = {
      repository,
      outputPath: finalOutputPath,
      format: this.config.format,
      diffMode: diffModeOptions,
    };

    // Create appropriate exporter
    const exporter = this.createExporter(exportType as SingleExportType, exportOptions);

    // Execute export
    const result = await exporter.export();

    // Update state if diff mode is enabled
    if (this.config.diffMode && result.success) {
      await stateManager.updateExportState(
        `${repository.owner}/${repository.name}`,
        exportType as SingleExportType,
        result.itemsExported,
        this.config.format,
        finalOutputPath
      );
    }

    return result;
  }

  /**
   * Create the appropriate exporter based on type
   */
  private createExporter(exportType: SingleExportType, options: any) {
    switch (exportType) {
      case 'prs':
        return new PullRequestExporter(options);
      case 'issues':
        return new IssueExporter(options);
      case 'commits':
        return new CommitExporter(options);
      case 'branches':
        return new BranchExporter(options);
      case 'releases':
        return new ReleaseExporter(options);
      default:
        throw new Error(`Unknown export type: ${exportType}`);
    }
  }

  /**
   * Get human-readable name for export type
   */
  private getExportTypeName(type: SingleExportType | 'analytics'): string {
    const names: Record<SingleExportType | 'analytics', string> = {
      prs: 'Pull Requests',
      issues: 'Issues',
      commits: 'Commits',
      branches: 'Branches',
      releases: 'Releases',
      analytics: 'Analytics Report',
    };
    return names[type];
  }

  /**
   * Generate markdown summary of batch export
   */
  private async generateSummary(result: BatchResult): Promise<void> {
    const summary: BatchSummary = {
      timestamp: new Date().toISOString(),
      config: this.config,
      result,
    };

    const markdown = this.summaryToMarkdown(summary);

    // Ensure output directory exists
    await mkdir(this.config.outputPath, { recursive: true });

    // Write summary file
    const summaryPath = join(this.config.outputPath, 'batch-summary.md');
    await writeFile(summaryPath, markdown, 'utf-8');
  }

  /**
   * Convert summary to markdown format
   */
  private summaryToMarkdown(summary: BatchSummary): string {
    const { config, result } = summary;

    let md = `# Batch Export Summary\n\n`;
    md += `**Generated:** ${new Date(summary.timestamp).toLocaleString()}\n\n`;

    md += `## Configuration\n\n`;
    md += `- **Repositories:** ${config.repositories.length}\n`;
    md += `- **Export Types:** ${config.exportTypes.join(', ')}\n`;
    md += `- **Format:** ${config.format}\n`;
    md += `- **Parallelism:** ${config.parallelism || 3}\n`;
    md += `- **Diff Mode:** ${config.diffMode ? 'Enabled' : 'Disabled'}\n`;
    md += `- **Output Path:** \`${config.outputPath}\`\n\n`;

    md += `## Overall Results\n\n`;
    md += `- **Total Repositories:** ${result.totalRepositories}\n`;
    md += `- **Successful:** ${result.successfulRepositories} ✓\n`;
    md += `- **Failed:** ${result.failedRepositories} ✗\n`;
    md += `- **Total Items Exported:** ${result.totalItemsExported}\n`;
    md += `- **Total API Calls:** ${result.totalApiCalls}\n`;
    md += `- **Total Duration:** ${(result.totalDuration / 1000).toFixed(2)}s\n\n`;

    md += `## Repository Details\n\n`;

    // Group results by repository
    const byRepo = new Map<string, BatchRepositoryResult[]>();
    for (const r of result.results) {
      if (!byRepo.has(r.repository)) {
        byRepo.set(r.repository, []);
      }
      byRepo.get(r.repository)!.push(r);
    }

    for (const [repo, repoResults] of byRepo) {
      const allSuccess = repoResults.every((r) => r.success);
      const status = allSuccess ? '✓' : '✗';

      md += `### ${status} ${repo}\n\n`;

      md += `| Export Type | Status | Items | Duration |\n`;
      md += `|-------------|--------|-------|----------|\n`;

      for (const r of repoResults) {
        const statusIcon = r.success ? '✓' : '✗';
        const durationStr = `${(r.duration / 1000).toFixed(2)}s`;
        md += `| ${r.exportType} | ${statusIcon} | ${r.itemsExported} | ${durationStr} |\n`;

        if (r.error) {
          md += `\n**Error:** ${r.error}\n`;
        }
      }

      md += `\n`;
    }

    md += `---\n\n`;
    md += `*Generated with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*\n`;

    return md;
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
