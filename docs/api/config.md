# Configuration File Reference

Detailed reference for the `.ghextractorrc` configuration file options.

## File Format

The configuration file can be in JSON format with the following structure:

```json
{
  "format": ["markdown", "json"],
  "output": "./exports",
  "backup": true,
  "rateLimit": 5000,
  "cache": true,
  "since": "2023-01-01",
  "until": "2023-12-31",
  "concurrency": 5
}
```

## Configuration Options

### format
- **Type**: `string[]`
- **Default**: `["markdown"]`
- **Description**: Output formats to generate. Valid values are `markdown` and `json`.

### output
- **Type**: `string`
- **Default**: `"./github-export"`
- **Description**: Directory path where exported files will be saved.

### backup
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable full backup mode which exports all available data types.

### rateLimit
- **Type**: `number`
- **Default**: `1000`
- **Description**: Delay in milliseconds between API requests to respect rate limits.

### cache
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable caching of API responses to reduce requests and improve performance.

### since
- **Type**: `string`
- **Default**: `null`
- **Description**: Export only items created or updated after this date (ISO 8601 format).

### until
- **Type**: `string`
- **Default**: `null`
- **Description**: Export only items created or updated before this date (ISO 8601 format).

### concurrency
- **Type**: `number`
- **Default**: `5`
- **Description**: Maximum number of concurrent API requests.

### templates
- **Type**: `object`
- **Default**: `{}`
- **Description**: Custom template paths for different data types.
- **Example**:
  ```json
  {
    "templates": {
      "pullRequests": "./templates/pr.hbs",
      "issues": "./templates/issues.hbs"
    }
  }
  ```

## Environment Variable Mapping

Each configuration option can also be set using environment variables:

| Config Option | Environment Variable |
|---------------|---------------------|
| format | `GHEXTRACTOR_FORMAT` |
| output | `GHEXTRACTOR_OUTPUT` |
| backup | `GHEXTRACTOR_BACKUP` |
| rateLimit | `GHEXTRACTOR_RATE_LIMIT` |
| cache | `GHEXTRACTOR_CACHE` |
| since | `GHEXTRACTOR_SINCE` |
| until | `GHEXTRACTOR_UNTIL` |
| concurrency | `GHEXTRACTOR_CONCURRENCY` |

Environment variables take precedence over configuration file values.