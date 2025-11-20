#!/usr/bin/env node

import {
  showWelcome,
  selectRepository,
  selectExportType,
  selectExportFormat,
  selectOutputPath,
  showError,
  showSuccess,
  showInfo,
  showOutro,
} from './cli/prompts.js';
import { createProgressTracker, ProgressTracker } from './cli/progress.js';
import { checkGhInstalled, getAuthStatus } from './core/github-auth.js';
import { getRateLimiter } from './core/rate-limiter.js';
import { displayRateLimit } from './cli/rate-limit-display.js';
import { listUserRepositories } from './scanner/repo-scanner.js';
import { PullRequestExporter } from './exporters/prs.js';
import { IssueExporter } from './exporters/issues.js';
import { CommitExporter } from './exporters/commits.js';
import { BranchExporter } from './exporters/branches.js';
import { ReleaseExporter } from './exporters/releases.js';
import { buildOutputPath } from './utils/output.js';
import type { ExportOptions, ExportType } from './types/index.js';
import type { BaseExporter } from './exporters/base-exporter.js';

async function main() {
  try {
    // Check if GitHub CLI is installed
    const ghInstalled = await checkGhInstalled();
    if (!ghInstalled) {
      showError('GitHub CLI (gh) is not installed!');
      showInfo('Please install it from: https://cli.github.com/');
      process.exit(1);
    }

    // Check authentication status
    const authStatus = await getAuthStatus();
    if (!authStatus.isAuthenticated) {
      showError('You are not logged in to GitHub CLI');
      showInfo('Please run: gh auth login');
      process.exit(1);
    }

    // Show welcome screen
    await showWelcome(authStatus.username);

    // Check and display rate limit
    const rateLimiter = getRateLimiter();
    const rateLimit = await rateLimiter.fetchRateLimitStatus();
    displayRateLimit(rateLimit);

    // Scan repositories
    showInfo('Scanning repositories...');
    const repositories = await listUserRepositories();

    if (repositories.length === 0) {
      showError('No repositories found');
      process.exit(1);
    }

    showSuccess(`Found ${repositories.length} repositories`);

    // Select repository
    const selectedRepo = await selectRepository(repositories);
    showInfo(`Selected: ${selectedRepo.owner}/${selectedRepo.name}`);

    // Select export type
    const exportType = await selectExportType();

    // Select export format
    const exportFormat = await selectExportFormat();

    // Select output path
    const defaultPath = `./github-export`;
    const outputPath = await selectOutputPath(defaultPath);

    // Create export options
    const exportOptions: ExportOptions = {
      format: exportFormat,
      outputPath,
      repository: selectedRepo,
      type: exportType,
    };

    // Execute export
    await executeExport(exportOptions);

    showOutro('Thanks for using GitHub Extractor CLI!');
  } catch (error) {
    if (error instanceof Error) {
      showError(error.message);
    } else {
      showError('An unexpected error occurred');
    }
    process.exit(1);
  }
}

/**
 * Execute the export based on the selected type
 */
async function executeExport(options: ExportOptions): Promise<void> {
  const progress = createProgressTracker();

  try {
    if (options.type === 'full-backup') {
      // Execute all exporters
      await executeFullBackup(options, progress);
    } else {
      // Execute single exporter
      const exporter = createExporter(options);
      const exportTypeName = getExportTypeName(options.type);

      progress.start(`Exporting ${exportTypeName}...`);
      const result = await exporter.export();
      progress.succeed(`${exportTypeName} export completed!`);

      // Get final rate limit status
      const rateLimiter = getRateLimiter();
      const finalRateLimit = await rateLimiter.fetchRateLimitStatus();

      progress.showSummary(result, finalRateLimit);

      showSuccess(`Files saved to: ${exporter['outputPath']}`);
    }
  } catch (error) {
    progress.fail('Export failed');
    throw error;
  }
}

/**
 * Execute full backup (all export types)
 */
async function executeFullBackup(
  options: ExportOptions,
  progress: ProgressTracker
): Promise<void> {
  const types: ExportType[] = ['prs', 'issues', 'commits', 'branches', 'releases'];
  const results = [];

  showInfo('Starting full repository backup...');
  console.log();

  for (const type of types) {
    const typeOptions = { ...options, type };
    const exporter = createExporter(typeOptions);
    const exportTypeName = getExportTypeName(type);

    try {
      progress.start(`Exporting ${exportTypeName}...`);
      const result = await exporter.export();
      progress.succeed(`${exportTypeName} completed`);
      results.push({ type: exportTypeName, result });
    } catch (error) {
      progress.fail(`${exportTypeName} failed`);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        type: exportTypeName,
        result: {
          success: false,
          itemsExported: 0,
          itemsFailed: 0,
          apiCalls: 0,
          cacheHits: 0,
          duration: 0,
          errors: [errorMsg],
        },
      });
    }
  }

  // Show summary for all exports
  progress.stop(); // Ensure spinner is stopped
  console.log();
  showInfo('Full backup summary:');
  results.forEach(({ type, result }) => {
    const status = result.success ? '✔' : '✖';
    console.log(`  ${status} ${type}: ${result.itemsExported} items`);
  });

  showSuccess(`Full backup saved to: ${options.outputPath}`);
}

/**
 * Create the appropriate exporter based on type
 */
function createExporter(options: ExportOptions): BaseExporter<any> {
  const finalOutputPath = buildOutputPath(
    options.outputPath,
    options.repository.owner,
    options.repository.name,
    getExportTypeName(options.type)
  );

  const exporterOptions = {
    repository: options.repository,
    outputPath: finalOutputPath,
    format: options.format,
  };

  switch (options.type) {
    case 'prs':
      return new PullRequestExporter(exporterOptions);
    case 'issues':
      return new IssueExporter(exporterOptions);
    case 'commits':
      return new CommitExporter(exporterOptions);
    case 'branches':
      return new BranchExporter(exporterOptions);
    case 'releases':
      return new ReleaseExporter(exporterOptions);
    default:
      throw new Error(`Unknown export type: ${options.type}`);
  }
}

/**
 * Get human-readable name for export type
 */
function getExportTypeName(type: ExportType): string {
  const names: Record<ExportType, string> = {
    prs: 'Pull Requests',
    issues: 'Issues',
    commits: 'Commits',
    branches: 'Branches',
    releases: 'Releases',
    'full-backup': 'Full Backup',
  };
  return names[type];
}

// Run the CLI
main();
