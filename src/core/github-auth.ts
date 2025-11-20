import { execGh, execGhJson, isGhInstalled } from '../utils/exec-gh.js';
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

/**
 * Prompt user to login if not authenticated
 */
export async function ensureAuthenticated(): Promise<GitHubAuthStatus> {
  const authStatus = await getAuthStatus();

  if (!authStatus.isAuthenticated) {
    throw new Error('Not authenticated with GitHub CLI. Please run: gh auth login');
  }

  return authStatus;
}

/**
 * Get the authenticated user's information
 */
export async function getAuthenticatedUser(): Promise<{ login: string; email?: string }> {
  try {
    // Fetch user info without jq (more Windows-compatible)
    const user = await execGhJson<{ login: string; email?: string }>('api user');
    return {
      login: user.login,
      email: user.email,
    };
  } catch (error) {
    throw new Error(`Failed to get user information: ${error}`);
  }
}

/**
 * Initiate GitHub CLI login flow
 */
export async function initiateLogin(): Promise<void> {
  try {
    await execGh('auth login', { timeout: 120000 }); // 2 minutes timeout
  } catch (error) {
    throw new Error(`Failed to login: ${error}`);
  }
}
