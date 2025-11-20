// GitHub API response types

export interface GitHubAuthStatus {
  isAuthenticated: boolean;
  username?: string;
  email?: string;
  token?: string;
}

export interface GitHubRepository {
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
  html_url: string;
  private: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  user: {
    login: string;
  };
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  labels: Array<{
    name: string;
    color: string;
  }>;
  html_url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    commit: {
      message: string;
      author: {
        date: string;
      };
    };
  };
  protected: boolean;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  user: {
    login: string;
  };
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: Array<{
    name: string;
    color: string;
  }>;
  html_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string | null;
  author: {
    login: string;
  };
  created_at: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: Array<{
    name: string;
    size: number;
    download_count: number;
    browser_download_url: string;
  }>;
  html_url: string;
}

export interface GitHubRateLimit {
  resources: {
    core: {
      limit: number;
      remaining: number;
      reset: number;
      used: number;
    };
    graphql: {
      limit: number;
      remaining: number;
      reset: number;
      used: number;
    };
  };
}
