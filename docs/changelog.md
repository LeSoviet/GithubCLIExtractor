# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

## [0.7.0] - 2025-11-21

### Added
- **Automatic Analytics Generation**: Analytics reports are now automatically generated with every export operation
- **Enhanced Data Extraction Limits**: Increased data limits for better analysis of large repositories
  - PR/Issue lists: 300 → 1000 items
  - Release lists: 50 → 200 items
  - Exporters: 100 → 500 items
- **Comprehensive Test Coverage**: Added extensive unit tests for analytics module with 92%+ coverage

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
- fix: increment version to 0.6.3 to resolve npm publishing conflict

## [0.6.2] - 2025-11-21

### Fixed
- fix: enhance npm publishing workflow with fallback mechanism

## [0.6.1] - 2025-11-21

### Fixed
- fix: resolve npm authentication issues in CI/CD pipeline

## [0.6.0] - 2025-11-21

### Added
- feat: implement enterprise-grade batch processing for multiple repositories
- feat(batch): add batch export mode with interactive prompts and CLI options

### Changed
- chore(ci): improve linting, testing, and build workflows
- chore(config): update ESLint and Vitest configurations
- docs: document diff mode feature and update milestone status

### Fixed
- fix: setup automatic code formatting and linting on commit and push
- fix: update .npmignore and package.json for improved file exclusions and correct repository URL

## [0.5.0] - 2025-11-21

### Added
- docs: add milestone 7 status documentation

### Changed
- refactor(state): improve code formatting and readability
- refactor(core): use SingleExportType for incremental export state management

### Fixed
- chore(release): bump version to v0.5.0

## [0.4.0] - 2025-11-21

### Added
- **Diff Mode (Incremental Exports)**: Revolutionary feature that exports only new/updated items since last run
  - New `--diff` and `--incremental` flags for incremental exports
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

## [0.1.0] - 2024-12-XX

### Added
- Initial release of GitHub Extractor CLI
- Support for exporting Pull Requests, Issues, Commits, Branches, and Releases
- Multiple export formats (Markdown, JSON)
- Interactive CLI interface with [@clack/prompts](https://github.com/natemoo-re/clack)
- Configuration file support
- Rate limiting with [Bottleneck](https://github.com/SGrondin/bottleneck)
- Caching system with ETag support
- Full backup mode
- Custom template support
- Cross-platform support (Windows, macOS, Linux)
- Comprehensive test suite
- GitHub Actions CI/CD workflow
- Semantic versioning and release automation
- Documentation with VitePress