import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listUserRepositories,
  listOrgRepositories,
  getRepository,
  filterRepositories,
} from '@/scanner/repo-scanner';
import * as execGh from '@/utils/exec-gh';
import type { GitHubRepository } from '@/types/github';

vi.mock('@/utils/exec-gh');

describe('repo-scanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUserRepositories', () => {
    it('should list repositories for authenticated user', async () => {
      const mockRepos: GitHubRepository[] = [
        {
          name: 'repo1',
          owner: { login: 'testuser' },
          description: 'Test repository 1',
          html_url: 'https://github.com/testuser/repo1',
          private: false,
        },
        {
          name: 'repo2',
          owner: { login: 'testuser' },
          description: 'Test repository 2',
          html_url: 'https://github.com/testuser/repo2',
          private: true,
        },
      ];

      vi.mocked(execGh.execGhJson).mockResolvedValue(mockRepos);

      const result = await listUserRepositories();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'repo1',
        owner: 'testuser',
        description: 'Test repository 1',
        url: 'https://github.com/testuser/repo1',
        isPrivate: false,
      });
      expect(result[1].isPrivate).toBe(true);
    });

    it('should list repositories for specific user', async () => {
      const mockRepos: GitHubRepository[] = [
        {
          name: 'repo1',
          owner: { login: 'otheruser' },
          description: 'Other user repository',
          html_url: 'https://github.com/otheruser/repo1',
          private: false,
        },
      ];

      vi.mocked(execGh.execGhJson).mockResolvedValue(mockRepos);

      const result = await listUserRepositories('otheruser');

      expect(result).toHaveLength(1);
      expect(result[0].owner).toBe('otheruser');
      expect(execGh.execGhJson).toHaveBeenCalledWith(
        'repo list otheruser --json name,owner,description,url,isPrivate --limit 1000'
      );
    });

    it('should handle repositories without description', async () => {
      const mockRepos: GitHubRepository[] = [
        {
          name: 'repo1',
          owner: { login: 'testuser' },
          description: null,
          html_url: 'https://github.com/testuser/repo1',
          private: false,
        },
      ];

      vi.mocked(execGh.execGhJson).mockResolvedValue(mockRepos);

      const result = await listUserRepositories();

      expect(result[0].description).toBeUndefined();
    });

    it('should throw on API error', async () => {
      vi.mocked(execGh.execGhJson).mockRejectedValue(new Error('API Error'));

      await expect(listUserRepositories()).rejects.toThrow('Failed to list repositories');
    });
  });

  describe('listOrgRepositories', () => {
    it('should list repositories for organization', async () => {
      const mockRepos: GitHubRepository[] = [
        {
          name: 'org-repo1',
          owner: { login: 'testorg' },
          description: 'Organization repository 1',
          html_url: 'https://github.com/testorg/org-repo1',
          private: false,
        },
        {
          name: 'org-repo2',
          owner: { login: 'testorg' },
          description: 'Organization repository 2',
          html_url: 'https://github.com/testorg/org-repo2',
          private: true,
        },
      ];

      vi.mocked(execGh.execGhJson).mockResolvedValue(mockRepos);

      const result = await listOrgRepositories('testorg');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('org-repo1');
      expect(result[1].name).toBe('org-repo2');
      expect(execGh.execGhJson).toHaveBeenCalledWith(
        'repo list testorg --json name,owner,description,url,isPrivate --limit 1000'
      );
    });

    it('should throw on API error', async () => {
      vi.mocked(execGh.execGhJson).mockRejectedValue(new Error('API Error'));

      await expect(listOrgRepositories('testorg')).rejects.toThrow(
        'Failed to list organization repositories'
      );
    });
  });

  describe('getRepository', () => {
    it('should get repository information', async () => {
      const mockRepo: GitHubRepository = {
        name: 'test-repo',
        owner: { login: 'testowner' },
        description: 'Test repository',
        html_url: 'https://github.com/testowner/test-repo',
        private: false,
      };

      vi.mocked(execGh.execGhJson).mockResolvedValue(mockRepo);

      const result = await getRepository('testowner', 'test-repo');

      expect(result).toEqual({
        name: 'test-repo',
        owner: 'testowner',
        description: 'Test repository',
        url: 'https://github.com/testowner/test-repo',
        isPrivate: false,
      });
      expect(execGh.execGhJson).toHaveBeenCalledWith(
        'repo view testowner/test-repo --json name,owner,description,url,isPrivate'
      );
    });

    it('should throw on API error', async () => {
      vi.mocked(execGh.execGhJson).mockRejectedValue(new Error('Not found'));

      await expect(getRepository('testowner', 'nonexistent')).rejects.toThrow(
        'Failed to get repository information'
      );
    });
  });

  describe('filterRepositories', () => {
    const repos = [
      {
        name: 'react-app',
        owner: 'testuser',
        description: 'A React application',
        url: 'https://github.com/testuser/react-app',
        isPrivate: false,
      },
      {
        name: 'vue-app',
        owner: 'testuser',
        description: 'A Vue.js application',
        url: 'https://github.com/testuser/vue-app',
        isPrivate: false,
      },
      {
        name: 'angular-app',
        owner: 'testuser',
        description: 'An Angular application for testing',
        url: 'https://github.com/testuser/angular-app',
        isPrivate: true,
      },
    ];

    it('should filter repositories by name', () => {
      const result = filterRepositories(repos, 'react');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('react-app');
    });

    it('should filter repositories by description', () => {
      const result = filterRepositories(repos, 'Vue.js');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('vue-app');
    });

    it('should be case-insensitive', () => {
      const result = filterRepositories(repos, 'ANGULAR');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('angular-app');
    });

    it('should return multiple matches', () => {
      const result = filterRepositories(repos, 'app');

      expect(result).toHaveLength(3);
    });

    it('should return empty array for no matches', () => {
      const result = filterRepositories(repos, 'nonexistent');

      expect(result).toHaveLength(0);
    });

    it('should filter by partial matches', () => {
      const result = filterRepositories(repos, 'test');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('angular-app');
    });
  });
});
