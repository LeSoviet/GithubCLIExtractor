import { execGhJson } from '../utils/exec-gh.js';

/**
 * Fetch the list of contributors for a repository (unique author logins).
 */
export async function listContributors(owner: string, name: string): Promise<string[]> {
  try {
    const contributors = await execGhJson<any[]>(
      `api repos/${owner}/${name}/contributors --paginate`,
      { timeout: 30000, useRateLimit: false, useRetry: false }
    );
    const logins = contributors.map((c: any) => c.login).filter(Boolean);
    return Array.from(new Set(logins));
  } catch {
    return [];
  }
}
