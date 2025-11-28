import { execGh, isGhInstalled } from '../utils/exec-gh.js';
import type { GitHubAuthStatus } from '../types/github.js';

/**
 * Check if GitHub CLI is installed on the system
 */
export async function checkGhInstalled(): Promise<boolean> {
  return await isGhInstalled();
}

/**
 * Get the current authentication status
 */
export async function getAuthStatus(): Promise<GitHubAuthStatus> {
  try {
    const output = await execGh('auth status');

    // Parse the output to extract username
    const loggedInMatch = output.match(/Logged in to github\.com as ([^\s]+)/);
    const username = loggedInMatch ? loggedInMatch[1] : undefined;

    return {
      isAuthenticated: true,
      username,
    };
  } catch (error) {
    return {
      isAuthenticated: false,
    };
  }
}
