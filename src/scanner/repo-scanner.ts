import { execGhJson } from '../utils/exec-gh.js';
import type { Repository } from '../types/index.js';
import type { GitHubRepository } from '../types/github.js';

/**
 * List all repositories for the authenticated user
 * Includes repositories owned by the user and repositories where the user is a collaborator
 */
export async function listUserRepositories(username?: string): Promise<Repository[]> {
  try {
    let repos: GitHubRepository[];

    if (username) {
      // List repositories owned by a specific user
      const query = `repo list ${username} --json name,owner,description,url,isPrivate --limit 1000`;
      repos = await execGhJson<GitHubRepository[]>(query);
    } else {
      // List all repositories accessible to the authenticated user (owned + collaborator)
      // Using the GitHub API endpoint that includes repos where user is a collaborator
      repos = await execGhJson<GitHubRepository[]>('api user/repos --paginate');
    }

    return repos.map((repo) => ({
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description || undefined,
      url: repo.html_url,
      isPrivate: repo.private,
    }));
  } catch (error) {
    throw new Error(`Failed to list repositories: ${error}`);
  }
}

/**
 * List repositories for an organization
 */
export async function listOrgRepositories(org: string): Promise<Repository[]> {
  try {
    const repos = await execGhJson<GitHubRepository[]>(
      `repo list ${org} --json name,owner,description,url,isPrivate --limit 1000`
    );

    return repos.map((repo) => ({
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description || undefined,
      url: repo.html_url,
      isPrivate: repo.private,
    }));
  } catch (error) {
    throw new Error(`Failed to list organization repositories: ${error}`);
  }
}

/**
 * Get repository information
 */
export async function getRepository(owner: string, name: string): Promise<Repository> {
  try {
    const repo = await execGhJson<GitHubRepository>(
      `repo view ${owner}/${name} --json name,owner,description,url,isPrivate`
    );

    return {
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description || undefined,
      url: repo.html_url,
      isPrivate: repo.private,
    };
  } catch (error) {
    throw new Error(`Failed to get repository information: ${error}`);
  }
}

/**
 * Search repositories by name
 */
export function filterRepositories(repos: Repository[], query: string): Repository[] {
  const lowerQuery = query.toLowerCase();
  return repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(lowerQuery) ||
      repo.description?.toLowerCase().includes(lowerQuery)
  );
}
