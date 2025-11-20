# Testing & Quality Assurance

## 📊 Overview

This project maintains **80%+ code coverage** across all metrics and implements comprehensive testing at multiple levels.

## 🧪 Test Pyramid

```
        /\
       /E2E\          ← End-to-End Tests (CLI flows)
      /------\
     /  INT   \       ← Integration Tests (API mocking)
    /----------\
   /   UNIT     \     ← Unit Tests (80%+ coverage)
  /--------------\
```

## 📈 Coverage Metrics

| Metric      | Threshold | Current |
|-------------|-----------|---------|
| Lines       | 80%       | TBD     |
| Functions   | 80%       | TBD     |
| Branches    | 80%       | TBD     |
| Statements  | 80%       | TBD     |

Run `npm run test:coverage` to generate the latest coverage report.

## 🚀 Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # E2E tests only

# Run performance benchmarks
npm run test:bench

# Watch mode for development
npm run test:watch

# Interactive UI
npm run test:ui
```

## 📁 Test Structure

```
tests/
├── setup.ts                    # Global test configuration & MSW setup
├── unit/                       # Unit tests (isolated functions)
│   └── utils/
│       ├── sanitize.test.ts
│       └── retry.test.ts
├── integration/                # Integration tests (with mocks)
│   └── exporters/
│       └── prs.test.ts
├── e2e/                        # End-to-end tests (full CLI)
│   └── cli-flow.test.ts
└── benchmarks/                 # Performance benchmarks
    └── performance.bench.ts
```

## 🔧 Testing Tools

### Vitest
- **Fast**: Powered by Vite for instant test execution
- **Modern**: Native ESM, TypeScript, and JSX support
- **Compatible**: Jest-compatible API

### MSW (Mock Service Worker)
- **API Mocking**: Intercept GitHub API calls
- **Realistic**: Network-level mocking
- **Isolated**: Tests don't hit real APIs

### Coverage: V8
- **Accurate**: Native V8 coverage
- **Fast**: No instrumentation overhead
- **Detailed**: Line, branch, function, and statement coverage

## 📝 Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '@/utils/sanitize';

describe('sanitizeFilename', () => {
  it('should remove invalid characters', () => {
    const result = sanitizeFilename('file<>:"/\\|?*name.txt');
    expect(result).toBe('file-name.txt');
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@tests/setup';

describe('PR Exporter', () => {
  it('should fetch pull requests', async () => {
    server.use(
      http.get('https://api.github.com/repos/:owner/:repo/pulls', () => {
        return HttpResponse.json([{ number: 1, title: 'Test PR' }]);
      })
    );
    
    // Test your exporter logic here
  });
});
```

### E2E Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('CLI E2E', () => {
  it('should display help', async () => {
    const result = await runCLI(['--help']);
    expect(result.stdout).toContain('Usage:');
  });
});
```

## 🔒 Security Testing

### npm audit
```bash
npm run security:audit
```

Checks for known vulnerabilities in dependencies.

### Snyk
Automated security scanning via GitHub Actions:
- Dependency vulnerabilities
- Code vulnerabilities (SAST)
- License compliance

### CodeQL
GitHub's semantic code analysis:
- Security vulnerabilities
- Code quality issues
- Best practice violations

## ⚡ Performance Benchmarks

```bash
npm run test:bench
```

Benchmarks critical operations:
- String sanitization
- Retry logic
- File operations
- Array/Object manipulation

## 🤖 CI/CD Integration

### GitHub Actions Workflows

#### CI Workflow (`.github/workflows/ci.yml`)
Runs on every push and PR:
- ✅ Linting & type checking
- ✅ Unit tests (Node 18, 20, 22)
- ✅ Integration tests
- ✅ E2E tests
- ✅ Coverage reporting
- ✅ Build verification
- ✅ Performance benchmarks

#### Security Workflow (`.github/workflows/security.yml`)
Runs daily and on every push:
- 🔒 npm audit
- 🔒 Snyk scanning
- 🔒 CodeQL analysis
- 🔒 Dependency review
- 🔒 License compliance
- 🔒 OSSF Scorecard

#### Release Workflow (`.github/workflows/release.yml`)
Runs on version tags:
- 📦 Build & test
- 📦 Create GitHub release
- 📦 Publish to npm
- 📦 Generate changelog

## 📊 Coverage Reports

After running `npm run test:coverage`:

### Terminal Output
```
 ✓ tests/unit/utils/sanitize.test.ts (15 tests)
 ✓ tests/unit/utils/retry.test.ts (12 tests)
 
Coverage:
  Lines       : 85.23% (234/274)
  Functions   : 82.45% (47/57)
  Branches    : 81.67% (98/120)
  Statements  : 85.23% (234/274)
```

### HTML Report
Open `coverage/index.html` in your browser for detailed coverage visualization.

### LCOV Report
`coverage/lcov.info` - Used by CI tools and Codecov.

## 🐛 Debugging Tests

### Run specific test file
```bash
npx vitest run tests/unit/utils/sanitize.test.ts
```

### Run tests matching pattern
```bash
npx vitest run -t "sanitizeFilename"
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

### Verbose output
```bash
npx vitest --reporter=verbose
```

## 🎯 Best Practices

### 1. Test Isolation
Each test should be independent and not rely on other tests.

### 2. Descriptive Names
```typescript
// ✅ Good
it('should sanitize filename by removing invalid characters')

// ❌ Bad
it('test sanitize')
```

### 3. Arrange-Act-Assert
```typescript
it('should truncate long text', () => {
  // Arrange
  const input = 'Very long text...';
  
  // Act
  const result = truncate(input, 10);
  
  // Assert
  expect(result).toBe('Very lo...');
});
```

### 4. Test Edge Cases
- Empty inputs
- Null/undefined
- Boundary values
- Error conditions

### 5. Mock External Dependencies
Use MSW for API calls, never hit real endpoints in tests.

### 6. Keep Tests Fast
- Unit tests: < 100ms each
- Integration tests: < 1s each
- E2E tests: < 10s each

## 📚 Resources

- [Vitest Documentation](https://vitest.dev)
- [MSW Documentation](https://mswjs.io)
- [Testing Best Practices](https://testingjavascript.com)
- [Test Coverage Guide](https://vitest.dev/guide/coverage)

## 🔄 Continuous Improvement

### Coverage Goals
- Maintain 80%+ coverage across all metrics
- Aim for 90%+ on critical modules
- 100% coverage on utility functions

### Test Quality
- Regular review of test effectiveness
- Remove flaky tests
- Update tests with code changes
- Add tests for bug fixes

### Performance
- Monitor test execution time
- Optimize slow tests
- Use parallel execution
- Cache dependencies in CI

## 📞 Support

For questions or issues with tests:
1. Check the [tests/README.md](tests/README.md)
2. Review existing test examples
3. Open an issue on GitHub
4. Consult the team

---

**Last Updated**: 2025-01-20  
**Maintained By**: Development Team
