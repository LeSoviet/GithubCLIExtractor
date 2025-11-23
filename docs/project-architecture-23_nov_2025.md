# GitHub CLI Extractor Project Architecture

## Overview

GitHub CLI Extractor (ghextractor) is a command-line tool that extracts GitHub data (PRs, commits, issues, releases, branches) into Markdown or JSON formats. It features an interactive UI powered by `@clack/prompts` and provides analytics capabilities for repository insights.

## Directory Structure

```
src/
├── analytics/
│   ├── report-generators/
│   │   ├── activity-section.ts
│   │   ├── contributor-section.ts
│   │   ├── export-orchestrator.ts
│   │   ├── exporter-factory.ts
│   │   ├── health-section.ts
│   │   ├── index.ts
│   │   ├── label-section.ts
│   │   ├── markdown-generator.ts
│   │   ├── metrics-calculator.ts
│   │   ├── recommendations.ts
│   │   ├── status-helpers.ts
│   │   └── types.ts
│   ├── analytics-processor.ts
│   └── markdown-parser.ts
├── cli/
│   ├── commands/
│   │   ├── check-command.ts
│   │   ├── help-command.ts
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── version-command.ts
│   ├── progress.ts
│   ├── prompts.ts
│   └── rate-limit-display.ts
├── core/
│   ├── batch-processor.ts
│   ├── cache.ts
│   ├── github-auth.ts
│   ├── rate-limiter.ts
│   └── state-manager.ts
├── exporters/
│   ├── base-exporter.ts
│   ├── branches.ts
│   ├── commits.ts
│   ├── issues.ts
│   ├── prs.ts
│   └── releases.ts
├── scanner/
│   └── repo-scanner.ts
├── types/
│   ├── analytics.ts
│   ├── batch.ts
│   ├── config.ts
│   ├── github.ts
│   ├── index.ts
│   └── state.ts
├── utils/
│   ├── config.ts
│   ├── exec-gh.ts
│   ├── logger.ts
│   ├── output.ts
│   ├── retry.ts
│   ├── sanitize.ts
│   ├── template-engine.ts
│   └── version-checker.ts
└── index.ts
```

## Core Components

### 1. CLI Layer
- **Location**: `src/cli/`
- **Purpose**: Interactive prompts and user interface
- **Key Files**:
  - `prompts.ts`: Interactive user prompts
  - `commands/`: Command implementations (help, version, check)

### 2. Core Services
- **Location**: `src/core/`
- **Purpose**: Authentication, rate limiting, caching, and state management
- **Key Files**:
  - `github-auth.ts`: GitHub authentication handling
  - `rate-limiter.ts`: API rate limiting
  - `cache.ts`: Caching mechanism
  - `state-manager.ts`: Application state management

### 3. Data Exporters
- **Location**: `src/exporters/`
- **Purpose**: Extract and export GitHub data
- **Key Files**:
  - `base-exporter.ts`: Base exporter class
  - `prs.ts`, `commits.ts`, `issues.ts`, `releases.ts`, `branches.ts`: Specific data exporters

### 4. Analytics Engine
- **Location**: `src/analytics/`
- **Purpose**: Generate repository analytics and insights
- **Key Components**:
  - `analytics-processor.ts`: Main analytics processing
  - `report-generators/`: Report generation components
    - `export-orchestrator.ts`: Coordinates report exports
    - `exporter-factory.ts`: Creates exporters for different formats
    - `markdown-generator.ts`: Generates markdown reports
    - `metrics-calculator.ts`: Calculates analytics metrics
    - `activity-section.ts`, `contributor-section.ts`, `health-section.ts`, `label-section.ts`: Section-specific generators

### 5. Repository Scanner
- **Location**: `src/scanner/`
- **Purpose**: Scan and identify repositories
- **Key Files**:
  - `repo-scanner.ts`: Repository scanning logic

### 6. Utilities
- **Location**: `src/utils/`
- **Purpose**: Shared utility functions
- **Key Files**:
  - `exec-gh.ts`: Execute GitHub CLI commands
  - `config.ts`: Configuration management
  - `logger.ts`: Logging utilities
  - `retry.ts`: Retry mechanisms
  - `sanitize.ts`: Data sanitization
  - `template-engine.ts`: Template processing

## Data Types

### Location: `src/types/`
- **analytics.ts**: Analytics report interfaces
- **batch.ts**: Batch processing types
- **config.ts**: Configuration types
- **github.ts**: GitHub data types
- **state.ts**: Application state types

## Testing

### Location: `tests/`
- **unit/**: Unit tests for individual components
- **integration/**: Integration tests for combined functionality
- **e2e/**: End-to-end tests for complete workflows

## Build and Deployment

- **Package Manager**: npm
- **Bundling**: tsup (ESM and CJS formats)
- **Testing**: Vitest
- **Linting**: ESLint with Prettier formatting
- **Requirements**: Node.js 18+, GitHub CLI

## Key Features

1. Zero configuration required
2. Read-only operations for safety
3. Multi-format export (Markdown, JSON)
4. Interactive UI with progress tracking
5. Analytics and insights generation
6. Batch processing capabilities
7. Rate limiting and caching for API efficiency