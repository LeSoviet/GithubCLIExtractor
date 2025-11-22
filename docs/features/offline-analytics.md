# Offline Analytics Mode

GitHub Extractor CLI now supports offline analytics mode, allowing you to generate analytics reports from exported data without requiring GitHub API access.

## What is Offline Analytics Mode?

Offline analytics mode enables the CLI to parse previously exported markdown files (PRs, Issues, Releases) and generate comprehensive analytics reports without making any GitHub API calls.

## Benefits

✅ **Works Offline**: Generate analytics from exported data without internet connection
✅ **Private Repositories**: Analyze private repository data without API rate limits
✅ **No Empty Reports**: Previous versions had issues with empty analytics - now fixed
✅ **Automatic**: Enabled by default when generating analytics after exports
✅ **Fast**: No API calls means instant analytics generation

## How It Works

### Automatic Mode (Default)

When you export repository data, analytics are automatically generated using offline mode:

```bash
ghextractor
# Select repository
# Select export type
# Analytics are automatically generated from exported files
```

The CLI:
1. Exports data to markdown files
2. Automatically switches to offline mode
3. Parses the exported markdown files
4. Generates analytics report from parsed data

### What Gets Parsed?

The offline analytics parser extracts data from:

#### Pull Requests (`prs/*.md`)
- PR number, title, state (open/closed/merged)
- Author, creation date, merge date
- Labels, reviewers, comments count
- Changed files and additions/deletions

#### Issues (`issues/*.md`)
- Issue number, title, state (open/closed)
- Author, creation date, close date
- Labels, assignees, comments count
- Reactions and milestone information

#### Releases (`releases/*.md`)
- Release tag, name, date
- Author, description
- Assets information
- Pre-release status

## Technical Details

### Parser Implementation

The `MarkdownParser` class handles parsing of exported markdown files:

**File**: `src/analytics/markdown-parser.ts`

```typescript
class MarkdownParser {
  parsePullRequests(exportPath: string): PullRequest[]
  parseIssues(exportPath: string): Issue[]
  parseReleases(exportPath: string): Release[]
}
```

### Analytics Processor Integration

The `AnalyticsProcessor` now supports offline mode:

**File**: `src/analytics/analytics-processor.ts`

```typescript
const processor = new AnalyticsProcessor({
  offline: true,                    // Enable offline mode
  exportedDataPath: './exported'    // Path to exported data
});

await processor.generateAnalytics();
```

### File Structure Expected

For offline mode to work, your exported data should follow this structure:

```
exported/
├── owner/
│   └── repository/
│       ├── prs/
│       │   ├── PR-1.md
│       │   ├── PR-2.md
│       │   └── ...
│       ├── issues/
│       │   ├── ISSUE-1.md
│       │   ├── ISSUE-2.md
│       │   └── ...
│       └── releases/
│           ├── v1.0.0.md
│           ├── v1.1.0.md
│           └── ...
```

## Use Cases

### 1. Offline Analysis

Analyze repository data without internet connection:

```bash
# Export data while online
ghextractor --output ./my-export

# Later, analytics are already generated in ./my-export/analytics/
```

### 2. Private Repository Analysis

Analyze private repositories without consuming API rate limits:

```bash
# First export (uses API)
ghextractor --output ./private-repo-data

# Analytics generated offline (no API calls)
```

### 3. Historical Analysis

Export data periodically and analyze trends over time:

```bash
# Weekly exports with incremental mode
ghextractor --diff --output ./export-$(date +%Y-%m-%d)

# Each export includes analytics from that point in time
```

### 4. Batch Processing

When processing multiple repositories, each gets offline analytics:

```bash
ghextractor --batch batch-config.json

# Analytics generated offline for each repository
# No cumulative API rate limit impact for analytics
```

## Comparison: Online vs Offline Mode

| Feature | Online Mode | Offline Mode |
|---------|------------|--------------|
| **API Calls** | Yes | No |
| **Data Source** | GitHub API | Exported markdown files |
| **Speed** | Depends on API | Instant |
| **Rate Limits** | Consumes quota | Zero impact |
| **Internet Required** | Yes | No |
| **Data Freshness** | Real-time | As of export |
| **Private Repos** | Limited by rate limits | Unlimited |

## Migration from v0.7.1

### What Changed?

**Before (v0.7.1)**:
- Analytics tried to fetch from GitHub API even after export
- Often resulted in empty analytics reports
- Required API access for analytics generation

**After (v0.7.2)**:
- Analytics use offline mode by default after exports
- Analytics accurately reflect exported data
- No API access required for analytics

### No Action Required

The migration is automatic:
- Existing exports continue to work
- New exports automatically use offline mode
- No configuration changes needed

## Troubleshooting

### Empty Analytics Report

If you get an empty analytics report:

1. **Check Export Structure**: Ensure files are in the expected format
2. **Verify File Paths**: Analytics expect standard export structure
3. **Check File Content**: Markdown files should contain valid exported data

### Parser Errors

If parsing fails:

1. **File Format**: Ensure markdown files follow export format
2. **File Encoding**: Files should be UTF-8 encoded
3. **File Permissions**: Ensure read access to exported files

### Missing Data in Analytics

If some data is missing from analytics:

1. **Export Type**: Ensure you exported the data type you're analyzing
2. **File Names**: Files should follow naming convention (PR-1.md, ISSUE-1.md)
3. **Content Format**: Markdown should include all required fields

## For Developers

### Extending the Parser

To add support for parsing additional fields:

1. Update `MarkdownParser` class in `src/analytics/markdown-parser.ts`
2. Add new regex patterns for extracting data
3. Update type definitions in `src/types/analytics.ts`
4. Add tests in `tests/unit/markdown-parser.test.ts`

### Testing Offline Mode

```typescript
import { AnalyticsProcessor } from './analytics/analytics-processor';

const processor = new AnalyticsProcessor({
  offline: true,
  exportedDataPath: './test-exports'
});

const analytics = await processor.generateAnalytics();
```

### Debugging

Enable debug logging to see parser operations:

```bash
DEBUG=ghextractor:* ghextractor
```

## Future Enhancements

Planned improvements for offline analytics:

- ⏳ Support for parsing commits from markdown
- ⏳ Support for parsing branch information
- ⏳ Enhanced error reporting for parsing failures
- ⏳ Validation of exported markdown format
- ⏳ Incremental analytics updates

## Related Features

- [Analytics and Statistics](../guide/analytics.md)
- [Export Formats](../guide/export-formats.md)
- [Batch Processing](../guide/batch-processing.md)
