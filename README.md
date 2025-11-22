# GitHub Extractor CLI (ghextractor)

[![npm version](https://img.shields.io/npm/v/ghextractor.svg)](https://www.npmjs.com/package/ghextractor)
[![npm downloads](https://img.shields.io/npm/dt/ghextractor.svg)](https://www.npmjs.com/package/ghextractor)

A cross-platform CLI tool to extract GitHub data (PRs, commits, issues, releases) into Markdown/JSON formats.

## What is it?

GitHub Extractor CLI is a tool that extracts comprehensive data from GitHub repositories including:
- Pull Requests and Issues with full details
- Commit histories and Branch information
- Release notes and assets
- Automatic analytics reports with offline mode (v0.7.2)
- Smart update notifications to keep you informed

## Why use it?

- **Documentation Automation**: Generate complete repository documentation with a single command
- **Efficiency**: Incremental exports only fetch new/updated items (80-95% faster)
- **Flexibility**: Export in Markdown, JSON, or both formats
- **Scalability**: Batch process dozens of repositories simultaneously
- **Universal Access**: Works with your repositories, collaborator repos, or any public repository

## How to use it?

Install and run:

```bash
# Install GitHub CLI (if not already installed)
# Visit https://cli.github.com/ for installation instructions

# Install ghextractor
npm install -g ghextractor

# Authenticate with GitHub (if not already authenticated)
gh auth login

# Run the interactive tool
ghextractor
```





## Development

```bash
# Clone and install dependencies
git clone https://github.com/LeSoviet/GithubCLIExtractor.git
cd GithubCLIExtractor
npm install

# Development scripts
npm run dev          # Run in development mode
npm run build        # Build for production
npm run test         # Run tests
npm run test:coverage # Run tests with coverage
```

## Status

Production Ready - All core features implemented and tested:
- GitHub CLI integration and authentication
- Complete data extraction (PRs, Issues, Commits, Branches, Releases)
- Incremental exports (80-95% faster)
- Multiple export formats (Markdown, JSON)
- Batch processing for multiple repositories
- Automatic analytics generation with offline mode
- Auto update notifications
- Cross-platform support

**Latest (v0.7.2)**:
- ✅ Offline analytics mode - generate reports without API access
- ✅ Auto update notifications - stay informed of new releases
- ✅ Fixed empty analytics reports issue

## License

MIT © Daniel Khadour https://github.com/LeSoviet

## Support

- [Report Issues](https://github.com/LeSoviet/GithubCLIExtractor/issues)
- [Documentation](https://lesoviet.github.io/GithubCLIExtractor/)
- [NPM Package](https://www.npmjs.com/package/ghextractor)