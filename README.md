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
- 🎨 **Beautiful CLI** - Modern interactive interface with @clack/prompts
- ⚡ **TypeScript** - Full type safety and great DX
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
   - Select a repository
   - Choose what to export (PRs, commits, issues, etc.)
   - Select output format (Markdown, JSON, or both)
   - Specify output path

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
