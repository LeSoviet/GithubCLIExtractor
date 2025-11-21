# Diff Mode (Incremental Exports)

GitHub Extractor CLI v0.4.0 introduced revolutionary diff mode (also called incremental exports), which dramatically reduces API calls and export times by exporting only new or updated items since the last run.

## Why Diff Mode?

When regularly exporting repository data, you often only need the new or updated items rather than re-exporting everything. Diff mode solves this by:

- Reducing API calls by 80-95% on subsequent exports
- Making exports 10x faster for large repositories
- Minimizing impact on GitHub rate limits
- Maintaining persistent state for intelligent tracking

## How It Works

Diff mode automatically tracks the last export timestamp for each repository and export type. On subsequent runs with `--diff`, it will:

- ✅ Only fetch items updated since the last export
- ✅ Skip unchanged items
- ✅ Maintain incremental state in `~/.ghextractor/state/exports.json`

### Implementation Details

- **Pull Requests & Issues**: Filters by `updatedAt` date
- **Commits**: Uses GitHub API's `since` parameter for optimal performance
- **Branches**: Filters by last commit date
- **Releases**: Filters by `publishedAt` date

## Quick Start

```bash
# First run: Full export (creates baseline state)
ghextractor --diff

# Second run: Only exports new/updated items since last run
ghextractor --diff
```

## Command Line Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--diff` | `--incremental` | Enable incremental export mode |
| `--force-full` | | Force full export even if previous state exists |

## Examples

### Basic Diff Export

```bash
ghextractor --diff
```

### Force Full Export

Even with diff mode enabled, you can force a full export:

```bash
ghextractor --diff --force-full
```

### Combine with Other Options

```bash
# Diff mode with custom output and both formats
ghextractor --diff --format both --output ./exports --verbose

# Diff mode with date filtering
ghextractor --diff --since 2024-01-01

# Diff mode with label filtering
ghextractor --diff --labels bug,enhancement
```

## State Management

Diff mode maintains state in `~/.ghextractor/state/exports.json` with information about:

- Last export timestamp for each repository
- Last export timestamp for each export type
- Successful completion status

### State File Structure

```json
{
  "owner/repo": {
    "prs": "2025-11-21T10:30:00Z",
    "issues": "2025-11-20T15:45:00Z",
    "commits": "2025-11-19T09:15:00Z"
  }
}
```

### Manual State Management

You can manually edit or reset the state file if needed:

```bash
# View current state
cat ~/.ghextractor/state/exports.json

# Reset state for a specific repository (forces full export next time)
# Edit the file to remove or modify timestamps
```

## Batch Processing Integration

Diff mode works seamlessly with batch processing:

```bash
# Batch export with incremental mode
ghextractor --batch-repos "repo1,repo2,repo3" --diff

# In JSON configuration
{
  "repositories": ["repo1", "repo2"],
  "diffMode": true
}
```

## Best Practices

1. **First Run**: Always run with diff mode enabled for the first export to establish baseline state
2. **Regular Updates**: Use diff mode for regular updates to minimize API usage
3. **Periodic Full Exports**: Occasionally run with `--force-full` to ensure data completeness
4. **State Backup**: Consider backing up your state file if you rely heavily on incremental exports
5. **Error Recovery**: If an export fails, the state won't be updated, so the next diff export will include the missed items

## Troubleshooting

### State Conflicts

If you encounter issues with incremental exports:

```bash
# Force a full export to reset state
ghextractor --diff --force-full
```

### Missing Items

If you suspect items are missing from incremental exports:

1. Check the state file timestamps
2. Verify the item's update timestamp is after the last export
3. Run with `--verbose` to see detailed filtering information

### Performance Issues

For very large repositories:

1. Use `--verbose` to monitor API usage
2. Consider combining with date filters (`--since`, `--until`)
3. Monitor GitHub rate limits during export