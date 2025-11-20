# 🚀 Quick Start: Testing & CI/CD

## ✅ Installation Complete!

All testing dependencies have been installed successfully.

## 🏃 Run Your First Tests

### 1. Run All Tests
```bash
npm test
```

### 2. Generate Coverage Report
```bash
npm run test:coverage
```

This will:
- Run all unit, integration, and E2E tests
- Generate coverage reports in `./coverage`
- Validate 80%+ coverage thresholds
- Create HTML report at `coverage/index.html`

### 3. View Coverage Report
```bash
# Open in browser (Windows)
start coverage/index.html

# Or manually open: coverage/index.html
```

## 📊 Expected Output

```
✓ tests/unit/utils/sanitize.test.ts (15 tests)
✓ tests/unit/utils/retry.test.ts (12 tests)
✓ tests/integration/exporters/prs.test.ts (7 tests)
✓ tests/e2e/cli-flow.test.ts (20 tests)

Test Files  4 passed (4)
     Tests  54 passed (54)
  Start at  17:30:00
  Duration  2.34s

Coverage:
  Lines       : 85.23% (234/274)
  Functions   : 82.45% (47/57)
  Branches    : 81.67% (98/120)
  Statements  : 85.23% (234/274)

✅ All coverage thresholds met!
```

## 🔧 Development Workflow

### Watch Mode (Recommended for Development)
```bash
npm run test:watch
```

This will:
- Watch for file changes
- Re-run affected tests automatically
- Provide instant feedback

### Run Specific Tests
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Specific file
npx vitest run tests/unit/utils/sanitize.test.ts
```

### Interactive UI
```bash
npm run test:ui
```

Opens a browser-based UI for:
- Visual test exploration
- Coverage visualization
- Test filtering
- Real-time updates

## 🎯 Writing Your First Test

### 1. Create Test File
```typescript
// tests/unit/utils/example.test.ts
import { describe, it, expect } from 'vitest';

describe('Example Test Suite', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
```

### 2. Run Your Test
```bash
npx vitest run tests/unit/utils/example.test.ts
```

### 3. See It Pass! ✅

## 🔒 Security Scanning

### Run Security Audit
```bash
npm run security:audit
```

### Fix Vulnerabilities
```bash
npm run security:fix
```

### Current Status
```
5 moderate severity vulnerabilities

To address:
npm audit fix
```

## 🚀 CI/CD Setup

### 1. Set Up GitHub Secrets

Required for automated workflows:

```bash
# Using GitHub CLI
gh secret set SNYK_TOKEN
gh secret set NPM_TOKEN
gh secret set CODECOV_TOKEN
```

Or via GitHub UI:
1. Go to Settings → Secrets and variables → Actions
2. Add each secret

See `.github/SECRETS.md` for detailed instructions.

### 2. Push to GitHub

```bash
git add .
git commit -m "feat: add comprehensive testing infrastructure (Milestone 5)"
git push origin main
```

### 3. Watch CI Run

Go to: `https://github.com/YOUR_USERNAME/ghextractor/actions`

You'll see:
- ✅ CI workflow (tests, linting, coverage)
- ✅ Security workflow (Snyk, npm audit, CodeQL)

## 📈 Performance Benchmarks

### Run Benchmarks
```bash
npm run test:bench
```

### Expected Output
```
✓ tests/benchmarks/performance.bench.ts

Benchmark Results:
  sanitizeFilename - short string     1,234,567 ops/sec
  sanitizeFilename - medium string      456,789 ops/sec
  withRetry - immediate success         123,456 ops/sec
  Array.map - medium array              234,567 ops/sec
```

## 🐛 Troubleshooting

### Tests Not Running?

1. **Clear cache**
   ```bash
   npx vitest --clearCache
   ```

2. **Reinstall dependencies**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Check Node version**
   ```bash
   node --version  # Should be 18.x or higher
   ```

### Coverage Below 80%?

1. **Identify uncovered code**
   - Open `coverage/index.html`
   - Look for red/yellow highlighted lines

2. **Add tests for uncovered code**
   - Create test file in appropriate directory
   - Follow existing test patterns

3. **Re-run coverage**
   ```bash
   npm run test:coverage
   ```

### MSW Errors?

If you see "Cannot find module 'msw'":

1. **Verify installation**
   ```bash
   npm list msw
   ```

2. **Reinstall if needed**
   ```bash
   npm install -D msw@^2.0.0
   ```

## 📚 Next Steps

### Expand Test Coverage

1. **Add more unit tests**
   - Test remaining utility functions
   - Test core modules (cache, rate-limiter)
   - Test exporters

2. **Add integration tests**
   - Test complete export workflows
   - Test error scenarios
   - Test rate limiting behavior

3. **Add E2E tests**
   - Test more CLI commands
   - Test configuration options
   - Test error handling

### Improve Code Quality

1. **Run linting**
   ```bash
   npm run lint
   npm run lint:fix  # Auto-fix issues
   ```

2. **Format code**
   ```bash
   npm run format
   ```

3. **Type check**
   ```bash
   npm run type-check
   ```

### Set Up Pre-commit Hooks

```bash
# Install husky (if not already)
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm test"
```

## 🎉 Success Checklist

- [x] Dependencies installed
- [ ] Tests running successfully
- [ ] Coverage report generated
- [ ] Coverage above 80%
- [ ] Security audit passed
- [ ] GitHub secrets configured
- [ ] CI/CD workflows running
- [ ] Pre-commit hooks set up

## 📞 Need Help?

1. **Check documentation**
   - `tests/README.md` - Testing guide
   - `TESTING.md` - Comprehensive testing docs
   - `.github/SECRETS.md` - CI/CD setup

2. **Review examples**
   - Look at existing test files
   - Follow established patterns

3. **Debug tests**
   ```bash
   npx vitest --reporter=verbose
   npx vitest --inspect-brk  # Debug mode
   ```

## 🏆 You're Ready!

Your testing infrastructure is complete and ready to use. Start writing tests and watch your code quality improve!

```bash
# Start developing with confidence
npm run test:watch
```

---

**Happy Testing! 🧪**
