# Export Options

Detailed documentation for all available export options in the GitHub Extractor CLI.

## Data Types

The CLI supports exporting various GitHub data types:

### Pull Requests
Export pull requests with full details including:
- Title and description
- Author and assignees
- Status (open, closed, merged)
- Labels and milestones
- Comments and review comments
- Commits and changed files

### Issues
Export issues with complete information:
- Title and body
- Author and assignees
- State (open, closed)
- Labels and milestones
- Comments
- Reactions

### Commits
Export commit history with:
- Commit message and author
- Timestamp and SHA
- Changed files and diffs
- Associated pull requests

### Branches
Export branch information:
- Branch name
- Last commit SHA and message
- Creation date
- Protection status

### Releases
Export release information:
- Tag name and release title
- Description
- Publication date
- Assets and download URLs

## Filtering Options

### Date Range
Filter exports by date range:
```bash
ghextractor --since 2023-01-01 --until 2023-12-31
```

### Specific Items
Export specific items by ID:
```bash
ghextractor --pull-requests 123,456 --issues 789
```

## Performance Options

### Rate Limiting
Control API rate limiting:
```bash
ghextractor --rate-limit 2000  # 2 second delay between requests
```

### Caching
Enable/disable caching:
```bash
ghextractor --no-cache  # Disable caching
```

### Concurrency
Control concurrent requests:
```bash
ghextractor --concurrency 5  # Maximum 5 concurrent requests
```

### Incremental Exports (Diff Mode)
Export only new or updated items since the last export:
```bash
ghextractor --diff  # Enable incremental export mode
ghextractor --diff --force-full  # Force full export even with diff mode
```

With diff mode enabled, subsequent exports will only fetch items updated since the last export, reducing API calls by 80-95% and making exports 10x faster for large repositories.