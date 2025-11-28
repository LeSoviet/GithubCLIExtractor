# GitHub Extractor CLI (ghextractor)

[![npm version](https://img.shields.io/npm/v/ghextractor.svg)](https://www.npmjs.com/package/ghextractor)
[![npm downloads](https://img.shields.io/npm/dt/ghextractor.svg)](https://www.npmjs.com/package/ghextractor)

A cross-platform CLI and GUI tool to extract GitHub data (PRs, commits, issues, releases) into Markdown/JSON/PDF formats.

## What is it?

GitHub Extractor is a comprehensive tool that extracts and analyzes GitHub repository data including:
- **Data Extraction**: Pull Requests, Issues, Commits, Branches, and Release notes
- **Multiple Interfaces**: 
  - CLI (Command Line Interface) for automation and scripting
  - GUI (Graphical User Interface) with Electron for interactive use
- **Export Formats**: Markdown, JSON, and PDF (with charts and visualizations)
- **Analytics**: Automatic report generation with metrics, trends, and recommendations
- **Batch Processing**: Export multiple repositories simultaneously
- **Smart Mode**: Incremental exports fetch only new/updated items (80-95% faster)

## Why use it?

- **Two Interfaces**: Choose between CLI for automation or GUI for interactive use
- **Comprehensive Exports**: Markdown, JSON, and PDF with charts and visualizations
- **Intelligence**: Automatic analytics generation with trends, predictions, and insights
- **Efficiency**: Incremental exports (80-95% faster) - only fetch new/updated items
- **Scalability**: Batch process dozens of repositories in a single command
- **Universal Access**: Works with your repositories, collaborators, or any public repository
- **Consistency**: Reports adapt to export scope - complete for backups, accurate for filtered exports

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

**Latest (v0.9.3)**:
- ✅ Full Electron GUI with dark/light theme support
- ✅ Custom cross-platform titlebar with window controls
- ✅ Theme-aware UI components (scrollbar, buttons, menus)
- ✅ Enhanced export limits (PRs/Issues: 1000, Commits: 500)
- ✅ Data completeness validation for consistent reports
- ✅ PDF export with proper Unicode handling
- ✅ Auto-build and launch - no manual setup needed
- ✅ Verified on Windows, macOS, and Linux (Nobara/Fedora)
- ✅ 206 tests passing with comprehensive coverage
- ✅ Production-ready with full documentation

**Planned Enhancements**:
- Performance benchmarking and optimization
- Advanced security scanning integration
- Custom report templates and theming
- Real-time collaboration features

## License

MIT © Daniel Khadour https://github.com/LeSoviet

## Support

- [Report Issues](https://github.com/LeSoviet/GithubCLIExtractor/issues)
- [Documentation](https://lesoviet.github.io/GithubCLIExtractor/)
- [NPM Package](https://www.npmjs.com/package/ghextractor)