# Release Process

This document describes the 3-phase release workflow for ghextractor.

## 📋 Overview

```
Phase 1: Development → Phase 2: Release → Phase 3: Publish
    (main)              (tagged)            (npm)
```

## 🔄 Phase 1: Development (Push to main)

**What happens**: Normal development workflow

```bash
# Make your changes
git add .
git commit -m "feat: add new feature"
git push origin main
```

**CI/CD Actions**:
- ✅ Runs tests
- ✅ Runs linting
- ✅ Builds project
- ❌ Does NOT create releases
- ❌ Does NOT publish to npm

---

## 🏷️ Phase 2: Create Release (Tagged push)

**What happens**: Creates GitHub Release with changelog

### Prerequisites

1. **Update CHANGELOG.md** manually with new version:
   ```markdown
   ## [0.10.0] - 2025-11-XX

   ### Added
   - New feature description

   ### Changed
   - What changed

   ### Fixed
   - Bug fixes
   ```

2. **Update package.json** version:
   ```bash
   npm version minor  # or major/patch
   # This creates a git tag automatically
   ```

3. **Push with tags**:
   ```bash
   git push origin main --follow-tags
   ```

**CI/CD Actions**:
1. ✅ Runs pre-release checks (tests, lint, build)
2. ✅ Extracts version from tag (e.g., `v0.10.0` → `0.10.0`)
3. ✅ Extracts changelog section from `CHANGELOG.md` for that version
4. ✅ Creates GitHub Release with:
   - Title: `🚀 Release v0.10.0`
   - Body: Changelog content from `CHANGELOG.md`
   - Installation instructions
   - Links to docs and npm
5. ✅ Uploads build artifacts

---

## 📦 Phase 3: Publish to npm (Automatic)

**What happens**: Publishes to npm registry

**CI/CD Actions** (runs after Phase 2 succeeds):
1. ✅ Builds project
2. ✅ Publishes to npm with provenance
3. ✅ If provenance fails, tries without provenance (fallback)
4. ✅ Creates summary report

---

## 📝 Complete Example Workflow

### Step-by-step release of version 0.10.0:

```bash
# 1. Make sure you're on main and up to date
git checkout main
git pull origin main

# 2. Update CHANGELOG.md
# Add new section for [0.10.0] with all changes

# 3. Bump version and create tag
npm version minor  # Creates v0.10.0 tag
# This automatically:
#   - Updates package.json to 0.10.0
#   - Creates git commit "v0.10.0"
#   - Creates git tag "v0.10.0"

# 4. Push everything including tags
git push origin main --follow-tags

# 5. Wait for GitHub Actions
# - Pre-release checks run
# - GitHub Release created with CHANGELOG content
# - npm package published automatically
# - Summary notification sent
```

### What you'll see in GitHub Actions:

```
✓ Pre-release Checks (2m 30s)
  ✓ Lint
  ✓ Tests (201 passed)
  ✓ Build
  ✓ Verify artifacts

✓ Create Release (45s)
  ✓ Extract version: 0.10.0
  ✓ Extract changelog from CHANGELOG.md
  ✓ Create GitHub Release

✓ Publish to npm (1m 15s)
  ✓ Build
  ✓ Publish with provenance

✓ Post-release Notifications (5s)
  ✓ Create summary
```

---

## 🚨 Important Notes

### DO ✅
- Always update `CHANGELOG.md` BEFORE creating the tag
- Use semantic versioning (`major.minor.patch`)
- Test locally before releasing (`npm test`, `npm run build`)
- Use `npm version` command to bump version (creates tag automatically)
- Push with `--follow-tags` to include tags

### DON'T ❌
- Don't push tags without updating CHANGELOG.md first
- Don't manually edit version in package.json (use `npm version`)
- Don't create releases manually in GitHub UI
- Don't publish to npm manually (let CI do it)
- Don't skip pre-release checks

---

## 🔍 Troubleshooting

### Release created but changelog is wrong
- The workflow extracts content from `CHANGELOG.md`
- Make sure the version header matches exactly: `## [X.Y.Z] - YYYY-MM-DD`
- You can edit the release manually on GitHub if needed

### npm publish failed
- Check if version already exists: `npm view ghextractor versions`
- Check `NPM_TOKEN` secret is configured correctly
- Check fallback job ran (publishes without provenance)

### Tag already exists
```bash
# Delete local tag
git tag -d v0.10.0

# Delete remote tag
git push origin :refs/tags/v0.10.0

# Recreate tag
npm version minor --force
git push origin main --follow-tags
```

---

## 📊 Version Bump Guide

Use semantic versioning:

```bash
# Patch (0.9.0 → 0.9.1) - Bug fixes
npm version patch

# Minor (0.9.1 → 0.10.0) - New features (backward compatible)
npm version minor

# Major (0.10.0 → 1.0.0) - Breaking changes
npm version major

# Pre-release versions
npm version prerelease --preid=alpha  # 0.10.0-alpha.0
npm version prerelease --preid=beta   # 0.10.0-beta.0
npm version prerelease --preid=rc     # 0.10.0-rc.0
```

---

## 🎯 Quick Reference

| Action | Command |
|--------|---------|
| **Normal commit** | `git commit && git push` |
| **Patch release** | `npm version patch && git push --follow-tags` |
| **Minor release** | `npm version minor && git push --follow-tags` |
| **Major release** | `npm version major && git push --follow-tags` |
| **Check releases** | `gh release list` |
| **Check npm** | `npm view ghextractor versions` |

---

## 📚 Related Files

- `.github/workflows/release.yml` - Release automation workflow
- `CHANGELOG.md` - Version history (source of truth for releases)
- `package.json` - Package version
