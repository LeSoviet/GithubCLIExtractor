import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Calculate delay with exponential backoff
        const actualDelay = Math.min(delay * Math.pow(backoffMultiplier, attempt), maxDelay);

        logger.warn(
          `Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${actualDelay}ms...`
        );

        if (onRetry) {
          onRetry(lastError, attempt + 1);
        }

        await sleep(actualDelay);
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError!.message}`);
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'rate limit',
    'timeout',
    'network',
  ];

  const message = error.message.toLowerCase();
  return retryableMessages.some((msg) => message.includes(msg));
}

/**
 * Retry only if the error is retryable
 */
export async function withSmartRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(async () => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error && !isRetryableError(error)) {
        throw error; // Don't retry non-retryable errors
      }
      throw error;
    }
  }, options);
}
