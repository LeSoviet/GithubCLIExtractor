# Analytics and Statistics

GitHub Extractor CLI automatically generates powerful analytics reports with every export operation, providing insights into your repositories' activity, contributor patterns, issue management, and code health metrics.

## Overview

The analytics feature analyzes exported data to generate comprehensive reports with key metrics and visualizations. This feature is available both for single repositories and in batch mode for multiple repositories.

## Usage

### Single Repository Analytics

Analytics reports are now automatically generated with every export operation. Simply run any export command:

```bash
ghextractor
```

After selecting your repository and export options, an analytics report will be automatically generated alongside your exported data.

### Command Line Options

Analytics are automatically included with all export operations. You can specify output directory for all exported data including analytics:

```bash
ghextractor --output ./my-export
```

### Batch Analytics

Analytics reports are automatically generated for all batch operations. Simply run any batch export:

```bash
ghextractor --batch-repos "owner/repo1,owner/repo2"
```

Or using a configuration file:

```bash
ghextractor --batch batch-config.json
```

With a batch configuration like:

```json
{
  "repositories": [
    "facebook/react",
    "microsoft/typescript"
  ],
  "exportTypes": ["prs", "issues"],
  "format": "markdown",
  "outputPath": "./batch-export",
  "parallelism": 3
}
```

Analytics reports will be automatically generated for each repository in the batch.

## Analytics Modules

### Activity Analytics

- **Commits Over Time**: Visualization of commit activity over time periods
- **PR Merge Rate**: Percentage of pull requests that are merged vs. closed
- **Issue Resolution Time**: Average and median time to resolve issues
- **Busiest Days**: Identification of most active days
- **Active Contributors**: Tracking contributor engagement over time

### Contributor Analytics

- **Top Contributors**: Ranking of contributors by activity
- **New vs. Returning**: Analysis of contributor retention
- **Contribution Distribution**: Pareto analysis of contributions
- **Bus Factor**: Estimate of critical contributor dependency

### Label and Issue Analytics

- **Label Distribution**: Analysis of label usage across issues and PRs
- **Issue Lifecycle**: Tracking of issue resolution patterns
- **Common Labels**: Identification of frequently used labels
- **Issue vs. PR Ratio**: Comparison of issues to pull requests

### Code Health Metrics

- **PR Review Coverage**: Percentage of PRs that receive reviews
- **Average PR Size**: Lines of code changed in pull requests
- **Time to First Review**: How quickly PRs receive feedback
- **Deployment Frequency**: Release cadence analysis

## Output Formats

Analytics reports are generated in both JSON and Markdown formats:

- **JSON**: For programmatic consumption and integration
- **Markdown**: For human-readable reports with ASCII charts

The reports include all metrics organized by category with clear visualizations where applicable.

## Example Report

```markdown
# Analytics Report: owner/repository

Generated: 2025-11-21 14:30:45

## Activity Analytics

- **Period**: 2025-10-21 to 2025-11-21
- **PR Merge Rate**: 87.5%
- **Average Issue Resolution Time**: 12.4 hours

## Contributor Analytics

- **Bus Factor**: 3
- **New vs Returning Contributors**: 12 new, 24 returning

### Top Contributors

| Contributor | Commits | PRs | Reviews | Total |
|-------------|---------|-----|--------|-------|
| user1       | 42      | 15  | 23     | 80    |
| user2       | 38      | 12  | 19     | 69    |
```

## Benefits

- **Insights**: Convert raw data into actionable intelligence
- **Decision Making**: Metrics for technical leadership
- **Marketing**: "Wow" factor for demonstrations
- **Premium Positioning**: Differentiates from basic scraping tools

## Requirements

Analytics are automatically generated during the export process and require no additional setup. The feature works best when you have a substantial amount of repository data to analyze.