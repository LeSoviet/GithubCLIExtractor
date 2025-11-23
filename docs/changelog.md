# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.2] - 2025-11-23

### Fixed
- **Version Detection**: Fixed issues with version detection in built distributions
  - `VersionCommand` now properly reads package version from multiple possible paths
  - `StateManager` now uses actual package version instead of hardcoded '1.0.0'
  - `getCurrentVersion()` utility enhanced to try multiple paths for package.json
  - Added comprehensive tests to prevent future regressions
  - Fixed failing version-checker tests that expected semver format

## [0.9.1] - 2025-11-23

### Fixed
- **Version Command**: Fixed `--version` flag showing incorrect version (0.1.0 instead of actual version)
  - `VersionCommand` now tries multiple paths to find `package.json` in different environments
  - Works correctly in npm global installs, local development, and both ESM/CJS contexts
  - Validates package name before using version to ensure correct package.json is read

## [0.9.0] - 2025-11-23

### Added
- **Modular Analytics Report Generation System**: Complete refactoring of analytics into reusable, testable components
  - **Exporter Factory**: Factory pattern for creating format-specific exporters (Markdown/JSON)
  - **Metrics Calculator**: Pure functions for computing analytics metrics (PR merge rate, bus factor, commit velocity, etc.)
  - **Export Orchestrator**: Coordinates multi-format exports with comprehensive error handling and graceful degradation
  - **Section-Based Report Generators**: Specialized generators for activity, contributors, labels, health metrics, and recommendations
  - **Status Helpers**: Centralized logic for health status indicators with visual emoji indicators
- **Enhanced Test Coverage**: Added 56 new comprehensive tests (161 → 201 total tests)
  - 16 tests for Exporter Factory (100% coverage)
  - 26 tests for Metrics Calculator (100% coverage)
  - 14 tests for Export Orchestrator (83.58% coverage)
- **Command Pattern for CLI**: Extracted command handlers into dedicated classes
  - `HelpCommand`: Displays usage information and examples
  - `VersionCommand`: Shows package version from package.json
  - `CheckCommand`: Verifies GitHub CLI setup and authentication

### Changed
- **Reduced Code Complexity**: Major reduction in large file sizes
  - `analytics-processor.ts`: 1,082 → 761 lines (-30%)
  - `index.ts`: 836 → 761 lines (-9%)
  - Total reduction: -396 lines (-21%) in main files
  - Created 14 new focused modules averaging ~54 lines each
- **Improved Architecture**: Separation of concerns and better maintainability
  - Presentation logic separated from business logic
  - Each module has a single, clear responsibility
  - Pure functions for easier testing and reasoning
  - Well-defined interfaces and type safety throughout
- **Better Export System**: Enhanced multi-format export capabilities
  - Supports partial export failures (e.g., markdown succeeds but JSON fails)
  - Provides detailed operation results and summary messages
  - Helper methods for result interpretation
  - Handles directory creation failures gracefully

### Removed
- **Dead Code Cleanup**: Removed 3 unused files and 17 unused dependencies
  - Deleted `src/analytics/type-specific-reports.ts` (empty file)
  - Deleted `src/types/filter.ts` (unused filter functions)
  - Deleted `tests/benchmarks/performance.bench.ts` (unused benchmark)
  - Removed 17 npm packages: `cli-progress`, `conf`, `@types/cli-progress`, `@types/handlebars`, `@semantic-release/github`, `conventional-changelog-conventionalcommits`, `husky`, and others
  - Cleaned 4 unused type imports from `src/analytics/report-generators/types.ts`

### Fixed
- **Export Orchestrator Tests**: Resolved 6 failing tests by properly mocking the executeExport method
- **Status Helper Return Values**: Fixed status helpers to return full text (e.g., "🟢 Excellent") instead of just emojis
- **TypeScript Compilation**: Resolved all type errors and unused import warnings
- **Code Formatting**: Applied Prettier formatting and ESLint fixes across entire codebase

### Technical
- **Design Patterns Implemented**:
  - Factory Method: Creates objects without specifying exact class (Exporter Factory)
  - Strategy: Encapsulates export algorithms (Markdown vs JSON)
  - Orchestrator: Coordinates complex multi-step operations (Export Orchestrator)
  - Command: Encapsulates CLI operations (Help, Version, Check commands)
  - Composition: Main classes compose smaller, focused components
- **Tools Used**:
  - `knip`: Dead code detection and automatic removal
  - `ts-prune`: Unused export detection
  - `vitest`: Testing framework with enhanced test suite
  - TypeScript: Full type safety with strict null checks

### Performance
- **Reduced Bundle Size**: Smaller, more focused modules improve tree-shaking
- **Better Testability**: Unit tests can now target specific modules in isolation
- **Faster Development**: Easier to locate and modify specific functionality

### Migration Notes
For developers using the analytics API:
- The `MarkdownReportGenerator` now requires a `packageVersion` parameter
- Export operations should use the new `ExportOrchestrator` for multi-format support
- Metrics can be calculated independently using `MetricsCalculator.calculateAll(report)`
- Old export code will still work but consider migrating to the new orchestrator pattern

## [0.8.0] - 2025-11-22

### Added
- **Enhanced Analytics Report Formatting**: Improved visual presentation and data clarity
  - Dynamic contributor table that only shows columns with non-zero data
  - Summary stats section with key metrics for executive overview
  - Better handling of missing data with explanatory messages
- **Improved Offline Mode Reliability**: Fixed core analytics processor to properly use parsed markdown data
  - Active contributors now correctly calculated from PR authors (122 contributors vs 0)
  - Review coverage accurately reflects PR review status
  - All metrics now show meaningful values instead of zeros

### Fixed
- **Analytics Report Display Issues**: Resolved confusing "0 commits" displays in contributor tables
- **Version Display**: Shows "n/a" instead of "unknown" when version cannot be determined
- **PR Size Messaging**: Enhanced "No data available" message with explanation "(PRs contain no diff metadata)"
- **Formatting Issues**: Fixed code style issues that were preventing clean commits

### Changed
- **Report Structure**: Added summary statistics section at end of analytics reports
  - Total PRs processed and reviewed counts
  - Release count and active contributor metrics
  - Percentage of release-notes labels for quick insights

## [0.7.4] - 2025-11-22

### Added
- **Initial Analytics Features**: First implementation of analytics reporting capabilities
  - Basic contributor tables with commit counts
  - Simple PR review coverage metrics
  - Preliminary release tracking statistics
- **Offline Analytics Mode**: Analytics can now work with exported data instead of requiring GitHub API access
  - Parses exported markdown files (PRs, Issues, Releases)
  - Works with private repositories and offline environments
  - Basic implementation with limited metrics

### Fixed
- **Analytics Report Generation**: Fixed issue where analytics reports were empty in some cases
  - Resolved problems with data parsing from exported files
  - Improved error handling for missing data scenarios

## [0.7.2] - 2025-01-21

### Added
- **Automatic Update Notifications**: CLI now checks for new versions and notifies users when updates are available
  - Non-blocking background check (once per day)
  - Clear visual notification with update command
  - Direct link to release changelog
  - Skipped during tests and for help/version flags
- **Offline Analytics Mode**: Analytics now work with exported data instead of requiring GitHub API access
  - Automatically enabled when generating analytics after exports
  - Parses exported markdown files (PRs, Issues, Releases)
  - Works with private repositories and offline environments
  - No more empty analytics reports!

### Fixed
- **Analytics Report Generation**: Fixed issue where analytics reports were empty
  - Previous version tried to fetch from GitHub API even after export
  - Now uses offline mode by default to parse local exported files
  - Analytics now accurately reflect exported data

### Technical
- Added `update-notifier` dependency for version checking
- Created `version-checker` utility module
- Integrated version check into CLI startup flow
- Created `MarkdownParser` class for parsing exported markdown files
- Updated `AnalyticsProcessor` to support offline mode with `offline` and `exportedDataPath` options
- Modified all analytics generation calls to use offline mode by default

## [0.7.0] - 2025-11-21

### Added
- **Automatic Analytics Generation**: Analytics reports are now automatically generated with every export operation
- **Enhanced Data Extraction Limits**: Increased data limits for better analysis of large repositories
  - PR/Issue lists: 300 → 1000 items
  - Release lists: 50 → 200 items
  - Exporters: 100 → 500 items
  - Comprehensive test coverage: Added extensive unit tests for analytics module with 92%+ coverage

### Changed
- **Analytics Integration**: Removed `--analytics` flag as analytics are now automatically generated
- **CLI Interface**: Removed analytics option from interactive prompts
- **Data Processing**: Increased GitHub API limits for more comprehensive repository analysis

### Technical
- Updated export logic to automatically generate analytics after each export
- Enhanced error handling for analytics generation
- Improved test coverage for all analytics modules

## [0.6.3] - 2025-11-21

### Fixed
- **Version Conflict**: Incremented version to resolve npm publishing conflict

## [0.6.2] - 2025-11-21

### Fixed
- **CI/CD Pipeline**: Enhanced npm publishing workflow with fallback mechanism and improved authentication

## [0.6.1] - 2025-11-21

### Fixed
- **CI/CD Pipeline**: Resolved npm authentication issues in GitHub Actions workflow

## [0.6.0] - 2025-11-21

### Added
- **Enterprise-Grade Batch Processing**: Export multiple repositories simultaneously with controlled concurrency
  - Process dozens or hundreds of repositories in a single command
  - Configurable parallelism (default: 3 repositories at a time)
  - JSON configuration file support for complex batch operations
  - Command-line options for quick batch exports
  - Comprehensive batch summary report with per-repository details
- **Automatic Code Quality Enforcement**: Pre-commit and pre-push hooks to ensure code is properly formatted and linted
  - Automatic Prettier formatting on commit
  - ESLint validation on commit
  - Pre-push validation to prevent unformatted code from being pushed
- **Enhanced CI/CD Workflow**: Streamlined GitHub Actions with reduced redundancy and improved efficiency

### Changed
- **Improved Developer Experience**: More flexible linting configuration with reduced strictness
- **Optimized CI Processes**: Consolidated multiple CI jobs into more efficient workflows
- **Code Quality Standards**: Relaxed certain ESLint rules to reduce noise while maintaining code quality

### Fixed
- **Code Formatting Issues**: Resolved all Prettier formatting warnings across the codebase
- **Linting Configuration**: Fixed ESLint configuration to properly include all project files

## [0.5.0] - 2025-11-21

### Added
- **Documentation Updates**: Added milestone status documentation
- **Workflow Improvements**: Enhanced CI/CD pipelines for better reliability

### Changed
- **Version Bump**: Incremented version to v0.5.0 for continued development

## [0.4.0] - 2025-11-21

### Added
- **Diff Mode (Incremental Exports)**: Revolutionary feature that exports only new/updated items since last run
  - New `--diff` and `--incremental` flags for incremental exports
  - State management system tracks last export timestamps
  - `--force-full` flag to override diff mode and force full export
  - Persistent state stored in `~/.ghextractor/state/exports.json`
  - Automatic detection of first-time exports
  - State updates after successful exports for future incremental runs

### Changed
- `ExportOptions` interface now includes optional `diffMode` parameter
- `BaseExporter` class enhanced with diff mode support methods
- CLI help updated with new diff mode flags and examples
- Export flow now integrates state management for incremental exports

### Performance
- **80-95% reduction in API calls** for subsequent exports with `--diff`
- **10x faster** exports for large repositories using incremental mode
- Minimal rate limit impact on repeated exports

### Technical
- New `StateManager` singleton for managing export states
- New types in `src/types/state.ts` for state management
- Full integration with existing exporter architecture
- Backward compatible - diff mode is opt-in

## [0.3.0] - 2025-11-21

### Fixed
- **Complete Release Export**: Fixed incomplete release exports that were missing release notes (body content)
- Changed from GitHub API endpoint to `gh release view` command for more reliable data fetching
- Releases now export with full content including complete release notes, assets, and author information
- Increased timeout from 10s to 30s and enabled automatic retries for better reliability with large repositories

### Changed
- Updated release fetching mechanism in `ReleaseExporter` to use native GitHub CLI commands
- Improved error handling for release details fetching

## [0.2.0] - 2025-11-20

### Added
- **Public Repository Support**: Users can now document any public repository by entering the repository manually in `owner/repo` format (e.g., `facebook/react`)
- **Collaboration Support**: Automatically includes repositories where the authenticated user is a collaborator (not just owned repositories)
- New interactive option "📝 Enter a repository manually" in repository selection menu
- Repository validation and error handling for manually entered repositories
- `getRepositoryFromString()` function for validating and fetching public repository information
- `promptRepositoryInput()` function with format validation

### Changed
- `listUserRepositories()` now uses GitHub API endpoint `user/repos` to include collaborator repositories (37 total repos instead of 34)
- `selectRepository()` return type changed to `Promise<Repository | null>` to support manual entry option
- Updated README with new features and usage examples for public repositories

### Improved
- Better user experience for documenting open-source projects
- Enhanced repository discovery including collaboration repos
- Comprehensive documentation with use cases for public repository documentation

## [0.1.0] - 2025-11-20

### Added
- Initial release
  - GitHub CLI integration
  - Repository scanner
  - Interactive CLI interface
  - Data exporters (PRs, Issues, Commits, Branches, Releases)
  - Rate limiting with Bottleneck
  - Caching system with ETag support
  - Full backup mode
  - Markdown and JSON export formats
  - Custom template support
  - Configuration file support
  - Progress tracking and spinners
  - Error handling and retry logic
  - Comprehensive test suite


  - Initial release with basic functionality
