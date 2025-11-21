# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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