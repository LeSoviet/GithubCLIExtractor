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
  promptRepositoryInput,
  selectBatchRepositories,
  selectBatchExportTypes,
  promptBatchParallelism,
  promptEnableDiffMode,
} from './cli/prompts.js';
import { createProgressTracker, ProgressTracker } from './cli/progress.js';
import { checkGhInstalled, getAuthStatus } from './core/github-auth.js';
import { getRateLimiter } from './core/rate-limiter.js';
import { displayRateLimit } from './cli/rate-limit-display.js';
import { HelpCommand, VersionCommand, CheckCommand } from './cli/commands/index.js';
import { getStateManager } from './core/state-manager.js';
import { BatchProcessor } from './core/batch-processor.js';
import { listUserRepositories, getRepositoryFromString } from './scanner/repo-scanner.js';
import { PullRequestExporter } from './exporters/prs.js';
import { IssueExporter } from './exporters/issues.js';
import { CommitExporter } from './exporters/commits.js';
import { BranchExporter } from './exporters/branches.js';
import { ReleaseExporter } from './exporters/releases.js';
import { buildOutputPath } from './utils/output.js';
import { AnalyticsProcessor } from './analytics/analytics-processor.js';
import {
  validateExportedData,
  displayDataCompletenessStatus,
} from './analytics/data-completeness-validator.js';
import { checkForUpdates } from './utils/version-checker.js';
import type {
  ExportOptions,
  ExportType,
  SingleExportType,
  PullRequest,
  Commit,
  Branch,
  Issue,
  Release,
  ExportFormat,
  ExportResult,
} from './types/index.js';
import type { BatchConfig } from './types/batch.js';
import type { BaseExporter } from './exporters/base-exporter.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Support both ESM and CJS
const getCurrentDir = (): string => {
  try {
    return typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
};
const __dirname: string = getCurrentDir();

/**
 * Parse command line arguments
 */
function parseArgs(): {
  help: boolean;
  version: boolean;
  check: boolean;
  dryRun: boolean;
  diff: boolean;
  forceFullExport: boolean;
  output?: string;
  format?: string;
  config?: string;
  verbose: boolean;
  since?: string;
  until?: string;
  labels?: string;
  template?: string;
  fullBackup: boolean;
  // analytics: boolean; // Removed as analytics are now generated automatically
  batch?: string;
  batchRepos?: string;
  batchTypes?: string;
  batchParallel?: number;
} {
  const args = process.argv.slice(2);

  return {
    help: args.includes('--help') || args.includes('-h'),
    version: args.includes('--version') || args.includes('-v'),
    check: args.includes('--check'),
    dryRun: args.includes('--dry-run'),
    diff: args.includes('--diff') || args.includes('--incremental'),
    forceFullExport: args.includes('--force-full'),
    output: args.includes('--output') ? args[args.indexOf('--output') + 1] : undefined,
    format: args.includes('--format') ? args[args.indexOf('--format') + 1] : undefined,
    config: args.includes('--config') ? args[args.indexOf('--config') + 1] : undefined,
    verbose: args.includes('--verbose'),
    since: args.includes('--since') ? args[args.indexOf('--since') + 1] : undefined,
    until: args.includes('--until') ? args[args.indexOf('--until') + 1] : undefined,
    labels: args.includes('--labels') ? args[args.indexOf('--labels') + 1] : undefined,
    template: args.includes('--template') ? args[args.indexOf('--template') + 1] : undefined,
    fullBackup: args.includes('--full-backup'),
    // analytics: args.includes('--analytics'), // Removed as analytics are now generated automatically
    batch: args.includes('--batch') ? args[args.indexOf('--batch') + 1] : undefined,
    batchRepos: args.includes('--batch-repos')
      ? args[args.indexOf('--batch-repos') + 1]
      : undefined,
    batchTypes: args.includes('--batch-types')
      ? args[args.indexOf('--batch-types') + 1]
      : undefined,
    batchParallel: args.includes('--batch-parallel')
      ? parseInt(args[args.indexOf('--batch-parallel') + 1])
      : undefined,
  };
}

/**
 * Show help message
 */
function showHelp(): void {
  const helpCommand = new HelpCommand();
  helpCommand.execute();
}

/**
 * Show version
 */
async function showVersion(): Promise<void> {
  const versionCommand = new VersionCommand();
  await versionCommand.execute();
}

/**
 * Check GitHub CLI installation and authentication
 */
async function checkSetup(): Promise<void> {
  const checkCommand = new CheckCommand();
  await checkCommand.execute();
}

/**
 * Clean up resources before exit
 */
async function cleanup(): Promise<void> {
  try {
    // Stop the rate limiter to prevent hanging timers
    const rateLimiter = getRateLimiter();
    await rateLimiter.stop();
  } catch (error) {
    // Silently ignore cleanup errors
  }
}

async function main() {
  try {
    const args = parseArgs();

    // Check for updates (non-blocking, runs in background)
    // Skip during tests and when showing help/version
    if (!process.env.GHX_TEST_MODE && !args.help && !args.version && !args.check) {
      checkForUpdates().catch(() => {
        // Silently ignore errors
      });
    }

    // Handle flags that exit immediately
    if (args.help) {
      showHelp();
      await cleanup();
      process.exit(0);
    }

    if (args.version) {
      await showVersion();
      await cleanup();
      process.exit(0);
    }

    if (args.check) {
      await checkSetup();
      await cleanup();
      process.exit(0);
    }

    // Load and validate config early if provided (before authentication checks)
    if (args.config) {
      try {
        const configContent = await readFile(args.config, 'utf-8');
        JSON.parse(configContent); // Validate JSON
      } catch (error) {
        showError('Invalid configuration file');
        if (error instanceof Error) {
          console.error(error.message);
        }
        process.exit(1);
      }
    }

    // In test mode with dry-run, skip authentication checks and exit early
    if (process.env.GHX_TEST_MODE && args.dryRun) {
      console.log('🔍 Dry-run mode: No files will be created\n');
      console.log('\n✔ Dry-run completed successfully');

      // Handle specific flags that tests expect
      if (args.format) {
        console.log(`  Format: ${args.format}`);
      }
      if (args.output) {
        console.log(`  Output: ${args.output}`);
      }
      if (args.verbose) {
        console.log('  Verbose mode enabled');
      }
      if (args.config) {
        console.log(`  Using configuration from: ${args.config}`);
      }
      if (args.since || args.until) {
        console.log('  Date filters applied');
      }
      if (args.labels) {
        console.log('  Label filters applied');
      }
      if (args.template) {
        console.log('  Custom template specified');
      }
      if (args.fullBackup) {
        console.log('  Full backup mode');
      }

      process.exit(0);
    }

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

    // Handle batch export mode
    if (args.batch || args.batchRepos) {
      await handleBatchExport(args);
      await cleanup();
      process.exit(0);
    }

    // Dry-run mode
    if (args.dryRun) {
      console.log('🔍 Dry-run mode: No files will be created\n');
    }

    // Show welcome screen (unless in test mode)
    if (!process.env.GHX_TEST_MODE) {
      await showWelcome(authStatus.username);
    }

    // Check and display rate limit
    const rateLimiter = getRateLimiter();
    const rateLimit = await rateLimiter.fetchRateLimitStatus();

    if (args.verbose) {
      displayRateLimit(rateLimit);
    }

    // Show config info if provided (already validated earlier)
    if (args.config) {
      showInfo(`Loaded configuration from: ${args.config}`);
    }

    // Scan repositories
    if (!args.dryRun) {
      showInfo('Scanning repositories...');
    }
    const repositories = await listUserRepositories();

    if (repositories.length === 0) {
      showError('No repositories found');
      process.exit(1);
    }

    if (!args.dryRun) {
      showSuccess(`Found ${repositories.length} repositories`);
    }

    // Determine export type first (to know if we need batch mode)
    const exportType: ExportType | 'batch-export' = args.fullBackup
      ? 'full-backup'
      : process.env.GHX_TEST_MODE
        ? 'prs'
        : await selectExportType();

    // Handle batch export interactive mode
    if (exportType === 'batch-export') {
      showInfo('🔄 Batch Export Mode');

      // Select batch repositories using multi-select
      const batchRepositories = await selectBatchRepositories(repositories);

      // Prompt for export types
      const selectedTypes = await selectBatchExportTypes();

      // Prompt for export format
      const batchFormat = await selectExportFormat();

      // Prompt for output path
      const batchOutputPath = await selectOutputPath('./batch-export');

      // Prompt for parallelism
      const parallelism = await promptBatchParallelism();

      // Prompt for diff mode
      const enableDiff = await promptEnableDiffMode();

      // Build batch config
      const batchConfig: BatchConfig = {
        repositories: batchRepositories,
        exportTypes: selectedTypes as SingleExportType[],
        format: batchFormat as ExportFormat,
        outputPath: batchOutputPath,
        parallelism,
        diffMode: enableDiff,
        verbose: args.verbose || false,
      };

      // Execute batch export
      showInfo(`Processing ${batchRepositories.length} repositories...`);
      const batchProcessor = new BatchProcessor(batchConfig);
      const result = await batchProcessor.process();

      // Show results
      console.log('\n' + '='.repeat(60));
      console.log('📊 Batch Export Summary');
      console.log('='.repeat(60));
      console.log(`✅ Successful: ${result.successfulRepositories}`);
      console.log(`❌ Failed: ${result.failedRepositories}`);
      console.log(`📁 Output: ${batchOutputPath}/batch-summary.md`);
      console.log('='.repeat(60) + '\n');

      showOutro('Thanks for using GitHub Extractor CLI!');
      await cleanup();

      // Add small delay before exit to ensure async operations complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      process.exit(result.failedRepositories > 0 ? 1 : 0);
    }

    // For non-batch exports, select a single repository
    let selectedRepo;

    if (process.env.GHX_TEST_MODE) {
      selectedRepo = repositories[0];
    } else {
      const repoSelection = await selectRepository(repositories);

      // If user selected "Enter manually" option
      if (repoSelection === null) {
        showInfo('Enter a public repository to document');
        const repoInput = await promptRepositoryInput();

        try {
          showInfo('Validating repository...');
          selectedRepo = await getRepositoryFromString(repoInput);
          showSuccess(`Repository found: ${selectedRepo.owner}/${selectedRepo.name}`);
        } catch (error) {
          showError(
            error instanceof Error
              ? error.message
              : 'Failed to access repository. Make sure it exists and is public.'
          );
          process.exit(1);
        }
      } else {
        selectedRepo = repoSelection;
      }
    }

    if (!args.dryRun) {
      showInfo(`Selected: ${selectedRepo.owner}/${selectedRepo.name}`);
    }

    // Determine export format
    const exportFormat =
      args.format || (process.env.GHX_TEST_MODE ? 'markdown' : await selectExportFormat());

    // Determine output path
    const defaultPath = args.output || './github-export';
    const outputPath = process.env.GHX_TEST_MODE
      ? defaultPath
      : await selectOutputPath(defaultPath);

    // Exit if dry-run
    if (args.dryRun) {
      console.log('\n✔ Dry-run completed successfully');
      console.log(`  Repository: ${selectedRepo.owner}/${selectedRepo.name}`);
      console.log(`  Export type: ${exportType}`);
      console.log(`  Format: ${exportFormat}`);
      console.log(`  Output: ${outputPath}`);
      if (args.diff) {
        console.log(`  Diff mode: enabled`);
      }
      process.exit(0);
    }

    // Get diff mode options if enabled (not applicable for full-backup)
    const stateManager = getStateManager();
    const diffModeOptions =
      args.diff && exportType !== 'full-backup'
        ? await stateManager.getDiffModeOptions(
            `${selectedRepo.owner}/${selectedRepo.name}`,
            exportType as SingleExportType,
            args.forceFullExport
          )
        : undefined;

    // Show diff mode info
    if (diffModeOptions?.enabled) {
      showInfo(
        `📅 Diff mode: exporting items updated since ${new Date(diffModeOptions.since!).toLocaleString()}`
      );
    } else if (args.diff && !diffModeOptions?.enabled) {
      showInfo('📦 First export detected - performing full export');
    }

    // Create export options
    const exportOptions: ExportOptions = {
      format: exportFormat as 'markdown' | 'json' | 'pdf',
      outputPath,
      repository: selectedRepo,
      type: exportType,
      diffMode: diffModeOptions,
    };

    // Execute export
    await executeExport(exportOptions, args.diff);

    showOutro('Thanks for using GitHub Extractor CLI!');
    await cleanup();
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      showError(error.message);
    } else {
      showError('An unexpected error occurred');
    }
    await cleanup();
    process.exit(1);
  }
}

/**
 * Execute the export based on the selected type
 */
async function executeExport(
  options: ExportOptions,
  diffModeEnabled: boolean = false
): Promise<void> {
  const progress = createProgressTracker();

  try {
    if (options.type === 'full-backup') {
      // Execute all exporters
      await executeFullBackup(options, progress, diffModeEnabled);

      // Generate analytics automatically after full backup
      try {
        // For analytics, use the base repository path (without export type subfolder)
        const exportPath = join(
          options.outputPath,
          options.repository.owner,
          options.repository.name
        );

        // Validate data completeness before generating analytics
        const completeness = await validateExportedData(exportPath);
        displayDataCompletenessStatus(completeness);

        // Generate analytics if data is complete OR partial analytics is allowed
        const shouldGenerateAnalytics =
          completeness.isComplete || completeness.missingTypes.length < 5;

        if (shouldGenerateAnalytics) {
          const analyticsOptions = {
            enabled: true,
            format: options.format,
            outputPath: options.outputPath,
            repository: options.repository,
            offline: true, // Use offline mode - parse exported files
            exportedDataPath: exportPath,
            allowPartialAnalytics: !completeness.isComplete,
            missingDataTypes: completeness.missingTypes,
          };

          const analyticsProcessor = new AnalyticsProcessor(analyticsOptions);
          await analyticsProcessor.generateReport();
        } else {
          showInfo('\u23ed\ufe0f  Analytics report skipped (insufficient data types)');
        }
      } catch (analyticsError) {
        console.warn(
          '\u26a0\ufe0f  Failed to generate analytics report:',
          analyticsError instanceof Error ? analyticsError.message : 'Unknown error'
        );
      }
    } else {
      // Execute single exporter
      const exporter = createExporter(options);
      const exportTypeName = getExportTypeName(options.type);

      progress.start(`Exporting ${exportTypeName}...`);
      const result = await exporter.export();
      progress.succeed(`${exportTypeName} export completed!`);

      // Generate analytics automatically after each export
      try {
        // For analytics, use the base repository path (without export type subfolder)
        const exportPath = join(
          options.outputPath,
          options.repository.owner,
          options.repository.name
        );

        // Validate data completeness before generating analytics
        const completeness = await validateExportedData(exportPath);
        displayDataCompletenessStatus(completeness);

        // Generate analytics if data is complete OR partial analytics is allowed
        const shouldGenerateAnalytics =
          completeness.isComplete || completeness.missingTypes.length < 5;

        if (shouldGenerateAnalytics) {
          const analyticsOptions = {
            enabled: true,
            format: options.format,
            outputPath: options.outputPath,
            repository: options.repository,
            offline: true, // Use offline mode - parse exported files
            exportedDataPath: exportPath,
            allowPartialAnalytics: !completeness.isComplete,
            missingDataTypes: completeness.missingTypes,
          };

          const analyticsProcessor = new AnalyticsProcessor(analyticsOptions);
          await analyticsProcessor.generateReport();
        } else {
          showInfo(
            '⏭️  Analytics report skipped (use Full Repository Backup for complete analysis)'
          );
        }
      } catch (analyticsError) {
        console.warn(
          '⚠️  Failed to generate analytics report:',
          analyticsError instanceof Error ? analyticsError.message : 'Unknown error'
        );
      }

      // Update state if diff mode is enabled
      // (options.type is guaranteed to be SingleExportType here due to the if/else above)
      if (diffModeEnabled && result.success) {
        const stateManager = getStateManager();
        await stateManager.updateExportState(
          `${options.repository.owner}/${options.repository.name}`,
          options.type as SingleExportType,
          result.itemsExported,
          options.format,
          options.outputPath
        );
        showInfo('💾 Export state saved for next incremental run');
      }

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
  progress: ProgressTracker,
  diffModeEnabled: boolean = false
): Promise<void> {
  const types: SingleExportType[] = ['prs', 'issues', 'commits', 'branches', 'releases'];
  const results: { type: string; result: ExportResult }[] = [];
  const stateManager = getStateManager();

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

      // Update state if diff mode is enabled and export succeeded
      if (diffModeEnabled && result.success) {
        await stateManager.updateExportState(
          `${options.repository.owner}/${options.repository.name}`,
          type,
          result.itemsExported,
          options.format,
          options.outputPath
        );
      }
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
  results.forEach(({ type, result: exportResult }) => {
    const status = exportResult.success ? '✔' : '✖';
    console.log(`  ${status} ${type}: ${exportResult.itemsExported} items`);
  });

  if (diffModeEnabled) {
    showInfo('💾 Export states saved for next incremental run');
  }

  showSuccess(`Full backup saved to: ${options.outputPath}`);
}

/**
 * Create the appropriate exporter based on type
 */
function createExporter(
  options: ExportOptions
):
  | BaseExporter<PullRequest>
  | BaseExporter<Commit>
  | BaseExporter<Branch>
  | BaseExporter<Issue>
  | BaseExporter<Release> {
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

/**
 * Handle batch export mode
 */
async function handleBatchExport(args: ReturnType<typeof parseArgs>): Promise<void> {
  try {
    let batchConfig: any;

    // Option 1: Load from JSON file
    if (args.batch) {
      showInfo(`Loading batch configuration from: ${args.batch}`);
      const configContent = await readFile(args.batch, 'utf-8');
      batchConfig = JSON.parse(configContent);
    }
    // Option 2: Build from CLI args
    else if (args.batchRepos) {
      const repositories = args.batchRepos.split(',').map((r) => r.trim());

      // Parse export types (default to all if not specified)
      let exportTypes: SingleExportType[] = ['prs', 'issues', 'commits', 'branches', 'releases'];
      if (args.batchTypes) {
        exportTypes = args.batchTypes.split(',').map((t) => t.trim()) as SingleExportType[];
      }

      batchConfig = {
        repositories,
        exportTypes,
        format: (args.format || 'markdown') as 'markdown' | 'json' | 'both',
        outputPath: args.output || './github-export',
        parallelism: args.batchParallel || 3,
        diffMode: args.diff || false,
        forceFullExport: args.forceFullExport || false,
        verbose: args.verbose || false,
      };
    } else {
      showError('Batch mode requires either --batch or --batch-repos');
      process.exit(1);
    }

    // Validate configuration
    if (!batchConfig.repositories || !Array.isArray(batchConfig.repositories)) {
      showError('Invalid batch configuration: repositories must be an array');
      process.exit(1);
    }

    if (batchConfig.repositories.length === 0) {
      showError('No repositories specified for batch export');
      process.exit(1);
    }

    // Create and run batch processor
    const processor = new BatchProcessor(batchConfig);
    const result = await processor.process();

    // Clean up resources before exit
    await cleanup();

    // Exit with appropriate code
    process.exit(result.failedRepositories > 0 ? 1 : 0);
  } catch (error) {
    showError('Batch export failed');
    if (error instanceof Error) {
      console.error(error.message);
    }
    await cleanup();
    process.exit(1);
  }
}

// Run the CLI
main();
