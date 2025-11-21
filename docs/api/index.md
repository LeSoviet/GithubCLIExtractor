# API Reference

Welcome to the GitHub Extractor CLI API reference. This section provides detailed documentation for all command-line options, configuration parameters, and programmatic interfaces.

## Table of Contents

- [CLI Commands](./commands.md) - Complete reference for all CLI commands and their options
- [Export Options](./options.md) - Detailed documentation for export options and filters
- [Configuration File](./config.md) - Reference for configuration file options and environment variables

## Overview

The GitHub Extractor CLI provides a comprehensive set of options for customizing data extraction from GitHub repositories. You can configure the tool through:

1. **Command-line arguments** - Direct options passed when running the command
2. **Configuration file** - JSON file with persistent settings
3. **Environment variables** - System-level configuration

## Quick Reference

```bash
# Basic usage
ghextractor

# With options
ghextractor --format markdown,json --output ./exports --backup

# With configuration file
ghextractor --config ./my-config.json

# Incremental export (diff mode)
ghextractor --diff

# Batch processing
ghextractor --batch-repos "repo1,repo2,repo3"
```

For detailed information about each aspect of the API, please refer to the specific sections in the sidebar.