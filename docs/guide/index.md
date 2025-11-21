# Introduction

GitHub Extractor CLI is a universal cross-platform CLI tool that allows users to extract Pull Requests, Commits, Branches, Issues, and Releases from GitHub repositories into Markdown or JSON formats.

## Key Features

- **Zero Configuration**: Works out of the box with GitHub CLI
- **Public Repository Support**: Document any public GitHub repository (e.g., `facebook/react`)
- **Collaboration Support**: Automatically includes repositories where you're a collaborator
- **Multiple Export Formats**: Export data as Markdown, JSON, or both
- **Full Repository Backup**: Export all repository data with a single command
- **Rate Limit Aware**: Built-in rate limiting and retry mechanisms
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Open Source**: MIT licensed

## How It Works

The tool uses the GitHub CLI (`gh`) under the hood to fetch data from GitHub's API. This approach ensures:

1. Authentication is handled by GitHub CLI
2. Rate limits are properly respected
3. Access to all repository data you have permissions for
4. No need to manage personal access tokens manually

## Use Cases

- **Documentation Generation**: Automatically generate documentation from your GitHub activity
- **Open Source Documentation**: Document public repositories for reference or analysis
- **Repository Backups**: Create complete backups of your repositories and collaborations
- **Audit and Compliance**: Export repository data for compliance purposes
- **Analytics and Reporting**: Analyze your GitHub workflow and productivity
- **Migration Workflows**: Migrate data between repositories or organizations
- **Research and Learning**: Study popular open-source projects by exporting their data