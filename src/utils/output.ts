import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { sanitizeFilename } from './sanitize.js';

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Write content to a file, creating directories as needed
 */
export async function writeOutput(
  filePath: string,
  content: string,
  options?: { sanitize?: boolean }
): Promise<void> {
  const dir = dirname(filePath);
  await ensureDirectory(dir);

  let finalPath = filePath;
  if (options?.sanitize) {
    const filename = sanitizeFilename(filePath.split(/[\\/]/).pop() || 'output');
    finalPath = join(dir, filename);
  }

  await writeFile(finalPath, content, 'utf-8');
}

/**
 * Write JSON data to a file
 */
export async function writeJson(filePath: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeOutput(filePath, content);
}

/**
 * Write Markdown content to a file
 */
export async function writeMarkdown(filePath: string, content: string): Promise<void> {
  await writeOutput(filePath, content);
}

/**
 * Generate a safe filename from a title
 */
export function generateFilename(
  prefix: string,
  identifier: string | number,
  extension: string
): string {
  const sanitized = sanitizeFilename(`${prefix}-${identifier}`);
  return `${sanitized}.${extension}`;
}

/**
 * Build output path for exported files
 */
export function buildOutputPath(
  basePath: string,
  repoOwner: string,
  repoName: string,
  exportType: string
): string {
  return join(basePath, repoOwner, repoName, exportType);
}
