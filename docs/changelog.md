# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-20

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
- Comprehensive test suite with 139 tests
- GitHub Actions CI/CD workflow
- Semantic versioning and release automation
- Documentation with VitePress