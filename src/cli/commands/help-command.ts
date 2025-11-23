import type { CommandHandler } from './types.js';

/**
 * Command handler for displaying help information
 */
export class HelpCommand implements CommandHandler {
  execute(): void {
    console.log(`
GitHub Extractor CLI

Usage:
  ghextractor [options]

Options:
  -h, --help              Show this help message
  -v, --version           Show version number
  --check                 Check GitHub CLI installation and authentication
  --output <path>         Custom output directory (default: ./github-export)
  --format <format>       Export format: markdown, json, both (default: markdown)
  --config <path>         Path to configuration file
  --verbose               Show detailed output
  --dry-run               Simulate export without creating files
  --diff, --incremental   Incremental export (only new/updated items since last run)
  --force-full            Force full export even if previous state exists
  --since <date>          Filter by date range (start)
  --until <date>          Filter by date range (end)
  --labels <labels>       Filter by labels (comma-separated)
  --template <path>       Use custom template file
  --full-backup           Export all resources (PRs, issues, commits, branches, releases)
  // --analytics             Generate analytics report from exported data (now automatic)

Batch Export Options:
  --batch <config.json>       Batch export from JSON config file
  --batch-repos <repos>       Comma-separated list of repositories (owner/repo)
  --batch-types <types>       Comma-separated export types (prs,issues,commits,branches,releases)
  --batch-parallel <n>        Number of repositories to process in parallel (default: 3)

Examples:
  ghextractor                                    # Interactive mode
  ghextractor --check                            # Check GitHub CLI setup
  ghextractor --output ./my-export               # Custom output directory
  ghextractor --format json                      # Export as JSON
  ghextractor --diff                             # Incremental export (80-95% faster!)
  ghextractor --full-backup                      # Full repository backup
  ghextractor --labels bug,enhancement           # Filter by labels
  ghextractor --since 2024-01-01 --until 2024-12-31  # Date range filter

Batch Examples:
  ghextractor --batch-repos "facebook/react,vercel/next.js" --batch-types "releases"
  ghextractor --batch-repos "repo1,repo2" --diff  # Batch + incremental
  ghextractor --batch batch-config.json          # Batch from config file
  ghextractor --batch-repos "repo1,repo2,repo3" --batch-parallel 5  # Custom parallelism

For more information, visit: https://github.com/LeSoviet/ghextractor
`);
  }
}
