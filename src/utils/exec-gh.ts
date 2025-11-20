import { exec } from 'child_process';
import { promisify } from 'util';
import { withRateLimit } from '../core/rate-limiter.js';
import { withSmartRetry } from './retry.js';

const execAsync = promisify(exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export interface ExecGhOptions {
  timeout?: number;
  useRateLimit?: boolean;
  useRetry?: boolean;
}

/**
 * Execute a GitHub CLI command
 * @param command - The gh command to execute (without 'gh' prefix)
 * @param options - Additional options
 */
export async function execGh(command: string, options: ExecGhOptions = {}): Promise<string> {
  const { timeout = 30000, useRateLimit = true, useRetry = true } = options;

  const executeCommand = async (): Promise<string> => {
    try {
      const { stdout, stderr } = await execAsync(`gh ${command}`, {
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        killSignal: 'SIGTERM', // Ensure process can be killed
      });

      if (stderr && !stderr.includes('Logging in to')) {
        // Some gh commands output info to stderr, filter out non-errors
        const isError =
          stderr.toLowerCase().includes('error') || stderr.toLowerCase().includes('fatal');
        if (isError) {
          throw new Error(stderr);
        }
      }

      return stdout.trim();
    } catch (error: any) {
      // Handle timeout specifically
      if (error.killed || error.signal === 'SIGTERM') {
        throw new Error(`GitHub CLI command timed out after ${timeout}ms`);
      }
      
      if (error instanceof Error) {
        throw new Error(`GitHub CLI command failed: ${error.message}`);
      }
      throw error;
    }
  };

  // Create a promise that will execute the command
  let resultPromise: () => Promise<string> = executeCommand;

  // Apply retry logic first (inner wrapper)
  if (useRetry) {
    const originalPromise = resultPromise;
    resultPromise = () => withSmartRetry(originalPromise, {
      maxRetries: 2, // Reduced from 3
      initialDelay: 500, // Reduced from 1000
    });
  }

  // Apply rate limiting second (outer wrapper)
  if (useRateLimit && command.includes('api')) {
    const originalPromise = resultPromise;
    resultPromise = () => withRateLimit(originalPromise);
  }

  // Execute with overall timeout protection
  return Promise.race([
    resultPromise(),
    new Promise<string>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeout * 1.5}ms`)),
        timeout * 1.5 // 1.5x timeout as absolute limit
      )
    ),
  ]);
}

/**
 * Check if GitHub CLI is installed
 */
export async function isGhInstalled(): Promise<boolean> {
  try {
    await execAsync('gh --version', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse JSON output from gh command
 */
export async function execGhJson<T>(command: string, options?: ExecGhOptions): Promise<T> {
  const output = await execGh(command, options);
  try {
    return JSON.parse(output) as T;
  } catch (error) {
    throw new Error(`Failed to parse GitHub CLI JSON output: ${error}`);
  }
}