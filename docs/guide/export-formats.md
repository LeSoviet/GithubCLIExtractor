# Export Formats

The GitHub Extractor CLI supports multiple export formats to suit different needs. You can export data in Markdown, JSON, or both formats simultaneously.

## Markdown Format

The Markdown format generates human-readable documentation with structured formatting. Each data type (Pull Requests, Issues, Commits, etc.) gets its own organized document with tables, lists, and formatted content.

Features:
- Clean, readable formatting
- Table of contents for easy navigation
- Syntax highlighting for code snippets
- Structured organization by data type

Example output structure:
```
github-export/
├── pull-requests.md
├── issues.md
├── commits.md
├── branches.md
└── releases.md
```

## JSON Format

The JSON format provides raw data export suitable for programmatic processing, analysis, or import into other systems.

Features:
- Complete data preservation
- Machine-readable format
- Easy to parse and process
- Compatible with most programming languages

Example output structure:
```
github-export/
├── pull-requests.json
├── issues.json
├── commits.json
├── branches.json
└── releases.json
```

## Using Multiple Formats

You can export in both formats simultaneously by specifying both in the format option:

```bash
ghextractor --format markdown,json
```

This will generate both Markdown and JSON files in the output directory, giving you flexibility in how you use the exported data.

## Custom Templates

For advanced users, the CLI supports custom Handlebars templates to customize the Markdown output format. Create `.hbs` template files and reference them in your configuration.