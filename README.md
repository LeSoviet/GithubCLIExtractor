# ghextractor - GitHub Extractor CLI

A universal cross-platform CLI tool that allows you to extract Pull Requests, Commits, Branches, Issues, Releases, and generate complete documentation automatically using GitHub CLI.

[![npm version](https://img.shields.io/npm/v/ghextractor.svg)](https://www.npmjs.com/package/ghextractor)
[![npm downloads](https://img.shields.io/npm/dt/ghextractor.svg)](https://www.npmjs.com/package/ghextractor)

## 🛠️ Built With

- ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
- ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
- ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
- ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
- ![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)

## Features

- 🚀 **Zero Configuration** - Works out of the box with GitHub CLI
- 📦 **Multiple Export Formats** - Markdown, JSON, or both
- 🔄 **Complete Data Extraction** - PRs, commits, branches, issues, releases
- ⚡ **Incremental Exports** - Export only new/updated items (80-95% faster!)
- 🌍 **Public Repository Support** - Document any public repository, even if you're not a contributor
- 👥 **Collaboration Support** - Access repositories where you're a collaborator
- 🏢 **Enterprise-Grade Batch Processing** - Export dozens or hundreds of repositories simultaneously
- 🎨 **Beautiful CLI** - Modern interactive interface with @clack/prompts
- 💪 **TypeScript** - Full type safety and great DX
- 🛡️ **Read-Only** - Never modifies your repositories

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **GitHub CLI** - [Install](https://cli.github.com/)

## Installation

### From npm

```bash
npm install -g ghextractor
```

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/LeSoviet/GithubCLIExtractor.git
cd GithubCLIExtractor

# Install dependencies
npm install
```

## Quick Start

1. **Authenticate with GitHub CLI** (if not already):
   ```bash
   gh auth login
   ```

2. **Run the extractor**:
   ```bash
   ghextractor
   ```

3. **Follow the interactive prompts**:
   - Select a repository from your list OR enter any public repository (e.g., `facebook/react`)
   - Choose what to export (PRs, commits, issues, etc.)
   - Select output format (Markdown, JSON, or both)
   - Specify output path

## Usage Examples

### Basic Usage

Simply run `ghextractor` and select from your list of repositories (including those where you're a collaborator).

### Incremental Exports (Diff Mode)

Export only items that are new or have been updated since your last export - **80-95% faster** than full exports!

```bash
# First run: Full export
ghextractor --diff

# Second run: Only exports new/updated items since last run
ghextractor --diff
```

The tool automatically tracks the last export timestamp for each repository and export type. On subsequent runs with `--diff`, it will:
- ✅ Only fetch items updated since the last export
- ✅ Skip unchanged items
- ✅ Maintain incremental state in `~/.ghextractor/state/exports.json`

**Force a full export even with diff mode:**
```bash
ghextractor --diff --force-full
```

**How it works:**
- **Pull Requests & Issues**: Filters by `updatedAt` date
- **Commits**: Uses GitHub API's `since` parameter for optimal performance
- **Branches**: Filters by last commit date
- **Releases**: Filters by `publishedAt` date

### Document Any Public Repository

Want to document an open-source project? No problem!

1. Run `ghextractor`
2. When prompted to select a repository, choose **"📝 Enter a repository manually"**
3. Type the repository in `owner/repo` format (e.g., `facebook/react`, `microsoft/vscode`, `torvalds/linux`)
4. The tool will validate the repository and proceed with the export

**Example repositories you can try:**
- `facebook/react` - React library
- `microsoft/vscode` - Visual Studio Code
- `vercel/next.js` - Next.js framework
- `nodejs/node` - Node.js runtime

This feature is perfect for:
- 📚 Creating documentation for dependencies you use
- 🔍 Analyzing popular open-source projects
- 📊 Generating reports on community contributions
- 🎓 Learning from established codebases

### Automatic Analytics (New in v0.7.0)

Every export operation now automatically generates a comprehensive analytics report with insights about:
- 📈 Activity patterns and contribution trends
- 👥 Contributor analysis and bus factor metrics
- 🏷️ Label distribution and issue lifecycle
- 🛡️ Code health metrics including PR review coverage

These analytics are generated automatically with every export, providing valuable insights without any additional configuration.

### Batch Processing (Enterprise-Grade)

Export multiple repositories simultaneously with controlled concurrency:

```bash
# Quick batch export from command line
ghextractor --batch-repos "facebook/react,vercel/next.js,microsoft/vscode" --batch-types "releases,prs"

# Batch export with incremental mode
ghextractor --batch-repos "repo1,repo2,repo3" --diff

# Batch export with custom parallelism
ghextractor --batch-repos "repo1,repo2,repo3,repo4,repo5" --batch-parallel 5

# Batch export from JSON configuration file
ghextractor --batch batch-config.json
```

**JSON Configuration Example** (`batch-config.json`):
```json
{
  "repositories": [
    "facebook/react",
    "vercel/next.js",
    "microsoft/vscode"
  ],
  "exportTypes": ["releases", "prs"],
  "format": "markdown",
  "outputPath": "./batch-export",
  "parallelism": 3,
  "diffMode": true,
  "verbose": true
}
```

**Benefits:**
- 🏢 Perfect for organizations with many repositories
- ⚡ Process multiple repositories simultaneously
- 📊 Consolidated summary report with per-repository details
- 🛠️ Configurable parallelism to optimize performance
- 🔄 Supports incremental exports for all repositories

## CLI Options

```bash
ghextractor [options]
```

### Available Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version number |
| `--check` | | Check GitHub CLI installation and authentication |
| `--output <path>` | | Custom output directory (default: `./github-export`) |
| `--format <format>` | | Export format: `markdown`, `json`, or `both` (default: `markdown`) |
| `--diff` | `--incremental` | Incremental export - only new/updated items since last run |
| `--force-full` | | Force full export even if previous state exists |
| `--dry-run` | | Simulate export without creating files |
| `--full-backup` | | Export all resources (PRs, issues, commits, branches, releases) |
| `--verbose` | | Show detailed output including rate limits |
| `--since <date>` | | Filter by date range (start date in ISO format) |
| `--until <date>` | | Filter by date range (end date in ISO format) |
| `--labels <labels>` | | Filter by labels (comma-separated) |
| `--template <path>` | | Use custom template file |
| `--config <path>` | | Path to configuration file |

### Batch Export Options

| Option | Description |
|--------|-------------|
| `--batch <config.json>` | Batch export from JSON configuration file |
| `--batch-repos <repos>` | Comma-separated list of repositories (owner/repo) |
| `--batch-types <types>` | Comma-separated export types (prs,issues,commits,branches,releases) |
| `--batch-parallel <n>` | Number of repositories to process in parallel (default: 3) |

### Examples

```bash
# Interactive mode (recommended for first-time users)
ghextractor

# Check GitHub CLI setup
ghextractor --check

# Export to custom directory
ghextractor --output ./my-docs

# Export as JSON
ghextractor --format json

# Incremental export (80-95% faster!)
ghextractor --diff

# Force full export even with diff mode
ghextractor --diff --force-full

# Full repository backup
ghextractor --full-backup

# Export with date range filter
ghextractor --since 2024-01-01 --until 2024-12-31

# Export with label filter
ghextractor --labels bug,enhancement

# Dry run to test configuration
ghextractor --dry-run --verbose

# Combine multiple options
ghextractor --diff --format both --output ./exports --verbose

# Batch export examples
ghextractor --batch-repos "facebook/react,vercel/next.js" --batch-types "releases"
ghextractor --batch-repos "repo1,repo2" --diff  # Batch + incremental
ghextractor --batch batch-config.json  # Batch from config file
ghextractor --batch-repos "repo1,repo2,repo3" --batch-parallel 5  # Custom parallelism
```

## Development

### Available Scripts

```bash
npm run dev          # Run in development mode with tsx
npm run build        # Build for production
npm run test         # Run tests
npm run test:coverage # Run tests with coverage
npm run lint         # Lint code
npm run format       # Format code with Prettier
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed development plans and milestones.

### Current Status: ✅ Production Ready

- ✅ Project structure and configuration
- ✅ GitHub CLI integration
- ✅ Authentication detection
- ✅ Repository scanner
- ✅ Interactive CLI interface
- ✅ Data exporters (PRs, Issues, Commits, Branches, Releases)
- ✅ Rate limiting with Bottleneck
- ✅ Caching system with ETag support
- ✅ Full backup mode
- ✅ Incremental exports with diff mode (80-95% faster)
- ✅ Markdown and JSON export formats
- ✅ Custom template support
- ✅ Configuration file support
- ✅ Progress tracking and spinners
- ✅ Error handling and retry logic
- ✅ Comprehensive test suite (139 tests passing)
- ✅ Published to npm as `ghextractor`
- ✅ Automated CI/CD with GitHub Actions
- ✅ Semantic versioning and release automation
- ✅ Cross-platform support (Windows, macOS, Linux)
- ✅ Enterprise-grade batch processing for multiple repositories

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

## License

MIT © LeSoviet

## Support

- 🐛 [Report Issues](https://github.com/LeSoviet/GithubCLIExtractor/issues)
- 💡 [Request Features](https://github.com/LeSoviet/GithubCLIExtractor/issues/new)
- 📖 [Documentation](https://lesoviet.github.io/GithubCLIExtractor/)
- 📦 [npm Package](https://www.npmjs.com/package/ghextractor)

## Acknowledgments

- Built with [GitHub CLI](https://cli.github.com/)
- Powered by [@clack/prompts](https://github.com/natemoo-re/clack)
- TypeScript-first architecture