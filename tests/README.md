# Testing Documentation

This directory contains all tests for the GitHub Extractor CLI project.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup with MSW mocks
├── unit/                       # Unit tests for individual modules
│   └── utils/                  # Utility function tests
├── integration/                # Integration tests with API mocking
│   └── exporters/              # Exporter integration tests
├── e2e/                        # End-to-end CLI flow tests
└── benchmarks/                 # Performance benchmarks
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests Only
```bash
npm run test:e2e
```

### With Coverage Report
```bash
npm run test:coverage
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Performance Benchmarks
```bash
npm run test:bench
```

### Interactive UI
```bash
npm run test:ui
```

## Coverage Thresholds

The project maintains **80%+ coverage** across all metrics:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

Coverage reports are generated in the `./coverage` directory.

## Test Categories

### Unit Tests (`tests/unit/`)

Test individual functions and modules in isolation:

- **Utilities**: Sanitization, retry logic, logging
- **Core**: Rate limiting, caching, authentication
- **Exporters**: Individual exporter logic

**Example:**
```typescript
describe('sanitizeFilename', () => {
  it('should remove invalid characters', () => {
    const result = sanitizeFilename('file<>:"/\\|?*name.txt');
    expect(result).toBe('file-name.txt');
  });
});
```

### Integration Tests (`tests/integration/`)

Test modules working together with mocked external dependencies:

- **API Integration**: GitHub API calls with MSW mocking
- **Exporter Flows**: Complete export workflows
- **Rate Limiting**: Rate limiter behavior with API calls

**Example:**
```typescript
it('should fetch and export pull requests', async () => {
  server.use(
    http.get('https://api.github.com/repos/:owner/:repo/pulls', () => {
      return HttpResponse.json([/* mock data */]);
    })
  );
  // Test exporter logic
});
```

### E2E Tests (`tests/e2e/`)

Test complete user workflows from CLI invocation to output:

- **CLI Commands**: Help, version, check
- **Export Flows**: Full export workflows
- **Configuration**: Config file loading and validation
- **Error Handling**: Network errors, rate limits

**Example:**
```typescript
it('should export PRs with default settings', async () => {
  const result = await runCLI(['export', 'prs']);
  expect(result.exitCode).toBe(0);
});
```

### Performance Benchmarks (`tests/benchmarks/`)

Measure and track performance of critical operations:

- **Sanitization**: String processing performance
- **Retry Logic**: Backoff algorithm efficiency
- **File Operations**: I/O performance
- **Array/Object Operations**: Data manipulation speed

**Example:**
```typescript
bench('sanitizeFilename - short string', () => {
  sanitizeFilename('test-file-name.txt');
});
```

## Mocking Strategy

### MSW (Mock Service Worker)

We use MSW to mock GitHub API responses:

```typescript
// Setup in tests/setup.ts
export const githubHandlers = [
  http.get('https://api.github.com/user', () => {
    return HttpResponse.json({ login: 'testuser' });
  }),
];

export const server = setupServer(...githubHandlers);
```

### Custom Mocks

For specific tests, override handlers:

```typescript
server.use(
  http.get('https://api.github.com/repos/:owner/:repo/pulls', () => {
    return HttpResponse.json([], { status: 404 });
  })
);
```

## Writing Tests

### Best Practices

1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow AAA pattern
3. **Isolation**: Each test should be independent
4. **Mock External Dependencies**: Use MSW for API calls
5. **Test Edge Cases**: Include error scenarios
6. **Performance**: Keep tests fast (<100ms per test)

### Example Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected');
  });

  it('should handle edge case', () => {
    // Test edge cases
  });

  it('should throw error for invalid input', () => {
    expect(() => functionUnderTest(null)).toThrow();
  });
});
```

## CI/CD Integration

Tests run automatically on:

- **Push** to `main` or `develop` branches
- **Pull Requests** to `main` or `develop`
- **Scheduled** daily security scans

### GitHub Actions Workflows

- **CI** (`.github/workflows/ci.yml`): Runs all tests across multiple Node versions and OS
- **Security** (`.github/workflows/security.yml`): Security scanning with Snyk and npm audit

## Debugging Tests

### Run Specific Test File
```bash
npx vitest run tests/unit/utils/sanitize.test.ts
```

### Run Tests Matching Pattern
```bash
npx vitest run -t "sanitizeFilename"
```

### Debug Mode
```bash
npx vitest --inspect-brk
```

### Verbose Output
```bash
npx vitest --reporter=verbose
```

## Coverage Reports

After running `npm run test:coverage`, view reports:

- **Terminal**: Summary in console
- **HTML**: Open `coverage/index.html` in browser
- **LCOV**: `coverage/lcov.info` for CI tools

## Troubleshooting

### Tests Failing Locally

1. **Clear cache**: `npx vitest --clearCache`
2. **Reinstall dependencies**: `rm -rf node_modules && npm install`
3. **Check Node version**: Ensure Node 18+ is installed

### MSW Not Working

1. Verify MSW is installed: `npm list msw`
2. Check setup file is loaded: `tests/setup.ts`
3. Ensure handlers are registered before tests run

### Coverage Below Threshold

1. Identify uncovered code: Check `coverage/index.html`
2. Add tests for uncovered lines
3. Verify test files match include patterns

## Resources

- [Vitest Documentation](https://vitest.dev)
- [MSW Documentation](https://mswjs.io)
- [Testing Best Practices](https://testingjavascript.com)
- [Coverage Thresholds](https://vitest.dev/config/#coverage-thresholds)
