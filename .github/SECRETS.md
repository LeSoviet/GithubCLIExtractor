# GitHub Secrets Configuration

This document describes the GitHub Secrets required for CI/CD workflows.

## Required Secrets

### For Security Scanning

#### `SNYK_TOKEN`
- **Purpose**: Snyk security scanning
- **How to get**:
  1. Sign up at [snyk.io](https://snyk.io)
  2. Go to Account Settings → General
  3. Copy your API token
  4. Add to GitHub: Settings → Secrets and variables → Actions → New repository secret

#### `CODECOV_TOKEN` (Optional)
- **Purpose**: Upload coverage reports to Codecov
- **How to get**:
  1. Sign up at [codecov.io](https://codecov.io)
  2. Add your repository
  3. Copy the upload token
  4. Add to GitHub secrets

### For Publishing

#### `NPM_TOKEN`
- **Purpose**: Publish package to npm registry
- **How to get**:
  1. Login to [npmjs.com](https://www.npmjs.com)
  2. Go to Access Tokens
  3. Generate new token (Automation type)
  4. Add to GitHub secrets

**Note**: Required for automated releases via GitHub Actions.

## Optional Secrets

### `GITHUB_TOKEN`
- **Purpose**: GitHub API access (automatically provided by GitHub Actions)
- **No action needed**: This is automatically available in workflows

## Setting Up Secrets

### Via GitHub UI
1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter name and value
5. Click **Add secret**

### Via GitHub CLI
```bash
# Set Snyk token
gh secret set SNYK_TOKEN

# Set npm token
gh secret set NPM_TOKEN

# Set Codecov token (optional)
gh secret set CODECOV_TOKEN
```

## Security Best Practices

### ✅ Do
- Rotate tokens regularly (every 90 days)
- Use tokens with minimal required permissions
- Never commit secrets to the repository
- Use environment-specific secrets when needed
- Audit secret usage regularly

### ❌ Don't
- Share secrets in plain text
- Use personal tokens for automation
- Commit `.env` files with real secrets
- Use the same token across multiple projects
- Store secrets in code or documentation

## Verifying Secrets

After adding secrets, verify they work:

### Test Snyk Integration
```bash
# Trigger security workflow manually
gh workflow run security.yml
```

### Test npm Publishing
```bash
# Create a test tag (will trigger release workflow)
git tag v0.0.1-test
git push origin v0.0.1-test
```

## Troubleshooting

### Snyk Token Not Working
- Verify token is valid: `snyk auth`
- Check token permissions in Snyk dashboard
- Ensure token is not expired

### npm Token Not Working
- Verify token type is "Automation"
- Check token hasn't expired
- Ensure you have publish permissions for the package

### Codecov Upload Failing
- Verify repository is added to Codecov
- Check token is correct
- Ensure coverage files are generated

## Environment Variables

Some workflows use environment variables instead of secrets:

### `GHX_TEST_MODE`
- **Purpose**: Enable test mode for E2E tests
- **Value**: `1`
- **Set in**: Workflow files (not a secret)

### `NODE_ENV`
- **Purpose**: Specify Node environment
- **Value**: `test`, `production`, `development`
- **Set in**: Workflow files (not a secret)

## Secrets Rotation Schedule

| Secret | Rotation Period | Last Rotated | Next Rotation |
|--------|----------------|--------------|---------------|
| SNYK_TOKEN | 90 days | TBD | TBD |
| NPM_TOKEN | 90 days | TBD | TBD |
| CODECOV_TOKEN | 90 days | TBD | TBD |

## Support

For issues with secrets or CI/CD:
1. Check workflow logs in GitHub Actions
2. Verify secret names match workflow files
3. Ensure secrets are set at repository level
4. Contact repository maintainers

---

**Last Updated**: 2025-01-20  
**Maintained By**: DevOps Team
