import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

/**
 * Mock GitHub API handlers for integration tests
 */
export const githubHandlers = [
  // Mock GitHub API rate limit endpoint
  http.get('https://api.github.com/rate_limit', () => {
    return HttpResponse.json({
      resources: {
        core: {
          limit: 5000,
          remaining: 4999,
          reset: Date.now() / 1000 + 3600,
          used: 1,
        },
      },
    });
  }),

  // Mock user endpoint
  http.get('https://api.github.com/user', () => {
    return HttpResponse.json({
      login: 'testuser',
      id: 12345,
      name: 'Test User',
      email: 'test@example.com',
    });
  }),

  // Mock repositories list
  http.get('https://api.github.com/user/repos', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        owner: { login: 'testuser' },
        description: 'Test repository',
        private: false,
      },
    ]);
  }),

  // Mock pull requests
  http.get('https://api.github.com/repos/:owner/:repo/pulls', () => {
    return HttpResponse.json([
      {
        number: 1,
        title: 'Test PR',
        body: 'Test PR body',
        state: 'open',
        user: { login: 'testuser' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  // Mock commits
  http.get('https://api.github.com/repos/:owner/:repo/commits', () => {
    return HttpResponse.json([
      {
        sha: 'abc123',
        commit: {
          message: 'Test commit',
          author: {
            name: 'Test User',
            email: 'test@example.com',
            date: '2024-01-01T00:00:00Z',
          },
        },
      },
    ]);
  }),

  // Mock issues
  http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
    return HttpResponse.json([
      {
        number: 1,
        title: 'Test Issue',
        body: 'Test issue body',
        state: 'open',
        user: { login: 'testuser' },
        created_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  // Mock releases
  http.get('https://api.github.com/repos/:owner/:repo/releases', () => {
    return HttpResponse.json([
      {
        id: 1,
        tag_name: 'v1.0.0',
        name: 'Release v1.0.0',
        body: 'Release notes',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  // Mock branches
  http.get('https://api.github.com/repos/:owner/:repo/branches', () => {
    return HttpResponse.json([
      {
        name: 'main',
        commit: {
          sha: 'abc123',
          url: 'https://api.github.com/repos/testuser/test-repo/commits/abc123',
        },
      },
    ]);
  }),
];

// Setup MSW server
export const server = setupServer(...githubHandlers);

// Start server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

// Reset handlers after each test for test isolation
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};
