# ghextractor - GitHub Extractor CLI

A universal cross-platform CLI tool that allows you to extract Pull Requests, Commits, Branches, Issues, Releases, and generate complete documentation automatically using GitHub CLI.

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

### From npm (Coming Soon)

```bash
npm install -g ghextractor
```

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/LeSoviet/ghextractor.git
cd ghextractor

# Install dependencies
npm install

# Run in development mode
npm run dev
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

## Usage

```bash
ghextractor
```

The tool will guide you through an interactive menu to:
- Scan your GitHub repositories
- Select which repository to export from
- Choose what data to extract
- Configure export options

## Project Structure

```
ghextractor/
├── src/
│   ├── cli/          # CLI prompts and UI
│   ├── core/         # Core functionality (auth, rate limiting)
│   ├── scanner/      # Repository scanning
│   ├── exporters/    # Data exporters (PRs, commits, etc.)
│   ├── utils/        # Utility functions
│   └── types/        # TypeScript type definitions
├── bin/              # CLI executable
├── tests/            # Test files
└── dist/             # Compiled output (after build)
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

### Building

```bash
npm run build
```

This will compile TypeScript to both ESM and CommonJS formats in the `dist/` directory.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed development plans and milestones.

### Current Status: MVP Development

- ✅ Project structure and configuration
- ✅ GitHub CLI integration
- ✅ Authentication detection
- ✅ Repository scanner
- ✅ Interactive CLI interface
- 🚧 Data exporters (in progress)
- 🚧 Rate limiting
- 🚧 Caching system

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

## License

MIT © LeSoviet

## Support

- 🐛 [Report Issues](https://github.com/LeSoviet/ghextractor/issues)
- 💡 [Request Features](https://github.com/LeSoviet/ghextractor/issues/new)
- 📖 [Documentation](https://github.com/LeSoviet/ghextractor/wiki)

## Acknowledgments

- Built with [GitHub CLI](https://cli.github.com/)
- Powered by [@clack/prompts](https://github.com/natemoo-re/clack)
- TypeScript-first architecture
