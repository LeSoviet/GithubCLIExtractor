/**
 * Centralized data converters for GitHub API objects
 * Converts GitHub CLI/API responses to application domain models
 */

import type { PullRequest, Issue, Commit, Branch, Release } from '../types/index.js';
import type { GitHubBranch, GitHubCommit } from '../types/github.js';

/**
 * Convert GitHub API Pull Request to our PullRequest format
 */
export function convertPullRequest(ghPr: any): PullRequest {
  return {
    number: ghPr.number,
    title: ghPr.title,
    body: ghPr.body || undefined,
    author: ghPr.author?.login || 'unknown',
    state: ghPr.mergedAt ? 'merged' : (ghPr.state as 'open' | 'closed'),
    createdAt: ghPr.createdAt,
    updatedAt: ghPr.updatedAt,
    closedAt: ghPr.closedAt || undefined,
    mergedAt: ghPr.mergedAt || undefined,
    labels: ghPr.labels.map((l: any) => l.name),
    url: ghPr.url,
  };
}

/**
 * Convert GitHub API Issue to our Issue format
 */
export function convertIssue(ghIssue: any): Issue {
  return {
    number: ghIssue.number,
    title: ghIssue.title,
    body: ghIssue.body || undefined,
    author: ghIssue.author?.login || 'unknown',
    state: ghIssue.state as 'open' | 'closed',
    createdAt: ghIssue.createdAt,
    updatedAt: ghIssue.updatedAt,
    closedAt: ghIssue.closedAt || undefined,
    labels: ghIssue.labels.map((l: any) => l.name),
    url: ghIssue.url,
  };
}

/**
 * Convert GitHub API Commit to our Commit format
 */
export function convertCommit(ghCommit: GitHubCommit): Commit {
  return {
    sha: ghCommit.sha,
    message: ghCommit.commit.message,
    author: ghCommit.commit.author.name,
    authorEmail: ghCommit.commit.author.email,
    date: ghCommit.commit.author.date,
    filesChanged: ghCommit.files?.map((f) => f.filename) || [],
    additions: ghCommit.stats?.additions || 0,
    deletions: ghCommit.stats?.deletions || 0,
    url: ghCommit.html_url,
  };
}

/**
 * Convert GitHub API Branch to our Branch format
 */
export function convertBranch(ghBranch: GitHubBranch): Branch {
  return {
    name: ghBranch.name || 'unknown',
    lastCommit: {
      sha: ghBranch.commit?.sha || '',
      message: ghBranch.commit?.commit?.message || 'No message',
      date: ghBranch.commit?.commit?.author?.date || new Date().toISOString(),
    },
    isProtected: ghBranch.protected || false,
  };
}

/**
 * Convert GitHub CLI Release to our Release format
 */
export function convertRelease(ghRelease: any): Release {
  return {
    tagName: ghRelease.tagName,
    name: ghRelease.name || ghRelease.tagName,
    body: ghRelease.body || undefined,
    author: ghRelease.author?.login || 'unknown',
    createdAt: ghRelease.createdAt,
    publishedAt: ghRelease.publishedAt,
    isDraft: ghRelease.isDraft || false,
    isPrerelease: ghRelease.isPrerelease || false,
    assets:
      ghRelease.assets?.map((asset: any) => ({
        name: asset.name,
        size: asset.size || 0,
        downloadCount: asset.downloadCount || asset.download_count || 0,
        downloadUrl: asset.url || asset.browser_download_url || '',
      })) || [],
    url: ghRelease.url || ghRelease.html_url || '',
  };
}

/**
 * Batch convert multiple items
 * Useful for error handling when converting arrays of items
 */
export function convertMultiple<TInput, TOutput>(
  items: TInput[],
  converter: (item: TInput) => TOutput,
  onError?: (item: TInput, error: Error) => void
): TOutput[] {
  return items
    .map((item) => {
      try {
        return converter(item);
      } catch (error) {
        if (onError) {
          onError(item, error instanceof Error ? error : new Error(String(error)));
        }
        return null;
      }
    })
    .filter((item): item is TOutput => item !== null);
}
