# Installation

## Prerequisites

Before installing GitHub Extractor CLI, you need to have the following installed:

1. **Node.js** (version 18 or higher)
2. **GitHub CLI** (`gh`)

### Installing Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org/). Make sure to install version 18 or higher.

### Installing GitHub CLI

Follow the official installation guide for your platform:

- **Windows**: `winget install GitHub.cli` or download from [cli.github.com](https://cli.github.com/)
- **macOS**: `brew install gh` or download from [cli.github.com](https://cli.github.com/)
- **Linux**: Follow the [installation instructions](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)

After installing GitHub CLI, authenticate with your GitHub account:

```bash
gh auth login
```

## Installing GitHub Extractor CLI

### Global Installation (Recommended)

Install the tool globally using npm:

```bash
npm install -g ghextractor
```

### Local Installation

You can also install it locally in a project:

```bash
npm install ghextractor
```

## Verifying Installation

Check that the tool is installed correctly:

```bash
ghextractor --version
```

You can also check your GitHub CLI setup:

```bash
ghextractor --check
```

This will verify that GitHub CLI is installed and you're authenticated.