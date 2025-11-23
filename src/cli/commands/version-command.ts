import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CommandHandler } from './types.js';

/**
 * Command handler for displaying version information
 */
export class VersionCommand implements CommandHandler {
  async execute(): Promise<void> {
    try {
      // Try multiple paths to find package.json
      const possiblePaths = [
        // When running from dist/ in npm global install (dist is one level deep)
        join(dirname(fileURLToPath(import.meta.url)), '../package.json'),
        // When running locally
        join(process.cwd(), 'package.json'),
        // When __dirname is available (CJS)
        typeof __dirname !== 'undefined' ? join(__dirname, '../package.json') : null,
      ].filter(Boolean) as string[];

      // Try to find the version
      for (const packageJsonPath of possiblePaths) {
        try {
          const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
          if (packageJson.name === 'ghextractor' && packageJson.version) {
            console.log(packageJson.version);
            return;
          }
        } catch {
          // Try next path
          continue;
        }
      }

      // If we can't find the version, log unknown
      console.log('unknown');
    } catch (error) {
      // In case of any unexpected error, still log unknown
      console.log('unknown');
    }
  }
}
