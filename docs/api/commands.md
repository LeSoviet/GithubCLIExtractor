# CLI Commands

GitHub Extractor CLI provides a simple command-line interface for exporting GitHub data.

## Main Command

```bash
ghextractor [options]
```

## Options

### General Options

| Option | Description | Default |
|--------|-------------|---------|
| `-h`, `--help` | Show help message | |
| `-v`, `--version` | Show version number | |
| `--check` | Check GitHub CLI installation and authentication | |
| `--dry-run` | Simulate export without creating files | |
| `--diff`, `--incremental` | Incremental export - only new/updated items since last run | |
| `--force-full` | Force full export even if previous state exists | |

### Output Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output <path>` | Custom output directory | `./github-export` |
| `--format <format>` | Export format: `markdown`, `json`, `both` | `markdown` |
| `--verbose` | Show detailed output | |

### Filter Options

| Option | Description | Default |
|--------|-------------|---------|
| `--since <date>` | Filter by date range (start) | |
| `--until <date>` | Filter by date range (end) | |
| `--labels <labels>` | Filter by labels (comma-separated) | |
| `--full-backup` | Export all resources | |

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `--config <path>` | Path to configuration file | |
| `--template <path>` | Use custom template file | |

### Batch Processing Options

| Option | Description | Default |
|--------|-------------|---------|
| `--batch <config.json>` | Batch export from JSON configuration file | |
| `--batch-repos <repos>` | Comma-separated list of repositories | |
| `--batch-types <types>` | Comma-separated export types | |
| `--batch-parallel <n>` | Number of repositories to process in parallel | 3 |

## Examples

### Interactive Mode

```bash
ghextractor
```

Starts the interactive mode where you can select repositories and export options.

### Check Setup

```bash
ghextractor --check
```

Verifies that GitHub CLI is installed and you're authenticated.

### Dry Run

```bash
ghextractor --dry-run
```

Shows what would be exported without actually creating files.

### Diff Mode (Incremental Export)

```bash
# First run: Full export with state tracking
ghextractor --diff

# Subsequent runs: Only export new/updated items
ghextractor --diff
```

Enables incremental exports that only fetch items updated since the last run.

### Force Full Export

```bash
ghextractor --diff --force-full
```

Forces a full export even when diff mode is enabled.

### Full Backup

```bash
ghextractor --full-backup --output ./backup
```

Exports all data types (PRs, issues, commits, branches, releases) for a repository.

### Date Filtering

```bash
ghextractor --since 2024-01-01 --until 2024-12-31
```

Exports only data within the specified date range.

### Label Filtering

```bash
ghextractor --labels bug,enhancement
```

Exports only items with the specified labels.

### Batch Processing

```bash
# Quick batch export
ghextractor --batch-repos "repo1,repo2,repo3" --batch-types "prs,releases"

# Batch export with diff mode
ghextractor --batch-repos "repo1,repo2,repo3" --diff

# Batch export with custom parallelism
ghextractor --batch-repos "repo1,repo2,repo3,repo4,repo5" --batch-parallel 5
```

Export multiple repositories simultaneously.