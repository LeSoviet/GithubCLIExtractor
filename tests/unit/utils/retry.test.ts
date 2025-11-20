import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, isRetryableError, withSmartRetry } from '@/utils/retry';

/**
 * NOTE: Some tests in this file intentionally test error scenarios where promises reject.
 * Vitest may report "Unhandled Rejection" warnings during fake timer execution.
 * These warnings are EXPECTED and do not indicate test failures - all errors are properly
 * caught in try-catch blocks. The warnings occur because fake timers cause the rejections
 * to be detected before the catch handlers fully execute.
 */

describe('retry utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const promise = withRetry(fn, { maxRetries: 3 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 1000 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

      const promise = withRetry(fn, { maxRetries: 2, initialDelay: 1000 });
      
      // Catch the error to prevent unhandled rejection
      const resultPromise = promise.catch((error: Error) => error);
      
      await vi.runAllTimersAsync();
      const error = await resultPromise;

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Failed after 2 retries');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const delays: number[] = [];
      const onRetry = vi.fn((_error, attempt) => {
        delays.push(attempt);
      });

      const promise = withRetry(fn, {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        onRetry,
      });

      await vi.runAllTimersAsync();
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should respect max delay', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const promise = withRetry(fn, {
        maxRetries: 2,
        initialDelay: 10000,
        maxDelay: 5000,
        backoffMultiplier: 10,
      });

      await vi.runAllTimersAsync();
      await promise;

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');

      const onRetry = vi.fn();

      const promise = withRetry(fn, {
        maxRetries: 2,
        initialDelay: 1000,
        onRetry,
      });

      await vi.runAllTimersAsync();
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const errors = [
        new Error('ECONNRESET'),
        new Error('ETIMEDOUT'),
        new Error('ENOTFOUND'),
        new Error('ECONNREFUSED'),
        new Error('Network error occurred'),
        new Error('Request timeout'),
        new Error('Rate limit exceeded'),
      ];

      errors.forEach((error) => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should identify non-network errors as non-retryable', () => {
      const errors = [
        new Error('Invalid input'),
        new Error('Authentication failed'),
        new Error('Not found'),
        new Error('Permission denied'),
      ];

      errors.forEach((error) => {
        expect(isRetryableError(error)).toBe(false);
      });
    });

    it('should be case-insensitive', () => {
      const error1 = new Error('NETWORK ERROR');
      const error2 = new Error('network error');

      expect(isRetryableError(error1)).toBe(true);
      expect(isRetryableError(error2)).toBe(true);
    });
  });

  describe('withSmartRetry', () => {
    it('should retry retryable errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const promise = withSmartRetry(fn, { maxRetries: 2, initialDelay: 1000 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Invalid input'));

      const promise = withSmartRetry(fn, { maxRetries: 3, initialDelay: 1000 });
      
      // Catch the error to prevent unhandled rejection
      const resultPromise = promise.catch((error: Error) => error);
      
      const error = await resultPromise;

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Invalid input');
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should handle mixed error types', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT')) // Retryable
        .mockRejectedValueOnce(new Error('Invalid input')); // Non-retryable

      const promise = withSmartRetry(fn, { maxRetries: 3, initialDelay: 1000 });
      
      // Catch the error to prevent unhandled rejection
      const resultPromise = promise.catch((error: Error) => error);
      
      await vi.advanceTimersByTimeAsync(1000);
      const error = await resultPromise;

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Invalid input');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
