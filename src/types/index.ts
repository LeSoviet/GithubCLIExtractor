export interface Repository {
  name: string;
  owner: string;
  description?: string;
  url: string;
  isPrivate: boolean;
}

export interface PullRequest {
  number: number;
  title: string;
  body?: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  mergedAt?: string;
  labels: string[];
  url: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
  filesChanged: string[];
  additions: number;
  deletions: number;
  url: string;
}

export interface Branch {
  name: string;
  lastCommit: {
    sha: string;
    message: string;
    date: string;
  };
  isProtected: boolean;
}

export interface Issue {
  number: number;
  title: string;
  body?: string;
  author: string;
  state: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  labels: string[];
  url: string;
}

export interface Release {
  tagName: string;
  name: string;
  body?: string;
  author: string;
  createdAt: string;
  publishedAt: string;
  isDraft: boolean;
  isPrerelease: boolean;
  assets: ReleaseAsset[];
  url: string;
}

export interface ReleaseAsset {
  name: string;
  size: number;
  downloadCount: number;
  downloadUrl: string;
}

export type ExportFormat = 'markdown' | 'json' | 'both';

export type ExportType = 'prs' | 'commits' | 'branches' | 'issues' | 'releases' | 'full-backup';

export interface ExportOptions {
  format: ExportFormat;
  outputPath: string;
  repository: Repository;
  type: ExportType;
  diffMode?: import('./state.js').DiffModeOptions;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

export interface ExportResult {
  success: boolean;
  itemsExported: number;
  itemsFailed: number;
  apiCalls: number;
  cacheHits: number;
  duration: number;
  errors: string[];
}
