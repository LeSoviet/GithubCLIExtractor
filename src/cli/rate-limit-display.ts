import chalk from 'chalk';
import type { RateLimitInfo } from '../types/index.js';

/**
 * Display rate limit information to the user
 */
export function displayRateLimit(rateLimit: RateLimitInfo): void {
  const percentRemaining = (rateLimit.remaining / rateLimit.limit) * 100;

  let statusColor: (text: string) => string;
  let statusEmoji: string;

  if (percentRemaining > 50) {
    statusColor = chalk.green;
    statusEmoji = '[OK]';
  } else if (percentRemaining > 20) {
    statusColor = chalk.yellow;
    statusEmoji = '[WARN]';
  } else {
    statusColor = chalk.red;
    statusEmoji = '[ALERT]';
  }

  const resetTime = rateLimit.reset.toLocaleTimeString();

  console.log();
  console.log(chalk.bold('[INFO] GitHub API Rate Limit Status:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(
    statusEmoji +
      ' ' +
      statusColor(
        `${rateLimit.remaining}/${rateLimit.limit} requests remaining (${percentRemaining.toFixed(1)}%)`
      )
  );
  console.log(chalk.magenta(`[INFO] Resets at: ${resetTime}`));
  console.log(chalk.gray('─'.repeat(50)));
  console.log();
}

/**
 * Create a progress bar for rate limit
 */
export function createRateLimitProgressBar(rateLimit: RateLimitInfo): string {
  const percentRemaining = (rateLimit.remaining / rateLimit.limit) * 100;
  const barLength = 30;
  const filled = Math.round((percentRemaining / 100) * barLength);
  const empty = barLength - filled;

  let barColor: (text: string) => string;
  if (percentRemaining > 50) {
    barColor = chalk.green;
  } else if (percentRemaining > 20) {
    barColor = chalk.yellow;
  } else {
    barColor = chalk.red;
  }

  const filledBar = barColor('█'.repeat(filled));
  const emptyBar = chalk.gray('░'.repeat(empty));

  return `${filledBar}${emptyBar} ${percentRemaining.toFixed(1)}%`;
}

/**
 * Format rate limit info for inline display
 */
export function formatRateLimitInline(rateLimit: RateLimitInfo): string {
  const percentRemaining = (rateLimit.remaining / rateLimit.limit) * 100;

  let statusColor: (text: string) => string;
  if (percentRemaining > 50) {
    statusColor = chalk.green;
  } else if (percentRemaining > 20) {
    statusColor = chalk.yellow;
  } else {
    statusColor = chalk.red;
  }

  return statusColor(`Rate Limit: ${rateLimit.remaining}/${rateLimit.limit}`);
}
