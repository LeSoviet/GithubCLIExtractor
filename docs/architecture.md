# GitHub Extractor - System Architecture

## Overview

GitHub Extractor is a dual-interface application (CLI + GUI) that extracts and analyzes GitHub repository data with comprehensive reporting and analytics capabilities.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Entry Points                              │
│  ┌──────────────┬──────────────┬──────────────┐              │
│  │ ghextractor  │ ghextractor  │ ghextractor  │              │
│  │  (menu)      │   --cli      │   --gui      │              │
│  └──────┬───────┴──────┬───────┴──────┬───────┘              │
└─────────┼──────────────┼──────────────┼────────────────────┘
          │              │              │
┌─────────▼──────────────▼──────────────▼────────────────────┐
│                  Command Layer                             │
│  ┌────────────────┐              ┌──────────────┐          │
│  │  CLI Commands  │              │ Electron GUI │          │
│  │  - version     │              │  - React UI  │          │
│  │  - help        │              │  - IPC Calls │          │
│  │  - check       │              │  - Theming   │          │
│  │  - export      │              │  - Progress  │          │
│  │  - batch       │              │              │          │
│  └────────┬───────┘              └──────┬───────┘          │
└───────────┼───────────────────────────────┼─────────────────┘
            │                               │
┌───────────▼───────────────────────────────▼─────────────────┐
│              Core Processing Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  GitHub Auth │  │ Rate Limiter │  │ State Manager│      │
│  │  - Token Mgmt│  │ - Quota Track│  │ - Cache      │      │
│  │  - Validation│  │ - Wait Logic │  │ - History    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────────────────────────────────────┘
            │
┌───────────▼────────────────────────────────────────────────┐
│              Data Extraction Layer                         │
│  ┌──────────────────────────────────────────┐              │
│  │  GitHub API Scanner (repo-scanner.ts)    │              │
│  │  - List repositories                     │              │
│  │  - Validate repository access            │              │
│  │  - Parse repository information          │              │
│  └──────────────┬───────────────────────────┘              │
│                 │                                           │
│  ┌──────────────▼───────────────────────────┐              │
│  │  Exporter Modules (exporters/)           │              │
│  │  ┌────────────────────────────────────┐  │              │
│  │  │ Base Exporter (Abstract)           │  │              │
│  │  │ - Common interface                 │  │              │
│  │  │ - Error handling                   │  │              │
│  │  │ - Progress tracking                │  │              │
│  │  └────────────────────────────────────┘  │              │
│  │  ┌─────────┬─────────┬────────┬────────┐ │              │
│  │  │   PRs   │ Issues  │Commits │Branches│ │              │
│  │  │Exporter │Exporter │Exporter│Exporter│ │              │
│  │  └─────────┴─────────┴────────┴────────┘ │              │
│  └──────────────────────────────────────────┘              │
└────────────────────────────────────────────────────────────┘
            │
┌───────────▼────────────────────────────────────────────────┐
│              Data Processing Layer                         │
│  ┌────────────────┐        ┌──────────────┐               │
│  │ Converters     │        │ Validators   │               │
│  │ - PR Converter │        │ - Data Valid │               │
│  │ - Issue Conv.  │        │ - Bounds CHK │               │
│  │ - Commit Conv. │        │ - Type Valid │               │
│  │ - Format Conv. │        │              │               │
│  └────────────────┘        └──────────────┘               │
└────────────────────────────────────────────────────────────┘
            │
┌───────────▼────────────────────────────────────────────────┐
│              Analytics & Reporting Layer                   │
│  ┌───────────────────────────────────────────┐             │
│  │  Analytics Processor                      │             │
│  │  - Data aggregation                       │             │
│  │  - Metrics calculation                    │             │
│  │  - Trend analysis                         │             │
│  └───────────────────────────────────────────┘             │
│  ┌──────────────────────────────────────────┐              │
│  │  Report Generators (report-generators/)  │              │
│  │  ┌──────────────────────────────────────┐│              │
│  │  │ Report Orchestrator (export-orch.)   ││              │
│  │  │ - Coordinates all sections           ││              │
│  │  │ - Manages generation order           ││              │
│  │  │ - Handles section dependencies       ││              │
│  │  └──────────────────────────────────────┘│              │
│  │  ┌────┬────────┬────────┬──────┬──────┬─┤              │
│  │  │ ACT│CONTRIB │PERF    │TREND │BENCH │...│             │
│  │  │IVITY│OR      │METRICS │S     │MARKS │   │             │
│  │  └────┴────────┴────────┴──────┴──────┴─┘              │
│  └──────────────────────────────────────────┘              │
└────────────────────────────────────────────────────────────┘
            │
┌───────────▼────────────────────────────────────────────────┐
│              Export & Output Layer                         │
│  ┌──────────────────────────────────────────┐              │
│  │  Format Generators                       │              │
│  │  ┌────────┬──────────┬──────────┐       │              │
│  │  │Markdown│   JSON   │   PDF    │       │              │
│  │  │Generator│Generator │Converter │       │              │
│  │  └────────┴──────────┴──────────┘       │              │
│  └──────────────────────────────────────────┘              │
│  ┌──────────────────────────────────────────┐              │
│  │  Output Handlers                         │              │
│  │  - File system writes                    │              │
│  │  - Path validation                       │              │
│  │  - Error handling                        │              │
│  └──────────────────────────────────────────┘              │
└────────────────────────────────────────────────────────────┘
```

## Module Organization

### `/src/core/` - Core Infrastructure

**Responsibility:** Essential services for the application

**Modules:**
- `github-auth.ts` - GitHub CLI authentication handling
- `rate-limiter.ts` - GitHub API rate limit management
- `cache.ts` - Data caching and state persistence
- `state-manager.ts` - Application state management
- `batch-processor.ts` - Batch export coordination

**Key Patterns:**
- Singleton pattern for shared services
- Event-driven updates for state changes
- Automatic cleanup of stale cache entries

### `/src/exporters/` - Data Extraction

**Responsibility:** Extract data from GitHub API

**Structure:**
```
base-exporter.ts        (Abstract base class)
├── prs.ts             (PullRequestExporter)
├── issues.ts          (IssueExporter)
├── commits.ts         (CommitExporter)
├── branches.ts        (BranchExporter)
└── releases.ts        (ReleaseExporter)
```

**Common Interface:**
```typescript
interface Exporter {
  export(): Promise<void>;
  getProgress(): ExportProgress;
  getErrors(): Error[];
}
```

### `/src/analytics/` - Analytics & Reporting

**Responsibility:** Generate insights and reports from extracted data

**Structure:**
```
analytics-processor.ts    (Main processor)
advanced-analytics.ts     (Complex metrics)
benchmarking.ts          (Industry comparison)
narrative-generator.ts   (Insight generation)
report-generators/       (Section generators)
├── activity-section.ts
├── contributor-section.ts
├── performance-section.ts
├── trends-section.ts
├── benchmarks-section.ts
├── export-orchestrator.ts
└── markdown-generator.ts
```

**Processing Pipeline:**
```
Raw Data
  ↓
Data Validation
  ↓
Metrics Calculation
  ↓
Advanced Analysis
  ↓
Report Generation
  ↓
Format Conversion (MD/JSON/PDF)
  ↓
File Output
```

### `/src/types/` - Type Definitions

**Responsibility:** Type safety across the application

**Files:**
- `github.ts` - GitHub API types
- `config.ts` - Configuration types
- `analytics.ts` - Analytics result types
- `batch.ts` - Batch processing types
- `state.ts` - State management types

### `/src/utils/` - Utilities & Helpers

**Key Utilities:**
- `converters.ts` - Data format conversions
- `output.ts` - File output handling
- `logger.ts` - Logging infrastructure
- `config.ts` - Configuration loading
- `exec-gh.ts` - GitHub CLI execution
- `date-formatter.ts` - Date manipulation
- `template-engine.ts` - Template rendering
- `pdf-exporter.ts` - PDF generation
- `html-report-generator.ts` - HTML output
- `chart-generator.ts` - Data visualization

### `/src/cli/` - CLI Interface

**Responsibility:** Command-line interface and user interaction

**Components:**
- `commands/` - CLI command implementations
- `prompts.ts` - Interactive prompts
- `progress.ts` - Progress display
- `rate-limit-display.ts` - Rate limit UI

### `/electron/` - Desktop GUI

**Structure:**
```
electron/
├── main/              (Main process)
│   └── index.ts      (Window management, IPC handlers)
├── preload/          (Bridge layer)
│   └── index.ts      (Secure API exposure)
└── renderer/         (UI layer)
    ├── src/
    │   ├── App.tsx               (Main component)
    │   ├── components/           (React components)
    │   │   ├── RepositorySelector.tsx
    │   │   ├── FilterPanel.tsx
    │   │   ├── ExportPanel.tsx
    │   │   └── ProgressDisplay.tsx
    │   ├── context/              (React context)
    │   │   └── ThemeContext.tsx
    │   ├── styles.css
    │   └── types.d.ts
    ├── index.html
    └── main.tsx
```

## Data Flow

### Export Workflow

```
User Selection
  ↓
[CLI/GUI Input Processing]
  ↓
Repository Validation
  ↓
[For each exporter type]
  ├─ Fetch data from GitHub API
  ├─ Handle rate limiting/retries
  ├─ Convert to internal format
  └─ Validate data
  ↓
Data Aggregation
  ↓
[If analytics enabled]
  ├─ Calculate metrics
  ├─ Generate analysis
  └─ Create report
  ↓
Format Generation (MD/JSON/PDF)
  ↓
File Output
  ↓
Completion Report
```

### Analytics Pipeline

```
Extracted Data
  ↓
Data Validation
  ├─ Check completeness
  ├─ Verify bounds
  └─ Validate relationships
  ↓
Metrics Calculation
├─ Basic: counts, averages, totals
├─ Advanced: trends, correlations
└─ Benchmarks: comparisons
  ↓
Insight Generation
├─ Narrative analysis
├─ Pattern detection
└─ Recommendations
  ↓
Report Orchestration
├─ Activity section
├─ Contributors section
├─ Performance metrics
├─ Trends & predictions
├─ Benchmarks
└─ Health assessment
  ↓
Format Generation
├─ Markdown (for documentation)
├─ JSON (for programmatic access)
└─ PDF (for distribution)
  ↓
Output
```

## Key Design Patterns

### 1. Strategy Pattern
**Usage:** Multiple exporters with common interface

```typescript
interface Exporter {
  export(): Promise<void>;
}

class PullRequestExporter implements Exporter { ... }
class IssueExporter implements Exporter { ... }
```

### 2. Factory Pattern
**Usage:** Create appropriate exporter based on type

```typescript
function createExporter(type: string): Exporter {
  switch(type) {
    case 'prs': return new PullRequestExporter(...);
    // ...
  }
}
```

### 3. Observer Pattern
**Usage:** Progress tracking and IPC communication

```typescript
mainWindow.webContents.on('did-finish-load', () => {
  // Handle window ready
});

ipcMain.handle('export-data', async (event, options) => {
  // Handle export request
});
```

### 4. Template Method Pattern
**Usage:** Base exporter defines export algorithm

```typescript
abstract class BaseExporter {
  async export() {
    await this.validate();
    const data = await this.fetch();
    await this.process(data);
    await this.output(data);
  }
}
```

### 5. Singleton Pattern
**Usage:** Shared services

```typescript
class RateLimiter {
  private static instance: RateLimiter;
  static getInstance(): RateLimiter { ... }
}
```

## Configuration Management

### Configuration Hierarchy

```
Default Values (in code)
  ↓
Environment Variables (.env)
  ↓
Config File (config.json)
  ↓
CLI Arguments (highest priority)
```

### Batch Configuration

```json
{
  "repositories": ["owner/repo1", "owner/repo2"],
  "exportTypes": ["prs", "issues", "commits"],
  "format": "markdown",
  "outputPath": "./exports",
  "generateAnalytics": true,
  "options": {
    "diffMode": true,
    "parallelism": 5
  }
}
```

## Error Handling Strategy

### Multi-Level Approach

1. **Input Validation** - Early error detection
2. **API Error Handling** - Retry logic and fallbacks
3. **Data Validation** - Ensure data integrity
4. **Processing Error Recovery** - Continue with partial data
5. **User Feedback** - Clear error messages

### Error Categories

- **Fatal**: Prevents execution (auth failure)
- **Critical**: Loss of major functionality
- **Warning**: Partial feature degradation
- **Info**: Status updates

## Performance Optimization

### Caching Strategy

- **Repository data** - Cached with TTL
- **API responses** - Cached based on ETag
- **Calculated metrics** - Cache analytics results
- **Generated reports** - Cache report sections

### Parallelization

- **Batch exports** - Process multiple repos concurrently
- **API calls** - Parallel within rate limits
- **Report generation** - Parallel section generation

### Resource Management

- **Memory**: Stream large datasets
- **CPU**: Limit concurrent operations
- **I/O**: Batch file operations
- **Network**: Respect GitHub API limits

## Security Considerations

### Authentication
- Uses GitHub CLI's existing authentication
- No credential storage in application
- Token validation on startup

### Data Protection
- No sensitive data logged
- User data isolated to output directory
- IPC message validation in Electron

### Permissions
- File system: Only access configured output path
- Network: Only GitHub API endpoints
- System: No system-level access needed

## Testing Architecture

### Test Organization

```
tests/
├── unit/                 (Individual function tests)
├── integration/          (Module interaction tests)
└── e2e/                  (Full workflow tests)
```

### Coverage Targets

- Statements: 80%
- Branches: 80%
- Functions: 60%
- Lines: 80%

## Build & Deployment

### Build Outputs

- **CLI**: `dist/` directory with CommonJS modules
- **GUI**: `out/` directory with Electron bundled app

### Build Tools

- **CLI**: TypeScript compiler + Vite bundler
- **GUI**: electron-vite for optimized bundling
- **Docs**: VitePress for documentation site

## Future Architecture Improvements

- [ ] Plugin system for custom exporters
- [ ] Real-time sync with API webhooks
- [ ] Database backend for large-scale operations
- [ ] Cloud integration for storage
- [ ] Advanced caching strategies
- [ ] GraphQL API support
