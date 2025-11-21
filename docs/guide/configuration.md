# Configuration

The GitHub Extractor CLI can be configured through command-line options, environment variables, or a configuration file.

## Configuration File

By default, the CLI looks for a configuration file at `.ghextractorrc` or `.ghextractorrc.json` in the current directory. You can also specify a custom path using the `--config` option.

Example configuration file:

```json
{
  "format": ["markdown", "json"],
  "output": "./exports",
  "backup": true,
  "rateLimit": 5000,
  "cache": true,
  "diffMode": true,
  "forceFullExport": false
}
```

## Available Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `format` | `string[]` | Output formats (`markdown`, `json`) | `["markdown"]` |
| `output` | `string` | Output directory path | `"./github-export"` |
| `backup` | `boolean` | Enable full backup mode | `false` |
| `rateLimit` | `number` | Rate limit in milliseconds | `1000` |
| `cache` | `boolean` | Enable caching | `true` |
| `diffMode` | `boolean` | Enable incremental export mode | `false` |
| `forceFullExport` | `boolean` | Force full export even with diff mode | `false` |

## Environment Variables

You can also configure the CLI using environment variables:

- `GHEXTRACTOR_FORMAT` - Output formats (comma-separated)
- `GHEXTRACTOR_OUTPUT` - Output directory
- `GHEXTRACTOR_BACKUP` - Enable backup mode (true/false)
- `GHEXTRACTOR_RATE_LIMIT` - Rate limit in milliseconds
- `GHEXTRACTOR_CACHE` - Enable caching (true/false)
- `GHEXTRACTOR_DIFF_MODE` - Enable diff mode (true/false)
- `GHEXTRACTOR_FORCE_FULL_EXPORT` - Force full export (true/false)

## Command Line Options

All configuration options can also be passed as command-line arguments:

```bash
ghextractor --format markdown,json --output ./my-exports --backup

# With diff mode
ghextractor --diff --output ./my-exports

# Force full export
ghextractor --diff --force-full
```