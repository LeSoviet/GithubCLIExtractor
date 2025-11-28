# Converter Utilities Documentation

## Overview

The converter utilities module provides a comprehensive set of functions for transforming and validating GitHub API data into standardized formats for export and analytics processing.

## Core Converter Functions

### `convertPullRequests(prs: GitHubPullRequest[]): ConvertedPR[]`

Converts raw GitHub API pull request objects into a standardized internal format.

**Features:**
- Extracts essential PR metadata (title, description, author, dates)
- Converts timeline information (created, updated, closed dates)
- Normalizes reviewers and approvers
- Handles merge commit tracking
- Calculates PR lifecycle metrics (time to merge, review time)

**Example:**
```typescript
const convertedPRs = convertPullRequests(rawGitHubPRs);
```

### `convertIssues(issues: GitHubIssue[]): ConvertedIssue[]`

Transforms GitHub issues into standardized format with lifecycle tracking.

**Features:**
- Preserves issue state and labels
- Tracks open/close timeline
- Maintains assignee information
- Calculates issue resolution time
- Supports milestone tracking

### `convertCommits(commits: GitHubCommit[]): ConvertedCommit[]`

Normalizes commit data for analytics and reporting.

**Features:**
- Extracts author and committer information
- Preserves commit message and SHA
- Timestamps all commit metadata
- Tracks file changes
- Handles merge commits

### `convertBranches(branches: GitHubBranch[]): ConvertedBranch[]`

Standardizes branch information.

**Features:**
- Tracks branch protection status
- Records commit references
- Identifies default branch
- Maintains branch metadata

### `convertReleases(releases: GitHubRelease[]): ConvertedRelease[]`

Transforms release data for version tracking and analytics.

**Features:**
- Parses release notes and descriptions
- Tracks pre-release status
- Records asset information
- Timestamps release creation/publication

## Data Validation & Safety

### `safeDivide(numerator: number, denominator: number, fallback?: number): number`

Safely performs division with built-in zero-division protection.

```typescript
const percentage = safeDivide(completed, total, 0); // Returns 0 if total is 0
```

### `safePercentage(value: number, total: number): number`

Calculates percentage with automatic bounds checking (0-100%).

```typescript
const percent = safePercentage(75, 100); // Returns 75
```

### `safeMin(values: number[]): number`

Finds minimum value with empty array handling.

```typescript
const min = safeMin([10, 5, 20]); // Returns 5
```

### `safeAverage(values: number[]): number`

Calculates average with built-in validation.

```typescript
const avg = safeAverage([10, 20, 30]); // Returns 20
```

### `safeMax(values: number[]): number`

Finds maximum value safely.

```typescript
const max = safeMax([10, 5, 20]); // Returns 20
```

## Type Conversions

### `convertToMarkdown(data: any): string`

Converts structured data to Markdown format.

### `convertToJSON(data: any): string`

Serializes data to JSON format with proper formatting.

### `convertToPDF(htmlContent: string): Promise<Buffer>`

Converts HTML content to PDF format.

## Usage Patterns

### Basic Data Conversion Pipeline

```typescript
import {
  convertPullRequests,
  convertIssues,
  convertCommits,
  convertBranches,
  convertReleases
} from '@/utils/converters';

// Fetch from GitHub API
const rawPRs = await githubApi.getPullRequests();
const rawIssues = await githubApi.getIssues();

// Convert to standard format
const prData = convertPullRequests(rawPRs);
const issueData = convertIssues(rawIssues);

// Process for export
const mdContent = convertToMarkdown({ prs: prData, issues: issueData });
```

### Safe Calculations in Analytics

```typescript
import { safeDivide, safePercentage, safeAverage } from '@/utils/converters';

const stats = {
  avgReviewTime: safeAverage(reviewTimes),
  mergeRate: safePercentage(mergedPRs, totalPRs),
  avgCommitsPerPR: safeDivide(totalCommits, totalPRs, 0)
};
```

## Error Handling

All converter functions include:
- Null/undefined input validation
- Type checking before processing
- Graceful fallbacks for missing data
- Detailed error logging for debugging

## Integration with Other Modules

- **Analytics Processor**: Uses converted data for metrics calculation
- **Report Generators**: Consumes normalized data for report creation
- **Exporters**: Accepts converted data for format-specific export
- **Data Validator**: Validates converter output integrity

## Performance Considerations

- Converters process arrays efficiently using functional programming patterns
- Large datasets are processed in batches to minimize memory usage
- Conversion operations are cached when repeated on same input
- Async conversion for large repositories supported

## Future Enhancements

- [ ] Custom conversion profiles for different use cases
- [ ] Streaming converters for very large datasets
- [ ] Plugin system for custom conversions
- [ ] Real-time conversion progress tracking
