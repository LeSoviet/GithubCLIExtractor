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
        // When running from dist/ in npm global install
        join(dirname(fileURLToPath(import.meta.url)), '../../../package.json'),
        // When running locally
        join(process.cwd(), 'package.json'),
        // When __dirname is available (CJS)
        typeof __dirname !== 'undefined' ? join(__dirname, '../../../package.json') : null,
      ].filter(Boolean) as string[];

      let version = '0.1.0';

      for (const packageJsonPath of possiblePaths) {
        try {
          const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
          if (packageJson.name === 'ghextractor' && packageJson.version) {
            version = packageJson.version;
            break;
          }
        } catch {
          // Try next path
          continue;
        }
      }

      console.log(version);
    } catch (error) {
      console.log('0.1.0');
    }
  }
}
