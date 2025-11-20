import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],

    // Environment
    environment: 'node',
    globals: true,

    // Suppress unhandled rejection warnings from expected test failures
    // These occur when testing retry logic that intentionally rejects promises
    onConsoleLog(log: string) {
      if (log.includes('PromiseRejectionHandledWarning')) {
        return false;
      }
      return true;
    },

    // Execution
    pool: 'forks',
    fileParallelism: true,
    testTimeout: 10000,
    hookTimeout: 10000,

    // Reporters
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-results/results.json',
    },

    // Coverage configuration with 80%+ thresholds
    coverage: {
      provider: 'v8',
      enabled: false, // Enable via --coverage flag
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        '**/templates/**',
        'src/index.ts', // Entry point, tested via E2E
      ],
      // 80%+ coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      // Specific thresholds for critical modules
      perFile: true,
      all: true,
    },

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Mocking behavior
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // Snapshots
    update: false,

    // Sequencing
    sequence: {
      shuffle: false,
      concurrent: false,
      seed: Date.now(),
      hooks: 'stack',
    },

    // Isolation
    isolate: true,
    poolOptions: {
      forks: {
        singleFork: false,
        minForks: 1,
        maxForks: 4,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
