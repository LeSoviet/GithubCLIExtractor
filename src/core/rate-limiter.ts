import Bottleneck from 'bottleneck';
import { execGhJson } from '../utils/exec-gh.js';
import { logger } from '../utils/logger.js';
import type { RateLimitInfo } from '../types/index.js';
import type { GitHubRateLimit } from '../types/github.js';

/**
 * Rate limiter for GitHub API requests
 * Uses bottleneck to ensure we don't exceed GitHub's rate limits
 */
export class RateLimiter {
  private limiter: Bottleneck;
  private currentLimit: RateLimitInfo | null = null;

  constructor() {
    // GitHub REST API: 5000 requests/hour = ~83/minute = ~1.4/second
    // We'll be conservative: max 1 request per second, with 5 concurrent
    this.limiter = new Bottleneck({
      maxConcurrent: 5, // Max concurrent requests
      minTime: 1000, // Minimum time between requests (1 second)
      reservoir: 5000, // Initial capacity (GitHub's hourly limit)
      reservoirRefreshAmount: 5000, // Refresh to full capacity
      reservoirRefreshInterval: 60 * 60 * 1000, // Every hour
    });

    // Log when requests are queued
    this.limiter.on('queued', () => {
      logger.debug('Request queued due to rate limiting');
    });

    // Log when requests fail
    this.limiter.on('failed', async (error, jobInfo) => {
      const id = jobInfo.options.id;
      logger.warn(`Request ${id} failed: ${error.message}`);

      // Retry with exponential backoff
      if (jobInfo.retryCount < 3) {
        const delay = Math.pow(2, jobInfo.retryCount) * 1000; // 1s, 2s, 4s
        logger.info(`Retrying request ${id} in ${delay}ms (attempt ${jobInfo.retryCount + 1}/3)`);
        return delay;
      }

      logger.error(`Request ${id} failed after 3 retries`);
      return undefined; // Stop retrying
    });
  }

  /**
   * Schedule a function to run with rate limiting
   */
  async schedule<T>(fn: () => Promise<T>, priority?: number): Promise<T> {
    return this.limiter.schedule({ priority: priority || 5 }, fn);
  }

  /**
   * Fetch current rate limit status from GitHub
   */
  async fetchRateLimitStatus(): Promise<RateLimitInfo> {
    try {
      // Important: Disable rate limiting for this call to avoid circular dependency
      const rateLimit = await execGhJson<GitHubRateLimit>('api rate_limit', {
        useRateLimit: false,
        useRetry: false,
      });

      this.currentLimit = {
        limit: rateLimit.resources.core.limit,
        remaining: rateLimit.resources.core.remaining,
        reset: new Date(rateLimit.resources.core.reset * 1000),
        used: rateLimit.resources.core.used,
      };

      return this.currentLimit;
    } catch (error) {
      throw new Error(`Failed to fetch rate limit status: ${error}`);
    }
  }

  /**
   * Get current rate limit info (cached)
   */
  getCurrentLimit(): RateLimitInfo | null {
    return this.currentLimit;
  }

  /**
   * Check if we're approaching the rate limit
   */
  async checkRateLimit(): Promise<void> {
    const status = await this.fetchRateLimitStatus();

    const percentRemaining = (status.remaining / status.limit) * 100;

    if (percentRemaining < 10) {
      const resetTime = status.reset.toLocaleTimeString();
      logger.warn(
        `Rate limit low: ${status.remaining}/${status.limit} remaining (resets at ${resetTime})`
      );
    }

    if (status.remaining < 100) {
      const now = new Date().getTime();
      const resetTime = status.reset.getTime();
      const waitTime = Math.max(0, resetTime - now);

      if (waitTime > 0) {
        logger.warn(
          `Rate limit critical! Pausing for ${Math.ceil(waitTime / 1000 / 60)} minutes...`
        );
        await this.pause(waitTime);
      }
    }

    logger.debug(`Rate limit: ${status.remaining}/${status.limit} remaining`);
  }

  /**
   * Pause execution for a specified time
   */
  private async pause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update limiter based on current rate limit
   */
  async updateLimiterReservoir(): Promise<void> {
    const status = await this.fetchRateLimitStatus();

    // Update the reservoir to match current remaining requests
    this.limiter.updateSettings({
      reservoir: status.remaining,
    });

    logger.debug(`Updated rate limiter reservoir to ${status.remaining}`);
  }

  /**
   * Stop the rate limiter and wait for pending requests
   */
  async stop(): Promise<void> {
    await this.limiter.stop();
  }

  /**
   * Get statistics about the rate limiter
   */
  async getStats(): Promise<{
    running: number;
    queued: number;
    done: number;
  }> {
    const counts = this.limiter.counts();
    return {
      running: counts.EXECUTING,
      queued: counts.QUEUED,
      done: counts.DONE ?? 0,
    };
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get the global rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Execute a function with rate limiting
 */
export async function withRateLimit<T>(fn: () => Promise<T>, priority?: number): Promise<T> {
  const limiter = getRateLimiter();
  return limiter.schedule(fn, priority);
}
