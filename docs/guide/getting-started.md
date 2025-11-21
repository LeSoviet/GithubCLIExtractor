# Getting Started

Once you have GitHub Extractor CLI installed, you can start using it right away.

## Basic Usage

Run the tool with no arguments to start the interactive mode:

```bash
ghextractor
```

This will:

1. Scan your GitHub account for repositories
2. Present a list of repositories to choose from
3. Ask what type of data you want to export
4. Ask for the output format (Markdown, JSON, or both)
5. Begin exporting the data

## Command Line Options

You can also use command line options for more control:

```bash
# Export Pull Requests for a specific repository
ghextractor --output ./my-export --format json

# Full repository backup
ghextractor --full-backup --output ./backup

# Export with date filters
ghextractor --since 2024-01-01 --until 2024-12-31

# Export with label filters
ghextractor --labels bug,enhancement

# Dry run to see what would be exported
ghextractor --dry-run

# Incremental export (only new/updated items)
ghextractor --diff

# Force full export even with diff mode
ghextractor --diff --force-full
```

## Interactive Mode Walkthrough

1. **Repository Selection**: Choose from:
   - Your personal repositories
   - Repositories where you're a collaborator
   - Organization repositories
   - Starred repositories
   - Enter a public repository manually (e.g., `facebook/react`)
2. **Export Type**: Select what type of data to export:
   - Pull Requests
   - Commits
   - Branches
   - Issues
   - Releases
   - Full Repository Backup (exports all types)
3. **Format Selection**: Choose the output format:
   - Markdown
   - JSON
   - Both formats
4. **Output Location**: Specify where to save the exported data

## Output Structure

The exported data is organized in the following structure:

```
github-export/
├── owner/
│   └── repository/
│       ├── prs/
│       │   ├── PR-1.md
│       │   └── PR-2.md
│       ├── issues/
│       │   ├── ISSUE-1.md
│       │   └── ISSUE-2.md
│       ├── commits/
│       │   ├── COMMIT-abc123.md
│       │   └── COMMIT-def456.md
│       ├── branches/
│       │   └── branches.json
│       └── releases/
│           └── releases.json
```

## Examples

### Export Pull Requests as Markdown

```bash
ghextractor
# Select repository
# Select "Pull Requests"
# Select "Markdown"
# Choose output directory
```

### Export Issues as JSON

```bash
ghextractor --format json
# Select repository
# Select "Issues"
# Choose output directory
```

### Full Backup with Custom Output

```bash
ghextractor --full-backup --output ./my-backup
# Select repository
# Wait for export to complete
```

### Incremental Export (Diff Mode)

```bash
# First run: Creates baseline and exports all items
ghextractor --diff

# Subsequent runs: Only exports new/updated items
ghextractor --diff
```

This dramatically reduces API calls (80-95% reduction) and export time for regular updates.

### Export Public Repository

You can document any public GitHub repository:

```bash
ghextractor
# Select "📝 Enter a repository manually"
# Enter repository in format: owner/repo (e.g., facebook/react)
# Select export type and format
# Choose output directory
```

This is useful for:
- Documenting open-source projects
- Analyzing public repositories
- Creating snapshots of external projects