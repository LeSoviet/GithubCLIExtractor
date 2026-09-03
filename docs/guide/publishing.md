# Publishing a New Version

This guide explains how to publish a new version of `ghextractor` to npm, GitHub Releases and the documentation site.

The project uses **3 branches → 3 PRs → squash merge to `main` → single release commit** to avoid fragmentary publishes.

## Workflow Overview

```
main (0.10.0)
 ├─ fix/cli-launcher-guard      → PR #13
 ├─ fix/rate-limiter-contract   → PR #14
 └─ feat/include-comments       → PR #15
      \  squash merged sequentially
       \
        chore(release): prepare v0.11.0  →  push to main  →  Auto Publish Release workflow
                                            ├─ sync CHANGELOG.md → docs/changelog.md
                                            ├─ verify build + tests → create GitHub Release v0.11.0
                                            ├─ publish to npm
                                            └─ Deploy Documentation (VitePress → GitHub Pages)
```

**Rule:** Do **not** bump `package.json` version in the feature/fix PRs. Bump only once in the final `chore(release)` commit.

## Prerequisites

This project uses the **classic NPM_TOKEN** flow (proven reliable in `v0.11.0`). No OIDC trusted publisher is required.

### 1. npm Access Token (Granular, no credentials exposed)

- **npmjs.com → Access Tokens → Generate New Token → Granular Access Token**
  - Package: `ghextractor`
  - Permissions: `Read and write`
  - **Bypass 2FA: Enabled** — required for CI
- **GitHub → LeSoviet/GithubCLIExtractor → Settings → Secrets and variables → Actions → New repository secret**
  - Name: `NPM_TOKEN`
  - Value: paste the granular token (never commit it, never log it — the workflow references it only via `secrets.NPM_TOKEN`)

The workflow never prints the token; it is injected as <code v-pre>NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}</code> at publish time.

### 2. npm Package 2FA Policy

**npmjs.com → ghextractor → Settings → Publishing access** must be:

> **Require two-factor authentication or a granular access token with bypass 2FA enabled** (second option)

If set to **Require two-factor authentication and disallow bypass 2FA tokens (recommended)** (first option), even a correct bypass token fails with `403`/`EOTP`.

## Step-by-Step Release

### 1. Prepare the Release Commit on `main` (after all PRs merged)

```bash
git checkout main && git pull

# bump version (minor for feat, patch for fix)
npm version minor --no-git-tag-version  # 0.10.0 → 0.11.0
# or manually edit package.json: "version": "0.11.0"

# edit CHANGELOG.md — add new section at top per Keep a Changelog:
# ## [0.11.0] - 2026-09-03
# ### Added / Fixed / Changed ...

# optional: update docs that describe the new feature
# docs/api/commands.md, docs/guide/configuration.md, etc.

git add package.json CHANGELOG.md docs/
git commit -m "chore(release): prepare v0.11.0

- fix(cli): guard missing build artifacts (#10)
- fix(core): respect useRateLimit contract (#12)
- feat(export): include-comments support (#11)"
git push origin main
```

`push` with changed `package.json` or `CHANGELOG.md` triggers **Auto Publish Release** (`publish.yml:4`):

1. **Sync Changelog to Docs** — copies `CHANGELOG.md` → `docs/changelog.md` and pushes `[skip ci]`
2. **Verify Build & Create Release** — `npm ci`, `npm run build:all`, `npm run test:coverage`, extracts `## [0.11.0]` section via `awk "/## \[$VERSION\]/,/## \[/"`, creates GitHub Release `v0.11.0`
3. **Publish to npm Registry** — see next section
4. **Deploy Documentation** (`docs.yml`) — builds VitePress and deploys to `https://lesoviet.github.io/GithubCLIExtractor/`

### 2. Publishing to npm

`publish.yml:publish-npm` (and `release.yml:publish-npm` for tag pushes) as used for the successful `v0.11.0` publish:

```yaml v-pre
- uses: actions/setup-node@v4
  with:
    node-version: '20.x'
    registry-url: 'https://registry.npmjs.org'

- run: npm ci --legacy-peer-deps
- run: npm run build:all
- run: npm publish --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

No `id-token` OIDC and no `npm@11.5.1` update needed — `npm 10.8.2` on the runner works with the classic token. No credentials are ever committed or logged; the token is only referenced as `secrets.NPM_TOKEN` and is masked as `***` in logs.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `ENEEDAUTH need auth ... npm adduser` | `setup-node` without `registry-url` | Add `registry-url: https://registry.npmjs.org` |
| `403 Forbidden ... Two-factor authentication is required but an automation token was specified` / `EOTP` | 2FA policy = `disallow bypass` + token without bypass | Change to `Require 2FA or granular bypass` and use Granular Token with **Bypass 2FA: Enabled** |
| `404` on publish | Wrong package name or token without permission for `ghextractor` | Verify `NPM_TOKEN` is Granular for `ghextractor` with `publish` permission |

## Verification

```bash
# GitHub Release
gh release view v0.11.0 --json tagName,publishedAt,url
gh release list --limit 3

# npm
npm view ghextractor version
npm view ghextractor time --json | tail -20
npm view ghextractor dist --json | grep -E "version|registry"

# docs
# https://lesoviet.github.io/GithubCLIExtractor/  should show new changelog
```

## Retrying a Failed Publish

If `Publish to npm Registry` fails but `Verify Build & Create Release` succeeded (tag `v0.11.0` already exists), the next `Auto Publish Release` run will skip publish (`Tag v0.11.0 already exists`). To retry:

```bash
gh release delete v0.11.0 --yes --cleanup-tag
gh workflow run "Auto Publish Release" --ref main
# monitor:
gh run list --limit 1
gh run view <run_id> --json status,conclusion
gh run view <run_id> --log-failed | grep -A5 "npm error"
```

For the classic token, you can also use `gh run rerun <run_id> --failed` to rerun only the failed publish job with the current `NPM_TOKEN`.
