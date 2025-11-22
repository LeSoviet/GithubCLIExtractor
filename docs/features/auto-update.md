# Automatic Update Notifications

GitHub Extractor CLI automatically checks for new versions and notifies users when updates are available.

## How It Works

- **Non-blocking**: Version check runs in the background and doesn't slow down the CLI
- **Smart caching**: Checks only once per day to avoid unnecessary network requests
- **Silent failure**: If the check fails (network issues, etc.), it doesn't interrupt your workflow
- **Skipped when appropriate**: No checks during tests, help, version, or check commands

## User Experience

When a new version is available, users see a friendly notification at startup:

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Update available! 0.7.1 → 0.8.0                                    │
│                                                                      │
│  Run npm install -g ghextractor to update                           │
│                                                                      │
│  Changelog: https://github.com/LeSoviet/GithubCLIExtractor/releases/tag/v0.8.0 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Dependencies

- **update-notifier**: Industry-standard package for version checking
  - Used by popular CLIs like npm, yeoman, and create-react-app
  - Respects user preferences and offline mode

### Files

- `src/utils/version-checker.ts`: Core version checking logic
- Integration in `src/index.ts`: Called at CLI startup

### Configuration

The update checker:
- Checks npm registry for latest published version
- Caches result for 24 hours in `~/.config/configstore/update-notifier-ghextractor.json`
- Compares against current version in `package.json`

## For Users

### Installing Updates

When notified of an update:

```bash
npm install -g ghextractor
```

### Checking Current Version

```bash
ghextractor --version
```

### Disabling Update Checks

Set environment variable:

```bash
export NO_UPDATE_NOTIFIER=1
```

Or add to your shell profile (~/.bashrc, ~/.zshrc, etc.):

```bash
echo 'export NO_UPDATE_NOTIFIER=1' >> ~/.bashrc
```

## For Developers

### Testing Locally

The update check is automatically skipped in test mode:

```typescript
if (!process.env.GHX_TEST_MODE && !args.help && !args.version && !args.check) {
  checkForUpdates().catch(() => {
    // Silently ignore errors
  });
}
```

### Simulating Update Notification

To test the notification locally:

1. Temporarily change version in `package.json` to a lower version (e.g., `0.1.0`)
2. Clear the cache: `rm -rf ~/.config/configstore/update-notifier-ghextractor.json`
3. Run the CLI: `npm run dev` or `ghextractor`
4. You should see the update notification

### Publishing New Versions

When you publish a new version to npm:

1. Users will be notified within 24 hours of their next CLI usage
2. The notification includes:
   - Current version
   - Latest version
   - Update command
   - Link to release notes

## Benefits

✅ **User Awareness**: Users always know when updates are available
✅ **Non-Intrusive**: Doesn't slow down or interrupt workflows
✅ **Security**: Encourages users to stay up-to-date with security patches
✅ **Feature Discovery**: Users learn about new features through release notes
✅ **Professional**: Matches the UX of popular enterprise CLIs
