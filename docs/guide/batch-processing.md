# Batch Processing

GitHub Extractor CLI v0.6.0 introduces enterprise-grade batch processing capabilities, allowing you to export data from multiple repositories simultaneously with controlled concurrency.

## Why Batch Processing?

When working with organizations or projects that span multiple repositories, manually exporting data from each repository can be time-consuming and inefficient. Batch processing solves this by:

- Processing dozens or hundreds of repositories in a single command
- Maintaining controlled concurrency to avoid overwhelming the GitHub API
- Providing comprehensive reporting across all repositories
- Supporting all existing export types and features

## Quick Start

Export multiple repositories with a single command:

```bash
# Quick batch export from command line
ghextractor --batch-repos "facebook/react,vercel/next.js,microsoft/vscode" --batch-types "releases,prs"

# Batch export with incremental mode
ghextractor --batch-repos "repo1,repo2,repo3" --diff

# Batch export with custom parallelism
ghextractor --batch-repos "repo1,repo2,repo3,repo4,repo5" --batch-parallel 5
```

## JSON Configuration

For complex batch operations, create a JSON configuration file:

```json
{
  "repositories": [
    "facebook/react",
    "vercel/next.js",
    "microsoft/vscode"
  ],
  "exportTypes": ["releases", "prs"],
  "format": "markdown",
  "outputPath": "./batch-export",
  "parallelism": 3,
  "diffMode": true,
  "verbose": true
}
```

Then run:

```bash
ghextractor --batch batch-config.json
```

## Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `repositories` | string[] | List of repositories in `owner/repo` format | Required |
| `exportTypes` | string[] | Export types: `prs`, `issues`, `commits`, `branches`, `releases` | All types |
| `format` | string | Export format: `markdown`, `json`, `both` | `markdown` |
| `outputPath` | string | Base output directory | `./github-export` |
| `parallelism` | number | Number of repositories to process simultaneously | 3 |
| `diffMode` | boolean | Enable incremental exports | false |
| `forceFullExport` | boolean | Force full export even with diff mode | false |
| `verbose` | boolean | Show detailed output | false |

## Interactive Mode

You can also use batch processing through the interactive CLI:

1. Run `ghextractor`
2. Select "🔄 Batch Export" from the export type menu
3. Select repositories using multi-select (space to select)
4. Choose export types
5. Configure format, output path, parallelism, and diff mode

## Benefits

### Performance
- Process multiple repositories simultaneously
- Configurable parallelism to optimize performance
- Reduced total execution time compared to sequential exports

### Enterprise-Ready
- Perfect for organizations with many repositories
- Comprehensive summary report with per-repository details
- Robust error handling that continues processing even if individual repositories fail

### Flexible
- Supports all existing export types
- Integrates with incremental export mode
- JSON configuration for complex workflows
- Command-line options for quick exports

## Examples

### Basic Batch Export
```bash
ghextractor --batch-repos "facebook/react,vercel/next.js" --batch-types "releases"
```

### Batch with Incremental Mode
```bash
ghextractor --batch-repos "repo1,repo2,repo3" --diff --batch-types "prs,issues"
```

### High-Performance Batch
```bash
ghextractor --batch-repos "repo1,repo2,repo3,repo4,repo5,repo6" --batch-parallel 6 --format both
```

### Complex Configuration
Create `enterprise-batch.json`:
```json
{
  "repositories": [
    "organization/repo1",
    "organization/repo2",
    "organization/repo3"
  ],
  "exportTypes": ["prs", "issues", "releases"],
  "format": "both",
  "outputPath": "./enterprise-export",
  "parallelism": 4,
  "diffMode": true,
  "verbose": true
}
```

Then run:
```bash
ghextractor --batch enterprise-batch.json
```

## Output

Batch processing generates a comprehensive summary report at `{outputPath}/batch-summary.md` with:

- Overall statistics (total repositories, successful/failed counts)
- Per-repository details with export status and timing
- Error information for failed repositories
- Total items exported and API calls made

Example summary:
```markdown
# Batch Export Summary

**Generated:** 2025-11-21 12:00:00

## Configuration
- **Repositories:** 3
- **Export Types:** prs, releases
- **Format:** markdown
- **Parallelism:** 3
- **Diff Mode:** Enabled
- **Output Path:** `./batch-export`

## Overall Results
- **Total Repositories:** 3
- **Successful:** 3 ✓
- **Failed:** 0 ✗
- **Total Items Exported:** 127
- **Total API Calls:** 42
- **Total Duration:** 15.23s

## Repository Details

### ✓ facebook/react

| Export Type | Status | Items | Duration |
|-------------|--------|-------|----------|
| prs | ✓ | 89 | 8.45s |
| releases | ✓ | 38 | 3.12s |

### ✓ vercel/next.js

| Export Type | Status | Items | Duration |
|-------------|--------|-------|----------|
| prs | ✓ | 156 | 12.34s |
| releases | ✓ | 27 | 2.56s |
```

## Best Practices

1. **Start Small**: Begin with a small number of repositories and increase parallelism gradually
2. **Monitor Rate Limits**: Use `--verbose` to monitor API usage
3. **Use Incremental Mode**: For regular updates, enable `--diff` to export only new/changed items
4. **Plan Output Structure**: Organize your output path to avoid conflicts with existing exports
5. **Handle Errors Gracefully**: Batch processing continues even if individual repositories fail