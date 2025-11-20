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