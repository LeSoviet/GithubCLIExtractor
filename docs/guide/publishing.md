# Publishing a New Version

This guide explains how to publish a new version of `ghextractor` to npm, GitHub Releases and the documentation site without repeating the issues encountered in `v0.11.0`.

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
                                            ├─ publish to npm (see below)
                                            └─ Deploy Documentation (VitePress → GitHub Pages)
```

**Rule:** Do **not** bump `package.json` version in the feature/fix PRs. Bump only once in the final `chore(release)` commit.

## Prerequisites

### 1. npm Trusted Publisher (primary, OIDC)

Configured once at **npmjs.com → ghextractor → Settings → Trusted Publishers**:

- **Repository:** `LeSoviet/GithubCLIExtractor`
- **Workflow filename:** `publish.yml`
- **Permissions:** `npm publish` (allows `npm publish` via OIDC, no classic token needed)

Verify:

```bash
npm trust list ghextractor --json
# should show repository, workflow file publish.yml, allow-publish
```

No `NPM_TOKEN` secret is needed when this works.

### 2. Classic Token Fallback (when OIDC returns 404 despite correct config)

If the trusted publisher returns:

```
404 Not Found - PUT https://registry.npmjs.org/ghextractor - 'ghextractor@x.y.z' is not in this registry
# or later
404 ... or you do not have permission to access it
```

This is a known npm UI bug where a correctly saved trust stays in a half-saved state, or a 2FA policy interaction. The reliable fallback is a **Granular Access Token with Bypass 2FA**:

- **npmjs.com → Access Tokens → Generate New Token → Granular Access Token**
  - Package: `ghextractor`
  - Permissions: `Read and write` (publish)
  - **Bypass 2FA: Enabled** (checked)
- **GitHub → LeSoviet/GithubCLIExtractor → Settings → Secrets → Actions → New secret**
  - Name: `NPM_TOKEN`
  - Value: the granular token

### 3. npm Package 2FA Policy

**npmjs.com → ghextractor → Settings → Publishing access:**

- For **OIDC**: either option works, but OIDC does not use a token's 2FA.
- For **classic token fallback**: **must** be

> **Require two-factor authentication or a granular access token with bypass 2FA enabled** (second option)

If it is set to **Require two-factor authentication and disallow bypass 2FA tokens (recommended)** (first option), even a correct granular token fails with:

```
403 Forbidden - Two-factor authentication is required ... but an automation token was specified
# or
EOTP - This operation requires a one-time password
```

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

### 2. Publishing to npm — Primary vs Fallback

#### Primary: OIDC Trusted Publisher (no token)

`publish.yml:publish-npm` as configured after `v0.11.0`:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20.x'
    registry-url: 'https://registry.npmjs.org'

- name: Update npm for OIDC trusted publishing
  run: |
    npm install -g npm@11.5.1
    echo "npm version after update: $(npm --version)"
    # OIDC requires npm >=11.5.1. npm@latest on Node 20 fails with EBADENGINE
    # (requires Node >=22), so we pin to 11.5.1

- run: npm ci --legacy-peer-deps
- run: npm run build:all
- run: npm publish --provenance --access public
  # No NODE_AUTH_TOKEN — OIDC JWT minted via permissions: id-token: write
```

**Why `11.5.1` and not `latest`?** `npm@latest` (≥11.6) requires Node ≥22, but the runner uses Node 20.x → `EBADENGINE`. `11.5.1` is the last version compatible with Node 20 that still supports OIDC trusted publishing. Provenance/sigstore alone works on npm 10, but *authentication* via OIDC needs ≥11.5.1, otherwise you get `404 ... not in this registry` (unauthenticated PUT) even though provenance is signed.

Add a temporary debug step to inspect the exact JWT claim when OIDC 404 persists:

```yaml
- name: Debug OIDC claim (temporary)
  run: |
    curl -sS -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
      "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=npm:registry.npmjs.org" \
      | node -e "const d=JSON.parse(require('fs').readFileSync(0)); const [,p]=d.value.split('.'); console.log(JSON.stringify(JSON.parse(Buffer.from(p,'base64').toString()), null, 2))"
```

Compare `repository`, `workflow_ref`, `job_workflow_ref`, `ref` against `npm trust list` output character-by-character.

#### Fallback: Classic Token (when OIDC 404 persists despite correct config)

If resaving the trusted publisher + waiting 2-3 min still yields `404` or `403` with correct `11.5.1`, switch `publish.yml` to classic:

```yaml
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

No `id-token` OIDC, no `npm@11.5.1` update needed (npm 10.8.2 works with classic token), no `--provenance` (optional). This is the configuration that successfully published `v0.11.0` after the OIDC bug.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `ENEEDAUTH need auth ... npm adduser` | `setup-node` without `registry-url` or npm <11.5.1 for OIDC | Add `registry-url: https://registry.npmjs.org` and `npm@11.5.1` step |
| `EBADENGINE ... required: { node: '^22...' }` | `npm@latest` on Node 20 runner | Pin to `npm@11.5.1` |
| `404 - 'ghextractor@x.y.z' is not in this registry` (unauthenticated) | OIDC token not minted (npm <11.5.1) or trust mismatch | Use `11.5.1`, verify `npm trust list`, resave trust and wait 2-3 min |
| `404 ... or you do not have permission to access it` (OIDC 404 with permission hint) | Trusted publisher claim mismatch (`repository`, `workflow_ref`, `ref`) | Check debug OIDC JSON vs `npm trust list`; ensure workflow file is exactly `publish.yml` and `ref` allows `refs/heads/main` |
| `403 Forbidden ... Two-factor authentication is required but an automation token was specified` / `EOTP` | 2FA policy = `disallow bypass` + automation/granular token without bypass | Change to `Require 2FA or granular bypass` and use Granular Token with **Bypass 2FA: Enabled** |

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

For the classic token fallback, no need to delete the tag if you use `gh run rerun <run_id> --failed` — it will rerun only the failed publish job with the new `NPM_TOKEN`.

## Recommendation

Try **OIDC primary first** (clean, no secret rotation). If you hit the `404`/`permission` mismatch and resaving + waiting doesn't help within 2-3 attempts, **switch to classic `NPM_TOKEN` fallback** as documented above — it is 100% reliable and was the method that finally published `v0.11.0`.
