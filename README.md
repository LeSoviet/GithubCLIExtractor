# GitHub Extractor CLI (ghextractor)

[![npm version](https://img.shields.io/npm/v/ghextractor.svg)](https://www.npmjs.com/package/ghextractor)
[![npm downloads](https://img.shields.io/npm/dt/ghextractor.svg)](https://www.npmjs.com/package/ghextractor)

A cross-platform CLI tool to extract GitHub data (PRs, commits, issues, releases) into Markdown/JSON formats.

## What is it?

GitHub Extractor CLI is a tool that extracts comprehensive data from GitHub repositories including:
- Pull Requests and Issues with full details
- Commit histories and Branch information
- Release notes and assets
- Automatic analytics reports with offline mode (v0.8.0)
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

You'll see an interactive menu:

```
🚀 GitHub Extractor

Choose your interface:
  1) CLI - Command Line Interface (original)
  2) GUI - Graphical User Interface (with filters)
  q) Quit

Your choice (1/2/q):
```

### Direct Access

**Launch CLI directly:**
```bash
ghextractor --cli
# or use any CLI arguments
ghextractor --help
ghextractor --version
```

**Launch GUI directly:**
```bash
ghextractor --gui
```

### GUI Features

The GUI mode includes:
- 📅 **Date Filters**: Last week, last month, custom range, or all time
- 👤 **User Filters**: Filter by specific contributors
- 📦 **Multi-Export**: Select multiple data types at once
- 📊 **Progress Tracking**: Real-time export progress
- 🎨 **Modern UI**: Beautiful, user-friendly interface

**Example Use Case**: Your PM asks *"What did Daniel do last week?"*
1. Run `ghextractor --gui`
2. Select repository
3. Choose "Last Week" + "Daniel" from filters
4. Export PRs, Commits, Issues
5. Get instant report!





## Development

```bash
# Clone and install dependencies
git clone https://github.com/LeSoviet/GithubCLIExtractor.git
cd GithubCLIExtractor
npm install

# Development scripts
npm run dev          # Run CLI in development mode
npm run dev:gui      # Run GUI in development mode (with hot-reload)
npm run build        # Build CLI for production
npm run build:gui    # Build GUI for production
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

**Latest (v0.9.2)**:
- ✅ Fixed version detection issues in built distributions
- ✅ Enhanced version command to properly read package version from multiple paths
- ✅ Improved StateManager to use actual package version instead of hardcoded values
- ✅ Added comprehensive tests to prevent future regressions
- ✅ **NEW**: Desktop GUI with Electron + React
- ✅ **NEW**: Date range filters (last week, last month, custom)
- ✅ **NEW**: User-specific filters for PRs, commits, and issues
- ✅ **NEW**: Unified entry point - choose CLI or GUI on launch

## License

MIT © Daniel Khadour https://github.com/LeSoviet

## Support

- [Report Issues](https://github.com/LeSoviet/GithubCLIExtractor/issues)
- [Documentation](https://lesoviet.github.io/GithubCLIExtractor/)
- [NPM Package](https://www.npmjs.com/package/ghextractor)