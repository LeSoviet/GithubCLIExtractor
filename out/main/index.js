import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import Bottleneck from "bottleneck";
import chalk from "chalk";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { parseISO, format } from "date-fns";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
class Logger {
  level = 1;
  setLevel(level) {
    this.level = level;
  }
  debug(message, ...args) {
    if (this.level <= 0) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }
  info(message, ...args) {
    if (this.level <= 1) {
      console.log(chalk.cyan(`[INFO] ${message}`), ...args);
    }
  }
  success(message, ...args) {
    if (this.level <= 1) {
      console.log(chalk.green(`[OK] ${message}`), ...args);
    }
  }
  warn(message, ...args) {
    if (this.level <= 2) {
      console.warn(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }
  error(message, ...args) {
    if (this.level <= 3) {
      console.error(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }
}
const logger = new Logger();
class RateLimiter {
  limiter;
  currentLimit = null;
  constructor() {
    this.limiter = new Bottleneck({
      maxConcurrent: 5,
      // Max concurrent requests
      minTime: 1e3,
      // Minimum time between requests (1 second)
      reservoir: 5e3,
      // Initial capacity (GitHub's hourly limit)
      reservoirRefreshAmount: 5e3,
      // Refresh to full capacity
      reservoirRefreshInterval: 60 * 60 * 1e3
      // Every hour
    });
    this.limiter.on("queued", () => {
      logger.debug("Request queued due to rate limiting");
    });
    this.limiter.on("failed", async (error, jobInfo) => {
      const id = jobInfo.options.id;
      logger.warn(`Request ${id} failed: ${error.message}`);
      if (jobInfo.retryCount < 3) {
        const delay = Math.pow(2, jobInfo.retryCount) * 1e3;
        logger.info(`Retrying request ${id} in ${delay}ms (attempt ${jobInfo.retryCount + 1}/3)`);
        return delay;
      }
      logger.error(`Request ${id} failed after 3 retries`);
      return void 0;
    });
  }
  /**
   * Schedule a function to run with rate limiting
   */
  async schedule(fn, priority) {
    return this.limiter.schedule({ priority: priority || 5 }, fn);
  }
  /**
   * Fetch current rate limit status from GitHub
   */
  async fetchRateLimitStatus() {
    try {
      const rateLimit = await execGhJson("api rate_limit", {
        useRateLimit: false,
        useRetry: false
      });
      this.currentLimit = {
        limit: rateLimit.resources.core.limit,
        remaining: rateLimit.resources.core.remaining,
        reset: new Date(rateLimit.resources.core.reset * 1e3),
        used: rateLimit.resources.core.used
      };
      return this.currentLimit;
    } catch (error) {
      throw new Error(`Failed to fetch rate limit status: ${error}`);
    }
  }
  /**
   * Get current rate limit info (cached)
   */
  getCurrentLimit() {
    return this.currentLimit;
  }
  /**
   * Check if we're approaching the rate limit
   */
  async checkRateLimit() {
    const status = await this.fetchRateLimitStatus();
    const percentRemaining = status.remaining / status.limit * 100;
    if (percentRemaining < 10) {
      const resetTime = status.reset.toLocaleTimeString();
      logger.warn(
        `Rate limit low: ${status.remaining}/${status.limit} remaining (resets at ${resetTime})`
      );
    }
    if (status.remaining < 100) {
      const now = (/* @__PURE__ */ new Date()).getTime();
      const resetTime = status.reset.getTime();
      const waitTime = Math.max(0, resetTime - now);
      if (waitTime > 0) {
        logger.warn(
          `Rate limit critical! Pausing for ${Math.ceil(waitTime / 1e3 / 60)} minutes...`
        );
        await this.pause(waitTime);
      }
    }
    logger.debug(`Rate limit: ${status.remaining}/${status.limit} remaining`);
  }
  /**
   * Pause execution for a specified time
   */
  async pause(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Update limiter based on current rate limit
   */
  async updateLimiterReservoir() {
    const status = await this.fetchRateLimitStatus();
    this.limiter.updateSettings({
      reservoir: status.remaining
    });
    logger.debug(`Updated rate limiter reservoir to ${status.remaining}`);
  }
  /**
   * Stop the rate limiter and wait for pending requests
   */
  async stop() {
    await this.limiter.stop();
  }
  /**
   * Get statistics about the rate limiter
   */
  async getStats() {
    const counts = this.limiter.counts();
    return {
      running: counts.EXECUTING,
      queued: counts.QUEUED,
      done: counts.DONE ?? 0
    };
  }
}
let rateLimiterInstance = null;
function getRateLimiter() {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}
async function withRateLimit(fn, priority) {
  const limiter = getRateLimiter();
  return limiter.schedule(fn, priority);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isRetryableError(error) {
  const retryableMessages = [
    "econnreset",
    "etimedout",
    "enotfound",
    "econnrefused",
    "rate limit",
    "timeout",
    "network"
  ];
  const message = error.message.toLowerCase();
  return retryableMessages.some((msg) => message.includes(msg.toLowerCase()));
}
async function withSmartRetry(fn, options = {}) {
  let lastError;
  for (let attempt = 0; attempt <= (options.maxRetries ?? 3); attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!isRetryableError(lastError)) {
        throw lastError;
      }
      if (attempt >= (options.maxRetries ?? 3)) {
        throw new Error(`Failed after ${options.maxRetries ?? 3} retries: ${lastError.message}`);
      }
      const initialDelay = options.initialDelay ?? 1e3;
      const backoffMultiplier = options.backoffMultiplier ?? 2;
      const maxDelay = options.maxDelay ?? 3e4;
      const actualDelay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
      logger.warn(
        `Attempt ${attempt + 1}/${options.maxRetries ?? 3} failed: ${lastError.message}. Retrying in ${actualDelay}ms...`
      );
      if (options.onRetry) {
        options.onRetry(lastError, attempt + 1);
      }
      await sleep(actualDelay);
    }
  }
  throw lastError;
}
const execAsync = promisify(exec);
async function execGh(command, options = {}) {
  const { timeout = 3e4, useRateLimit = true, useRetry = true } = options;
  const executeCommand = async () => {
    try {
      let fullCommand;
      if (process.platform === "win32" && command.startsWith("api ") && command.includes("&")) {
        const apiIndex = command.indexOf("api ");
        const urlPart = command.substring(apiIndex + 4);
        fullCommand = `gh api "${urlPart}"`;
      } else {
        fullCommand = `gh ${command}`;
      }
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        // 10MB buffer for large outputs
        killSignal: "SIGTERM"
        // Ensure process can be killed
      });
      if (stderr && !stderr.includes("Logging in to")) {
        const isError = stderr.toLowerCase().includes("error") || stderr.toLowerCase().includes("fatal");
        if (isError) {
          throw new Error(stderr);
        }
      }
      return stdout.trim();
    } catch (error) {
      if (error.killed || error.signal === "SIGTERM") {
        throw new Error(`GitHub CLI command timed out after ${timeout}ms`);
      }
      if (error instanceof Error) {
        throw new Error(`GitHub CLI command failed: ${error.message}`);
      }
      throw error;
    }
  };
  let resultPromise = executeCommand;
  if (useRetry) {
    const originalPromise = resultPromise;
    resultPromise = () => withSmartRetry(originalPromise, {
      maxRetries: 2,
      // Reduced from 3
      initialDelay: 500
      // Reduced from 1000
    });
  }
  if (useRateLimit && command.includes("api")) {
    const originalPromise = resultPromise;
    resultPromise = () => withRateLimit(originalPromise);
  }
  return Promise.race([
    resultPromise(),
    new Promise(
      (_, reject) => setTimeout(
        () => reject(new Error(`Operation timed out after ${timeout * 1.5}ms`)),
        timeout * 1.5
        // 1.5x timeout as absolute limit
      )
    )
  ]);
}
async function execGhJson(command, options) {
  const output = await execGh(command, options);
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Failed to parse GitHub CLI JSON output: ${error}`);
  }
}
async function listUserRepositories(username) {
  try {
    let repos;
    if (username) ;
    else {
      repos = await execGhJson("api user/repos --paginate");
    }
    return repos.map((repo) => ({
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description || void 0,
      url: repo.html_url,
      isPrivate: repo.private
    }));
  } catch (error) {
    throw new Error(`Failed to list repositories: ${error}`);
  }
}
function sanitizeFilename(filename) {
  return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").substring(0, 255);
}
function decodeUnicode(str) {
  if (!str) return "";
  try {
    let result = str.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
      return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16));
    });
    result = sanitizeUnicode(result);
    return result;
  } catch {
    return str;
  }
}
function sanitizeUnicode(text) {
  if (!text) return "";
  const replacements = {
    // Emojis commonly causing WinAnsi errors
    "🔀": "[Merged]",
    "📄": "[Document]",
    "✅": "[Done]",
    "❌": "[Failed]",
    "⏱️": "[Time]",
    "🔓": "[Open]",
    "📌": "[Pin]",
    "💬": "[Comment]",
    "👤": "[User]",
    "📊": "[Chart]",
    "👥": "[Users]",
    "🏷️": "[Label]",
    "❤️": "[Health]",
    "🎯": "[Goal]",
    "🐛": "[Bug]",
    "✨": "[Feature]",
    "🚀": "[Release]",
    "💡": "[Idea]",
    // Arrows
    "→": "->",
    "←": "<-",
    "↑": "^^",
    "↓": "vv",
    "⇒": "=>",
    "⇐": "<=",
    // Bullets and symbols
    "•": "-",
    "○": "o",
    "●": "*",
    "■": "[Box]",
    "□": "[Empty]",
    // Math and other
    "±": "+/-",
    "÷": "/",
    "×": "x",
    "∞": "[Infinity]",
    "√": "[Root]"
  };
  let result = text;
  for (const [unicode, ascii] of Object.entries(replacements)) {
    result = result.split(unicode).join(ascii);
  }
  result = result.replace(/[^\x20-\x7E\n\r\t]/g, "?");
  return result;
}
async function ensureDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}
async function writeOutput(filePath, content, options) {
  const dir = dirname(filePath);
  await ensureDirectory(dir);
  let finalPath = filePath;
  await writeFile(finalPath, content, "utf-8");
}
async function writeJson(filePath, data) {
  const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  await writeOutput(filePath, content);
}
async function writeMarkdown(filePath, content) {
  await writeOutput(filePath, content);
}
function buildOutputPath(basePath, repoOwner, repoName, exportType) {
  return join(basePath, repoOwner, repoName, exportType);
}
function formatDate(dateString) {
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : dateString;
    return format(date, "PPpp");
  } catch {
    return typeof dateString === "string" ? dateString : dateString.toISOString();
  }
}
class BaseExporter {
  repository;
  outputPath;
  format;
  diffMode;
  userFilter;
  startTime = 0;
  apiCalls = 0;
  cacheHits = 0;
  constructor(options) {
    this.repository = options.repository;
    this.outputPath = options.outputPath;
    this.format = options.format;
    this.diffMode = options.diffMode;
    this.userFilter = options.userFilter;
  }
  /**
   * Main export method - orchestrates the entire export process
   */
  async export() {
    this.startTime = Date.now();
    const result = {
      success: false,
      itemsExported: 0,
      itemsFailed: 0,
      apiCalls: 0,
      cacheHits: 0,
      duration: 0,
      errors: []
    };
    try {
      logger.info(`Starting export for ${this.repository.owner}/${this.repository.name}...`);
      await ensureDirectory(this.outputPath);
      const items = await this.fetchData();
      logger.info(`Fetched ${items.length} items`);
      for (const item of items) {
        try {
          await this.exportItem(item);
          result.itemsExported++;
        } catch (error) {
          result.itemsFailed++;
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          result.errors.push(errorMsg);
          logger.error(`Failed to export item: ${errorMsg}`);
        }
      }
      result.success = result.itemsFailed === 0;
      result.apiCalls = this.apiCalls;
      result.cacheHits = this.cacheHits;
      result.duration = Date.now() - this.startTime;
      logger.success(
        `Export completed: ${result.itemsExported} exported, ${result.itemsFailed} failed`
      );
      return result;
    } catch (error) {
      result.success = false;
      result.duration = Date.now() - this.startTime;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMsg);
      logger.error(`Export failed: ${errorMsg}`);
      throw error;
    }
  }
  /**
   * Convert item to JSON format
   * Default implementation can be overridden
   */
  toJson(item) {
    return JSON.stringify(item, null, 2);
  }
  /**
   * Increment API call counter
   */
  incrementApiCalls() {
    this.apiCalls++;
  }
  /**
   * Increment cache hit counter
   */
  incrementCacheHits() {
    this.cacheHits++;
  }
  /**
   * Get repository identifier
   */
  getRepoIdentifier() {
    return `${this.repository.owner}/${this.repository.name}`;
  }
  /**
   * Check if diff mode is enabled
   */
  isDiffMode() {
    return this.diffMode?.enabled === true;
  }
  /**
   * Get the since date for diff mode filtering
   */
  getDiffModeSince() {
    return this.diffMode?.since;
  }
  /**
   * Log diff mode info
   */
  logDiffModeInfo() {
    if (this.isDiffMode() && this.diffMode?.since) {
      logger.info(
        `📅 Diff mode enabled: exporting items updated since ${new Date(this.diffMode.since).toLocaleString()}`
      );
    }
  }
  /**
   * Get user filter
   */
  getUserFilter() {
    return this.userFilter;
  }
  /**
   * Check if user filter is enabled
   */
  isUserFilterEnabled() {
    return this.userFilter !== void 0 && this.userFilter !== "";
  }
  /**
   * Protected helper method to format dates for export
   */
  formatDate(dateString) {
    return formatDate(dateString);
  }
  /**
   * Apply filters (user filter + diff mode) to items
   * Should be called after conversion in fetchData implementations
   */
  async applyFilters(items, options) {
    let filtered = items;
    const authorField = options?.authorField || "author";
    const dateField = options?.dateField || "updatedAt";
    const shouldLog = options?.log !== false;
    if (this.isUserFilterEnabled()) {
      const userFilter = this.getUserFilter();
      filtered = filtered.filter((item) => {
        const author = item[authorField];
        return author && String(author).toLowerCase() === userFilter.toLowerCase();
      });
      if (shouldLog) {
        this.logFilteringAction(`user filter: ${filtered.length} items by user '${userFilter}'`);
      }
    }
    if (this.isDiffMode()) {
      const since = this.getDiffModeSince();
      if (since) {
        const sinceDate = new Date(since);
        filtered = filtered.filter((item) => {
          const itemDate = item[dateField];
          return itemDate && new Date(String(itemDate)) > sinceDate;
        });
        if (shouldLog) {
          this.logFilteringAction(
            `diff mode: ${filtered.length} items updated since ${sinceDate.toLocaleString()}`
          );
        }
      }
    }
    return filtered;
  }
  /**
   * Log filtering action
   */
  logFilteringAction(message) {
    logger.info(message);
  }
  /**
   * Template method for exporting items with markdown + optional JSON
   * Child classes should override toMarkdown() and can optionally override toJson()
   */
  async exportItemTemplate(item, outputPath, options) {
    const { prefix, identifier, toMarkdown: mdFn, toJson: jsonFn } = options;
    const markdown = mdFn(item);
    const filename = `${prefix}-${identifier}.md`;
    const filepath = join(outputPath, filename);
    await writeMarkdown(filepath, markdown);
    if (this.format === "json") {
      const json = jsonFn ? jsonFn(item) : JSON.stringify(item, null, 2);
      const jsonFilename = `${prefix}-${identifier}.json`;
      const jsonFilepath = join(outputPath, jsonFilename);
      await writeJson(jsonFilepath, json);
    }
  }
}
function convertPullRequest(ghPr) {
  return {
    number: ghPr.number,
    title: ghPr.title,
    body: ghPr.body || void 0,
    author: ghPr.author?.login || "unknown",
    state: ghPr.mergedAt ? "merged" : ghPr.state,
    createdAt: ghPr.createdAt,
    updatedAt: ghPr.updatedAt,
    closedAt: ghPr.closedAt || void 0,
    mergedAt: ghPr.mergedAt || void 0,
    labels: ghPr.labels.map((l) => l.name),
    url: ghPr.url
  };
}
function convertIssue(ghIssue) {
  return {
    number: ghIssue.number,
    title: ghIssue.title,
    body: ghIssue.body || void 0,
    author: ghIssue.author?.login || "unknown",
    state: ghIssue.state,
    createdAt: ghIssue.createdAt,
    updatedAt: ghIssue.updatedAt,
    closedAt: ghIssue.closedAt || void 0,
    labels: ghIssue.labels.map((l) => l.name),
    url: ghIssue.url
  };
}
function convertCommit(ghCommit) {
  return {
    sha: ghCommit.sha,
    message: ghCommit.commit.message,
    author: ghCommit.commit.author.name,
    authorEmail: ghCommit.commit.author.email,
    date: ghCommit.commit.author.date,
    filesChanged: ghCommit.files?.map((f) => f.filename) || [],
    additions: ghCommit.stats?.additions || 0,
    deletions: ghCommit.stats?.deletions || 0,
    url: ghCommit.html_url
  };
}
function convertBranch(ghBranch) {
  return {
    name: ghBranch.name || "unknown",
    lastCommit: {
      sha: ghBranch.commit?.sha || "",
      message: ghBranch.commit?.commit?.message || "No message",
      date: ghBranch.commit?.commit?.author?.date || (/* @__PURE__ */ new Date()).toISOString()
    },
    isProtected: ghBranch.protected || false
  };
}
function convertRelease(ghRelease) {
  return {
    tagName: ghRelease.tagName,
    name: ghRelease.name || ghRelease.tagName,
    body: ghRelease.body || void 0,
    author: ghRelease.author?.login || "unknown",
    createdAt: ghRelease.createdAt,
    publishedAt: ghRelease.publishedAt,
    isDraft: ghRelease.isDraft || false,
    isPrerelease: ghRelease.isPrerelease || false,
    assets: ghRelease.assets?.map((asset) => ({
      name: asset.name,
      size: asset.size || 0,
      downloadCount: asset.downloadCount || asset.download_count || 0,
      downloadUrl: asset.url || asset.browser_download_url || ""
    })) || [],
    url: ghRelease.url || ghRelease.html_url || ""
  };
}
class PullRequestExporter extends BaseExporter {
  async fetchData() {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();
    try {
      this.logDiffModeInfo();
      const prs = await execGhJson(
        `pr list --repo ${repoId} --state all --limit 500 --json number,title,body,author,state,createdAt,updatedAt,closedAt,mergedAt,labels,url`,
        { timeout: 6e4, useRateLimit: false, useRetry: false }
      );
      let convertedPRs = prs.map((pr) => convertPullRequest(pr));
      convertedPRs = await this.applyFilters(convertedPRs, {
        authorField: "author",
        dateField: "updatedAt"
      });
      return convertedPRs;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to fetch pull requests: ${errorMsg}`);
      return [];
    }
  }
  async exportItem(pr) {
    const safeTitle = sanitizeFilename(pr.title.substring(0, 50));
    const identifier = `${pr.number}-${safeTitle}`;
    await this.exportItemTemplate(pr, this.outputPath, {
      prefix: "PR",
      identifier,
      toMarkdown: (item) => this.toMarkdown(item),
      toJson: (item) => this.toJson(item)
    });
  }
  toMarkdown(pr) {
    const labels = pr.labels.length > 0 ? pr.labels.map((l) => `\`${sanitizeUnicode(l)}\``).join(", ") : "None";
    const body = pr.body ? decodeUnicode(pr.body) : "*No description provided*";
    let markdown = `# Pull Request #${pr.number}: ${sanitizeUnicode(pr.title)}

`;
    markdown += `## Metadata

`;
    markdown += `- **Author:** ${sanitizeUnicode(pr.author)}
`;
    markdown += `- **State:** ${pr.state.toUpperCase()}
`;
    markdown += `- **Created:** ${this.formatDate(pr.createdAt)}
`;
    markdown += `- **Updated:** ${this.formatDate(pr.updatedAt)}
`;
    if (pr.closedAt) {
      markdown += `- **Closed:** ${this.formatDate(pr.closedAt)}
`;
    }
    if (pr.mergedAt) {
      markdown += `- **Merged:** ${this.formatDate(pr.mergedAt)}
`;
    }
    markdown += `- **Labels:** ${labels}
`;
    markdown += `- **URL:** ${pr.url}

`;
    markdown += `## Description

`;
    markdown += `${body}

`;
    markdown += `---

`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*
`;
    return markdown;
  }
  toJson(pr) {
    return JSON.stringify(pr, null, 2);
  }
  getExportType() {
    return "pull-requests";
  }
}
class IssueExporter extends BaseExporter {
  async fetchData() {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();
    try {
      this.logDiffModeInfo();
      const issues = await execGhJson(
        `issue list --repo ${repoId} --state all --limit 500 --json number,title,body,author,state,createdAt,updatedAt,closedAt,labels,url`,
        { timeout: 6e4, useRateLimit: false, useRetry: false }
      );
      let convertedIssues = issues.map((issue) => convertIssue(issue));
      convertedIssues = await this.applyFilters(convertedIssues, {
        authorField: "author",
        dateField: "updatedAt"
      });
      return convertedIssues;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("disabled issues")) {
        logger.warn(`Issues export skipped: issues are disabled for ${repoId}`);
      } else {
        logger.warn(`Failed to fetch issues: ${errorMsg}`);
      }
      return [];
    }
  }
  async exportItem(issue) {
    await this.exportItemTemplate(issue, this.outputPath, {
      prefix: "ISSUE",
      identifier: issue.number,
      toMarkdown: (item) => this.toMarkdown(item),
      toJson: (item) => this.toJson(item)
    });
  }
  toMarkdown(issue) {
    const labels = issue.labels.length > 0 ? issue.labels.map((l) => `\`${sanitizeUnicode(l)}\``).join(", ") : "None";
    const body = issue.body ? decodeUnicode(issue.body) : "*No description provided*";
    let markdown = `# Issue #${issue.number}: ${sanitizeUnicode(issue.title)}

`;
    markdown += `## Metadata

`;
    markdown += `- **Author:** ${sanitizeUnicode(issue.author)}
`;
    markdown += `- **State:** ${issue.state.toUpperCase()}
`;
    markdown += `- **Created:** ${this.formatDate(issue.createdAt)}
`;
    markdown += `- **Updated:** ${this.formatDate(issue.updatedAt)}
`;
    if (issue.closedAt) {
      markdown += `- **Closed:** ${this.formatDate(issue.closedAt)}
`;
    }
    markdown += `- **Labels:** ${labels}
`;
    markdown += `- **URL:** ${issue.url}

`;
    markdown += `## Description

`;
    markdown += `${body}

`;
    markdown += `---

`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*
`;
    return markdown;
  }
  getExportType() {
    return "issues";
  }
}
class CommitExporter extends BaseExporter {
  async fetchData() {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();
    try {
      this.logDiffModeInfo();
      let apiUrl = `api repos/${repoId}/commits?per_page=100`;
      if (this.isUserFilterEnabled()) {
        apiUrl += `&author=${encodeURIComponent(this.getUserFilter())}`;
      }
      if (this.isDiffMode()) {
        const since = this.getDiffModeSince();
        if (since) {
          apiUrl += `&since=${encodeURIComponent(since)}`;
        }
      }
      const commits = await execGhJson(apiUrl, {
        timeout: 6e4,
        useRateLimit: false,
        useRetry: false
      });
      const convertedCommits = commits.map((commit) => convertCommit(commit));
      return convertedCommits;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to fetch commits: ${errorMsg}`);
      return [];
    }
  }
  async exportItem(commit) {
    const shortSha = commit.sha.substring(0, 7);
    await this.exportItemTemplate(commit, this.outputPath, {
      prefix: "COMMIT",
      identifier: shortSha,
      toMarkdown: (item) => this.toMarkdown(item),
      toJson: (item) => this.toJson(item)
    });
  }
  toMarkdown(commit) {
    const shortSha = commit.sha.substring(0, 7);
    const filesChanged = commit.filesChanged.length > 0 ? commit.filesChanged.map((f) => `- \`${sanitizeUnicode(f)}\``).join("\n") : "*No files information available*";
    let markdown = `# Commit ${shortSha}

`;
    markdown += `## Metadata

`;
    markdown += `- **SHA:** \`${commit.sha}\`
`;
    markdown += `- **Author:** ${sanitizeUnicode(commit.author)} (${sanitizeUnicode(commit.authorEmail)})
`;
    markdown += `- **Date:** ${this.formatDate(commit.date)}
`;
    markdown += `- **URL:** ${commit.url}

`;
    if (commit.additions > 0 || commit.deletions > 0) {
      markdown += `## Stats

`;
      markdown += `- **Additions:** +${commit.additions}
`;
      markdown += `- **Deletions:** -${commit.deletions}
`;
      markdown += `- **Total Changes:** ${commit.additions + commit.deletions}

`;
    }
    markdown += `## Commit Message

`;
    markdown += `\`\`\`
${sanitizeUnicode(commit.message)}
\`\`\`

`;
    markdown += `## Files Changed

`;
    markdown += `${filesChanged}

`;
    markdown += `---

`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*
`;
    return markdown;
  }
  getExportType() {
    return "commits";
  }
}
class BranchExporter extends BaseExporter {
  async fetchData() {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();
    try {
      this.logDiffModeInfo();
      const branches = await execGhJson(
        `api repos/${repoId}/branches?per_page=20`,
        {
          timeout: 1e4,
          // 10 second timeout
          useRetry: false,
          // Disable retry for faster failure
          useRateLimit: true
        }
      );
      if (!branches || !Array.isArray(branches)) {
        return [];
      }
      let convertedBranches = branches.map((branch) => convertBranch(branch));
      if (this.isDiffMode()) {
        const since = this.getDiffModeSince();
        if (since) {
          const sinceDate = new Date(since);
          convertedBranches = convertedBranches.filter((branch) => {
            const lastCommitDate = new Date(branch.lastCommit.date);
            return lastCommitDate > sinceDate;
          });
        }
      }
      return convertedBranches;
    } catch (error) {
      return [];
    }
  }
  async exportItem(branch) {
    const safeName = sanitizeFilename(branch.name);
    await this.exportItemTemplate(branch, this.outputPath, {
      prefix: "BRANCH",
      identifier: safeName,
      toMarkdown: (item) => this.toMarkdown(item),
      toJson: (item) => this.toJson(item)
    });
  }
  toMarkdown(branch) {
    const protection = branch.isProtected ? "[Protected]" : "[Not Protected]";
    let markdown = `# Branch: ${sanitizeUnicode(branch.name)}

`;
    markdown += `## Metadata

`;
    markdown += `- **Name:** \`${sanitizeUnicode(branch.name)}\`
`;
    markdown += `- **Protection:** ${protection}

`;
    markdown += `## Last Commit

`;
    markdown += `- **SHA:** \`${branch.lastCommit.sha.substring(0, 7)}\`
`;
    markdown += `- **Message:** ${sanitizeUnicode(branch.lastCommit.message.split("\n")[0])}
`;
    markdown += `- **Date:** ${this.formatDate(branch.lastCommit.date)}

`;
    markdown += `---

`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*
`;
    return markdown;
  }
  getExportType() {
    return "branches";
  }
}
class ReleaseExporter extends BaseExporter {
  async fetchData() {
    const repoId = this.getRepoIdentifier();
    this.incrementApiCalls();
    try {
      this.logDiffModeInfo();
      const releases = await execGhJson(
        `release list --repo ${repoId} --limit 300 --json tagName,name,createdAt,publishedAt,isDraft,isPrerelease`,
        { timeout: 15e3, useRateLimit: false, useRetry: false }
      );
      if (!releases || releases.length === 0) {
        return [];
      }
      const releasesWithDetails = await Promise.all(
        releases.map(async (release) => {
          try {
            const fullRelease = await execGhJson(
              `release view ${release.tagName} --repo ${repoId} --json tagName,name,body,author,createdAt,publishedAt,isDraft,isPrerelease,assets,url`,
              { timeout: 3e4, useRetry: true, useRateLimit: true }
            );
            return convertRelease(fullRelease);
          } catch (error) {
            return convertRelease({
              ...release,
              body: "",
              assets: [],
              author: { login: "unknown" },
              url: `https://github.com/${repoId}/releases/tag/${release.tagName}`
            });
          }
        })
      );
      let filteredReleases = releasesWithDetails;
      if (this.isDiffMode()) {
        const since = this.getDiffModeSince();
        if (since) {
          const sinceDate = new Date(since);
          filteredReleases = releasesWithDetails.filter((release) => {
            const publishedAt = new Date(release.publishedAt);
            return publishedAt > sinceDate;
          });
        }
      }
      return filteredReleases;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to fetch releases: ${errorMsg}`);
      return [];
    }
  }
  async exportItem(release) {
    await this.exportItemTemplate(release, this.outputPath, {
      prefix: "RELEASE",
      identifier: release.tagName,
      toMarkdown: (item) => this.toMarkdown(item),
      toJson: (item) => this.toJson(item)
    });
  }
  toMarkdown(release) {
    const body = release.body ? decodeUnicode(release.body) : "*No release notes provided*";
    const badges = [];
    if (release.isDraft) badges.push("`DRAFT`");
    if (release.isPrerelease) badges.push("`PRE-RELEASE`");
    const badgesStr = badges.length > 0 ? badges.join(" ") + "\n\n" : "";
    let markdown = `# Release: ${sanitizeUnicode(release.name)}

`;
    markdown += badgesStr;
    markdown += `## Metadata

`;
    markdown += `- **Tag:** \`${release.tagName}\`
`;
    markdown += `- **Author:** ${sanitizeUnicode(release.author)}
`;
    markdown += `- **Created:** ${this.formatDate(release.createdAt)}
`;
    markdown += `- **Published:** ${this.formatDate(release.publishedAt)}
`;
    markdown += `- **URL:** ${release.url}

`;
    if (release.assets && release.assets.length > 0) {
      markdown += `## Assets (${release.assets.length})

`;
      release.assets.forEach((asset) => {
        const sizeKB = (asset.size / 1024).toFixed(2);
        markdown += `- **${sanitizeUnicode(asset.name)}** (${sizeKB} KB)
`;
        markdown += `  - Downloads: ${asset.downloadCount}
`;
        markdown += `  - URL: ${asset.downloadUrl}
`;
      });
      markdown += `
`;
    }
    markdown += `## Release Notes

`;
    markdown += `${body}

`;
    markdown += `---

`;
    markdown += `*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*
`;
    return markdown;
  }
  getExportType() {
    return "releases";
  }
}
const __dirname$1 = fileURLToPath(new URL(".", import.meta.url));
let mainWindow = null;
function createWindow() {
  console.log("[Main] Creating browser window...");
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname$1, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: "GitHub Extractor",
    autoHideMenuBar: false
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    console.log("[Main] Loading from dev server:", process.env.ELECTRON_RENDERER_URL);
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else if (process.env.NODE_ENV === "development") {
    console.log("[Main] Loading from dev server (fallback):", "http://localhost:5173");
    mainWindow.loadURL("http://localhost:5173").catch((err) => {
      console.error("[Main] Failed to load from dev server, falling back to file:", err);
      const htmlPath = join(__dirname$1, "../renderer/index.html");
      mainWindow.loadFile(htmlPath).catch((fileErr) => {
        console.error("[Main] Failed to load HTML file:", fileErr);
      });
    });
  } else {
    const htmlPath = join(__dirname$1, "../renderer/index.html");
    console.log("[Main] Loading HTML from:", htmlPath);
    mainWindow.loadFile(htmlPath).then(() => {
      console.log("[Main] HTML loaded successfully");
    }).catch((error) => {
      console.error("[Main] Failed to load HTML:", error);
    });
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("[Main] Renderer failed to load:", errorCode, errorDescription);
  });
}
app.whenReady().then(() => {
  console.log("[Main] App is ready, creating window...");
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error("[Main] Failed to start app:", error);
  app.quit();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
ipcMain.handle("get-repositories", async () => {
  try {
    console.log("[Main] Fetching repositories...");
    const { getAuthStatus } = await import("./chunks/github-auth-CjXtjigz.js");
    const authStatus = await getAuthStatus();
    console.log("[Main] Auth status:", authStatus);
    if (!authStatus.isAuthenticated) {
      throw new Error("GitHub CLI not authenticated. Please run: gh auth login");
    }
    const repos = await listUserRepositories();
    console.log(`[Main] Successfully fetched ${repos.length} repositories`);
    return repos.map((repo) => ({
      owner: repo.owner,
      name: repo.name,
      fullName: `${repo.owner}/${repo.name}`
    }));
  } catch (error) {
    console.error("[Main] Failed to fetch repositories:", error);
    if (error instanceof Error) {
      console.error("[Main] Error message:", error.message);
      console.error("[Main] Error stack:", error.stack);
    }
    throw error;
  }
});
ipcMain.handle("get-contributors", async (_event, repoOwner, repoName) => {
  try {
    const repoId = `${repoOwner}/${repoName}`;
    const commits = await execGhJson(
      `api repos/${repoId}/contributors --paginate`,
      { timeout: 3e4, useRateLimit: false, useRetry: false }
    );
    const contributors = commits.map((c) => c.login).filter(Boolean);
    return Array.from(new Set(contributors));
  } catch (error) {
    console.error("Failed to fetch contributors:", error);
    return [];
  }
});
ipcMain.handle("select-folder", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled) {
      return null;
    }
    return result.filePaths[0];
  } catch (error) {
    console.error("Failed to open folder dialog:", error);
    return null;
  }
});
ipcMain.handle("open-folder", async (_event, folderPath) => {
  try {
    const { resolve } = await import("path");
    console.log("[Main] open-folder received path:", folderPath);
    const { isAbsolute } = await import("path");
    let absolutePath;
    if (isAbsolute(folderPath)) {
      absolutePath = folderPath;
      console.log("[Main] Path is already absolute:", absolutePath);
    } else {
      absolutePath = resolve(folderPath);
      console.log("[Main] Resolved relative path from CWD to:", absolutePath);
    }
    console.log("[Main] Final path to open:", absolutePath);
    const result = await shell.openPath(absolutePath);
    if (result) {
      console.error("[Main] Failed to open folder:", result);
      throw new Error(result);
    }
    console.log("[Main] Successfully opened folder");
  } catch (error) {
    console.error("[Main] Failed to open folder:", error);
    throw error;
  }
});
ipcMain.handle("export-data", async (_event, options) => {
  try {
    const { repository, exportTypes, format: format2, dateFilter, userFilter, outputPath, generateAnalytics } = options;
    if (!mainWindow) {
      throw new Error("Main window not available");
    }
    const sendProgress = (stage, progress, currentType) => {
      mainWindow.webContents.send("export-progress", { stage, progress, currentType });
    };
    sendProgress("Initializing export...", 0);
    const totalTypes = exportTypes.length;
    let completedTypes = 0;
    for (const type of exportTypes) {
      sendProgress(`Exporting ${type}`, completedTypes / totalTypes * 100, type);
      const finalOutputPath = buildOutputPath(
        outputPath,
        repository.owner,
        repository.name,
        getExportTypeName(type)
      );
      const exporterOptions = {
        repository,
        outputPath: finalOutputPath,
        format: format2
      };
      if (dateFilter) {
        const diffModeOptions = {
          enabled: true,
          since: dateFilter.from,
          until: dateFilter.to
        };
        exporterOptions.diffMode = diffModeOptions;
      }
      if (userFilter) {
        exporterOptions.userFilter = userFilter;
      }
      const exporter = createExporter(type, exporterOptions);
      await exporter.export();
      completedTypes++;
    }
    sendProgress("Export completed!", 100);
    if (generateAnalytics) {
      sendProgress("Generating analytics report...", 100);
      try {
        const { AnalyticsProcessor } = await import("./chunks/analytics-processor-CUx4J5hO.js");
        const repoOutputPath = outputPath + `/${repository.owner}/${repository.name}`;
        const analyticsOptions = {
          enabled: true,
          format: format2,
          outputPath: repoOutputPath,
          repository,
          offline: true,
          exportedDataPath: repoOutputPath
        };
        const processor = new AnalyticsProcessor(analyticsOptions);
        await processor.generateReport();
        logger.info("Analytics report generated successfully");
      } catch (error) {
        logger.error(`Analytics generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    mainWindow.webContents.send("export-complete", {
      success: true,
      message: `Successfully exported ${totalTypes} data types${generateAnalytics ? " with analytics" : ""}`
    });
    return { success: true, message: "Export completed successfully" };
  } catch (error) {
    console.error("Export failed:", error);
    if (mainWindow) {
      mainWindow.webContents.send("export-error", error instanceof Error ? error.message : "Unknown error");
    }
    throw error;
  }
});
function createExporter(type, options) {
  switch (type) {
    case "prs":
      return new PullRequestExporter(options);
    case "issues":
      return new IssueExporter(options);
    case "commits":
      return new CommitExporter(options);
    case "branches":
      return new BranchExporter(options);
    case "releases":
      return new ReleaseExporter(options);
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}
function getExportTypeName(type) {
  const names = {
    prs: "Pull Requests",
    issues: "Issues",
    commits: "Commits",
    branches: "Branches",
    releases: "Releases"
  };
  return names[type] || type;
}
export {
  execGhJson as a,
  ensureDirectory as b,
  execGh as e,
  logger as l
};
